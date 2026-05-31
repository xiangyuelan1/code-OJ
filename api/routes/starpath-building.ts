import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { starPathBuildingService } from '../services/starpath-building.service';

const router = Router();

router.get('/configs', authMiddleware, (_req: Request, res: any) => {
  res.json({ success: true, data: starPathBuildingService.getBuildingConfigs() });
});

router.get('/planet/:planetId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const buildings = await starPathBuildingService.getPlanetBuildings(req.params.planetId, userId);
    res.json({ success: true, data: buildings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/my', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const buildings = await starPathBuildingService.getUserAllBuildings(userId);
    res.json({ success: true, data: buildings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/build', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { planetId, buildingType } = req.body;
    const building = await starPathBuildingService.buildOnPlanet(planetId, userId, buildingType);
    res.json({ success: true, data: building });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/upgrade', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { planetId, buildingType } = req.body;
    const building = await starPathBuildingService.upgradeBuilding(planetId, userId, buildingType);
    res.json({ success: true, data: building });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
