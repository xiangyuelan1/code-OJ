import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
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

      const langConfig: Record<string, { cmd: string; args: string[]; fileExt: string; compileCmd?: string; compileArgs?: string[] }> = {
        javascript: { cmd: 'node', args: ['--max-old-space-size=256'], fileExt: '.js' },
        python: { cmd: 'python3', args: [], fileExt: '.py' },
        cpp: { cmd: 'g++', args: [], fileExt: '.cpp', compileCmd: 'g++', compileArgs: ['-std=c++17', '-O2', '-o'] },
        c: { cmd: 'gcc', args: [], fileExt: '.c', compileCmd: 'gcc', compileArgs: ['-std=c11', '-O2', '-o'] }
      };

      const config = langConfig[language];
      if (!config) {
        resolve({ output: '', error: '不支持的编程语言' });
        return;
      }

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

      const execPath = config.compileCmd
        ? path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).slice(2)}.exe`)
        : filePath;

      const cleanup = () => {
        try { fs.unlinkSync(filePath); } catch {}
        if (config.compileCmd) {
          try { fs.unlinkSync(execPath); } catch {}
        }
      };

      const timeoutMs = this.timeout || 2000;

      if (config.compileCmd) {
        const compileProc = spawn(config.compileCmd, [...(config.compileArgs || []), execPath, filePath], {
          timeout: 10000,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let compileError = '';
        compileProc.stderr.on('data', (data: Buffer) => {
          compileError += data.toString();
        });

        compileProc.on('close', (compileCode: number) => {
          if (compileCode !== 0) {
            cleanup();
            resolve({ output: '', error: `编译错误:\n${compileError}` });
            return;
          }

          runExecutable();
        });

        compileProc.on('error', (err: Error) => {
          cleanup();
          resolve({ output: '', error: `编译器启动失败: ${err.message}。请确保已安装 ${config.compileCmd}` });
        });
      } else {
        runExecutable();
      }

      function runExecutable() {
        const runCmd = config.compileCmd ? execPath : config.cmd;
        const runArgs = config.compileCmd ? [] : [...config.args, filePath];

        const proc = spawn(runCmd, runArgs, {
          timeout: timeoutMs,
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
        }, timeoutMs + 500);
      }
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
      where: { id: problemId }
    });

    if (!problem) {
      throw new Error('题目不存在');
    }

    let testCases: TestCase[];
    try {
      testCases = JSON.parse(problem.testCases);
    } catch {
      throw new Error('题目测试用例格式错误');
    }

    if (!testCases || testCases.length === 0) {
      throw new Error('题目缺少测试用例');
    }

    const submission = await prisma.submission.create({
      data: {
        problemId,
        userId,
        type: 'PROGRAMMING',
        code,
        status: 'JUDGING'
      }
    });

    let result: JudgeResult;
    try {
      result = await this.judgeProgramming(code, language, testCases, problem.timeLimit, problem.memoryLimit);
    } catch (error: any) {
      result = {
        status: 'RUNTIME_ERROR',
        message: `判题异常: ${error.message}`,
        score: 0
      };
    }

    let pointsEarned = 0;
    if (result.status === 'ACCEPTED') {
      const existingAC = await prisma.submission.findFirst({
        where: {
          problemId,
          userId,
          status: 'ACCEPTED',
          id: { not: submission.id }
        }
      });
      if (!existingAC) {
        try {
          const pointResult = await pointsService.awardPointsForProblem(
            userId,
            problemId,
            problem.difficulty,
            true
          );
          pointsEarned = pointResult.pointsEarned;
        } catch { /* 积分发放失败不影响提交 */ }
      }
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
      where: { id: problemId }
    });
    if (!problem) throw new Error('题目不存在');

    const isCorrect = answer === problem.correctAnswer;

    const submission = await prisma.submission.create({
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
        pointsEarned: 0
      }
    });

    let pointsEarned = 0;
    if (isCorrect) {
      const existingAC = await prisma.submission.findFirst({
        where: {
          problemId,
          userId,
          status: 'ACCEPTED',
          id: { not: submission.id }
        }
      });
      if (!existingAC) {
        try {
          const pointResult = await pointsService.awardPointsForProblem(
            userId, problemId, problem.difficulty, true
          );
          pointsEarned = pointResult.pointsEarned;
        } catch { /* 积分发放失败不影响提交 */ }
        await prisma.submission.update({
          where: { id: submission.id },
          data: { pointsEarned }
        });
      }
    }

    return { ...submission, pointsEarned };
  }

  async submitFillBlank(problemId: string, userId: string, answers: string[]) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
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

    const submission = await prisma.submission.create({
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
        pointsEarned: 0
      }
    });

    let pointsEarned = 0;
    if (isCorrect) {
      const existingAC = await prisma.submission.findFirst({
        where: {
          problemId,
          userId,
          status: 'ACCEPTED',
          id: { not: submission.id }
        }
      });
      if (!existingAC) {
        try {
          const pointResult = await pointsService.awardPointsForProblem(
            userId, problemId, problem.difficulty, true
          );
          pointsEarned = pointResult.pointsEarned;
        } catch { /* 积分发放失败不影响提交 */ }
        await prisma.submission.update({
          where: { id: submission.id },
          data: { pointsEarned }
        });
      }
    }

    return { ...submission, pointsEarned };
  }

  private async judgeProgramming(
    code: string,
    language: string,
    testCases: TestCase[],
    timeLimit: number,
    memoryLimit?: number
  ): Promise<JudgeResult> {
    if (judge0Service.isEnabled()) {
      try {
        return await judge0Service.judgeWithTestCases(
          code,
          language,
          testCases,
          timeLimit,
          memoryLimit || 256
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

  async getUserSubmissions(userId: string, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        problem: {
          select: { title: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return submissions.map(s => ({
      ...s,
      result: s.result ? (() => { try { return JSON.parse(s.result); } catch { return s.result; } })() : null
    }));
  }

  async getProblemSubmissions(problemId: string) {
    const submissions = await prisma.submission.findMany({
      where: { problemId },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return submissions.map(s => ({
      ...s,
      result: s.result ? (() => { try { return JSON.parse(s.result); } catch { return s.result; } })() : null
    }));
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
