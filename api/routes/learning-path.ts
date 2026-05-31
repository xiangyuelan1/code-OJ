import { Router, type Request } from 'express';
import { learningPathService } from '../services/learning-path.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/paths', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const paths = await learningPathService.getUserPaths(userId);
    res.json({ success: true, data: paths });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/paths/generate', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { title, description, difficulty, focusAreas } = req.body;
    const path = await learningPathService.generatePath(userId, {
      title,
      description,
      difficulty,
      focusAreas,
    });
    res.status(201).json({ success: true, data: path });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/paths/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const detail = await learningPathService.getPathDetail(req.params.id, userId);
    if (!detail) {
      res.status(404).json({ success: false, error: { message: '学习路径不存在' } });
      return;
    }
    res.json({ success: true, data: detail });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/paths/:pathId/steps/:stepId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { completed } = req.body;
    const result = await learningPathService.updateStepStatus(
      req.params.pathId,
      req.params.stepId,
      completed
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/paths/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    await learningPathService.deletePath(req.params.id, userId);
    res.json({ success: true, data: { message: '学习路径已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/paths/:id/refresh', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await learningPathService.refreshPath(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/achievements', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const achievements = await learningPathService.getUserAchievements(userId);
    res.json({ success: true, data: achievements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/achievements/check', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const newAchievements = await learningPathService.checkAndAwardAchievements(userId);
    res.json({ success: true, data: newAchievements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const stats = await learningPathService.getLearningStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
