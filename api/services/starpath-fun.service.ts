import prisma from '../lib/prisma';

/* ── 宠物能力接口 ── */
interface PetAbility {
  name: string;
  description: string;
  type: 'points_bonus' | 'exp_bonus' | 'chest_bonus' | 'star_bonus' | 'mood_decay_resist';
  value: number; // 百分比加成（如 5 表示 +5%）
}

/* ── 宠物类型定义 ── */
interface PetTypeInfo {
  name: string;
  emoji: string;
  description: string;
  // 进化阶段对应的 emoji
  evolvedEmojis: [string, string, string, string];
  abilities: PetAbility[];
}

/* ── 进化阶段定义 ── */
interface EvolutionStage {
  name: string;
  minLevel: number;
  maxLevel: number;
  abilityMultiplier: number;
  unlocks: string[];
}

const EVOLUTION_STAGES: EvolutionStage[] = [
  { name: '幼年', minLevel: 1, maxLevel: 4, abilityMultiplier: 1.0, unlocks: [] },
  { name: '成长', minLevel: 5, maxLevel: 9, abilityMultiplier: 1.5, unlocks: ['训练'] },
  { name: '精英', minLevel: 10, maxLevel: 14, abilityMultiplier: 2.0, unlocks: ['训练', '探险'] },
  { name: '传奇', minLevel: 15, maxLevel: Infinity, abilityMultiplier: 3.0, unlocks: ['训练', '探险', '助战'] },
];

/* ── 心情对能力发挥的影响系数 ── */
function getMoodEfficiency(mood: number): number {
  if (mood >= 80) return 1.0;
  if (mood >= 50) return 0.7;
  if (mood >= 20) return 0.4;
  return 0; // 罢工
}

/* ── 每日星星收集上限（基于用户等级） ── */
function getDailyStarLimit(userLevel: number): number {
  // 等级越高，每日收集上限越多
  return 20 + userLevel * 5;
}

/* ── 宝箱连续签到加成 ── */
function getStreakBonusRate(streak: number): number {
  if (streak >= 14) return 1.0;   // +100%
  if (streak >= 7) return 0.5;    // +50%
  if (streak >= 3) return 0.2;    // +20%
  return 0;                        // 无加成
}

export class StarPathFunService {

  /* ── 宠物类型配置（含能力与进化 emoji） ── */
  private petTypes: Record<string, PetTypeInfo> = {
    star_cat: {
      name: '星喵',
      emoji: '🐱',
      description: '来自星云的猫咪，喜欢在代码间打盹',
      evolvedEmojis: ['🐱', '😺', '😸', '🦁'],
      abilities: [
        { name: '代码伴侣', description: '做题积分+5%', type: 'points_bonus', value: 5 },
        { name: '宅猫心态', description: '心情衰减-30%', type: 'mood_decay_resist', value: 30 },
      ],
    },
    moon_bunny: {
      name: '月兔',
      emoji: '🐰',
      description: '月球上的兔子，精通算法',
      evolvedEmojis: ['🐰', '🐇', '🌙', '🐲'],
      abilities: [
        { name: '学霸光环', description: '经验获取+15%', type: 'exp_bonus', value: 15 },
      ],
    },
    comet_fox: {
      name: '彗星狐',
      emoji: '🦊',
      description: '追逐彗星的狐狸，速度极快',
      evolvedEmojis: ['🦊', '🔥', '☄️', '🌟'],
      abilities: [
        { name: '疾风拾取', description: '收集星星积分+50%', type: 'star_bonus', value: 50 },
      ],
    },
    nebula_owl: {
      name: '星云鸮',
      emoji: '🦉',
      description: '星云中的智者，洞察一切Bug',
      evolvedEmojis: ['🦉', '🔮', '🌌', '✨'],
      abilities: [
        { name: '智者祝福', description: '每日宝箱奖励+25%', type: 'chest_bonus', value: 25 },
      ],
    },
    galaxy_dragon: {
      name: '银河龙',
      emoji: '🐉',
      description: '银河中最古老的存在，守护知识',
      evolvedEmojis: ['🐉', '🐲', '🌈', '💫'],
      abilities: [
        { name: '万象之力', description: '全属性+8%', type: 'points_bonus', value: 8 },
        { name: '万象之力', description: '全属性+8%', type: 'exp_bonus', value: 8 },
        { name: '万象之力', description: '全属性+8%', type: 'chest_bonus', value: 8 },
        { name: '万象之力', description: '全属性+8%', type: 'star_bonus', value: 8 },
        { name: '万象之力', description: '全属性+8%', type: 'mood_decay_resist', value: 8 },
      ],
    },
  };

  /* ══════════════════════════════════════
     每日宝箱（含连续签到加成 & 宠物能力加成）
     ══════════════════════════════════════ */
  async openDailyChest(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const existing = await prisma.userDailyChest.findUnique({
      where: { userId_chestDate: { userId, chestDate: today } },
    });
    if (existing) {
      return { alreadyOpened: true, pointsWon: existing.pointsWon, totalToday: existing.pointsWon };
    }

    // 计算连续签到天数
    const streak = await this.getChestStreak(userId);
    const streakBonus = getStreakBonusRate(streak);

    // 基础随机奖励 10-40
    let basePoints = Math.floor(Math.random() * 31) + 10;

    // 连续签到加成
    basePoints = Math.round(basePoints * (1 + streakBonus));

    // 宠物 chest_bonus 加成
    const bonuses = await this.getPetBonuses(userId);
    const pointsWon = Math.round(basePoints * (1 + bonuses.chestBonus / 100));

    await prisma.userDailyChest.create({
      data: { userId, chestDate: today, pointsWon },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: pointsWon } },
    });
    await prisma.pointLog.create({
      data: { userId, delta: pointsWon, reason: '每日宝箱奖励' },
    });

    // 宠物获得心情和经验
    const pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (pet) {
      await prisma.userSpacePet.update({
        where: { userId },
        data: { mood: Math.min(100, pet.mood + 10), exp: pet.exp + 5 },
      });
    }

    // 里程碑奖励
    let milestoneBonus = 0;
    const newStreak = streak + 1;
    if (newStreak === 7) milestoneBonus = 50;
    else if (newStreak === 30) milestoneBonus = 200;

    if (milestoneBonus > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: milestoneBonus } },
      });
      await prisma.pointLog.create({
        data: { userId, delta: milestoneBonus, reason: `连续签到${newStreak}天里程碑奖励` },
      });
    }

    return {
      alreadyOpened: false,
      pointsWon,
      streakBonus: Math.round(streakBonus * 100),
      milestoneBonus,
      streak: newStreak,
    };
  }

  async getChestStatus(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const chest = await prisma.userDailyChest.findUnique({
      where: { userId_chestDate: { userId, chestDate: today } },
    });
    const streak = await this.getChestStreak(userId);
    return { opened: !!chest, pointsWon: chest?.pointsWon || 0, streak };
  }

  /** 优化：一次查询最近N天记录，内存计算连续天数 */
  private async getChestStreak(userId: string): Promise<number> {
    const today = new Date();
    // 一次性查询最近60天的记录（覆盖绝大多数连续签到场景）
    const lookbackDays = 60;
    const dates: string[] = [];
    for (let i = 0; i < lookbackDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const records = await prisma.userDailyChest.findMany({
      where: { userId, chestDate: { in: dates } },
      select: { chestDate: true },
    });

    // 将已签到日期放入 Set 用于 O(1) 查找
    const signedDates = new Set(records.map(r => r.chestDate));

    // 从今天往前数连续天数
    let streak = 0;
    for (const date of dates) {
      if (signedDates.has(date)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  /* ══════════════════════════════════════
     太空宠物核心
     ══════════════════════════════════════ */

  async getOrCreatePet(userId: string) {
    let pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (!pet) {
      pet = await prisma.userSpacePet.create({ data: { userId } });
    }

    // 自动计算心情衰减（基于 updatedAt 距今天数）
    const decayedMood = this.calculateMoodDecay(pet);
    if (decayedMood !== pet.mood) {
      await prisma.userSpacePet.update({
        where: { userId },
        data: { mood: decayedMood },
      });
      pet = { ...pet, mood: decayedMood };
    }

    const typeInfo = this.petTypes[pet.petType] || this.petTypes.star_cat;
    const stage = this.getEvolutionStage(pet.level);
    const emoji = typeInfo.evolvedEmojis[EVOLUTION_STAGES.indexOf(stage)] || typeInfo.emoji;
    const moodEmoji = pet.mood >= 80 ? '😊' : pet.mood >= 50 ? '😐' : pet.mood >= 20 ? '😟' : '😢';
    const expToNext = pet.level * 50;
    const canLevelUp = pet.exp >= expToNext;

    return {
      ...pet,
      typeInfo: { ...typeInfo, emoji },
      moodEmoji,
      levelTitle: stage.name,
      stage,
      expToNext,
      canLevelUp,
      abilities: this.getScaledAbilities(typeInfo, stage, pet.mood),
    };
  }

  async feedPet(userId: string) {
    const pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (!pet) throw new Error('宠物不存在');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.points < 10) throw new Error('积分不足，需要10积分喂食');

    await prisma.user.update({ where: { id: userId }, data: { points: { decrement: 10 } } });
    await prisma.pointLog.create({ data: { userId, delta: -10, reason: '喂食太空宠物' } });

    const newMood = Math.min(100, pet.mood + 20);
    const newExp = pet.exp + 15;
    const expToNext = pet.level * 50;
    let newLevel = pet.level;
    let newExpAfter = newExp;

    if (newExp >= expToNext) {
      newLevel = pet.level + 1;
      newExpAfter = newExp - expToNext;
    }

    await prisma.userSpacePet.update({
      where: { userId },
      data: { mood: newMood, exp: newExpAfter, level: newLevel },
    });

    return { mood: newMood, exp: newExpAfter, level: newLevel, leveledUp: newLevel > pet.level };
  }

  async changePetType(userId: string, petType: string) {
    if (!this.petTypes[petType]) throw new Error('无效的宠物类型');

    await this.getOrCreatePet(userId);
    await prisma.userSpacePet.update({
      where: { userId },
      data: { petType },
    });
    return { petType };
  }

  async renamePet(userId: string, petName: string) {
    if (!petName || petName.length > 20) throw new Error('名字长度需在1-20之间');
    await prisma.userSpacePet.update({
      where: { userId },
      data: { petName },
    });
    return { petName };
  }

  getPetTypes() {
    return this.petTypes;
  }

  /* ── 训练交互（每天最多3次，消耗5积分，获25经验，10%顿悟） ── */
  async trainPet(userId: string) {
    const pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (!pet) throw new Error('宠物不存在');

    // 检查进化阶段是否解锁训练（阶段2+）
    const stage = this.getEvolutionStage(pet.level);
    if (!stage.unlocks.includes('训练')) {
      throw new Error('宠物等级不足，Lv5 解锁训练');
    }

    // 检查每日训练次数（通过 pointLog 计数）
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00.000Z');
    const todayEnd = new Date(today + 'T23:59:59.999Z');
    const trainCount = await prisma.pointLog.count({
      where: {
        userId,
        reason: '训练太空宠物',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });
    if (trainCount >= 3) throw new Error('今日训练次数已用完（3/3）');

    // 检查积分
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.points < 5) throw new Error('积分不足，需要5积分训练');

    await prisma.user.update({ where: { id: userId }, data: { points: { decrement: 5 } } });
    await prisma.pointLog.create({ data: { userId, delta: -5, reason: '训练太空宠物' } });

    // 10% 概率顿悟
    const isEpiphany = Math.random() < 0.1;
    const baseExp = 25;
    const bonusExp = isEpiphany ? 50 : 0;
    const totalExp = baseExp + bonusExp;

    const newMood = Math.min(100, pet.mood + 10);
    const newExp = pet.exp + totalExp;
    const expToNext = pet.level * 50;
    let newLevel = pet.level;
    let newExpAfter = newExp;

    if (newExp >= expToNext) {
      newLevel = pet.level + 1;
      newExpAfter = newExp - expToNext;
    }

    await prisma.userSpacePet.update({
      where: { userId },
      data: { mood: newMood, exp: newExpAfter, level: newLevel },
    });

    return {
      mood: newMood,
      exp: newExpAfter,
      level: newLevel,
      leveledUp: newLevel > pet.level,
      isEpiphany,
      expGained: totalExp,
      trainCountToday: trainCount + 1,
    };
  }

  /* ── 获取宠物加成（含心情折扣与进化阶段） ── */
  async getPetBonuses(userId: string): Promise<{
    pointsBonus: number;
    expBonus: number;
    chestBonus: number;
    starBonus: number;
    moodDecayResist: number;
    moodEfficiency: number;
    encouragement: string | null;
  }> {
    const pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (!pet) {
      return { pointsBonus: 0, expBonus: 0, chestBonus: 0, starBonus: 0, moodDecayResist: 0, moodEfficiency: 0, encouragement: null };
    }

    const typeInfo = this.petTypes[pet.petType] || this.petTypes.star_cat;
    const stage = this.getEvolutionStage(pet.level);
    // 自动衰减心情用于计算
    const mood = this.calculateMoodDecay(pet);
    const efficiency = getMoodEfficiency(mood);

    const result = { pointsBonus: 0, expBonus: 0, chestBonus: 0, starBonus: 0, moodDecayResist: 0, moodEfficiency: efficiency, encouragement: null as string | null };

    for (const ability of typeInfo.abilities) {
      const scaled = ability.value * stage.abilityMultiplier * efficiency;
      switch (ability.type) {
        case 'points_bonus': result.pointsBonus += scaled; break;
        case 'exp_bonus': result.expBonus += scaled; break;
        case 'chest_bonus': result.chestBonus += scaled; break;
        case 'star_bonus': result.starBonus += scaled; break;
        case 'mood_decay_resist': result.moodDecayResist += ability.value * stage.abilityMultiplier; break; // 衰减抵抗不受心情影响
      }
    }

    // 传奇阶段解锁助战鼓励语
    if (stage.unlocks.includes('助战')) {
      const encouragements = [
        '你的宠物为你加油！坚持就是胜利 💪',
        '星际伙伴在守护着你的每一次尝试 🌟',
        '别担心，慢慢来，你的宠物相信你！🎯',
        '宠物悄悄告诉你：这题的关键在于边界条件 🤫',
        '银河守护者与你同在，大胆提交吧！🚀',
      ];
      result.encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    }

    return result;
  }

  /* ── 心情衰减计算（基于 updatedAt 与当前时间差） ── */
  private calculateMoodDecay(pet: { mood: number; updatedAt: Date; petType: string }): number {
    const now = new Date();
    const lastUpdate = new Date(pet.updatedAt);
    // 计算距上次互动过去的完整天数
    const daysPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPassed <= 0) return pet.mood;

    // 获取衰减抵抗（不需要查询数据库，直接从类型配置计算）
    const typeInfo = this.petTypes[pet.petType] || this.petTypes.star_cat;
    let moodDecayResist = 0;
    for (const ability of typeInfo.abilities) {
      if (ability.type === 'mood_decay_resist') {
        moodDecayResist += ability.value;
      }
    }

    // 每天衰减 10 点，抵抗比例减免
    const decayPerDay = 10 * (1 - moodDecayResist / 100);
    const totalDecay = Math.round(daysPassed * decayPerDay);

    return Math.max(0, pet.mood - totalDecay);
  }

  /* ── 获取进化阶段 ── */
  private getEvolutionStage(level: number): EvolutionStage {
    for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
      if (level >= EVOLUTION_STAGES[i].minLevel) {
        return EVOLUTION_STAGES[i];
      }
    }
    return EVOLUTION_STAGES[0];
  }

  /** 根据宠物类型、进化阶段和心情，计算实际生效的能力列表 */
  private getScaledAbilities(typeInfo: PetTypeInfo, stage: EvolutionStage, mood: number) {
    const efficiency = getMoodEfficiency(mood);
    return typeInfo.abilities.map(ability => ({
      ...ability,
      // 衰减抵抗不受心情影响
      effectiveValue: ability.type === 'mood_decay_resist'
        ? Number((ability.value * stage.abilityMultiplier).toFixed(1))
        : Number((ability.value * stage.abilityMultiplier * efficiency).toFixed(1)),
      stageMultiplier: stage.abilityMultiplier,
      moodEfficiency: ability.type === 'mood_decay_resist' ? 1 : efficiency,
    }));
  }

  /* ══════════════════════════════════════
     星球自定义
     ══════════════════════════════════════ */
  async customizePlanet(userId: string, planetId: string, data: { customName?: string; customColor?: string; emoji?: string }) {
    const progress = await prisma.userPlanetProgress.findUnique({
      where: { userId_planetId: { userId, planetId } },
    });
    if (!progress || progress.status !== 'MASTERED') {
      throw new Error('只有精通的星球才能自定义');
    }

    return prisma.userPlanetCustomization.upsert({
      where: { userId_planetId: { userId, planetId } },
      create: { userId, planetId, ...data },
      update: data,
    });
  }

  async getPlanetCustomizations(userId: string) {
    return prisma.userPlanetCustomization.findMany({
      where: { userId },
      include: { planet: { select: { id: true, name: true, region: { select: { name: true, color: true } } } } },
    });
  }

  /* ══════════════════════════════════════
     收集星星（含防刷 & 宠物 star_bonus）
     ══════════════════════════════════════ */
  async collectStar(userId: string, starType: string) {
    const pointsMap: Record<string, number> = {
      common: 1,
      rare: 3,
      epic: 5,
      legendary: 10,
    };
    const basePoints = pointsMap[starType] || 1;

    // 防刷：检查每日收集上限
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
    const dailyLimit = getDailyStarLimit(user?.level || 1);

    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00.000Z');
    const todayEnd = new Date(today + 'T23:59:59.999Z');
    const todayCount = await prisma.pointLog.count({
      where: {
        userId,
        reason: { startsWith: '收集' },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });
    if (todayCount >= dailyLimit) {
      return { points: 0, starType, limitReached: true, dailyLimit };
    }

    // 宠物 star_bonus 加成
    const bonuses = await this.getPetBonuses(userId);
    const points = Math.round(basePoints * (1 + bonuses.starBonus / 100));

    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: points } },
    });
    await prisma.pointLog.create({
      data: { userId, delta: points, reason: `收集${starType}星星` },
    });

    // 宠物获得经验和心情
    const pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (pet) {
      await prisma.userSpacePet.update({
        where: { userId },
        data: { exp: pet.exp + points, mood: Math.min(100, pet.mood + 2) },
      });
    }

    return { points, starType, limitReached: false, dailyLimit, todayCollected: todayCount + 1 };
  }
}

export const starPathFunService = new StarPathFunService();
