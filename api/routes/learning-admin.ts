import { Router, type Request } from 'express';
import { learningAdminService } from '../services/learning-admin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/stats', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any) => {
  try {
    const stats = await learningAdminService.getLearningModuleStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/region', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const region = await learningAdminService.manageStarRegion(req.body);
    res.json({ success: true, data: region });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/region/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const region = await learningAdminService.deleteStarRegion(req.params.id);
    res.json({ success: true, data: region });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/planet', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const planet = await learningAdminService.manageStarPlanet(req.body);
    res.json({ success: true, data: planet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/planet/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const planet = await learningAdminService.deleteStarPlanet(req.params.id);
    res.json({ success: true, data: planet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/planet/:id/problems', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const planet = await learningAdminService.assignProblemsToPlanet(
      req.params.id,
      req.body.problemIds,
    );
    res.json({ success: true, data: planet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/interview-templates', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any) => {
  try {
    const templates = await learningAdminService.getInterviewTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/interview-template', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const template = await learningAdminService.createInterviewTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/interview-template/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const template = await learningAdminService.deleteInterviewTemplate(req.params.id);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/bug-scenarios', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any) => {
  try {
    const scenarios = await learningAdminService.getBugScenarios();
    res.json({ success: true, data: scenarios });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/bug-scenario', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const scenario = await learningAdminService.createBugScenario(req.body);
    res.json({ success: true, data: scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/bug-scenario/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const scenario = await learningAdminService.deleteBugScenario(req.params.id);
    res.json({ success: true, data: scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
