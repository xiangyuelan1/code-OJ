import prisma from '../lib/prisma';
import { aiService } from './ai.service';

export class CourseService {
  // ========== 课程 CRUD ==========

  /** 获取班级的所有课程（含阶段和讲次） */
  async getCoursesByClass(classId: string) {
    return prisma.course.findMany({
      where: { classId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            sessions: { orderBy: { order: 'asc' } },
          },
        },
        creator: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 获取单个课程详情 */
  async getCourseById(courseId: string) {
    return prisma.course.findUnique({
      where: { id: courseId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            sessions: { orderBy: { order: 'asc' } },
          },
        },
        creator: { select: { id: true, username: true } },
        class: { select: { id: true, name: true } },
      },
    });
  }

  /** 创建课程 */
  async createCourse(data: { classId: string; name: string; description?: string; createdBy: string }) {
    return prisma.course.create({
      data: {
        classId: data.classId,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
      },
      include: { stages: true },
    });
  }

  /** 更新课程 */
  async updateCourse(courseId: string, data: { name?: string; description?: string }) {
    return prisma.course.update({
      where: { id: courseId },
      data,
    });
  }

  /** 删除课程（级联删除阶段和讲次） */
  async deleteCourse(courseId: string) {
    return prisma.course.delete({ where: { id: courseId } });
  }

  // ========== 阶段 CRUD ==========

  /** 添加阶段 */
  async createStage(courseId: string, name: string) {
    // 获取当前最大 order
    const maxOrder = await prisma.courseStage.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;

    return prisma.courseStage.create({
      data: { courseId, name, order },
      include: { sessions: true },
    });
  }

  /** 更新阶段 */
  async updateStage(stageId: string, data: { name?: string; order?: number }) {
    return prisma.courseStage.update({
      where: { id: stageId },
      data,
    });
  }

  /** 删除阶段 */
  async deleteStage(stageId: string) {
    return prisma.courseStage.delete({ where: { id: stageId } });
  }

  // ========== 讲次 CRUD ==========

  /** 添加讲次 */
  async createSession(stageId: string, name: string) {
    const maxOrder = await prisma.courseSession.aggregate({
      where: { stageId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;

    return prisma.courseSession.create({
      data: { stageId, name, order },
    });
  }

  /** 更新讲次 */
  async updateSession(sessionId: string, data: {
    name?: string;
    order?: number;
    problemIds?: string;
    materialText?: string;
    examId?: string | null;
  }) {
    return prisma.courseSession.update({
      where: { id: sessionId },
      data,
    });
  }

  /** 删除讲次 */
  async deleteSession(sessionId: string) {
    return prisma.courseSession.delete({ where: { id: sessionId } });
  }

  // ========== 学生学习进度 ==========

  /** 获取学生在某课程的学习进度 */
  async getStudentProgress(userId: string, courseId: string) {
    return prisma.courseProgress.findMany({
      where: { userId, courseId },
    });
  }

  /** 更新学习进度 */
  async updateProgress(userId: string, courseId: string, sessionId: string, status: string) {
    const data: any = { status };
    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    }
    return prisma.courseProgress.upsert({
      where: { userId_sessionId: { userId, sessionId } },
      update: data,
      create: { userId, courseId, sessionId, ...data },
    });
  }

  // ========== AI 智能生成课程大纲 ==========

  /**
   * AI 生成课程大纲
   * 输入：课程主题、学时数、难度、知识点范围
   * 输出：阶段 + 讲次结构（含推荐题目标签）
   */
  async aiGenerateCourseOutline(params: {
    topic: string;
    totalSessions: number;
    difficulty: string;
    knowledgePoints?: string[];
    classId: string;
    createdBy: string;
  }) {
    const config = await aiService.getConfig();
    if (!config?.enabled || !config?.apiKey) {
      throw new Error('AI 功能未启用或未配置 API Key');
    }

    const prompt = `你是一位编程教育课程设计专家。请根据以下需求设计一份完整的课程大纲：

课程主题：${params.topic}
计划讲次数：${params.totalSessions}
难度等级：${params.difficulty}
${params.knowledgePoints?.length ? `重点知识点：${params.knowledgePoints.join('、')}` : ''}

请输出 JSON 格式的课程大纲，结构如下：
{
  "name": "课程名称",
  "description": "课程简介（1-2句话）",
  "stages": [
    {
      "name": "阶段名称",
      "sessions": [
        {
          "name": "讲次名称",
          "materialText": "本讲核心知识点概述（50-100字）",
          "suggestedTags": ["推荐题目标签1", "推荐题目标签2"]
        }
      ]
    }
  ]
}

要求：
1. 合理划分为2-5个阶段，由浅入深递进
2. 每个阶段包含2-5个讲次
3. 总讲次数约为 ${params.totalSessions}
4. 每讲次的知识点概述要具体，不要空泛
5. suggestedTags 用于后续从题库中匹配推荐题目

仅返回 JSON，不要有其他文字。`;

    // 通过 AI 配置调用 API（与 ai.service.ts 中 callAI 相同模式）
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
        model: (config as any).model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一位专业的编程教育课程设计专家。请严格按照要求返回 JSON 格式，不要包含任何多余文字。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).error?.message || `AI API 请求失败: ${response.status}`);
    }

    const responseData = await response.json();
    const content = (responseData as any).choices[0]?.message?.content || '';

    // 从 AI 返回内容中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 生成课程大纲失败：无法解析返回的 JSON');
    }

    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI 生成课程大纲失败：JSON 解析错误');
    }

    if (!result.stages || !Array.isArray(result.stages)) {
      throw new Error('AI 生成课程大纲失败：返回结构不完整');
    }

    // 将 AI 结果写入数据库
    const course = await prisma.course.create({
      data: {
        classId: params.classId,
        name: result.name || params.topic,
        description: result.description || '',
        createdBy: params.createdBy,
        stages: {
          create: result.stages.map((stage: any, stageIdx: number) => ({
            name: stage.name,
            order: stageIdx,
            sessions: {
              create: (stage.sessions || []).map((session: any, sessIdx: number) => ({
                name: session.name,
                order: sessIdx,
                materialText: session.materialText || '',
                problemIds: JSON.stringify([]),
              })),
            },
          })),
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { sessions: { orderBy: { order: 'asc' } } },
        },
      },
    });

    // 收集所有讲次的推荐标签，供前端展示
    const suggestedTags = result.stages.flatMap(
      (s: any) => s.sessions?.map((sess: any) => sess.suggestedTags) || []
    );

    return { course, suggestedTags };
  }

  // ========== AI 辅助方法（内部） ==========

  /**
   * 调用AI并解析JSON结果
   * 复用 aiService.getConfig() 获取配置，与 aiGenerateCourseOutline 保持一致
   */
  private async callAIForCourse(prompt: string, _feature: string, userId: string): Promise<any> {
    const content = await this.callAIRaw(prompt, _feature, userId);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 返回格式异常');
    return JSON.parse(jsonMatch[0]);
  }

  /**
   * 调用AI获取原始文本结果
   * 遵循已有 aiGenerateCourseOutline 中的调用模式
   */
  private async callAIRaw(prompt: string, feature: string, userId: string): Promise<string> {
    const config = await aiService.getConfig();
    if (!config?.enabled || !config?.apiKey) {
      throw new Error('AI 功能未启用或未配置 API Key');
    }

    const rawBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;
    const model = (config as any).model || 'gpt-3.5-turbo';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).error?.message || `AI API 请求失败: ${response.status}`);
    }

    const responseData = await response.json();
    const content = (responseData as any).choices?.[0]?.message?.content?.trim() || '';

    // 记录AI用量
    const usage = (responseData as any).usage;
    const promptTokens = usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
    const completionTokens = usage?.completion_tokens ?? Math.ceil(content.length / 4);
    try {
      await prisma.aIUsageLog.create({
        data: {
          userId,
          feature,
          model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost: 0,
        },
      });
    } catch {}

    return content;
  }

  // ========== AI 补全课程大纲 ==========

  /**
   * AI 补全课程大纲
   * 教师已写部分讲次，AI 根据已有内容和课程目标补全剩余讲次
   */
  async aiCompleteSyllabus(params: {
    courseId: string;
    targetTotal: number;
    userId: string;
  }) {
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { sessions: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!course) throw new Error('课程不存在');

    // 构建已有讲次描述
    const existingSessions = course.stages.flatMap(s =>
      s.sessions.map(sess => `${s.name} - ${sess.name}`)
    );

    const prompt = `你是编程教学课程设计专家。以下课程已有部分讲次，请补全至约 ${params.targetTotal} 讲。

课程名称：${course.name}
课程描述：${course.description || '无'}

已有讲次：
${existingSessions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

请补全剩余的讲次。要求：
1. 与已有内容逻辑衔接，由浅入深
2. 不重复已有讲次的内容
3. 合理划分到现有阶段或新增阶段中

返回 JSON 格式：
{
  "newStages": [
    {
      "name": "阶段名称（可以是现有阶段名，表示往里添加讲次）",
      "isExisting": true/false,
      "sessions": [
        { "name": "讲次名称", "materialText": "知识点概述（30-50字）" }
      ]
    }
  ]
}

仅返回 JSON。`;

    const result = await this.callAIForCourse(prompt, 'course-complete-syllabus', params.userId);

    if (!result?.newStages) throw new Error('AI 补全失败，请重试');

    // 将补全结果写入数据库
    for (const stageData of result.newStages) {
      if (stageData.isExisting) {
        // 往已有阶段追加讲次
        const existingStage = course.stages.find(s => s.name === stageData.name);
        if (existingStage) {
          const maxOrder = existingStage.sessions.length;
          for (let i = 0; i < (stageData.sessions || []).length; i++) {
            await prisma.courseSession.create({
              data: {
                stageId: existingStage.id,
                name: stageData.sessions[i].name,
                order: maxOrder + i,
                materialText: stageData.sessions[i].materialText || '',
              },
            });
          }
        }
      } else {
        // 创建新阶段
        const maxStageOrder = course.stages.length;
        await prisma.courseStage.create({
          data: {
            courseId: params.courseId,
            name: stageData.name,
            order: maxStageOrder + result.newStages.indexOf(stageData),
            sessions: {
              create: (stageData.sessions || []).map((sess: any, idx: number) => ({
                name: sess.name,
                order: idx,
                materialText: sess.materialText || '',
              })),
            },
          },
        });
      }
    }

    // 返回更新后的完整课程
    return this.getCourseById(params.courseId);
  }

  // ========== AI 生成讲次内容 ==========

  /**
   * AI 生成讲次详细内容
   * 根据讲次名称、关键词、参考材料生成完整教学资料
   */
  async aiGenerateSessionContent(params: {
    sessionId: string;
    keywords?: string[];
    referenceText?: string;
    userId: string;
  }) {
    const session = await prisma.courseSession.findUnique({
      where: { id: params.sessionId },
      include: { stage: { include: { course: true } } },
    });

    if (!session) throw new Error('讲次不存在');

    const prompt = `你是编程教学内容设计专家。请为以下讲次生成详细的教学资料。

课程：${session.stage.course.name}
阶段：${session.stage.name}
讲次：${session.name}
${params.keywords?.length ? `关键知识点：${params.keywords.join('、')}` : ''}
${params.referenceText ? `教师提供的参考材料：\n${params.referenceText}` : ''}

请生成以 Markdown 格式的教学资料，包含：
1. 本讲学习目标（2-3点）
2. 核心知识点讲解（含代码示例）
3. 易错点提醒
4. 课后练习建议

内容面向编程初学者，语言简洁清晰，代码示例使用 Python。
字数控制在 500-1000 字。

直接输出 Markdown 内容，不要包裹在 JSON 中。`;

    const content = await this.callAIRaw(prompt, 'course-generate-content', params.userId);

    // 更新讲次资料
    await prisma.courseSession.update({
      where: { id: params.sessionId },
      data: { materialText: content },
    });

    return { sessionId: params.sessionId, materialText: content };
  }

  // ========== AI 智能选题 ==========

  /**
   * AI 智能推荐题目
   * 根据讲次知识点和班级水平从题库中推荐适合的题目
   */
  async aiRecommendProblems(params: {
    sessionId: string;
    count?: number;
    userId: string;
  }) {
    const session = await prisma.courseSession.findUnique({
      where: { id: params.sessionId },
      include: { stage: { include: { course: { include: { class: true } } } } },
    });

    if (!session) throw new Error('讲次不存在');

    // 获取题库中的所有题目摘要
    const problems = await prisma.problem.findMany({
      select: { id: true, title: true, difficulty: true, tags: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    if (problems.length === 0) {
      return { recommendations: [], message: '题库为空，无法推荐' };
    }

    // 已选过的题目（避免重复）
    const existingIds: string[] = JSON.parse(session.problemIds || '[]');

    const prompt = `你是编程教育选题专家。请从以下题库中为讲次推荐 ${params.count || 5} 道练习题。

讲次名称：${session.name}
讲次资料摘要：${(session.materialText || '').slice(0, 200)}
课程难度：中等

已选择的题目ID（需排除）：${existingIds.join(', ')}

题库列表（格式：ID | 标题 | 难度 | 标签）：
${problems.slice(0, 100).map(p => `${p.id} | ${p.title} | ${p.difficulty} | ${p.tags || ''}`).join('\n')}

请选择与讲次知识点最匹配的 ${params.count || 5} 道题，返回 JSON：
{
  "recommendations": [
    { "problemId": "题目ID", "reason": "推荐理由（10字内）" }
  ]
}

仅返回 JSON。`;

    const result = await this.callAIForCourse(prompt, 'course-recommend-problems', params.userId);

    if (!result?.recommendations) {
      return { recommendations: [], message: 'AI 推荐失败' };
    }

    // 验证推荐的题目ID确实存在
    const validIds = new Set(problems.map(p => p.id));
    const validRecommendations = result.recommendations.filter(
      (r: any) => validIds.has(r.problemId) && !existingIds.includes(r.problemId)
    );

    // 附带题目详情
    const recommended = validRecommendations.map((r: any) => {
      const problem = problems.find(p => p.id === r.problemId);
      return { ...r, title: problem?.title, difficulty: problem?.difficulty };
    });

    return { recommendations: recommended };
  }

  // ========== AI 润色内容 ==========

  /**
   * AI 润色/补全教师已有的讲次资料
   */
  async aiPolishContent(params: {
    sessionId: string;
    originalText: string;
    instruction?: string;
    userId: string;
  }) {
    const session = await prisma.courseSession.findUnique({
      where: { id: params.sessionId },
      include: { stage: { include: { course: true } } },
    });

    if (!session) throw new Error('讲次不存在');

    const prompt = `你是编程教学内容编辑专家。请对以下教师编写的讲次资料进行润色和完善。

课程：${session.stage.course.name}
讲次：${session.name}
${params.instruction ? `教师要求：${params.instruction}` : ''}

原始内容：
${params.originalText}

请对内容进行以下优化：
1. 补充缺失的知识点细节
2. 添加代码示例（如有需要）
3. 改善结构和可读性（使用 Markdown 格式）
4. 保留教师原有的核心表达和教学思路
5. 不要改变教学方向，只做润色和补全

直接输出优化后的 Markdown 内容。`;

    const content = await this.callAIRaw(prompt, 'course-polish-content', params.userId);

    return { sessionId: params.sessionId, polishedText: content };
  }
}

export const courseService = new CourseService();
