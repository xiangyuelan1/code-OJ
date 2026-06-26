import { Router, type Request } from 'express';
import { aiService } from '../services/ai.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { featureMiddleware } from '../middleware/feature.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.post('/explain-code', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
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

router.post('/hint', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
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

router.post('/diagnose', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
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

router.post('/ai-judge', authMiddleware, featureMiddleware('ai-judge'), async (req: Request, res: any): Promise<void> => {
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

router.post('/optimize-code', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
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

router.post('/recommend-similar', authMiddleware, featureMiddleware('ai-find-problems'), async (req: Request, res: any): Promise<void> => {
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

router.post('/companion', authMiddleware, featureMiddleware('ai-companion'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const result = await aiService.companionChat({ ...req.body, userId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/companion-stream', authMiddleware, featureMiddleware('ai-companion'), async (req: Request, res: any): Promise<void> => {
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
// 个性化题单与考试
// ========================

router.post('/personalized-plan', authMiddleware, featureMiddleware('ai-find-problems'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { type, options } = req.body;

    if (!type || !['PROBLEM_LIST', 'EXAM'].includes(type)) {
      res.status(400).json({ success: false, error: { message: 'type 必须为 PROBLEM_LIST 或 EXAM' } });
      return;
    }

    const result = await aiService.generatePersonalizedPlan({ userId, type, options });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/personalized-recommendations', authMiddleware, featureMiddleware('ai-find-problems'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await aiService.getPersonalizedRecommendations({ userId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 个性化推荐配置（管理员）
// ========================

router.put('/personalization-config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { minWeakPointScore, maxProblemsPerPlan, difficultyProgression, focusWeight } = req.body;

    const configData: Record<string, any> = {};
    if (minWeakPointScore !== undefined) configData.minWeakPointScore = Number(minWeakPointScore);
    if (maxProblemsPerPlan !== undefined) configData.maxProblemsPerPlan = Number(maxProblemsPerPlan);
    if (difficultyProgression !== undefined) configData.difficultyProgression = String(difficultyProgression);
    if (focusWeight !== undefined) configData.focusWeight = Number(focusWeight);

    const existing = await prisma.aIFeatureConfig.findUnique({
      where: { featureKey: 'personalization-config' },
    });

    if (existing) {
      const currentConfig: Record<string, any> = existing.promptTemplate
        ? JSON.parse(existing.promptTemplate)
        : {};
      const merged = { ...currentConfig, ...configData };
      const updated = await prisma.aIFeatureConfig.update({
        where: { featureKey: 'personalization-config' },
        data: { promptTemplate: JSON.stringify(merged) },
      });
      res.json({ success: true, data: { ...merged, _meta: { updatedAt: updated.updatedAt } } });
    } else {
      const defaults = {
        minWeakPointScore: 30,
        maxProblemsPerPlan: 10,
        difficultyProgression: 'adaptive',
        focusWeight: 70,
      };
      const merged = { ...defaults, ...configData };
      await prisma.aIFeatureConfig.create({
        data: {
          featureKey: 'personalization-config',
          featureName: '个性化推荐配置',
          description: '控制个性化题单和推荐的参数',
          enabled: true,
          promptTemplate: JSON.stringify(merged),
          maxTokens: 0,
          temperature: 0,
        },
      });
      res.json({ success: true, data: merged });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/personalization-config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const existing = await prisma.aIFeatureConfig.findUnique({
      where: { featureKey: 'personalization-config' },
    });

    const defaults = {
      minWeakPointScore: 30,
      maxProblemsPerPlan: 10,
      difficultyProgression: 'adaptive',
      focusWeight: 70,
    };

    if (existing && existing.promptTemplate) {
      const saved = JSON.parse(existing.promptTemplate);
      res.json({ success: true, data: { ...defaults, ...saved } });
    } else {
      res.json({ success: true, data: defaults });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 新增 AI 功能路由
// ========================

router.post('/generate-learning-path', authMiddleware, featureMiddleware('ai-companion'), async (req: Request, res: any): Promise<void> => {
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

router.post('/analyze-submission-trend', authMiddleware, featureMiddleware('ai-companion'), async (req: Request, res: any): Promise<void> => {
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

router.post('/smart-hint', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
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
// AI 面试模拟器
// ========================

router.post('/interview/simulate', authMiddleware, featureMiddleware('interview'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { role, difficulty } = req.body;

    if (!role || !difficulty) {
      res.status(400).json({ success: false, error: { message: '缺少角色或难度参数' } });
      return;
    }

    const result = await aiService.simulateInterview(userId, { role, difficulty });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/interview/evaluate', authMiddleware, featureMiddleware('interview'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { questionId, code, language } = req.body;

    if (!questionId || !code || !language) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数' } });
      return;
    }

    const result = await aiService.evaluateInterviewAnswer(userId, questionId, code, language);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI Bug 猎手
// ========================

router.post('/bug-hunter/generate', authMiddleware, featureMiddleware('bug-hunter'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
      res.status(400).json({ success: false, error: { message: '缺少主题或难度参数' } });
      return;
    }

    const result = await aiService.generateBuggyCode(userId, { topic, difficulty });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/bug-hunter/verify', authMiddleware, featureMiddleware('bug-hunter'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { buggyCodeId, fixedCode } = req.body;

    if (!buggyCodeId || !fixedCode) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数' } });
      return;
    }

    const result = await aiService.verifyBugFix(userId, buggyCodeId, fixedCode);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI 学习日记
// ========================

router.post('/learning-diary', authMiddleware, featureMiddleware('ai-companion'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { from, to } = req.body;

    if (!from || !to) {
      res.status(400).json({ success: false, error: { message: '缺少日期范围参数' } });
      return;
    }

    const result = await aiService.generateLearningDiary(userId, {
      from: new Date(from),
      to: new Date(to),
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI 代码解说员
// ========================

router.post('/code-commentary', authMiddleware, featureMiddleware('ai-companion'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { code, language, problemTitle } = req.body;

    if (!code || !language || !problemTitle) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数' } });
      return;
    }

    const result = await aiService.generateCodeCommentary(userId, code, language, problemTitle);
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

router.post('/generate-problem', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { keywords, type, difficulty, count, topic, language, tags, requirements } = req.body;

    // 兼容新旧两种调用方式：topic 字段为新版 AI 出题入口
    const effectiveKeywords = topic || keywords;
    if (!effectiveKeywords || !effectiveKeywords.trim()) {
      res.status(400).json({ success: false, error: { message: '请输入主题或关键词' } });
      return;
    }

    const problems = await aiService.generateProblem({
      keywords: effectiveKeywords,
      type,
      difficulty,
      count,
      language,
      tags,
      requirements,
    }, userId);
    res.json({ success: true, data: problems });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// AI 出题 - 保存到题库
router.post('/generate-problem/save', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const { problem } = req.body;
    if (!problem || !problem.title || !problem.description) {
      res.status(400).json({ success: false, error: { message: '缺少题目必要字段（title, description）' } });
      return;
    }

    const created = await prisma.problem.create({
      data: {
        title: problem.title,
        description: problem.description,
        type: problem.type || 'PROGRAMMING',
        difficulty: problem.difficulty || 'MEDIUM',
        tags: typeof problem.tags === 'string' ? problem.tags : JSON.stringify(problem.tags || []),
        testCases: typeof problem.testCases === 'string' ? problem.testCases : JSON.stringify(problem.testCases || []),
        timeLimit: problem.timeLimit || 2000,
        memoryLimit: problem.memoryLimit || 256,
        choices: problem.choices ? (typeof problem.choices === 'string' ? problem.choices : JSON.stringify(problem.choices)) : null,
        correctAnswer: problem.correctAnswer || null,
        solution: problem.solution || null,
        aiGeneratedTestCases: true,
        aiGeneratedSolution: !!problem.solution,
      },
    });

    res.json({ success: true, data: created });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// AI 班级报告
router.post('/class-report', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { classId, timeRange } = req.body;

    if (!classId) {
      res.status(400).json({ success: false, error: { message: '缺少 classId 参数' } });
      return;
    }

    // 权限检查：教师只能查看自己创建的班级
    if (userRole !== 'ADMIN') {
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { createdBy: true } });
      if (!cls || cls.createdBy !== userId) {
        res.status(403).json({ success: false, error: { message: '无权查看该班级报告' } });
        return;
      }
    }

    const report = await aiService.generateClassReport(classId, timeRange || 'week', userId);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI 错题分析
// ========================

router.post('/analyze-mistakes', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { timeRange = 'week' } = req.body;

    // 根据时间范围计算起始日期
    const now = new Date();
    let startDate: Date | undefined;
    if (timeRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    // timeRange === 'all' 时不设置 startDate

    // 获取用户错误提交记录
    const whereClause: any = {
      userId,
      status: { not: 'ACCEPTED' },
    };
    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }

    const wrongSubmissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        problem: {
          include: { knowledgeTree: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    if (wrongSubmissions.length === 0) {
      res.json({
        success: true,
        data: {
          weakPoints: [],
          patterns: [],
          suggestions: ['目前没有错误记录，继续保持！'],
          practiceRecommendations: [],
        },
      });
      return;
    }

    // 按知识点分组统计
    const knowledgeMap: Record<string, { name: string; count: number }> = {};
    const statusMap: Record<string, number> = {};

    for (const sub of wrongSubmissions) {
      const ktName = (sub.problem as any)?.knowledgeTree?.name || '未分类';
      const ktId = (sub.problem as any)?.knowledgeTreeId || 'unknown';
      if (!knowledgeMap[ktId]) {
        knowledgeMap[ktId] = { name: ktName, count: 0 };
      }
      knowledgeMap[ktId].count++;

      const status = sub.status || 'UNKNOWN';
      statusMap[status] = (statusMap[status] || 0) + 1;
    }

    // 构建 AI 分析提示词
    const knowledgeSummary = Object.entries(knowledgeMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([_, v]) => `${v.name}: ${v.count}次错误`)
      .join('\n');

    const statusSummary = Object.entries(statusMap)
      .map(([status, count]) => `${status}: ${count}次`)
      .join('\n');

    const prompt = `你是一位专业的编程学习分析师。请分析以下学生的错题数据，给出详细的学习建议。

## 错误统计（共 ${wrongSubmissions.length} 次错误提交）

### 按知识点分布：
${knowledgeSummary}

### 按错误类型分布：
${statusSummary}

请严格按以下 JSON 格式返回分析结果（不要添加任何其他文字或 markdown 标记）：
{
  "weakPoints": ["薄弱知识点1", "薄弱知识点2", ...],
  "patterns": ["错误模式描述1", "错误模式描述2", ...],
  "suggestions": ["具体建议1", "具体建议2", ...],
  "practiceRecommendations": [
    { "reason": "推荐理由" },
    { "reason": "推荐理由" }
  ]
}

要求：
1. weakPoints：列出 3-5 个最薄弱的知识点
2. patterns：分析 2-4 种常见错误模式（如超时说明算法效率不足，运行错误说明边界处理不当等）
3. suggestions：给出 3-5 条具体可操作的学习建议
4. practiceRecommendations：给出 2-4 条练习方向推荐`;

    const config = await aiService.getConfig();
    let result: any;

    if (config?.apiKey) {
      const aiResponse = await aiService.analyzeMistakes(prompt, userId);
      try {
        // 尝试解析 JSON 响应
        const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleaned);
      } catch {
        // AI 返回非标准 JSON，使用 fallback
        result = {
          weakPoints: Object.entries(knowledgeMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([_, v]) => v.name),
          patterns: Object.entries(statusMap).map(([status, count]) => 
            `${status === 'WRONG_ANSWER' ? '答案错误' : status === 'TIME_LIMIT_EXCEEDED' ? '超时' : status === 'RUNTIME_ERROR' ? '运行错误' : status}: ${count}次`
          ),
          suggestions: [aiResponse],
          practiceRecommendations: [],
        };
      }
    } else {
      // 无 AI 配置，直接返回统计数据
      result = {
        weakPoints: Object.entries(knowledgeMap)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([_, v]) => v.name),
        patterns: Object.entries(statusMap).map(([status, count]) =>
          `${status === 'WRONG_ANSWER' ? '答案错误' : status === 'TIME_LIMIT_EXCEEDED' ? '超时' : status === 'RUNTIME_ERROR' ? '运行错误' : status}: ${count}次`
        ),
        suggestions: ['建议针对薄弱知识点进行集中练习', '注意代码边界条件处理', '学习优化算法以避免超时'],
        practiceRecommendations: [],
      };
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// AI 代码解释（增强版 - 结构化返回）
// ========================

router.post('/explain-code-detailed', authMiddleware, featureMiddleware('ai-hint'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { code, language, context } = req.body;

    if (!code || !language) {
      res.status(400).json({ success: false, error: { message: '缺少代码或语言参数' } });
      return;
    }

    const result = await aiService.explainCodeDetailed(code, language, context, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;