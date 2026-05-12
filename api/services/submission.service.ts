import { spawn } from 'child_process';
import prisma from '../lib/prisma';
import { pointsService } from './points.service';
import { judge0Service } from './judge0.service';

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

  async execute(code: string, language: string, input: string): Promise<{ output: string; error?: string; time?: number; timedOut?: boolean }> {
    return new Promise((resolve) => {
      let output = '';
      let error = '';
      let resolved = false;
      const startTime = Date.now();

      const langConfig: Record<string, { cmd: string; args: string[]; fileExt: string }> = {
        javascript: { cmd: 'node', args: ['--max-old-space-size=256'], fileExt: '.js' },
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

      const fileName = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}${config.fileExt}`;
      const filePath = path.join(tempDir, fileName);

      try {
        fs.writeFileSync(filePath, code);
      } catch (e: any) {
        resolve({ output: '', error: `写入文件失败: ${e.message}` });
        return;
      }

      const cleanup = () => {
        try { fs.unlinkSync(filePath); } catch {}
      };

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
        if (resolved) return;
        resolved = true;
        const time = Date.now() - startTime;
        cleanup();

        if (code === 0) {
          resolve({ output: output.trim(), time });
        } else {
          resolve({ output: '', error: error || `程序异常退出，退出码: ${code}`, time });
        }
      });

      proc.on('error', (err: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve({ output: '', error: `执行错误: ${err.message}` });
      });

      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        proc.kill('SIGKILL');
        cleanup();
        resolve({ output: '', error: '程序执行超时', timedOut: true });
      }, this.timeout + 500);
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

    const isFirstAC = !problem.submissions.some(s => 
      s.userId === userId && s.status === 'ACCEPTED'
    );

    let pointsEarned = 0;
    if (result.status === 'ACCEPTED') {
      const pointResult = await pointsService.awardPointsForProblem(
        userId,
        problemId,
        problem.difficulty,
        isFirstAC
      );
      pointsEarned = pointResult.pointsEarned;
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: result.status,
        result: JSON.stringify(result),
        score: result.score,
        pointsEarned
      }
    });

    return updatedSubmission;
  }

  async submitChoice(problemId: string, userId: string, answer: string) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { submissions: true }
    });
    if (!problem) throw new Error('题目不存在');

    const choices = problem.choices ? JSON.parse(problem.choices) : [];
    const choice = choices.find((c: any) => c.key === answer);
    
    const isCorrect = answer === problem.correctAnswer;

    const isFirstAC = isCorrect && !problem.submissions.some(s => 
      s.userId === userId && s.status === 'ACCEPTED'
    );

    let pointsEarned = 0;
    if (isCorrect) {
      const pointResult = await pointsService.awardPointsForProblem(
        userId,
        problemId,
        problem.difficulty,
        isFirstAC
      );
      pointsEarned = pointResult.pointsEarned;
    }

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
        score: isCorrect ? 100 : 0,
        pointsEarned
      }
    });
  }

  async submitFillBlank(problemId: string, userId: string, answers: string[]) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { submissions: true }
    });
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

    const isFirstAC = isCorrect && !problem.submissions.some(s => 
      s.userId === userId && s.status === 'ACCEPTED'
    );

    let pointsEarned = 0;
    if (isCorrect) {
      const pointResult = await pointsService.awardPointsForProblem(
        userId,
        problemId,
        problem.difficulty,
        isFirstAC
      );
      pointsEarned = pointResult.pointsEarned;
    }

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
        score,
        pointsEarned
      }
    });
  }

  private async judgeProgramming(
    code: string,
    language: string,
    testCases: TestCase[],
    timeLimit: number
  ): Promise<JudgeResult> {
    if (judge0Service.isEnabled()) {
      try {
        return await judge0Service.judgeWithTestCases(
          code,
          language,
          testCases,
          timeLimit,
          256
        );
      } catch (error: any) {
        console.warn(`Judge0 判题失败，回退到本地执行: ${error.message}`);
      }
    }

    const results = [];
    let allPassed = true;

    const executor = new CodeExecutor(timeLimit);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const execResult = await executor.execute(code, language, testCase.input);

      if (execResult.timedOut) {
        results.push({
          testCase: i + 1,
          input: testCase.input,
          expected: testCase.output,
          actual: '(超时)',
          passed: false,
          time: execResult.time
        });
        return {
          status: 'TIME_LIMIT_EXCEEDED',
          message: `第 ${i + 1} 个测试点超时`,
          testResults: results,
          score: Math.round((results.filter(r => r.passed).length / testCases.length) * 100)
        };
      }

      if (execResult.error) {
        const isCompileError = execResult.error.includes('SyntaxError') ||
          execResult.error.includes('IndentationError') ||
          execResult.error.includes('ModuleNotFoundError');
        results.push({
          testCase: i + 1,
          input: testCase.input,
          expected: testCase.output,
          actual: `(错误) ${execResult.error.substring(0, 200)}`,
          passed: false,
          time: execResult.time
        });
        return {
          status: isCompileError ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
          message: execResult.error.substring(0, 500),
          testResults: results,
          score: Math.round((results.filter(r => r.passed).length / testCases.length) * 100)
        };
      }

      const passed = execResult.output.trim() === testCase.output.trim();
      if (!passed) allPassed = false;

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

  async checkUserAC(problemId: string, userId: string): Promise<boolean> {
    const count = await prisma.submission.count({
      where: {
        problemId,
        userId,
        status: 'ACCEPTED'
      }
    });
    return count > 0;
  }
}

export const submissionService = new SubmissionService();
