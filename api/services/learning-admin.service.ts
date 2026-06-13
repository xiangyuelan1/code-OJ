import prisma from '../lib/prisma';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export class LearningAdminService {
  async getLearningModuleStats() {
    const [regionCount, planetCount, interviewTemplates, bugScenarios] = await Promise.all([
      prisma.starRegion.count(),
      prisma.starPlanet.count(),
      prisma.interviewTemplate.count(),
      prisma.bugScenario.count(),
    ]);

    const totalExplorers = await prisma.userPlanetProgress.groupBy({
      by: ['userId'],
      _count: true,
    });

    return {
      starPath: { regionCount, planetCount, totalExplorers: totalExplorers.length },
      interview: { templateCount: interviewTemplates },
      bugHunter: { scenarioCount: bugScenarios },
    };
  }

  async manageStarRegion(data: {
    id?: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
  }) {
    if (data.id) {
      return prisma.starRegion.update({
        where: { id: data.id },
        data: {
          name: data.name,
          ...(data.description !== undefined && { description: data.description }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.order !== undefined && { order: data.order }),
        },
      });
    }
    return prisma.starRegion.create({
      data: {
        name: data.name,
        description: data.description || '',
        icon: data.icon || '⭐',
        color: data.color || '#4FC3F7',
        order: data.order ?? 0,
      },
    });
  }

  async deleteStarRegion(id: string) {
    const planets = await prisma.starPlanet.findMany({
      where: { regionId: id },
      select: { id: true },
    });
    const planetIds = planets.map(p => p.id);
    await prisma.userPlanetProgress.deleteMany({
      where: { planetId: { in: planetIds } },
    });
    await prisma.starPlanet.deleteMany({ where: { regionId: id } });
    return prisma.starRegion.delete({ where: { id } });
  }

  async manageStarPlanet(data: {
    id?: string;
    regionId: string;
    name: string;
    description?: string;
    difficulty?: string;
    tags?: string[];
    order?: number;
    posX?: number;
    posY?: number;
    problemIds?: string[];
  }) {
    if (data.id) {
      return prisma.starPlanet.update({
        where: { id: data.id },
        data: {
          regionId: data.regionId,
          name: data.name,
          ...(data.description !== undefined && { description: data.description }),
          ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
          ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.posX !== undefined && { posX: data.posX }),
          ...(data.posY !== undefined && { posY: data.posY }),
          ...(data.problemIds !== undefined && { problemIds: JSON.stringify(data.problemIds) }),
        },
      });
    }
    return prisma.starPlanet.create({
      data: {
        regionId: data.regionId,
        name: data.name,
        description: data.description || '',
        difficulty: data.difficulty || 'MEDIUM',
        tags: JSON.stringify(data.tags || []),
        order: data.order ?? 0,
        posX: data.posX ?? 0.5,
        posY: data.posY ?? 0.5,
        problemIds: JSON.stringify(data.problemIds || []),
      },
    });
  }

  async deleteStarPlanet(id: string) {
    await prisma.userPlanetProgress.deleteMany({ where: { planetId: id } });
    return prisma.starPlanet.delete({ where: { id } });
  }

  async assignProblemsToPlanet(planetId: string, problemIds: string[]) {
    return prisma.starPlanet.update({
      where: { id: planetId },
      data: { problemIds: JSON.stringify(problemIds) },
    });
  }

  async getInterviewTemplates() {
    return prisma.interviewTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInterviewTemplate(data: {
    id?: string;
    role: string;
    difficulty: string;
    question: string;
    expectedTopics: string[];
    hints: string[];
    correctAnswer?: string;
  }) {
    if (data.id) {
      return prisma.interviewTemplate.update({
        where: { id: data.id },
        data: {
          role: data.role,
          difficulty: data.difficulty,
          question: data.question,
          expectedTopics: JSON.stringify(data.expectedTopics),
          hints: JSON.stringify(data.hints),
          ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        },
      });
    }
    return prisma.interviewTemplate.create({
      data: {
        role: data.role,
        difficulty: data.difficulty,
        question: data.question,
        expectedTopics: JSON.stringify(data.expectedTopics),
        hints: JSON.stringify(data.hints),
        correctAnswer: data.correctAnswer || '',
      },
    });
  }

  async deleteInterviewTemplate(id: string) {
    return prisma.interviewTemplate.delete({ where: { id } });
  }

  async getBugScenarios() {
    return prisma.bugScenario.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBugScenario(data: {
    id?: string;
    topic: string;
    difficulty: string;
    buggyCode: string;
    correctCode: string;
    hints: string[];
    bugExplanations: string[];
    language?: string;
  }) {
    if (data.id) {
      return prisma.bugScenario.update({
        where: { id: data.id },
        data: {
          topic: data.topic,
          difficulty: data.difficulty,
          buggyCode: data.buggyCode,
          correctCode: data.correctCode,
          hints: JSON.stringify(data.hints),
          bugExplanations: JSON.stringify(data.bugExplanations),
          ...(data.language !== undefined && { language: data.language }),
        },
      });
    }
    return prisma.bugScenario.create({
      data: {
        topic: data.topic,
        difficulty: data.difficulty,
        buggyCode: data.buggyCode,
        correctCode: data.correctCode,
        hints: JSON.stringify(data.hints),
        bugExplanations: JSON.stringify(data.bugExplanations),
        language: data.language || 'python',
      },
    });
  }

  async deleteBugScenario(id: string) {
    return prisma.bugScenario.delete({ where: { id } });
  }

  /* ── 学习模块可见性配置 ── */

  /** 模块配置存储在 SystemConfig 表中，key 固定为 'learning_modules_config' */
  private readonly MODULE_CONFIG_KEY = 'learning_modules_config';

  /** 默认模块列表定义（所有可用模块的元数据） */
  private getDefaultModules(): LearningModuleConfig[] {
    return [
      { key: 'starpath', name: '编程星途', description: '探索编程宇宙，在星途中发现知识的奥秘', icon: 'Sparkles', route: '/starpath', enabled: true, order: 0 },
      { key: 'solved', name: '已解决题目', description: '查看你成功通过的所有题目，回顾成长轨迹', icon: 'Trophy', route: '/solved', enabled: true, order: 1 },
      { key: 'interview', name: 'AI面试模拟', description: 'AI模拟真实面试场景，提升技术面试能力', icon: 'Briefcase', route: '/interview', enabled: true, order: 2 },
      { key: 'bughunter', name: 'AI猎虫挑战', description: '找出代码中的Bug，锻炼调试能力', icon: 'Bug', route: '/bug-hunter', enabled: true, order: 3 },
      { key: 'minigame_code_quiz', name: '快速代码挑战', description: '代码猜谜，预测输出结果', icon: 'Zap', route: '', enabled: true, order: 10, category: 'minigame' },
      { key: 'minigame_daily_quiz', name: '每日一题', description: '每天一道编程选择题', icon: 'Target', route: '', enabled: true, order: 11, category: 'minigame' },
      { key: 'minigame_flash_card', name: '知识闪卡', description: '快速复习编程核心概念', icon: 'Lightbulb', route: '', enabled: true, order: 12, category: 'minigame' },
      { key: 'minigame_typing', name: '代码打字速度', description: '提升代码输入速度与准确率', icon: 'Code', route: '', enabled: true, order: 13, category: 'minigame' },
    ];
  }

  /** 获取当前模块配置（合并默认值与已保存配置） */
  async getLearningModules(): Promise<LearningModuleConfig[]> {
    const record = await prisma.systemConfig.findUnique({
      where: { key: this.MODULE_CONFIG_KEY },
    });

    const defaults = this.getDefaultModules();
    if (!record) return defaults;

    const saved: Partial<LearningModuleConfig>[] = safeJsonParse(record.value, []);
    // 以 key 为索引合并：保存的配置覆盖默认值
    return defaults.map(mod => {
      const override = saved.find(s => s.key === mod.key);
      return override ? { ...mod, ...override } : mod;
    });
  }

  /** 更新模块配置（仅保存变更的字段） */
  async updateLearningModules(modules: Partial<LearningModuleConfig>[]): Promise<LearningModuleConfig[]> {
    const value = JSON.stringify(modules);
    await prisma.systemConfig.upsert({
      where: { key: this.MODULE_CONFIG_KEY },
      update: { value },
      create: { key: this.MODULE_CONFIG_KEY, value },
    });
    return this.getLearningModules();
  }
}

/** 学习模块配置类型 */
export interface LearningModuleConfig {
  key: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  enabled: boolean;
  order: number;
  /** 分类：'minigame' 表示小游戏模块，undefined 表示主模块 */
  category?: string;
}

export const learningAdminService = new LearningAdminService();
