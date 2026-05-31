import prisma from '../lib/prisma';

export class DailyService {

  async getTodayChallenge() {
    const today = new Date().toISOString().slice(0, 10);

    let challenge = await prisma.dailyChallenge.findUnique({
      where: { date: today },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            type: true,
            tags: true,
            testCases: true,
          },
        },
      },
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
        where: { date: { gte: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) } },
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
          },
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                type: true,
                tags: true,
                testCases: true,
              },
            },
          },
        });
      } catch {
        // 并发创建时唯一约束冲突，重新查询即可
        challenge = await prisma.dailyChallenge.findUnique({
          where: { date: today },
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                type: true,
                tags: true,
                testCases: true,
              },
            },
          },
        });
      }
    }

    if (!challenge) return null;

    if (challenge.problem.testCases) {
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
    const challenge = await prisma.dailyChallenge.findUnique({
      where: { date: today },
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
