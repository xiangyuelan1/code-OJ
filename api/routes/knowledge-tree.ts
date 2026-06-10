import { Router, type Request } from 'express';
import { randomUUID } from 'crypto';
import { knowledgeTreeService } from '../services/knowledge-tree.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

// 异步整理任务管理
interface OrganizeTask {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: { current: number; total: number; phase: string };
  result?: any;
  error?: string;
  startedAt: Date;
}
const organizeTasks = new Map<string, OrganizeTask>();

const router = Router();

router.get('/', async (_req: Request, res: any): Promise<void> => {
  try {
    const tree = await knowledgeTreeService.getKnowledgeTree();
    res.json({ success: true, data: tree });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/stats', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const stats = await knowledgeTreeService.getNodeStatistics();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/classify-unassigned', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const result = await knowledgeTreeService.suggestClassifyUnassignedProblems(userId, req.body?.limit);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/organize-unassigned', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const taskId = randomUUID();
    const task: OrganizeTask = {
      id: taskId,
      status: 'running',
      progress: { current: 0, total: 0, phase: '初始化中...' },
      startedAt: new Date(),
    };
    organizeTasks.set(taskId, task);

    // 后台异步执行整理任务
    knowledgeTreeService.organizeUnassignedProblems(userId, {
      limit: req.body?.limit,
      autoApplyThreshold: req.body?.autoApplyThreshold,
    }, (current, total, phase) => {
      task.progress = { current, total, phase };
    }).then(result => {
      task.status = 'completed';
      task.result = result;
    }).catch(err => {
      task.status = 'failed';
      task.error = err.message || '整理任务执行失败';
    });

    res.status(202).json({ success: true, data: { taskId, status: 'running' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/ai/organize-status/:taskId', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  const task = organizeTasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({ success: false, error: { message: '任务不存在' } });
    return;
  }
  res.json({
    success: true,
    data: {
      id: task.id,
      status: task.status,
      progress: task.progress,
      result: task.result,
      error: task.error,
    },
  });
  // 已完成或失败的任务读取后清理，避免内存泄漏
  if (task.status !== 'running') {
    organizeTasks.delete(task.id);
  }
});

router.get('/ai/suggestions', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const suggestions = await knowledgeTreeService.getPendingClassificationSuggestions();
    res.json({ success: true, data: suggestions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/suggestions/:id/apply', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const result = await knowledgeTreeService.applyClassificationSuggestion(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/suggestions/:id/skip', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const result = await knowledgeTreeService.skipClassificationSuggestion(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/nodes/:id/confirm', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const node = await knowledgeTreeService.confirmTemporaryNode(req.params.id);
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/nodes/:id/find-problems', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const scope = req.body?.scope === 'all' ? 'all' : 'unassigned';
    const result = await knowledgeTreeService.findProblemsForNode(req.params.id, scope, userId, req.body?.limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai/nodes/:id/attach-problems', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { problemIds } = req.body;
    if (!Array.isArray(problemIds)) {
      res.status(400).json({ success: false, error: { message: 'problemIds必须是数组' } });
      return;
    }
    const result = await knowledgeTreeService.attachProblemsToNode(req.params.id, problemIds);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const node = await knowledgeTreeService.createNode(req.body);
    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const node = await knowledgeTreeService.updateNode(req.params.id, req.body);
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await knowledgeTreeService.deleteNode(req.params.id);
    res.json({ success: true, data: { message: '节点已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/auto-compose', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { description } = req.body;
    if (!description || !description.trim()) {
      res.status(400).json({ success: false, error: { message: '请输入自然语言描述' } });
      return;
    }
    const userId = (req as any).user?.id;
    const result = await knowledgeTreeService.autoComposeFromNL(userId, description.trim());
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/import', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { content, fileType } = req.body;
    if (!content || !fileType) {
      res.status(400).json({ success: false, error: { message: '缺少文件内容或类型' } });
      return;
    }
    
    const nodes = await knowledgeTreeService.importFromFile(content, fileType);
    res.status(201).json({ success: true, data: nodes });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/classify/:problemId', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { knowledgeTreeId } = req.body;
    const result = await knowledgeTreeService.classifyProblem(req.params.problemId, knowledgeTreeId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/node/:id/problems', async (req: Request, res: any): Promise<void> => {
  try {
    const problems = await knowledgeTreeService.getProblemsByNode(req.params.id);
    res.json({ success: true, data: problems });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
