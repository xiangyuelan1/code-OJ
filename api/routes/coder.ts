import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { coderService } from '../services/coder.service';
import prisma from '../lib/prisma';

const router = Router();

// ─── 用户接口（需认证） ───

/**
 * POST /api/coder/chat - 发送消息给柯德
 */
router.post('/chat', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { message, context } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, error: { message: '消息内容不能为空' } });
      return;
    }

    const result = await coderService.chat(userId, message.trim(), context);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/coder/history - 获取对话历史（分页）
 * Query: limit, before (ISO时间)
 */
router.get('/history', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const before = req.query.before as string | undefined;

    const history = await coderService.getHistory(userId, limit, before);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /api/coder/history - 清除对话历史
 */
router.delete('/history', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    await coderService.clearHistory(userId);
    res.json({ success: true, data: { message: '对话历史已清除' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/coder/profile - 获取柯德用户画像
 */
router.get('/profile', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const profile = await coderService.getUserProfile(userId);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/coder/profile - 更新柯德用户画像（性格、模式等）
 */
router.put('/profile', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { personality, mode, level, preferredLang, weakPoints, strengths, learningGoals } = req.body;

    // 校验性格枚举值
    if (personality && !['mentor', 'lively', 'gentle'].includes(personality)) {
      res.status(400).json({ success: false, error: { message: '无效的性格选项' } });
      return;
    }
    // 校验模式枚举值
    if (mode && !['companion', 'assistant', 'management'].includes(mode)) {
      res.status(400).json({ success: false, error: { message: '无效的模式选项' } });
      return;
    }

    const updated = await coderService.updateUserProfile(userId, {
      personality,
      mode,
      level,
      preferredLang,
      weakPoints,
      strengths,
      learningGoals,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/coder/proactive - 检查主动提示是否应触发
 */
router.post('/proactive', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { event } = req.body;

    if (!event || !event.type) {
      res.status(400).json({ success: false, error: { message: '缺少事件类型' } });
      return;
    }

    const result = await coderService.checkProactiveTrigger(userId, event);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ─── 管理员接口 ───

/**
 * GET /api/coder/admin/config - 获取所有柯德配置
 */
router.get('/admin/config', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const configs = await prisma.coderConfig.findMany({
      orderBy: { key: 'asc' },
    });
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/coder/admin/config - 更新柯德配置
 * Body: { key: string, value: string }
 */
router.put('/admin/config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      res.status(400).json({ success: false, error: { message: '缺少 key 或 value' } });
      return;
    }

    const updated = await prisma.coderConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/coder/admin/stats - 柯德使用统计
 */
router.get('/admin/stats', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const stats = await coderService.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
