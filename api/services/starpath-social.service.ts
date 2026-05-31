import prisma from '../lib/prisma';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export class StarPathSocialService {

  async getPlanetLeaderboard(planetId: string, limit = 20) {
    const progresses = await prisma.userPlanetProgress.findMany({
      where: { planetId, status: 'MASTERED' },
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: [{ score: 'desc' }, { attempts: 'asc' }],
      take: limit,
    });

    return progresses.map((p, idx) => ({
      rank: idx + 1,
      userId: p.user.id,
      username: p.user.username,
      avatar: p.user.avatar,
      score: p.score,
      attempts: p.attempts,
    }));
  }

  async getRegionLeaderboard(regionId: string, limit = 20) {
    const planets = await prisma.starPlanet.findMany({
      where: { regionId },
      select: { id: true },
    });
    const planetIds = planets.map(p => p.id);

    const masteredCounts = await prisma.userPlanetProgress.groupBy({
      by: ['userId'],
      where: { planetId: { in: planetIds }, status: 'MASTERED' },
      _count: { id: true },
      _sum: { score: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const userIds = masteredCounts.map(m => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return masteredCounts.map((m, idx) => ({
      rank: idx + 1,
      userId: m.userId,
      username: userMap.get(m.userId)?.username || '未知',
      avatar: userMap.get(m.userId)?.avatar || null,
      masteredPlanets: m._count.id,
      totalScore: m._sum.score || 0,
    }));
  }

  async getGlobalLeaderboard(limit = 20) {
    const masteredCounts = await prisma.userPlanetProgress.groupBy({
      by: ['userId'],
      where: { status: 'MASTERED' },
      _count: { id: true },
      _sum: { score: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const userIds = masteredCounts.map(m => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true, points: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return masteredCounts.map((m, idx) => ({
      rank: idx + 1,
      userId: m.userId,
      username: userMap.get(m.userId)?.username || '未知',
      avatar: userMap.get(m.userId)?.avatar || null,
      masteredPlanets: m._count.id,
      totalScore: m._sum.score || 0,
      points: userMap.get(m.userId)?.points || 0,
    }));
  }

  async sendFriendRequest(userId: string, friendId: string) {
    if (userId === friendId) throw new Error('不能添加自己为好友');

    const existing = await prisma.starPathFriend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') throw new Error('已经是好友');
      if (existing.userId === userId) throw new Error('已发送过好友请求');
      if (existing.status === 'PENDING') {
        await prisma.starPathFriend.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED' },
        });
        return { autoAccepted: true };
      }
    }

    await prisma.starPathFriend.create({
      data: { userId, friendId, status: 'PENDING' },
    });
    return { autoAccepted: false };
  }

  async acceptFriendRequest(userId: string, friendId: string) {
    const request = await prisma.starPathFriend.findFirst({
      where: { userId: friendId, friendId: userId, status: 'PENDING' },
    });
    if (!request) throw new Error('好友请求不存在');

    return prisma.starPathFriend.update({
      where: { id: request.id },
      data: { status: 'ACCEPTED' },
    });
  }

  async getFriends(userId: string) {
    const sent = await prisma.starPathFriend.findMany({
      where: { userId, status: 'ACCEPTED' },
      include: { friend: { select: { id: true, username: true, avatar: true, points: true } } },
    });
    const received = await prisma.starPathFriend.findMany({
      where: { friendId: userId, status: 'ACCEPTED' },
      include: { user: { select: { id: true, username: true, avatar: true, points: true } } },
    });

    const friends = [
      ...sent.map(f => ({ ...f.friend, friendshipId: f.id })),
      ...received.map(f => ({ ...f.user, friendshipId: f.id })),
    ];

    return friends;
  }

  async getPendingRequests(userId: string) {
    return prisma.starPathFriend.findMany({
      where: { friendId: userId, status: 'PENDING' },
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await prisma.starPathFriend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
        status: 'ACCEPTED',
      },
    });
    if (!friendship) throw new Error('好友关系不存在');

    return prisma.starPathFriend.delete({ where: { id: friendship.id } });
  }

  async getFriendStarProgress(userId: string, friendId: string) {
    const friendship = await prisma.starPathFriend.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' },
        ],
      },
    });
    if (!friendship) throw new Error('不是好友关系');

    const progresses = await prisma.userPlanetProgress.findMany({
      where: { userId: friendId },
      include: { planet: { select: { id: true, name: true, region: { select: { id: true, name: true, color: true } } } } },
    });

    return progresses.map(p => ({
      planetId: p.planetId,
      planetName: p.planet.name,
      regionName: p.planet.region.name,
      regionColor: p.planet.region.color,
      status: p.status,
      score: p.score,
      lastVisitAt: p.lastVisitAt,
    }));
  }

  async createTeamChallenge(data: {
    title: string;
    description?: string;
    regionId?: string;
    planetIds?: string[];
    maxTeamSize?: number;
    startTime: string;
    endTime: string;
    rewardPoints?: number;
  }, userId: string) {
    return prisma.teamChallenge.create({
      data: {
        title: data.title,
        description: data.description || '',
        regionId: data.regionId || null,
        planetIds: JSON.stringify(data.planetIds || []),
        maxTeamSize: data.maxTeamSize || 3,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        rewardPoints: data.rewardPoints || 0,
        createdBy: userId,
      },
    });
  }

  async getActiveTeamChallenges() {
    const now = new Date();
    return prisma.teamChallenge.findMany({
      where: {
        status: { in: ['UPCOMING', 'ACTIVE'] },
        endTime: { gte: now },
      },
      include: {
        teams: { include: { members: { include: { user: { select: { id: true, username: true, avatar: true } } } } } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async joinTeamChallenge(challengeId: string, teamId: string | null, userId: string) {
    const challenge = await prisma.teamChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error('团队挑战不存在');

    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId, team: { challengeId } },
    });
    if (existingMembership) throw new Error('已参与此挑战');

    if (teamId) {
      const team = await prisma.teamChallenge.findUnique({
        where: { id: challengeId },
        include: { teams: { where: { id: teamId }, include: { members: true } } },
      });
      const targetTeam = team?.teams[0];
      if (!targetTeam) throw new Error('队伍不存在');
      if (targetTeam.members.length >= challenge.maxTeamSize) throw new Error('队伍已满');

      return prisma.teamMember.create({
        data: { teamId, userId, role: 'MEMBER' },
      });
    }

    const newTeam = await prisma.challengeTeam.create({
      data: { challengeId, name: `队伍 ${Date.now()}` },
    });
    await prisma.teamMember.create({
      data: { teamId: newTeam.id, userId, role: 'LEADER' },
    });
    return newTeam;
  }
}

export const starPathSocialService = new StarPathSocialService();
