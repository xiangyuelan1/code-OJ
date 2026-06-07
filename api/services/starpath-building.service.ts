import prisma from '../lib/prisma';
import { pointsService } from './points.service';

// 建筑汇总效果：用户所有建筑产生的综合能力
export interface BuildingEffects {
  extraProblems: number;          // 额外练习题数量 (来自实验室 Lv1+)
  hasHints: boolean;              // 是否有题目提示 (实验室 Lv2+)
  hasAISolution: boolean;         // 是否有AI解题思路 (实验室 Lv3)
  hasSolutions: boolean;          // 是否可看题解 (图书馆 Lv1+)
  hasKnowledgeSummary: boolean;   // 是否有知识总结 (图书馆 Lv2+)
  seasonPointsBonus: number;      // 赛季积分加成百分比 (竞技场 Lv3: 20%)
  dailyPassiveIncome: number;     // 每日被动积分收入 (指挥部产出)
  friendProgressVisible: boolean; // 好友进度可见 (天文台 Lv1+)
  hasSkillRadar: boolean;         // 技能雷达图 (天文台 Lv2+)
  hasLearningPath: boolean;       // 学习路径推荐 (天文台 Lv3)
}

// 被动收入收取结果
export interface PassiveIncomeResult {
  collectedPoints: number;  // 本次收取的积分总量
  daysAccumulated: number;  // 累积天数
  buildings: Array<{        // 各指挥部的产出明细
    planetId: string;
    level: number;
    contribution: number;
  }>;
}

// 指挥部每日被动积分产出配置
const HEADQUARTERS_DAILY_INCOME: Record<number, number> = {
  1: 0,
  2: 3,
  3: 8
};

// 被动收入最大累积天数
const MAX_ACCUMULATION_DAYS = 3;

// 被动收入收取的 PointLog reason 标识
const PASSIVE_INCOME_REASON = 'BUILDING_PASSIVE_INCOME';

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

const BASE_GRID_WIDTH = 12;
const BASE_GRID_HEIGHT = 8;

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

  async buildOnPlanet(planetId: string, userId: string, buildingType: string, layout?: { posX: number; posY: number }) {
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

    // 应用等级折扣计算实际费用
    const actualCost = await this.calculateDiscountedCost(userId, config.cost);

    if (actualCost > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.points < actualCost) {
        throw new Error(`积分不足，需要 ${actualCost} 积分`);
      }
      await pointsService.updateUserPoints(userId, -actualCost, `建造${config.name}`, {
        planetId,
        buildingType,
        baseCost: config.cost,
        actualCost,
      });
    }

    const position = this.normalizeLayout(layout ?? this.getDefaultPosition(buildingType));
    await this.ensurePositionAvailable(userId, planetId, position.posX, position.posY);

    return prisma.planetBuilding.create({
      data: { userId, planetId, buildingType, level: 1, ...position },
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

    // 应用等级折扣计算实际费用
    const actualCost = await this.calculateDiscountedCost(userId, config.cost);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.points < actualCost) {
      throw new Error(`积分不足，需要 ${actualCost} 积分`);
    }

    await pointsService.updateUserPoints(userId, -actualCost, `升级${config.name}`, {
      planetId,
      buildingType,
      baseCost: config.cost,
      actualCost,
      nextLevel,
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
      posX: b.posX,
      posY: b.posY,
      upgradedAt: b.upgradedAt,
      config: BUILDING_CONFIGS[b.buildingType]?.[b.level] || null,
    }));
  }

  // 查询指定星球上是否具有某种效果（保留向后兼容）
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

  // 获取用户所有建筑的汇总效果
  async getActiveBuildingEffects(userId: string): Promise<BuildingEffects> {
    const buildings = await prisma.planetBuilding.findMany({
      where: { userId },
    });

    // 初始化默认效果
    const effects: BuildingEffects = {
      extraProblems: 0,
      hasHints: false,
      hasAISolution: false,
      hasSolutions: false,
      hasKnowledgeSummary: false,
      seasonPointsBonus: 0,
      dailyPassiveIncome: 0,
      friendProgressVisible: false,
      hasSkillRadar: false,
      hasLearningPath: false,
    };

    for (const b of buildings) {
      switch (b.buildingType) {
        case 'LABORATORY':
          // 实验室：等级越高功能越多，低等级功能包含在高等级中
          effects.extraProblems += 2; // 每个实验室提供 +2 题
          if (b.level >= 2) effects.hasHints = true;
          if (b.level >= 3) effects.hasAISolution = true;
          break;

        case 'LIBRARY':
          if (b.level >= 1) effects.hasSolutions = true;
          if (b.level >= 2) effects.hasKnowledgeSummary = true;
          break;

        case 'ARENA':
          // 竞技场 Lv3 提供赛季积分加成，多个竞技场不叠加
          if (b.level >= 3) effects.seasonPointsBonus = 20;
          break;

        case 'HEADQUARTERS':
          // 指挥部每日被动收入按等级累加
          effects.dailyPassiveIncome += HEADQUARTERS_DAILY_INCOME[b.level] ?? 0;
          break;

        case 'OBSERVATORY':
          if (b.level >= 1) effects.friendProgressVisible = true;
          if (b.level >= 2) effects.hasSkillRadar = true;
          if (b.level >= 3) effects.hasLearningPath = true;
          break;
      }
    }

    return effects;
  }

  /**
   * 收取被动积分收入
   * 
   * 规则：
   * - 指挥部 Lv2 每天产出 3 积分，Lv3 每天产出 8 积分
   * - 最多累积 3 天未收取的产出
   * - 通过查询 PointLog 中最后一次被动收入记录确定起始时间
   * - 若从未收取过，则从建造/升级时间开始计算
   */
  async collectPassiveIncome(userId: string): Promise<PassiveIncomeResult> {
    // 查询用户所有指挥部建筑
    const headquarters = await prisma.planetBuilding.findMany({
      where: { userId, buildingType: 'HEADQUARTERS' },
    });

    // 筛选出有产出能力的指挥部（Lv2+）
    const productiveHQs = headquarters.filter(hq => hq.level >= 2);
    if (productiveHQs.length === 0) {
      return { collectedPoints: 0, daysAccumulated: 0, buildings: [] };
    }

    // 查询最后一次被动收入收取记录
    const lastCollection = await prisma.pointLog.findFirst({
      where: { userId, reason: PASSIVE_INCOME_REASON },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    let totalPoints = 0;
    let maxDays = 0;
    const buildingDetails: PassiveIncomeResult['buildings'] = [];

    for (const hq of productiveHQs) {
      const dailyIncome = HEADQUARTERS_DAILY_INCOME[hq.level] ?? 0;
      if (dailyIncome === 0) continue;

      // 确定该建筑的产出起始时间：取"上次收取时间"和"建筑升级到有产出等级的时间"中较晚者
      const buildingActiveTime = hq.upgradedAt ?? hq.builtAt;
      const startTime = lastCollection
        ? new Date(Math.max(lastCollection.createdAt.getTime(), buildingActiveTime.getTime()))
        : buildingActiveTime;

      // 计算累积天数（向下取整，未满一天不计）
      const elapsedMs = now.getTime() - startTime.getTime();
      const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
      // 限制最多累积天数
      const effectiveDays = Math.min(elapsedDays, MAX_ACCUMULATION_DAYS);

      if (effectiveDays <= 0) continue;

      const contribution = dailyIncome * effectiveDays;
      totalPoints += contribution;
      maxDays = Math.max(maxDays, effectiveDays);

      buildingDetails.push({
        planetId: hq.planetId,
        level: hq.level,
        contribution,
      });
    }

    // 无可收取积分时直接返回
    if (totalPoints <= 0) {
      return { collectedPoints: 0, daysAccumulated: 0, buildings: [] };
    }

    // 发放积分并记录日志
    await pointsService.updateUserPoints(userId, totalPoints, PASSIVE_INCOME_REASON, {
      buildings: buildingDetails,
      daysAccumulated: maxDays,
    });

    return {
      collectedPoints: totalPoints,
      daysAccumulated: maxDays,
      buildings: buildingDetails,
    };
  }

  async updateBuildingLayout(userId: string, buildingId: string, posX: number, posY: number) {
    const position = this.normalizeLayout({ posX, posY });
    const building = await prisma.planetBuilding.findFirst({
      where: { id: buildingId, userId },
    });

    if (!building) {
      throw new Error('建筑不存在或无权操作');
    }

    await this.ensurePositionAvailable(userId, building.planetId, position.posX, position.posY, building.id);

    return prisma.planetBuilding.update({
      where: { id: building.id },
      data: position,
    });
  }

  private normalizeLayout(layout: { posX: number; posY: number }) {
    return {
      posX: Math.min(BASE_GRID_WIDTH - 1, Math.max(0, Math.round(layout.posX))),
      posY: Math.min(BASE_GRID_HEIGHT - 1, Math.max(0, Math.round(layout.posY))),
    };
  }

  private getDefaultPosition(buildingType: string) {
    const defaults: Record<string, { posX: number; posY: number }> = {
      HEADQUARTERS: { posX: 5, posY: 3 },
      LABORATORY: { posX: 3, posY: 2 },
      LIBRARY: { posX: 7, posY: 2 },
      ARENA: { posX: 3, posY: 5 },
      OBSERVATORY: { posX: 7, posY: 5 },
    };
    return defaults[buildingType] ?? { posX: 5, posY: 4 };
  }

  private async ensurePositionAvailable(userId: string, planetId: string, posX: number, posY: number, exceptId?: string) {
    const existing = await prisma.planetBuilding.findFirst({
      where: {
        userId,
        planetId,
        posX,
        posY,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });

    if (existing) {
      throw new Error('该位置已有建筑，请选择其他地块');
    }
  }

  // 根据用户等级折扣计算建筑实际费用
  private async calculateDiscountedCost(userId: string, baseCost: number): Promise<number> {
    if (baseCost <= 0) return 0;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });

    if (!user) return baseCost;

    const privileges = pointsService.getLevelPrivileges(user.level);
    // 折扣后向下取整，确保不为负
    return Math.max(0, Math.floor(baseCost * (1 - privileges.buildingDiscount)));
  }
}

export const starPathBuildingService = new StarPathBuildingService();
