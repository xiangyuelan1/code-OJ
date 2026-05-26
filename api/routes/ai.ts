import { Router, type Request } from 'express';
import { aiService } from '../services/ai.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.post('/explain-code', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { code, language } = req.body;
    
    if (!code || !language) {
      res.status(400).json({ success: false, error: { message: '缺少代码或语言参数' } });
      return;
    }

    const explanation = await aiService.explainCode(code, language, userId);
    res.json({ success: true, data: { explanation } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/hint', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problem, context } = req.body;
    
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const hint = await aiService.getHint(problem, context, userId);
    res.json({ success: true, data: { hint } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/diagnose', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { code, language, error } = req.body;
    
    if (!code || !language || !error) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数' } });
      return;
    }

    const diagnosis = await aiService.diagnoseError(code, language, error, userId);
    res.json({ success: true, data: { diagnosis } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/ai-judge', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { code, language, problem, testCases } = req.body;

    if (!code || !language) {
      res.status(400).json({ success: false, error: { message: '缺少代码或语言参数' } });
      return;
    }

    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const result = await aiService.aiJudge({
      code,
      language,
      problem,
      testCases: Array.isArray(testCases) ? testCases : [],
    }, userId);
    res.json({ success: true, data: result });
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
    const userId = (req as any).user.userId;
    const { problem } = req.body;
    
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const solution = await aiService.generateSolution(problem, userId);
    res.json({ success: true, data: { solution } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/generate-testcases', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problem } = req.body;
    
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const testCases = await aiService.generateTestCases(problem, userId);
    res.json({ success: true, data: { testCases } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/classify-problem', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problem } = req.body;
    
    if (!problem || !problem.title) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const knowledgeTreeNodes = await prisma.knowledgeTree.findMany({
      where: { level: 1 },
      include: { children: true }
    });

    const result = await aiService.classifyProblem(problem, knowledgeTreeNodes as any, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/parse-knowledge-tree', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ success: false, error: { message: '缺少内容' } });
      return;
    }

    const tree = await aiService.parseFileToKnowledgeTree(content, userId);
    res.json({ success: true, data: { tree } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/parse-problem-file', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { content, fileType } = req.body;
    
    if (!content) {
      res.status(400).json({ success: false, error: { message: '缺少文件内容' } });
      return;
    }

    const problems = await aiService.parseProblemFile(content, fileType || 'txt', userId);
    res.json({ success: true, data: { problems } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI使用统计
// ========================

router.get('/usage/stats', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const params: any = {};
    if (req.query.userId) params.userId = String(req.query.userId);
    if (req.query.feature) params.feature = String(req.query.feature);
    if (req.query.startDate) params.startDate = new Date(String(req.query.startDate));
    if (req.query.endDate) params.endDate = new Date(String(req.query.endDate));

    const stats = await aiService.getAIUsageStats(params);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/usage/logs', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const params: any = {};
    if (req.query.userId) params.userId = String(req.query.userId);
    if (req.query.feature) params.feature = String(req.query.feature);
    if (req.query.page) params.page = Number(req.query.page);
    if (req.query.pageSize) params.pageSize = Number(req.query.pageSize);

    const logs = await aiService.getAIUsageLogs(params);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取指定班级的 AI 用量统计（教师或管理员）
 */
router.get('/usage/class/:classId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.classId;

    if (userRole !== 'ADMIN') {
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { createdBy: true } });
      if (!cls || cls.createdBy !== userId) {
        const isMember = await prisma.classMember.findUnique({
          where: { classId_userId: { classId, userId } },
        });
        if (!isMember) {
          res.status(403).json({ success: false, error: { message: '无权查看该班级的AI用量' } });
          return;
        }
      }
    }

    const stats = await aiService.getAIUsageByClass(classId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取当前教师的 AI 用量统计
 */
router.get('/usage/teacher', authMiddleware, roleMiddleware('TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const stats = await aiService.getAIUsageByTeacher(userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/generate-exam', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const result = await aiService.generateExam(req.body, (req as any).user?.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/optimize-code', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const { code, language } = req.body;
    if (!code || !language) {
      res.status(400).json({ success: false, error: { message: '请提供代码和语言' } });
      return;
    }
    const result = await aiService.optimizeCode(code, language, (req as any).user?.userId);
    res.json({ success: true, data: { suggestion: result } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/recommend-similar', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const { problemId } = req.body;
    if (!problemId) {
      res.status(400).json({ success: false, error: { message: '请提供题目ID' } });
      return;
    }
    const result = await aiService.recommendSimilarProblems(problemId, (req as any).user?.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/companion', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const result = await aiService.companionChat({ ...req.body, userId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/companion-stream', authMiddleware, async (req: Request, res: any): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let closed = false;
  req.on('close', () => { closed = true; });

  const userId = (req as any).user?.userId;

  try {
    const stream = aiService.companionChatStream({ ...req.body, userId });
    for await (const chunk of stream) {
      if (closed) break;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    if (!closed) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  } catch (error: any) {
    if (!closed) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
  } finally {
    if (!closed) {
      res.end();
    }
  }
});

router.post('/batch-classify', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const result = await aiService.batchClassifyProblems(req.body, (req as any).user?.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 新增 AI 功能路由
// ========================

router.post('/generate-learning-path', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { currentLevel, targetLevel, weakPoints } = req.body;

    if (!currentLevel || !targetLevel) {
      res.status(400).json({ success: false, error: { message: '缺少当前水平或目标水平参数' } });
      return;
    }

    const result = await aiService.generateLearningPath(
      { userId, currentLevel, targetLevel, weakPoints: weakPoints || [] },
      userId,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/analyze-submission-trend', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { recentSubmissions } = req.body;

    if (!recentSubmissions || !Array.isArray(recentSubmissions)) {
      res.status(400).json({ success: false, error: { message: '缺少近期提交记录' } });
      return;
    }

    const result = await aiService.analyzeSubmissionTrend(
      { userId, recentSubmissions },
      userId,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/smart-hint', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problem, userCode, attemptCount, previousHints } = req.body;

    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目信息' } });
      return;
    }

    const result = await aiService.smartHint(
      {
        problem,
        userCode: userCode || '',
        attemptCount: attemptCount || 1,
        previousHints: previousHints || [],
      },
      userId,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI 功能配置管理路由（管理员）
// ========================

router.get('/features', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const configs = await aiService.getFeatureConfigs();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/features/:featureKey', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { featureKey } = req.params;
    const result = await aiService.updateFeatureConfig(featureKey, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/features/initialize', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const result = await aiService.initializeFeatureConfigs();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;