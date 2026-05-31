import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { dailyService } from '../services/daily.service';
import prisma from '../lib/prisma';

const router = Router();

router.get('/today', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const today = new Date().toISOString().split('T')[0];

    let dailyChallenge = await prisma.dailyChallenge.findUnique({
      where: { date: today },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            tags: true,
            type: true,
          },
        },
        userChallenges: {
          where: { userId },
          select: { solved: true, timeTaken: true },
        },
      },
    });

    if (!dailyChallenge) {
      const recentDates = await prisma.dailyChallenge.findMany({
        select: { problemId: true },
        orderBy: { createdAt: 'desc' },
        take: 7,
      });
      const recentProblemIds = [...new Set(recentDates.map(d => d.problemId))];

      const problem = await prisma.problem.findFirst({
        where: {
          type: 'PROGRAMMING',
          ...(recentProblemIds.length > 0 && { id: { notIn: recentProblemIds } }),
        },
        select: {
          id: true,
          title: true,
          difficulty: true,
          tags: true,
          type: true,
        },
      });

      if (!problem) {
        res.json({ success: true, data: null });
        return;
      }

      dailyChallenge = await prisma.dailyChallenge.create({
        data: {
          problemId: problem.id,
          date: today,
          difficulty: problem.difficulty,
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              tags: true,
              type: true,
            },
          },
          userChallenges: {
            where: { userId },
            select: { solved: true, timeTaken: true },
          },
        },
      });
    }

    const completed = dailyChallenge.userChallenges.length > 0
      ? dailyChallenge.userChallenges[0].solved
      : false;

    res.json({
      success: true,
      data: {
        id: dailyChallenge.id,
        date: dailyChallenge.date,
        difficulty: dailyChallenge.difficulty,
        problem: dailyChallenge.problem,
        completed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/submit', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await dailyService.submitDailyChallenge(
      userId,
      req.body.dailyChallengeId,
      req.body.solved,
      req.body.timeTaken,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const stats = await dailyService.getDailyStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
