import prisma from '../lib/prisma';

export interface PointChangeResult {
  newPoints: number;
  newLevel: number;
  levelUp: boolean;
  pointsEarned: number;
}

export interface LevelConfig {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon?: string;
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

const LEVELS: LevelConfig[] = [
  { level: 1, name: '青铜', minPoints: 0, maxPoints: 100, icon: '🥉' },
  { level: 2, name: '白银', minPoints: 101, maxPoints: 300, icon: '🥈' },
  { level: 3, name: '黄金', minPoints: 301, maxPoints: 600, icon: '🥇' },
  { level: 4, name: '铂金', minPoints: 601, maxPoints: 1000, icon: '💎' },
  { level: 5, name: '钻石', minPoints: 1001, maxPoints: 2000, icon: '💠' },
  { level: 6, name: '大师', minPoints: 2001, maxPoints: 5000, icon: '⭐' },
  { level: 7, name: '王者', minPoints: 5001, maxPoints: null, icon: '👑' }
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

  private async updateUserPoints(
    userId: string,
    delta: number,
    reason: string,
    details?: any
  ): Promise<PointChangeResult> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      const newPoints = Math.max(0, user.points + delta);
      const newLevel = this.calculateLevel(newPoints);

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
