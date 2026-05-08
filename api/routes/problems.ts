import { Router, type Request } from 'express';
import { problemService } from '../services/problem.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/', async (req: Request, res: any): Promise<void> => {
  try {
    const { type, difficulty, search } = req.query;
    const problems = await problemService.getAllProblems({
      type: type as string,
      difficulty: difficulty as string,
      search: search as string
    });
    res.json({ success: true, data: problems });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const problem = await problemService.getProblemById(req.params.id);
    if (!problem) {
      res.status(404).json({ success: false, error: { message: '题目不存在' } });
      return;
    }
    res.json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const problem = await problemService.createProblem(req.body);
    res.status(201).json({ success: true, data: problem });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const problem = await problemService.updateProblem(req.params.id, req.body);
    res.json({ success: true, data: problem });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await problemService.deleteProblem(req.params.id);
    res.json({ success: true, data: { message: '题目已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats/overview', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const stats = await problemService.getProblemStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
