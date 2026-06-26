import prisma from '../lib/prisma';
import { aiService } from './ai.service';

// ─── 类型定义 ───

interface ChatContext {
  feature?: string;
  pageContext?: string;
}

interface ChatResult {
  reply: string;
  metadata: {
    tokensUsed?: number;
    profileUpdated?: boolean;
  };
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  metadata: string;
  createdAt: Date;
}

interface ProactiveEvent {
  type: string;
  data: any;
}

interface ProactiveResult {
  shouldTrigger: boolean;
  message?: string;
}

// ─── 柯德性格预设的系统指令模板 ───

const PERSONALITY_INSTRUCTIONS: Record<string, string> = {
  mentor: `你说话风格稳重、专业，像一位资深程序员导师。
- 用简洁精准的语言回答问题
- 适时给出行业最佳实践和经验之谈
- 鼓励学生独立思考，点到为止`,
  lively: `你说话风格活泼、幽默，像一位同龄的编程伙伴。
- 适当使用 emoji 表情让对话更轻松 ✨
- 用类比和生活化例子解释抽象概念
- 会适时开玩笑，但不失专业性`,
  gentle: `你说话风格温柔、有耐心，像一位循循善诱的引导者。
- 用苏格拉底式提问引导学生自己发现答案
- 对错误保持包容，强调"错误是学习的一部分"
- 每次回答都确认学生是否理解`,
};

// ─── 模式能力描述 ───

const MODE_INSTRUCTIONS: Record<string, string> = {
  companion: `你是学生的学伴，主要职责：
- 帮助理解编程概念和题目
- 解释代码逻辑、调试错误
- 给予学习鼓励和方向建议
- 不直接给出完整答案，引导思考`,
  assistant: `你是教师的教学助理，主要职责：
- 协助课程设计和教学规划
- 生成班级学情分析报告
- 帮助出题和评估题目质量
- 提供教学策略建议`,
  management: `你是管理员的系统助手，主要职责：
- 提供系统运营数据洞察
- 协助内容审核和质量把控
- 生成运营报告和趋势分析
- 提供系统优化建议`,
};

// ─── CoderService 核心实现 ───

class CoderService {
  /**
   * 核心对话方法：接收用户消息，返回AI回复
   * 流程：加载画像 → 加载历史 → 构建prompt → 调用AI → 保存记录 → 定期更新画像
   */
  async chat(userId: string, message: string, context?: ChatContext): Promise<ChatResult> {
    const profile = await this.getUserProfile(userId);
    const recentHistory = await this.getHistory(userId, 10);

    const systemPrompt = this.buildSystemPrompt(profile, context);
    const messages = this.buildMessages(systemPrompt, recentHistory, message);

    // 调用 AI（复用已有的 AI 配置体系）
    const config = await aiService.getConfig();
    if (!config?.enabled || !config?.apiKey) {
      // AI 未配置时返回友好提示
      const fallbackReply = this.getFallbackGreeting(profile.personality);
      await this.saveMessage(userId, 'user', message, context);
      await this.saveMessage(userId, 'assistant', fallbackReply, undefined);
      return { reply: fallbackReply, metadata: {} };
    }

    const reply = await this.callCoderAI(messages, config);

    // 持久化对话记录
    await this.saveMessage(userId, 'user', message, context);
    await this.saveMessage(userId, 'assistant', reply, undefined);

    // 更新交互计数和活跃时间
    const newCount = profile.interactionCount + 1;
    await prisma.coderUserProfile.update({
      where: { userId },
      data: { interactionCount: newCount, lastActiveAt: new Date() },
    });

    // 每 N 次交互触发一次画像自动更新
    const updateInterval = await this.getConfigValue('coder_profile_update_interval', '10');
    if (newCount % parseInt(updateInterval) === 0) {
      // 异步执行，不阻塞响应
      this.updateProfileFromConversation(userId).catch(() => {});
    }

    return {
      reply,
      metadata: { profileUpdated: newCount % parseInt(updateInterval) === 0 },
    };
  }

  /**
   * 获取用户画像，不存在则自动创建默认画像
   */
  async getUserProfile(userId: string) {
    let profile = await prisma.coderUserProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.coderUserProfile.create({ data: { userId } });
    }
    return profile;
  }

  /**
   * 更新用户画像的可变字段
   */
  async updateUserProfile(userId: string, updates: {
    personality?: string;
    mode?: string;
    level?: string;
    preferredLang?: string;
    weakPoints?: string;
    strengths?: string;
    learningGoals?: string;
  }) {
    await this.getUserProfile(userId); // 确保存在
    return prisma.coderUserProfile.update({
      where: { userId },
      data: updates,
    });
  }

  /**
   * 获取对话历史（分页，按时间倒序）
   */
  async getHistory(userId: string, limit = 20, before?: string): Promise<ConversationMessage[]> {
    const maxHistory = await this.getConfigValue('coder_max_history_per_user', '100');
    const effectiveLimit = Math.min(limit, parseInt(maxHistory));

    const where: any = { userId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    return prisma.coderConversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: effectiveLimit,
    });
  }

  /**
   * 清除指定用户的全部对话历史
   */
  async clearHistory(userId: string) {
    await prisma.coderConversation.deleteMany({ where: { userId } });
  }

  /**
   * 主动提示判断：根据用户行为事件决定是否触发柯德主动关怀
   */
  async checkProactiveTrigger(userId: string, event: ProactiveEvent): Promise<ProactiveResult> {
    const enabled = await this.getConfigValue('coder_proactive_enabled', 'true');
    if (enabled !== 'true') {
      return { shouldTrigger: false };
    }

    const profile = await this.getUserProfile(userId);

    switch (event.type) {
      case 'idle_on_problem': {
        // 用户在解题页停留超过指定分钟未提交
        const idleMinutes = parseInt(await this.getConfigValue('coder_proactive_idle_minutes', '5'));
        if (event.data.minutes >= idleMinutes) {
          return {
            shouldTrigger: true,
            message: this.getProactiveMessage(profile.personality, 'idle'),
          };
        }
        break;
      }
      case 'consecutive_failures': {
        // 用户连续答错达到阈值
        const threshold = parseInt(await this.getConfigValue('coder_proactive_consecutive_failures', '3'));
        if (event.data.count >= threshold) {
          return {
            shouldTrigger: true,
            message: this.getProactiveMessage(profile.personality, 'failures'),
          };
        }
        break;
      }
      case 'inactive_return': {
        // 用户多日未访问后回归
        const daysSinceActive = event.data.daysSinceLastActive;
        if (daysSinceActive >= 3) {
          return {
            shouldTrigger: true,
            message: this.getProactiveMessage(profile.personality, 'return'),
          };
        }
        break;
      }
    }

    return { shouldTrigger: false };
  }

  // ─── 私有方法 ───

  /**
   * 构建系统提示词：包含身份、性格、模式、用户画像信息
   */
  private buildSystemPrompt(profile: any, context?: ChatContext): string {
    const coderName = '柯德';
    const personality = PERSONALITY_INSTRUCTIONS[profile.personality] || PERSONALITY_INSTRUCTIONS.gentle;
    const mode = MODE_INSTRUCTIONS[profile.mode] || MODE_INSTRUCTIONS.companion;

    const weakPoints = this.safeJsonParse<string[]>(profile.weakPoints, []);
    const strengths = this.safeJsonParse<string[]>(profile.strengths, []);
    const learningGoals = this.safeJsonParse<string[]>(profile.learningGoals, []);

    let prompt = `你是「${coderName}」，一个OJ（在线判题）平台的AI编程助手。

## 性格风格
${personality}

## 当前模式
${mode}

## 用户信息
- 编程水平：${profile.level === 'beginner' ? '初学者' : profile.level === 'intermediate' ? '中级' : '进阶'}
- 偏好语言：${profile.preferredLang}
- 累计交互：${profile.interactionCount} 次`;

    if (weakPoints.length > 0) {
      prompt += `\n- 薄弱点：${weakPoints.join('、')}`;
    }
    if (strengths.length > 0) {
      prompt += `\n- 擅长：${strengths.join('、')}`;
    }
    if (learningGoals.length > 0) {
      prompt += `\n- 学习目标：${learningGoals.join('、')}`;
    }

    if (context?.pageContext) {
      prompt += `\n\n## 当前上下文\n用户正在：${context.pageContext}`;
    }

    prompt += `\n\n## 重要规则
- 用中文回答
- 不直接给出完整题目答案，引导思考
- 回答简洁有重点，避免冗长
- 只回答与编程学习相关的问题`;

    return prompt;
  }

  /**
   * 组装发送给AI的完整消息列表（系统+历史+当前输入）
   */
  private buildMessages(systemPrompt: string, history: ConversationMessage[], userMessage: string) {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // 历史按时间正序排列（getHistory返回倒序，这里翻转）
    const chronological = [...history].reverse();
    for (const msg of chronological) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  /**
   * 调用AI接口，传入完整消息列表
   */
  private async callCoderAI(messages: Array<{ role: string; content: string }>, config: any): Promise<string> {
    const rawBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;
    const model = config.model || 'gpt-3.5-turbo';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).error?.message || `AI请求失败: ${response.status}`);
    }

    const data = await response.json();
    return (data as any).choices[0]?.message?.content || '抱歉，我暂时无法回答。';
  }

  /**
   * 保存单条对话消息到数据库
   */
  private async saveMessage(userId: string, role: string, content: string, context?: ChatContext) {
    await prisma.coderConversation.create({
      data: {
        userId,
        role,
        content,
        metadata: JSON.stringify({ feature: context?.feature, context: context?.pageContext }),
      },
    });
  }

  /**
   * AI分析近期对话，自动更新用户画像（薄弱点、擅长点等）
   * 仅在后台异步执行，不影响主对话流程
   */
  private async updateProfileFromConversation(userId: string) {
    const config = await aiService.getConfig();
    if (!config?.enabled || !config?.apiKey) return;

    const recentMessages = await prisma.coderConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (recentMessages.length < 5) return;

    const conversationText = recentMessages
      .reverse()
      .map((m) => `[${m.role}]: ${m.content.substring(0, 200)}`)
      .join('\n');

    const prompt = `根据以下用户与AI助手的对话记录，分析该用户的编程学习情况，返回JSON格式：

对话记录：
${conversationText}

请返回严格的JSON格式（不要其他文字）：
{
  "level": "beginner 或 intermediate 或 advanced",
  "weakPoints": ["薄弱点1", "薄弱点2"],
  "strengths": ["擅长点1", "擅长点2"],
  "customNotes": "一句话总结用户特征"
}`;

    try {
      const rawBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
      const baseUrl = rawBaseUrl.replace(/\/+$/, '');
      const endpoint = baseUrl.endsWith('/chat/completions')
        ? baseUrl
        : `${baseUrl}/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const content = (data as any).choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[0]);

      await prisma.coderUserProfile.update({
        where: { userId },
        data: {
          ...(parsed.level && { level: parsed.level }),
          ...(parsed.weakPoints && { weakPoints: JSON.stringify(parsed.weakPoints) }),
          ...(parsed.strengths && { strengths: JSON.stringify(parsed.strengths) }),
          ...(parsed.customNotes && { customNotes: parsed.customNotes }),
        },
      });
    } catch {
      // 画像更新失败不影响主流程，静默忽略
    }
  }

  /**
   * 根据性格和场景生成主动提示消息
   */
  private getProactiveMessage(personality: string, scenario: 'idle' | 'failures' | 'return'): string {
    const messages: Record<string, Record<string, string>> = {
      mentor: {
        idle: '看起来这道题有些难度。需要我给你分析一下思路吗？',
        failures: '连续几次没通过，建议我们一起分析一下错误原因。',
        return: '好久不见，准备好继续学习了吗？我们来回顾一下上次的进度。',
      },
      lively: {
        idle: '嘿，卡住了吗？别担心，我们一起想想办法！💪',
        failures: '哎呀，连续翻车了 😅 没关系，让我帮你看看哪里出了问题！',
        return: '好久不见！✨ 想我了吗？准备好继续冒险了吧！',
      },
      gentle: {
        idle: '慢慢来，不着急。如果需要帮助，随时告诉我哦。',
        failures: '我看到你遇到了一些困难，这很正常。要不要我们一起看看？',
        return: '好久不见呀，欢迎回来。想继续学习还是先聊聊？',
      },
    };

    return messages[personality]?.[scenario] || messages.gentle[scenario];
  }

  /**
   * AI未配置时的降级回复
   */
  private getFallbackGreeting(personality: string): string {
    const greetings: Record<string, string> = {
      mentor: '你好，我是柯德。AI服务暂未配置，但你可以先浏览平台功能。',
      lively: '嘿！我是柯德 ✨ AI还没配置好，不过我会尽快上线的！',
      gentle: '你好呀，我是柯德。AI服务还在准备中，请稍后再来找我聊天哦。',
    };
    return greetings[personality] || greetings.gentle;
  }

  /**
   * 从 CoderConfig 表读取配置值，不存在则返回默认值
   */
  private async getConfigValue(key: string, defaultValue: string): Promise<string> {
    const config = await prisma.coderConfig.findUnique({ where: { key } });
    return config?.value ?? defaultValue;
  }

  /**
   * 安全解析 JSON 字符串
   */
  private safeJsonParse<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  // ─── 管理员统计 ───

  /**
   * 获取柯德使用统计数据
   */
  async getStats() {
    const [totalConversations, totalUsers, activeToday] = await Promise.all([
      prisma.coderConversation.count(),
      prisma.coderUserProfile.count(),
      prisma.coderUserProfile.count({
        where: {
          lastActiveAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // 按性格分布
    const personalityDist = await prisma.coderUserProfile.groupBy({
      by: ['personality'],
      _count: true,
    });

    // 按模式分布
    const modeDist = await prisma.coderUserProfile.groupBy({
      by: ['mode'],
      _count: true,
    });

    return {
      totalConversations,
      totalUsers,
      activeToday,
      personalityDistribution: personalityDist.map((p) => ({ personality: p.personality, count: p._count })),
      modeDistribution: modeDist.map((m) => ({ mode: m.mode, count: m._count })),
    };
  }
}

export const coderService = new CoderService();
