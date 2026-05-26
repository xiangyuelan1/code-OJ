import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { profileService } from '../services/profile.service';

const router = Router();

/** 获取当前用户的完整学习者画像 */
router.get('/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await profileService.getFullProfile(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 更新当前用户的画像偏好（每日目标、学习风格） */
router.put('/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const profile = await profileService.updateProfile(userId, req.body);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 获取为当前用户推荐的题目列表 */
router.get('/recommendations', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const count = parseInt(req.query.count as string) || 5;
    const problems = await profileService.getRecommendedProblems(userId, count);
    res.json({ success: true, data: problems });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 刷新并重新计算当前用户的完整画像数据 */
router.post('/refresh', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await profileService.getFullProfile(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
