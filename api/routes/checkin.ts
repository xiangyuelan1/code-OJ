import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { pointsService } from '../services/points.service';

const router = Router();

/** 获取 Asia/Shanghai 时区的今日日期字符串 (YYYY-MM-DD) */
function getTodayString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

/** 获取指定日期偏移量的日期字符串 (基于 Asia/Shanghai 时区) */
function getOffsetDateString(baseDate: string, offsetDays: number): string {
  const date = new Date(baseDate + 'T00:00:00');
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** 根据连续签到天数计算本次应获得的积分（含里程碑奖励） */
function calculatePoints(streakDays: number): number {
  // 基础积分：按连续天数分档
  let base: number;
  if (streakDays <= 3) {
    base = 5;
  } else if (streakDays <= 7) {
    base = 10;
  } else if (streakDays <= 14) {
    base = 15;
  } else {
    base = 20;
  }

  // 里程碑额外奖励
  let bonus = 0;
  if (streakDays === 7) bonus += 20;
  if (streakDays === 14) bonus += 50;
  if (streakDays === 30) bonus += 100;

  return base + bonus;
}

/** 获取当前自然周（周一至周日）的所有日期字符串 */
function getWeekDates(): string[] {
  const today = new Date(getTodayString() + 'T00:00:00');
  const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ─── POST / — 每日签到 ───────────────────────────────────────────
router.post('/', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const today = getTodayString();

    // 检查今日是否已签到
    const existing = await prisma.dailyCheckIn.findUnique({
      where: { userId_checkDate: { userId, checkDate: today } },
    });
    if (existing) {
      res.status(400).json({ success: false, error: { message: '今日已签到' } });
      return;
    }

    // 计算连续签到天数：查询昨日记录
    const yesterday = getOffsetDateString(today, -1);
    const yesterdayRecord = await prisma.dailyCheckIn.findUnique({
      where: { userId_checkDate: { userId, checkDate: yesterday } },
    });
    const streakDays = yesterdayRecord ? yesterdayRecord.streakDays + 1 : 1;

    // 计算本次签到获得积分
    const pointsEarned = calculatePoints(streakDays);

    // 在事务中完成所有写操作，保证数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 创建签到记录
      const checkIn = await tx.dailyCheckIn.create({
        data: { userId, checkDate: today, streakDays, pointsEarned },
      });

      // 更新用户积分（通过 pointsService 内部也使用事务，这里直接操作以保持在同一事务中）
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('用户不存在');

      const newPoints = Math.max(0, user.points + pointsEarned);
      await tx.user.update({
        where: { id: userId },
        data: { points: newPoints },
      });

      // 写入积分变动日志
      await tx.pointLog.create({
        data: {
          userId,
          delta: pointsEarned,
          reason: 'DAILY_CHECKIN',
          details: JSON.stringify({ streakDays }),
        },
      });

      // 更新学习者档案的连续天数与最后活跃时间
      await tx.learnerProfile.update({
        where: { userId },
        data: { streakDays, lastActiveAt: new Date() },
      });

      return { checkDate: checkIn.checkDate, streakDays, pointsEarned, totalPoints: newPoints };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ─── GET /status — 获取签到状态 ─────────────────────────────────
router.get('/status', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const today = getTodayString();

    // 今日是否已签到
    const todayRecord = await prisma.dailyCheckIn.findUnique({
      where: { userId_checkDate: { userId, checkDate: today } },
    });

    // 从学习者档案获取连续天数
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId },
      select: { streakDays: true },
    });

    // 最近一次签到日期
    const lastCheckIn = await prisma.dailyCheckIn.findFirst({
      where: { userId },
      orderBy: { checkDate: 'desc' },
      select: { checkDate: true },
    });

    // 本周签到记录
    const weekDates = getWeekDates();
    const weekRecords = await prisma.dailyCheckIn.findMany({
      where: {
        userId,
        checkDate: { gte: weekDates[0], lte: weekDates[6] },
      },
      orderBy: { checkDate: 'asc' },
      select: { checkDate: true },
    });

    // 历史总签到次数
    const totalCheckIns = await prisma.dailyCheckIn.count({ where: { userId } });

    res.json({
      success: true,
      data: {
        todayCheckedIn: !!todayRecord,
        streakDays: profile?.streakDays ?? 0,
        lastCheckInDate: lastCheckIn?.checkDate ?? null,
        thisWeekCheckIns: weekRecords.map((r) => r.checkDate),
        totalCheckIns,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ─── GET /history — 获取签到历史 ────────────────────────────────
router.get('/history', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const monthParam = req.query.month as string;

    // 解析月份参数，默认当月
    let monthStr: string;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      monthStr = monthParam;
    } else {
      const now = new Date(getTodayString() + 'T00:00:00');
      monthStr = now.toISOString().slice(0, 7);
    }

    // 查询该月所有签到记录
    const records = await prisma.dailyCheckIn.findMany({
      where: {
        userId,
        checkDate: { startsWith: monthStr },
      },
      orderBy: { checkDate: 'asc' },
      select: { checkDate: true, streakDays: true, pointsEarned: true },
    });

    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
