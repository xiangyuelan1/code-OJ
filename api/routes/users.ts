import { Router, type Request } from 'express';
import { authService } from '../services/auth.service';
import { accessService } from '../services/access.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const VALID_ACCESS_TYPES = ['TRIAL', 'PAID', 'CLASS', 'ADMIN'];

const router = Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const users = await authService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.patch('/:id/toggle-status', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const user = await authService.toggleUserStatus(req.params.id);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/reset-password', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: { message: '密码长度至少6位' } });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hash }
    });
    res.json({ success: true, data: { id: user.id, username: user.username } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 变更用户角色（仅管理员）
 * 不能变更自己的角色
 * 变更为 TEACHER 时同步更新 accessType
 * 变更为 STUDENT 时重置 accessType 为 TRIAL
 */
router.patch('/:id/role', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const currentUserId = (req as any).user.userId;
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (targetUserId === currentUserId) {
      res.status(400).json({ success: false, error: { message: '不能变更自己的角色' } });
      return;
    }

    const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ success: false, error: { message: `角色必须为: ${validRoles.join(', ')}` } });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ success: false, error: { message: '用户不存在' } });
      return;
    }

    const updateData: any = { role };

    if (role === 'TEACHER') {
      updateData.accessType = 'ADMIN';
    } else if (role === 'STUDENT') {
      updateData.accessType = 'TRIAL';
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        accessType: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 系统概览统计（仅管理员）
 * 必须在 /:id 路由之前定义，否则 "system" 会被当作 :id 参数匹配
 */
router.get('/system/overview', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalSubmissions,
      acceptedSubmissions,
      totalClasses,
      totalHomework,
      approvedPayments,
      totalAiCalls,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'ACCEPTED' } }),
      prisma.class.count(),
      prisma.homework.count(),
      prisma.payment.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true },
      }),
      prisma.aIConfig.count(),
    ]);

    const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersToday,
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate,
        totalClasses,
        totalHomework,
        totalRevenue,
        aiEnabled: totalAiCalls > 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取用户访问详情（仅管理员）
 */
router.get('/:id/access', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        accessType: true,
        accessExpiresAt: true,
        trialStartsAt: true,
        isActive: true,
        points: true,
        level: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { message: '用户不存在' } });
      return;
    }

    const [classMemberships, payments, submissions, pointLogs] = await Promise.all([
      prisma.classMember.findMany({
        where: { userId },
        include: {
          class: { select: { id: true, name: true, description: true } },
        },
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.submission.findMany({
        where: { userId },
        select: {
          id: true,
          problemId: true,
          status: true,
          score: true,
          pointsEarned: true,
          createdAt: true,
          problem: { select: { id: true, title: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.pointLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const accessCheck = await accessService.checkAccess(userId);

    res.json({
      success: true,
      data: {
        user,
        accessCheck,
        classMemberships,
        payments,
        submissions,
        pointLogs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 变更用户访问权限（仅管理员）
 * 可修改 accessType、accessExpiresAt、trialStartsAt
 */
router.patch('/:id/access', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = req.params.id;
    const { accessType, accessExpiresAt, trialStartsAt } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: { message: '用户不存在' } });
      return;
    }

    const updateData: Record<string, any> = {};

    if (accessType !== undefined) {
      if (!VALID_ACCESS_TYPES.includes(accessType)) {
        res.status(400).json({ success: false, error: { message: `accessType 必须为: ${VALID_ACCESS_TYPES.join(', ')}` } });
        return;
      }
      updateData.accessType = accessType;
    }

    if (accessExpiresAt !== undefined) {
      updateData.accessExpiresAt = accessExpiresAt ? new Date(accessExpiresAt) : null;
    }

    if (trialStartsAt !== undefined) {
      updateData.trialStartsAt = trialStartsAt ? new Date(trialStartsAt) : null;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, error: { message: '至少需要提供一个更新字段' } });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        accessType: true,
        accessExpiresAt: true,
        trialStartsAt: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
