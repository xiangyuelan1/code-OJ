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

      const selected = candidates[Math.floor(Math.random() * candidates.length)];

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
    }

    if (challenge.problem.testCases) {
      try {
        const allCases = JSON.parse(challenge.problem.testCases);
        challenge.problem.testCases = JSON.stringify(allCases.filter((tc: any) => tc.isSample));
      } catch {}
    }

    return challenge;
  }

  async submitDailyChallenge(userId: string, dailyChallengeId: string, solved: boolean, timeTaken?: number) {
    return await prisma.userDailyChallenge.upsert({
      where: {
        userId_dailyChallengeId: {
          userId,
          dailyChallengeId,
        },
      },
      create: {
        userId,
        dailyChallengeId,
        solved,
        timeTaken,
        submittedAt: new Date(),
      },
      update: {
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
