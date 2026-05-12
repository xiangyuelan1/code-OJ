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
      : await this.getRandomProblems(config.problemCount);

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
        problems: {
          include: {
            // No need to include problem here
          }
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
      include: {
        participants: true
      }
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
      data: {
        matchId,
        userId
      },
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
    });

    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
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

    if (updatedMatch && updatedMatch.type === '1V1_RANKED' && updatedMatch.participants.length >= 2) {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'IN_PROGRESS', startTime: new Date() }
      });
    }

    return participant;
  }

  async submitAnswer(
    matchId: string,
    userId: string,
    problemIndex: number,
    answer: string,
    time: number
  ): Promise<any> {
    const participant = await prisma.matchParticipant.findFirst({
      where: {
        matchId,
        userId
      },
      include: {
        match: {
          include: {
            problems: {
              include: {
                // No need to include problem
              },
              orderBy: { order: 'asc' }
            }
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

    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
    });

    if (!problem) {
      throw new Error('题目不存在');
    }

    let isCorrect = false;
    let points = 0;

    switch (problem.type) {
      case 'CHOICE':
        isCorrect = answer === problem.correctAnswer;
        break;
      case 'FILL_BLANK':
        const correctAnswers: string[] = JSON.parse(problem.fillBlanks || '[]');
        const userAnswers: string[] = Array.isArray(answer) ? answer : [answer];
        isCorrect = userAnswers.every((ans, idx) =>
          ans.trim().toLowerCase() === correctAnswers[idx]?.trim().toLowerCase()
        );
        break;
      case 'PROGRAMMING':
        isCorrect = answer === 'ACCEPTED';
        break;
    }

    if (isCorrect) {
      const basePoints = participant.match.type === '1V1_RANKED' ? 20 : 10;
      const timeBonus = Math.max(0, Math.floor((60000 - time) / 1000));
      points = basePoints + timeBonus;
    }

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

    const newScore = participant.score + points;
    const newCorrectCount = participant.correctCount + (isCorrect ? 1 : 0);
    const newTotalTime = participant.totalTime + time;

    await prisma.matchParticipant.update({
      where: { id: participant.id },
      data: {
        score: newScore,
        correctCount: newCorrectCount,
        totalTime: newTotalTime
      }
    });

    const allParticipants = await prisma.matchParticipant.findMany({
      where: { matchId },
      include: { submissions: true }
    });

    const problemCompleted = allParticipants.every(p => {
      return p.submissions && p.submissions.length >= problemIndex + 1;
    });

    if (problemCompleted) {
      const totalProblems = participant.match.problems.length;
      if (problemIndex >= totalProblems - 1) {
        await this.endMatch(matchId);
      }
    }

    return {
      isCorrect,
      points,
      currentScore: newScore,
      correctCount: newCorrectCount,
      totalTime: newTotalTime
    };
  }

  async endMatch(matchId: string): Promise<MatchResult> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error('比赛不存在');
    }

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
        data: { isWinner }
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

  async getMatch(matchId: string): Promise<any> {
    return await prisma.match.findUnique({
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
            }
          }
        }
      }
    });
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
                user: {
                  select: {
                    username: true
                  }
                }
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
      where: {
        type,
        status: 'COMPLETED'
      },
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

  private async getRandomProblems(count: number): Promise<string[]> {
    const problems = await prisma.problem.findMany({
      where: {
        testCases: { not: '[]' }
      },
      select: { id: true },
      take: count * 2
    });

    const shuffled = problems.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(p => p.id);
  }
}

export const matchService = new MatchService();
