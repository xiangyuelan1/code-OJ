import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();

// 所有路由均需认证
router.use(authMiddleware);

/**
 * GET / - 获取当前用户的错题记录，支持筛选与分页
 * 查询参数: mastered, source, knowledgeTreeId, page, pageSize
 * 默认展示未掌握的记录，按创建时间倒序
 */
router.get('/', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { mastered, source, knowledgeTreeId, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));

    // 构建查询条件
    const where: any = { userId };
    if (mastered !== undefined) {
      where.mastered = mastered === 'true';
    }
    if (source) {
      where.source = source as string;
    }
    if (knowledgeTreeId) {
      where.problem = { knowledgeTreeId: knowledgeTreeId as string };
    }

    const [total, records] = await Promise.all([
      prisma.wrongRecord.count({ where }),
      prisma.wrongRecord.findMany({
        where,
        include: {
          problem: {
            include: { knowledgeTree: true },
          },
        },
        orderBy: [
          { mastered: 'asc' },   // 未掌握的排在前面
          { createdAt: 'desc' },
        ],
        skip: (pageNum - 1) * size,
        take: size,
      }),
    ]);

    const flatRecords = records.map((record) => ({
      id: record.id,
      problemId: record.problemId,
      problemTitle: record.problem.title,
      source: record.source,
      difficulty: record.problem.difficulty,
      knowledgeTreeId: record.problem.knowledgeTreeId,
      knowledgeTreeName: record.problem.knowledgeTree?.name ?? '未分类',
      wrongAnswer: record.wrongAnswer,
      correctAnswer: record.correctAnswer,
      retryCount: record.retryCount,
      mastered: record.mastered,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        records: flatRecords,
        total,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /stats - 获取错题统计信息，按知识点分组展示薄弱项
 */
router.get('/stats', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const [totalCount, masteredCount, unmasteredCount, allRecords] = await Promise.all([
      prisma.wrongRecord.count({ where: { userId } }),
      prisma.wrongRecord.count({ where: { userId, mastered: true } }),
      prisma.wrongRecord.count({ where: { userId, mastered: false } }),
      prisma.wrongRecord.findMany({
        where: { userId },
        include: {
          problem: {
            select: { knowledgeTreeId: true, knowledgeTree: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    // 按知识点分组统计
    const breakdownMap = new Map<string, { knowledgeTreeId: string; knowledgeTreeName: string; wrongCount: number; masteredCount: number }>();

    for (const record of allRecords) {
      const ktId = record.problem.knowledgeTreeId;
      if (!ktId) continue;

      const existing = breakdownMap.get(ktId);
      if (existing) {
        existing.wrongCount += 1;
        if (record.mastered) existing.masteredCount += 1;
      } else {
        breakdownMap.set(ktId, {
          knowledgeTreeId: ktId,
          knowledgeTreeName: record.problem.knowledgeTree?.name ?? '未分类',
          wrongCount: 1,
          masteredCount: record.mastered ? 1 : 0,
        });
      }
    }

    // 按错题数量降序排列，薄弱知识点优先展示
    const byKnowledge = Array.from(breakdownMap.values()).sort((a, b) => b.wrongCount - a.wrongCount);

    res.json({
      success: true,
      data: {
        total: totalCount,
        mastered: masteredCount,
        unmastered: unmasteredCount,
        byKnowledge,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /recommendations - 基于薄弱知识点推荐题目
 * 找到用户未掌握的错题记录，按知识点查找用户未尝试过的同类题目，返回前10条
 */
router.get('/recommendations', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // 获取用户未掌握的错题记录，提取涉及的知识点
    const unmasteredRecords = await prisma.wrongRecord.findMany({
      where: { userId, mastered: false },
      include: {
        problem: { select: { knowledgeTreeId: true } },
      },
    });

    // 收集薄弱知识点ID（去重）
    const weakKnowledgeTreeIds = Array.from(new Set(
      unmasteredRecords
        .map(r => r.problem.knowledgeTreeId)
        .filter((id): id is string => id !== null)
    ));

    if (weakKnowledgeTreeIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // 获取用户已尝试过的题目ID（通过提交记录和错题记录）
    const [submittedProblemIds, wrongProblemIds] = await Promise.all([
      prisma.submission.findMany({
        where: { userId },
        select: { problemId: true },
      }),
      prisma.wrongRecord.findMany({
        where: { userId },
        select: { problemId: true },
      }),
    ]);

    const attemptedProblemIds = new Set([
      ...submittedProblemIds.map(s => s.problemId),
      ...wrongProblemIds.map(w => w.problemId),
    ]);

    // 在薄弱知识点下查找用户未尝试过的题目
    const candidateProblems = await prisma.problem.findMany({
      where: {
        knowledgeTreeId: { in: weakKnowledgeTreeIds },
        id: { notIn: Array.from(attemptedProblemIds) },
      },
      include: {
        knowledgeTree: { select: { id: true, name: true } },
      },
      take: 10,
      orderBy: { difficulty: 'asc' },  // 优先推荐简单题目，循序渐进
    });

    const recommendations = candidateProblems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      type: problem.type,
      difficulty: problem.difficulty,
      knowledgeTreeId: problem.knowledgeTreeId,
      knowledgeTreeName: problem.knowledgeTree?.name ?? '未分类',
      tags: JSON.parse(problem.tags || '[]'),
    }));

    res.json({ success: true, data: recommendations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST / - 创建或更新错题记录（基于 userId+problemId 唯一约束做 upsert）
 * 若记录已存在：增加重做次数，更新错误答案/正确答案，重置掌握状态
 * 若不存在：创建新记录
 */
router.post('/', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problemId, source, wrongAnswer, correctAnswer } = req.body;

    if (!problemId) {
      res.status(400).json({ success: false, error: { message: 'problemId 为必填项' } });
      return;
    }

    // 验证题目存在
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      res.status(404).json({ success: false, error: { message: '题目不存在' } });
      return;
    }

    const record = await prisma.wrongRecord.upsert({
      where: {
        userId_problemId: { userId, problemId },
      },
      update: {
        retryCount: { increment: 1 },
        wrongAnswer: wrongAnswer ?? undefined,
        correctAnswer: correctAnswer ?? undefined,
        mastered: false,
        masteredAt: null,
        source: source ?? undefined,
      },
      create: {
        userId,
        problemId,
        source: source ?? 'PRACTICE',
        wrongAnswer,
        correctAnswer,
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /:id/master - 将错题标记为已掌握
 */
router.put('/:id/master', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const existing = await prisma.wrongRecord.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '错题记录不存在' } });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ success: false, error: { message: '无权操作此记录' } });
      return;
    }

    const record = await prisma.wrongRecord.update({
      where: { id },
      data: { mastered: true, masteredAt: new Date() },
    });

    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /:id/retry - 增加重做次数
 */
router.put('/:id/retry', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const existing = await prisma.wrongRecord.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '错题记录不存在' } });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ success: false, error: { message: '无权操作此记录' } });
      return;
    }

    const record = await prisma.wrongRecord.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });

    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /:id - 删除错题记录
 */
router.delete('/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const existing = await prisma.wrongRecord.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '错题记录不存在' } });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ success: false, error: { message: '无权操作此记录' } });
      return;
    }

    await prisma.wrongRecord.delete({ where: { id } });

    res.json({ success: true, data: { message: '错题记录已删除' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
