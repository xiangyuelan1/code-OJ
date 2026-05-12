import prisma from '../lib/prisma';

export interface TestCase {
  input: string;
  output: string;
  isSample?: boolean;
}

export interface ProblemSolution {
  title: string;
  content: string;
  code?: string;
  complexity?: {
    time: string;
    space: string;
  };
  keyPoints?: string[];
  generatedBy: 'AI' | 'MANUAL';
  generatedAt: string;
}

export interface KnowledgeNode {
  id?: string;
  name: string;
  description?: string;
  parentId?: string | null;
  level: 1 | 2;
  order?: number;
  children?: KnowledgeNode[];
}

export class AIService {
  async getConfig() {
    const config = await prisma.aIConfig.findFirst();
    if (!config) return null;
    
    return {
      enabled: config.enabled,
      provider: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model
    };
  }

  async updateConfig(data: any) {
    const existing = await prisma.aIConfig.findFirst();
    
    if (existing) {
      return await prisma.aIConfig.update({
        where: { id: existing.id },
        data: {
          enabled: data.enabled ?? existing.enabled,
          provider: data.provider ?? existing.provider,
          apiKey: data.apiKey ?? existing.apiKey,
          baseUrl: data.baseUrl ?? existing.baseUrl,
          model: data.model ?? existing.model
        }
      });
    } else {
      return await prisma.aIConfig.create({
        data: {
          enabled: data.enabled ?? false,
          provider: data.provider ?? 'openai',
          apiKey: data.apiKey ?? null,
          baseUrl: data.baseUrl ?? null,
          model: data.model ?? 'gpt-3.5-turbo'
        }
      });
    }
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.enabled ?? false;
  }

  async explainCode(code: string, language: string): Promise<string> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `请详细解释以下${language}代码，逐行说明其功能和逻辑：\n\n${code}`;
    return await this.callAI(prompt, config);
  }

  async getHint(problem: { title: string; description: string }, context?: string): Promise<string> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `题目：${problem.title}\n\n${problem.description}\n\n请给出解题思路提示，不要直接给出完整答案。可以提示关键算法、数据结构或解题方向。${context ? `\n\n用户当前进度：${context}` : ''}`;
    return await this.callAI(prompt, config);
  }

  async diagnoseError(code: string, language: string, error: string): Promise<string> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `以下${language}代码执行出错，请分析错误原因并给出修复建议：\n\n错误信息：\n${error}\n\n代码：\n${code}`;
    return await this.callAI(prompt, config);
  }

  async generateSolution(problem: { title: string; description: string; type: string }): Promise<ProblemSolution> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `请为以下题目生成详细的题解。请以JSON格式返回，包含以下字段：
- title: 题解标题
- content: 详细解题步骤（Markdown格式）
- code: 参考代码（如果适用）
- complexity: 包含time和space的复杂度对象
- keyPoints: 关键点数组

题目：${problem.title}

${problem.description}

要求：
1. 详细说明解题思路
2. 提供代码实现（如适用）
3. 分析时间和空间复杂度
4. 列出关键知识点`;

    const response = await this.callAI(prompt, config);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          generatedBy: 'AI',
          generatedAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
    }

    return {
      title: '解题思路',
      content: response,
      generatedBy: 'AI',
      generatedAt: new Date().toISOString()
    };
  }

  async generateTestCases(problem: { title: string; description: string }): Promise<TestCase[]> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `请为以下编程题生成5个测试用例（包括边界条件）。请以JSON数组格式返回，每个元素包含：
- input: 输入（字符串）
- output: 期望输出（字符串）
- isSample: 是否为示例（第一个为true，其余为false）

题目：${problem.title}

${problem.description}

要求：
1. 包含常规测试用例
2. 包含边界条件测试用例
3. 确保测试用例能有效区分正确和错误解法`;

    const response = await this.callAI(prompt, config);
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
    }

    return [];
  }

  async parseFileToKnowledgeTree(content: string): Promise<KnowledgeNode[]> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `请分析以下文本内容，识别知识点并生成两层知识树结构。

文本内容：
${content}

要求：
1. 第一层：主要知识分类（不超过10个）
2. 第二层：具体的知识点（每个分类下2-5个）
3. 使用中文命名
4. 简洁准确

请以JSON格式返回，包含以下结构的数组：
{
  "knowledgeTree": [
    {
      "name": "一级分类名称",
      "description": "分类描述",
      "level": 1,
      "children": [
        {
          "name": "二级知识点名称",
          "description": "知识点描述",
          "level": 2
        }
      ]
    }
  ]
}`;

    const response = await this.callAI(prompt, config);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.knowledgeTree) {
          return this.processKnowledgeTree(parsed.knowledgeTree);
        }
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
    }

    return [];
  }

  private processKnowledgeTree(tree: any[]): KnowledgeNode[] {
    let order = 0;
    return tree.map(node => ({
      name: node.name,
      description: node.description,
      level: 1 as const,
      order: order++,
      children: node.children?.map((child: any) => ({
        name: child.name,
        description: child.description,
        level: 2 as const,
        order: 0
      })) || []
    }));
  }

  async classifyProblem(problem: { title: string; description: string; type: string }, knowledgeTree: KnowledgeNode[]): Promise<{ nodeIds: string[]; reason: string }> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `请分析以下题目，判断它属于哪些知识节点。

题目：${problem.title}
描述：${problem.description}
类型：${problem.type}

请从以下知识树中选择最合适的节点ID：
${JSON.stringify(knowledgeTree, null, 2)}

请以JSON格式返回：
{
  "nodeIds": ["推荐的节点ID数组"],
  "reason": "推荐理由"
}`;

    const response = await this.callAI(prompt, config);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
    }

    return { nodeIds: [], reason: '无法确定分类' };
  }

  async parseProblemFile(content: string, fileType: string): Promise<any[]> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `你是一个专业的编程教师。请从以下${fileType}文件中提取题目信息。

文件内容：
${content}

要求：
1. 识别题目类型（PROGRAMMING/CHOICE/FILL_BLANK）
2. 提取题目描述（Markdown格式）
3. 对于编程题，生成测试用例
4. 对于选择题，提取选项和正确答案
5. 对于填空题，提取填空答案

请以JSON数组格式返回，每个题目包含：
{
  "title": "题目标题",
  "description": "题目描述",
  "type": "PROGRAMMING|CHOICE|FILL_BLANK",
  "difficulty": "EASY|MEDIUM|HARD",
  "testCases": [...],  // 编程题
  "choices": [...],    // 选择题
  "correctAnswer": "...", // 答案
  "fillBlanks": [...]  // 填空题答案
}`;

    const response = await this.callAI(prompt, config);
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
    }

    return [];
  }

  private async callAI(prompt: string, config: any): Promise<string> {
    const apiKey = config.apiKey;
    const rawBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const model = config.model || 'gpt-3.5-turbo';

    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: '你是一位专业的编程教练，擅长解释代码、提供解题思路、帮助调试程序、生成测试用例和题解。请用中文回答。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '未获得有效回复';
    } catch (error: any) {
      if (error.message.includes('AI功能未启用') || error.message.includes('AI API未配置')) {
        throw error;
      }
      throw new Error(`AI服务调用失败: ${error.message}`);
    }
  }
}

export const aiService = new AIService();
