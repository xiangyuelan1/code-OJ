import prisma from '../lib/prisma';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

const STARPATH_ACHIEVEMENTS = [
  { name: 'starpath_first_explore', description: '探索第一个星球', icon: '🌱', criteria: 'explore_first_planet', points: 10 },
  { name: 'starpath_first_master', description: '精通第一个星球', icon: '⭐', criteria: 'master_first_planet', points: 20 },
  { name: 'starpath_region_pioneer', description: '精通一个星域所有星球', icon: '🏆', criteria: 'master_all_in_region', points: 50 },
  { name: 'starpath_traveler', description: '探索3个不同星域', icon: '🚀', criteria: 'explore_3_regions', points: 30 },
  { name: 'starpath_omniscient', description: '精通所有星域', icon: '👁️', criteria: 'master_all_regions', points: 200 },
  { name: 'starpath_streak_7', description: '连续7天完成星球挑战', icon: '🔥', criteria: 'streak_7_days', points: 40 },
  { name: 'starpath_builder', description: '建造10个建筑', icon: '🏗️', criteria: 'build_10', points: 30 },
  { name: 'starpath_arena_star', description: '在竞技场获胜5次', icon: '⚔️', criteria: 'arena_win_5', points: 40 },
  { name: 'starpath_team_player', description: '参与3次团队挑战', icon: '🤝', criteria: 'team_3', points: 25 },
  { name: 'starpath_story_hunter', description: '完成3个星域的故事线', icon: '📖', criteria: 'story_3_regions', points: 60 },
  { name: 'starpath_meteor_hunter', description: '参与3次限时事件', icon: '☄️', criteria: 'event_3', points: 35 },
  { name: 'starpath_code_poet', description: '编程题一次通过10道', icon: '✨', criteria: 'first_ac_10', points: 50 },
];

export class StarPathAchievementService {

  async initializeAchievements() {
    let created = 0;
    for (const ach of STARPATH_ACHIEVEMENTS) {
      const existing = await prisma.achievement.findUnique({ where: { name: ach.name } });
      if (!existing) {
        await prisma.achievement.create({ data: ach });
        created++;
      }
    }
    return { created, total: STARPATH_ACHIEVEMENTS.length };
  }

  async getUserAchievements(userId: string) {
    const allAchievements = await prisma.achievement.findMany({
      where: { name: { startsWith: 'starpath_' } },
    });
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId, achievement: { name: { startsWith: 'starpath_' } } },
      include: { achievement: true },
    });
    const earnedSet = new Set(userAchievements.map(ua => ua.achievementId));

    return {
      earned: userAchievements.map(ua => ({
        id: ua.id,
        achievementId: ua.achievementId,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        points: ua.achievement.points,
        earnedAt: ua.earnedAt,
        progress: safeJsonParse(ua.progress, {}),
      })),
      available: allAchievements
        .filter(a => !earnedSet.has(a.id))
        .map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          points: a.points,
          criteria: a.criteria,
        })),
    };
  }

  async checkAndAwardAchievement(userId: string, criteria: string) {
    const achievement = await prisma.achievement.findFirst({
      where: { criteria, name: { startsWith: 'starpath_' } },
    });
    if (!achievement) return null;

    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });
    if (existing) return null;

    const userAchievement = await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: achievement.points } },
    });
    await prisma.pointLog.create({
      data: { userId, delta: achievement.points, reason: `获得成就: ${achievement.description}` },
    });

    return { ...userAchievement, achievement };
  }

  async checkAllAchievements(userId: string) {
    const awarded: string[] = [];

    const progresses = await prisma.userPlanetProgress.findMany({ where: { userId } });
    const exploredPlanets = progresses.filter(p => p.status !== 'UNEXPLORED');
    const masteredPlanets = progresses.filter(p => p.status === 'MASTERED');

    if (exploredPlanets.length >= 1) {
      const r = await this.checkAndAwardAchievement(userId, 'explore_first_planet');
      if (r) awarded.push('初入星途');
    }

    if (masteredPlanets.length >= 1) {
      const r = await this.checkAndAwardAchievement(userId, 'master_first_planet');
      if (r) awarded.push('星球征服者');
    }

    const regionIds = new Set<string>();
    const masteredRegionIds = new Set<string>();
    const regions = await prisma.starRegion.findMany({ include: { planets: true } });

    for (const region of regions) {
      const regionPlanetIds = region.planets.map(p => p.id);
      const regionExplored = exploredPlanets.filter(p => regionPlanetIds.includes(p.planetId));
      const regionMastered = masteredPlanets.filter(p => regionPlanetIds.includes(p.planetId));

      if (regionExplored.length > 0) regionIds.add(region.id);
      if (region.planets.length > 0 && regionMastered.length === region.planets.length) {
        masteredRegionIds.add(region.id);
      }
    }

    if (masteredRegionIds.size >= 1) {
      const r = await this.checkAndAwardAchievement(userId, 'master_all_in_region');
      if (r) awarded.push('星域开拓者');
    }

    if (regionIds.size >= 3) {
      const r = await this.checkAndAwardAchievement(userId, 'explore_3_regions');
      if (r) awarded.push('星际旅行家');
    }

    if (masteredRegionIds.size === regions.length && regions.length > 0) {
      const r = await this.checkAndAwardAchievement(userId, 'master_all_regions');
      if (r) awarded.push('全知之眼');
    }

    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    if (profile && profile.streakDays >= 7) {
      const r = await this.checkAndAwardAchievement(userId, 'streak_7_days');
      if (r) awarded.push('连续探索');
    }

    const buildingCount = await prisma.planetBuilding.count({ where: { userId } });
    if (buildingCount >= 10) {
      const r = await this.checkAndAwardAchievement(userId, 'build_10');
      if (r) awarded.push('建筑大师');
    }

    const completedChapters = await prisma.userStoryProgress.findMany({
      where: { userId, completed: true },
      include: { chapter: { include: { arc: true } } },
    });
    const completedArcRegionIds = new Set<string>();
    for (const ch of completedChapters) {
      completedArcRegionIds.add(ch.chapter.arc.regionId);
    }
    const fullyCompletedArcs = [];
    for (const regionId of completedArcRegionIds) {
      const arc = await prisma.storyArc.findUnique({
        where: { regionId },
        include: { chapters: true },
      });
      if (arc) {
        const allDone = arc.chapters.every(ch =>
          completedChapters.some(cc => cc.chapterId === ch.id),
        );
        if (allDone) fullyCompletedArcs.push(regionId);
      }
    }
    if (fullyCompletedArcs.length >= 3) {
      const r = await this.checkAndAwardAchievement(userId, 'story_3_regions');
      if (r) awarded.push('故事猎人');
    }

    const eventCount = await prisma.userEventParticipation.count({ where: { userId } });
    if (eventCount >= 3) {
      const r = await this.checkAndAwardAchievement(userId, 'event_3');
      if (r) awarded.push('流星猎人');
    }

    const firstAcCount = await prisma.submission.count({
      where: { userId, status: 'ACCEPTED', type: 'STARPATH' },
    });
    if (firstAcCount >= 10) {
      const r = await this.checkAndAwardAchievement(userId, 'first_ac_10');
      if (r) awarded.push('代码诗人');
    }

    return { awarded, total: awarded.length };
  }

  async generateSkillSnapshot(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const existing = await prisma.userSkillSnapshot.findUnique({
      where: { userId_snapshotDate: { userId, snapshotDate: today } },
    });
    if (existing) return existing;

    const regions = await prisma.starRegion.findMany({
      include: { planets: { include: { progress: { where: { userId } } } } },
      orderBy: { order: 'asc' },
    });

    const skillRadar: Record<string, number> = {};
    const regionProgress: Record<string, { explored: number; mastered: number; total: number }> = {};
    let totalPlanetsMastered = 0;
    let totalScore = 0;

    for (const region of regions) {
      let explored = 0;
      let mastered = 0;

      for (const planet of region.planets) {
        const progress = planet.progress[0];
        if (progress) {
          if (progress.status !== 'UNEXPLORED') explored++;
          if (progress.status === 'MASTERED') {
            mastered++;
            totalPlanetsMastered++;
          }
          totalScore += progress.score;
        }
      }

      const masteryRate = region.planets.length > 0 ? Math.round((mastered / region.planets.length) * 100) : 0;
      const regionKey = region.name.replace('星域', '');
      skillRadar[regionKey] = masteryRate;

      regionProgress[region.id] = {
        explored,
        mastered,
        total: region.planets.length,
      };
    }

    return prisma.userSkillSnapshot.create({
      data: {
        userId,
        snapshotDate: today,
        totalPlanetsMastered,
        totalScore,
        skillRadar: JSON.stringify(skillRadar),
        regionProgress: JSON.stringify(regionProgress),
      },
    });
  }

  async getSkillRadar(userId: string) {
    const latest = await prisma.userSkillSnapshot.findFirst({
      where: { userId },
      orderBy: { snapshotDate: 'desc' },
    });

    if (!latest) {
      const snapshot = await this.generateSkillSnapshot(userId);
      return {
        snapshotDate: snapshot.snapshotDate,
        skillRadar: safeJsonParse<Record<string, number>>(snapshot.skillRadar, {}),
        totalPlanetsMastered: snapshot.totalPlanetsMastered,
        totalScore: snapshot.totalScore,
      };
    }

    return {
      snapshotDate: latest.snapshotDate,
      skillRadar: safeJsonParse<Record<string, number>>(latest.skillRadar, {}),
      totalPlanetsMastered: latest.totalPlanetsMastered,
      totalScore: latest.totalScore,
    };
  }

  async getLearningCurve(userId: string, days = 30) {
    const snapshots = await prisma.userSkillSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'desc' },
      take: days,
    });

    return snapshots.reverse().map(s => ({
      date: s.snapshotDate,
      totalPlanetsMastered: s.totalPlanetsMastered,
      totalScore: s.totalScore,
      skillRadar: safeJsonParse<Record<string, number>>(s.skillRadar, {}),
    }));
  }

  async getRecommendedNextPlanet(userId: string) {
    const progresses = await prisma.userPlanetProgress.findMany({
      where: { userId, status: { in: ['UNEXPLORED', 'EXPLORING'] } },
      include: { planet: { include: { region: true } } },
      orderBy: [{ planet: { difficulty: 'asc' } }, { planet: { order: 'asc' } }],
    });

    const exploringPlanets = progresses.filter(p => p.status === 'EXPLORING');
    if (exploringPlanets.length > 0) {
      const planet = exploringPlanets[0].planet;
      return {
        planetId: planet.id,
        planetName: planet.name,
        regionId: planet.region.id,
        regionName: planet.region.name,
        regionColor: planet.region.color,
        reason: '你正在探索这个星球，继续挑战吧！',
        status: 'EXPLORING',
      };
    }

    const unexploredPlanets = progresses.filter(p => p.status === 'UNEXPLORED');
    if (unexploredPlanets.length > 0) {
      const planet = unexploredPlanets[0].planet;
      return {
        planetId: planet.id,
        planetName: planet.name,
        regionId: planet.region.id,
        regionName: planet.region.name,
        regionColor: planet.region.color,
        reason: '这是你尚未探索的星球，从简单的开始吧！',
        status: 'UNEXPLORED',
      };
    }

    const allProgresses = await prisma.userPlanetProgress.findMany({
      where: { userId },
      include: { planet: { include: { region: true } } },
    });
    const masteredPlanetIds = new Set(
      allProgresses.filter(p => p.status === 'MASTERED').map(p => p.planetId),
    );

    const allPlanets = await prisma.starPlanet.findMany({
      where: { id: { notIn: [...masteredPlanetIds] } },
      include: { region: true },
      orderBy: [{ difficulty: 'asc' }, { order: 'asc' }],
    });

    if (allPlanets.length > 0) {
      const planet = allPlanets[0];
      return {
        planetId: planet.id,
        planetName: planet.name,
        regionId: planet.region.id,
        regionName: planet.region.name,
        regionColor: planet.region.color,
        reason: '试试这个新星球！',
        status: 'NEW',
      };
    }

    return null;
  }
}

export const starPathAchievementService = new StarPathAchievementService();
