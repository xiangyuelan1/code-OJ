import prisma from '../lib/prisma';

/**
 * 材料稀有度排序权重（高 → 低）
 */
const RARITY_ORDER: Record<string, number> = {
  LEGENDARY: 5,
  EPIC: 4,
  RARE: 3,
  UNCOMMON: 2,
  COMMON: 1,
};

/**
 * 默认材料种子数据
 */
const DEFAULT_MATERIALS = [
  // COMMON
  { name: '代码碎片', description: '编程世界中最基础的构建单元', rarity: 'COMMON', icon: '🧩', category: 'CODE' },
  { name: '逻辑线路', description: '连接思维的基础逻辑导线', rarity: 'COMMON', icon: '🔗', category: 'LOGIC' },
  { name: '数据块', description: '承载信息的标准数据容器', rarity: 'COMMON', icon: '📦', category: 'GENERAL' },
  // UNCOMMON
  { name: '算法晶体', description: '凝聚算法精华的透明晶体', rarity: 'UNCOMMON', icon: '💠', category: 'ALGORITHM' },
  { name: '结构合金', description: '以数据结构锻造的坚固合金', rarity: 'UNCOMMON', icon: '⚙️', category: 'STRUCTURE' },
  { name: '调试宝石', description: '能照亮 Bug 所在的发光宝石', rarity: 'UNCOMMON', icon: '🔮', category: 'GENERAL' },
  // RARE
  { name: '递归之心', description: '蕴含无限递归力量的心脏', rarity: 'RARE', icon: '❤️‍🔥', category: 'ALGORITHM' },
  { name: '动态规划矿石', description: '从最优子结构中开采的稀有矿石', rarity: 'RARE', icon: '⛏️', category: 'ALGORITHM' },
  { name: '图论水晶', description: '映射着节点与边的璀璨水晶', rarity: 'RARE', icon: '🔷', category: 'STRUCTURE' },
  // EPIC
  { name: '编译器核心', description: '驱动代码转化的高能核心', rarity: 'EPIC', icon: '⚛️', category: 'CODE' },
  { name: '内存宝石', description: '存储无尽知识的紫色宝石', rarity: 'EPIC', icon: '💎', category: 'GENERAL' },
  // LEGENDARY
  { name: '星际引擎', description: '驱动星途旅程的终极动力源', rarity: 'LEGENDARY', icon: '🚀', category: 'GENERAL' },
];

/**
 * 默认合成配方种子数据
 * 注意：materials 中的 name 用于关联种子材料
 */
const DEFAULT_RECIPES = [
  {
    name: '代码熔炉',
    description: '将代码碎片和逻辑线路熔炼为建筑升级材料',
    resultType: 'BUILDING_UPGRADE',
    resultEffect: JSON.stringify({ type: 'BUILDING_UPGRADE', buildingType: 'forge', value: 1 }),
    unlockLevel: 1,
    materials: [
      { name: '代码碎片', quantity: 3 },
      { name: '逻辑线路', quantity: 2 },
    ],
  },
  {
    name: '算法精炼',
    description: '提炼算法精华，获得双倍积分卡',
    resultType: 'CONSUMABLE',
    resultEffect: JSON.stringify({ type: 'POINTS_BOOST', value: 2, duration: 86400, description: '24小时内获得积分翻倍' }),
    unlockLevel: 2,
    materials: [
      { name: '算法晶体', quantity: 2 },
      { name: '递归之心', quantity: 1 },
    ],
  },
  {
    name: '数据压缩',
    description: '压缩数据块，扩充背包容量',
    resultType: 'EQUIPMENT',
    resultEffect: JSON.stringify({ type: 'BACKPACK_EXPAND', value: 10, description: '背包容量+10' }),
    unlockLevel: 1,
    materials: [
      { name: '数据块', quantity: 5 },
    ],
  },
  {
    name: '调试工坊',
    description: '在工坊中打磨宝石，制造提示卡',
    resultType: 'CONSUMABLE',
    resultEffect: JSON.stringify({ type: 'HINT_CARD', value: 3, description: '获得3张提示卡' }),
    unlockLevel: 3,
    materials: [
      { name: '调试宝石', quantity: 3 },
      { name: '编译器核心', quantity: 1 },
    ],
  },
  {
    name: '星际燃料',
    description: '合成推动星际探险的高能燃料',
    resultType: 'CONSUMABLE',
    resultEffect: JSON.stringify({ type: 'EXPLORATION_BOOST', value: 2, duration: 43200, description: '12小时探险速度翻倍' }),
    unlockLevel: 4,
    materials: [
      { name: '动态规划矿石', quantity: 2 },
      { name: '图论水晶', quantity: 1 },
      { name: '星际引擎', quantity: 1 },
    ],
  },
  {
    name: '结构强化',
    description: '用结构合金强化星球防御',
    resultType: 'BUILDING_UPGRADE',
    resultEffect: JSON.stringify({ type: 'BUILDING_UPGRADE', buildingType: 'shield', value: 1 }),
    unlockLevel: 2,
    materials: [
      { name: '结构合金', quantity: 3 },
      { name: '数据块', quantity: 2 },
    ],
  },
  {
    name: '知识结晶',
    description: '将内存宝石与算法晶体融合为永久知识buff',
    resultType: 'DECORATION',
    resultEffect: JSON.stringify({ type: 'DECORATION', name: '知识光环', description: '展示你的算法造诣' }),
    unlockLevel: 5,
    materials: [
      { name: '内存宝石', quantity: 1 },
      { name: '算法晶体', quantity: 3 },
    ],
  },
];

class StarpathCraftService {
  /**
   * 初始化材料种子数据（仅当 Material 表为空时执行）
   */
  async seedMaterials(): Promise<void> {
    const count = await prisma.material.count();
    if (count > 0) return;

    await prisma.material.createMany({
      data: DEFAULT_MATERIALS,
    });
  }

  /**
   * 初始化配方种子数据（依赖材料已存在）
   */
  async seedRecipes(): Promise<void> {
    const count = await prisma.craftRecipe.count();
    if (count > 0) return;

    // 先确保材料已初始化
    await this.seedMaterials();

    // 获取材料名 → id 映射
    const materials = await prisma.material.findMany();
    const materialMap = new Map(materials.map((m) => [m.name, m.id]));

    for (const recipe of DEFAULT_RECIPES) {
      const created = await prisma.craftRecipe.create({
        data: {
          name: recipe.name,
          description: recipe.description,
          resultType: recipe.resultType,
          resultEffect: recipe.resultEffect,
          unlockLevel: recipe.unlockLevel,
        },
      });

      // 创建配方所需材料关联
      for (const mat of recipe.materials) {
        const materialId = materialMap.get(mat.name);
        if (materialId) {
          await prisma.craftRecipeMaterial.create({
            data: {
              recipeId: created.id,
              materialId,
              quantity: mat.quantity,
            },
          });
        }
      }
    }
  }

  /**
   * 做题掉落材料计算
   * 只有答对才掉落；难度决定稀有度范围，题型决定材料类别
   */
  async calculateDrop(
    userId: string,
    problemDifficulty: string,
    problemType: string,
    isCorrect: boolean
  ): Promise<Array<{ materialId: string; name: string; icon: string; rarity: string; quantity: number }>> {
    if (!isCorrect) return [];

    // 确保材料数据存在
    await this.seedMaterials();

    // 根据题型确定倾向类别
    const preferredCategories = this.getCategoriesByProblemType(problemType);

    // 根据难度确定掉落规则
    const drops: Array<{ rarity: string; count: number }> = [];
    const rand = Math.random;

    switch (problemDifficulty.toUpperCase()) {
      case 'EASY':
        drops.push({ rarity: 'COMMON', count: 1 + (rand() > 0.5 ? 1 : 0) });
        break;
      case 'MEDIUM':
        drops.push({ rarity: 'COMMON', count: 1 + (rand() > 0.5 ? 1 : 0) });
        if (rand() < 0.5) drops.push({ rarity: 'UNCOMMON', count: 1 });
        break;
      case 'HARD':
        drops.push({ rarity: 'UNCOMMON', count: 1 + (rand() > 0.5 ? 1 : 0) });
        if (rand() < 0.3) drops.push({ rarity: 'RARE', count: 1 });
        break;
      default:
        drops.push({ rarity: 'COMMON', count: 1 });
    }

    // 查询可选材料
    const allMaterials = await prisma.material.findMany();

    const result: Array<{ materialId: string; name: string; icon: string; rarity: string; quantity: number }> = [];

    for (const drop of drops) {
      // 按稀有度筛选，优先匹配题型类别
      const candidates = allMaterials.filter((m) => m.rarity === drop.rarity);
      const preferred = candidates.filter((m) => preferredCategories.includes(m.category));
      const pool = preferred.length > 0 ? preferred : candidates;

      if (pool.length === 0) continue;

      const chosen = pool[Math.floor(Math.random() * pool.length)];
      result.push({
        materialId: chosen.id,
        name: chosen.name,
        icon: chosen.icon,
        rarity: chosen.rarity,
        quantity: drop.count,
      });
    }

    // 更新用户背包（upsert 增加数量）
    for (const item of result) {
      await prisma.userMaterial.upsert({
        where: { userId_materialId: { userId, materialId: item.materialId } },
        update: { quantity: { increment: item.quantity } },
        create: { userId, materialId: item.materialId, quantity: item.quantity },
      });
    }

    return result;
  }

  /**
   * 获取用户背包所有材料
   */
  async getUserInventory(userId: string) {
    const items = await prisma.userMaterial.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { material: true },
    });

    // 按稀有度降序排列
    items.sort((a, b) => (RARITY_ORDER[b.material.rarity] || 0) - (RARITY_ORDER[a.material.rarity] || 0));

    return items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      name: item.material.name,
      description: item.material.description,
      icon: item.material.icon,
      rarity: item.material.rarity,
      category: item.material.category,
      quantity: item.quantity,
    }));
  }

  /**
   * 获取可用合成配方列表
   * 根据用户等级过滤，并附带用户当前材料持有量和是否可合成
   */
  async getAvailableRecipes(userId: string) {
    // 获取用户等级
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });
    const userLevel = user?.level || 1;

    // 查询已解锁配方
    const recipes = await prisma.craftRecipe.findMany({
      where: { unlockLevel: { lte: userLevel } },
      include: {
        materials: { include: { material: true } },
      },
    });

    // 获取用户背包
    const userMaterials = await prisma.userMaterial.findMany({
      where: { userId },
    });
    const materialQuantityMap = new Map(userMaterials.map((um) => [um.materialId, um.quantity]));

    return recipes.map((recipe) => {
      const requiredMaterials = recipe.materials.map((rm) => ({
        materialId: rm.materialId,
        name: rm.material.name,
        icon: rm.material.icon,
        rarity: rm.material.rarity,
        required: rm.quantity,
        owned: materialQuantityMap.get(rm.materialId) || 0,
      }));

      const canCraft = requiredMaterials.every((m) => m.owned >= m.required);

      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        resultType: recipe.resultType,
        resultEffect: this.parseJson(recipe.resultEffect),
        unlockLevel: recipe.unlockLevel,
        materials: requiredMaterials,
        canCraft,
      };
    });
  }

  /**
   * 执行合成
   */
  async craft(userId: string, recipeId: string) {
    // 查询配方
    const recipe = await prisma.craftRecipe.findUnique({
      where: { id: recipeId },
      include: { materials: { include: { material: true } } },
    });
    if (!recipe) throw new Error('配方不存在');

    // 校验用户等级是否解锁
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });
    if ((user?.level || 1) < recipe.unlockLevel) {
      throw new Error('等级不足，无法合成该配方');
    }

    // 校验材料是否充足
    for (const rm of recipe.materials) {
      const userMat = await prisma.userMaterial.findUnique({
        where: { userId_materialId: { userId, materialId: rm.materialId } },
      });
      if (!userMat || userMat.quantity < rm.quantity) {
        throw new Error(`材料 ${rm.material.name} 不足（需要 ${rm.quantity}，持有 ${userMat?.quantity || 0}）`);
      }
    }

    // 扣减材料
    for (const rm of recipe.materials) {
      await prisma.userMaterial.update({
        where: { userId_materialId: { userId, materialId: rm.materialId } },
        data: { quantity: { decrement: rm.quantity } },
      });
    }

    // 记录合成历史
    const resultEffect = this.parseJson(recipe.resultEffect);
    await prisma.userCraftHistory.create({
      data: {
        userId,
        recipeId: recipe.id,
        result: recipe.resultEffect,
      },
    });

    return {
      success: true,
      recipeName: recipe.name,
      resultType: recipe.resultType,
      resultEffect,
    };
  }

  /**
   * 获取用户合成历史
   */
  async getCraftHistory(userId: string) {
    const history = await prisma.userCraftHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 批量查配方名称
    const recipeIds = [...new Set(history.map((h) => h.recipeId))];
    const recipes = await prisma.craftRecipe.findMany({
      where: { id: { in: recipeIds } },
      select: { id: true, name: true, resultType: true },
    });
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    return history.map((h) => {
      const recipe = recipeMap.get(h.recipeId);
      return {
        id: h.id,
        recipeName: recipe?.name || '未知配方',
        resultType: recipe?.resultType || 'UNKNOWN',
        result: this.parseJson(h.result),
        createdAt: h.createdAt,
      };
    });
  }

  // ─── 工具方法 ───────────────────────

  /** 根据题目类型返回倾向的材料类别 */
  private getCategoriesByProblemType(type: string): string[] {
    switch (type.toUpperCase()) {
      case 'PROGRAMMING':
        return ['CODE', 'GENERAL'];
      case 'CHOICE':
      case 'FILL_BLANK':
        return ['LOGIC', 'GENERAL'];
      default:
        return ['GENERAL'];
    }
  }

  /** 安全解析 JSON 字符串 */
  private parseJson(str: string): any {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }
}

export const starpathCraftService = new StarpathCraftService();
