import { Router, type Request } from 'express';
import { submissionService } from '../services/submission.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.get('/admin/all', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const userId = req.query.userId as string | undefined;
    const problemId = req.query.problemId as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (userId) where.userId = userId;
    if (problemId) where.problemId = problemId;
    if (status) where.status = status;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          user: { select: { username: true, email: true } },
          problem: { select: { title: true, type: true, difficulty: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.submission.count({ where })
    ]);

    const parsedSubmissions = submissions.map(s => ({
      ...s,
      result: s.result ? (() => { try { return JSON.parse(s.result); } catch { return s.result; } })() : null
    }));

    res.json({ success: true, data: { submissions: parsedSubmissions, total, page, pageSize } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problemId, type, code, language, answer, answers } = req.body;

    if (!problemId || !type) {
      res.status(400).json({ success: false, error: { message: '缺少必要参数' } });
      return;
    }

    let submission;
    switch (type) {
      case 'PROGRAMMING':
        if (!code || !language) {
          res.status(400).json({ success: false, error: { message: '编程题需要提供代码和语言' } });
          return;
        }
        try {
          submission = await submissionService.submitProgramming(problemId, userId, code, language);
        } catch (error: any) {
          res.status(400).json({ success: false, error: { message: error.message || '判题失败，请重试' } });
          return;
        }
        break;
      case 'CHOICE':
        if (!answer) {
          res.status(400).json({ success: false, error: { message: '选择题需要提供答案' } });
          return;
        }
        submission = await submissionService.submitChoice(problemId, userId, answer);
        break;
      case 'FILL_BLANK':
        if (!answers || !Array.isArray(answers)) {
          res.status(400).json({ success: false, error: { message: '填空题需要提供答案数组' } });
          return;
        }
        submission = await submissionService.submitFillBlank(problemId, userId, answers);
        break;
      default:
        res.status(400).json({ success: false, error: { message: '无效的题目类型' } });
        return;
    }

    res.status(201).json({ success: true, data: submission });
  } catch (error: any) {
    console.error('提交失败:', error);
    res.status(500).json({ success: false, error: { message: error.message || '提交失败，请重试' } });
  }
});

router.get('/user/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const status = req.query.status as string | undefined;
    const submissions = await submissionService.getUserSubmissions(userId, status);
    res.json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/check-ac/:problemId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const hasAC = await submissionService.checkUserAC(req.params.problemId, userId);
    res.json({ success: true, data: { hasAC } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/solved-problems', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const solved = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: {
        problemId: true,
        problem: {
          select: { id: true, title: true, type: true, difficulty: true, tags: true },
        },
        createdAt: true,
        score: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const unique = solved.filter((s) => {
      if (seen.has(s.problemId)) return false;
      seen.add(s.problemId);
      return true;
    });
    res.json({ success: true, data: unique });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/problem/:problemId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const submissions = await submissionService.getProblemSubmissions(req.params.problemId);
    res.json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id);
    if (!submission) {
      res.status(404).json({ success: false, error: { message: '提交记录不存在' } });
      return;
    }
    res.json({ success: true, data: submission });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
