import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { starPathExplorationService } from '../services/starpath-exploration.service';

const router = Router();

/* ── 获取可用探险任务列表 ── */
router.get('/missions', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathExplorationService.getAvailableMissions(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/* ── 开始探险 ── */
router.post('/start', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { missionId } = req.body;
    if (!missionId) {
      res.status(400).json({ success: false, error: { message: '缺少 missionId 参数' } });
      return;
    }
    const data = await starPathExplorationService.startExploration(userId, missionId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/* ── 获取探险状态 ── */
router.get('/status', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathExplorationService.getExplorationStatus(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/* ── 收取探险奖励 ── */
router.post('/claim', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathExplorationService.claimExplorationReward(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
