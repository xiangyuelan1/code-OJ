import { Router, type Request } from 'express';
import { aiService } from '../services/ai.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.post('/explain-code', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const { code, language } = req.body;
    
    if (!code || !language) {
      res.status(400).json({ success: false, error: { message: '缺少代码或语言参数' } });
      return;
    }

    const explanation = await aiService.explainCode(code, language);
    res.json({ success: true, data: { explanation } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/hint', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const { problem, context } = req.body;
    
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const hint = await aiService.getHint(problem, context);
    res.json({ success: true, data: { hint } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/diagnose', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const { code, language, error } = req.body;
    
    if (!code || !language || !error) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数' } });
      return;
    }

    const diagnosis = await aiService.diagnoseError(code, language, error);
    res.json({ success: true, data: { diagnosis } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const config = await aiService.getConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const config = await aiService.updateConfig(req.body);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/generate-solution', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { problem } = req.body;
    
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const solution = await aiService.generateSolution(problem);
    res.json({ success: true, data: { solution } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
