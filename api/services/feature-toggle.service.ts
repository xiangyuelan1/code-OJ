import prisma from '../lib/prisma';

const DEFAULT_FEATURES = [
  { featureKey: 'problems', featureName: '题库', description: '题目列表与详情', category: 'core', enabled: true, visible: true, order: 1 },
  { featureKey: 'match', featureName: '对战', description: 'PK对战模式', category: 'core', enabled: true, visible: true, order: 2 },
  { featureKey: 'exams', featureName: '考试', description: '在线考试系统', category: 'core', enabled: true, visible: true, order: 3 },
  { featureKey: 'discussions', featureName: '社区', description: '讨论区与交流', category: 'core', enabled: true, visible: true, order: 4 },
  { featureKey: 'learning', featureName: '多元学习', description: '多元学习入口', category: 'learning', enabled: true, visible: true, order: 5 },
  { featureKey: 'starpath', featureName: '编程星途', description: '星途探索学习', category: 'learning', enabled: true, visible: true, order: 6 },
  { featureKey: 'interview', featureName: 'AI面试', description: 'AI面试模拟器', category: 'learning', enabled: true, visible: true, order: 7 },
  { featureKey: 'bug-hunter', featureName: 'AI猎虫', description: 'Bug猎手挑战', category: 'learning', enabled: true, visible: true, order: 8 },
  { featureKey: 'daily-challenge', featureName: '每日一题', description: '每日挑战题目', category: 'core', enabled: true, visible: true, order: 9 },
  { featureKey: 'achievements', featureName: '成就', description: '成就系统', category: 'core', enabled: true, visible: true, order: 10 },
  { featureKey: 'ai-companion', featureName: 'AI学伴', description: 'AI学习伙伴', category: 'ai', enabled: true, visible: true, order: 11 },
  { featureKey: 'ai-hint', featureName: 'AI提示', description: 'AI解题提示', category: 'ai', enabled: true, visible: true, order: 12 },
  { featureKey: 'ai-judge', featureName: 'AI判题', description: 'AI预测判题结果', category: 'ai', enabled: true, visible: true, order: 13 },
];

export class FeatureToggleService {
  async getAllFeatures() {
    return prisma.systemFeature.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }

  async toggleFeature(featureKey: string, enabled: boolean) {
    return prisma.systemFeature.update({
      where: { featureKey },
      data: { enabled },
    });
  }

  async toggleFeatureVisibility(featureKey: string, visible: boolean) {
    return prisma.systemFeature.update({
      where: { featureKey },
      data: { visible },
    });
  }

  async updateFeature(featureKey: string, data: {
    enabled?: boolean;
    visible?: boolean;
    featureName?: string;
    description?: string;
    order?: number;
  }) {
    return prisma.systemFeature.update({
      where: { featureKey },
      data: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.visible !== undefined && { visible: data.visible }),
        ...(data.featureName !== undefined && { featureName: data.featureName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async initializeDefaultFeatures() {
    const existing = await prisma.systemFeature.findMany({
      select: { featureKey: true },
    });
    const existingKeys = new Set(existing.map(e => e.featureKey));

    const toCreate = DEFAULT_FEATURES.filter(f => !existingKeys.has(f.featureKey));

    if (toCreate.length === 0) {
      return { created: 0, total: existing.length };
    }

    await prisma.systemFeature.createMany({
      data: toCreate,
    });

    return { created: toCreate.length, total: existing.length + toCreate.length };
  }

  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const feature = await prisma.systemFeature.findUnique({
      where: { featureKey },
      select: { enabled: true },
    });
    /* 未配置的功能默认启用 */
    if (!feature) return true;
    return feature.enabled;
  }

  async getVisibleFeatures() {
    return prisma.systemFeature.findMany({
      where: { enabled: true, visible: true },
      select: { featureKey: true, featureName: true, category: true, order: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }
}

export const featureToggleService = new FeatureToggleService();
