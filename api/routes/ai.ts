import { Router, type Request } from 'express';
import { aiService } from '../services/ai.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

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

router.post('/generate-testcases', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { problem } = req.body;
    
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const testCases = await aiService.generateTestCases(problem);
    res.json({ success: true, data: { testCases } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/classify-problem', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { problem } = req.body;
    
    if (!problem || !problem.title) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const knowledgeTreeNodes = await prisma.knowledgeTree.findMany({
      where: { level: 1 },
      include: { children: true }
    });

    const result = await aiService.classifyProblem(problem, knowledgeTreeNodes as any);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/parse-knowledge-tree', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ success: false, error: { message: '缺少内容' } });
      return;
    }

    const tree = await aiService.parseFileToKnowledgeTree(content);
    res.json({ success: true, data: { tree } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/parse-problem-file', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { content, fileType } = req.body;
    
    if (!content) {
      res.status(400).json({ success: false, error: { message: '缺少文件内容' } });
      return;
    }

    const problems = await aiService.parseProblemFile(content, fileType || 'txt');
    res.json({ success: true, data: { problems } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
