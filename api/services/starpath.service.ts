import prisma from '../lib/prisma';
import { aiService } from './ai.service';

/** 安全解析 JSON 字符串，解析失败时返回默认值 */
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** 星球进度状态枚举 */
const PLANET_STATUS = {
  UNEXPLORED: 'UNEXPLORED',
  EXPLORING: 'EXPLORING',
  MASTERED: 'MASTERED',
} as const;

/** 默认星域配置：名称、图标、颜色、关联知识树关键词 */
const DEFAULT_REGIONS = [
  { name: '算法星域', icon: '🚀', color: '#FF6B6B', keywords: ['算法', '贪心', '分治', '递归', '回溯', '搜索'] },
  { name: '数据结构星域', icon: '🏗️', color: '#4ECDC4', keywords: ['数据结构', '栈', '队列', '链表', '树', '图', '哈希'] },
  { name: '数学星域', icon: '🔢', color: '#45B7D1', keywords: ['数学', '数论', '组合', '概率', '几何', '矩阵', '素数'] },
  { name: '字符串星域', icon: '📝', color: '#96CEB4', keywords: ['字符串', '匹配', '回文', 'KMP'] },
  { name: '动态规划星域', icon: '⚡', color: '#FFEAA7', keywords: ['动态规划', 'DP', '记忆化', '递推'] },
  { name: '综合星域', icon: '🌟', color: '#DDA0DD', keywords: [] },
];

export class StarPathService {

  /**
   * 获取完整星图：包含所有星域、星球及当前用户的探索进度
   * 同时计算整体统计（总星球数、已探索数、已掌握数）
   */
  async getStarMap(userId: string) {
    const regions = await prisma.starRegion.findMany({
      orderBy: { order: 'asc' },
      include: {
        planets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const planetIds = regions.flatMap(r => r.planets.map(p => p.id));

    const progresses = await prisma.userPlanetProgress.findMany({
      where: { userId, planetId: { in: planetIds } },
    });

    const progressMap = new Map(progresses.map(p => [p.planetId, p]));

    let totalPlanets = 0;
    let exploredPlanets = 0;
    let masteredPlanets = 0;

    const regionsData = regions.map(region => ({
      id: region.id,
      name: region.name,
      description: region.description,
      icon: region.icon,
      color: region.color,
      planets: region.planets.map(planet => {
        totalPlanets++;
        const progress = progressMap.get(planet.id);
        const status = progress?.status || PLANET_STATUS.UNEXPLORED;
        if (status !== PLANET_STATUS.UNEXPLORED) exploredPlanets++;
        if (status === PLANET_STATUS.MASTERED) masteredPlanets++;

        return {
          id: planet.id,
          name: planet.name,
          description: planet.description,
          difficulty: planet.difficulty,
          status,
          score: progress?.score || 0,
          posX: planet.posX,
          posY: planet.posY,
        };
      }),
    }));

    return {
      regions: regionsData,
      totalPlanets,
      exploredPlanets,
      masteredPlanets,
    };
  }

  /**
   * 获取星球详情：包含关联题目列表（隐藏测试用例和填空答案）、用户进度、推荐顺序
   */
  async getPlanetDetail(planetId: string, userId: string) {
    const planet = await prisma.starPlanet.findUnique({
      where: { id: planetId },
      include: { region: true },
    });

    if (!planet) {
      throw new Error('星球不存在');
    }

    const problemIds: string[] = safeJsonParse(planet.problemIds, []);

    const problems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        difficulty: true,
        tags: true,
        choices: true,
        timeLimit: true,
        memoryLimit: true,
      },
    });

    /* 按原始 problemIds 顺序排列，并脱敏：隐藏 testCases 和 fillBlanks 答案 */
    const orderedProblems = problemIds
      .map(pid => problems.find(p => p.id === pid))
      .filter(Boolean)
      .map(p => {
        const sanitized = { ...p!, tags: safeJsonParse(p!.tags, []) };

        /* 选择题保留选项但不暴露正确答案 */
        if (sanitized.type === 'CHOICE' && sanitized.choices) {
          const choices = safeJsonParse<any[]>(sanitized.choices, []);
          sanitized.choices = JSON.stringify(choices.map(c => ({ key: c.key, text: c.text })));
        }

        return sanitized;
      });

    /* 获取或创建用户进度 */
    let progress = await prisma.userPlanetProgress.findUnique({
      where: { userId_planetId: { userId, planetId } },
    });

    if (!progress) {
      progress = await prisma.userPlanetProgress.create({
        data: { userId, planetId, status: PLANET_STATUS.EXPLORING, lastVisitAt: new Date() },
      });
    } else if (progress.status === PLANET_STATUS.UNEXPLORED) {
      progress = await prisma.userPlanetProgress.update({
        where: { id: progress.id },
        data: { status: PLANET_STATUS.EXPLORING, lastVisitAt: new Date() },
      });
    } else {
      progress = await prisma.userPlanetProgress.update({
        where: { id: progress.id },
        data: { lastVisitAt: new Date() },
      });
    }

    /* 推荐做题顺序：EASY → MEDIUM → HARD */
    const difficultyOrder: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
    const recommendedOrder = [...orderedProblems].sort(
      (a, b) => (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1),
    );

    return {
      planet: {
        id: planet.id,
        name: planet.name,
        description: planet.description,
        difficulty: planet.difficulty,
        tags: safeJsonParse(planet.tags, []),
        region: { id: planet.region.id, name: planet.region.name },
      },
      problems: orderedProblems,
      progress: {
        status: progress.status,
        score: progress.score,
        attempts: progress.attempts,
        lastVisitAt: progress.lastVisitAt,
      },
      recommendedOrder: recommendedOrder.map(p => p.id),
    };
  }

  /**
   * 提交星球挑战：根据题目类型判题，更新进度状态和积分
   * - PROGRAMMING 类型：需要代码提交，此处仅记录答案并标记为探索中
   * - CHOICE 类型：对比正确答案
   * - FILL_BLANK 类型：对比填空答案
   * 进度状态流转：UNEXPLORED → EXPLORING → MASTERED
   */
  async submitPlanetChallenge(
    planetId: string,
    userId: string,
    data: { problemId: string; answer: string; challengeType: string },
  ) {
    const planet = await prisma.starPlanet.findUnique({ where: { id: planetId } });
    if (!planet) {
      throw new Error('星球不存在');
    }

    const problemIds: string[] = safeJsonParse(planet.problemIds, []);
    if (!problemIds.includes(data.problemId)) {
      throw new Error('该题目不属于此星球');
    }

    const problem = await prisma.problem.findUnique({ where: { id: data.problemId } });
    if (!problem) {
      throw new Error('题目不存在');
    }

    let correct = false;
    let score = 0;

    switch (data.challengeType) {
      case 'CHOICE': {
        const correctAnswer = problem.correctAnswer?.trim().toUpperCase();
        const userAnswer = data.answer.trim().toUpperCase();
        correct = correctAnswer === userAnswer;
        score = correct ? 10 : 0;
        break;
      }
      case 'FILL_BLANK': {
        const blanks: string[] = safeJsonParse(problem.fillBlanks || '[]', []);
        const userAnswers: string[] = safeJsonParse(data.answer, [data.answer]);
        let matchCount = 0;
        for (let i = 0; i < blanks.length; i++) {
          if (blanks[i]?.trim().toLowerCase() === userAnswers[i]?.trim().toLowerCase()) {
            matchCount++;
          }
        }
        correct = blanks.length > 0 && matchCount === blanks.length;
        score = blanks.length > 0 ? Math.round((matchCount / blanks.length) * 10) : 0;
        break;
      }
      case 'PROGRAMMING': {
        /* 编程题需要实际运行判题，此处先记录提交，通过 Submission 系统异步判题 */
        const lastSubmission = await prisma.submission.findFirst({
          where: { userId, problemId: data.problemId },
          orderBy: { createdAt: 'desc' },
        });
        correct = lastSubmission?.status === 'ACCEPTED';
        score = correct ? 10 : (lastSubmission?.score ?? 0);
        break;
      }
      default:
        throw new Error(`不支持的挑战类型: ${data.challengeType}`);
    }

    /* 更新用户进度 */
    let progress = await prisma.userPlanetProgress.findUnique({
      where: { userId_planetId: { userId, planetId } },
    });

    if (!progress) {
      progress = await prisma.userPlanetProgress.create({
        data: {
          userId,
          planetId,
          status: PLANET_STATUS.EXPLORING,
          score: correct ? 10 : 0,
          attempts: 1,
          lastVisitAt: new Date(),
        },
      });
    } else {
      const newAttempts = progress.attempts + 1;
      const newScore = Math.max(progress.score, score);

      /* 根据星球内所有题目的总得分率判断掌握状态 */
      const totalProblems = problemIds.length;
      const maxScore = totalProblems * 10;
      let newStatus = progress.status;

      if (progress.status === PLANET_STATUS.UNEXPLORED) {
        newStatus = PLANET_STATUS.EXPLORING;
      }

      if (newScore >= maxScore * 0.8) {
        newStatus = PLANET_STATUS.MASTERED;
      } else if (newScore > 0 && progress.status === PLANET_STATUS.UNEXPLORED) {
        newStatus = PLANET_STATUS.EXPLORING;
      }

      progress = await prisma.userPlanetProgress.update({
        where: { id: progress.id },
        data: {
          status: newStatus,
          score: newScore,
          attempts: newAttempts,
          lastVisitAt: new Date(),
        },
      });
    }

    /* 答对时奖励积分 */
    let pointsEarned = 0;
    if (correct) {
      const difficultyPoints: Record<string, number> = { EASY: 5, MEDIUM: 10, HARD: 20 };
      pointsEarned = difficultyPoints[problem.difficulty] || 10;

      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: pointsEarned } },
      });

      await prisma.pointLog.create({
        data: {
          userId,
          delta: pointsEarned,
          reason: `编程星途挑战: ${problem.title}`,
        },
      });
    }

    return {
      correct,
      score,
      newStatus: progress.status,
      pointsEarned,
    };
  }

  /**
   * AI 导师对话：基于用户画像、当前星球和近期提交构建上下文，
   * 调用 aiService.companionChat 获取知识关联型回复
   */
  async getGuideConversation(
    userId: string,
    planetId: string | undefined,
    message: string,
  ) {
    /* 收集用户画像信息 */
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    const weakPoints: { tag: string; errorCount: number }[] = safeJsonParse(
      profile?.weakPoints || '[]', [],
    );

    /* 收集当前星球上下文 */
    let planetContext: any = null;
    if (planetId) {
      const planet = await prisma.starPlanet.findUnique({
        where: { id: planetId },
        include: { region: true },
      });
      if (planet) {
        const problemIds: string[] = safeJsonParse(planet.problemIds, []);
        const problems = await prisma.problem.findMany({
          where: { id: { in: problemIds } },
          select: { id: true, title: true, difficulty: true, tags: true },
        });
        planetContext = {
          name: planet.name,
          region: planet.region.name,
          difficulty: planet.difficulty,
          tags: safeJsonParse(planet.tags, []),
          problems,
        };
      }
    }

    /* 收集近期提交摘要 */
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        status: true,
        problem: { select: { title: true, difficulty: true } },
      },
    });

    /* 构建 companionChat 参数 */
    const companionResult = await aiService.companionChat({
      type: 'KNOWLEDGE_LINK',
      problem: planetContext
        ? {
            title: `[编程星途·${planetContext.region}] ${planetContext.name}`,
            description: `当前星球难度: ${planetContext.difficulty}, 标签: ${planetContext.tags.join(', ')}\n包含题目: ${planetContext.problems.map((p: any) => p.title).join(', ')}\n\n用户提问: ${message}`,
            tags: JSON.stringify(planetContext.tags),
            difficulty: planetContext.difficulty,
          }
        : {
            title: '编程星途学习指导',
            description: `用户薄弱点: ${weakPoints.map(w => w.tag).join(', ')}\n近期提交: ${recentSubmissions.map(s => `${s.problem.title}(${s.status})`).join(', ')}\n\n用户提问: ${message}`,
            tags: JSON.stringify(weakPoints.map(w => w.tag)),
            difficulty: 'MEDIUM',
          },
      userId,
    });

    /* 生成学习建议 */
    const suggestions: string[] = [];
    if (weakPoints.length > 0) {
      suggestions.push(`建议重点攻克: ${weakPoints.slice(0, 3).map(w => w.tag).join('、')}`);
    }
    if (planetContext) {
      const unsolvedProblems = planetContext.problems.filter(
        (p: any) => !recentSubmissions.some(s => s.problem.title === p.title && s.status === 'ACCEPTED'),
      );
      if (unsolvedProblems.length > 0) {
        suggestions.push(`当前星球还有 ${unsolvedProblems.length} 道题未通过，继续加油！`);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push('继续探索新的星球，拓展知识版图！');
    }

    return {
      response: companionResult.content,
      suggestions,
    };
  }

  /**
   * 初始化默认星域：当系统中不存在任何 StarRegion 时创建6个默认星域，
   * 每个星域根据知识树节点和现有题目标签自动创建星球
   */
  async initializeDefaultRegions() {
    const existingCount = await prisma.starRegion.count();
    if (existingCount > 0) {
      return { created: false, message: '星域已存在，无需重复初始化' };
    }

    /* 获取所有知识树一级节点 */
    const knowledgeNodes = await prisma.knowledgeTree.findMany({
      where: { level: 1 },
      include: {
        children: true,
        problems: { select: { id: true, tags: true } },
      },
    });

    /* 获取所有题目用于按标签匹配 */
    const allProblems = await prisma.problem.findMany({
      select: { id: true, tags: true, difficulty: true },
    });

    const createdRegions: string[] = [];

    for (let i = 0; i < DEFAULT_REGIONS.length; i++) {
      const regionDef = DEFAULT_REGIONS[i];

      /* 查找与该星域关键词匹配的知识树节点 */
      const matchedNode = knowledgeNodes.find(node =>
        regionDef.keywords.some(kw => node.name.includes(kw) || kw.includes(node.name)),
      );

      const region = await prisma.starRegion.create({
        data: {
          name: regionDef.name,
          icon: regionDef.icon,
          color: regionDef.color,
          order: i,
          description: matchedNode?.description || `${regionDef.name}的学习之旅`,
          knowledgeTreeId: matchedNode?.id || null,
        },
      });

      /* 收集属于该星域的题目 */
      let regionProblemIds: string[] = [];

      if (matchedNode) {
        /* 从知识树节点获取关联题目 */
        const childIds = matchedNode.children.map(c => c.id);
        const nodeIds = [matchedNode.id, ...childIds];
        const nodeProblems = await prisma.problem.findMany({
          where: { knowledgeTreeId: { in: nodeIds } },
          select: { id: true, tags: true, difficulty: true },
        });
        regionProblemIds = nodeProblems.map(p => p.id);
      }

      /* 如果知识树匹配不到足够题目，按标签匹配补充 */
      if (regionProblemIds.length < 3 && regionDef.keywords.length > 0) {
        const tagMatched = allProblems.filter(p => {
          const tags: string[] = safeJsonParse<string[]>(p.tags, []);
          return regionDef.keywords.some(kw => tags.some(t => t.includes(kw) || kw.includes(t)));
        });
        const additionalIds = tagMatched
          .map(p => p.id)
          .filter(id => !regionProblemIds.includes(id));
        regionProblemIds = [...regionProblemIds, ...additionalIds];
      }

      /* 综合星域：收集未被其他星域覆盖的题目 */
      if (regionDef.keywords.length === 0) {
        const otherRegionProblemIds = new Set<string>();
        for (const otherDef of DEFAULT_REGIONS) {
          if (otherDef.keywords.length === 0) continue;
          const matched = knowledgeNodes.find(node =>
            otherDef.keywords.some(kw => node.name.includes(kw) || kw.includes(node.name)),
          );
          if (matched) {
            const childIds = matched.children.map(c => c.id);
            const nodeIds = [matched.id, ...childIds];
            const nodeProblems = await prisma.problem.findMany({
              where: { knowledgeTreeId: { in: nodeIds } },
              select: { id: true },
            });
            nodeProblems.forEach(p => otherRegionProblemIds.add(p.id));
          }
          const tagMatched = allProblems.filter(p => {
            const tags: string[] = safeJsonParse<string[]>(p.tags, []);
            return otherDef.keywords.some(kw => tags.some(t => t.includes(kw) || kw.includes(t)));
          });
          tagMatched.forEach(p => otherRegionProblemIds.add(p.id));
        }
        regionProblemIds = allProblems
          .map(p => p.id)
          .filter(id => !otherRegionProblemIds.has(id));
      }

      /* 按难度分组创建星球 */
      const difficultyGroups: Record<string, string[]> = {
        EASY: regionProblemIds.filter(pid => {
          const p = allProblems.find(prob => prob.id === pid);
          return p?.difficulty === 'EASY';
        }),
        MEDIUM: regionProblemIds.filter(pid => {
          const p = allProblems.find(prob => prob.id === pid);
          return p?.difficulty === 'MEDIUM';
        }),
        HARD: regionProblemIds.filter(pid => {
          const p = allProblems.find(prob => prob.id === pid);
          return p?.difficulty === 'HARD';
        }),
      };

      const planetDefs = [
        { name: `${regionDef.name}·启航星`, difficulty: 'EASY', problems: difficultyGroups.EASY, posY: 0.2 },
        { name: `${regionDef.name}·探索星`, difficulty: 'MEDIUM', problems: difficultyGroups.MEDIUM, posY: 0.5 },
        { name: `${regionDef.name}·挑战星`, difficulty: 'HARD', problems: difficultyGroups.HARD, posY: 0.8 },
      ].filter(pd => pd.problems.length > 0);

      /* 如果没有任何题目，创建一个空星球 */
      if (planetDefs.length === 0) {
        planetDefs.push({
          name: `${regionDef.name}·启航星`,
          difficulty: 'EASY',
          problems: [],
          posY: 0.5,
        });
      }

      for (let j = 0; j < planetDefs.length; j++) {
        const pd = planetDefs[j];
        const posX = 0.2 + (j / Math.max(planetDefs.length - 1, 1)) * 0.6;

        await prisma.starPlanet.create({
          data: {
            regionId: region.id,
            name: pd.name,
            description: `${pd.difficulty === 'EASY' ? '入门' : pd.difficulty === 'MEDIUM' ? '进阶' : '挑战'}级星球`,
            difficulty: pd.difficulty,
            order: j,
            posX: planetDefs.length === 1 ? 0.5 : posX,
            posY: pd.posY,
            problemIds: JSON.stringify(pd.problems),
          },
        });
      }

      createdRegions.push(region.id);
    }

    return {
      created: true,
      regionCount: createdRegions.length,
      message: `成功创建 ${createdRegions.length} 个星域`,
    };
  }
}

export const starPathService = new StarPathService();
