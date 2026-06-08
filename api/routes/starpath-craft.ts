import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { starpathCraftService } from '../services/starpath-craft.service';

const router = Router();

/** 获取用户背包 */
router.get('/inventory', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starpathCraftService.getUserInventory(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 获取可用合成配方 */
router.get('/recipes', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    // 首次访问时自动初始化配方种子
    await starpathCraftService.seedRecipes();
    const data = await starpathCraftService.getAvailableRecipes(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 执行合成 */
router.post('/craft', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { recipeId } = req.body;
    if (!recipeId) {
      res.status(400).json({ success: false, error: { message: '缺少 recipeId' } });
      return;
    }
    const data = await starpathCraftService.craft(userId, recipeId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 合成历史 */
router.get('/history', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starpathCraftService.getCraftHistory(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
