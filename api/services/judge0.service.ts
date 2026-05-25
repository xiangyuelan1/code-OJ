import axios, { type AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import type { JudgeResult, TestCase } from './submission.service';

dotenv.config();

const JUDGE0_ENABLED = process.env.JUDGE0_ENABLED === 'true';
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
  cpp: 54,
  c: 50,
  java: 91,
  typescript: 74,
  go: 95,
  rust: 93,
  ruby: 72,
  php: 68,
  csharp: 51,
  swift: 83,
  kotlin: 78
};

interface Judge0Submission {
  token: string;
}

interface Judge0Result {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  memory: number;
}

const STATUS_MAP: Record<number, JudgeResult['status']> = {
  1: 'RUNTIME_ERROR',
  2: 'RUNTIME_ERROR',
  3: 'ACCEPTED',
  4: 'WRONG_ANSWER',
  5: 'TIME_LIMIT_EXCEEDED',
  6: 'COMPILE_ERROR',
  7: 'RUNTIME_ERROR',
  8: 'RUNTIME_ERROR',
  9: 'RUNTIME_ERROR',
  10: 'RUNTIME_ERROR',
  11: 'RUNTIME_ERROR',
  12: 'RUNTIME_ERROR',
  13: 'TIME_LIMIT_EXCEEDED',
  14: 'MEMORY_LIMIT_EXCEEDED'
};

export class Judge0Service {
  private client: AxiosInstance;
  private enabled: boolean;

  constructor() {
    this.enabled = JUDGE0_ENABLED;
    this.client = axios.create({
      baseURL: JUDGE0_API_URL,
      timeout: 30000,
      headers: JUDGE0_API_KEY ? { 'X-Auth-Token': JUDGE0_API_KEY } : {}
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getSupportedLanguages(): { key: string; name: string; id: number }[] {
    return Object.entries(LANGUAGE_MAP).map(([key, id]) => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      id
    }));
  }

  private async createSubmission(
    sourceCode: string,
    languageId: number,
    stdin: string,
    expectedOutput?: string,
    cpuTimeLimit?: number,
    memoryLimit?: number
  ): Promise<string> {
    const data: any = {
      source_code: sourceCode,
      language_id: languageId,
      stdin
    };

    if (expectedOutput) {
      data.expected_output = expectedOutput;
    }

    if (cpuTimeLimit) {
      data.cpu_time_limit = Math.ceil(cpuTimeLimit / 1000) || 5;
    }

    if (memoryLimit) {
      data.memory_limit = (memoryLimit || 256) * 1024;
    }

    const response = await this.client.post('/submissions?base64_encoded=false&wait=false', data);
    return response.data.token;
  }

  private async getSubmissionResult(token: string): Promise<Judge0Result> {
    const maxAttempts = 20;
    const pollInterval = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.client.get(`/submissions/${token}?base64_encoded=false&fields=token,status,stdout,stderr,compile_output,time,memory`);
      const result = response.data;

      if (result.status.id > 2) {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Judge0 判题超时');
  }

  async judgeWithTestCases(
    sourceCode: string,
    language: string,
    testCases: TestCase[],
    timeLimit?: number,
    memoryLimit?: number
  ): Promise<JudgeResult> {
    if (!this.enabled) {
      throw new Error('Judge0 未启用，请设置 JUDGE0_ENABLED=true');
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return {
        status: 'COMPILE_ERROR',
        message: `不支持的语言: ${language}`,
        score: 0
      };
    }

    const results: JudgeResult['testResults'] = [];
    let allPassed = true;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        const token = await this.createSubmission(
          sourceCode,
          languageId,
          testCase.input,
          testCase.output,
          timeLimit,
          memoryLimit
        );

        const judgeResult = await this.getSubmissionResult(token);
        const mappedStatus = STATUS_MAP[judgeResult.status.id] || 'RUNTIME_ERROR';
        const actualOutput = (judgeResult.stdout || '').trim();
        const expectedOutput = testCase.output.trim();
        const passed = mappedStatus === 'ACCEPTED' || actualOutput === expectedOutput;

        if (!passed) allPassed = false;

        const timeMs = parseFloat(judgeResult.time || '0') * 1000;

        results.push({
          testCase: i + 1,
          input: testCase.input,
          expected: testCase.output,
          actual: mappedStatus === 'ACCEPTED' && !passed
            ? actualOutput
            : mappedStatus !== 'ACCEPTED'
              ? `(${judgeResult.status.description}) ${judgeResult.stderr || judgeResult.compile_output || ''}`.substring(0, 200)
              : actualOutput,
          passed,
          time: timeMs
        });

        if (mappedStatus === 'TIME_LIMIT_EXCEEDED') {
          return {
            status: 'TIME_LIMIT_EXCEEDED',
            message: `第 ${i + 1} 个测试点超时`,
            testResults: results,
            score: Math.round((results.filter(r => r.passed).length / testCases.length) * 100)
          };
        }

        if (mappedStatus === 'COMPILE_ERROR') {
          return {
            status: 'COMPILE_ERROR',
            message: judgeResult.compile_output || '编译错误',
            testResults: results,
            score: 0
          };
        }

        if (mappedStatus === 'MEMORY_LIMIT_EXCEEDED') {
          return {
            status: 'MEMORY_LIMIT_EXCEEDED',
            message: `第 ${i + 1} 个测试点内存超限`,
            testResults: results,
            score: Math.round((results.filter(r => r.passed).length / testCases.length) * 100)
          };
        }
      } catch (error: any) {
        results.push({
          testCase: i + 1,
          input: testCase.input,
          expected: testCase.output,
          actual: `Judge0 调用失败: ${error.message}`,
          passed: false
        });
        allPassed = false;
      }
    }

    const score = allPassed ? 100 : Math.round((results.filter(r => r.passed).length / results.length) * 100);

    return {
      status: allPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      message: allPassed ? '所有测试点通过' : `${results.filter(r => r.passed).length}/${results.length} 测试点通过`,
      testResults: results,
      score
    };
  }
}

export const judge0Service = new Judge0Service();
