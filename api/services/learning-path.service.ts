import prisma from '../lib/prisma';

/** 安全解析 JSON 字符串，解析失败时返回默认值 */
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** 学习路径步骤类型 */
type StepType = 'REGION' | 'PLANET' | 'PROBLEM';

/** 生成路径的请求参数 */
interface GeneratePathParams {
  title?: string;
  description?: string;
  difficulty?: string;
  focusAreas?: string[];
  maxSteps?: number;
}

/** 成就类型定义：唯一标识 + 展示信息 */
interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  icon: string;
}

/** 学习路径模块的全部成就定义 */
const LEARNING_ACHIEVEMENTS: AchievementDefinition[] = [
  { type: 'FIRST_PLANET', title: '星际初探', description: '探索了第一颗星球', icon: '🪐' },
  { type: 'REGION_MASTER', title: '星域霸主', description: '掌握了一个星域的所有星球', icon: '👑' },
  { type: 'STREAK_7', title: '七日连航', description: '连续学习7天', icon: '🔥' },
  { type: 'STREAK_30', title: '月度远征', description: '连续学习30天', icon: '🌟' },
  { type: 'EXPLORER_10', title: '十星探险家', description: '探索了10颗星球', icon: '🔭' },
  { type: 'MASTER_5', title: '五星征服者', description: '掌握了5颗星球', icon: '⚔️' },
  { type: 'PATH_COMPLETE', title: '征途完成', description: '完成了一条学习路径', icon: '🏁' },
  { type: 'DAILY_7', title: '每日挑战者', description: '完成了7次每日挑战', icon: '📅' },
  { type: 'SUBMISSION_100', title: '百题斩', description: '提交了100次代码', icon: '💻' },
  { type: 'PERFECT_EXAM', title: '完美答卷', description: '考试获得满分', icon: '💯' },
];

/** 根据成就类型查找定义，找不到则返回兜底信息 */
function getAchievementDef(type: string): AchievementDefinition {
  return LEARNING_ACHIEVEMENTS.find(a => a.type === type) || {
    type,
    title: type,
    description: '',
    icon: '🏆',
  };
}

export class LearningPathService {

  // ─── 学习路径生成与管理 ───────────────────────────────────────

  /**
   * 生成个性化学习路径
   * 基于用户薄弱点、已掌握星球和未探索区域，使用规则引擎构建步骤序列
   * 每条步骤对应一个 REGION / PLANET / PROBLEM，按渐进难度排列
   */
  async generatePath(userId: string, params: GeneratePathParams) {
    const maxSteps = params.maxSteps || 10;

    /* 收集用户画像中的薄弱点 */
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    const weakPoints: { tag: string; errorCount: number }[] = safeJsonParse(
      profile?.weakPoints || '[]', [],
    );

    /* 收集用户星球进度 */
    const planetProgresses = await prisma.userPlanetProgress.findMany({
      where: { userId },
    });
    const masteredPlanetIds = new Set(
      planetProgresses.filter(p => p.status === 'MASTERED').map(p => p.planetId),
    );
    const exploringPlanetIds = new Set(
      planetProgresses.filter(p => p.status === 'EXPLORING').map(p => p.planetId),
    );

    /* 收集已通过的题目 */
    const acceptedSubmissions = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { problemId: true },
    });
    const solvedProblemIds = new Set(acceptedSubmissions.map(s => s.problemId));

    /* 获取所有星域和星球 */
    const regions = await prisma.starRegion.findMany({
      orderBy: { order: 'asc' },
      include: {
        planets: { orderBy: { order: 'asc' } },
      },
    });

    /* 按薄弱点标签匹配星域优先级 */
    const weakTags = weakPoints.map(w => w.tag);
    const regionPriority = new Map<string, number>();
    for (const region of regions) {
      let priority = 0;
      for (const planet of region.planets) {
        const tags: string[] = safeJsonParse(planet.tags, []);
        for (const tag of tags) {
          if (weakTags.some(wt => tag.includes(wt) || wt.includes(tag))) {
            priority += 2;
          }
        }
        if (exploringPlanetIds.has(planet.id)) priority += 1;
      }
      regionPriority.set(region.id, priority);
    }

    /* 按优先级降序排列星域 */
    const sortedRegions = [...regions].sort(
      (a, b) => (regionPriority.get(b.id) || 0) - (regionPriority.get(a.id) || 0),
    );

    /* 构建步骤序列 */
    const steps: { type: StepType; referenceId: string; title: string; description: string }[] = [];
    const collectedRegionIds: string[] = [];
    const collectedPlanetIds: string[] = [];
    const collectedProblemIds: string[] = [];

    for (const region of sortedRegions) {
      if (steps.length >= maxSteps) break;

      /* 检查该星域是否还有未掌握的星球 */
      const unmasteredPlanets = region.planets.filter(p => !masteredPlanetIds.has(p.id));
      if (unmasteredPlanets.length === 0) continue;

      /* 添加星域步骤 */
      steps.push({
        type: 'REGION',
        referenceId: region.id,
        title: `探索星域: ${region.name}`,
        description: region.description || `进入${region.name}，开始新的学习旅程`,
      });
      collectedRegionIds.push(region.id);

      for (const planet of unmasteredPlanets) {
        if (steps.length >= maxSteps) break;

        /* 添加星球步骤 */
        steps.push({
          type: 'PLANET',
          referenceId: planet.id,
          title: `挑战星球: ${planet.name}`,
          description: planet.description || `攻克${planet.name}的挑战`,
        });
        collectedPlanetIds.push(planet.id);

        /* 添加星球中未通过的题目步骤 */
        const planetProblemIds: string[] = safeJsonParse(planet.problemIds, []);
        const unsolvedProblemIds = planetProblemIds.filter(pid => !solvedProblemIds.has(pid));

        for (const problemId of unsolvedProblemIds) {
          if (steps.length >= maxSteps) break;

          const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            select: { title: true, difficulty: true },
          });
          if (!problem) continue;

          steps.push({
            type: 'PROBLEM',
            referenceId: problemId,
            title: `解题: ${problem.title}`,
            description: `难度: ${problem.difficulty}`,
          });
          collectedProblemIds.push(problemId);
        }
      }
    }

    /* 如果没有生成任何步骤，创建一个默认引导路径 */
    if (steps.length === 0) {
      const firstRegion = regions[0];
      if (firstRegion) {
        steps.push({
          type: 'REGION',
          referenceId: firstRegion.id,
          title: `探索星域: ${firstRegion.name}`,
          description: firstRegion.description || '开始你的学习旅程',
        });
        collectedRegionIds.push(firstRegion.id);

        for (const planet of firstRegion.planets.slice(0, 3)) {
          steps.push({
            type: 'PLANET',
            referenceId: planet.id,
            title: `挑战星球: ${planet.name}`,
            description: planet.description || '',
          });
          collectedPlanetIds.push(planet.id);
        }
      }
    }

    /* 确定路径难度 */
    const difficulty = params.difficulty || (
      weakPoints.length > 3 ? 'HARD' : weakPoints.length > 0 ? 'MEDIUM' : 'EASY'
    );

    /* 创建学习路径及其步骤 */
    const path = await prisma.learningPath.create({
      data: {
        userId,
        title: params.title || this.buildPathTitle(weakTags, difficulty),
        description: params.description || this.buildPathDescription(weakTags, steps.length),
        difficulty,
        status: 'ACTIVE',
        totalSteps: steps.length,
        completedSteps: 0,
        regionIds: JSON.stringify(collectedRegionIds),
        planetIds: JSON.stringify(collectedPlanetIds),
        problemIds: JSON.stringify(collectedProblemIds),
        generatedBy: weakPoints.length > 0 ? 'AI' : 'RULE',
        steps: {
          create: steps.map((step, index) => ({
            order: index,
            type: step.type,
            referenceId: step.referenceId,
            title: step.title,
            description: step.description,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    return path;
  }

  /** 获取用户的所有学习路径 */
  async getUserPaths(userId: string) {
    const paths = await prisma.learningPath.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { steps: true } },
      },
    });

    return paths.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      status: p.status,
      totalSteps: p.totalSteps,
      completedSteps: p.completedSteps,
      progress: p.totalSteps > 0 ? Math.round((p.completedSteps / p.totalSteps) * 100) : 0,
      generatedBy: p.generatedBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /** 获取路径详情，包含所有步骤和进度 */
  async getPathDetail(pathId: string, userId: string) {
    const path = await prisma.learningPath.findFirst({
      where: { id: pathId, userId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!path) return null;

    return {
      id: path.id,
      title: path.title,
      description: path.description,
      difficulty: path.difficulty,
      status: path.status,
      totalSteps: path.totalSteps,
      completedSteps: path.completedSteps,
      progress: path.totalSteps > 0 ? Math.round((path.completedSteps / path.totalSteps) * 100) : 0,
      regionIds: safeJsonParse<string[]>(path.regionIds, []),
      planetIds: safeJsonParse<string[]>(path.planetIds, []),
      problemIds: safeJsonParse<string[]>(path.problemIds, []),
      generatedBy: path.generatedBy,
      steps: path.steps.map(step => ({
        id: step.id,
        order: step.order,
        type: step.type,
        referenceId: step.referenceId,
        title: step.title,
        description: step.description,
        completed: step.completed,
        completedAt: step.completedAt,
      })),
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    };
  }

  /**
   * 标记步骤完成状态
   * 完成时自动递增 completedSteps，若所有步骤完成则更新路径状态为 COMPLETED
   */
  async updateStepStatus(pathId: string, stepId: string, completed: boolean) {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: { steps: true },
    });

    if (!path) throw new Error('学习路径不存在');

    const step = path.steps.find(s => s.id === stepId);
    if (!step) throw new Error('步骤不存在');

    /* 如果状态没有变化，直接返回 */
    if (step.completed === completed) {
      return { step, completedSteps: path.completedSteps, pathStatus: path.status };
    }

    /* 更新步骤状态 */
    const updatedStep = await prisma.learningPathStep.update({
      where: { id: stepId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    /* 重新计算完成步骤数 */
    const completedSteps = path.steps.filter(s =>
      s.id === stepId ? completed : s.completed,
    ).length;

    /* 判断路径是否全部完成 */
    const pathStatus = completedSteps === path.totalSteps ? 'COMPLETED' : path.status;

    await prisma.learningPath.update({
      where: { id: pathId },
      data: { completedSteps, status: pathStatus },
    });

    /* 路径完成时触发成就检查 */
    if (pathStatus === 'COMPLETED') {
      const userId = path.userId;
      await this.awardSingleAchievement(userId, 'PATH_COMPLETE');
    }

    return { step: updatedStep, completedSteps, pathStatus };
  }

  /** 删除学习路径（级联删除步骤） */
  async deletePath(pathId: string, userId: string) {
    const path = await prisma.learningPath.findFirst({
      where: { id: pathId, userId },
    });

    if (!path) throw new Error('学习路径不存在或无权删除');

    await prisma.learningPath.delete({ where: { id: pathId } });

    return { deleted: true };
  }

  /**
   * 刷新学习路径：基于当前进度重新生成步骤
   * 保留已完成步骤，追加新的未完成步骤
   */
  async refreshPath(pathId: string, userId: string) {
    const existingPath = await prisma.learningPath.findFirst({
      where: { id: pathId, userId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!existingPath) throw new Error('学习路径不存在');

    /* 收集已完成步骤的引用ID，避免重复生成 */
    const completedRefs = new Set(
      existingPath.steps.filter(s => s.completed).map(s => s.referenceId),
    );

    /* 重新生成步骤 */
    const newSteps = await this.buildStepsFromProgress(userId, completedRefs, 10);

    /* 删除旧的未完成步骤 */
    await prisma.learningPathStep.deleteMany({
      where: { pathId, completed: false },
    });

    /* 计算新的步骤总数 */
    const completedCount = existingPath.steps.filter(s => s.completed).length;
    const maxOrder = existingPath.steps
      .filter(s => s.completed)
      .reduce((max, s) => Math.max(max, s.order), -1);

    /* 创建新的未完成步骤 */
    for (let i = 0; i < newSteps.length; i++) {
      await prisma.learningPathStep.create({
        data: {
          pathId,
          order: maxOrder + 1 + i,
          type: newSteps[i].type,
          referenceId: newSteps[i].referenceId,
          title: newSteps[i].title,
          description: newSteps[i].description,
        },
      });
    }

    const totalSteps = completedCount + newSteps.length;

    await prisma.learningPath.update({
      where: { id: pathId },
      data: { totalSteps, status: 'ACTIVE' },
    });

    return await this.getPathDetail(pathId, userId);
  }

  // ─── 成就系统 ───────────────────────────────────────────────

  /**
   * 检查并授予成就
   * 遍历所有学习成就定义，逐一判断用户是否满足条件
   * 已获得的成就（userId + type 唯一约束）会自动跳过
   */
  async checkAndAwardAchievements(userId: string): Promise<string[]> {
    const awarded: string[] = [];

    /* 获取用户已获得的学习成就类型集合 */
    const existing = await prisma.learningAchievement.findMany({
      where: { userId },
      select: { type: true },
    });
    const earnedTypes = new Set(existing.map(e => e.type));

    /* 逐项检查 */
    for (const def of LEARNING_ACHIEVEMENTS) {
      if (earnedTypes.has(def.type)) continue;

      const eligible = await this.checkAchievementEligibility(userId, def.type);
      if (eligible) {
        await this.awardSingleAchievement(userId, def.type);
        awarded.push(def.type);
      }
    }

    return awarded;
  }

  /** 获取用户的所有学习成就 */
  async getUserAchievements(userId: string) {
    return await prisma.learningAchievement.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });
  }

  // ─── 学习统计 ───────────────────────────────────────────────

  /**
   * 获取综合学习统计
   * 包含连续学习天数、星球进度、提交统计、时间分布等
   */
  async getLearningStats(userId: string) {
    /* 基础画像数据 */
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    const streakDays = profile?.streakDays ?? 0;
    const lastActiveAt = profile?.lastActiveAt ?? null;

    /* 星球进度统计 */
    const planetProgresses = await prisma.userPlanetProgress.findMany({
      where: { userId },
    });
    const exploredCount = planetProgresses.filter(p => p.status !== 'UNEXPLORED').length;
    const masteredCount = planetProgresses.filter(p => p.status === 'MASTERED').length;

    /* 提交统计 */
    const totalSubmissions = await prisma.submission.count({ where: { userId } });
    const acceptedSubmissions = await prisma.submission.count({
      where: { userId, status: 'ACCEPTED' },
    });

    /* 每日挑战统计 */
    const dailyCompleted = await prisma.userDailyChallenge.count({
      where: { userId, solved: true },
    });

    /* 考试统计 */
    const examAttempts = await prisma.examAttempt.count({
      where: { userId, status: 'GRADED' },
    });

    /* 学习路径统计 */
    const pathStats = await prisma.learningPath.aggregate({
      where: { userId },
      _count: true,
      _sum: { completedSteps: true, totalSteps: true },
    });
    const completedPaths = await prisma.learningPath.count({
      where: { userId, status: 'COMPLETED' },
    });

    /* 近30天提交时间分布（按天聚合） */
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = await prisma.submission.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyActivity = this.aggregateDailyActivity(recentSubmissions);

    /* 能力维度分布（基于题目标签） */
    const abilityRadar = safeJsonParse<Record<string, number>>(
      profile?.abilityRadar || '{}', {},
    );

    return {
      streak: {
        current: streakDays,
        lastActiveAt,
      },
      planetProgress: {
        explored: exploredCount,
        mastered: masteredCount,
        total: await prisma.starPlanet.count(),
      },
      submissions: {
        total: totalSubmissions,
        accepted: acceptedSubmissions,
        acceptanceRate: totalSubmissions > 0
          ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
          : 0,
      },
      dailyChallenges: {
        completed: dailyCompleted,
      },
      exams: {
        attempts: examAttempts,
      },
      paths: {
        total: pathStats._count,
        completed: completedPaths,
        totalSteps: pathStats._sum.totalSteps ?? 0,
        completedSteps: pathStats._sum.completedSteps ?? 0,
      },
      dailyActivity,
      abilityRadar,
    };
  }

  // ─── 私有辅助方法 ───────────────────────────────────────────

  /**
   * 根据当前进度构建新步骤
   * 排除已完成的引用ID，按薄弱点优先级排列
   */
  private async buildStepsFromProgress(
    userId: string,
    excludeRefs: Set<string>,
    maxSteps: number,
  ): Promise<{ type: StepType; referenceId: string; title: string; description: string }[]> {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    const weakPoints: { tag: string; errorCount: number }[] = safeJsonParse(
      profile?.weakPoints || '[]', [],
    );
    const weakTags = weakPoints.map(w => w.tag);

    const planetProgresses = await prisma.userPlanetProgress.findMany({
      where: { userId },
    });
    const masteredPlanetIds = new Set(
      planetProgresses.filter(p => p.status === 'MASTERED').map(p => p.planetId),
    );

    const acceptedSubmissions = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { problemId: true },
    });
    const solvedProblemIds = new Set(acceptedSubmissions.map(s => s.problemId));

    const regions = await prisma.starRegion.findMany({
      orderBy: { order: 'asc' },
      include: { planets: { orderBy: { order: 'asc' } } },
    });

    const steps: { type: StepType; referenceId: string; title: string; description: string }[] = [];

    for (const region of regions) {
      if (steps.length >= maxSteps) break;

      const unmasteredPlanets = region.planets.filter(
        p => !masteredPlanetIds.has(p.id) && !excludeRefs.has(p.id),
      );
      if (unmasteredPlanets.length === 0) continue;

      if (!excludeRefs.has(region.id)) {
        steps.push({
          type: 'REGION',
          referenceId: region.id,
          title: `探索星域: ${region.name}`,
          description: region.description || `进入${region.name}，开始新的学习旅程`,
        });
      }

      for (const planet of unmasteredPlanets) {
        if (steps.length >= maxSteps) break;

        steps.push({
          type: 'PLANET',
          referenceId: planet.id,
          title: `挑战星球: ${planet.name}`,
          description: planet.description || `攻克${planet.name}的挑战`,
        });

        const planetProblemIds: string[] = safeJsonParse(planet.problemIds, []);
        const unsolved = planetProblemIds.filter(
          pid => !solvedProblemIds.has(pid) && !excludeRefs.has(pid),
        );

        for (const problemId of unsolved) {
          if (steps.length >= maxSteps) break;

          const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            select: { title: true, difficulty: true },
          });
          if (!problem) continue;

          steps.push({
            type: 'PROBLEM',
            referenceId: problemId,
            title: `解题: ${problem.title}`,
            description: `难度: ${problem.difficulty}`,
          });
        }
      }
    }

    return steps;
  }

  /** 根据薄弱点和难度生成路径标题 */
  private buildPathTitle(weakTags: string[], difficulty: string): string {
    const diffLabel: Record<string, string> = { EASY: '入门', MEDIUM: '进阶', HARD: '挑战' };
    const label = diffLabel[difficulty] || '进阶';

    if (weakTags.length > 0) {
      const topWeak = weakTags.slice(0, 2).join('·');
      return `${label}之路: ${topWeak}突破`;
    }
    return `${label}学习路径`;
  }

  /** 根据薄弱点和步骤数生成路径描述 */
  private buildPathDescription(weakTags: string[], stepCount: number): string {
    if (weakTags.length > 0) {
      return `针对薄弱点 ${weakTags.slice(0, 3).join('、')} 的${stepCount}步强化学习路径`;
    }
    return `包含${stepCount}个步骤的系统性学习路径`;
  }

  /**
   * 判断用户是否满足某个成就的获得条件
   * 每种成就类型对应不同的数据查询逻辑
   */
  private async checkAchievementEligibility(userId: string, type: string): Promise<boolean> {
    switch (type) {
      case 'FIRST_PLANET': {
        const count = await prisma.userPlanetProgress.count({
          where: { userId, status: { not: 'UNEXPLORED' } },
        });
        return count >= 1;
      }

      case 'REGION_MASTER': {
        const regions = await prisma.starRegion.findMany({
          include: { planets: { select: { id: true } } },
        });
        for (const region of regions) {
          if (region.planets.length === 0) continue;
          const masteredCount = await prisma.userPlanetProgress.count({
            where: {
              userId,
              planetId: { in: region.planets.map(p => p.id) },
              status: 'MASTERED',
            },
          });
          if (masteredCount === region.planets.length) return true;
        }
        return false;
      }

      case 'STREAK_7': {
        const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
        return (profile?.streakDays ?? 0) >= 7;
      }

      case 'STREAK_30': {
        const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
        return (profile?.streakDays ?? 0) >= 30;
      }

      case 'EXPLORER_10': {
        const count = await prisma.userPlanetProgress.count({
          where: { userId, status: { not: 'UNEXPLORED' } },
        });
        return count >= 10;
      }

      case 'MASTER_5': {
        const count = await prisma.userPlanetProgress.count({
          where: { userId, status: 'MASTERED' },
        });
        return count >= 5;
      }

      case 'PATH_COMPLETE': {
        const count = await prisma.learningPath.count({
          where: { userId, status: 'COMPLETED' },
        });
        return count >= 1;
      }

      case 'DAILY_7': {
        const count = await prisma.userDailyChallenge.count({
          where: { userId, solved: true },
        });
        return count >= 7;
      }

      case 'SUBMISSION_100': {
        const count = await prisma.submission.count({ where: { userId } });
        return count >= 100;
      }

      case 'PERFECT_EXAM': {
        const attempt = await prisma.examAttempt.findFirst({
          where: { userId, status: 'GRADED', score: 100 },
        });
        return attempt !== null;
      }

      default:
        return false;
    }
  }

  /**
   * 授予单个成就
   * 利用 userId + type 唯一约束保证幂等性，重复授予会被数据库拒绝
   */
  private async awardSingleAchievement(userId: string, type: string): Promise<void> {
    const def = getAchievementDef(type);

    try {
      await prisma.learningAchievement.create({
        data: {
          userId,
          type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
        },
      });
    } catch {
      /* 唯一约束冲突说明已获得，安全忽略 */
    }
  }

  /**
   * 将提交记录按天聚合为活动热力图数据
   * 返回最近30天每天的总提交数和通过数
   */
  private aggregateDailyActivity(
    submissions: { createdAt: Date; status: string }[],
  ): Record<string, { total: number; accepted: number }> {
    const result: Record<string, { total: number; accepted: number }> = {};

    for (const sub of submissions) {
      const day = sub.createdAt.toISOString().slice(0, 10);
      if (!result[day]) {
        result[day] = { total: 0, accepted: 0 };
      }
      result[day].total++;
      if (sub.status === 'ACCEPTED') {
        result[day].accepted++;
      }
    }

    return result;
  }
}

export const learningPathService = new LearningPathService();
