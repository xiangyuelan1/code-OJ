import prisma from '../lib/prisma';
import { pointsService } from './points.service';

export interface MatchConfig {
  type: '1V1_RANKED' | '1V1_FRIENDLY' | 'GROUP_ARENA';
  problemCount: number;
  timeLimit: number;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  participants: {
    userId: string;
    username: string;
    score: number;
    correctCount: number;
    totalTime: number;
    isWinner: boolean;
  }[];
  rewards: {
    winnerPoints: number;
    loserPoints: number;
  };
}

/** 各题型在比赛中的期望数量配置 */
const PROBLEM_TYPE_DISTRIBUTION: Record<string, { type: string; count: number }[]> = {
  '1V1_RANKED': [
    { type: 'CHOICE', count: 2 },
    { type: 'FILL_BLANK', count: 1 },
    { type: 'PROGRAMMING', count: 2 }
  ],
  '1V1_FRIENDLY': [
    { type: 'CHOICE', count: 1 },
    { type: 'FILL_BLANK', count: 1 },
    { type: 'PROGRAMMING', count: 1 }
  ],
  'GROUP_ARENA': [
    { type: 'CHOICE', count: 3 },
    { type: 'FILL_BLANK', count: 2 },
    { type: 'PROGRAMMING', count: 5 }
  ]
};

/** 结算冷却时间（毫秒） */
const SETTLEMENT_COOLDOWN_MS = 60_000;

export class MatchService {
  private static readonly MATCH_CONFIGS: Record<string, MatchConfig> = {
    '1V1_RANKED': { type: '1V1_RANKED', problemCount: 5, timeLimit: 600 },
    '1V1_FRIENDLY': { type: '1V1_FRIENDLY', problemCount: 3, timeLimit: 900 },
    'GROUP_ARENA': { type: 'GROUP_ARENA', problemCount: 10, timeLimit: 1200 }
  };

  async createMatch(type: string, problemIds: string[]): Promise<any> {
    const config = MatchService.MATCH_CONFIGS[type] || MatchService.MATCH_CONFIGS['1V1_RANKED'];

    const selectedProblems = problemIds.length > 0
      ? problemIds.slice(0, config.problemCount)
      : await this.getRandomProblems(type, config.problemCount);

    const match = await prisma.match.create({
      data: {
        type,
        status: 'WAITING',
        problems: {
          create: selectedProblems.map((problemId, index) => ({
            problemId,
            order: index
          }))
        }
      },
      include: {
        problems: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                points: true,
                level: true
              }
            }
          }
        }
      }
    });

    return match;
  }

  async joinMatch(matchId: string, userId: string): Promise<any> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true }
    });

    if (!match) {
      throw new Error('比赛不存在');
    }

    if (match.status !== 'WAITING') {
      throw new Error('比赛已开始或已结束');
    }

    if (match.participants.some(p => p.userId === userId)) {
      throw new Error('您已加入此比赛');
    }

    const participant = await prisma.matchParticipant.create({
      data: { matchId, userId },
      include: {
        user: {
          select: { id: true, username: true, points: true, level: true }
        }
      }
    });

    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        problems: true,
        participants: {
          include: {
            user: {
              select: { id: true, username: true, points: true, level: true }
            }
          }
        }
      }
    });

    if (updatedMatch && updatedMatch.type === '1V1_RANKED' && updatedMatch.participants.length >= 2) {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'IN_PROGRESS', startTime: new Date() }
      });
    }

    return participant;
  }

  /**
   * 提交答案，支持重提交：最新答案替换旧答案，同时记录尝试次数。
   * problemIndex 参数允许自由切换题目，不强制顺序作答。
   */
  async submitAnswer(
    matchId: string,
    userId: string,
    problemIndex: number,
    answer: string,
    time: number
  ): Promise<any> {
    const participant = await prisma.matchParticipant.findFirst({
      where: { matchId, userId },
      include: {
        match: {
          include: {
            problems: { orderBy: { order: 'asc' } }
          }
        },
        submissions: true
      }
    });

    if (!participant) {
      throw new Error('未找到参赛记录');
    }

    const problemId = participant.match.problems[problemIndex]?.problemId;
    if (!problemId) {
      throw new Error('题目不存在');
    }

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      throw new Error('题目不存在');
    }

    let isCorrect = false;
    let points = 0;

    switch (problem.type) {
      case 'CHOICE':
        isCorrect = answer === problem.correctAnswer;
        break;
      case 'FILL_BLANK': {
        let parsedAnswer: string[];
        try {
          const decoded = JSON.parse(answer);
          parsedAnswer = Array.isArray(decoded) ? decoded : [answer];
        } catch {
          parsedAnswer = [answer];
        }
        const correctAnswers: string[] = JSON.parse(problem.fillBlanks || '[]');
        isCorrect = parsedAnswer.length === correctAnswers.length
          && parsedAnswer.every((ans, idx) =>
            ans.trim().toLowerCase() === correctAnswers[idx]?.trim().toLowerCase()
          );
        break;
      }
      case 'PROGRAMMING':
        // 安全风险：此处信任客户端传递的判题状态，理论上可被伪造。
        // 前端通过 submissionsAPI.submit 先调用后端判题再传回状态，
        // 完整修复需在此处独立执行后端判题，当前暂保留此逻辑。
        isCorrect = answer === 'ACCEPTED';
        break;
    }

    if (isCorrect) {
      const basePoints = participant.match.type === '1V1_RANKED' ? 20 : 10;
      const timeBonus = Math.max(0, Math.floor((60000 - time) / 1000));
      points = basePoints + timeBonus;
    }

    // 查找该参赛者对该题目的已有提交
    const existingSubmission = participant.submissions.find(s => s.problemId === problemId);

    let scoreDelta = points;
    let correctCountDelta = isCorrect ? 1 : 0;

    if (existingSubmission) {
      // 重提交：减去旧分数，用新分数替换
      scoreDelta = points - (existingSubmission.score || 0);
      const wasCorrect = existingSubmission.status === 'ACCEPTED';
      correctCountDelta = (isCorrect ? 1 : 0) - (wasCorrect ? 1 : 0);

      await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
          status: isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
          score: points
        }
      });
    } else {
      await prisma.submission.create({
        data: {
          userId,
          problemId,
          type: problem.type,
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
          status: isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
          score: points,
          matchParticipantId: participant.id
        }
      });
    }

    const newScore = participant.score + scoreDelta;
    const newCorrectCount = participant.correctCount + correctCountDelta;
    const newTotalTime = participant.totalTime + time;

    await prisma.matchParticipant.update({
      where: { id: participant.id },
      data: {
        score: newScore,
        correctCount: newCorrectCount,
        totalTime: newTotalTime
      }
    });

    return {
      isCorrect,
      points,
      currentScore: newScore,
      correctCount: newCorrectCount,
      totalTime: newTotalTime,
      problemIndex,
      isResubmission: !!existingSubmission
    };
  }

  /**
   * 结束比赛并计算结果。
   * 若 surrenderedById 有值，表示该玩家投降：投降者分数归零，对手自动获胜。
   */
  async endMatch(matchId: string, surrenderedById?: string): Promise<MatchResult> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true } }
          }
        }
      }
    });

    if (!match) {
      throw new Error('比赛不存在');
    }

    if (match.status === 'COMPLETED') {
      throw new Error('比赛已结束');
    }

    // 投降处理：投降者分数归零，对手自动获胜
    if (surrenderedById) {
      const surrendering = match.participants.find(p => p.userId === surrenderedById);
      const opponent = match.participants.find(p => p.userId !== surrenderedById);

      if (surrendering) {
        await prisma.matchParticipant.update({
          where: { id: surrendering.id },
          data: { score: 0, correctCount: 0, isWinner: false, lastSettlementAt: new Date() }
        });
      }

      if (opponent) {
        await prisma.matchParticipant.update({
          where: { id: opponent.id },
          data: { isWinner: true, lastSettlementAt: new Date() }
        });
      }

      const winnerId = opponent?.userId || '';
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED', endTime: new Date(), winnerId }
      });

      // 排位赛积分奖励
      if (match.type === '1V1_RANKED' && opponent) {
        await pointsService.awardMatchPoints(opponent.userId, matchId, true, true);
      }

      const winnerPoints = match.type === '1V1_RANKED' ? 15 : 5;
      const loserPoints = match.type === '1V1_RANKED' ? -5 : 0;

      return {
        matchId,
        winnerId,
        participants: match.participants.map(p => ({
          userId: p.userId,
          username: p.user.username,
          score: p.userId === surrenderedById ? 0 : p.score,
          correctCount: p.userId === surrenderedById ? 0 : p.correctCount,
          totalTime: p.totalTime,
          isWinner: p.userId === winnerId
        })),
        rewards: { winnerPoints, loserPoints }
      };
    }

    // 正常结算：按分数和用时判定胜负
    const participants = match.participants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });

    const winner = participants[0];
    let winnerId = winner?.userId || '';

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        winnerId
      }
    });

    for (const participant of participants) {
      const isWinner = participant.userId === winnerId;
      const isRanked = match.type === '1V1_RANKED';

      await prisma.matchParticipant.update({
        where: { id: participant.id },
        data: {
          isWinner,
          lastSettlementAt: new Date()
        }
      });

      if (isRanked) {
        await pointsService.awardMatchPoints(
          participant.userId,
          matchId,
          isWinner,
          true
        );
      }
    }

    const winnerPoints = match.type === '1V1_RANKED' ? 15 : 5;
    const loserPoints = match.type === '1V1_RANKED' ? -5 : 0;

    return {
      matchId,
      winnerId,
      participants: participants.map(p => ({
        userId: p.userId,
        username: p.user.username,
        score: p.score,
        correctCount: p.correctCount,
        totalTime: p.totalTime,
        isWinner: p.userId === winnerId
      })),
      rewards: {
        winnerPoints: winner?.userId ? winnerPoints : 0,
        loserPoints
      }
    };
  }

  async surrenderMatch(matchId: string, userId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true }
    });

    if (!match) return;

    const surrenderingParticipant = match.participants.find(p => p.userId === userId);
    const otherParticipant = match.participants.find(p => p.userId !== userId);

    if (surrenderingParticipant) {
      await prisma.matchParticipant.update({
        where: { id: surrenderingParticipant.id },
        data: { score: 0, correctCount: 0, isWinner: false }
      });
    }

    if (otherParticipant) {
      await prisma.matchParticipant.update({
        where: { id: otherParticipant.id },
        data: { isWinner: true }
      });
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        winnerId: otherParticipant?.userId || null
      }
    });
  }

  /**
   * 获取比赛详情，包含每位参赛者的作答进度。
   * 对 FILL_BLANK 题型，仅发送空数数量，不泄露实际答案。
   */
  async getMatch(matchId: string): Promise<any> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                difficulty: true,
                choices: true,
                fillBlanks: true,
                testCases: true,
                timeLimit: true,
                memoryLimit: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                points: true,
                level: true
              }
            },
            submissions: {
              select: {
                id: true,
                problemId: true,
                status: true,
                score: true,
                answer: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!match) return null;

    // 处理题目数据：过滤 testCases，隐藏 fillBlanks 答案
    for (const mp of match.problems) {
      if (!mp.problem) continue;

      // 仅保留样例测试用例
      if (mp.problem.testCases) {
        try {
          const allCases = JSON.parse(mp.problem.testCases);
          mp.problem.testCases = JSON.stringify(allCases.filter((tc: any) => tc.isSample));
        } catch {
          mp.problem.testCases = '[]';
        }
      }

      // FILL_BLANK 题型：隐藏答案，仅发送空数数量
      if (mp.problem.type === 'FILL_BLANK' && mp.problem.fillBlanks) {
        try {
          const blanks = JSON.parse(mp.problem.fillBlanks);
          const blankCount = Array.isArray(blanks) ? blanks.length : 1;
          mp.problem.fillBlanks = JSON.stringify({ blankCount });
        } catch {
          mp.problem.fillBlanks = JSON.stringify({ blankCount: 1 });
        }
      }
    }

    return match;
  }

  /**
   * 获取某位参赛者在比赛中的进度摘要（供 Socket.IO 实时推送使用）。
   * 返回每道题的作答状态和当前总分。
   */
  async getParticipantProgress(matchId: string, userId: string): Promise<any> {
    const participant = await prisma.matchParticipant.findFirst({
      where: { matchId, userId },
      include: {
        submissions: {
          select: {
            problemId: true,
            status: true,
            score: true
          }
        }
      }
    });

    if (!participant) return null;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { problems: { orderBy: { order: 'asc' } } }
    });

    if (!match) return null;

    // 构建每道题的作答状态
    const problemProgress = match.problems.map((mp, index) => {
      const submission = participant.submissions.find(s => s.problemId === mp.problemId);
      return {
        problemIndex: index,
        problemId: mp.problemId,
        answered: !!submission,
        isCorrect: submission?.status === 'ACCEPTED',
        score: submission?.score || 0
      };
    });

    return {
      userId,
      score: participant.score,
      correctCount: participant.correctCount,
      totalTime: participant.totalTime,
      problemProgress
    };
  }

  /**
   * 请求结算：检查 60 秒冷却时间。
   * 返回是否可以结算，以及剩余冷却时间。
   */
  async requestSettlement(matchId: string, userId: string): Promise<{
    canSettle: boolean;
    remainingCooldown: number;
  }> {
    const participant = await prisma.matchParticipant.findFirst({
      where: { matchId, userId }
    });

    if (!participant) {
      throw new Error('未找到参赛记录');
    }

    const now = Date.now();
    const lastSettlement = participant.lastSettlementAt
      ? new Date(participant.lastSettlementAt).getTime()
      : 0;

    const elapsed = now - lastSettlement;
    const remainingCooldown = Math.max(0, SETTLEMENT_COOLDOWN_MS - elapsed);

    return {
      canSettle: remainingCooldown === 0,
      remainingCooldown
    };
  }

  async getMatchHistory(userId: string, limit: number = 20): Promise<any[]> {
    const participations = await prisma.matchParticipant.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        match: {
          include: {
            participants: {
              include: {
                user: { select: { username: true } }
              }
            }
          }
        }
      }
    });

    return participations.map(p => ({
      ...p,
      opponent: p.match.participants.find(part => part.userId !== userId)?.user.username,
      matchType: p.match.type,
      completedAt: p.match.endTime
    }));
  }

  async getLeaderboard(type: string = '1V1_RANKED', limit: number = 20): Promise<any[]> {
    const matches = await prisma.match.findMany({
      where: { type, status: 'COMPLETED' },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                points: true,
                level: true
              }
            }
          }
        }
      }
    });

    const userStats = new Map<string, any>();

    for (const match of matches) {
      for (const participant of match.participants) {
        const userId = participant.userId;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            user: participant.user,
            wins: 0,
            losses: 0,
            totalScore: 0,
            matchCount: 0
          });
        }

        const stats = userStats.get(userId)!;
        stats.totalScore += participant.score;
        stats.matchCount++;
        if (participant.isWinner) {
          stats.wins++;
        } else {
          stats.losses++;
        }
      }
    }

    return Array.from(userStats.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((stats, index) => ({
        rank: index + 1,
        ...stats,
        winRate: stats.matchCount > 0
          ? Math.round((stats.wins / stats.matchCount) * 100)
          : 0
      }));
  }

  async findOpponent(userId: string, points: number): Promise<any> {
    const candidates = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isOnline: true,
        role: 'STUDENT'
      },
      take: 10
    });

    if (candidates.length === 0) {
      return null;
    }

    const sorted = candidates.sort((a, b) =>
      Math.abs(a.points - points) - Math.abs(b.points - points)
    );

    return sorted[0];
  }

  /**
   * 按题型混合选题：根据比赛类型配置各题型数量。
   * 若某题型数量不足，用其他题型补充。
   */
  private async getRandomProblems(matchType: string, count: number): Promise<string[]> {
    const distribution = PROBLEM_TYPE_DISTRIBUTION[matchType] || PROBLEM_TYPE_DISTRIBUTION['1V1_RANKED'];

    const result: string[] = [];
    const usedIds = new Set<string>();

    // 按配置的题型分布分别查询
    for (const slot of distribution) {
      const needed = slot.count;
      const problems = await prisma.problem.findMany({
        where: {
          type: slot.type,
          id: { notIn: Array.from(usedIds) }
        },
        select: { id: true }
      });

      const shuffled = problems.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, needed);

      for (const p of selected) {
        result.push(p.id);
        usedIds.add(p.id);
      }
    }

    // 若总数不足，用任意题型补充
    if (result.length < count) {
      const remaining = count - result.length;
      const extras = await prisma.problem.findMany({
        where: { id: { notIn: Array.from(usedIds) } },
        select: { id: true }
      });

      const shuffled = extras.sort(() => Math.random() - 0.5);
      for (const p of shuffled.slice(0, remaining)) {
        result.push(p.id);
        usedIds.add(p.id);
      }
    }

    // 打乱最终顺序，避免题型固定排列
    return result.sort(() => Math.random() - 0.5);
  }
}

export const matchService = new MatchService();
