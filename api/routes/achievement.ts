import { Router, type Request } from 'express';
import { achievementService } from '../services/achievement.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/initialize', async (_req: Request, res: any): Promise<void> => {
  try {
    await achievementService.initializeAchievements();
    res.json({ success: true, message: '成就已初始化' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/', async (_req: Request, res: any): Promise<void> => {
  try {
    const achievements = await achievementService.getAllAchievements();
    res.json({ success: true, data: achievements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const achievements = await achievementService.getUserAchievements(userId);
    res.json({ success: true, data: achievements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/progress', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const progress = await achievementService.getAchievementProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const stats = await achievementService.getUserStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/check', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const newAchievements = await achievementService.checkAndAwardAchievements(userId);
    res.json({ success: true, data: { newAchievements } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
