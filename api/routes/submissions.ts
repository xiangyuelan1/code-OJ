import { Router, type Request } from 'express';
import { submissionService } from '../services/submission.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

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
        submission = await submissionService.submitProgramming(problemId, userId, code, language);
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
    res.status(400).json({ success: false, error: { message: error.message } });
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

router.get('/user/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const submissions = await submissionService.getUserSubmissions(userId);
    res.json({ success: true, data: submissions });
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

export default router;
