import { spawn } from 'child_process';
import prisma from '../lib/prisma';

export interface TestCase {
  input: string;
  output: string;
  isSample?: boolean;
}

export interface JudgeResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILE_ERROR';
  message: string;
  testResults?: {
    testCase: number;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    time?: number;
  }[];
  score?: number;
}

export class CodeExecutor {
  private timeout: number;
  private memoryLimit: number;

  constructor(timeout: number = 2000, memoryLimit: number = 256) {
    this.timeout = timeout;
    this.memoryLimit = memoryLimit;
  }

  async execute(code: string, language: string, input: string): Promise<{ output: string; error?: string; time?: number }> {
    return new Promise((resolve) => {
      let output = '';
      let error = '';
      let startTime = Date.now();

      const langConfig: Record<string, { cmd: string; args: string[]; fileExt: string }> = {
        javascript: { cmd: 'node', args: [], fileExt: '.js' },
        python: { cmd: 'python3', args: [], fileExt: '.py' }
      };

      const config = langConfig[language];
      if (!config) {
        resolve({ output: '', error: '不支持的编程语言' });
        return;
      }

      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(process.cwd(), 'temp');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `temp_${Date.now()}${config.fileExt}`;
      const filePath = path.join(tempDir, fileName);

      fs.writeFileSync(filePath, code);

      const proc = spawn(config.cmd, [...config.args, filePath], {
        timeout: this.timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.stdin.write(input);
      proc.stdin.end();

      proc.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      proc.on('close', (code: number) => {
        const time = Date.now() - startTime;
        
        fs.unlinkSync(filePath);

        if (code === 0) {
          resolve({ output: output.trim(), time });
        } else {
          resolve({ output: '', error: error || `程序异常退出，退出码: ${code}`, time });
        }
      });

      proc.on('error', (err: Error) => {
        fs.unlinkSync(filePath);
        resolve({ output: '', error: err.message });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ output: '', error: '程序执行超时' });
      }, this.timeout + 1000);
    });
  }
}

export class SubmissionService {
  private executor: CodeExecutor;

  constructor() {
    this.executor = new CodeExecutor();
  }

  async submitProgramming(problemId: string, userId: string, code: string, language: string) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { submissions: true }
    });

    if (!problem) {
      throw new Error('题目不存在');
    }

    const testCases: TestCase[] = JSON.parse(problem.testCases);
    
    const submission = await prisma.submission.create({
      data: {
        problemId,
        userId,
        type: 'PROGRAMMING',
        code,
        status: 'JUDGING'
      }
    });

    const result = await this.judgeProgramming(code, language, testCases, problem.timeLimit);

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: result.status,
        result: JSON.stringify(result),
        score: result.score
      }
    });

    return updatedSubmission;
  }

  async submitChoice(problemId: string, userId: string, answer: string) {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('题目不存在');

    const choices = problem.choices ? JSON.parse(problem.choices) : [];
    const choice = choices.find((c: any) => c.key === answer);
    
    const isCorrect = answer === problem.correctAnswer;

    return await prisma.submission.create({
      data: {
        problemId,
        userId,
        type: 'CHOICE',
        answer,
        status: isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
        result: JSON.stringify({
          isCorrect,
          correctAnswer: problem.correctAnswer,
          selectedAnswer: answer
        }),
        score: isCorrect ? 100 : 0
      }
    });
  }

  async submitFillBlank(problemId: string, userId: string, answers: string[]) {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('题目不存在');

    const correctAnswers: string[] = JSON.parse(problem.fillBlanks || '[]');
    let correctCount = 0;

    answers.forEach((answer, index) => {
      if (correctAnswers[index] && answer.trim().toLowerCase() === correctAnswers[index].trim().toLowerCase()) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / correctAnswers.length) * 100);
    const isCorrect = score === 100;

    return await prisma.submission.create({
      data: {
        problemId,
        userId,
        type: 'FILL_BLANK',
        answer: JSON.stringify(answers),
        status: isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
        result: JSON.stringify({
          isCorrect,
          correctAnswers,
          userAnswers: answers,
          score
        }),
        score
      }
    });
  }

  private async judgeProgramming(
    code: string,
    language: string,
    testCases: TestCase[],
    timeLimit: number
  ): Promise<JudgeResult> {
    const results = [];
    let allPassed = true;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const execResult = await this.executor.execute(code, language, testCase.input);

      if (execResult.error) {
        return {
          status: 'RUNTIME_ERROR',
          message: execResult.error,
          testResults: results,
          score: 0
        };
      }

      const passed = execResult.output.trim() === testCase.output.trim();
      
      if (!passed) {
        allPassed = false;
      }

      results.push({
        testCase: i + 1,
        input: testCase.input,
        expected: testCase.output,
        actual: execResult.output,
        passed,
        time: execResult.time
      });
    }

    const score = allPassed ? 100 : Math.round((results.filter(r => r.passed).length / results.length) * 100);

    return {
      status: allPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      message: allPassed ? '所有测试点通过' : `${results.filter(r => r.passed).length}/${results.length} 测试点通过`,
      testResults: results,
      score
    };
  }

  async getSubmissionById(id: string) {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        problem: {
          select: { title: true, type: true }
        },
        user: {
          select: { username: true }
        }
      }
    });

    if (!submission) return null;

    return {
      ...submission,
      result: submission.result ? JSON.parse(submission.result) : null
    };
  }

  async getUserSubmissions(userId: string) {
    return await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: {
          select: { title: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getProblemSubmissions(problemId: string) {
    return await prisma.submission.findMany({
      where: { problemId },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const submissionService = new SubmissionService();
