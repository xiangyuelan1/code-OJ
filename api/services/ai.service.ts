import prisma from '../lib/prisma';

export interface AIConfig {
  enabled: boolean;
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
}

export class AIService {
  async getConfig(): Promise<AIConfig | null> {
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

  async updateConfig(data: Partial<AIConfig>) {
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

  async generateSolution(problem: { title: string; description: string; type: string }): Promise<string> {
    if (!(await this.isEnabled())) {
      throw new Error('AI功能未启用');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置');
    }

    const prompt = `请为以下题目生成一份详细的题解，包括：\n1. 解题思路\n2. 算法说明\n3. 代码实现（${problem.type === 'PROGRAMMING' ? '提供代码' : '提供步骤'}）\n4. 复杂度分析\n\n题目：${problem.title}\n\n${problem.description}`;

    return await this.callAI(prompt, config);
  }

  private async callAI(prompt: string, config: AIConfig): Promise<string> {
    const apiKey = config.apiKey;
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const model = config.model || 'gpt-3.5-turbo';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
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
              content: '你是一位专业的编程教练，擅长解释代码、提供解题思路和帮助调试程序。请用中文回答。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
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
