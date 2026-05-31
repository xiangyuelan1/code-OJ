import prisma from '../lib/prisma';

export class StarPathFunService {

  /* ── 每日宝箱 ── */
  async openDailyChest(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const existing = await prisma.userDailyChest.findUnique({
      where: { userId_chestDate: { userId, chestDate: today } },
    });
    if (existing) {
      return { alreadyOpened: true, pointsWon: existing.pointsWon, totalToday: existing.pointsWon };
    }

    const pointsWon = Math.floor(Math.random() * 30) + 10;

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

    const pet = await this.getOrCreatePet(userId);
    if (pet) {
      await prisma.userSpacePet.update({
        where: { userId },
        data: { mood: Math.min(100, pet.mood + 10), exp: pet.exp + 5 },
      });
    }

    return { alreadyOpened: false, pointsWon };
  }

  async getChestStatus(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const chest = await prisma.userDailyChest.findUnique({
      where: { userId_chestDate: { userId, chestDate: today } },
    });
    const streak = await this.getChestStreak(userId);
    return { opened: !!chest, pointsWon: chest?.pointsWon || 0, streak };
  }

  private async getChestStreak(userId: string): Promise<number> {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const chest = await prisma.userDailyChest.findUnique({
        where: { userId_chestDate: { userId, chestDate: dateStr } },
      });
      if (chest) streak++;
      else break;
    }
    return streak;
  }

  /* ── 太空宠物 ── */
  private petTypes: Record<string, { name: string; emoji: string; description: string }> = {
    star_cat: { name: '星喵', emoji: '🐱', description: '来自星云的猫咪，喜欢在代码间打盹' },
    moon_bunny: { name: '月兔', emoji: '🐰', description: '月球上的兔子，精通算法' },
    comet_fox: { name: '彗星狐', emoji: '🦊', description: '追逐彗星的狐狸，速度极快' },
    nebula_owl: { name: '星云鸮', emoji: '🦉', description: '星云中的智者，洞察一切Bug' },
    galaxy_dragon: { name: '银河龙', emoji: '🐉', description: '银河中最古老的存在，守护知识' },
  };

  async getOrCreatePet(userId: string) {
    let pet = await prisma.userSpacePet.findUnique({ where: { userId } });
    if (!pet) {
      pet = await prisma.userSpacePet.create({ data: { userId } });
    }

    const typeInfo = this.petTypes[pet.petType] || this.petTypes.star_cat;
    const moodEmoji = pet.mood >= 80 ? '😊' : pet.mood >= 50 ? '😐' : pet.mood >= 20 ? '😟' : '😢';
    const levelTitle = pet.level >= 10 ? '传奇' : pet.level >= 7 ? '精英' : pet.level >= 4 ? '成长' : '幼年';
    const expToNext = pet.level * 50;
    const canLevelUp = pet.exp >= expToNext;

    return {
      ...pet,
      typeInfo,
      moodEmoji,
      levelTitle,
      expToNext,
      canLevelUp,
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

    const pet = await this.getOrCreatePet(userId);
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

  /* ── 星球自定义 ── */
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

  /* ── 收集星星（小游戏分数记录） ── */
  async collectStar(userId: string, starType: string) {
    const pointsMap: Record<string, number> = {
      common: 1,
      rare: 3,
      epic: 5,
      legendary: 10,
    };
    const points = pointsMap[starType] || 1;

    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: points } },
    });
    await prisma.pointLog.create({
      data: { userId, delta: points, reason: `收集${starType}星星` },
    });

    const pet = await this.getOrCreatePet(userId);
    if (pet) {
      await prisma.userSpacePet.update({
        where: { userId },
        data: { exp: pet.exp + points, mood: Math.min(100, pet.mood + 2) },
      });
    }

    return { points, starType };
  }
}

export const starPathFunService = new StarPathFunService();
