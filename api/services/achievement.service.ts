import prisma from '../lib/prisma';

export interface AchievementCriteria {
  problemsCompleted?: number;
  matchWinStreak?: number;
  totalPoints?: number;
  consecutiveAC?: number;
  examPerfect?: boolean;
  examsCompleted?: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: AchievementCriteria;
  points: number;
}

const DEFAULT_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_problem',
    name: '初出茅庐',
    description: '完成第一道题',
    icon: '🌟',
    criteria: { problemsCompleted: 1 },
    points: 10
  },
  {
    id: 'problem_solver_10',
    name: '小试牛刀',
    description: '完成10道题',
    icon: '🎯',
    criteria: { problemsCompleted: 10 },
    points: 20
  },
  {
    id: 'problem_solver_50',
    name: '题海无涯',
    description: '完成50道题',
    icon: '📚',
    criteria: { problemsCompleted: 50 },
    points: 50
  },
  {
    id: 'win_streak_5',
    name: '连胜达人',
    description: '对战5连胜',
    icon: '🔥',
    criteria: { matchWinStreak: 5 },
    points: 30
  },
  {
    id: 'win_streak_10',
    name: '常胜将军',
    description: '对战10连胜',
    icon: '⚔️',
    criteria: { matchWinStreak: 10 },
    points: 60
  },
  {
    id: 'points_100',
    name: '崭露头角',
    description: '累计积分达到100',
    icon: '💰',
    criteria: { totalPoints: 100 },
    points: 15
  },
  {
    id: 'points_500',
    name: '学富五车',
    description: '累计积分达到500',
    icon: '📖',
    criteria: { totalPoints: 500 },
    points: 30
  },
  {
    id: 'points_1000',
    name: '学霸',
    description: '累计积分达到1000',
    icon: '🎓',
    criteria: { totalPoints: 1000 },
    points: 50
  },
  {
    id: 'consecutive_ac_5',
    name: '连战连捷',
    description: '连续AC 5道题',
    icon: '💎',
    criteria: { consecutiveAC: 5 },
    points: 25
  },
  {
    id: 'consecutive_ac_10',
    name: '全对通过',
    description: '连续AC 10道题',
    icon: '👑',
    criteria: { consecutiveAC: 10 },
    points: 40
  },
  {
    id: 'exam_perfect',
    name: '满分达成',
    description: '考试获得满分',
    icon: '🏆',
    criteria: { examPerfect: true },
    points: 35
  },
  {
    id: 'exam_master',
    name: '考试大师',
    description: '完成10次考试',
    icon: '📝',
    criteria: { examsCompleted: 10 },
    points: 45
  }
];

export class AchievementService {
  async initializeAchievements() {
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: {
          description: achievement.description,
          icon: achievement.icon,
          criteria: JSON.stringify(achievement.criteria),
          points: achievement.points
        },
        create: {
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          criteria: JSON.stringify(achievement.criteria),
          points: achievement.points
        }
      });
    }
  }

  async getAllAchievements() {
    return await prisma.achievement.findMany({
      orderBy: { points: 'asc' }
    });
  }

  async getUserAchievements(userId: string) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: { earnedAt: 'desc' }
    });
  }

  async checkAndAwardAchievements(userId: string): Promise<string[]> {
    const awardedAchievements: string[] = [];
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return awardedAchievements;

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    });

    const earnedNames = new Set(userAchievements.map(ua => ua.achievement.name));
    const allAchievements = await prisma.achievement.findMany();

    for (const achievement of allAchievements) {
      if (earnedNames.has(achievement.name)) continue;

      const criteria: AchievementCriteria = JSON.parse(achievement.criteria || '{}');
      let isEligible = false;

      if (criteria.problemsCompleted) {
        const submissionCount = await prisma.submission.count({
          where: { userId, status: 'ACCEPTED' }
        });
        isEligible = submissionCount >= criteria.problemsCompleted;
      }

      if (criteria.matchWinStreak && !isEligible) {
        isEligible = await this.checkMatchWinStreak(userId, criteria.matchWinStreak);
      }

      if (criteria.totalPoints && !isEligible) {
        isEligible = user.points >= criteria.totalPoints;
      }

      if (criteria.consecutiveAC && !isEligible) {
        isEligible = await this.checkConsecutiveAC(userId, criteria.consecutiveAC);
      }

      if (criteria.examPerfect && !isEligible) {
        isEligible = await this.checkExamPerfect(userId);
      }

      if (criteria.examsCompleted && !isEligible) {
        const examCount = await prisma.examAttempt.count({
          where: { userId, status: 'GRADED' }
        });
        isEligible = examCount >= criteria.examsCompleted;
      }

      if (isEligible) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id
          }
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            points: { increment: achievement.points }
          }
        });

        await prisma.pointLog.create({
          data: {
            userId,
            delta: achievement.points,
            reason: 'ACHIEVEMENT',
            details: JSON.stringify({ achievement: achievement.name })
          }
        });

        awardedAchievements.push(achievement.name);
      }
    }

    return awardedAchievements;
  }

  private async checkMatchWinStreak(userId: string, requiredStreak: number): Promise<boolean> {
    const recentMatches = await prisma.matchParticipant.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: requiredStreak
    });

    return recentMatches.every(p => p.isWinner);
  }

  private async checkConsecutiveAC(userId: string, requiredCount: number): Promise<boolean> {
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: requiredCount
    });

    return recentSubmissions.every(s => s.status === 'ACCEPTED');
  }

  private async checkExamPerfect(userId: string): Promise<boolean> {
    const perfectAttempt = await prisma.examAttempt.findFirst({
      where: {
        userId,
        status: 'GRADED'
      }
    });

    return perfectAttempt?.score === 100;
  }

  async getAchievementProgress(userId: string) {
    const achievements = await this.getAllAchievements();
    const userAchievements = await this.getUserAchievements(userId);
    const earnedIds = new Set(userAchievements.map(ua => ua.achievementId));

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const progress = [];

    for (const achievement of achievements) {
      const criteria: AchievementCriteria = JSON.parse(achievement.criteria || '{}');
      let current = 0;
      let target = 0;

      if (criteria.problemsCompleted) {
        const count = await prisma.submission.count({
          where: { userId, status: 'ACCEPTED' }
        });
        current = Math.min(count, criteria.problemsCompleted);
        target = criteria.problemsCompleted;
      }

      if (criteria.totalPoints) {
        current = Math.min(user?.points || 0, criteria.totalPoints);
        target = criteria.totalPoints;
      }

      progress.push({
        ...achievement,
        earned: earnedIds.has(achievement.id),
        current,
        target,
        percentage: target > 0 ? Math.round((current / target) * 100) : 0
      });
    }

    return progress;
  }

  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const problemsCompleted = await prisma.submission.count({
      where: { userId, status: 'ACCEPTED' }
    });

    const matchesWon = await prisma.matchParticipant.count({
      where: { userId, isWinner: true }
    });

    const examsCompleted = await prisma.examAttempt.count({
      where: { userId, status: 'GRADED' }
    });

    const achievementsEarned = await prisma.userAchievement.count({
      where: { userId }
    });

    return {
      points: user?.points || 0,
      level: user?.level || 1,
      problemsCompleted,
      matchesWon,
      examsCompleted,
      achievementsEarned,
      rank: await this.getUserRank(userId)
    };
  }

  private async getUserRank(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return 0;

    const higherCount = await prisma.user.count({
      where: {
        points: { gt: user.points },
        role: 'STUDENT'
      }
    });

    return higherCount + 1;
  }
}

export const achievementService = new AchievementService();
