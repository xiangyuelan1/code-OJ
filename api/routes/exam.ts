import { Router, type Request } from 'express';
import { examService } from '../services/exam.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole === 'ADMIN' || userRole === 'TEACHER') {
      const exams = await examService.getExams();
      res.json({ success: true, data: exams });
    } else {
      const exams = await examService.getExams();
      const attempts = await examService.getStudentAttempts(userId);
      const attemptedExamIds = new Set(attempts.map((a: any) => a.examId));

      const availableExams = exams.map((exam: any) => ({
        ...exam,
        hasAttempted: attemptedExamIds.has(exam.id),
        attempt: attempts.find((a: any) => a.examId === exam.id) || null
      }));

      res.json({ success: true, data: availableExams });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const exam = await examService.createExam({
      ...req.body,
      createdBy: userId
    });
    res.status(201).json({ success: true, data: exam });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/my-attempts', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const attempts = await examService.getStudentAttempts(userId);
    res.json({ success: true, data: attempts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const exam = await examService.getExam(req.params.id);
    if (!exam) {
      res.status(404).json({ success: false, error: { message: '考试不存在' } });
      return;
    }
    res.json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body);
    res.json({ success: true, data: exam });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await examService.deleteExam(req.params.id);
    res.json({ success: true, data: { message: '考试已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/start', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const attempt = await examService.startExam(req.params.id, userId);
    res.json({ success: true, data: attempt });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/submit', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { answers } = req.body;
    const result = await examService.submitExam(req.params.id, userId, answers);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/result', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await examService.getExamResult(req.params.id, userId);
    if (!result) {
      res.status(404).json({ success: false, error: { message: '未找到考试记录' } });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/analytics', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const analytics = await examService.getExamAnalytics(req.params.id, userId);
    if (!analytics) {
      res.status(404).json({ success: false, error: { message: '未找到考试记录' } });
      return;
    }
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/attempts', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const attempts = await examService.getExamAttempts(req.params.id);
    res.json({ success: true, data: attempts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/proctoring', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { event, details } = req.body;
    await examService.logProctoringEvent(req.params.id, userId, event, details);
    res.json({ success: true, data: { message: '已记录' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
