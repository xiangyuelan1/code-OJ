import { Router } from 'express';
import { promotionService } from '../services/promotion.service';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const promotion = await promotionService.createPromotion(req.body, userId);
    res.json({ success: true, data: promotion });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/', async (_req, res) => {
  try {
    const promotions = await promotionService.getAllPromotions();
    res.json({ success: true, data: promotions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const stats = await promotionService.getPromotionStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/use', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: '请先登录' } });
    }
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: { message: '请输入推广码' } });
    }
    const result = await promotionService.usePromotion(code, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const promotion = await promotionService.togglePromotion(req.params.id);
    res.json({ success: true, data: promotion });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await promotionService.deletePromotion(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
