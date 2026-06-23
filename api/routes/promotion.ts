import { Router } from 'express';
import { promotionService } from '../services/promotion.service';
import { seedDefaultPlansIfEmpty, resetToDefaults } from '../services/pricing-seed.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// ===== 推广码 =====

router.post('/', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const promotion = await promotionService.createPromotion(req.body, userId);
    res.json({ success: true, data: promotion });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    const promotions = await promotionService.getAllPromotions();
    res.json({ success: true, data: promotions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    const stats = await promotionService.getPromotionStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/use', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: { message: '请先登录' } });
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: { message: '请输入推广码' } });
    const result = await promotionService.usePromotion(code, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.patch('/:id/toggle', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const promotion = await promotionService.togglePromotion(req.params.id);
    res.json({ success: true, data: promotion });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    await promotionService.deletePromotion(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ===== 定价计划 =====

router.post('/plans', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const plan = await promotionService.createPlan(req.body);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/plans', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    const plans = await promotionService.getAllPlans();
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// 公开路由：获取活跃定价计划，无需认证
router.get('/plans/active', async (_req, res) => {
  try {
    const plans = await promotionService.getActivePlans();
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// 公开路由：获取按 category 分组的活跃定价计划
router.get('/plans/grouped', async (_req, res) => {
  try {
    const grouped = await promotionService.getActivePlansGrouped();
    res.json({ success: true, data: grouped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// 公开路由：获取FAQ列表
router.get('/faq', async (_req, res) => {
  try {
    const faq = await promotionService.getFaq();
    res.json({ success: true, data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// 管理员路由：更新FAQ列表
router.put('/admin/faq', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { faqList } = req.body;
    if (!Array.isArray(faqList)) {
      return res.status(400).json({ success: false, error: { message: 'faqList 必须是数组' } });
    }
    await promotionService.updateFaq(faqList);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// 管理员路由：用默认数据种子填充数据库
router.post('/admin/seed-defaults', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    await seedDefaultPlansIfEmpty();
    res.json({ success: true, message: '种子数据已填充（仅在数据为空时生效）' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// 管理员路由：重置为默认定价方案和FAQ
router.post('/admin/reset-defaults', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    const result = await resetToDefaults();
    res.json({ success: true, data: result, message: `已重置 ${result.plans} 个默认方案` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/plans/:id', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const plan = await promotionService.updatePlan(req.params.id, req.body);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.patch('/plans/:id/toggle', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const plan = await promotionService.togglePlan(req.params.id);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/plans/:id', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    await promotionService.deletePlan(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ===== 订单 =====

router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: { message: '请先登录' } });
    const order = await promotionService.createOrder({ ...req.body, userId });
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/orders', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    const orders = await promotionService.getOrders();
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ===== 财务统计 =====

router.get('/financial', authMiddleware, roleMiddleware('ADMIN'), async (_req, res) => {
  try {
    const stats = await promotionService.getFinancialStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
