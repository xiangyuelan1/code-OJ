import prisma from '../lib/prisma';

/**
 * 学习者画像服务
 * 负责学习者画像的创建、更新、知识地图计算、能力雷达、薄弱点分析和题目推荐
 */

/** 标签到能力维度的映射，用于将题目标签归类到五项能力维度 */
const TAG_TO_DIMENSION: Record<string, string[]> = {
  '算法思维': ['动态规划', '贪心', '分治', '递归', '回溯', '搜索'],
  '代码实现': ['模拟', '字符串', '数组', '链表', '栈', '队列', '哈希'],
  '调试能力': ['边界', '特殊情况', '数据类型', '溢出'],
  '优化意识': ['排序', '二分', '双指针', '滑动窗口', '位运算'],
  '数学建模': ['数学', '组合', '概率', '数论', '几何', '矩阵'],
};

/** 安全解析 JSON 字符串，解析失败时返回默认值 */
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export class ProfileService {

  /** 获取或创建用户的学习者画像 */
  async getOrCreateProfile(userId: string) {
    let profile = await prisma.learnerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      profile = await prisma.learnerProfile.create({
        data: { userId },
      });
    }
    return profile;
  }

  /** 更新画像中的用户偏好设置（每日目标、学习风格） */
  async updateProfile(userId: string, data: {
    dailyGoal?: number;
    learningStyle?: string;
  }) {
    const profile = await this.getOrCreateProfile(userId);
    return await prisma.learnerProfile.update({
      where: { id: profile.id },
      data: {
        ...(data.dailyGoal !== undefined && { dailyGoal: data.dailyGoal }),
        ...(data.learningStyle && { learningStyle: data.learningStyle }),
      },
    });
  }

  /**
   * 计算知识地图：按知识树节点统计每个节点的掌握率（AC率）
   * 返回 { nodeId: 掌握率百分比 } 并持久化到画像
   */
  async calculateKnowledgeMap(userId: string) {
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            id: true,
            knowledgeTreeId: true,
            difficulty: true,
            tags: true,
          },
        },
      },
    });

    const knowledgeMap: Record<string, { total: number; accepted: number }> = {};

    for (const sub of submissions) {
      const nodeId = sub.problem.knowledgeTreeId;
      if (!nodeId) continue;

      if (!knowledgeMap[nodeId]) {
        knowledgeMap[nodeId] = { total: 0, accepted: 0 };
      }
      knowledgeMap[nodeId].total++;
      if (sub.status === 'ACCEPTED') {
        knowledgeMap[nodeId].accepted++;
      }
    }

    const result: Record<string, number> = {};
    for (const [nodeId, data] of Object.entries(knowledgeMap)) {
      result[nodeId] = data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0;
    }

    const profile = await this.getOrCreateProfile(userId);
    await prisma.learnerProfile.update({
      where: { id: profile.id },
      data: { knowledgeMap: JSON.stringify(result) },
    });

    return result;
  }

  /**
   * 计算能力雷达：将提交记录按标签映射到五项能力维度
   * 返回 { 维度名: 掌握率百分比 } 并持久化到画像
   */
  async calculateAbilityRadar(userId: string) {
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: {
          select: { id: true, tags: true, difficulty: true, type: true },
        },
      },
    });

    const dimensions: Record<string, { total: number; accepted: number }> = {
      '算法思维': { total: 0, accepted: 0 },
      '代码实现': { total: 0, accepted: 0 },
      '调试能力': { total: 0, accepted: 0 },
      '优化意识': { total: 0, accepted: 0 },
      '数学建模': { total: 0, accepted: 0 },
    };

    for (const sub of submissions) {
      const tags: string[] = safeJsonParse(sub.problem.tags || '[]', []);

      for (const [dimension, keywords] of Object.entries(TAG_TO_DIMENSION)) {
        const matched = tags.some((t: string) =>
          keywords.some(kw => t.includes(kw) || kw.includes(t))
        );
        if (matched || sub.problem.type === 'PROGRAMMING') {
          dimensions[dimension].total++;
          if (sub.status === 'ACCEPTED') {
            dimensions[dimension].accepted++;
          }
        }
      }
    }

    const radar: Record<string, number> = {};
    for (const [dim, data] of Object.entries(dimensions)) {
      radar[dim] = data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0;
    }

    const profile = await this.getOrCreateProfile(userId);
    await prisma.learnerProfile.update({
      where: { id: profile.id },
      data: { abilityRadar: JSON.stringify(radar) },
    });

    return radar;
  }

  /**
   * 计算薄弱点：统计最近50条未AC提交中各标签的出现频次
   * 返回按频次降序排列的前5个薄弱标签
   */
  async calculateWeakPoints(userId: string) {
    const submissions = await prisma.submission.findMany({
      where: { userId, status: { not: 'ACCEPTED' } },
      include: {
        problem: {
          select: { id: true, tags: true, knowledgeTreeId: true, title: true },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const tagErrors: Record<string, number> = {};
    for (const sub of submissions) {
      const tags: string[] = safeJsonParse(sub.problem.tags || '[]', []);
      for (const tag of tags) {
        tagErrors[tag] = (tagErrors[tag] || 0) + 1;
      }
    }

    const weakPoints = Object.entries(tagErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, errorCount: count }));

    const profile = await this.getOrCreateProfile(userId);
    await prisma.learnerProfile.update({
      where: { id: profile.id },
      data: { weakPoints: JSON.stringify(weakPoints) },
    });

    return weakPoints;
  }

  /**
   * 基于薄弱标签推荐题目：优先推荐包含薄弱标签的未AC题目
   * 若无薄弱点数据则按默认顺序返回
   */
  async getRecommendedProblems(userId: string, count: number = 5) {
    const profile = await this.getOrCreateProfile(userId);
    const weakPoints: { tag: string; errorCount: number }[] = safeJsonParse(profile.weakPoints || '[]', []);

    const submittedProblemIds = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { problemId: true },
    });
    const solvedIds = new Set(submittedProblemIds.map(s => s.problemId));

    let problems = await prisma.problem.findMany({
      where: {
        id: { notIn: Array.from(solvedIds) },
        type: 'PROGRAMMING',
      },
      select: { id: true, title: true, difficulty: true, tags: true },
      take: count * 4,
    });

    if (weakPoints.length > 0) {
      const weakTags = weakPoints.map(wp => wp.tag);
      problems = problems.sort((a, b) => {
        const aScore = safeJsonParse<string[]>(a.tags || '[]', [])
          .filter((tag: string) => weakTags.includes(tag)).length;
        const bScore = safeJsonParse<string[]>(b.tags || '[]', [])
          .filter((tag: string) => weakTags.includes(tag)).length;
        return bScore - aScore;
      });
    }

    return problems.slice(0, count);
  }

  /**
   * 更新连续学习天数（streak）
   * - 当天首次活跃：streak 不变
   * - 昨天活跃过：streak + 1
   * - 间隔超过1天：streak 重置为 1
   */
  async updateStreak(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const lastActive = new Date(profile.lastActiveAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = profile.streakDays;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }

    await prisma.learnerProfile.update({
      where: { id: profile.id },
      data: {
        streakDays: newStreak,
        lastActiveAt: now,
      },
    });

    return newStreak;
  }

  /** 获取完整画像数据：包含画像基础信息、统计数据、知识地图、能力雷达、薄弱点和推荐题目 */
  async getFullProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);

    const [knowledgeMap, abilityRadar, weakPoints, recommendedProblems] = await Promise.all([
      this.calculateKnowledgeMap(userId),
      this.calculateAbilityRadar(userId),
      this.calculateWeakPoints(userId),
      this.getRecommendedProblems(userId),
    ]);

    const totalSubmissions = await prisma.submission.count({ where: { userId } });
    const acceptedSubmissions = await prisma.submission.count({ where: { userId, status: 'ACCEPTED' } });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, level: true, rank: true },
    });

    return {
      profile: {
        ...profile,
        knowledgeMap: safeJsonParse(profile.knowledgeMap, {}),
        abilityRadar: safeJsonParse(profile.abilityRadar, {}),
        weakPoints: safeJsonParse(profile.weakPoints, []),
        currentPath: safeJsonParse(profile.currentPath, {}),
      },
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate: totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0,
        points: user?.points || 0,
        level: user?.level || 1,
        rank: user?.rank || 0,
      },
      knowledgeMap,
      abilityRadar,
      weakPoints,
      recommendedProblems,
    };
  }
}

export const profileService = new ProfileService();
