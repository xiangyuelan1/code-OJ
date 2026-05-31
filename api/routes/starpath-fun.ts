import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { starPathFunService } from '../services/starpath-fun.service';

const router = Router();

router.post('/chest/open', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathFunService.openDailyChest(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/chest/status', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathFunService.getChestStatus(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/pet', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathFunService.getOrCreatePet(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/pet/feed', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathFunService.feedPet(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/pet/type', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathFunService.changePetType(userId, req.body.petType);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/pet/rename', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathFunService.renamePet(userId, req.body.petName);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/pet/types', authMiddleware, (_req: Request, res: any) => {
  res.json({ success: true, data: starPathFunService.getPetTypes() });
});

router.post('/planet/customize', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathFunService.customizePlanet(userId, req.body.planetId, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/planet/customizations', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathFunService.getPlanetCustomizations(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/collect-star', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathFunService.collectStar(userId, req.body.starType || 'common');
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
