import { Router, type Request, type Response } from 'express';
import { featureToggleService } from '../services/feature-toggle.service';

const router = Router();

function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: { message: '需要管理员权限' } });
    return;
  }
  next();
}

/* 管理员：获取所有功能配置 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const features = await featureToggleService.getAllFeatures();
    res.json({ success: true, data: features });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/* 管理员：更新功能配置 */
router.put('/:featureKey', requireAdmin, async (req: Request, res: Response) => {
  try {
    const feature = await featureToggleService.updateFeature(req.params.featureKey, req.body);
    res.json({ success: true, data: feature });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/* 管理员：初始化默认功能 */
router.post('/initialize', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await featureToggleService.initializeDefaultFeatures();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/* 公开：获取可见功能列表（供导航栏渲染使用） */
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const features = await featureToggleService.getVisibleFeatures();
    res.json({ success: true, data: features });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
