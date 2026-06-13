import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { aiService } from '../services/ai.service';
import prisma from '../lib/prisma';

const router = Router();

// ── 公开接口：获取指定游戏类型的活跃内容（随机子集） ──
router.get('/content', async (req: Request, res: any) => {
  try {
    const { gameType, limit } = req.query;
    if (!gameType) {
      res.status(400).json({ success: false, error: { message: '缺少 gameType 参数' } });
      return;
    }

    const maxItems = Math.min(Number(limit) || 10, 50);

    // 获取所有活跃内容，随机打乱后返回子集
    const allContent = await prisma.miniGameContent.findMany({
      where: { gameType: String(gameType), isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Fisher-Yates 随机抽样
    const shuffled = [...allContent];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const items = shuffled.slice(0, maxItems).map((item) => ({
      ...item,
      content: JSON.parse(item.content),
      tags: JSON.parse(item.tags),
    }));

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：获取所有内容（支持分页） ──
router.get('/admin/content', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { gameType, page, pageSize } = req.query;
    const where: any = {};
    if (gameType) where.gameType = String(gameType);

    const total = await prisma.miniGameContent.count({ where });
    const currentPage = Math.max(Number(page) || 1, 1);
    const size = Math.min(Number(pageSize) || 50, 100);

    const items = await prisma.miniGameContent.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (currentPage - 1) * size,
      take: size,
    });

    const parsed = items.map((item) => ({
      ...item,
      content: JSON.parse(item.content),
      tags: JSON.parse(item.tags),
    }));

    res.json({ success: true, data: { items: parsed, total, page: currentPage, pageSize: size } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：创建内容 ──
router.post('/admin/content', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { gameType, title, content, difficulty, tags, isActive, sortOrder } = req.body;
    if (!gameType || !title || !content) {
      res.status(400).json({ success: false, error: { message: '缺少必填字段: gameType, title, content' } });
      return;
    }

    const userId = (req as any).user.userId;

    const item = await prisma.miniGameContent.create({
      data: {
        gameType,
        title,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        difficulty: difficulty || 'MEDIUM',
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
        createdBy: userId,
      },
    });

    res.json({ success: true, data: { ...item, content: JSON.parse(item.content), tags: JSON.parse(item.tags) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：更新内容 ──
router.put('/admin/content/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const { title, content, difficulty, tags, isActive, sortOrder } = req.body;

    const existing = await prisma.miniGameContent.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '内容不存在' } });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = typeof content === 'string' ? content : JSON.stringify(content);
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? tags : JSON.stringify(tags);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const item = await prisma.miniGameContent.update({ where: { id }, data: updateData });

    res.json({ success: true, data: { ...item, content: JSON.parse(item.content), tags: JSON.parse(item.tags) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：删除内容 ──
router.delete('/admin/content/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.miniGameContent.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '内容不存在' } });
      return;
    }

    await prisma.miniGameContent.delete({ where: { id } });
    res.json({ success: true, data: { message: '删除成功' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：AI 批量生成内容（返回预览供管理员确认） ──
router.post('/admin/ai-generate', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { gameType, count, difficulty, topic } = req.body;
    if (!gameType || !count) {
      res.status(400).json({ success: false, error: { message: '缺少必填字段: gameType, count' } });
      return;
    }

    const actualCount = Math.min(Number(count), 20);
    const actualDifficulty = difficulty || 'MEDIUM';
    const actualTopic = topic || '编程基础';

    // 根据游戏类型构建不同的 AI 提示词
    const prompt = buildGenerationPrompt(gameType, actualCount, actualDifficulty, actualTopic);

    const config = await aiService.getConfig();
    if (!config?.apiKey) {
      res.status(400).json({ success: false, error: { message: 'AI 服务未配置，请先在 AI 设置中配置密钥' } });
      return;
    }

    const userId = (req as any).user.userId;
    const rawResponse = await (aiService as any).callAI(prompt, config, 'minigame-generate', userId);

    // 解析 AI 返回的 JSON
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      res.status(500).json({ success: false, error: { message: 'AI 返回格式不正确，请重试' } });
      return;
    }

    const generated = JSON.parse(jsonMatch[0]);
    // 返回生成的内容供管理员预览和选择保存
    res.json({ success: true, data: generated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 根据游戏类型构建 AI 生成提示词
 */
function buildGenerationPrompt(gameType: string, count: number, difficulty: string, topic: string): string {
  const difficultyLabel = { EASY: '简单', MEDIUM: '中等', HARD: '困难' }[difficulty] || '中等';

  switch (gameType) {
    case 'code_quiz':
      return `请生成 ${count} 道「猜代码输出」题目，主题: ${topic}，难度: ${difficultyLabel}。
要求：
- 每题包含一段简短代码片段（Python 或 JavaScript）
- 提供 4 个选项，其中 1 个正确答案
- 代码片段应短小精悍（1-3行），结果不那么明显

请严格按以下 JSON 数组格式输出，不要附加任何解释文字：
[
  {
    "title": "题目简短描述",
    "content": {
      "code": "代码片段",
      "lang": "Python 或 JavaScript",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": 0
    }
  }
]
其中 answer 是正确选项的索引（0-3）。`;

    case 'daily_quiz':
      return `请生成 ${count} 道编程概念选择题，主题: ${topic}，难度: ${difficultyLabel}。
要求：
- 每题考察一个编程/计算机科学概念
- 提供 4 个选项，其中 1 个正确答案
- 题目简洁明确

请严格按以下 JSON 数组格式输出，不要附加任何解释文字：
[
  {
    "title": "题目简短描述",
    "content": {
      "question": "完整题目文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": 0
    }
  }
]
其中 answer 是正确选项的索引（0-3）。`;

    case 'flash_card':
      return `请生成 ${count} 张知识闪卡，主题: ${topic}，难度: ${difficultyLabel}。
要求：
- 正面是一个概念名称或简短问题
- 背面是清晰的解释 + 简短示例

请严格按以下 JSON 数组格式输出，不要附加任何解释文字：
[
  {
    "title": "概念名称",
    "content": {
      "front": "正面文本（概念名/问题）",
      "back": "背面文本（解释 + 示例）"
    }
  }
]`;

    case 'typing_challenge':
      return `请生成 ${count} 段代码打字练习片段，主题: ${topic}，难度: ${difficultyLabel}。
要求：
- 每段代码是一行有意义的代码（20-60 个字符）
- 使用 JavaScript/TypeScript/Python 常见语法
- 难度渐进，涵盖变量声明、函数调用、条件语句等

请严格按以下 JSON 数组格式输出，不要附加任何解释文字：
[
  {
    "title": "代码片段简短描述",
    "content": {
      "code": "一行代码"
    }
  }
]`;

    default:
      return `请生成 ${count} 个编程学习内容，主题: ${topic}，难度: ${difficultyLabel}。以 JSON 数组格式返回。`;
  }
}

export default router;
