import { Router, type Request } from 'express';
import { solutionService } from '../services/solution.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/problem/:problemId', async (req: Request, res: any): Promise<void> => {
  try {
    const solutions = await solutionService.getSolutionsByProblemId(req.params.problemId);
    res.json({ success: true, data: solutions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const solution = await solutionService.getSolutionById(req.params.id);
    if (!solution) {
      res.status(404).json({ success: false, error: { message: '题解不存在' } });
      return;
    }
    res.json({ success: true, data: solution });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const solution = await solutionService.createSolution(req.body);
    res.status(201).json({ success: true, data: solution });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const solution = await solutionService.updateSolution(req.params.id, req.body);
    res.json({ success: true, data: solution });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await solutionService.deleteSolution(req.params.id);
    res.json({ success: true, data: { message: '题解已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const solutions = await solutionService.getAllSolutions();
    res.json({ success: true, data: solutions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
