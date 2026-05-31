import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { starPathService } from '../services/starpath.service';

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
router.post('/initialize', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.initializeDefaultRegions();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 重新初始化（清空后重建） */
router.post('/reinitialize', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.reinitializeRegions();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 管理员获取星图（含完整数据） */
router.get('/admin/map', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.getAdminMap();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 创建星域 */
router.post('/admin/regions', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.createRegion(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 更新星域 */
router.put('/admin/regions/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.updateRegion(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.message.includes('不存在') ? 404 : 400;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
});

/** 删除星域 */
router.delete('/admin/regions/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await starPathService.deleteRegion(req.params.id);
    res.json({ success: true, data: { message: '星域已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 创建星球 */
router.post('/admin/planets', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.createPlanet(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 更新星球 */
router.put('/admin/planets/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathService.updatePlanet(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.message.includes('不存在') ? 404 : 400;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
});

/** 删除星球 */
router.delete('/admin/planets/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await starPathService.deletePlanet(req.params.id);
    res.json({ success: true, data: { message: '星球已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
