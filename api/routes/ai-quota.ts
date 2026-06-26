import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

// ============================
// 默认配额种子数据
// ============================
const DEFAULT_QUOTA_CONFIGS = [
  { accessType: 'TRIAL', monthlyQuota: 5000, dailyLimit: 500, maxPerCall: 4096, allowedFeatures: '["hint"]', priority: 0 },
  { accessType: 'PAID_BASIC', monthlyQuota: 50000, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["hint","companion","review"]', priority: 0 },
  { accessType: 'PAID_STANDARD', monthlyQuota: 200000, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["*"]', priority: 0 },
  { accessType: 'PAID_PREMIUM', monthlyQuota: 500000, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["*"]', priority: 1 },
  { accessType: 'TEACHER_BASIC', monthlyQuota: 100000, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["*"]', priority: 0 },
  { accessType: 'TEACHER_STANDARD', monthlyQuota: 500000, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["*"]', priority: 0 },
  { accessType: 'TEACHER_PRO', monthlyQuota: 2000000, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["*"]', priority: 1 },
  { accessType: 'ADMIN', monthlyQuota: 999999999, dailyLimit: 0, maxPerCall: 4096, allowedFeatures: '["*"]', priority: 2 },
];

// ============================
// 配额配置 CRUD (管理员)
// ============================

/** GET /api/ai/quota/config - 获取所有配额配置 */
router.get('/config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await prisma.aITokenQuotaConfig.findMany({
      orderBy: { priority: 'desc' },
    });
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** PUT /api/ai/quota/config/:accessType - 更新指定访问类型的配额 */
router.put('/config/:accessType', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessType } = req.params;
    const { monthlyQuota, dailyLimit, maxPerCall, allowedFeatures, priority } = req.body;

    const config = await prisma.aITokenQuotaConfig.upsert({
      where: { accessType },
      update: {
        ...(monthlyQuota !== undefined && { monthlyQuota }),
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(maxPerCall !== undefined && { maxPerCall }),
        ...(allowedFeatures !== undefined && { allowedFeatures: typeof allowedFeatures === 'string' ? allowedFeatures : JSON.stringify(allowedFeatures) }),
        ...(priority !== undefined && { priority }),
      },
      create: {
        accessType,
        monthlyQuota: monthlyQuota ?? 0,
        dailyLimit: dailyLimit ?? 0,
        maxPerCall: maxPerCall ?? 4096,
        allowedFeatures: typeof allowedFeatures === 'string' ? allowedFeatures : JSON.stringify(allowedFeatures ?? []),
        priority: priority ?? 0,
      },
    });

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** POST /api/ai/quota/config/seed - 初始化默认配额配置 */
router.post('/config/seed', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const results = [];
    for (const cfg of DEFAULT_QUOTA_CONFIGS) {
      const result = await prisma.aITokenQuotaConfig.upsert({
        where: { accessType: cfg.accessType },
        update: {
          monthlyQuota: cfg.monthlyQuota,
          dailyLimit: cfg.dailyLimit,
          maxPerCall: cfg.maxPerCall,
          allowedFeatures: cfg.allowedFeatures,
          priority: cfg.priority,
        },
        create: cfg,
      });
      results.push(result);
    }
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ============================
// Token 加量包 CRUD (管理员)
// ============================

/** GET /api/ai/quota/packs - 获取加量包列表（公开） */
router.get('/packs', async (req: Request, res: Response): Promise<void> => {
  try {
    const packs = await prisma.aITokenPack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: packs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** POST /api/ai/quota/packs - 创建加量包 */
router.post('/packs', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, tokens, price, validDays, isActive, sortOrder } = req.body;
    if (!name || !tokens || price === undefined) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数: name, tokens, price' } });
      return;
    }
    const pack = await prisma.aITokenPack.create({
      data: { name, tokens, price, validDays: validDays ?? 30, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    res.json({ success: true, data: pack });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** PUT /api/ai/quota/packs/:id - 更新加量包 */
router.put('/packs/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, tokens, price, validDays, isActive, sortOrder } = req.body;
    const pack = await prisma.aITokenPack.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(tokens !== undefined && { tokens }),
        ...(price !== undefined && { price }),
        ...(validDays !== undefined && { validDays }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    res.json({ success: true, data: pack });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** DELETE /api/ai/quota/packs/:id - 删除加量包 */
router.delete('/packs/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.aITokenPack.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ============================
// 成本预警管理 (管理员)
// ============================

/** GET /api/ai/quota/alerts - 获取所有预警配置 */
router.get('/alerts', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.aICostAlert.findMany({
      orderBy: { threshold: 'asc' },
    });
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** POST /api/ai/quota/alerts - 创建/更新预警 */
router.post('/alerts', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, threshold, period, isEnabled } = req.body;
    if (threshold === undefined) {
      res.status(400).json({ success: false, error: { message: '缺少阈值参数' } });
      return;
    }

    let alert;
    if (id) {
      alert = await prisma.aICostAlert.update({
        where: { id },
        data: {
          ...(threshold !== undefined && { threshold }),
          ...(period !== undefined && { period }),
          ...(isEnabled !== undefined && { isEnabled }),
        },
      });
    } else {
      alert = await prisma.aICostAlert.create({
        data: { threshold, period: period ?? 'monthly', isEnabled: isEnabled ?? true },
      });
    }
    res.json({ success: true, data: alert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** DELETE /api/ai/quota/alerts/:id - 删除预警 */
router.delete('/alerts/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.aICostAlert.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ============================
// 综合用量统计 (管理员)
// ============================

/** GET /api/ai/quota/stats - 全局用量统计 */
router.get('/stats', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 本月总 tokens
    const monthlyTotal = await prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { totalTokens: true, cost: true },
      _count: true,
    });

    // 读取 token 单价配置（每1000 token 的价格）
    const priceConfig = await prisma.systemConfig.findUnique({ where: { key: 'ai_token_price_per_1k' } });
    const pricePerThousand = priceConfig ? parseFloat(priceConfig.value) : 0.002;

    const totalTokensThisMonth = monthlyTotal._sum.totalTokens ?? 0;
    const totalCostThisMonth = monthlyTotal._sum.cost ?? (totalTokensThisMonth / 1000 * pricePerThousand);

    // Top 10 用户（按消耗排序）
    const topUsers = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: monthStart } },
      _sum: { totalTokens: true, cost: true },
      _count: true,
      orderBy: { _sum: { totalTokens: 'desc' } },
      take: 10,
    });

    // 查询用户名
    const userIds = topUsers.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.username]));

    const topUsersWithNames = topUsers.map(u => ({
      userId: u.userId,
      username: userMap.get(u.userId) ?? u.userId,
      totalTokens: u._sum.totalTokens ?? 0,
      totalCost: u._sum.cost ?? 0,
      calls: u._count,
    }));

    // 按功能分组
    const byFeature = await prisma.aIUsageLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: monthStart } },
      _sum: { totalTokens: true, cost: true },
      _count: true,
      orderBy: { _sum: { totalTokens: 'desc' } },
    });

    const featureBreakdown = byFeature.map(f => ({
      feature: f.feature,
      totalTokens: f._sum.totalTokens ?? 0,
      totalCost: f._sum.cost ?? 0,
      calls: f._count,
    }));

    // 30天日趋势
    const dailyLogs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, totalTokens: true, cost: true },
    });

    const dailyTrend: Record<string, { tokens: number; cost: number; calls: number }> = {};
    for (const log of dailyLogs) {
      const date = log.createdAt.toISOString().slice(0, 10);
      if (!dailyTrend[date]) {
        dailyTrend[date] = { tokens: 0, cost: 0, calls: 0 };
      }
      dailyTrend[date].tokens += log.totalTokens;
      dailyTrend[date].cost += log.cost;
      dailyTrend[date].calls += 1;
    }

    const dailyTrendArray = Object.entries(dailyTrend)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        totalTokensThisMonth,
        totalCostThisMonth: Math.round(totalCostThisMonth * 10000) / 10000,
        totalCallsThisMonth: monthlyTotal._count,
        pricePerThousand,
        topUsers: topUsersWithNames,
        featureBreakdown,
        dailyTrend: dailyTrendArray,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ============================
// 当前用户配额状态
// ============================

/** GET /api/ai/quota/my-usage - 当前用户配额与使用情况 */
router.get('/my-usage', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, accessType: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { message: '用户不存在' } });
      return;
    }

    // 确定用户的配额类型映射
    const quotaAccessType = resolveQuotaAccessType(user.role, user.accessType);

    // 查找对应配额配置
    const quotaConfig = await prisma.aITokenQuotaConfig.findUnique({
      where: { accessType: quotaAccessType },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 本月已使用量
    const monthlyUsage = await prisma.aIUsageLog.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
      _count: true,
    });

    // 今日已使用量
    const dailyUsage = await prisma.aIUsageLog.aggregate({
      where: { userId, createdAt: { gte: todayStart } },
      _sum: { totalTokens: true },
      _count: true,
    });

    // 按功能分组（本月）
    const byFeature = await prisma.aIUsageLog.groupBy({
      by: ['feature'],
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
      _count: true,
    });

    const monthlyQuota = quotaConfig?.monthlyQuota ?? 0;
    const dailyLimit = quotaConfig?.dailyLimit ?? 0;
    const usedThisMonth = monthlyUsage._sum.totalTokens ?? 0;
    const usedToday = dailyUsage._sum.totalTokens ?? 0;

    res.json({
      success: true,
      data: {
        accessType: quotaAccessType,
        monthlyQuota,
        usedThisMonth,
        remainingMonthly: monthlyQuota > 0 ? Math.max(0, monthlyQuota - usedThisMonth) : -1, // -1 表示不限
        dailyLimit,
        usedToday,
        remainingDaily: dailyLimit > 0 ? Math.max(0, dailyLimit - usedToday) : -1,
        maxPerCall: quotaConfig?.maxPerCall ?? 4096,
        allowedFeatures: JSON.parse(quotaConfig?.allowedFeatures ?? '["*"]'),
        featureBreakdown: byFeature.map(f => ({
          feature: f.feature,
          tokens: f._sum.totalTokens ?? 0,
          calls: f._count,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ============================
// 辅助函数
// ============================

/**
 * 根据用户角色和 accessType 映射到配额配置的 accessType
 * 将系统中的粗粒度类型（TRIAL/PAID/CLASS/ADMIN）映射到细粒度配额类型
 */
function resolveQuotaAccessType(role: string, accessType: string): string {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'TEACHER') {
    // 教师默认使用 TEACHER_BASIC，可根据具体订单升级
    if (accessType.startsWith('TEACHER_')) return accessType;
    return 'TEACHER_BASIC';
  }
  // 学生类型映射
  if (accessType === 'ADMIN') return 'ADMIN';
  if (accessType.startsWith('PAID_')) return accessType;
  if (accessType === 'PAID') return 'PAID_BASIC';
  if (accessType === 'TRIAL' || accessType === 'CLASS') return 'TRIAL';
  return 'TRIAL';
}

export { resolveQuotaAccessType };
export default router;
