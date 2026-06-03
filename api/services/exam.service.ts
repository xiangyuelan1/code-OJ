import prisma from '../lib/prisma';
import { pointsService } from './points.service';
import { CodeExecutor, type TestCase, judgeSemaphore } from './submission.service';

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export interface ExamAnalytics {
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalQuestions: number;
  timeSpent: number;
  weakPoints: string[];
  recommendedProblems: any[];
}

interface ProgrammingAnswer {
  code: string;
  language: string;
}

interface QuestionResult {
  problemId: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
  type: string;
  detail?: any;
}

export class ExamService {
  async createExam(data: {
    title: string;
    description?: string;
    type: string;
    duration: number;
    startTime?: Date;
    endTime?: Date;
    enableProctoring?: boolean;
    problemIds: string[];
    points?: number[];
    classId?: string;
    maxAttempts?: number;
    createdBy: string;
    scope?: string;
    classIds?: string[];
    pointsReward?: number;
    medalEnabled?: boolean;
    showRanking?: boolean;
    passScore?: number;
  }) {
    const { problemIds = [], points: customPoints, classId, scope, classIds, pointsReward, medalEnabled, showRanking, passScore, ...examData } = data;
    const normalizedClassId = classId?.trim() || undefined;

    return await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          ...examData,
          classId: normalizedClassId,
          createdBy: data.createdBy,
          scope: scope || 'PUBLIC',
          classIds: JSON.stringify(classIds || []),
          pointsReward: pointsReward || 0,
          medalEnabled: medalEnabled || false,
          showRanking: showRanking !== false,
          passScore: passScore || 60,
        }
      });

      if (problemIds.length > 0) {
        await tx.examQuestion.createMany({
          data: problemIds.map((problemId, i) => ({
            examId: exam.id,
            problemId,
            order: i,
            points: customPoints?.[i] || 10
          }))
        });
      }

      return exam;
    });
  }

  async updateExam(examId: string, userId: string, data: {
    title?: string;
    description?: string;
    type?: string;
    duration?: number;
    startTime?: Date;
    endTime?: Date;
    enableProctoring?: boolean;
    isActive?: boolean;
    classId?: string;
    maxAttempts?: number;
    problemIds?: string[];
    points?: number[];
    scope?: string;
    classIds?: string[];
    pointsReward?: number;
    medalEnabled?: boolean;
    showRanking?: boolean;
    passScore?: number;
  }) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new Error('考试不存在');

    const gradedCount = await prisma.examAttempt.count({
      where: { examId, status: 'GRADED' }
    });
    if (gradedCount > 0 && (data.problemIds || data.points)) {
      throw new Error('已有学生完成考试，无法修改题目和分值');
    }

    const { problemIds, points: customPoints, classId, scope, classIds, pointsReward, medalEnabled, showRanking, passScore, ...examData } = data;
    const normalizedClassId = classId !== undefined ? (classId?.trim() || undefined) : undefined;

    return await prisma.$transaction(async (tx) => {
      if (problemIds && problemIds.length > 0) {
        await tx.examQuestion.deleteMany({ where: { examId } });
        await tx.examQuestion.createMany({
          data: problemIds.map((problemId, i) => ({
            examId,
            problemId,
            order: i,
            points: customPoints?.[i] || 10
          }))
        });
      }

      return await tx.exam.update({
        where: { id: examId },
        data: {
          ...examData,
          ...(classId !== undefined && { classId: normalizedClassId }),
          ...(scope !== undefined && { scope }),
          ...(classIds !== undefined && { classIds: JSON.stringify(classIds) }),
          ...(pointsReward !== undefined && { pointsReward }),
          ...(medalEnabled !== undefined && { medalEnabled }),
          ...(showRanking !== undefined && { showRanking }),
          ...(passScore !== undefined && { passScore }),
        }
      });
    });
  }

  async deleteExam(examId: string) {
    await prisma.examAttempt.deleteMany({ where: { examId } });
    await prisma.examQuestion.deleteMany({ where: { examId } });
    return await prisma.exam.delete({ where: { id: examId } });
  }

  async getExam(examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { problem: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!exam) return null;

    const now = new Date();
    let status = 'active';
    if (!exam.isActive) status = 'inactive';
    else if (exam.startTime && now < exam.startTime) status = 'not_started';
    else if (exam.endTime && now > exam.endTime) status = 'ended';

    return {
      ...exam,
      status,
      questions: exam.questions.map(q => ({
        ...q,
        problem: {
          ...q.problem,
          tags: safeJsonParse(q.problem.tags, []),
          testCases: safeJsonParse(q.problem.testCases, []),
          choices: safeJsonParse(q.problem.choices, null),
          fillBlanks: safeJsonParse(q.problem.fillBlanks, null),
        }
      }))
    };
  }

  async getExams(createdBy?: string, userId?: string, userRole?: string) {
    let where: any = createdBy ? { createdBy } : {};

    if (userRole === 'STUDENT' && userId) {
      // 查询学生所属班级
      const memberships = await prisma.classMember.findMany({
        where: { userId },
        select: { classId: true }
      });
      const userClassIds = memberships.map(m => m.classId);

      // 学生可见：1) PUBLIC 考试；2) 自己所在班级的考试
      const orConditions: any[] = [{ scope: 'PUBLIC' }];
      if (userClassIds.length > 0) {
        orConditions.push({ classId: { in: userClassIds } });
      }

      where = {
        ...where,
        isActive: true,
        OR: orConditions,
      };
    }

    return await prisma.exam.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true }
        },
        _count: {
          select: {
            attempts: true,
            questions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).then(exams => exams.map(exam => {
      const now = new Date();
      let status = 'active';
      if (!exam.isActive) status = 'inactive';
      else if (exam.startTime && now < exam.startTime) status = 'not_started';
      else if (exam.endTime && now > exam.endTime) status = 'ended';
      return { ...exam, status };
    }));
  }

  async startExam(examId: string, userId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    });

    if (!exam) {
      throw new Error('考试不存在');
    }

    if (!exam.isActive) {
      throw new Error('该考试当前未开放');
    }

    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      throw new Error('考试尚未开始');
    }
    if (exam.endTime && now > exam.endTime) {
      throw new Error('考试已结束');
    }

    if (exam.classId) {
      const membership = await prisma.classMember.findUnique({
        where: { classId_userId: { classId: exam.classId, userId } }
      });
      if (!membership) {
        throw new Error('您不是该班级的成员，无法参加此考试');
      }
    }

    const examScope = exam.scope || 'PUBLIC';
    if (examScope === 'CLASS_ONLY' || examScope === 'SELECTED_CLASSES') {
      const examClassIds: string[] = safeJsonParse(exam.classIds, []);
      const allClassIds = exam.classId ? [exam.classId, ...examClassIds] : examClassIds;
      if (allClassIds.length > 0) {
        const membership = await prisma.classMember.findFirst({
          where: { classId: { in: allClassIds }, userId }
        });
        if (!membership) {
          throw new Error('您不在该考试的参加范围内');
        }
      }
    }

    const gradedAttempts = await prisma.examAttempt.count({
      where: { examId, userId, status: 'GRADED' }
    });

    const maxAttempts = exam.maxAttempts || 1;
    if (gradedAttempts >= maxAttempts) {
      throw new Error('您已达到最大考试次数');
    }

    const existingAttempt = await prisma.examAttempt.findFirst({
      where: { examId, userId, status: 'IN_PROGRESS' }
    });

    if (existingAttempt) {
      const elapsed = now.getTime() - existingAttempt.startTime.getTime();
      const durationMs = exam.duration * 60 * 1000;
      if (elapsed > durationMs + 60000) {
        await this.submitExam(examId, userId, safeJsonParse(existingAttempt.answers, {}));
        throw new Error('考试时间已过，系统已自动提交');
      }
      return existingAttempt;
    }

    return await prisma.examAttempt.create({
      data: {
        examId,
        userId,
        status: 'IN_PROGRESS'
      }
    });
  }

  async saveExamAnswers(examId: string, userId: string, answers: Record<string, any>) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId, userId, status: 'IN_PROGRESS' }
    });

    if (!attempt) {
      throw new Error('没有进行中的考试');
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new Error('考试不存在');

    const elapsed = Date.now() - attempt.startTime.getTime();
    const durationMs = exam.duration * 60 * 1000;
    if (elapsed > durationMs + 60000) {
      throw new Error('考试时间已过');
    }

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { answers: JSON.stringify(answers) }
    });

    return { saved: true };
  }

  async submitExam(examId: string, userId: string, answers: Record<string, any>) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId, userId, status: 'IN_PROGRESS' },
      include: {
        exam: {
          include: {
            questions: {
              include: { problem: true }
            }
          }
        }
      }
    });

    if (!attempt) {
      throw new Error('没有进行中的考试记录，请先点击"开始考试"');
    }

    const endTime = new Date();
    let totalScore = 0;
    let earnedScore = 0;
    let correctCount = 0;
    const questionResults: QuestionResult[] = [];

    for (const question of attempt.exam.questions) {
      totalScore += question.points;
      const userAnswer = answers[question.problemId];

      if (userAnswer) {
        const result = await this.checkAnswer(question.problemId, userAnswer, question.points);
        questionResults.push(result);
        if (result.isCorrect) {
          earnedScore += result.earnedPoints;
          correctCount++;
        }
      } else {
        questionResults.push({
          problemId: question.problemId,
          isCorrect: false,
          points: question.points,
          earnedPoints: 0,
          type: question.problem.type
        });
      }
    }

    const timeTaken = Math.floor((endTime.getTime() - attempt.startTime.getTime()) / 1000);

    try {
      await pointsService.awardExamPoints(userId, examId, earnedScore, totalScore);
    } catch {
      // 积分发放失败不影响考试提交
    }

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        endTime,
        status: 'GRADED',
        score: earnedScore,
        totalScore,
        timeTaken,
        answers: JSON.stringify(answers),
        proctoringLogs: attempt.proctoringLogs,
        violations: JSON.stringify({
          ...(safeJsonParse(attempt.violations, {}) as Record<string, any>),
          questionResults
        })
      }
    });

    this.settleExamRanking(examId, userId, earnedScore, totalScore, timeTaken, attempt.exam).catch(() => {});

    return updatedAttempt;
  }

  async getExamResult(examId: string, userId: string) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId, userId },
      include: {
        exam: {
          include: {
            questions: {
              include: { problem: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!attempt) return null;

    const parsedAnswers = safeJsonParse(attempt.answers, null);
    const violationsData = safeJsonParse(attempt.violations, {}) as Record<string, any>;
    const questionResults: QuestionResult[] = violationsData.questionResults || [];

    return {
      ...attempt,
      answers: parsedAnswers,
      questionResults,
      exam: {
        ...attempt.exam,
        questions: attempt.exam.questions.map(q => ({
          ...q,
          problem: {
            ...q.problem,
            tags: safeJsonParse(q.problem.tags, []),
            testCases: safeJsonParse(q.problem.testCases, []),
            choices: safeJsonParse(q.problem.choices, null),
            fillBlanks: safeJsonParse(q.problem.fillBlanks, null),
          }
        }))
      }
    };
  }

  async getExamAnalytics(examId: string, userId: string): Promise<ExamAnalytics | null> {
    const attempt = await this.getExamResult(examId, userId);
    if (!attempt) return null;

    const totalScore = attempt.exam.questions.reduce((sum: number, q: any) => sum + q.points, 0);
    const weakPoints: string[] = [];
    const recommendedProblems: any[] = [];

    for (const question of attempt.exam.questions) {
      const qr = attempt.questionResults?.find((r: QuestionResult) => r.problemId === question.problemId);
      if (!qr?.isCorrect && question.problem.knowledgeTreeId) {
        const knowledgeNode = await prisma.knowledgeTree.findUnique({
          where: { id: question.problem.knowledgeTreeId }
        });
        if (knowledgeNode) {
          weakPoints.push(knowledgeNode.name);

          const similarProblems = await prisma.problem.findMany({
            where: {
              knowledgeTreeId: question.problem.knowledgeTreeId,
              id: { not: question.problemId }
            },
            take: 2
          });
          recommendedProblems.push(...similarProblems);
        }
      }
    }

    return {
      totalScore,
      earnedScore: attempt.score || 0,
      correctCount: attempt.questionResults?.filter((r: QuestionResult) => r.isCorrect).length || 0,
      totalQuestions: attempt.exam.questions.length,
      timeSpent: attempt.endTime
        ? attempt.endTime.getTime() - attempt.startTime.getTime()
        : 0,
      weakPoints: [...new Set(weakPoints)],
      recommendedProblems: recommendedProblems.slice(0, 5)
    };
  }

  async logProctoringEvent(examId: string, userId: string, event: string, details?: string) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId, userId, status: 'IN_PROGRESS' }
    });

    if (!attempt) return;

    const logs = safeJsonParse(attempt.proctoringLogs, []);
    logs.push({ timestamp: new Date().toISOString(), event, details });

    const violations = safeJsonParse(attempt.violations, {});
    const violationTypes = ['FOCUS_LOST', 'TAB_SWITCH', 'COPY_ATTEMPT', 'PASTE_ATTEMPT'];

    if (violationTypes.includes(event)) {
      violations[event] = (violations[event] || 0) + 1;
    }

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        proctoringLogs: JSON.stringify(logs),
        violations: JSON.stringify(violations)
      }
    });

    if (violations[event] >= 5) {
      await this.submitExam(examId, userId, safeJsonParse(attempt.answers, {}));
    }
  }

  async getStudentAttempts(userId: string) {
    return await prisma.examAttempt.findMany({
      where: { userId },
      include: {
        exam: {
          select: {
            title: true,
            type: true,
            duration: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getExamAttempts(examId: string) {
    const attempts = await prisma.examAttempt.findMany({
      where: { examId },
      include: {
        user: {
          select: { username: true, email: true }
        }
      },
      orderBy: { score: 'desc' }
    });

    return attempts.map(attempt => {
      const violationsData = safeJsonParse(attempt.violations, {}) as Record<string, any>;
      const questionResults: QuestionResult[] = violationsData.questionResults || [];
      return { ...attempt, questionResults };
    });
  }

  private async checkAnswer(problemId: string, answer: any, points: number): Promise<QuestionResult> {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });

    if (!problem) {
      return { problemId, isCorrect: false, points, earnedPoints: 0, type: 'UNKNOWN' };
    }

    switch (problem.type) {
      case 'PROGRAMMING':
        return await this.checkProgrammingAnswer(problemId, problem, answer, points);
      case 'CHOICE':
        return this.checkChoiceAnswer(problemId, problem, answer, points);
      case 'FILL_BLANK':
        return this.checkFillBlankAnswer(problemId, problem, answer, points);
      default:
        return { problemId, isCorrect: false, points, earnedPoints: 0, type: problem.type };
    }
  }

  private async checkProgrammingAnswer(
    problemId: string,
    problem: any,
    answer: ProgrammingAnswer | string,
    points: number
  ): Promise<QuestionResult> {
    let code: string;
    let language: string;

    if (typeof answer === 'object' && answer !== null && 'code' in answer) {
      code = answer.code;
      language = answer.language || 'cpp';
    } else {
      return {
        problemId, isCorrect: false, points, earnedPoints: 0, type: 'PROGRAMMING',
        detail: { error: '编程题答案格式错误，缺少代码或语言信息' }
      };
    }

    if (!code || !code.trim()) {
      return {
        problemId, isCorrect: false, points, earnedPoints: 0, type: 'PROGRAMMING',
        detail: { error: '未提交代码' }
      };
    }

    try {
      const testCases: TestCase[] = safeJsonParse(problem.testCases, []);

      if (testCases.length === 0) {
        return {
          problemId, isCorrect: false, points, earnedPoints: 0, type: 'PROGRAMMING',
          detail: { error: '题目缺少测试用例' }
        };
      }

      const executor = new CodeExecutor(problem.timeLimit || 2000);
      let passedCount = 0;
      const testResults: any[] = [];

      // 获取判题执行槽
      await judgeSemaphore.acquire();
      try {
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          const execResult = await executor.execute(code, language, tc.input);

          if (execResult.timedOut) {
            testResults.push({ testCase: i + 1, passed: false, error: '超时' });
            continue;
          }

          if (execResult.error) {
            testResults.push({ testCase: i + 1, passed: false, error: execResult.error.substring(0, 200) });
            continue;
          }

          const passed = execResult.output.trim() === tc.output.trim();
          if (passed) passedCount++;
          testResults.push({
            testCase: i + 1, passed, expected: tc.output, actual: execResult.output
          });
        }
      } finally {
        judgeSemaphore.release();
      }

      const isCorrect = passedCount === testCases.length;
      const earnedPoints = isCorrect ? points : Math.round((passedCount / testCases.length) * points);

      return {
        problemId, isCorrect, points, earnedPoints, type: 'PROGRAMMING',
        detail: { passedCount, totalCount: testCases.length, testResults }
      };
    } catch (error: any) {
      return {
        problemId, isCorrect: false, points, earnedPoints: 0, type: 'PROGRAMMING',
        detail: { error: `判题异常: ${error.message}` }
      };
    }
  }

  private checkChoiceAnswer(problemId: string, problem: any, answer: string, points: number): QuestionResult {
    const isCorrect = answer === problem.correctAnswer;
    return {
      problemId, isCorrect, points, earnedPoints: isCorrect ? points : 0, type: 'CHOICE',
      detail: { selectedAnswer: answer, correctAnswer: problem.correctAnswer }
    };
  }

  private checkFillBlankAnswer(problemId: string, problem: any, answer: string | string[], points: number): QuestionResult {
    const correctAnswers: string[] = safeJsonParse(problem.fillBlanks, []);
    const userAnswers: string[] = Array.isArray(answer) ? answer : [answer];

    let correctCount = 0;
    for (let i = 0; i < correctAnswers.length; i++) {
      if (userAnswers[i] && userAnswers[i].trim().toLowerCase() === correctAnswers[i]?.trim().toLowerCase()) {
        correctCount++;
      }
    }

    const isCorrect = correctCount === correctAnswers.length;
    const earnedPoints = isCorrect ? points : Math.round((correctCount / correctAnswers.length) * points);

    return {
      problemId, isCorrect, points, earnedPoints, type: 'FILL_BLANK',
      detail: { correctAnswers, userAnswers, correctCount, totalCount: correctAnswers.length }
    };
  }

  /**
   * 单人提交后更新排名记录（upsert）
   */
  private async settleExamRanking(
    examId: string, userId: string, score: number, totalScore: number, timeTaken: number, exam: any
  ) {
    const examData = await prisma.exam.findUnique({ where: { id: examId } });
    if (!examData) return;

    const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
    let medal: string | null = null;
    if (examData.medalEnabled) {
      if (percentage >= 95) medal = 'GOLD';
      else if (percentage >= 80) medal = 'SILVER';
      else if (percentage >= examData.passScore) medal = 'BRONZE';
    }

    let pointsAwarded = 0;
    if (examData.pointsReward > 0 && percentage >= examData.passScore) {
      pointsAwarded = Math.round(examData.pointsReward * (percentage / 100));
      try {
        await pointsService.updateUserPoints(userId, pointsAwarded, 'EXAM_REWARD', {
          examId, score, totalScore, percentage, medal
        });
      } catch {}
    }

    await prisma.examRanking.upsert({
      where: { examId_userId: { examId, userId } },
      create: { examId, userId, score, totalScore, timeTaken, rank: 0, medal, pointsAwarded },
      update: { score, totalScore, timeTaken, medal, pointsAwarded }
    });

    await this.recalculateRanks(examId);
  }

  /**
   * 重新计算排名（分数降序，同分用时少排前）
   */
  private async recalculateRanks(examId: string) {
    const rankings = await prisma.examRanking.findMany({
      where: { examId },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }]
    });

    for (let i = 0; i < rankings.length; i++) {
      await prisma.examRanking.update({
        where: { id: rankings[i].id },
        data: { rank: i + 1 }
      });
    }
  }

  /**
   * 获取考试排行榜
   */
  async getExamRankings(examId: string) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new Error('考试不存在');
    if (!exam.showRanking) throw new Error('该考试未开启排行榜');

    const rankings = await prisma.examRanking.findMany({
      where: { examId },
      include: {
        user: { select: { id: true, username: true, avatar: true, level: true } }
      },
      orderBy: [{ rank: 'asc' }]
    });

    return rankings;
  }

  /**
   * 考试结束后的批量结算（可由定时任务或手动触发）
   */
  async settleExam(examId: string) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new Error('考试不存在');

    const gradedAttempts = await prisma.examAttempt.findMany({
      where: { examId, status: 'GRADED' },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }]
    });

    for (let i = 0; i < gradedAttempts.length; i++) {
      const attempt = gradedAttempts[i];
      if (!attempt.score || !attempt.totalScore || !attempt.timeTaken) continue;

      const percentage = Math.round((attempt.score / attempt.totalScore) * 100);
      let medal: string | null = null;
      if (exam.medalEnabled) {
        if (percentage >= 95) medal = 'GOLD';
        else if (percentage >= 80) medal = 'SILVER';
        else if (percentage >= exam.passScore) medal = 'BRONZE';
      }

      let pointsAwarded = 0;
      if (exam.pointsReward > 0 && percentage >= exam.passScore) {
        pointsAwarded = Math.round(exam.pointsReward * (percentage / 100));
      }

      await prisma.examRanking.upsert({
        where: { examId_userId: { examId, userId: attempt.userId } },
        create: {
          examId, userId: attempt.userId, score: attempt.score,
          totalScore: attempt.totalScore, timeTaken: attempt.timeTaken,
          rank: i + 1, medal, pointsAwarded
        },
        update: { rank: i + 1, medal, pointsAwarded }
      });
    }

    return { settled: true, count: gradedAttempts.length };
  }
}

export const examService = new ExamService();
