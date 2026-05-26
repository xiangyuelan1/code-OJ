import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { dailyService } from '../services/daily.service';

const router = Router();

router.get('/today', async (req: Request, res: any): Promise<void> => {
  try {
    const challenge = await dailyService.getTodayChallenge();
    res.json({ success: true, data: challenge });
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
