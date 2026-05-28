import { Router, type Request, type Response } from 'express';
import { learningAdminService } from '../services/learning-admin.service';

const router = Router();

function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: { message: '需要管理员权限' } });
    return;
  }
  next();
}

router.use(requireAdmin);

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await learningAdminService.getLearningModuleStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/region', async (req: Request, res: Response) => {
  try {
    const region = await learningAdminService.manageStarRegion(req.body);
    res.json({ success: true, data: region });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/region/:id', async (req: Request, res: Response) => {
  try {
    const region = await learningAdminService.deleteStarRegion(req.params.id);
    res.json({ success: true, data: region });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/planet', async (req: Request, res: Response) => {
  try {
    const planet = await learningAdminService.manageStarPlanet(req.body);
    res.json({ success: true, data: planet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/planet/:id', async (req: Request, res: Response) => {
  try {
    const planet = await learningAdminService.deleteStarPlanet(req.params.id);
    res.json({ success: true, data: planet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/planet/:id/problems', async (req: Request, res: Response) => {
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

router.get('/interview-templates', async (_req: Request, res: Response) => {
  try {
    const templates = await learningAdminService.getInterviewTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/interview-template', async (req: Request, res: Response) => {
  try {
    const template = await learningAdminService.createInterviewTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/interview-template/:id', async (req: Request, res: Response) => {
  try {
    const template = await learningAdminService.deleteInterviewTemplate(req.params.id);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/bug-scenarios', async (_req: Request, res: Response) => {
  try {
    const scenarios = await learningAdminService.getBugScenarios();
    res.json({ success: true, data: scenarios });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/bug-scenario', async (req: Request, res: Response) => {
  try {
    const scenario = await learningAdminService.createBugScenario(req.body);
    res.json({ success: true, data: scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/bug-scenario/:id', async (req: Request, res: Response) => {
  try {
    const scenario = await learningAdminService.deleteBugScenario(req.params.id);
    res.json({ success: true, data: scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
