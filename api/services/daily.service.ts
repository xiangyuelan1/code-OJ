import prisma from '../lib/prisma';

// 题目查询返回字段
const PROBLEM_SELECT = {
  id: true,
  title: true,
  description: true,
  difficulty: true,
  type: true,
  tags: true,
  testCases: true,
} as const;

export class DailyService {

  /**
   * 获取今天的每日一题
   * - 有 userId 时返回个性化推荐
   * - 无 userId 时返回全局每日一题（fallback）
   */
  async getTodayChallenge(userId?: string) {
    const today = new Date().toISOString().slice(0, 10);

    // 有用户时走个性化推荐逻辑
    if (userId) {
      return this.getPersonalizedChallenge(userId, today);
    }

    // 无用户时走全局逻辑
    return this.getGlobalChallenge(today);
  }

  /**
   * 个性化每日一题推荐
   * 1. 检查是否已有今天的个性化推荐
   * 2. 根据用户近30天通过率决定推荐难度
   * 3. 根据用户薄弱知识点优先推荐
   * 4. 排除已 AC 和近7天推荐过的题目
   * 5. 候选池为空时逐步放宽条件
   */
  private async getPersonalizedChallenge(userId: string, today: string) {
    // 1. 检查今天是否已有该用户的个性化推荐
    const existing = await prisma.dailyChallenge.findFirst({
      where: { userId, date: today },
      include: { problem: { select: PROBLEM_SELECT } },
    });
    if (existing) {
      return this.filterSampleTestCases(existing);
    }

    // 2. 确定推荐难度
    const targetDifficulty = await this.determineUserDifficulty(userId, today);

    // 3. 确定薄弱知识点
    const weakKnowledgeIds = await this.getWeakKnowledgeIds(userId);

    // 4. 获取排除集合：已 AC 的题 + 近7天推荐过的题
    const [acProblemIds, recentRecommendedIds] = await Promise.all([
      this.getUserACProblemIds(userId),
      this.getRecentRecommendedIds(userId, today),
    ]);
    const excludeIds = new Set([...acProblemIds, ...recentRecommendedIds]);

    // 5. 逐步放宽条件选题
    const selected = await this.selectProblem(targetDifficulty, weakKnowledgeIds, excludeIds);

    if (!selected) {
      // 全部候选为空，fallback 到全局每日一题
      return this.getGlobalChallenge(today);
    }

    // 6. 创建个性化推荐记录
    try {
      const challenge = await prisma.dailyChallenge.create({
        data: {
          problemId: selected.id,
          date: today,
          difficulty: selected.difficulty,
          userId,
        },
        include: { problem: { select: PROBLEM_SELECT } },
      });
      return this.filterSampleTestCases(challenge);
    } catch {
      // 并发冲突时重新查询
      const retry = await prisma.dailyChallenge.findFirst({
        where: { userId, date: today },
        include: { problem: { select: PROBLEM_SELECT } },
      });
      return retry ? this.filterSampleTestCases(retry) : this.getGlobalChallenge(today);
    }
  }

  /**
   * 根据用户近30天通过率确定推荐难度
   * - 通过率 > 70%：升一级
   * - 通过率 < 40%：降一级
   * - 否则按星期几轮转的默认难度
   */
  private async determineUserDifficulty(userId: string, today: string): Promise<string> {
    const difficultyOrder = ['EASY', 'MEDIUM', 'HARD'];
    const dayOfWeek = new Date(today).getDay();
    const baseDifficulty = difficultyOrder[dayOfWeek % 3];
    const baseIdx = difficultyOrder.indexOf(baseDifficulty);

    // 查询近30天提交记录
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'PENDING' },
      },
      select: { status: true },
    });

    if (submissions.length === 0) {
      return baseDifficulty;
    }

    const acCount = submissions.filter(s => s.status === 'ACCEPTED').length;
    const passRate = acCount / submissions.length;

    if (passRate > 0.7) {
      // 升一级
      return difficultyOrder[Math.min(baseIdx + 1, 2)];
    } else if (passRate < 0.4) {
      // 降一级
      return difficultyOrder[Math.max(baseIdx - 1, 0)];
    }

    return baseDifficulty;
  }

  /**
   * 获取用户薄弱知识点 ID 列表
   * 来源：WrongRecord 中出错最多的知识点
   */
  private async getWeakKnowledgeIds(userId: string): Promise<string[]> {
    // 通过 WrongRecord 中未掌握的错题关联的知识点，统计出现频率最高的
    const wrongRecords = await prisma.wrongRecord.findMany({
      where: { userId, mastered: false },
      select: { problem: { select: { knowledgeTreeId: true } } },
    });

    // 统计每个知识点出现次数
    const countMap = new Map<string, number>();
    for (const record of wrongRecords) {
      const kid = record.problem.knowledgeTreeId;
      if (kid) {
        countMap.set(kid, (countMap.get(kid) || 0) + 1);
      }
    }

    // 按出现次数降序，取前3个知识点
    return [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  /** 获取用户已 AC 的题目 ID */
  private async getUserACProblemIds(userId: string): Promise<string[]> {
    const acSubmissions = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    return acSubmissions.map(s => s.problemId);
  }

  /** 获取用户近7天被推荐过的题目 ID */
  private async getRecentRecommendedIds(userId: string, today: string): Promise<string[]> {
    const sevenDaysAgo = new Date(new Date(today).getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const recent = await prisma.dailyChallenge.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo },
      },
      select: { problemId: true },
    });
    return recent.map(r => r.problemId);
  }

  /**
   * 逐步放宽条件选题：
   * 1. 目标难度 + 薄弱知识点
   * 2. 目标难度（去掉知识点限制）
   * 3. 任意难度（去掉难度限制）
   */
  private async selectProblem(
    difficulty: string,
    weakKnowledgeIds: string[],
    excludeIds: Set<string>,
  ): Promise<{ id: string; difficulty: string } | null> {
    const excludeArray = [...excludeIds];

    // 策略1：目标难度 + 薄弱知识点
    if (weakKnowledgeIds.length > 0) {
      const candidates = await prisma.problem.findMany({
        where: {
          difficulty,
          knowledgeTreeId: { in: weakKnowledgeIds },
          id: { notIn: excludeArray },
        },
        select: { id: true, difficulty: true },
      });
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    // 策略2：目标难度，不限知识点
    const candidates2 = await prisma.problem.findMany({
      where: {
        difficulty,
        id: { notIn: excludeArray },
      },
      select: { id: true, difficulty: true },
    });
    if (candidates2.length > 0) {
      return candidates2[Math.floor(Math.random() * candidates2.length)];
    }

    // 策略3：不限难度
    const candidates3 = await prisma.problem.findMany({
      where: {
        id: { notIn: excludeArray },
      },
      select: { id: true, difficulty: true },
    });
    if (candidates3.length > 0) {
      return candidates3[Math.floor(Math.random() * candidates3.length)];
    }

    return null;
  }

  /**
   * 全局每日一题（无用户时的 fallback 逻辑）
   * 按星期几轮转难度 + 排除近7天 + 随机选题
   */
  private async getGlobalChallenge(today: string) {
    // 全局每日一题 userId 为 null
    let challenge = await prisma.dailyChallenge.findFirst({
      where: { date: today, userId: null },
      include: { problem: { select: PROBLEM_SELECT } },
    });

    if (!challenge) {
      const problems = await prisma.problem.findMany({
        where: { type: 'PROGRAMMING', testCases: { not: '[]' } },
        select: { id: true, difficulty: true },
      });

      if (problems.length === 0) return null;

      const difficultyOrder = ['EASY', 'MEDIUM', 'HARD'];
      const dayOfWeek = new Date().getDay();
      const targetDifficulty = difficultyOrder[dayOfWeek % 3];

      let candidates = problems.filter(p => p.difficulty === targetDifficulty);
      if (candidates.length === 0) candidates = problems;

      const recentProblemIds = await prisma.dailyChallenge.findMany({
        where: {
          date: { gte: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) },
          userId: null,
        },
        select: { problemId: true },
      });
      const recentSet = new Set(recentProblemIds.map(r => r.problemId));
      const freshCandidates = candidates.filter(p => !recentSet.has(p.id));
      const pool = freshCandidates.length > 0 ? freshCandidates : candidates;

      const selected = pool[Math.floor(Math.random() * pool.length)];

      try {
        challenge = await prisma.dailyChallenge.create({
          data: {
            problemId: selected.id,
            date: today,
            difficulty: targetDifficulty,
            userId: null,
          },
          include: { problem: { select: PROBLEM_SELECT } },
        });
      } catch {
        // 并发创建时唯一约束冲突，重新查询即可
        challenge = await prisma.dailyChallenge.findFirst({
          where: { date: today, userId: null },
          include: { problem: { select: PROBLEM_SELECT } },
        });
      }
    }

    if (!challenge) return null;
    return this.filterSampleTestCases(challenge);
  }

  /** 过滤测试用例，仅保留样例 */
  private filterSampleTestCases(challenge: any) {
    if (challenge.problem?.testCases) {
      try {
        const allCases = JSON.parse(challenge.problem.testCases);
        challenge.problem.testCases = JSON.stringify(allCases.filter((tc: any) => tc.isSample));
      } catch { /* 保留原始数据 */ }
    }
    return challenge;
  }

  async submitDailyChallenge(userId: string, dailyChallengeId: string, solved: boolean, timeTaken?: number) {
    const existing = await prisma.userDailyChallenge.findUnique({
      where: {
        userId_dailyChallengeId: { userId, dailyChallengeId },
      },
    });

    if (existing) {
      if (existing.solved && !solved) {
        return existing;
      }
      return await prisma.userDailyChallenge.update({
        where: { id: existing.id },
        data: {
          solved: solved || existing.solved,
          timeTaken: timeTaken ?? existing.timeTaken,
          submittedAt: new Date(),
        },
      });
    }

    return await prisma.userDailyChallenge.create({
      data: {
        userId,
        dailyChallengeId,
        solved,
        timeTaken,
        submittedAt: new Date(),
      },
    });
  }

  async getDailyStats(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const challenge = await prisma.dailyChallenge.findFirst({
      where: { date: today, userId: null },
    });
    if (!challenge) return { solved: false, totalSolvers: 0, userTimeTaken: null };

    const [userAttempt, totalSolvers] = await Promise.all([
      prisma.userDailyChallenge.findFirst({
        where: { userId, dailyChallengeId: challenge.id },
      }),
      prisma.userDailyChallenge.count({
        where: { dailyChallengeId: challenge.id, solved: true },
      }),
    ]);

    return {
      solved: userAttempt?.solved || false,
      totalSolvers,
      userTimeTaken: userAttempt?.timeTaken || null,
    };
  }
}

export const dailyService = new DailyService();
