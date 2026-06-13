import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { aiService } from '../services/ai.service';
import prisma from '../lib/prisma';

const router = Router();

// ── 公开接口：获取所有已上架伙伴 ──
router.get('/list', async (_req: Request, res: any) => {
  try {
    const companions = await prisma.spaceCompanion.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const parsed = companions.map((c) => ({
      ...c,
      stats: JSON.parse(c.stats),
      skills: JSON.parse(c.skills),
    }));

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：获取所有伙伴（含未上架） ──
router.get('/admin/list', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { rarity } = req.query;
    const where: any = {};
    if (rarity && rarity !== 'ALL') where.rarity = String(rarity);

    const companions = await prisma.spaceCompanion.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const parsed = companions.map((c) => ({
      ...c,
      stats: JSON.parse(c.stats),
      skills: JSON.parse(c.skills),
    }));

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：创建伙伴 ──
router.post('/admin/create', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const {
      name, description, rarity, personality, appearance,
      stats, skills, unlockCondition, unlockType, unlockValue,
      isActive, isDefault, sortOrder,
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: { message: '伙伴名称不能为空' } });
      return;
    }

    const companion = await prisma.spaceCompanion.create({
      data: {
        name,
        description: description || '',
        rarity: rarity || 'COMMON',
        personality: personality || '',
        appearance: appearance || '',
        stats: typeof stats === 'string' ? stats : JSON.stringify(stats || {}),
        skills: typeof skills === 'string' ? skills : JSON.stringify(skills || []),
        unlockCondition: unlockCondition || '',
        unlockType: unlockType || 'level',
        unlockValue: unlockValue ?? 1,
        isActive: isActive ?? false,
        isDefault: isDefault ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    res.json({
      success: true,
      data: { ...companion, stats: JSON.parse(companion.stats), skills: JSON.parse(companion.skills) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：更新伙伴 ──
router.put('/admin/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.spaceCompanion.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '伙伴不存在' } });
      return;
    }

    const {
      name, description, rarity, personality, appearance,
      stats, skills, unlockCondition, unlockType, unlockValue,
      isActive, isDefault, sortOrder,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (rarity !== undefined) updateData.rarity = rarity;
    if (personality !== undefined) updateData.personality = personality;
    if (appearance !== undefined) updateData.appearance = appearance;
    if (stats !== undefined) updateData.stats = typeof stats === 'string' ? stats : JSON.stringify(stats);
    if (skills !== undefined) updateData.skills = typeof skills === 'string' ? skills : JSON.stringify(skills);
    if (unlockCondition !== undefined) updateData.unlockCondition = unlockCondition;
    if (unlockType !== undefined) updateData.unlockType = unlockType;
    if (unlockValue !== undefined) updateData.unlockValue = unlockValue;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const companion = await prisma.spaceCompanion.update({ where: { id }, data: updateData });

    res.json({
      success: true,
      data: { ...companion, stats: JSON.parse(companion.stats), skills: JSON.parse(companion.skills) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：删除伙伴 ──
router.delete('/admin/:id', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.spaceCompanion.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '伙伴不存在' } });
      return;
    }

    await prisma.spaceCompanion.delete({ where: { id } });
    res.json({ success: true, data: { message: '删除成功' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：切换上架/下架 ──
router.put('/admin/:id/publish', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.spaceCompanion.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { message: '伙伴不存在' } });
      return;
    }

    const companion = await prisma.spaceCompanion.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json({
      success: true,
      data: { ...companion, stats: JSON.parse(companion.stats), skills: JSON.parse(companion.skills) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ── 管理接口：AI 批量生成伙伴（返回预览供确认） ──
router.post('/admin/ai-generate', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { count, rarity, theme } = req.body;
    if (!count) {
      res.status(400).json({ success: false, error: { message: '缺少必填字段: count' } });
      return;
    }

    const actualCount = Math.min(Number(count), 10);
    const actualRarity = rarity || 'COMMON';
    const actualTheme = theme || '宇宙探索';

    const rarityLabel: Record<string, string> = {
      COMMON: '普通',
      RARE: '稀有',
      EPIC: '史诗',
      LEGENDARY: '传说',
    };

    const prompt = `你是一位创意游戏设计师，正在为一个编程学习平台设计太空伙伴/宠物。
请生成 ${actualCount} 个太空伙伴，稀有度为「${rarityLabel[actualRarity] || '普通'}」，主题为「${actualTheme}」。

每个伙伴需要包含：
- name: 伙伴名称（2-4个字，有太空/科幻感）
- description: 一句话描述（15-30字）
- personality: 性格描述（20-50字，有趣生动）
- appearance: 外观描述（30-60字，适合作为图片生成prompt）
- stats: 属性值对象，包含 intelligence(智力)、creativity(创造力)、persistence(毅力)、speed(速度)、luck(幸运)，每项1-100的整数
  - ${actualRarity === 'COMMON' ? '普通稀有度总属性点约200-250' : ''}${actualRarity === 'RARE' ? '稀有稀有度总属性点约250-320' : ''}${actualRarity === 'EPIC' ? '史诗稀有度总属性点约320-400' : ''}${actualRarity === 'LEGENDARY' ? '传说稀有度总属性点约400-480' : ''}
  - 每个伙伴应有突出和短板属性，不要五维均匀
- skills: 技能数组，每个技能有 name(名称) 和 effect(效果描述)，${actualRarity === 'COMMON' ? '1个技能' : ''}${actualRarity === 'RARE' ? '2个技能' : ''}${actualRarity === 'EPIC' ? '2-3个技能' : ''}${actualRarity === 'LEGENDARY' ? '3个技能' : ''}
- unlockCondition: 解锁条件描述（如"达到5级"、"连续签到7天"等）
- unlockType: 解锁类型，从 level/achievement/streak/purchase 中选择
- unlockValue: 解锁所需数值

要求：
1. 名字要有创意和辨识度，带有太空/科幻元素
2. 性格要多样化，有的活泼有的沉稳有的搞怪
3. 技能效果与编程学习相关（如"刷题时有概率获得双倍经验"等）
4. 属性分配要有特色，每个伙伴有明显的强项和弱项

请严格按以下 JSON 数组格式输出，不要附加任何解释文字：
[
  {
    "name": "...",
    "description": "...",
    "personality": "...",
    "appearance": "...",
    "stats": { "intelligence": 80, "creativity": 60, "persistence": 70, "speed": 50, "luck": 40 },
    "skills": [{ "name": "...", "effect": "..." }],
    "unlockCondition": "...",
    "unlockType": "level",
    "unlockValue": 5
  }
]`;

    const config = await aiService.getConfig();
    if (!config?.apiKey) {
      res.status(400).json({ success: false, error: { message: 'AI 服务未配置，请先在 AI 设置中配置密钥' } });
      return;
    }

    const userId = (req as any).user.userId;
    const rawResponse = await (aiService as any).callAI(prompt, config, 'companion-generate', userId);

    // 解析 AI 返回的 JSON 数组
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      res.status(500).json({ success: false, error: { message: 'AI 返回格式不正确，请重试' } });
      return;
    }

    const generated = JSON.parse(jsonMatch[0]);

    // 补充稀有度字段
    const result = generated.map((item: any) => ({
      ...item,
      rarity: actualRarity,
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
