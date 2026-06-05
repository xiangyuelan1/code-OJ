import prisma from '../lib/prisma';
import { pointsService } from './points.service';

/* ══════════════════════════════════════
   星球探险系统
   核心思想：做题进度（精通星球数）决定可解锁的任务和收益加成，
   形成"做题→精通→解锁高级探险→更多积分→更快建设"的正反馈循环
   ══════════════════════════════════════ */

// 探险任务配置
interface ExplorationMission {
  id: string;
  name: string;
  description: string;
  duration: number;        // 探险时长（分钟）
  minLevel: number;        // 宠物最低等级要求
  rewards: {
    points: [number, number];     // 积分范围 [min, max]
    petExp: number;               // 宠物经验
    bonusChance: number;          // 额外奖励概率 (0-1)
    bonusPoints: number;          // 额外奖励积分
  };
  requiredMastered: number; // 需要精通的星球数量才能解锁
}

// 探险状态枚举
type ExplorationState = 'idle' | 'in_progress' | 'claimable';

// 探险状态信息
interface ExplorationStatus {
  state: ExplorationState;
  mission?: ExplorationMission;
  startTime?: Date;
  endTime?: Date;
  remainingMinutes?: number;
}

// 探险奖励结果
interface ExplorationReward {
  basePoints: number;
  masteryBonus: number;
  levelBonus: number;
  bonusTriggered: boolean;
  bonusPoints: number;
  totalPoints: number;
  petExp: number;
}

/* ── 任务配置表 ── */
const MISSIONS: ExplorationMission[] = [
  {
    id: 'asteroid_belt',
    name: '小行星带搜索',
    description: '在小行星带中寻找碎片资源',
    duration: 30,
    minLevel: 1,
    rewards: { points: [5, 15], petExp: 10, bonusChance: 0.1, bonusPoints: 20 },
    requiredMastered: 0,
  },
  {
    id: 'nebula_scan',
    name: '星云扫描',
    description: '扫描附近星云中的能量信号',
    duration: 60,
    minLevel: 3,
    rewards: { points: [10, 30], petExp: 20, bonusChance: 0.15, bonusPoints: 40 },
    requiredMastered: 2,
  },
  {
    id: 'deep_space',
    name: '深空探测',
    description: '深入未知区域进行探测',
    duration: 120,
    minLevel: 5,
    rewards: { points: [20, 50], petExp: 35, bonusChance: 0.2, bonusPoints: 60 },
    requiredMastered: 5,
  },
  {
    id: 'black_hole_edge',
    name: '黑洞边缘探索',
    description: '在黑洞视界附近搜集稀有物质',
    duration: 240,
    minLevel: 8,
    rewards: { points: [40, 100], petExp: 60, bonusChance: 0.25, bonusPoints: 100 },
    requiredMastered: 10,
  },
  {
    id: 'galaxy_core',
    name: '银河核心远征',
    description: '前往银河系核心区域进行终极探索',
    duration: 480,
    minLevel: 12,
    rewards: { points: [80, 200], petExp: 100, bonusChance: 0.3, bonusPoints: 200 },
    requiredMastered: 15,
  },
];

// 探险记录在 PointLog 中使用的标识
const EXPLORATION_START_REASON = 'EXPLORATION_START';
const EXPLORATION_REWARD_REASON = 'EXPLORATION_REWARD';

class StarPathExplorationService {

  /**
   * 获取用户可用的探险任务列表
   * 根据宠物等级和精通星球数过滤
   */
  async getAvailableMissions(userId: string) {
    const [petLevel, masteredCount] = await Promise.all([
      this.getPetLevel(userId),
      this.getMasteredPlanetCount(userId),
    ]);

    return MISSIONS.map(mission => ({
      ...mission,
      unlocked: petLevel >= mission.minLevel && masteredCount >= mission.requiredMastered,
      // 提供锁定原因便于前端展示
      lockReason: this.getLockReason(mission, petLevel, masteredCount),
    }));
  }

  /**
   * 开始一次探险任务
   * 校验：宠物未在探险中、等级满足、精通数满足、心情充足
   */
  async startExploration(userId: string, missionId: string) {
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) throw new Error('无效的探险任务');

    // 检查是否有进行中的探险
    const currentExploration = await this.findActiveExploration(userId);
    if (currentExploration) {
      throw new Error('宠物正在探险中，请等待当前探险完成');
    }

    // 检查宠物等级
    const pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (!pet) throw new Error('宠物不存在，请先创建宠物');
    if (pet.level < mission.minLevel) {
      throw new Error(`宠物等级不足，需要 Lv.${mission.minLevel}`);
    }

    // 检查心情值（探险消耗10点心情）
    if (pet.mood < 10) {
      throw new Error('宠物心情不足，需要至少10点心情才能出发');
    }

    // 检查精通星球数
    const masteredCount = await this.getMasteredPlanetCount(userId);
    if (masteredCount < mission.requiredMastered) {
      throw new Error(`需要精通至少 ${mission.requiredMastered} 个星球才能解锁此任务`);
    }

    // 消耗心情并记录探险开始
    const startTime = new Date();
    await prisma.$transaction([
      // 扣除宠物心情
      prisma.userSpacePet.update({
        where: { userId },
        data: { mood: pet.mood - 10 },
      }),
      // 在 PointLog 中记录探险开始（delta=0，不影响积分）
      prisma.pointLog.create({
        data: {
          userId,
          delta: 0,
          reason: EXPLORATION_START_REASON,
          details: JSON.stringify({ missionId, startTime: startTime.toISOString() }),
        },
      }),
    ]);

    const endTime = new Date(startTime.getTime() + mission.duration * 60 * 1000);
    return {
      mission,
      startTime,
      endTime,
      remainingMinutes: mission.duration,
    };
  }

  /**
   * 获取当前探险状态
   * 返回：idle（无探险）/ in_progress（进行中）/ claimable（可收取）
   */
  async getExplorationStatus(userId: string): Promise<ExplorationStatus> {
    const exploration = await this.findActiveExploration(userId);
    if (!exploration) {
      return { state: 'idle' };
    }

    const { mission, startTime } = exploration;
    const endTime = new Date(startTime.getTime() + mission.duration * 60 * 1000);
    const now = new Date();

    if (now >= endTime) {
      return {
        state: 'claimable',
        mission,
        startTime,
        endTime,
        remainingMinutes: 0,
      };
    }

    const remainingMs = endTime.getTime() - now.getTime();
    return {
      state: 'in_progress',
      mission,
      startTime,
      endTime,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
    };
  }

  /**
   * 收取探险奖励
   * 计算逻辑：基础积分 + 精通星球加成(每个+2%) + 宠物等级加成(每级+3%) + 额外奖励判定
   */
  async claimExplorationReward(userId: string): Promise<ExplorationReward> {
    const exploration = await this.findActiveExploration(userId);
    if (!exploration) {
      throw new Error('没有进行中的探险任务');
    }

    const { mission, startTime, logId } = exploration;
    const endTime = new Date(startTime.getTime() + mission.duration * 60 * 1000);
    const now = new Date();

    if (now < endTime) {
      const remaining = Math.ceil((endTime.getTime() - now.getTime()) / (60 * 1000));
      throw new Error(`探险尚未完成，还需 ${remaining} 分钟`);
    }

    // 计算奖励
    const [masteredCount, petLevel] = await Promise.all([
      this.getMasteredPlanetCount(userId),
      this.getPetLevel(userId),
    ]);

    // 基础积分：在 [min, max] 范围内随机
    const [minPts, maxPts] = mission.rewards.points;
    const basePoints = Math.floor(Math.random() * (maxPts - minPts + 1)) + minPts;

    // 精通星球加成：每个精通星球 +2%
    const masteryBonus = Math.round(basePoints * masteredCount * 0.02);

    // 宠物等级加成：每级 +3%
    const levelBonus = Math.round(basePoints * petLevel * 0.03);

    // 额外奖励判定
    const bonusTriggered = Math.random() < mission.rewards.bonusChance;
    const bonusPoints = bonusTriggered ? mission.rewards.bonusPoints : 0;

    const totalPoints = basePoints + masteryBonus + levelBonus + bonusPoints;
    const petExp = mission.rewards.petExp;

    // 读取原始探险记录的 details，用于标记已收取
    const originalLog = await prisma.pointLog.findUnique({ where: { id: logId } });
    const originalDetails = JSON.parse(originalLog?.details || '{}');

    // 发放积分奖励时统一走 pointsService，确保积分变化后同步重算等级
    await pointsService.updateUserPoints(userId, totalPoints, EXPLORATION_REWARD_REASON, {
      missionId: mission.id,
      basePoints,
      masteryBonus,
      levelBonus,
      bonusTriggered,
      bonusPoints,
      petExp,
      masteredCount,
      petLevel,
    });

    // 宠物经验与探险状态标记保持在同一个事务中，避免奖励状态不一致
    await prisma.$transaction([
      prisma.userSpacePet.update({
        where: { userId },
        data: { exp: { increment: petExp } },
      }),
      prisma.pointLog.update({
        where: { id: logId },
        data: {
          details: JSON.stringify({ ...originalDetails, claimed: true }),
        },
      }),
    ]);

    return {
      basePoints,
      masteryBonus,
      levelBonus,
      bonusTriggered,
      bonusPoints,
      totalPoints,
      petExp,
    };
  }

  /* ══════════════════════════════════════
     私有辅助方法
     ══════════════════════════════════════ */

  /**
   * 查找用户当前未完成/未收取的探险记录
   * 通过 PointLog 中 reason=EXPLORATION_START 且 details 中 claimed=false 来判断
   */
  private async findActiveExploration(userId: string): Promise<{
    mission: ExplorationMission;
    startTime: Date;
    logId: string;
  } | null> {
    // 获取最近的探险开始记录
    const logs = await prisma.pointLog.findMany({
      where: { userId, reason: EXPLORATION_START_REASON },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (logs.length === 0) return null;

    const log = logs[0];
    const details = JSON.parse(log.details || '{}');

    // 已收取的探险不算活跃
    if (details.claimed) return null;

    const mission = MISSIONS.find(m => m.id === details.missionId);
    if (!mission) return null;

    return {
      mission,
      startTime: new Date(details.startTime),
      logId: log.id,
    };
  }

  /** 获取用户宠物等级 */
  private async getPetLevel(userId: string): Promise<number> {
    const pet = await prisma.userSpacePet.findUnique({
      where: { userId },
      select: { level: true },
    });
    return pet?.level ?? 1;
  }

  /** 获取用户精通星球数量 */
  private async getMasteredPlanetCount(userId: string): Promise<number> {
    return prisma.userPlanetProgress.count({
      where: { userId, status: 'MASTERED' },
    });
  }

  /** 生成任务锁定原因说明 */
  private getLockReason(
    mission: ExplorationMission,
    petLevel: number,
    masteredCount: number,
  ): string | null {
    const reasons: string[] = [];
    if (petLevel < mission.minLevel) {
      reasons.push(`宠物等级需达到 Lv.${mission.minLevel}（当前 Lv.${petLevel}）`);
    }
    if (masteredCount < mission.requiredMastered) {
      reasons.push(`需精通 ${mission.requiredMastered} 个星球（当前 ${masteredCount} 个）`);
    }
    return reasons.length > 0 ? reasons.join('；') : null;
  }
}

export const starPathExplorationService = new StarPathExplorationService();
