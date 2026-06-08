import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { dailyService } from '../services/daily.service';

const router = Router();

router.get('/today', async (req: Request, res: any): Promise<void> => {
  try {
    // 尝试从 token 中获取用户ID，实现个性化推荐；未登录则走全局逻辑
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { authService } = await import('../services/auth.service');
        const decoded = authService.verifyToken(authHeader.substring(7));
        userId = decoded.userId;
      } catch { /* token 无效时走全局逻辑 */ }
    }
    const challenge = await dailyService.getTodayChallenge(userId);
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
