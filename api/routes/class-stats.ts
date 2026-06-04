import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

/**
 * 验证当前用户是否为班级创建者或管理员
 * 若无权限则直接响应 403 并返回 false
 */
async function verifyClassAccess(classId: string, userId: string, userRole: string, res: any): Promise<boolean> {
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { createdBy: true } });
  if (!cls) {
    res.status(404).json({ success: false, error: { message: '班级不存在' } });
    return false;
  }
  if (userRole !== 'ADMIN' && cls.createdBy !== userId) {
    res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以访问' } });
    return false;
  }
  return true;
}

// ========================
// 班级概览统计
// ========================

router.get('/:classId/overview', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { classId } = req.params;

    const hasAccess = await verifyClassAccess(classId, userId, userRole, res);
    if (!hasAccess) return;

    // 获取班级基本信息与成员
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        name: true,
        classCode: true,
        members: {
          select: {
            userId: true,
            user: { select: { id: true, isOnline: true, updatedAt: true } },
          },
        },
      },
    });

    if (!cls) {
      res.status(404).json({ success: false, error: { message: '班级不存在' } });
      return;
    }

    const memberIds = cls.members.map(m => m.userId);

    // 近 7 天活跃学生：updatedAt 在 7 天内的成员
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeStudents = cls.members.filter(m => new Date(m.user.updatedAt) >= sevenDaysAgo).length;

    // 该班级成员的总提交数
    const totalSubmissions = await prisma.submission.count({
      where: { userId: { in: memberIds } },
    });

    // 所有 ACCEPTED 状态提交的平均分
    const acceptedAgg = await prisma.submission.aggregate({
      where: { userId: { in: memberIds }, status: 'ACCEPTED', score: { not: null } },
      _avg: { score: true },
    });

    res.json({
      success: true,
      data: {
        totalStudents: memberIds.length,
        activeStudents,
        totalSubmissions,
        avgScore: acceptedAgg._avg.score ? Math.round(acceptedAgg._avg.score * 100) / 100 : 0,
        classCode: cls.classCode,
        className: cls.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 班级排行榜
// ========================

router.get('/:classId/leaderboard', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { classId } = req.params;
    const sortBy = (req.query.sortBy as string) || 'points';
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    // 验证用户是班级成员或管理员
    const isMember = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (userRole !== 'ADMIN' && !isMember) {
      res.status(403).json({ success: false, error: { message: '只有班级成员或管理员可以查看排行榜' } });
      return;
    }

    const members = await prisma.classMember.findMany({
      where: { classId },
      select: {
        userId: true,
        user: { select: { id: true, username: true, avatar: true, points: true, level: true } },
      },
    });

    if (sortBy === 'submissions') {
      // 按提交数排序：先统计每个成员的提交数
      const submissionCounts = await prisma.submission.groupBy({
        by: ['userId'],
        where: { userId: { in: members.map(m => m.userId) } },
        _count: { id: true },
      });
      const countMap = new Map(submissionCounts.map(s => [s.userId, s._count.id]));

      const ranked = members
        .map(m => ({
          userId: m.user.id,
          username: m.user.username,
          avatar: m.user.avatar,
          points: m.user.points,
          level: m.user.level,
          submissionCount: countMap.get(m.userId) || 0,
        }))
        .sort((a, b) => b.submissionCount - a.submissionCount)
        .slice(0, limit)
        .map((item, index) => ({ rank: index + 1, ...item }));

      res.json({ success: true, data: ranked });
    } else if (sortBy === 'level') {
      // 按等级排序
      const ranked = members
        .map(m => ({
          userId: m.user.id,
          username: m.user.username,
          avatar: m.user.avatar,
          points: m.user.points,
          level: m.user.level,
        }))
        .sort((a, b) => b.level - a.level || b.points - a.points)
        .slice(0, limit)
        .map((item, index) => ({ rank: index + 1, ...item }));

      res.json({ success: true, data: ranked });
    } else {
      // 默认按积分排序
      const ranked = members
        .map(m => ({
          userId: m.user.id,
          username: m.user.username,
          avatar: m.user.avatar,
          points: m.user.points,
          level: m.user.level,
        }))
        .sort((a, b) => b.points - a.points || b.level - a.level)
        .slice(0, limit)
        .map((item, index) => ({ rank: index + 1, ...item }));

      res.json({ success: true, data: ranked });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 班级题目统计
// ========================

router.get('/:classId/problem-stats', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { classId } = req.params;

    const hasAccess = await verifyClassAccess(classId, userId, userRole, res);
    if (!hasAccess) return;

    // 获取该班级所有作业关联的题目 ID
    const homeworks = await prisma.homework.findMany({
      where: { classId },
      select: { problemIds: true },
    });

    // problemIds 是 JSON 字符串，需解析后去重
    const problemIdSet = new Set<string>();
    for (const hw of homeworks) {
      try {
        const ids: string[] = JSON.parse(hw.problemIds);
        ids.forEach(id => problemIdSet.add(id));
      } catch {
        // 忽略解析失败的 problemIds
      }
    }
    const problemIds = Array.from(problemIdSet);

    if (problemIds.length === 0) {
      res.json({
        success: true,
        data: {
          totalProblems: 0,
          avgCompletionRate: 0,
          hardestProblems: [],
          easiestProblems: [],
        },
      });
      return;
    }

    // 获取班级成员 ID
    const members = await prisma.classMember.findMany({
      where: { classId },
      select: { userId: true },
    });
    const memberIds = members.map(m => m.userId);

    // 获取这些题目的作业提交记录
    const hwSubmissions = await prisma.homeworkSubmission.findMany({
      where: {
        homework: { classId },
        problemId: { in: problemIds },
      },
      select: { problemId: true, status: true, score: true },
    });

    // 获取题目信息
    const problems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true, title: true, difficulty: true },
    });
    const problemMap = new Map(problems.map(p => [p.id, p]));

    // 按题目聚合统计
    const problemStatsMap = new Map<string, { attemptCount: number; successCount: number; totalScore: number; scoreCount: number }>();
    for (const sub of hwSubmissions) {
      const stat = problemStatsMap.get(sub.problemId) || { attemptCount: 0, successCount: 0, totalScore: 0, scoreCount: 0 };
      stat.attemptCount += 1;
      if (sub.status === 'ACCEPTED') stat.successCount += 1;
      if (sub.score !== null && sub.score !== undefined) {
        stat.totalScore += sub.score;
        stat.scoreCount += 1;
      }
      problemStatsMap.set(sub.problemId, stat);
    }

    const totalMembers = memberIds.length || 1;

    // 构建题目统计列表
    const problemStatsList = problemIds
      .map(pid => {
        const stat = problemStatsMap.get(pid) || { attemptCount: 0, successCount: 0, totalScore: 0, scoreCount: 0 };
        const problem = problemMap.get(pid);
        return {
          problemId: pid,
          title: problem?.title || '未知题目',
          difficulty: problem?.difficulty || 'MEDIUM',
          avgScore: stat.scoreCount > 0 ? Math.round((stat.totalScore / stat.scoreCount) * 100) / 100 : 0,
          attemptCount: stat.attemptCount,
          successRate: totalMembers > 0 ? Math.round((stat.successCount / totalMembers) * 10000) / 100 : 0,
        };
      });

    // 平均完成率：所有题目的 successRate 的均值
    const avgCompletionRate = problemStatsList.length > 0
      ? Math.round((problemStatsList.reduce((sum, p) => sum + p.successRate, 0) / problemStatsList.length) * 100) / 100
      : 0;

    // 按成功率升序排列（最难）和降序排列（最易）
    const sorted = [...problemStatsList].sort((a, b) => a.successRate - b.successRate);
    const hardestProblems = sorted.slice(0, 5);
    const easiestProblems = [...problemStatsList].sort((a, b) => b.successRate - a.successRate).slice(0, 5);

    res.json({
      success: true,
      data: {
        totalProblems: problemIds.length,
        avgCompletionRate,
        hardestProblems,
        easiestProblems,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 班级内学生个人统计
// ========================

router.get('/:classId/student/:userId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const currentUserId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { classId, userId: targetUserId } = req.params;

    // 验证权限：班级创建者/管理员可查看任意学生，学生只能查看自己
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { createdBy: true } });
    if (!cls) {
      res.status(404).json({ success: false, error: { message: '班级不存在' } });
      return;
    }

    const isCreatorOrAdmin = userRole === 'ADMIN' || cls.createdBy === currentUserId;
    if (!isCreatorOrAdmin && currentUserId !== targetUserId) {
      res.status(403).json({ success: false, error: { message: '无权查看该学生数据' } });
      return;
    }

    // 验证目标用户是班级成员
    const membership = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId: targetUserId } },
    });
    if (!membership) {
      res.status(404).json({ success: false, error: { message: '该用户不是班级成员' } });
      return;
    }

    // 用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, avatar: true, points: true, level: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { message: '用户不存在' } });
      return;
    }

    // 提交统计
    const [totalSubs, acceptedSubs, wrongSubs] = await Promise.all([
      prisma.submission.count({ where: { userId: targetUserId } }),
      prisma.submission.count({ where: { userId: targetUserId, status: 'ACCEPTED' } }),
      prisma.submission.count({ where: { userId: targetUserId, status: 'WRONG_ANSWER' } }),
    ]);

    // 最近 10 条提交
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        problemId: true,
        status: true,
        score: true,
        createdAt: true,
      },
    });

    // 考试统计
    const [totalExams, passedExams, examAgg] = await Promise.all([
      prisma.examAttempt.count({ where: { userId: targetUserId } }),
      prisma.examAttempt.count({ where: { userId: targetUserId, status: 'COMPLETED', score: { gte: 60 } } }),
      prisma.examAttempt.aggregate({
        where: { userId: targetUserId, score: { not: null } },
        _avg: { score: true },
      }),
    ]);

    // 错题统计
    const [totalWrong, masteredWrong, unmasteredWrong] = await Promise.all([
      prisma.wrongRecord.count({ where: { userId: targetUserId } }),
      prisma.wrongRecord.count({ where: { userId: targetUserId, mastered: true } }),
      prisma.wrongRecord.count({ where: { userId: targetUserId, mastered: false } }),
    ]);

    res.json({
      success: true,
      data: {
        user,
        submissions: {
          total: totalSubs,
          accepted: acceptedSubs,
          wrong: wrongSubs,
          rate: totalSubs > 0 ? Math.round((acceptedSubs / totalSubs) * 10000) / 100 : 0,
        },
        recentSubmissions,
        examAttempts: {
          total: totalExams,
          passed: passedExams,
          avgScore: examAgg._avg.score ? Math.round(examAgg._avg.score * 100) / 100 : 0,
        },
        wrongRecordStats: {
          total: totalWrong,
          mastered: masteredWrong,
          unmastered: unmasteredWrong,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 班级考试统计
// ========================

router.get('/:classId/exam-stats', authMiddleware, roleMiddleware('TEACHER', 'ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { classId } = req.params;

    const hasAccess = await verifyClassAccess(classId, userId, userRole, res);
    if (!hasAccess) return;

    // 获取该班级所有考试
    const exams = await prisma.exam.findMany({
      where: { classId },
      select: {
        id: true,
        title: true,
        passScore: true,
        attempts: {
          select: { score: true, totalScore: true, status: true },
        },
      },
    });

    const totalExams = exams.length;

    // 全部考试尝试的平均分
    const allAttempts = exams.flatMap(e => e.attempts.filter(a => a.score !== null));
    const avgScore = allAttempts.length > 0
      ? Math.round((allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length) * 100) / 100
      : 0;

    // 每场考试的统计
    const examResults = exams.map(exam => {
      const attempts = exam.attempts;
      const completedAttempts = attempts.filter(a => a.status === 'COMPLETED' && a.score !== null);
      const examAvgScore = completedAttempts.length > 0
        ? Math.round((completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length) * 100) / 100
        : 0;
      const passedCount = completedAttempts.filter(a => (a.score || 0) >= exam.passScore).length;
      const passRate = completedAttempts.length > 0
        ? Math.round((passedCount / completedAttempts.length) * 10000) / 100
        : 0;

      return {
        examId: exam.id,
        title: exam.title,
        avgScore: examAvgScore,
        passRate,
        totalAttempts: attempts.length,
      };
    });

    res.json({
      success: true,
      data: {
        totalExams,
        avgScore,
        examResults,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================
// 全局班级排行榜
// ========================

router.get('/leaderboard', authMiddleware, async (_req: Request, res: any): Promise<void> => {
  try {
    // 获取所有班级及其成员信息
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        members: {
          select: {
            user: { select: { points: true, level: true } },
          },
        },
      },
    });

    const leaderboard = classes
      .map(cls => {
        const memberCount = cls.members.length;
        if (memberCount === 0) {
          return {
            classId: cls.id,
            name: cls.name,
            memberCount: 0,
            avgPoints: 0,
            avgLevel: 0,
          };
        }
        const totalPoints = cls.members.reduce((sum, m) => sum + m.user.points, 0);
        const totalLevel = cls.members.reduce((sum, m) => sum + m.user.level, 0);
        return {
          classId: cls.id,
          name: cls.name,
          memberCount,
          avgPoints: Math.round((totalPoints / memberCount) * 100) / 100,
          avgLevel: Math.round((totalLevel / memberCount) * 100) / 100,
        };
      })
      .sort((a, b) => b.avgPoints - a.avgPoints);

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
