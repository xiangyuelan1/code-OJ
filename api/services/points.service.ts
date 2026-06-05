import prisma from '../lib/prisma';

export interface PointChangeResult {
  newPoints: number;
  newLevel: number;
  levelUp: boolean;
  pointsEarned: number;
}

// 等级特权接口：定义每个等级解锁的能力数值
export interface LevelPrivileges {
  pointsMultiplier: number;       // 做题积分倍率, 1.0 = 无加成
  chestBonusPercent: number;      // 每日宝箱额外积分百分比
  dailyStarLimit: number;         // 每日星星收集上限, -1 = 无限
  buildingDiscount: number;       // 建筑费用折扣比例 (0.1 = 打9折)
  canUnlockAdvancedPets: boolean; // 是否可解锁高级宠物
  explorationSlots: number;       // 同时可探索的星球数, -1 = 无限
}

export interface LevelConfig {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon?: string;
  privileges: LevelPrivileges;
}

const POINTS_RULES = {
  problemCompletion: {
    EASY: 5,
    MEDIUM: 10,
    HARD: 20
  },
  firstACBonus: 5,
  matchWin: 15,
  matchLose: -5,
  friendlyWin: 5,
  examPerfect: 50,
  examPass: 20,
  dailyLogin: 10
};

// 等级配置：每个等级附带对应特权
const LEVELS: LevelConfig[] = [
  {
    level: 1, name: '青铜', minPoints: 0, maxPoints: 100, icon: '🥉',
    privileges: { pointsMultiplier: 1.0, chestBonusPercent: 0, dailyStarLimit: 20, buildingDiscount: 0, canUnlockAdvancedPets: false, explorationSlots: 1 }
  },
  {
    level: 2, name: '白银', minPoints: 101, maxPoints: 300, icon: '🥈',
    privileges: { pointsMultiplier: 1.1, chestBonusPercent: 10, dailyStarLimit: 30, buildingDiscount: 0.05, canUnlockAdvancedPets: false, explorationSlots: 2 }
  },
  {
    level: 3, name: '黄金', minPoints: 301, maxPoints: 600, icon: '🥇',
    privileges: { pointsMultiplier: 1.2, chestBonusPercent: 20, dailyStarLimit: 40, buildingDiscount: 0.1, canUnlockAdvancedPets: false, explorationSlots: 3 }
  },
  {
    level: 4, name: '铂金', minPoints: 601, maxPoints: 1000, icon: '💎',
    privileges: { pointsMultiplier: 1.3, chestBonusPercent: 30, dailyStarLimit: 50, buildingDiscount: 0.15, canUnlockAdvancedPets: true, explorationSlots: 4 }
  },
  {
    level: 5, name: '钻石', minPoints: 1001, maxPoints: 2000, icon: '💠',
    privileges: { pointsMultiplier: 1.5, chestBonusPercent: 50, dailyStarLimit: 70, buildingDiscount: 0.2, canUnlockAdvancedPets: true, explorationSlots: 5 }
  },
  {
    level: 6, name: '大师', minPoints: 2001, maxPoints: 5000, icon: '⭐',
    privileges: { pointsMultiplier: 1.8, chestBonusPercent: 80, dailyStarLimit: 100, buildingDiscount: 0.25, canUnlockAdvancedPets: true, explorationSlots: 6 }
  },
  {
    level: 7, name: '王者', minPoints: 5001, maxPoints: null, icon: '👑',
    privileges: { pointsMultiplier: 2.0, chestBonusPercent: 100, dailyStarLimit: -1, buildingDiscount: 0.3, canUnlockAdvancedPets: true, explorationSlots: -1 }
  }
];

export class PointsService {

  async getUserPoints(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        points: true,
        level: true
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      points: user.points,
      level: user.level,
      levelName: this.getLevelName(user.level)
    };
  }

  async awardPointsForProblem(userId: string, problemId: string, difficulty: string, isFirstAC: boolean = false): Promise<PointChangeResult> {
    const basePoints = POINTS_RULES.problemCompletion[difficulty as keyof typeof POINTS_RULES.problemCompletion] || 5;
    const bonusPoints = isFirstAC ? POINTS_RULES.firstACBonus : 0;
    const totalPoints = basePoints + bonusPoints;

    return await this.updateUserPoints(userId, totalPoints, 'PROBLEM_COMPLETION', {
      problemId,
      difficulty,
      isFirstAC,
      basePoints,
      bonusPoints
    });
  }

  async awardMatchPoints(userId: string, matchId: string, isWin: boolean, isRanked: boolean = true): Promise<PointChangeResult> {
    const points = isWin
      ? (isRanked ? POINTS_RULES.matchWin : POINTS_RULES.friendlyWin)
      : POINTS_RULES.matchLose;

    return await this.updateUserPoints(userId, points, 'MATCH_RESULT', {
      matchId,
      isWin,
      isRanked
    });
  }

  async awardExamPoints(userId: string, examId: string, score: number, totalScore: number): Promise<PointChangeResult> {
    const percentage = (score / totalScore) * 100;
    let points: number;

    if (percentage === 100) {
      points = POINTS_RULES.examPerfect;
    } else if (percentage >= 60) {
      points = POINTS_RULES.examPass;
    } else {
      points = Math.floor((score / totalScore) * 10);
    }

    return await this.updateUserPoints(userId, points, 'EXAM_COMPLETION', {
      examId,
      score,
      totalScore,
      percentage
    });
  }

  async updateUserPoints(
    userId: string,
    delta: number,
    reason: string,
    details?: unknown
  ): Promise<PointChangeResult> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      const newPoints = Math.max(0, user.points + delta);
      // 等级代表累计成长阶段，不应因建造、训练等积分消费而下降。
      // 正向积分变动可触发升级；负向积分变动只影响可消费积分余额。
      const calculatedLevel = this.calculateLevel(newPoints);
      const newLevel = delta >= 0 ? Math.max(user.level, calculatedLevel) : user.level;

      await tx.user.update({
        where: { id: userId },
        data: {
          points: newPoints,
          level: newLevel
        }
      });

      await tx.pointLog.create({
        data: {
          userId,
          delta,
          reason,
          details: JSON.stringify(details || {})
        }
      });

      return {
        newPoints,
        newLevel,
        levelUp: newLevel > user.level,
        pointsEarned: delta
      };
    });
  }

  private calculateLevel(points: number): number {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (points >= LEVELS[i].minPoints) {
        return LEVELS[i].level;
      }
    }
    return 1;
  }

  private getLevelName(level: number): string {
    const levelConfig = LEVELS.find(l => l.level === level);
    return levelConfig?.name || '青铜';
  }

  getAllLevels(): LevelConfig[] {
    return LEVELS;
  }

  getLevelInfo(level: number): LevelConfig | undefined {
    return LEVELS.find(l => l.level === level);
  }

  // 获取指定等级的特权配置
  getLevelPrivileges(level: number): LevelPrivileges {
    const config = LEVELS.find(l => l.level === level);
    // 未知等级回退到最低等级特权
    return config?.privileges ?? LEVELS[0].privileges;
  }

  // 计算用户当前的综合积分倍率（等级加成 + 建筑竞技场赛季加成）
  async getEffectivePointsMultiplier(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 等级基础倍率
    const privileges = this.getLevelPrivileges(user.level);
    const baseMultiplier = privileges.pointsMultiplier;

    // 查询用户所有竞技场建筑，检查是否有赛季积分加成（竞技场 Lv3 提供 20% 加成）
    const arenaBuildings = await prisma.planetBuilding.findMany({
      where: { userId, buildingType: 'ARENA' }
    });

    // 竞技场 Lv3 提供 20% 加成，取用户所有竞技场中最高等级
    const maxArenaLevel = arenaBuildings.reduce((max, b) => Math.max(max, b.level), 0);
    const arenaBonus = maxArenaLevel >= 3 ? 0.2 : 0;

    return baseMultiplier + arenaBonus;
  }

  async getLeaderboard(limit: number = 10) {
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        isActive: true
      },
      orderBy: {
        points: 'desc'
      },
      take: limit,
      select: {
        id: true,
        username: true,
        avatar: true,
        points: true,
        level: true
      }
    });

    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
      levelName: this.getLevelName(user.level)
    }));
  }

  async getUserRank(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const higherCount = await prisma.user.count({
      where: {
        points: { gt: user.points },
        role: 'STUDENT',
        isActive: true
      }
    });

    return {
      rank: higherCount + 1,
      totalUsers: await prisma.user.count({
        where: {
          role: 'STUDENT',
          isActive: true
        }
      })
    };
  }

  async getPointLogs(userId: string, limit: number = 20) {
    const logs = await prisma.pointLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
  }
}

export const pointsService = new PointsService();
