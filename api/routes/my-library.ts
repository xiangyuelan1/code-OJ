import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

const parseTags = (tags: string) => {
  try {
    return JSON.parse(tags || '[]');
  } catch {
    return [];
  }
};

const toProblemInfo = (problem: any) => ({
  id: problem.id,
  title: problem.title,
  type: problem.type,
  difficulty: problem.difficulty,
  knowledgeTreeId: problem.knowledgeTreeId,
  knowledgeTreeName: problem.knowledgeTree?.name ?? '未分类',
  tags: parseTags(problem.tags),
});

const getUserId = (req: Request) => (req as any).user.userId;

const findOwnedList = async (id: string, userId: string) => {
  return prisma.userProblemList.findFirst({
    where: { id, userId },
  });
};

router.get('/favorites', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const favorites = await prisma.userProblemFavorite.findMany({
      where: { userId },
      include: {
        problem: {
          include: { knowledgeTree: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: favorites.map((favorite) => ({
        id: favorite.id,
        problemId: favorite.problemId,
        note: favorite.note,
        createdAt: favorite.createdAt,
        ...toProblemInfo(favorite.problem),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/favorites/check/:problemId', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const favorite = await prisma.userProblemFavorite.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId: req.params.problemId,
        },
      },
      select: { id: true },
    });

    res.json({ success: true, data: { favorited: !!favorite } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/favorites/:problemId', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { problemId } = req.params;
    const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
    if (!problem) {
      res.status(404).json({ success: false, error: { message: '题目不存在' } });
      return;
    }

    const favorite = await prisma.userProblemFavorite.upsert({
      where: {
        userId_problemId: { userId, problemId },
      },
      update: {},
      create: { userId, problemId },
    });

    res.status(201).json({ success: true, data: favorite });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/favorites/:problemId', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { problemId } = req.params;
    await prisma.userProblemFavorite.deleteMany({ where: { userId, problemId } });
    res.json({ success: true, data: { message: '已取消收藏' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/lists', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const [lists, solvedSubmissions] = await Promise.all([
      prisma.userProblemList.findMany({
        where: { userId },
        include: {
          items: { select: { problemId: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.submission.findMany({
        where: { userId, status: 'ACCEPTED' },
        select: { problemId: true },
      }),
    ]);

    const solvedProblemIds = new Set(solvedSubmissions.map((submission) => submission.problemId));
    res.json({
      success: true,
      data: lists.map((list) => ({
        id: list.id,
        title: list.title,
        description: list.description,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        problemCount: list.items.length,
        solvedCount: list.items.filter((item) => solvedProblemIds.has(item.problemId)).length,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/lists', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (title.length < 1 || title.length > 50) {
      res.status(400).json({ success: false, error: { message: '题单标题长度必须为 1-50 个字符' } });
      return;
    }

    const list = await prisma.userProblemList.create({
      data: {
        userId,
        title,
        description: typeof req.body.description === 'string' ? req.body.description : '',
        isPublic: req.body.isPublic === true,
      },
    });

    res.status(201).json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/lists/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const list = await prisma.userProblemList.findFirst({
      where: { id: req.params.id, userId },
      include: {
        items: {
          include: {
            problem: { include: { knowledgeTree: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!list) {
      res.status(404).json({ success: false, error: { message: '题单不存在' } });
      return;
    }

    const acceptedSubmissions = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED', problemId: { in: list.items.map((item) => item.problemId) } },
      select: { problemId: true },
    });
    const solvedProblemIds = new Set(acceptedSubmissions.map((submission) => submission.problemId));

    res.json({
      success: true,
      data: {
        id: list.id,
        title: list.title,
        description: list.description,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        items: list.items.map((item) => ({
          id: item.id,
          order: item.order,
          createdAt: item.createdAt,
          solved: solvedProblemIds.has(item.problemId),
          problem: toProblemInfo(item.problem),
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/lists/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const existing = await findOwnedList(req.params.id, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '题单不存在' } });
      return;
    }

    const data: any = {};
    if (req.body.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (title.length < 1 || title.length > 50) {
        res.status(400).json({ success: false, error: { message: '题单标题长度必须为 1-50 个字符' } });
        return;
      }
      data.title = title;
    }
    if (req.body.description !== undefined) {
      data.description = typeof req.body.description === 'string' ? req.body.description : '';
    }
    if (req.body.isPublic !== undefined) {
      data.isPublic = req.body.isPublic === true;
    }

    const list = await prisma.userProblemList.update({
      where: { id: existing.id },
      data,
    });

    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/lists/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const existing = await findOwnedList(req.params.id, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '题单不存在' } });
      return;
    }

    await prisma.userProblemList.delete({ where: { id: existing.id } });
    res.json({ success: true, data: { message: '题单已删除' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/lists/:id/problems', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const existing = await findOwnedList(req.params.id, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '题单不存在' } });
      return;
    }

    const problemId = typeof req.body.problemId === 'string' ? req.body.problemId : '';
    if (!problemId) {
      res.status(400).json({ success: false, error: { message: 'problemId 为必填项' } });
      return;
    }

    const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
    if (!problem) {
      res.status(404).json({ success: false, error: { message: '题目不存在' } });
      return;
    }

    const existingItem = await prisma.userProblemListItem.findUnique({
      where: { listId_problemId: { listId: existing.id, problemId } },
    });
    if (existingItem) {
      res.status(201).json({ success: true, data: existingItem });
      return;
    }

    const maxOrderItem = await prisma.userProblemListItem.findFirst({
      where: { listId: existing.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const item = await prisma.userProblemListItem.create({
      data: {
        listId: existing.id,
        problemId,
        order: (maxOrderItem?.order ?? -1) + 1,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/lists/:id/problems/:problemId', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const existing = await findOwnedList(req.params.id, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '题单不存在' } });
      return;
    }

    await prisma.userProblemListItem.deleteMany({
      where: { listId: existing.id, problemId: req.params.problemId },
    });
    res.json({ success: true, data: { message: '题目已移出题单' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/recent', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: { include: { knowledgeTree: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recent = [];
    const stats = new Map<string, { attemptCount: number; solved: boolean }>();
    for (const submission of submissions) {
      const stat = stats.get(submission.problemId) ?? { attemptCount: 0, solved: false };
      stat.attemptCount += 1;
      stat.solved = stat.solved || submission.status === 'ACCEPTED';
      stats.set(submission.problemId, stat);
    }

    const seen = new Set<string>();
    for (const submission of submissions) {
      if (seen.has(submission.problemId)) continue;
      seen.add(submission.problemId);
      const stat = stats.get(submission.problemId) ?? { attemptCount: 1, solved: submission.status === 'ACCEPTED' };
      recent.push({
        problemId: submission.problemId,
        latestStatus: submission.status,
        attemptCount: stat.attemptCount,
        lastSubmittedAt: submission.createdAt,
        solved: stat.solved,
        problem: toProblemInfo(submission.problem),
      });
      if (recent.length >= limit) break;
    }

    res.json({ success: true, data: recent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
