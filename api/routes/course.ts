import { Router, type Request } from 'express';
import { courseService } from '../services/course.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// ========== 教师/管理员操作 ==========

/** 获取班级的所有课程 */
router.get('/class/:classId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const courses = await courseService.getCoursesByClass(req.params.classId);
    res.json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 获取课程详情 */
router.get('/:courseId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const course = await courseService.getCourseById(req.params.courseId);
    if (!course) {
      res.status(404).json({ success: false, error: { message: '课程不存在' } });
      return;
    }
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 创建课程 */
router.post('/', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { classId, name, description } = req.body;
    if (!classId || !name) {
      res.status(400).json({ success: false, error: { message: '班级ID和课程名称必填' } });
      return;
    }
    const course = await courseService.createCourse({
      classId,
      name,
      description,
      createdBy: (req as any).user.userId,
    });
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 更新课程 */
router.patch('/:courseId', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { name, description } = req.body;
    const course = await courseService.updateCourse(req.params.courseId, { name, description });
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 删除课程 */
router.delete('/:courseId', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await courseService.deleteCourse(req.params.courseId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========== 阶段管理 ==========

router.post('/stages', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { courseId, name } = req.body;
    if (!courseId || !name) {
      res.status(400).json({ success: false, error: { message: '课程ID和阶段名称必填' } });
      return;
    }
    const stage = await courseService.createStage(courseId, name);
    res.json({ success: true, data: stage });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.patch('/stages/:stageId', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { name, order } = req.body;
    const stage = await courseService.updateStage(req.params.stageId, { name, order });
    res.json({ success: true, data: stage });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/stages/:stageId', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await courseService.deleteStage(req.params.stageId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========== 讲次管理 ==========

router.post('/sessions', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { stageId, name } = req.body;
    if (!stageId || !name) {
      res.status(400).json({ success: false, error: { message: '阶段ID和讲次名称必填' } });
      return;
    }
    const session = await courseService.createSession(stageId, name);
    res.json({ success: true, data: session });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.patch('/sessions/:sessionId', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { name, order, problemIds, materialText, examId } = req.body;
    const session = await courseService.updateSession(req.params.sessionId, { name, order, problemIds, materialText, examId });
    res.json({ success: true, data: session });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/sessions/:sessionId', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    await courseService.deleteSession(req.params.sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========== 学生进度 ==========

/** 获取学生在某课程的进度 */
router.get('/:courseId/progress', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const progress = await courseService.getStudentProgress(userId, req.params.courseId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 更新学习进度 */
router.post('/:courseId/progress', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { sessionId, status } = req.body;
    if (!sessionId || !status) {
      res.status(400).json({ success: false, error: { message: '讲次ID和状态必填' } });
      return;
    }
    const progress = await courseService.updateProgress(userId, req.params.courseId, sessionId, status);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========== AI 生成课程 ==========

router.post('/ai-generate', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { topic, totalSessions, difficulty, knowledgePoints, classId } = req.body;
    if (!topic || !classId) {
      res.status(400).json({ success: false, error: { message: '课程主题和班级ID必填' } });
      return;
    }
    const result = await courseService.aiGenerateCourseOutline({
      topic,
      totalSessions: totalSessions || 10,
      difficulty: difficulty || 'MEDIUM',
      knowledgePoints,
      classId,
      createdBy: (req as any).user.userId,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// AI 补全课程大纲
router.post('/ai-complete-syllabus', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { courseId, targetTotal } = req.body;
    if (!courseId) {
      res.status(400).json({ success: false, error: { message: '课程ID必填' } });
      return;
    }
    const result = await courseService.aiCompleteSyllabus({
      courseId,
      targetTotal: targetTotal || 10,
      userId: (req as any).user.userId,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// AI 生成讲次内容
router.post('/ai-generate-content', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { sessionId, keywords, referenceText } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, error: { message: '讲次ID必填' } });
      return;
    }
    const result = await courseService.aiGenerateSessionContent({
      sessionId,
      keywords,
      referenceText,
      userId: (req as any).user.userId,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// AI 智能选题
router.post('/ai-recommend-problems', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { sessionId, count } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, error: { message: '讲次ID必填' } });
      return;
    }
    const result = await courseService.aiRecommendProblems({
      sessionId,
      count,
      userId: (req as any).user.userId,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// AI 润色内容
router.post('/ai-polish-content', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { sessionId, originalText, instruction } = req.body;
    if (!sessionId || !originalText) {
      res.status(400).json({ success: false, error: { message: '讲次ID和原始内容必填' } });
      return;
    }
    const result = await courseService.aiPolishContent({
      sessionId,
      originalText,
      instruction,
      userId: (req as any).user.userId,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
