import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { starPathService } from '../services/starpath.service';
import prisma from '../lib/prisma';

const router = Router();

/** 获取当前用户的星图（含探索进度） */
router.get('/map', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathService.getStarMap(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 获取星域详情（含星球列表和用户进度） */
router.get('/region/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathService.getRegionDetail(req.params.id, userId);
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.message === '星域不存在' ? 404 : 500;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
});

/** 获取星球详情（含题目列表和用户进度） */
router.get('/planet/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathService.getPlanetDetail(req.params.id, userId);
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.message === '星球不存在' ? 404 : 500;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
});

/** 提交星球挑战答案 */
router.post('/planet/:id/submit', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problemId, answer, challengeType } = req.body;

    if (!problemId || !answer) {
      res.status(400).json({
        success: false,
        error: { message: '缺少必要参数: problemId, answer' },
      });
      return;
    }

    const data = await starPathService.submitPlanetChallenge(req.params.id, userId, {
      problemId,
      answer,
      challengeType,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.message.includes('不存在') ? 404 : 400;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
});

/** AI 导师对话 */
router.post('/guide', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { planetId, regionId, message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: { message: '缺少必要参数: message' },
      });
      return;
    }

    /* 优先使用 planetId，其次使用 regionId 作为上下文 */
    const contextPlanetId = planetId || undefined;
    const data = await starPathService.getGuideConversation(userId, contextPlanetId, message, regionId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 初始化默认星域（仅管理员可用） */
router.post('/initialize', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { message: '仅管理员可执行此操作' },
      });
      return;
    }

    const data = await starPathService.initializeDefaultRegions();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
