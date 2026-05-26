import { Router, type Request } from 'express';
import { knowledgeTreeService } from '../services/knowledge-tree.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

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
