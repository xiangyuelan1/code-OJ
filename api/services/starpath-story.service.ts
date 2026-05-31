import prisma from '../lib/prisma';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

const DEFAULT_STORY_THEMES: Record<string, { title: string; prologue: string; theme: string; chapters: Array<{ title: string; narrative: string; completionText: string; rewardBuildingType: string; rewardPoints: number }> }> = {
  '算法星域': {
    title: '算法星域：混沌之海',
    prologue: '在遥远的算法星域，一股混沌之力正在侵蚀星球的秩序。作为星际旅行者，你需要运用算法的力量，恢复星域的平衡。每征服一颗星球，你将获得新的力量，最终面对混沌之源...',
    theme: 'rescue',
    chapters: [
      { title: '启航：秩序的碎片', narrative: '你降落在启航星，发现这里的居民正被无序的数据流困扰。排序，是一切秩序的起点...', completionText: '你成功整理了混乱的数据流，启航星恢复了秩序。作为奖励，你获得了建造实验室的权限！', rewardBuildingType: 'LABORATORY', rewardPoints: 20 },
      { title: '探索：贪婪的抉择', narrative: '探索星上充满了需要做出最优选择的场景。每一步都需要贪婪地抓住当前最好的机会...', completionText: '你学会了在每一步做出最优选择，探索星的居民向你致敬！图书馆的建造权限已解锁！', rewardBuildingType: 'LIBRARY', rewardPoints: 30 },
      { title: '挑战：分治的策略', narrative: '挑战星上最大的难题需要分而治之。将大问题拆解为小问题，逐一击破...', completionText: '你掌握了分治的智慧，挑战星向你敞开了竞技场！', rewardBuildingType: 'ARENA', rewardPoints: 40 },
    ],
  },
  '数据结构星域': {
    title: '数据结构星域：构造者之歌',
    prologue: '数据结构星域是整个宇宙的基石。在这里，万物皆由结构构成——栈与队列维持着时间的秩序，树与图编织着空间的网络。作为构造者，你需要理解这些结构的本质...',
    theme: 'conquest',
    chapters: [
      { title: '启航：栈与队列的守卫', narrative: '启航星的守卫严格按照"后进先出"和"先进先出"的原则行事。理解他们，才能通过城门...', completionText: '你理解了栈与队列的精髓，守卫向你致敬！实验室建造权限已解锁！', rewardBuildingType: 'LABORATORY', rewardPoints: 20 },
      { title: '探索：树之脉络', narrative: '探索星上生长着奇异的树形结构，每棵树都有根、有枝、有叶。你需要沿着脉络攀爬到顶端...', completionText: '你成功穿越了树之脉络，图书馆向你开放！', rewardBuildingType: 'LIBRARY', rewardPoints: 30 },
      { title: '挑战：图的迷宫', narrative: '挑战星是一座由图构成的迷宫，节点之间有无数条边相连。找到最短路径，才能逃出迷宫...', completionText: '你破解了图的迷宫，竞技场为你而建！', rewardBuildingType: 'ARENA', rewardPoints: 40 },
    ],
  },
  '数学星域': {
    title: '数学星域：无穷的密码',
    prologue: '数学星域隐藏着宇宙最古老的密码。素数的分布、组合的奥秘、概率的预言——只有掌握数学之眼的人，才能解读这些密码...',
    theme: 'mystery',
    chapters: [
      { title: '启航：数论之门', narrative: '启航星的大门上刻着素数的序列。只有理解数论的人，才能推开门扉...', completionText: '数论之门为你打开，实验室建造权限已解锁！', rewardBuildingType: 'LABORATORY', rewardPoints: 20 },
      { title: '探索：组合的钥匙', narrative: '探索星上有无数把锁，每把锁都需要正确的组合才能打开。排列、组合、容斥...', completionText: '你找到了所有组合的钥匙，图书馆向你敞开！', rewardBuildingType: 'LIBRARY', rewardPoints: 30 },
      { title: '挑战：概率的预言', narrative: '挑战星上的先知通过概率预见未来。你需要理解随机性背后的规律...', completionText: '你掌握了概率的预言，竞技场为你而建！', rewardBuildingType: 'ARENA', rewardPoints: 40 },
    ],
  },
  '字符串星域': {
    title: '字符串星域：文字的编织',
    prologue: '字符串星域是文字的故乡。在这里，每一个字符都有生命，每一段文本都是一首诗。你需要学会编织文字的艺术...',
    theme: 'exploration',
    chapters: [
      { title: '启航：匹配的旋律', narrative: '启航星上回荡着旋律，每段旋律都是一种模式。你需要找到匹配的音符...', completionText: '你找到了匹配的旋律，实验室建造权限已解锁！', rewardBuildingType: 'LABORATORY', rewardPoints: 20 },
      { title: '探索：回文的镜像', narrative: '探索星上有一面巨大的镜子，只反射回文。正读反读都一样的文字才能通过...', completionText: '你破解了回文的镜像，图书馆向你开放！', rewardBuildingType: 'LIBRARY', rewardPoints: 30 },
      { title: '挑战：编码的秘密', narrative: '挑战星上隐藏着古老的编码，KMP算法是解开秘密的关键...', completionText: '你破解了编码的秘密，竞技场为你而建！', rewardBuildingType: 'ARENA', rewardPoints: 40 },
    ],
  },
  '动态规划星域': {
    title: '动态规划星域：时间的回响',
    prologue: '动态规划星域的时间是循环的。过去的选择影响现在，现在的决策决定未来。你需要学会在时间的回响中找到最优解...',
    theme: 'mystery',
    chapters: [
      { title: '启航：记忆的碎片', narrative: '启航星上的居民失去了记忆，他们不断重复同样的错误。记忆化搜索是恢复记忆的关键...', completionText: '你帮助居民恢复了记忆，实验室建造权限已解锁！', rewardBuildingType: 'LABORATORY', rewardPoints: 20 },
      { title: '探索：递推的阶梯', narrative: '探索星上有一座无尽的阶梯，每一步都建立在前一步之上。递推，是攀登的唯一方式...', completionText: '你攀登了递推的阶梯，图书馆向你开放！', rewardBuildingType: 'LIBRARY', rewardPoints: 30 },
      { title: '挑战：状态的博弈', narrative: '挑战星上正在进行一场状态博弈，每个状态转移都决定着胜负...', completionText: '你赢得了状态的博弈，竞技场为你而建！', rewardBuildingType: 'ARENA', rewardPoints: 40 },
    ],
  },
  '综合星域': {
    title: '综合星域：终极试炼',
    prologue: '综合星域是所有知识的交汇点。只有通过了其他星域考验的旅行者，才能面对这里的终极试炼...',
    theme: 'conquest',
    chapters: [
      { title: '启航：知识的融合', narrative: '启航星要求你融合所有学过的知识。算法、数据结构、数学——缺一不可...', completionText: '你成功融合了知识，实验室建造权限已解锁！', rewardBuildingType: 'LABORATORY', rewardPoints: 25 },
      { title: '探索：跨界挑战', narrative: '探索星上的问题跨越了单一领域，需要综合运用多种技巧...', completionText: '你完成了跨界挑战，图书馆向你开放！', rewardBuildingType: 'LIBRARY', rewardPoints: 35 },
      { title: '挑战：终极Boss', narrative: '这是最后的考验。面对综合星域的Boss，你需要运用一切所学...', completionText: '你击败了终极Boss，天文台为你而建！整个星域向你致敬！', rewardBuildingType: 'OBSERVATORY', rewardPoints: 50 },
    ],
  },
};

export class StarPathStoryService {

  async initializeStoryForRegion(regionId: string) {
    const region = await prisma.starRegion.findUnique({ where: { id: regionId } });
    if (!region) throw new Error('星域不存在');

    const existing = await prisma.storyArc.findUnique({ where: { regionId } });
    if (existing) return existing;

    const themeConfig = DEFAULT_STORY_THEMES[region.name];
    if (!themeConfig) return null;

    const planets = await prisma.starPlanet.findMany({
      where: { regionId },
      orderBy: { order: 'asc' },
    });

    const arc = await prisma.storyArc.create({
      data: {
        regionId,
        title: themeConfig.title,
        prologue: themeConfig.prologue,
        theme: themeConfig.theme,
      },
    });

    const chapterData = themeConfig.chapters;
    for (let i = 0; i < chapterData.length; i++) {
      const ch = chapterData[i];
      const planet = planets[i] || null;

      await prisma.storyChapter.create({
        data: {
          arcId: arc.id,
          planetId: planet?.id || null,
          order: i,
          title: ch.title,
          narrative: ch.narrative,
          completionText: ch.completionText,
          isBoss: false,
          rewardPoints: ch.rewardPoints,
          rewardBuildingType: ch.rewardBuildingType,
        },
      });
    }

    if (planets.length > chapterData.length) {
      const bossPlanet = planets[planets.length - 1];
      const bossProblemIds = safeJsonParse<string[]>(bossPlanet?.problemIds || '[]', []);
      await prisma.storyChapter.create({
        data: {
          arcId: arc.id,
          planetId: null,
          order: chapterData.length,
          title: `${region.name}·Boss战：终极试炼`,
          narrative: `这是${region.name}的最终考验！只有精通了所有星球的旅行者，才能面对这个挑战...`,
          completionText: `恭喜！你征服了${region.name}的所有挑战！天文台为你而建！`,
          isBoss: true,
          bossProblemIds: JSON.stringify(bossProblemIds),
          rewardPoints: 60,
          rewardBuildingType: 'OBSERVATORY',
        },
      });
    }

    return arc;
  }

  async initializeAllStories() {
    const regions = await prisma.starRegion.findMany({ orderBy: { order: 'asc' } });
    const results: string[] = [];
    for (const region of regions) {
      const arc = await this.initializeStoryForRegion(region.id);
      if (arc) results.push(region.name);
    }
    return { initialized: results, count: results.length };
  }

  async getStoryArc(regionId: string, userId: string) {
    let arc = await prisma.storyArc.findUnique({
      where: { regionId },
      include: {
        chapters: { orderBy: { order: 'asc' } },
      },
    });

    if (!arc) {
      arc = await this.initializeStoryForRegion(regionId) as any;
      if (!arc) return null;
      arc = await prisma.storyArc.findUnique({
        where: { regionId },
        include: { chapters: { orderBy: { order: 'asc' } } },
      });
    }

    const userProgress = await prisma.userStoryProgress.findMany({
      where: { userId, chapterId: { in: arc!.chapters.map(c => c.id) } },
    });
    const progressMap = new Map(userProgress.map(p => [p.chapterId, p]));

    const chaptersWithProgress = arc!.chapters.map((ch, idx) => {
      const progress = progressMap.get(ch.id);
      const prevChapter = idx > 0 ? arc!.chapters[idx - 1] : null;
      const prevProgress = prevChapter ? progressMap.get(prevChapter.id) : null;
      const isUnlocked = idx === 0 || (prevProgress?.completed ?? false);

      return {
        id: ch.id,
        order: ch.order,
        title: ch.title,
        narrative: ch.narrative,
        completionText: ch.completionText,
        isBoss: ch.isBoss,
        planetId: ch.planetId,
        bossProblemIds: safeJsonParse<string[]>(ch.bossProblemIds, []),
        rewardPoints: ch.rewardPoints,
        rewardBuildingType: ch.rewardBuildingType,
        completed: progress?.completed ?? false,
        completedAt: progress?.completedAt ?? null,
        isUnlocked,
      };
    });

    const allCompleted = chaptersWithProgress.every(c => c.completed);

    return {
      id: arc!.id,
      regionId: arc!.regionId,
      title: arc!.title,
      prologue: arc!.prologue,
      epilogue: arc!.epilogue,
      theme: arc!.theme,
      chapters: chaptersWithProgress,
      allCompleted,
    };
  }

  async completeChapter(chapterId: string, userId: string) {
    const chapter = await prisma.storyChapter.findUnique({
      where: { id: chapterId },
      include: { arc: true },
    });
    if (!chapter) throw new Error('章节不存在');

    if (!chapter.isBoss && chapter.planetId) {
      const progress = await prisma.userPlanetProgress.findUnique({
        where: { userId_planetId: { userId, planetId: chapter.planetId } },
      });
      if (!progress || progress.status !== 'MASTERED') {
        throw new Error('需要先精通对应星球才能完成此章节');
      }
    }

    const existing = await prisma.userStoryProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
    });

    if (existing?.completed) {
      return { alreadyCompleted: true, chapter: existing };
    }

    const userProgress = await prisma.userStoryProgress.upsert({
      where: { userId_chapterId: { userId, chapterId } },
      create: { userId, chapterId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });

    if (chapter.rewardPoints > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: chapter.rewardPoints } },
      });
      await prisma.pointLog.create({
        data: {
          userId,
          delta: chapter.rewardPoints,
          reason: `剧情完成: ${chapter.title}`,
        },
      });
    }

    return { alreadyCompleted: false, chapter: userProgress, rewardPoints: chapter.rewardPoints, rewardBuildingType: chapter.rewardBuildingType };
  }

  async getActiveEvents() {
    const now = new Date();
    return prisma.seasonEvent.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEvent(data: {
    name: string;
    description?: string;
    theme?: string;
    eventType?: string;
    bonusMultiplier?: number;
    startDate: string;
    endDate: string;
    specialRegionId?: string;
  }) {
    return prisma.seasonEvent.create({
      data: {
        name: data.name,
        description: data.description || '',
        theme: data.theme || 'default',
        eventType: data.eventType || 'SEASON',
        bonusMultiplier: data.bonusMultiplier || 1.0,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        specialRegionId: data.specialRegionId || null,
      },
    });
  }

  async joinEvent(eventId: string, userId: string) {
    const event = await prisma.seasonEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('事件不存在');

    const now = new Date();
    if (now < event.startDate || now > event.endDate) {
      throw new Error('事件不在有效期内');
    }

    return prisma.userEventParticipation.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, joinedAt: new Date() },
      update: {},
    });
  }

  async getEventLeaderboard(eventId: string) {
    const participations = await prisma.userEventParticipation.findMany({
      where: { eventId },
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: { score: 'desc' },
      take: 50,
    });
    return participations.map((p, idx) => ({
      rank: idx + 1,
      userId: p.user.id,
      username: p.user.username,
      avatar: p.user.avatar,
      score: p.score,
      completed: p.completed,
    }));
  }
}

export const starPathStoryService = new StarPathStoryService();
