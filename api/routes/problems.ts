import { Router, type Request } from 'express';
import { problemService } from '../services/problem.service';
import { aiService } from '../services/ai.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: any): Promise<void> => {
  try {
    const { type, difficulty, search, tag, knowledgeTreeId } = req.query;
    const problems = await problemService.getAllProblems({
      type: type as string,
      difficulty: difficulty as string,
      search: search as string,
      tag: tag as string,
      knowledgeTreeId: knowledgeTreeId as string
    });
    const parsed = problems.map((p: any) => ({
      ...p,
      tags: JSON.parse(p.tags || '[]')
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats/public', async (req: Request, res: any): Promise<void> => {
  try {
    const [problemCount, userCount, submissionCount, acCount] = await Promise.all([
      prisma.problem.count(),
      prisma.user.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'ACCEPTED' } }),
    ]);
    res.json({
      success: true,
      data: { problemCount, userCount, submissionCount, acCount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
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

    aiService.isEnabled().then(async (enabled) => {
      if (!enabled) return;
      try {
        const treeNodes = await prisma.knowledgeTree.findMany({
          where: { level: 1 },
          include: { children: true }
        });
        if (treeNodes.length === 0) return;

        const result = await aiService.classifyProblem(
          { title: req.body.title, description: req.body.description, type: req.body.type },
          treeNodes as any
        );

        if (result.nodeIds && result.nodeIds.length > 0) {
          await prisma.problem.update({
            where: { id: problem.id },
            data: { knowledgeTreeId: result.nodeIds[0] }
          });
        }
      } catch (e) {
        console.error('AI自动分类失败:', e);
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/batch-import', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const { problems } = req.body;

    if (!Array.isArray(problems) || problems.length === 0) {
      res.status(400).json({ success: false, error: { message: '请提供题目数组' } });
      return;
    }

    const results = await problemService.batchCreateProblems(problems);
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(201).json({
      success: true,
      data: {
        total: problems.length,
        succeeded,
        failed,
        results
      }
    });
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

export default router;
