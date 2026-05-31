import prisma from '../lib/prisma';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

const BUILDING_CONFIGS: Record<string, Record<number, { name: string; description: string; cost: number; effect: string }>> = {
  HEADQUARTERS: {
    1: { name: '指挥部 Lv.1', description: '精通星球自动获得，显示星球基本统计', cost: 0, effect: 'basic_stats' },
    2: { name: '指挥部 Lv.2', description: '显示星球详细统计和答题历史', cost: 100, effect: 'detailed_stats' },
    3: { name: '指挥部 Lv.3', description: '解锁星球自定义外观', cost: 250, effect: 'custom_appearance' },
  },
  LABORATORY: {
    1: { name: '实验室 Lv.1', description: '该星球额外练习题(+2)', cost: 50, effect: 'extra_problems' },
    2: { name: '实验室 Lv.2', description: '题目提示功能', cost: 150, effect: 'hints' },
    3: { name: '实验室 Lv.3', description: 'AI解题思路', cost: 300, effect: 'ai_solution' },
  },
  LIBRARY: {
    1: { name: '图书馆 Lv.1', description: '查看题解', cost: 50, effect: 'solutions' },
    2: { name: '图书馆 Lv.2', description: '知识点总结', cost: 150, effect: 'knowledge_summary' },
    3: { name: '图书馆 Lv.3', description: '专题推荐', cost: 300, effect: 'topic_recommendations' },
  },
  ARENA: {
    1: { name: '竞技场 Lv.1', description: '1v1挑战', cost: 50, effect: 'pvp_1v1' },
    2: { name: '竞技场 Lv.2', description: '团队赛', cost: 150, effect: 'team_battle' },
    3: { name: '竞技场 Lv.3', description: '赛季积分加成(+20%)', cost: 300, effect: 'season_bonus' },
  },
  OBSERVATORY: {
    1: { name: '天文台 Lv.1', description: '查看好友进度', cost: 50, effect: 'friend_progress' },
    2: { name: '天文台 Lv.2', description: '能力雷达图', cost: 150, effect: 'skill_radar' },
    3: { name: '天文台 Lv.3', description: '学习路径推荐', cost: 300, effect: 'learning_path' },
  },
};

export class StarPathBuildingService {

  getBuildingConfigs() {
    return BUILDING_CONFIGS;
  }

  async getPlanetBuildings(planetId: string, userId: string) {
    const buildings = await prisma.planetBuilding.findMany({
      where: { userId, planetId },
    });

    return buildings.map(b => ({
      ...b,
      config: BUILDING_CONFIGS[b.buildingType]?.[b.level] || null,
    }));
  }

  async buildOnPlanet(planetId: string, userId: string, buildingType: string) {
    const validTypes = Object.keys(BUILDING_CONFIGS);
    if (!validTypes.includes(buildingType)) {
      throw new Error(`无效的建筑类型: ${buildingType}`);
    }

    if (buildingType !== 'HEADQUARTERS') {
      const progress = await prisma.userPlanetProgress.findUnique({
        where: { userId_planetId: { userId, planetId } },
      });
      if (!progress || progress.status !== 'MASTERED') {
        throw new Error('只有精通的星球才能建造建筑');
      }
    }

    const existing = await prisma.planetBuilding.findUnique({
      where: { userId_planetId_buildingType: { userId, planetId, buildingType } },
    });

    if (existing) {
      throw new Error('该建筑已存在，请使用升级功能');
    }

    const config = BUILDING_CONFIGS[buildingType][1];
    if (config.cost > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.points < config.cost) {
        throw new Error(`积分不足，需要 ${config.cost} 积分`);
      }
      await prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: config.cost } },
      });
      await prisma.pointLog.create({
        data: { userId, delta: -config.cost, reason: `建造${config.name}` },
      });
    }

    return prisma.planetBuilding.create({
      data: { userId, planetId, buildingType, level: 1 },
    });
  }

  async upgradeBuilding(planetId: string, userId: string, buildingType: string) {
    const existing = await prisma.planetBuilding.findUnique({
      where: { userId_planetId_buildingType: { userId, planetId, buildingType } },
    });

    if (!existing) {
      throw new Error('建筑不存在，请先建造');
    }

    if (existing.level >= 3) {
      throw new Error('建筑已达最高等级');
    }

    const nextLevel = existing.level + 1;
    const config = BUILDING_CONFIGS[buildingType]?.[nextLevel];
    if (!config) {
      throw new Error('无效的升级等级');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.points < config.cost) {
      throw new Error(`积分不足，需要 ${config.cost} 积分`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: config.cost } },
    });
    await prisma.pointLog.create({
      data: { userId, delta: -config.cost, reason: `升级${config.name}` },
    });

    return prisma.planetBuilding.update({
      where: { id: existing.id },
      data: { level: nextLevel, upgradedAt: new Date() },
    });
  }

  async getUserAllBuildings(userId: string) {
    const buildings = await prisma.planetBuilding.findMany({
      where: { userId },
      include: { planet: { select: { id: true, name: true, region: { select: { id: true, name: true, color: true } } } } },
    });

    return buildings.map(b => ({
      id: b.id,
      planetId: b.planetId,
      planetName: b.planet.name,
      regionName: b.planet.region.name,
      regionColor: b.planet.region.color,
      buildingType: b.buildingType,
      level: b.level,
      builtAt: b.builtAt,
      upgradedAt: b.upgradedAt,
      config: BUILDING_CONFIGS[b.buildingType]?.[b.level] || null,
    }));
  }

  async getBuildingEffect(planetId: string, userId: string, effectType: string): Promise<boolean> {
    const buildings = await prisma.planetBuilding.findMany({
      where: { userId, planetId },
    });

    for (const b of buildings) {
      const config = BUILDING_CONFIGS[b.buildingType]?.[b.level];
      if (config && config.effect === effectType) {
        return true;
      }
    }
    return false;
  }
}

export const starPathBuildingService = new StarPathBuildingService();
