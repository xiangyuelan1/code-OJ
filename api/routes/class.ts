import { Router, type Request } from 'express';
import { classService } from '../services/class.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

/**
 * 通过班级码加入班级（必须在 /:id 路由之前注册，避免路径冲突）
 */
router.post('/join-by-code', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { classCode, message } = req.body;

    if (!classCode) {
      res.status(400).json({ success: false, error: { message: '班级码不能为空' } });
      return;
    }

    const result = await classService.joinClassByCode(classCode, userId, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取当前用户提交的待审核加入申请（必须在 /:id 路由之前注册）
 */
router.get('/my-join-requests', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const requests = await classService.getMyJoinRequests(userId);
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取待审核申请数量（管理员/教师，必须在 /:id 路由之前注册）
 */
router.get('/pending-count', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const count = await classService.getPendingRequestCount(userId);
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 教师仪表盘（必须在 /:id 路由之前注册，避免路径冲突）
 */
router.get('/teacher/dashboard', authMiddleware, roleMiddleware('TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const dashboard = await classService.getTeacherDashboard(userId);
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 重新生成班级码（仅创建者或管理员）
 */
router.post('/:id/generate-code', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以生成班级码' } });
        return;
      }
    }

    const code = await classService.generateClassCode(classId);
    res.json({ success: true, data: { classCode: code } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classes = await classService.getClassesByUser(userId);
    res.json({ success: true, data: classes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { name, description, grade } = req.body;
    const cls = await classService.createClass({
      name,
      description,
      grade,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: cls });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以更新班级' } });
        return;
      }
    }

    const { name, description, grade } = req.body;
    const cls = await classService.updateClass(classId, { name, description, grade });
    res.json({ success: true, data: cls });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 更新班级 AI 费用承担模式（教师或管理员）
 */
router.put('/:id/ai-billing', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;
    const { aiBillingMode } = req.body;

    if (!aiBillingMode || !['TEACHER_PAYS', 'STUDENT_PAYS'].includes(aiBillingMode)) {
      res.status(400).json({ success: false, error: { message: '无效的计费模式，可选值: TEACHER_PAYS, STUDENT_PAYS' } });
      return;
    }

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以修改AI费用设置' } });
        return;
      }
    }

    const cls = await classService.updateClassAIBilling(classId, aiBillingMode);
    res.json({ success: true, data: cls });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以删除班级' } });
        return;
      }
    }

    await classService.deleteClass(classId);
    res.json({ success: true, data: { message: '班级已删除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classId = req.params.id;
    const isMember = await classService.isClassMember(classId, userId);
    const userRole = (req as any).user.role;

    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '您不是该班级的成员' } });
      return;
    }

    const cls = await classService.getClassById(classId);
    if (!cls) {
      res.status(404).json({ success: false, error: { message: '班级不存在' } });
      return;
    }
    res.json({ success: true, data: cls });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/members', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classId = req.params.id;
    const isMember = await classService.isClassMember(classId, userId);
    const userRole = (req as any).user.role;

    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '您不是该班级的成员' } });
      return;
    }

    const members = await classService.getMembers(classId);
    res.json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/members', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const classId = req.params.id;
    const { userId, role } = req.body;
    const member = await classService.addMember(classId, userId, role);
    res.status(201).json({ success: true, data: member });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id/members/:userId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const currentUserId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;
    const targetUserId = req.params.userId;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, currentUserId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以移除成员' } });
        return;
      }
    }

    await classService.removeMember(classId, targetUserId);
    res.json({ success: true, data: { message: '成员已移除' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/join', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classId = req.params.id;
    const message = req.body.message;
    const result = await classService.requestJoinClass(classId, userId, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/leave', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classId = req.params.id;
    await classService.leaveClass(classId, userId);
    res.json({ success: true, data: { message: '已离开班级' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 学情分析
// ========================

router.get('/:id/analytics', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以查看学情分析' } });
        return;
      }
    }

    const analytics = await classService.getClassAnalytics(classId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 作业管理
// ========================

router.post('/:id/homework', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以创建作业' } });
        return;
      }
    }

    const { title, description, problemIds, dueDate } = req.body;
    if (!title || !problemIds || !Array.isArray(problemIds)) {
      res.status(400).json({ success: false, error: { message: '标题和题目列表为必填项' } });
      return;
    }

    const homework = await classService.createHomework(classId, {
      title,
      description,
      problemIds,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: homework });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/homework', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    const isMember = await classService.isClassMember(classId, userId);
    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员可以查看作业' } });
      return;
    }

    const homeworkList = await classService.getHomework(classId);
    res.json({ success: true, data: homeworkList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/homework/:homeworkId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const homeworkId = req.params.homeworkId;
    const homework = await classService.getHomeworkDetail(homeworkId);

    if (!homework) {
      res.status(404).json({ success: false, error: { message: '作业不存在' } });
      return;
    }

    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const isMember = await classService.isClassMember(homework.classId, userId);
    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员可以查看作业详情' } });
      return;
    }

    res.json({ success: true, data: homework });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/homework/:homeworkId/progress', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const homeworkId = req.params.homeworkId;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const homework = await classService.getHomeworkDetail(homeworkId);
    if (!homework) {
      res.status(404).json({ success: false, error: { message: '作业不存在' } });
      return;
    }

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(homework.classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以查看作业进度' } });
        return;
      }
    }

    const progress = await classService.getHomeworkProgress(homeworkId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/homework/:homeworkId/submit', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const homeworkId = req.params.homeworkId;
    const userId = (req as any).user.userId;
    const { problemId, status, score } = req.body;

    if (!problemId) {
      res.status(400).json({ success: false, error: { message: '题目ID为必填项' } });
      return;
    }

    // 验证作业存在且学生属于该班级
    const homework = await classService.getHomeworkDetail(homeworkId);
    if (!homework) {
      res.status(404).json({ success: false, error: { message: '作业不存在' } });
      return;
    }

    const isMember = await classService.isClassMember(homework.classId, userId);
    if (!isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员可以提交作业' } });
      return;
    }

    const submission = await classService.submitHomework(
      homeworkId,
      userId,
      problemId,
      status ?? 'SUBMITTED',
      score,
    );
    res.json({ success: true, data: submission });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 成员详细数据
// ========================

router.get('/:id/members/:userId/detail', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const currentUserId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;
    const targetUserId = req.params.userId;

    const isMember = await classService.isClassMember(classId, currentUserId);
    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员可以查看详细数据' } });
      return;
    }

    const detail = await classService.getMemberDetail(classId, targetUserId);
    res.json({ success: true, data: detail });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 班级PK
// ========================

router.post('/battle', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { initiatorClassId, challengerClassId, problemIds } = req.body;

    if (!initiatorClassId || !challengerClassId) {
      res.status(400).json({ success: false, error: { message: '发起方和挑战方班级ID为必填项' } });
      return;
    }

    const battle = await classService.createClassBattle({
      initiatorClassId,
      challengerClassId,
      problemIds: problemIds || [],
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: battle });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/battle/:battleId/accept', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const battleId = req.params.battleId;

    const existingBattle = await classService.getClassBattleById(battleId);
    if (!existingBattle) {
      res.status(404).json({ success: false, error: { message: 'PK挑战不存在' } });
      return;
    }

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(existingBattle.challengerClassId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有挑战方班级创建者或管理员可以接受PK挑战' } });
        return;
      }
    }

    const battle = await classService.acceptClassBattle(battleId);
    res.json({ success: true, data: battle });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/battle/:battleId/answer', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const battleId = req.params.battleId;
    const { classId, problemId, correct } = req.body;

    if (!classId || !problemId || correct === undefined) {
      res.status(400).json({ success: false, error: { message: '班级ID、题目ID和答题结果为必填项' } });
      return;
    }

    const result = await classService.submitClassBattleAnswer(
      battleId,
      classId,
      userId,
      problemId,
      correct,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/battle/:battleId/complete', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const battleId = req.params.battleId;
    const result = await classService.completeClassBattle(battleId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/battles', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    const isMember = await classService.isClassMember(classId, userId);
    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员可以查看PK记录' } });
      return;
    }

    const battles = await classService.getClassBattles(classId);
    res.json({ success: true, data: battles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 班级专属考试
// ========================

router.post('/:id/exams', authMiddleware, roleMiddleware('ADMIN', 'TEACHER'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classId = req.params.id;
    const { title, description, duration, problemIds, startTime, endTime } = req.body;

    if (!title || !problemIds || !Array.isArray(problemIds)) {
      res.status(400).json({ success: false, error: { message: '考试标题和题目列表为必填项' } });
      return;
    }

    const exam = await classService.createClassExam(classId, {
      title,
      description,
      duration: duration || 60,
      problemIds,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: exam });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id/exams', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    const isMember = await classService.isClassMember(classId, userId);
    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员可以查看班级考试' } });
      return;
    }

    const exams = await classService.getClassExams(classId);
    res.json({ success: true, data: exams });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
