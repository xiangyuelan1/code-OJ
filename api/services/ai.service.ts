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

export interface AiJudgeResult {
  prediction: 'LIKELY_ACCEPTED' | 'LIKELY_WRONG' | 'UNCERTAIN';
  analysis: string;
  suggestions: string[];
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
          enabled: data.enabled !== undefined ? data.enabled : existing.enabled,
          provider: data.provider || existing.provider,
          apiKey: data.apiKey !== undefined ? data.apiKey : existing.apiKey,
          baseUrl: data.baseUrl !== undefined ? data.baseUrl : existing.baseUrl,
          model: data.model || existing.model,
        }
      });
    } else {
      return await prisma.aIConfig.create({
        data: {
          enabled: data.enabled ?? false,
          provider: data.provider || 'openai',
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          model: data.model || 'gpt-3.5-turbo',
        }
      });
    }
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.enabled ?? false;
  }

  async explainCode(code: string, language: string, userId?: string): Promise<string> {
    if (!(await this.isFeatureEnabled('explain-code'))) {
      return this.fallbackExplainCode(code, language);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackExplainCode(code, language);
    }

    const prompt = `请详细解释以下${language}代码，逐行说明其功能和逻辑：\n\n${code}`;
    return await this.callAI(prompt, config, 'explain-code', userId);
  }

  async getHint(problem: { title: string; description: string }, context?: string, userId?: string): Promise<string> {
    if (!(await this.isFeatureEnabled('hint'))) {
      return this.fallbackGetHint(problem, context);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackGetHint(problem, context);
    }

    const prompt = `你是一位专业的编程教练，正在为学生提供解题提示。请遵循以下格式要求：

题目：${problem.title}

${problem.description}
${context ? `\n用户当前进度：${context}\n` : ''}

请给出解题思路提示，不要直接给出完整答案。必须使用以下结构化格式：

# 💡 解题提示: ${problem.title}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ▸ 算法方向

指出这道题适合使用什么算法或数据结构，用简单的 ASCII 字符图展示算法选择思路，例如：
\`\`\`
  条件A ──→ 方法X
      │
  条件B ──→ 方法Y
\`\`\`

## ▸ 解题步骤

用有序列表给出解题的关键步骤（3-5步），每步只给方向性提示，不暴露完整代码。

## ▸ 注意事项

用无序列表列出容易出错的点（2-3个），如边界条件、特殊情况等。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

格式要求：
1. 使用 ━━ 作为视觉分隔线
2. 使用 ## ▸ 作为章节标题
3. 算法方向部分必须包含 ASCII 字符图来直观展示思路
4. 代码块用 \`\`\` 包裹
5. 列表项用 - 开头
6. 只提供提示和方向，绝不直接给出完整代码答案`;

    return await this.callAI(prompt, config, 'hint', userId);
  }

  async diagnoseError(code: string, language: string, error: string, userId?: string): Promise<string> {
    if (!(await this.isFeatureEnabled('diagnose'))) {
      return this.fallbackDiagnoseError(code, language, error);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackDiagnoseError(code, language, error);
    }

    const prompt = `以下${language}代码执行出错，请分析错误原因并给出修复建议：\n\n错误信息：\n${error}\n\n代码：\n${code}`;
    return await this.callAI(prompt, config, 'diagnose', userId);
  }

  async aiJudge(params: {
    code: string;
    language: string;
    problem: { title: string; description: string };
    testCases: TestCase[];
  }, userId?: string): Promise<AiJudgeResult> {
    if (!(await this.isFeatureEnabled('ai-judge'))) {
      return this.fallbackAiJudge(params);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackAiJudge(params);
    }

    const testCaseSummary = params.testCases
      .slice(0, 5)
      .map((tc, i) => `  用例${i + 1}: 输入="${tc.input}" → 期望输出="${tc.output}"`)
      .join('\n');

    const prompt = `你是一个专业的编程竞赛判题助手。请分析以下学生提交的代码，预测它能否通过所有测试用例。

题目：${params.problem.title}
${params.problem.description}

编程语言：${params.language}

学生代码：
\`\`\`${params.language}
${params.code}
\`\`\`

测试用例（部分）：
${testCaseSummary}

请从以下维度分析代码：
1. 逻辑正确性：核心算法是否正确解决问题
2. 边界处理：是否覆盖空输入、极值等边界情况
3. 复杂度：时间和空间复杂度是否满足要求
4. 语法完整性：代码是否能编译/运行

请以JSON格式返回，包含以下字段：
{
  "prediction": "LIKELY_ACCEPTED" | "LIKELY_WRONG" | "UNCERTAIN",
  "analysis": "详细分析文本，说明为什么做出此预测",
  "suggestions": ["具体的改进建议1", "具体的改进建议2"]
}

判断标准：
- LIKELY_ACCEPTED: 代码逻辑正确，边界处理完善，大概率通过
- LIKELY_WRONG: 代码存在明显逻辑错误或遗漏，大概率不通过
- UNCERTAIN: 无法确定，需要实际运行验证`;

    const response = await this.callAI(prompt, config, 'ai-judge', userId);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validPredictions = ['LIKELY_ACCEPTED', 'LIKELY_WRONG', 'UNCERTAIN'];
        return {
          prediction: validPredictions.includes(parsed.prediction) ? parsed.prediction : 'UNCERTAIN',
          analysis: parsed.analysis || '无法生成分析',
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        };
      }
    } catch (e) {
      console.error('解析AI判题响应失败:', e);
    }

    return {
      prediction: 'UNCERTAIN',
      analysis: response,
      suggestions: [],
    };
  }

  private fallbackAiJudge(params: {
    code: string;
    language: string;
    problem: { title: string; description: string };
    testCases: TestCase[];
  }): AiJudgeResult {
    const { code, language, problem, testCases } = params;
    const suggestions: string[] = [];
    const analysisParts: string[] = [];
    let prediction: AiJudgeResult['prediction'] = 'UNCERTAIN';

    // 基础静态分析：检查代码是否为空或过短
    if (!code.trim()) {
      return {
        prediction: 'LIKELY_WRONG',
        analysis: '代码为空，无法通过任何测试用例。',
        suggestions: ['请编写代码后再提交'],
      };
    }

    if (code.trim().length < 10) {
      return {
        prediction: 'LIKELY_WRONG',
        analysis: '代码过短，不太可能包含完整的解题逻辑。',
        suggestions: ['请完善代码实现', '确保包含完整的输入输出处理'],
      };
    }

    // 检查是否包含基本的输入输出模式
    const hasInputPattern = /readline|input|scanf|cin|read|gets|sys\.stdin/.test(code);
    const hasOutputPattern = /console\.log|print|printf|cout|System\.out|write/.test(code);
    const desc = problem.description.toLowerCase();

    if (testCases.length > 0 && !hasInputPattern && !hasOutputPattern) {
      suggestions.push('代码中未检测到输入/输出操作，请确认是否正确处理了输入输出');
      analysisParts.push('未检测到标准的输入输出模式。');
    }

    // 检查是否包含常见的控制结构
    const hasLoop = /for|while|do\s|forEach|map\(|filter\(/.test(code);
    const hasCondition = /if|else|switch|case|\?.*:/.test(code);

    if (desc.includes('排序') || desc.includes('sort')) {
      if (!hasLoop) {
        suggestions.push('排序问题通常需要循环结构，请检查是否遗漏了循环');
      }
    }

    if (desc.includes('查找') || desc.includes('搜索') || desc.includes('find') || desc.includes('search')) {
      if (!hasCondition && !hasLoop) {
        suggestions.push('查找问题通常需要条件判断和循环，请检查算法完整性');
      }
    }

    if (desc.includes('递归') || desc.includes('recursion')) {
      const hasRecursion = /\b\w+\s*\([^)]*\)/.test(code) && code.split('\n').some(
        line => {
          const fnMatch = line.match(/(?:function\s+(\w+)|def\s+(\w+)|(?:int|void|string|bool|auto)\s+(\w+)\s*\()/);
          return fnMatch && code.includes(fnMatch[1] || fnMatch[2] || fnMatch[3]);
        }
      );
      if (!hasRecursion) {
        suggestions.push('题目可能需要递归解法，请检查是否正确实现了递归');
      }
    }

    // 检查语法完整性
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      suggestions.push('花括号不匹配，可能存在语法错误');
      analysisParts.push('花括号数量不匹配。');
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      suggestions.push('圆括号不匹配，可能存在语法错误');
      analysisParts.push('圆括号数量不匹配。');
    }

    // 综合判断
    if (suggestions.length === 0 && code.length > 50 && hasOutputPattern) {
      prediction = 'UNCERTAIN';
      analysisParts.unshift('代码结构看起来完整，但需要实际运行验证逻辑正确性。');
    } else if (suggestions.length >= 2) {
      prediction = 'LIKELY_WRONG';
      analysisParts.unshift('代码存在多个潜在问题。');
    } else if (suggestions.length === 1) {
      prediction = 'UNCERTAIN';
      analysisParts.unshift('代码存在一个潜在问题，需要进一步检查。');
    }

    if (suggestions.length === 0) {
      suggestions.push('建议在提交前用示例测试用例手动验证代码');
      suggestions.push('注意检查边界条件（空输入、极大值等）');
    }

    return {
      prediction,
      analysis: analysisParts.join(' '),
      suggestions,
    };
  }

  async generateSolution(problem: { title: string; description: string; type: string }, userId?: string): Promise<ProblemSolution> {
    if (!(await this.isFeatureEnabled('generate-solution'))) {
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

    const response = await this.callAI(prompt, config, 'generate-solution', userId);
    
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

  async generateTestCases(problem: { title: string; description: string }, userId?: string): Promise<TestCase[]> {
    if (!(await this.isFeatureEnabled('generate-testcases'))) {
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

    const response = await this.callAI(prompt, config, 'generate-testcases', userId);
    
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

  async parseFileToKnowledgeTree(content: string, userId?: string): Promise<KnowledgeNode[]> {
    if (!(await this.isFeatureEnabled('parse-knowledge-tree'))) {
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

    const response = await this.callAI(prompt, config, 'parse-knowledge-tree', userId);
    
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

  async classifyProblem(problem: { title: string; description: string; type: string }, knowledgeTree: KnowledgeNode[], userId?: string): Promise<{ nodeIds: string[]; reason: string }> {
    if (!(await this.isFeatureEnabled('classify-problem'))) {
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

    const response = await this.callAI(prompt, config, 'classify-problem', userId);
    
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

  parseTxtToProblems(content: string): any[] {
    const blocks = content.split(/\n---\n/).map(b => b.trim()).filter(Boolean);
    const problems: any[] = [];

    for (const block of blocks) {
      const problem = this.parseTxtBlock(block);
      if (problem) {
        problems.push(problem);
      }
    }

    return problems;
  }

  private parseTxtBlock(block: string): any | null {
    const lines = block.split('\n');
    const problem: any = {
      title: '',
      type: 'PROGRAMMING',
      difficulty: 'MEDIUM',
      description: '',
      testCases: [],
      choices: [],
      fillBlanks: [],
      correctAnswer: ''
    };

    let currentSection: string | null = null;
    let sectionContent: string[] = [];
    let sampleInput = '';
    let sampleOutput = '';

    const flushSection = () => {
      if (!currentSection) return;
      const text = sectionContent.join('\n').trim();

      switch (currentSection) {
        case 'title':
          problem.title = text.replace(/^#\s*/, '');
          break;
        case 'description':
          problem.description = text;
          break;
        case 'input':
          sampleInput = text;
          break;
        case 'output':
          sampleOutput = text;
          break;
      }

      sectionContent = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (line.match(/^#\s+/)) {
        flushSection();
        currentSection = 'title';
        sectionContent = [line];
        continue;
      }

      const typeMatch = line.match(/^类型\s*[:：]\s*(.+)/);
      if (typeMatch) {
        flushSection();
        const typeVal = typeMatch[1].trim().toUpperCase();
        if (['PROGRAMMING', 'CHOICE', 'FILL_BLANK'].includes(typeVal)) {
          problem.type = typeVal;
        }
        currentSection = null;
        continue;
      }

      const diffMatch = line.match(/^难度\s*[:：]\s*(.+)/);
      if (diffMatch) {
        flushSection();
        const diffVal = diffMatch[1].trim().toUpperCase();
        if (['EASY', 'MEDIUM', 'HARD'].includes(diffVal)) {
          problem.difficulty = diffVal;
        }
        currentSection = null;
        continue;
      }

      const answerMatch = line.match(/^答案\s*[:：]\s*(.+)/);
      if (answerMatch) {
        flushSection();
        problem.correctAnswer = answerMatch[1].trim();
        currentSection = null;
        continue;
      }

      const descMatch = line.match(/^描述\s*[:：]?\s*$/);
      if (descMatch) {
        flushSection();
        currentSection = 'description';
        continue;
      }

      const inputMatch = line.match(/^输入\s*[:：]?\s*$/);
      if (inputMatch) {
        flushSection();
        currentSection = 'input';
        continue;
      }

      const outputMatch = line.match(/^输出\s*[:：]?\s*$/);
      if (outputMatch) {
        flushSection();
        currentSection = 'output';
        continue;
      }

      const choiceMatch = line.match(/^([A-Z])\s*[.、．]\s*(.+)/);
      if (choiceMatch) {
        if (currentSection !== 'choices') {
          flushSection();
          currentSection = 'choices';
        }
        problem.choices.push({ key: choiceMatch[1], text: choiceMatch[2].trim() });
        continue;
      }

      if (currentSection) {
        sectionContent.push(rawLine);
      }
    }

    flushSection();

    if (sampleInput || sampleOutput) {
      problem.testCases.push({
        input: sampleInput,
        output: sampleOutput,
        isSample: true
      });
    }

    if (!problem.title) return null;

    if (problem.type === 'CHOICE') {
      if (problem.choices.length === 0) return null;
    } else if (problem.type === 'FILL_BLANK') {
      if (!problem.correctAnswer) return null;
    } else {
      problem.type = 'PROGRAMMING';
    }

    return problem;
  }

  parseJsonToProblems(content: string): any[] {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const problems: any[] = [];

    for (const item of items) {
      const problem = this.normalizeJsonProblem(item);
      if (problem) {
        problems.push(problem);
      }
    }

    return problems;
  }

  private normalizeJsonProblem(item: any): any | null {
    if (!item || !item.title || !item.description) return null;

    const typeVal = (item.type || 'PROGRAMMING').toUpperCase();
    const diffVal = (item.difficulty || 'MEDIUM').toUpperCase();

    const problem: any = {
      title: item.title,
      type: ['PROGRAMMING', 'CHOICE', 'FILL_BLANK'].includes(typeVal) ? typeVal : 'PROGRAMMING',
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(diffVal) ? diffVal : 'MEDIUM',
      description: item.description,
      testCases: [],
      choices: [],
      fillBlanks: [],
      correctAnswer: item.correctAnswer || ''
    };

    if (Array.isArray(item.testCases)) {
      problem.testCases = item.testCases.map((tc: any) => ({
        input: String(tc.input ?? ''),
        output: String(tc.output ?? ''),
        isSample: tc.isSample ?? false
      }));
    }

    if (Array.isArray(item.choices)) {
      problem.choices = item.choices.map((c: any) => ({
        key: c.key || '',
        text: c.text || ''
      }));
    }

    if (Array.isArray(item.fillBlanks)) {
      problem.fillBlanks = item.fillBlanks.map((fb: any) => String(fb));
    }

    if (item.tags) {
      problem.tags = Array.isArray(item.tags) ? item.tags : [item.tags];
    }

    if (item.timeLimit) problem.timeLimit = Number(item.timeLimit);
    if (item.memoryLimit) problem.memoryLimit = Number(item.memoryLimit);

    return problem;
  }

  async parseProblemFile(content: string, fileType: string, userId?: string): Promise<any[]> {
    if (fileType === 'json') {
      try {
        return this.parseJsonToProblems(content);
      } catch (e: any) {
        throw new Error(`JSON解析失败: ${e.message}`);
      }
    }

    if (fileType === 'txt' || fileType === 'text') {
      const problems = this.parseTxtToProblems(content);
      if (problems.length > 0) {
        return problems;
      }
    }

    if (!(await this.isFeatureEnabled('parse-problem-file'))) {
      if (fileType === 'txt' || fileType === 'text') {
        throw new Error('无法从文本中解析出题目，请检查格式。也可以配置AI API来增强解析能力。');
      }
      throw new Error('AI功能未启用，无法解析此文件格式');
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new Error('AI API未配置，无法解析此文件格式');
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

    const response = await this.callAI(prompt, config, 'parse-problem-file', userId);
    
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

  private fallbackExplainCode(code: string, language: string): string {
    const lines = code.split('\n');
    let explanation = `## ${language} 代码解析\n\n`;
    explanation += `该代码共 ${lines.length} 行。\n\n`;
    explanation += `### 代码结构分析\n\n`;

    const keywords: Record<string, string[]> = {
      javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch'],
      python: ['def', 'if', 'else', 'elif', 'for', 'while', 'return', 'class', 'import', 'from', 'try', 'except', 'with', 'async', 'await'],
      cpp: ['int', 'void', 'if', 'else', 'for', 'while', 'return', 'class', 'include', 'using', 'try', 'catch', 'auto', 'const'],
      c: ['int', 'void', 'if', 'else', 'for', 'while', 'return', 'include', 'struct', 'typedef', 'const', 'static']
    };

    const langKeywords = keywords[language] || keywords.javascript;
    const foundKeywords: string[] = [];
    for (const kw of langKeywords) {
      if (code.includes(kw)) foundKeywords.push(kw);
    }

    if (foundKeywords.length > 0) {
      explanation += `代码中使用了以下关键语法: ${foundKeywords.join(', ')}\n\n`;
    }

    const functionMatches = code.match(/(?:function\s+\w+|def\s+\w+|(?:int|void|string|bool|auto)\s+\w+\s*\()/g);
    if (functionMatches) {
      explanation += `### 函数/方法\n\n`;
      for (const fn of functionMatches) {
        explanation += `- \`${fn.trim()}\`\n`;
      }
      explanation += '\n';
    }

    explanation += `> 💡 提示: 配置AI API后可获得更详细的代码解释。请在管理后台的AI配置中设置。`;
    return explanation;
  }

  private fallbackGetHint(problem: { title: string; description: string }, context?: string): string {
    const desc = problem.description.toLowerCase();

    const sections: { title: string; content: string }[] = [];

    // 根据题目类型匹配对应的 ASCII 图和提示
    if (desc.includes('排序') || desc.includes('sort')) {
      sections.push({
        title: '算法方向',
        content: `考虑使用排序算法（快速排序、归并排序等）

\`\`\`
排序算法选择指南：

  数据量小 ──→ 插入排序 / 选择排序
      │
  数据量大 ──→ 快速排序 / 归并排序
      │              │
  需要稳定 ──→ 归并排序    不需要 ──→ 快速排序
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 注意排序的稳定性要求
- 思考是否需要自定义比较函数
- 关注时间复杂度是否满足题目要求`,
      });
    } else if (desc.includes('查找') || desc.includes('搜索') || desc.includes('find') || desc.includes('search')) {
      sections.push({
        title: '算法方向',
        content: `考虑查找算法的选择：

\`\`\`
查找策略选择：

  数据有序 ──→ 二分查找 O(log n)
      │
  数据无序 ──→ 哈希表 O(1) / 线性查找 O(n)
      │
  范围查询 ──→ 排序 + 二分 / 线段树
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 二分查找需要数据有序
- 哈希表可以实现 O(1) 查找
- 注意边界条件的处理（左闭右开 vs 左闭右闭）`,
      });
    } else if (desc.includes('树') || desc.includes('tree')) {
      sections.push({
        title: '算法方向',
        content: `考虑树的遍历方法：

\`\`\`
    树遍历示意图：

        1          前序: 1 → 2 → 4 → 5 → 3 → 6 → 7
       / \\         中序: 4 → 2 → 5 → 1 → 6 → 3 → 7
      2   3        后序: 4 → 5 → 2 → 6 → 7 → 3 → 1
     / \\ / \\       层序: 1 → 2 → 3 → 4 → 5 → 6 → 7
    4  5 6  7
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 递归遍历（前序、中序、后序）是最基本的树操作
- BFS 和 DFS 是常用的树遍历方法
- 注意空节点的处理，防止空指针异常`,
      });
    } else if (desc.includes('图') || desc.includes('graph')) {
      sections.push({
        title: '算法方向',
        content: `考虑图的遍历和最短路径算法：

\`\`\`
图算法选择：

  遍历所有节点 ──→ BFS / DFS
      │
  最短路径 ──→ 无权: BFS  /  有权: Dijkstra
      │
  负权边 ──→ Bellman-Ford
      │
  所有节点对 ──→ Floyd-Warshall
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 注意环的检测，避免无限循环
- Dijkstra 算法适用于非负权图的最短路径
- 考虑使用邻接表还是邻接矩阵存储图`,
      });
    } else if (desc.includes('动态规划') || desc.includes('dp') || desc.includes('最优')) {
      sections.push({
        title: '算法方向',
        content: `动态规划解题框架：

\`\`\`
DP 解题步骤：

  1. 定义状态 ──→ dp[i] 表示什么？
        │
  2. 状态转移 ──→ dp[i] = f(dp[i-1], ...)
        │
  3. 初始条件 ──→ dp[0] = ?
        │
  4. 遍历顺序 ──→ 从小到大 or 从大到小
        │
  5. 返回结果 ──→ dp[n] or max(dp[])
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 定义状态和状态转移方程是关键
- 考虑自底向上的递推方式，避免递归栈溢出
- 注意初始条件的设置，错误的初值会导致整体错误`,
      });
    } else if (desc.includes('字符串') || desc.includes('string')) {
      sections.push({
        title: '算法方向',
        content: `字符串问题常用技巧：

\`\`\`
字符串算法选择：

  子串匹配 ──→ 滑动窗口 / KMP
      │
  回文问题 ──→ 中心扩展 / 动态规划
      │
  字符统计 ──→ 哈希表 / 计数数组
      │
  双字符串 ──→ 双指针 / DP
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 双指针技巧常用于字符串问题
- 滑动窗口方法适用于子串/子序列问题
- 注意字符编码和大小写转换`,
      });
    } else if (desc.includes('数组') || desc.includes('array') || desc.includes('列表')) {
      sections.push({
        title: '算法方向',
        content: `数组问题常用技巧：

\`\`\`
数组算法选择：

  区间查询 ──→ 前缀和 / 差分
      │
  双端操作 ──→ 双指针 / 滑动窗口
      │
  查找目标 ──→ 排序 + 二分 / 哈希表
      │
  子数组问题 ──→ 前缀和 + 哈希
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 双指针方法可以降低时间复杂度
- 前缀和技巧适用于区间查询
- 注意数组越界问题`,
      });
    } else if (desc.includes('链表') || desc.includes('linked list')) {
      sections.push({
        title: '算法方向',
        content: `链表问题常用技巧：

\`\`\`
链表操作示意图：

  快慢指针找中点：        虚拟头节点简化插入：
  slow: 1→2→3           dummy → head → ...
  fast: 1→3→5           ↑ 新节点插入此位置前
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 快慢指针可以检测环、找中点
- 注意空指针的处理
- 虚拟头节点可以简化边界处理`,
      });
    } else {
      sections.push({
        title: '通用解题思路',
        content: `通用解题流程：

\`\`\`
解题步骤：

  理解题意 ──→ 确定输入输出
      │
  举例验证 ──→ 用样例验证理解
      │
  暴力解法 ──→ 先写出正确解法
      │
  优化改进 ──→ 降低时间/空间复杂度
      │
  边界检查 ──→ 空输入、极值、特殊值
\`\`\``,
      });
      sections.push({
        title: '注意事项',
        content: `- 仔细分析题目要求，确定输入输出格式
- 考虑暴力解法作为起点，再优化
- 注意边界条件和特殊情况
- 画图或举例帮助理解问题`,
      });
    }

    // 组装结构化输出
    let result = `# 💡 解题提示: ${problem.title}\n\n`;
    result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const section of sections) {
      result += `## ▸ ${section.title}\n\n`;
      result += `${section.content}\n\n`;
    }

    if (context) {
      result += `## ▸ 当前进度\n\n`;
      result += `${context}\n\n`;
    }

    result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    result += `> 💡 配置 AI API 后可获得更精准的个性化解题提示，请在管理后台的 AI 配置中设置。`;

    return result;
  }

  private fallbackDiagnoseError(code: string, language: string, error: string): string {
    let diagnosis = `## 错误诊断\n\n`;
    diagnosis += `### 错误信息\n\`\`\`\n${error.substring(0, 500)}\n\`\`\`\n\n`;

    const errorLower = error.toLowerCase();

    if (errorLower.includes('syntaxerror') || errorLower.includes('语法错误') || errorLower.includes('syntax error')) {
      diagnosis += `### 可能原因\n- 语法错误：检查括号、分号、引号是否匹配\n- 拼写错误：检查关键字和变量名拼写\n`;
    } else if (errorLower.includes('typeerror') || errorLower.includes('类型错误') || errorLower.includes('type error')) {
      diagnosis += `### 可能原因\n- 类型错误：检查变量类型是否正确\n- 空值访问：检查变量是否为null/undefined\n`;
    } else if (errorLower.includes('referenceerror') || errorLower.includes('未定义') || errorLower.includes('not defined')) {
      diagnosis += `### 可能原因\n- 变量未定义：检查变量名拼写和作用域\n- 忘记声明变量\n`;
    } else if (errorLower.includes('timeout') || errorLower.includes('超时') || errorLower.includes('time limit')) {
      diagnosis += `### 可能原因\n- 算法效率过低：考虑优化时间复杂度\n- 死循环：检查循环条件和递归终止条件\n`;
    } else if (errorLower.includes('compile') || errorLower.includes('编译')) {
      diagnosis += `### 可能原因\n- 编译错误：检查语法是否正确\n- 缺少头文件或导入\n`;
    } else if (errorLower.includes('segmentation') || errorLower.includes('段错误')) {
      diagnosis += `### 可能原因\n- 数组越界访问\n- 空指针解引用\n- 栈溢出（递归过深）\n`;
    } else {
      diagnosis += `### 通用建议\n- 仔细阅读错误信息，定位出错行号\n- 检查输入数据是否符合预期\n- 添加调试输出，逐步排查问题\n`;
    }

    diagnosis += `\n> 💡 提示: 配置AI API后可获得更详细的错误诊断。`;
    return diagnosis;
  }

  private async callAI(prompt: string, config: any, feature?: string, userId?: string): Promise<string> {
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
      const result = data.choices[0]?.message?.content || '未获得有效回复';

      if (feature && userId) {
        const promptTokens = data.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
        const completionTokens = data.usage?.completion_tokens ?? Math.ceil(result.length / 4);
        await this.logAIUsage(userId, feature, promptTokens, completionTokens, model);
      }

      return result;
    } catch (error: any) {
      if (error.message.includes('AI功能未启用') || error.message.includes('AI API未配置')) {
        throw error;
      }
      throw new Error(`AI服务调用失败: ${error.message}`);
    }
  }

  /**
   * 流式调用 AI 接口，逐块返回文本内容。
   * 复用 callAI 的端点构造与鉴权逻辑，在请求体中设置 stream: true，
   * 通过 ReadableStream 逐行解析 SSE 协议（data: {...}\n\n），
   * 将每个 chunk 的 choices[0].delta.content 以 yield 方式返回给调用方。
   * 流结束后根据累计内容长度估算 token 并记录使用日志。
   */
  async *callAIStream(prompt: string, config: any, feature?: string, userId?: string): AsyncGenerator<string, void, unknown> {
    const apiKey = config.apiKey;
    const rawBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const model = config.model || 'gpt-3.5-turbo';

    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

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
        max_tokens: 4000,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              yield content;
            }
          } catch {
            // 单个 chunk 解析失败时跳过，不影响整体流
          }
        }
      }
    } finally {
      reader.releaseLock();

      if (feature && userId) {
        const promptTokens = Math.ceil(prompt.length / 4);
        const completionTokens = Math.ceil(fullContent.length / 4);
        await this.logAIUsage(userId, feature, promptTokens, completionTokens, model);
      }
    }
  }

  /**
   * 记录AI使用日志，包含token消耗和费用估算
   */
  private async logAIUsage(userId: string, feature: string, promptTokens: number, completionTokens: number, model?: string) {
    try {
      const totalTokens = promptTokens + completionTokens;
      const cost = this.calculateCost(model || 'gpt-3.5-turbo', promptTokens, completionTokens);
      await prisma.aIUsageLog.create({
        data: { userId, feature, model, promptTokens, completionTokens, totalTokens, cost },
      });
    } catch (error) {
      console.warn('AI使用日志记录失败（不影响主流程）:', error);
    }
  }

  /**
   * 根据模型和token数量计算费用
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const rates: Record<string, { prompt: number; completion: number }> = {
      'gpt-3.5-turbo': { prompt: 0.0005 / 1000, completion: 0.0015 / 1000 },
      'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
      'gpt-4o': { prompt: 0.005 / 1000, completion: 0.015 / 1000 },
    };
    const rate = rates[model] || rates['gpt-3.5-turbo'];
    return promptTokens * rate.prompt + completionTokens * rate.completion;
  }

  /**
   * 获取AI使用统计：总token、总费用、按功能/用户/日期维度的汇总
   */
  async getAIUsageStats(params: { userId?: string; feature?: string; startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.feature) where.feature = params.feature;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const logs = await prisma.aIUsageLog.findMany({ where });

    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + log.cost, 0);

    const byFeature: Record<string, { totalTokens: number; totalCost: number; count: number }> = {};
    for (const log of logs) {
      if (!byFeature[log.feature]) {
        byFeature[log.feature] = { totalTokens: 0, totalCost: 0, count: 0 };
      }
      byFeature[log.feature].totalTokens += log.totalTokens;
      byFeature[log.feature].totalCost += log.cost;
      byFeature[log.feature].count++;
    }

    const byUser: Record<string, { totalTokens: number; totalCost: number; count: number }> = {};
    for (const log of logs) {
      if (!byUser[log.userId]) {
        byUser[log.userId] = { totalTokens: 0, totalCost: 0, count: 0 };
      }
      byUser[log.userId].totalTokens += log.totalTokens;
      byUser[log.userId].totalCost += log.cost;
      byUser[log.userId].count++;
    }

    const dailyUsage: Record<string, { totalTokens: number; totalCost: number; count: number }> = {};
    for (const log of logs) {
      const day = new Date(log.createdAt).toISOString().slice(0, 10);
      if (!dailyUsage[day]) {
        dailyUsage[day] = { totalTokens: 0, totalCost: 0, count: 0 };
      }
      dailyUsage[day].totalTokens += log.totalTokens;
      dailyUsage[day].totalCost += log.cost;
      dailyUsage[day].count++;
    }

    return {
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalCalls: logs.length,
      byFeature,
      byUser,
      dailyUsage,
    };
  }

  /**
   * 获取指定班级的 AI 用量统计，按用户聚合。
   * 返回每个学生的 token、费用、功能明细，以及班级汇总。
   */
  async getAIUsageByClass(classId: string) {
    const members = await prisma.classMember.findMany({
      where: { classId },
      select: { userId: true, role: true },
    });

    const memberUserIds = members.map(m => m.userId);

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, aiBillingMode: true },
    });

    if (!cls) throw new Error('班级不存在');

    const logs = await prisma.aIUsageLog.findMany({
      where: { userId: { in: memberUserIds } },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    const byUser: Record<string, {
      userId: string;
      username: string;
      email: string;
      role: string;
      totalTokens: number;
      totalCost: number;
      totalCalls: number;
      byFeature: Record<string, { totalTokens: number; totalCost: number; count: number }>;
    }> = {};

    for (const member of members) {
      byUser[member.userId] = {
        userId: member.userId,
        username: '',
        email: '',
        role: member.role,
        totalTokens: 0,
        totalCost: 0,
        totalCalls: 0,
        byFeature: {},
      };
    }

    for (const log of logs) {
      const entry = byUser[log.userId];
      if (!entry) continue;

      entry.username = log.user.username;
      entry.email = log.user.email;
      entry.totalTokens += log.totalTokens;
      entry.totalCost += log.cost;
      entry.totalCalls += 1;

      if (!entry.byFeature[log.feature]) {
        entry.byFeature[log.feature] = { totalTokens: 0, totalCost: 0, count: 0 };
      }
      entry.byFeature[log.feature].totalTokens += log.totalTokens;
      entry.byFeature[log.feature].totalCost += log.cost;
      entry.byFeature[log.feature].count += 1;
    }

    const classTotalTokens = Object.values(byUser).reduce((s, u) => s + u.totalTokens, 0);
    const classTotalCost = Object.values(byUser).reduce((s, u) => s + u.totalCost, 0);
    const classTotalCalls = Object.values(byUser).reduce((s, u) => s + u.totalCalls, 0);

    return {
      classId: cls.id,
      className: cls.name,
      aiBillingMode: cls.aiBillingMode,
      classTotal: {
        totalTokens: classTotalTokens,
        totalCost: Math.round(classTotalCost * 10000) / 10000,
        totalCalls: classTotalCalls,
      },
      users: Object.values(byUser),
    };
  }

  /**
   * 获取指定教师所有班级的 AI 用量统计。
   * 返回每个班级的汇总、每个班级内每个学生的用量，以及教师整体汇总与费用分摊信息。
   */
  async getAIUsageByTeacher(teacherId: string) {
    const teacherClasses = await prisma.class.findMany({
      where: { createdBy: teacherId },
      select: { id: true, name: true, aiBillingMode: true },
    });

    if (teacherClasses.length === 0) {
      return {
        teacherId,
        overallTotal: { totalTokens: 0, totalCost: 0, totalCalls: 0 },
        teacherCost: 0,
        studentCost: 0,
        classes: [],
      };
    }

    const classIds = teacherClasses.map(c => c.id);

    const allMembers = await prisma.classMember.findMany({
      where: { classId: { in: classIds } },
      select: { classId: true, userId: true, role: true },
    });

    const allUserIds = [...new Set(allMembers.map(m => m.userId))];

    const logs = allUserIds.length > 0
      ? await prisma.aIUsageLog.findMany({
          where: { userId: { in: allUserIds } },
          include: { user: { select: { id: true, username: true, email: true } } },
        })
      : [];

    const logsByUser = new Map<string, typeof logs>();
    for (const log of logs) {
      const list = logsByUser.get(log.userId) || [];
      list.push(log);
      logsByUser.set(log.userId, list);
    }

    const membersByClass = new Map<string, typeof allMembers>();
    for (const m of allMembers) {
      const list = membersByClass.get(m.classId) || [];
      list.push(m);
      membersByClass.set(m.classId, list);
    }

    let overallTokens = 0;
    let overallCost = 0;
    let overallCalls = 0;
    let teacherTotalCost = 0;
    let studentTotalCost = 0;

    const classResults = teacherClasses.map(cls => {
      const classMembers = membersByClass.get(cls.id) || [];
      const isTeacherPays = cls.aiBillingMode === 'TEACHER_PAYS';

      let classTokens = 0;
      let classCost = 0;
      let classCalls = 0;
      let classTeacherCost = 0;
      let classStudentCost = 0;

      const userUsages = classMembers.map(member => {
        const userLogs = logsByUser.get(member.userId) || [];
        const userTokens = userLogs.reduce((s, l) => s + l.totalTokens, 0);
        const userCost = userLogs.reduce((s, l) => s + l.cost, 0);
        const userCalls = userLogs.length;

        const byFeature: Record<string, { totalTokens: number; totalCost: number; count: number }> = {};
        for (const log of userLogs) {
          if (!byFeature[log.feature]) {
            byFeature[log.feature] = { totalTokens: 0, totalCost: 0, count: 0 };
          }
          byFeature[log.feature].totalTokens += log.totalTokens;
          byFeature[log.feature].totalCost += log.cost;
          byFeature[log.feature].count += 1;
        }

        const userInfo = userLogs[0]?.user || { id: member.userId, username: '未知', email: '' };

        if (isTeacherPays || member.role === 'TEACHER') {
          classTeacherCost += userCost;
        } else {
          classStudentCost += userCost;
        }

        classTokens += userTokens;
        classCost += userCost;
        classCalls += userCalls;

        return {
          userId: member.userId,
          username: userInfo.username,
          email: userInfo.email,
          role: member.role,
          totalTokens: userTokens,
          totalCost: Math.round(userCost * 10000) / 10000,
          totalCalls: userCalls,
          byFeature,
        };
      });

      overallTokens += classTokens;
      overallCost += classCost;
      overallCalls += classCalls;
      teacherTotalCost += classTeacherCost;
      studentTotalCost += classStudentCost;

      return {
        classId: cls.id,
        className: cls.name,
        aiBillingMode: cls.aiBillingMode,
        classTotal: {
          totalTokens: classTokens,
          totalCost: Math.round(classCost * 10000) / 10000,
          totalCalls: classCalls,
        },
        teacherCost: Math.round(classTeacherCost * 10000) / 10000,
        studentCost: Math.round(classStudentCost * 10000) / 10000,
        users: userUsages,
      };
    });

    return {
      teacherId,
      overallTotal: {
        totalTokens: overallTokens,
        totalCost: Math.round(overallCost * 10000) / 10000,
        totalCalls: overallCalls,
      },
      teacherCost: Math.round(teacherTotalCost * 10000) / 10000,
      studentCost: Math.round(studentTotalCost * 10000) / 10000,
      classes: classResults,
    };
  }

  /**
   * 获取AI使用日志（分页）
   */
  async getAIUsageLogs(params: { userId?: string; feature?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.feature) where.feature = params.feature;

    const [logs, total] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.aIUsageLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async generateExam(params: {
    title?: string;
    difficulty?: string;
    tags?: string[];
    knowledgeNodeIds?: string[];
    problemCount?: number;
    problemTypes?: string[];
  }, userId?: string): Promise<{ problemIds: string[]; reasoning: string }> {
    const problemCount = params.problemCount || 5;
    const problems = await prisma.problem.findMany({
      where: {
        ...(params.difficulty ? { difficulty: params.difficulty } : {}),
        ...(params.problemTypes?.length ? { type: { in: params.problemTypes } } : {}),
        ...(params.knowledgeNodeIds?.length ? { knowledgeTreeId: { in: params.knowledgeNodeIds } } : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        difficulty: true,
        tags: true,
        description: true,
      }
    });

    const filtered = params.tags?.length
      ? problems.filter(p => {
          const tags: string[] = JSON.parse(p.tags || '[]');
          return params.tags!.some(t => tags.includes(t));
        })
      : problems;

    if (filtered.length === 0) {
      // 放宽条件：不按标签和知识节点筛选，只按难度和类型筛选
      const relaxedProblems = await prisma.problem.findMany({
        where: {
          ...(params.difficulty ? { difficulty: params.difficulty } : {}),
          ...(params.problemTypes?.length ? { type: { in: params.problemTypes } } : {}),
        },
        select: { id: true, title: true, difficulty: true, type: true, tags: true },
      });
      if (relaxedProblems.length === 0) {
        // 再放宽：获取所有题目
        const allProblems = await prisma.problem.findMany({
          select: { id: true, title: true, difficulty: true, type: true, tags: true },
          take: problemCount * 3,
        });
        if (allProblems.length === 0) {
          return { problemIds: [], reasoning: '系统中暂无题目，请先创建题目后再组卷' };
        }
        const shuffled = allProblems.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(problemCount, shuffled.length));
        return {
          problemIds: selected.map(p => p.id),
          reasoning: `由于没有完全符合条件的题目，已从全部 ${allProblems.length} 道题目中随机选择了 ${selected.length} 道`,
        };
      }
      const shuffled = relaxedProblems.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(problemCount, shuffled.length));
      return {
        problemIds: selected.map(p => p.id),
        reasoning: `已从 ${relaxedProblems.length} 道符合条件的题目中随机选择了 ${selected.length} 道`,
      };
    }

    if (!(await this.isFeatureEnabled('generate-exam'))) {
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, problemCount);
      return {
        problemIds: selected.map(p => p.id),
        reasoning: `从未启用AI的随机选择中选取了 ${selected.length} 道题目`
      };
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, problemCount);
      return {
        problemIds: selected.map(p => p.id),
        reasoning: `从降级随机选择中选取了 ${selected.length} 道题目`
      };
    }

    const problemList = filtered.map(p => ({
      id: p.id,
      title: p.title,
      type: p.type,
      difficulty: p.difficulty,
      tags: JSON.parse(p.tags || '[]'),
    }));

    const prompt = `你是一位专业的出卷专家。请从以下题目中选择 ${problemCount} 道题目组成一份试卷，要求：
1. 难度分布合理（简单:中等:困难 ≈ 3:5:2）
2. 题目类型多样化
3. 知识点覆盖全面
4. 避免重复考查同一知识点

可选题目列表：
${JSON.stringify(problemList, null, 2)}

请以JSON格式返回，格式为：
{"selectedIds": ["id1", "id2", ...], "reasoning": "选题理由"}`;

    const result = await this.callAI(prompt, config, 'generate-exam', userId);
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          problemIds: parsed.selectedIds || [],
          reasoning: parsed.reasoning || 'AI智能组卷'
        };
      }
    } catch (e) {
      console.error('AI组卷结果解析失败:', e);
    }

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, problemCount);
    return {
      problemIds: selected.map(p => p.id),
      reasoning: 'AI结果解析失败，已降级为随机选择'
    };
  }

  async optimizeCode(code: string, language: string, userId?: string): Promise<string> {
    if (!(await this.isFeatureEnabled('optimize-code'))) {
      return `## 代码优化建议\n\nAI功能未启用，无法提供优化建议。请在管理后台配置AI后使用此功能。\n\n### 通用优化建议\n1. 检查是否有重复计算\n2. 考虑使用更高效的数据结构\n3. 注意时间复杂度和空间复杂度`;
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return `## 代码优化建议\n\nAI未配置，无法提供优化建议。`;
    }

    const prompt = `你是一位资深的代码优化专家。请分析以下${language}代码，给出优化建议：

\`\`\`${language}
${code}
\`\`\`

请从以下方面分析：
1. **时间复杂度优化**：是否有更优的算法？
2. **空间复杂度优化**：是否有不必要的内存使用？
3. **代码质量优化**：可读性、可维护性、边界处理
4. **性能优化**：是否有性能瓶颈？

请使用Markdown格式，给出具体的优化建议和优化后的代码片段。`;

    return await this.callAI(prompt, config, 'optimize-code', userId);
  }

  async recommendSimilarProblems(problemId: string, userId?: string): Promise<{ problemIds: string[]; reasoning: string }> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, type: true, difficulty: true, tags: true, description: true }
    });

    if (!problem) {
      return { problemIds: [], reasoning: '题目不存在' };
    }

    const tags: string[] = JSON.parse(problem.tags || '[]');

    const candidates = await prisma.problem.findMany({
      where: {
        id: { not: problemId },
        type: problem.type,
      },
      select: {
        id: true,
        title: true,
        type: true,
        difficulty: true,
        tags: true,
      },
      take: 50,
    });

    const scored = candidates.map(p => {
      const pTags: string[] = JSON.parse(p.tags || '[]');
      const commonTags = pTags.filter(t => tags.includes(t));
      let score = commonTags.length * 10;
      if (p.difficulty === problem.difficulty) score += 5;
      return { ...p, score };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    if (!(await this.isFeatureEnabled('recommend-similar')) || !await this.getConfig().then(c => c?.apiKey)) {
      return {
        problemIds: scored.map(p => p.id),
        reasoning: `基于标签相似度推荐了 ${scored.length} 道题目`
      };
    }

    const config = await this.getConfig();
    const prompt = `你是一位编程教育专家。用户刚完成了以下题目：

题目：${problem.title}
类型：${problem.type}
难度：${problem.difficulty}
标签：${tags.join(', ')}
描述：${problem.description?.substring(0, 500)}

以下是候选的相似题目：
${JSON.stringify(scored.map(p => ({ id: p.id, title: p.title, tags: JSON.parse(p.tags || '[]'), difficulty: p.difficulty })), null, 2)}

请从中选择3-5道最适合的相似/进阶题目，以JSON格式返回：
{"selectedIds": ["id1", "id2", ...], "reasoning": "推荐理由"}`;

    const result = await this.callAI(prompt, config, 'recommend-similar', userId);
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          problemIds: parsed.selectedIds || [],
          reasoning: parsed.reasoning || 'AI智能推荐'
        };
      }
    } catch (e) {
      console.error('AI推荐结果解析失败:', e);
    }

    return {
      problemIds: scored.map(p => p.id),
      reasoning: 'AI结果解析失败，已降级为标签相似度推荐'
    };
  }

  /**
   * 生成学习路径：根据用户当前水平和薄弱点，规划阶段性学习计划
   */
  async generateLearningPath(
    params: {
      userId: string;
      currentLevel: string;
      targetLevel: string;
      weakPoints: string[];
    },
    userId?: string,
  ): Promise<{
    path: Array<{
      stage: string;
      description: string;
      recommendedProblems: string[];
      estimatedTime: string;
    }>;
  }> {
    if (!(await this.isFeatureEnabled('generate-learning-path'))) {
      return this.fallbackGenerateLearningPath(params);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackGenerateLearningPath(params);
    }

    const prompt = `你是一位专业的编程教育规划师。请根据以下学生信息，生成一条结构化的学习路径。

当前水平：${params.currentLevel}
目标水平：${params.targetLevel}
薄弱知识点：${params.weakPoints.join('、')}

请以JSON格式返回，格式为：
{
  "path": [
    {
      "stage": "阶段名称",
      "description": "该阶段的学习目标和内容描述",
      "recommendedProblems": ["推荐练习的题目类型或关键词"],
      "estimatedTime": "预计所需时间（如：1-2周）"
    }
  ]
}

要求：
1. 路径应分为3-5个阶段，循序渐进
2. 每个阶段应针对薄弱点设计
3. 推荐题目类型应具体可操作
4. 预估时间应合理`;

    const response = await this.callAI(prompt, config, 'generate-learning-path', userId);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.path)) {
          return { path: parsed.path };
        }
      }
    } catch (e) {
      console.error('解析学习路径响应失败:', e);
    }

    return this.fallbackGenerateLearningPath(params);
  }

  private fallbackGenerateLearningPath(params: {
    currentLevel: string;
    targetLevel: string;
    weakPoints: string[];
  }) {
    const stages = [
      { stage: '基础巩固', description: `巩固${params.weakPoints.slice(0, 2).join('、')}等基础知识`, recommendedProblems: ['基础练习题'], estimatedTime: '1-2周' },
      { stage: '能力提升', description: `针对${params.weakPoints.join('、')}进行专项训练`, recommendedProblems: ['中等难度练习题'], estimatedTime: '2-3周' },
      { stage: '综合应用', description: '综合运用所学知识解决复杂问题', recommendedProblems: ['综合练习题', '竞赛题'], estimatedTime: '2-4周' },
    ];
    return { path: stages };
  }

  /**
   * 分析提交趋势：识别近期提交中的常见错误和改进方向
   */
  async analyzeSubmissionTrend(
    params: {
      userId: string;
      recentSubmissions: Array<{
        problem: string;
        status: string;
        code?: string;
      }>;
    },
    userId?: string,
  ): Promise<{
    summary: string;
    commonMistakes: string[];
    improvementSuggestions: string[];
    nextSteps: string[];
  }> {
    if (!(await this.isFeatureEnabled('analyze-submission-trend'))) {
      return this.fallbackAnalyzeSubmissionTrend(params);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackAnalyzeSubmissionTrend(params);
    }

    const submissionSummary = params.recentSubmissions
      .slice(0, 20)
      .map((s, i) => `  ${i + 1}. 题目: ${s.problem}, 结果: ${s.status}`)
      .join('\n');

    const prompt = `你是一位专业的编程教育分析师。请分析以下学生的近期提交记录，识别其学习模式和改进方向。

近期提交记录：
${submissionSummary}

请以JSON格式返回，格式为：
{
  "summary": "总体学习情况概述（2-3句话）",
  "commonMistakes": ["常见错误1", "常见错误2", ...],
  "improvementSuggestions": ["改进建议1", "改进建议2", ...],
  "nextSteps": ["下一步行动1", "下一步行动2", ...]
}

要求：
1. commonMistakes 列出3-5个最常见的错误模式
2. improvementSuggestions 给出3-5个具体可执行的改进建议
3. nextSteps 给出2-3个下一步学习方向`;

    const response = await this.callAI(prompt, config, 'analyze-submission-trend', userId);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '暂无分析',
          commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
          improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
          nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
        };
      }
    } catch (e) {
      console.error('解析提交趋势分析响应失败:', e);
    }

    return this.fallbackAnalyzeSubmissionTrend(params);
  }

  private fallbackAnalyzeSubmissionTrend(params: {
    recentSubmissions: Array<{ problem: string; status: string; code?: string }>;
  }) {
    const total = params.recentSubmissions.length;
    const accepted = params.recentSubmissions.filter(s => s.status === 'ACCEPTED').length;
    const failed = total - accepted;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const mistakes: string[] = [];
    const suggestions: string[] = [];

    if (rate < 30) {
      mistakes.push('通过率较低，可能存在基础概念理解不足');
      suggestions.push('建议回顾基础知识点，从简单题目开始练习');
    } else if (rate < 60) {
      mistakes.push('部分题目未通过，可能存在算法实现细节问题');
      suggestions.push('仔细检查边界条件和特殊情况处理');
    }

    if (failed > accepted) {
      mistakes.push('失败次数多于成功次数，需要加强练习');
      suggestions.push('每次提交前先用示例数据手动验证');
    }

    if (mistakes.length === 0) {
      mistakes.push('提交记录较少，暂无法识别明显错误模式');
      suggestions.push('继续练习以积累更多数据');
    }

    return {
      summary: `近期提交 ${total} 次，通过 ${accepted} 次，通过率 ${rate}%。`,
      commonMistakes: mistakes,
      improvementSuggestions: suggestions,
      nextSteps: ['继续坚持每日练习', '重点关注未通过题目的错误类型'],
    };
  }

  /**
   * 智能提示：根据尝试次数提供渐进式提示
   * 尝试1-2次：给出方向性提示
   * 尝试3-4次：给出具体算法建议
   * 尝试5次以上：给出接近完整的代码骨架
   */
  async smartHint(
    params: {
      problem: { title: string; description: string };
      userCode: string;
      attemptCount: number;
      previousHints: string[];
    },
    userId?: string,
  ): Promise<{
    hint: string;
    level: string;
    nextAttemptSuggestion: string;
  }> {
    if (!(await this.isFeatureEnabled('smart-hint'))) {
      return this.fallbackSmartHint(params);
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return this.fallbackSmartHint(params);
    }

    let hintLevel: string;
    let hintInstruction: string;

    if (params.attemptCount <= 2) {
      hintLevel = '方向性提示';
      hintInstruction = `请只给出解题的方向性提示，不要提及具体算法名称或代码。
提示应该帮助学生思考问题的本质，例如：
- 这道题的核心挑战是什么
- 应该从什么角度思考
- 有没有类似的生活场景可以类比`;
    } else if (params.attemptCount <= 4) {
      hintLevel = '算法建议';
      hintInstruction = `请给出具体的算法或数据结构建议，但不要给出完整代码。
可以提及：
- 推荐使用什么算法（如动态规划、二分查找等）
- 算法的核心思路
- 关键变量的定义方式
- 但不要给出完整的代码实现`;
    } else {
      hintLevel = '代码骨架';
      hintInstruction = `请给出接近完整的代码骨架，包含：
- 主要函数结构
- 关键算法的实现框架
- 重要的变量声明和初始化
- 用注释标出需要学生自己填写的部分
注意：仍然不要给出100%完整的代码，留一些关键部分让学生自己完成`;
    }

    const previousHintsSection = params.previousHints.length > 0
      ? `\n之前已给出的提示：\n${params.previousHints.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}\n请在此基础上给出更进一步的提示，不要重复之前的内容。`
      : '';

    const prompt = `你是一位耐心的编程导师，正在为学生提供渐进式提示。

题目：${params.problem.title}
${params.problem.description}

学生当前代码：
\`\`\`
${params.userCode || '（尚未编写代码）'}
\`\`\`

学生已经尝试了 ${params.attemptCount} 次。

${hintInstruction}
${previousHintsSection}

请以JSON格式返回：
{
  "hint": "提示内容（Markdown格式）",
  "nextAttemptSuggestion": "如果学生还是不会，建议下一步尝试什么"
}`;

    const response = await this.callAI(prompt, config, 'smart-hint', userId);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          hint: parsed.hint || '暂无提示',
          level: hintLevel,
          nextAttemptSuggestion: parsed.nextAttemptSuggestion || '继续尝试',
        };
      }
    } catch (e) {
      console.error('解析智能提示响应失败:', e);
    }

    return {
      hint: response,
      level: hintLevel,
      nextAttemptSuggestion: '如果仍无法解决，可以查看题解或请教老师',
    };
  }

  private fallbackSmartHint(params: {
    problem: { title: string; description: string };
    userCode: string;
    attemptCount: number;
  }) {
    const desc = params.problem.description.toLowerCase();
    let hint: string;
    let level: string;
    let nextSuggestion: string;

    if (params.attemptCount <= 2) {
      level = '方向性提示';
      if (desc.includes('排序') || desc.includes('sort')) {
        hint = '这道题的核心是对数据进行有序处理，思考一下如何利用有序性来简化问题。';
      } else if (desc.includes('查找') || desc.includes('搜索')) {
        hint = '这道题需要在数据中找到目标，思考一下如何高效地缩小搜索范围。';
      } else if (desc.includes('最短') || desc.includes('路径')) {
        hint = '这道题涉及最优路径问题，思考一下如何逐步扩展已知的最优解。';
      } else {
        hint = '先仔细理解题目要求，尝试用最简单的方法解决，再考虑优化。';
      }
      nextSuggestion = '尝试用暴力方法先写出解法，再考虑优化';
    } else if (params.attemptCount <= 4) {
      level = '算法建议';
      if (desc.includes('排序') || desc.includes('sort')) {
        hint = '建议使用排序算法，可以考虑快速排序或归并排序。排序后通常配合双指针或二分查找使用。';
      } else if (desc.includes('动态规划') || desc.includes('dp') || desc.includes('最优')) {
        hint = '建议使用动态规划。定义状态 dp[i] 表示什么，然后思考状态转移方程 dp[i] 如何从之前的状态推导而来。';
      } else if (desc.includes('图') || desc.includes('最短')) {
        hint = '建议使用BFS或Dijkstra算法处理图的问题。注意区分有权图和无权图的不同处理方式。';
      } else {
        hint = '考虑使用分治、贪心或动态规划等常见策略。先确定算法思路，再编写代码。';
      }
      nextSuggestion = '如果还是无法解决，可以查看类似题目的题解寻找灵感';
    } else {
      level = '代码骨架';
      hint = `以下是一个通用的代码框架，请根据题目要求填充关键逻辑：

\`\`\`python
def solve():
    # 1. 读取输入
    n = int(input())
    data = list(map(int, input().split()))
    
    # 2. 核心算法逻辑（请自行实现）
    result = None
    
    # 3. 输出结果
    print(result)

solve()
\`\`\`

请根据题目具体要求，在"核心算法逻辑"部分填写你的实现。`;
      nextSuggestion = '如果仍然无法解决，建议查看题解或向老师求助';
    }

    return { hint, level, nextAttemptSuggestion: nextSuggestion };
  }

  /**
   * 批量为题目打标签，支持按ID、未标签、随机三种筛选模式。
   * AI启用时调用大模型分类，未启用时使用规则引擎兜底。
   */
  async batchClassifyProblems(
    options: { problemIds?: string[]; untaggedOnly?: boolean; randomCount?: number; tags?: string[] },
    userId?: string,
  ) {
    let problems;

    if (options.problemIds && options.problemIds.length > 0) {
      problems = await prisma.problem.findMany({
        where: { id: { in: options.problemIds } },
        select: { id: true, title: true, description: true, tags: true, difficulty: true, type: true },
      });
    } else if (options.untaggedOnly) {
      problems = await prisma.problem.findMany({
        where: { tags: { in: ['[]', '""', '', 'null'] } },
        select: { id: true, title: true, description: true, tags: true, difficulty: true, type: true },
      });
    } else {
      const count = options.randomCount || 10;
      problems = await prisma.problem.findMany({
        select: { id: true, title: true, description: true, tags: true, difficulty: true, type: true },
        take: count * 2,
      });
      problems = problems.sort(() => Math.random() - 0.5).slice(0, count);
    }

    if (problems.length === 0) {
      return { total: 0, classified: 0, results: [] };
    }

    const config = await this.getConfig();
    const results = [];

    for (const problem of problems) {
      try {
        const currentTags: string[] = JSON.parse(problem.tags || '[]');

        if (config?.enabled && config.apiKey) {
          const prompt = `请为以下编程题目分类并打标签。

题目标题：${problem.title}
题目类型：${problem.type}
难度：${problem.difficulty}
题目描述：${(problem.description || '').substring(0, 500)}

请直接返回一个JSON数组，包含3-5个标签字符串。例如：["贪心","排序","数组","模拟"]
只返回JSON数组，不要其他内容。`;

          const response = await this.callAI(prompt, config, 'batch-classify', userId);
          let newTags: string[];
          try {
            const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            newTags = Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch {
            newTags = response.split(/[,，、\s]+/).filter((t: string) => t.length > 0).slice(0, 5);
          }

          const mergedTags = [...new Set([...currentTags, ...newTags.map((t: string) => String(t).trim())])].filter((t: string) => t.length > 0);
          await prisma.problem.update({
            where: { id: problem.id },
            data: { tags: JSON.stringify(mergedTags) },
          });
          results.push({ id: problem.id, title: problem.title, tags: mergedTags, success: true });
        } else {
          const autoTags = this.autoClassifyProblem(problem);
          const mergedTags = [...new Set([...currentTags, ...autoTags])].filter((t: string) => t.length > 0);
          await prisma.problem.update({
            where: { id: problem.id },
            data: { tags: JSON.stringify(mergedTags) },
          });
          results.push({ id: problem.id, title: problem.title, tags: mergedTags, success: true });
        }
      } catch (error: any) {
        results.push({
          id: problem.id,
          title: problem.title,
          tags: JSON.parse(problem.tags || '[]'),
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: problems.length,
      classified: results.filter(r => r.success).length,
      results,
    };
  }

  /**
   * 基于关键词规则的自动分类，作为 AI 不可用时的兜底方案。
   * 根据题目标题和描述中的关键词匹配算法标签。
   */
  private autoClassifyProblem(problem: { title?: string; description?: string; difficulty?: string; type?: string }): string[] {
    const tags: string[] = [];
    const title = (problem.title || '').toLowerCase();
    const desc = (problem.description || '').toLowerCase();
    const text = title + ' ' + desc;

    const rules: Record<string, string[]> = {
      '排序': ['排序', 'sort', '冒泡', '快排', '归并', '堆排'],
      '搜索': ['搜索', '查找', 'find', 'search', '二分'],
      '动态规划': ['动态规划', 'dp', '递推', '记忆化', '最长', '最大', '最小子'],
      '贪心': ['贪心', 'greedy', '最优', '最少', '最多'],
      '图论': ['图', '最短路', 'bfs', 'dfs', '遍历', '连通', '拓扑'],
      '数学': ['数学', '素数', '质数', 'gcd', 'lcm', '组合', '排列', '概率', '模'],
      '字符串': ['字符串', 'string', '回文', '匹配', 'kmp'],
      '树': ['树', '二叉树', '节点', '叶子'],
      '模拟': ['模拟', '仿真', '游戏', '棋'],
      '递归': ['递归', 'recursion', '分治'],
      '栈': ['栈', 'stack', '括号'],
      '队列': ['队列', 'queue'],
      '哈希': ['哈希', 'hash', 'map', '字典'],
    };

    for (const [tag, keywords] of Object.entries(rules)) {
      if (keywords.some(kw => text.includes(kw))) {
        tags.push(tag);
      }
    }

    if (problem.difficulty) tags.push(problem.difficulty);
    if (problem.type === 'CHOICE') tags.push('选择题');
    else if (problem.type === 'FILL_BLANK') tags.push('填空题');

    return tags.slice(0, 5);
  }

  /**
   * 从自然语言描述中解析出结构化的题单组建需求与知识树建议。
   * AI 启用时调用大模型解析，未启用时使用关键词规则兜底。
   * 返回: { title, description, requirements: { topic, difficulty, count, tags }, nodes: [{ name, description, difficulty, tags }] }
   */
  async autoComposeFromNL(description: string, userId?: string): Promise<{
    title: string;
    description: string;
    requirements: { topic: string; difficulty: string; count: number; tags: string[] };
    nodes: Array<{ name: string; description: string; difficulty: string; tags: string[] }>;
  }> {
    const fallbackResult = this.fallbackAutoComposeFromNL(description);

    if (!(await this.isFeatureEnabled('auto-compose'))) {
      return fallbackResult;
    }

    const config = await this.getConfig();
    if (!config?.apiKey) {
      return fallbackResult;
    }

    const prompt = `你是一位专业的编程教育专家。请根据以下自然语言描述，解析出结构化的题单组建需求，并建议一个知识树结构。

用户描述：${description}

请以JSON格式返回，格式为：
{
  "title": "题单标题（简洁明了）",
  "description": "题单描述（1-2句话）",
  "requirements": {
    "topic": "主题（如：动态规划、字符串算法、图论等）",
    "difficulty": "难度（EASY/MEDIUM/HARD 或混合，如 MEDIUM）",
    "count": 5,
    "tags": ["标签1", "标签2"]
  },
  "nodes": [
    {
      "name": "一级分类名称",
      "description": "该分类的简要描述",
      "difficulty": "EASY/MEDIUM/HARD",
      "tags": ["相关标签"]
    }
  ]
}

要求：
1. title 应简短有力，体现主题
2. requirements 准确反映用户意图，count 默认为5
3. nodes 是建议的知识树一级分类结构，每个分类代表题单中的一个子专题
4. nodes 的数量应根据题目总数合理划分（通常2-5个分类）
5. 各分类的难度应有梯度，从易到难排列
6. 所有文本使用中文`;

    const response = await this.callAI(prompt, config, 'auto-compose', userId);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || fallbackResult.title,
          description: parsed.description || fallbackResult.description,
          requirements: {
            topic: parsed.requirements?.topic || fallbackResult.requirements.topic,
            difficulty: parsed.requirements?.difficulty || fallbackResult.requirements.difficulty,
            count: parsed.requirements?.count || fallbackResult.requirements.count,
            tags: Array.isArray(parsed.requirements?.tags) ? parsed.requirements.tags : fallbackResult.requirements.tags,
          },
          nodes: Array.isArray(parsed.nodes)
            ? parsed.nodes.map((n: any) => ({
                name: n.name || '未命名分类',
                description: n.description || '',
                difficulty: n.difficulty || 'MEDIUM',
                tags: Array.isArray(n.tags) ? n.tags : [],
              }))
            : fallbackResult.nodes,
        };
      }
    } catch (e) {
      console.error('解析AI自动组建响应失败:', e);
    }

    return fallbackResult;
  }

  /**
   * 基于关键词规则的兜底解析，AI 不可用时使用。
   * 从描述中提取主题、难度、数量，生成简单的扁平知识树结构。
   */
  private fallbackAutoComposeFromNL(description: string): {
    title: string;
    description: string;
    requirements: { topic: string; difficulty: string; count: number; tags: string[] };
    nodes: Array<{ name: string; description: string; difficulty: string; tags: string[] }>;
  } {
    const desc = description.toLowerCase();

    const topicRules: Array<{ keywords: string[]; topic: string; tags: string[] }> = [
      { keywords: ['动态规划', 'dp', '记忆化', '递推'], topic: '动态规划', tags: ['动态规划', 'DP'] },
      { keywords: ['字符串', 'string', '回文', '匹配', 'kmp'], topic: '字符串算法', tags: ['字符串'] },
      { keywords: ['图', '最短路', 'bfs', 'dfs', '拓扑', '连通'], topic: '图论', tags: ['图论'] },
      { keywords: ['树', '二叉树', '遍历', '节点'], topic: '树结构', tags: ['树'] },
      { keywords: ['排序', 'sort', '快排', '归并', '冒泡'], topic: '排序算法', tags: ['排序'] },
      { keywords: ['搜索', '查找', 'find', '二分', 'search'], topic: '搜索算法', tags: ['搜索', '二分'] },
      { keywords: ['贪心', 'greedy'], topic: '贪心算法', tags: ['贪心'] },
      { keywords: ['数学', '素数', 'gcd', '组合', '排列', '概率'], topic: '数学', tags: ['数学'] },
      { keywords: ['数组', 'array', '双指针', '滑动窗口'], topic: '数组与双指针', tags: ['数组', '双指针'] },
      { keywords: ['链表', 'linked list', '反转'], topic: '链表', tags: ['链表'] },
      { keywords: ['栈', 'stack', '括号', '队列', 'queue'], topic: '栈与队列', tags: ['栈', '队列'] },
      { keywords: ['递归', 'recursion', '分治', '回溯'], topic: '递归与分治', tags: ['递归', '分治'] },
    ];

    let topic = '综合练习';
    let tags: string[] = [];
    for (const rule of topicRules) {
      if (rule.keywords.some(kw => desc.includes(kw))) {
        topic = rule.topic;
        tags = rule.tags;
        break;
      }
    }

    let difficulty = 'MEDIUM';
    if (desc.includes('简单') || desc.includes('入门') || desc.includes('基础') || desc.includes('easy')) {
      difficulty = 'EASY';
    } else if (desc.includes('困难') || desc.includes('进阶') || desc.includes('hard') || desc.includes('高级')) {
      difficulty = 'HARD';
    } else if (desc.includes('中等') || desc.includes('medium')) {
      difficulty = 'MEDIUM';
    }

    const countMatch = description.match(/(\d+)\s*[道题个]/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 5;

    const difficultyLabels: Record<string, string> = { EASY: '入门', MEDIUM: '进阶', HARD: '高级' };
    const nodes = [
      { name: `${topic}-基础`, description: `${topic}基础概念与简单应用`, difficulty: 'EASY', tags },
      { name: `${topic}-进阶`, description: `${topic}中等难度综合练习`, difficulty: 'MEDIUM', tags },
      { name: `${topic}-挑战`, description: `${topic}高难度拓展挑战`, difficulty: 'HARD', tags },
    ];

    return {
      title: `${topic}专题练习`,
      description: `包含${difficultyLabels[difficulty] || ''}${topic}相关题目`,
      requirements: { topic, difficulty, count, tags },
      nodes,
    };
  }

  async companionChat(params: { type: 'CODE_REVIEW' | 'ERROR_DIAGNOSIS' | 'HINT' | 'KNOWLEDGE_LINK'; code?: string; language?: string; problem?: any; errorResult?: any; userId?: string }) {
    const config = await this.getConfig();

    let prompt = '';
    switch (params.type) {
      case 'CODE_REVIEW':
        prompt = `你是一位编程导师，正在审查学生的代码。请从以下维度简洁评价（每维度1-2句话）：
1. 正确性：逻辑是否正确，边界是否处理
2. 效率：时间/空间复杂度，有无优化空间
3. 风格：命名、代码组织

题目：${params.problem?.title || '未知'}
语言：${params.language || '未知'}
代码：
\`\`\`${params.language || ''}
${params.code || ''}
\`\`\`

请用中文回复，简洁明了。`;
        break;
      case 'ERROR_DIAGNOSIS':
        prompt = `学生提交代码后判题失败，请诊断错误原因并给出修复建议。

题目：${params.problem?.title || '未知'}
语言：${params.language || '未知'}
判题结果：${JSON.stringify(params.errorResult || {})}
学生代码：
\`\`\`${params.language || ''}
${params.code || ''}
\`\`\`

请指出：
1. 错误原因（1句话）
2. 修复方向（1-2句话）
3. 关键修改点（具体代码片段）

用中文回复，简洁明了。`;
        break;
      case 'HINT':
        prompt = `学生正在做以下题目，请给一个渐进式提示（不要直接给出答案）。

题目：${params.problem?.title || '未知'}
难度：${params.problem?.difficulty || '未知'}
描述：${(params.problem?.description || '').substring(0, 500)}

请给出：
1. 解题思路方向（1句话）
2. 关键算法/数据结构提示（1句话）
3. 注意事项（1句话）

用中文回复，不要给出完整代码。`;
        break;
      case 'KNOWLEDGE_LINK':
        prompt = `学生刚完成一道题目，请推荐相关知识点和相似题目类型。

题目：${params.problem?.title || '未知'}
标签：${params.problem?.tags || '[]'}
难度：${params.problem?.difficulty || '未知'}

请推荐：
1. 相关知识点（3-5个，每个1句话说明关联）
2. 建议接下来练习的题目类型（2-3个）

用中文回复，简洁明了。`;
        break;
    }

    if (config?.enabled && config.apiKey) {
      try {
        const response = await this.callAI(prompt, config, `companion-${params.type.toLowerCase()}`, params.userId);
        return { type: params.type, content: response, source: 'ai' };
      } catch {
        return { type: params.type, content: this.fallbackCompanion(params), source: 'fallback' };
      }
    }
    return { type: params.type, content: this.fallbackCompanion(params), source: 'fallback' };
  }

  /**
   * 流式版本的 companionChat，逐块 yield 文本内容。
   * prompt 构建逻辑与 companionChat 完全一致，AI 可用时走 callAIStream，
   * 不可用时将 fallback 文本作为单个 chunk 一次性 yield。
   */
  async *companionChatStream(
    params: { type: 'CODE_REVIEW' | 'ERROR_DIAGNOSIS' | 'HINT' | 'KNOWLEDGE_LINK'; code?: string; language?: string; problem?: any; errorResult?: any; userId?: string }
  ): AsyncGenerator<string, void, unknown> {
    let prompt = '';
    switch (params.type) {
      case 'CODE_REVIEW':
        prompt = `你是一位编程导师，正在审查学生的代码。请从以下维度简洁评价（每维度1-2句话）：
1. 正确性：逻辑是否正确，边界是否处理
2. 效率：时间/空间复杂度，有无优化空间
3. 风格：命名、代码组织

题目：${params.problem?.title || '未知'}
语言：${params.language || '未知'}
代码：
\`\`\`${params.language || ''}
${params.code || ''}
\`\`\`

请用中文回复，简洁明了。`;
        break;
      case 'ERROR_DIAGNOSIS':
        prompt = `学生提交代码后判题失败，请诊断错误原因并给出修复建议。

题目：${params.problem?.title || '未知'}
语言：${params.language || '未知'}
判题结果：${JSON.stringify(params.errorResult || {})}
学生代码：
\`\`\`${params.language || ''}
${params.code || ''}
\`\`\`

请指出：
1. 错误原因（1句话）
2. 修复方向（1-2句话）
3. 关键修改点（具体代码片段）

用中文回复，简洁明了。`;
        break;
      case 'HINT':
        prompt = `学生正在做以下题目，请给一个渐进式提示（不要直接给出答案）。

题目：${params.problem?.title || '未知'}
难度：${params.problem?.difficulty || '未知'}
描述：${(params.problem?.description || '').substring(0, 500)}

请给出：
1. 解题思路方向（1句话）
2. 关键算法/数据结构提示（1句话）
3. 注意事项（1句话）

用中文回复，不要给出完整代码。`;
        break;
      case 'KNOWLEDGE_LINK':
        prompt = `学生刚完成一道题目，请推荐相关知识点和相似题目类型。

题目：${params.problem?.title || '未知'}
标签：${params.problem?.tags || '[]'}
难度：${params.problem?.difficulty || '未知'}

请推荐：
1. 相关知识点（3-5个，每个1句话说明关联）
2. 建议接下来练习的题目类型（2-3个）

用中文回复，简洁明了。`;
        break;
    }

    const config = await this.getConfig();

    if (config?.enabled && config.apiKey) {
      try {
        yield* this.callAIStream(prompt, config, `companion-${params.type.toLowerCase()}`, params.userId);
        return;
      } catch {
        // AI 调用失败时降级到 fallback
      }
    }

    yield this.fallbackCompanion(params);
  }

  private fallbackCompanion(params: any): string {
    switch (params.type) {
      case 'CODE_REVIEW':
        return '代码审查：请检查边界条件处理、变量命名规范性和算法复杂度。建议添加必要的注释说明关键逻辑。';
      case 'ERROR_DIAGNOSIS':
        return '错误诊断：请检查1)输入输出格式是否匹配 2)边界条件是否处理 3)数据类型是否溢出 4)算法复杂度是否超限。';
      case 'HINT':
        return '解题提示：先理解题目要求，考虑使用什么数据结构和算法，注意边界条件和特殊情况的处理。';
      case 'KNOWLEDGE_LINK':
        return '知识关联：建议复习相关算法和数据结构知识，尝试不同难度的相似题目来巩固理解。';
      default:
        return '暂无建议。';
    }
  }

  /**
   * 默认功能配置定义：所有 AI 功能的 featureKey、名称、描述
   */
  private static DEFAULT_FEATURE_CONFIGS = [
    { featureKey: 'explain-code', featureName: '代码解释', description: '学生可以对代码请求AI解释，了解代码逻辑' },
    { featureKey: 'hint', featureName: '解题提示', description: '提供解题思路，引导但不直接给出答案' },
    { featureKey: 'diagnose', featureName: '错误诊断', description: '分析代码错误原因并提供修复建议' },
    { featureKey: 'generate-solution', featureName: '题解生成', description: 'AI自动生成题目的详细题解' },
    { featureKey: 'generate-testcases', featureName: '测试用例生成', description: '为编程题自动生成判题测试用例' },
    { featureKey: 'parse-knowledge-tree', featureName: '知识树解析', description: '从文本文件解析生成知识树结构' },
    { featureKey: 'classify-problem', featureName: '题目分类', description: 'AI自动将题目归类到知识树节点' },
    { featureKey: 'parse-problem-file', featureName: '题目文件解析', description: '从txt/pdf文件批量导入题目' },
    { featureKey: 'ai-judge', featureName: 'AI判题', description: 'AI预测代码能否通过测试用例' },
    { featureKey: 'optimize-code', featureName: '代码优化', description: 'AI分析代码并给出优化建议' },
    { featureKey: 'recommend-similar', featureName: '相似题目推荐', description: '基于标签和内容推荐相似题目' },
    { featureKey: 'generate-exam', featureName: '智能组卷', description: 'AI根据条件自动组卷' },
    { featureKey: 'batch-classify', featureName: '批量分类', description: '批量为题目打标签' },
    { featureKey: 'companion', featureName: 'AI学伴', description: 'AI学伴对话功能' },
    { featureKey: 'generate-learning-path', featureName: '学习路径生成', description: '根据学生水平生成个性化学习路径' },
    { featureKey: 'analyze-submission-trend', featureName: '提交趋势分析', description: '分析近期提交中的常见错误和改进方向' },
    { featureKey: 'smart-hint', featureName: '智能提示', description: '根据尝试次数提供渐进式提示' },
    { featureKey: 'auto-compose', featureName: 'AI自动组建题单', description: '从自然语言描述自动创建知识树题单' },
    { featureKey: 'personalized-plan', featureName: '个性化题单与考试', description: '基于学生画像生成个性化题单和考试' },
    { featureKey: 'personalized-recommendations', featureName: '个性化学习建议', description: '基于学生数据提供个性化学习建议和下一步方向' },
  ];

  /**
   * 获取所有功能配置
   */
  async getFeatureConfigs() {
    return prisma.aIFeatureConfig.findMany({
      orderBy: { featureKey: 'asc' },
    });
  }

  /**
   * 更新指定功能的配置
   */
  async updateFeatureConfig(featureKey: string, data: {
    enabled?: boolean;
    promptTemplate?: string;
    maxTokens?: number;
    temperature?: number;
    description?: string;
    featureName?: string;
  }) {
    const existing = await prisma.aIFeatureConfig.findUnique({
      where: { featureKey },
    });

    if (!existing) {
      throw new Error(`功能配置 ${featureKey} 不存在，请先初始化`);
    }

    return prisma.aIFeatureConfig.update({
      where: { featureKey },
      data: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.promptTemplate !== undefined && { promptTemplate: data.promptTemplate }),
        ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.featureName !== undefined && { featureName: data.featureName }),
      },
    });
  }

  /**
   * 初始化默认功能配置：为所有已知功能创建配置记录
   * 已存在的功能不会被覆盖
   */
  async initializeFeatureConfigs() {
    const existing = await prisma.aIFeatureConfig.findMany({
      select: { featureKey: true },
    });
    const existingKeys = new Set(existing.map(e => e.featureKey));

    const toCreate = AIService.DEFAULT_FEATURE_CONFIGS.filter(
      cfg => !existingKeys.has(cfg.featureKey),
    );

    if (toCreate.length === 0) {
      return { created: 0, total: existing.length };
    }

    await prisma.aIFeatureConfig.createMany({
      data: toCreate.map(cfg => ({
        featureKey: cfg.featureKey,
        featureName: cfg.featureName,
        description: cfg.description,
        enabled: true,
        promptTemplate: '',
        maxTokens: 4000,
        temperature: 0.7,
      })),
    });

    return { created: toCreate.length, total: existing.length + toCreate.length };
  }

  /**
   * 生成个性化题单或考试：基于学生画像、提交记录和薄弱点，
   * 由 AI 选择最合适的题目并给出推荐理由。
   * AI 不可用时降级为基于规则的选题策略。
   */
  async generatePersonalizedPlan(params: {
    userId: string;
    type: 'PROBLEM_LIST' | 'EXAM';
    options?: {
      targetArea?: string;
      difficulty?: string;
      count?: number;
      timeLimit?: number;
    };
  }): Promise<{
    title: string;
    description: string;
    problems: Array<{ id: string; reason: string }>;
    estimatedTime: string;
    focusAreas: string[];
  }> {
    const { userId, type, options = {} } = params;
    const count = options.count || (type === 'EXAM' ? 5 : 8);

    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    const abilityRadar: Record<string, number> = profile?.abilityRadar
      ? JSON.parse(profile.abilityRadar)
      : {};
    const weakPoints: Array<{ tag: string; errorCount: number }> = profile?.weakPoints
      ? JSON.parse(profile.weakPoints)
      : [];
    const knowledgeMap: Record<string, number> = profile?.knowledgeMap
      ? JSON.parse(profile.knowledgeMap)
      : {};

    const recentSubmissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: {
          select: { id: true, title: true, tags: true, difficulty: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const wrongSubmissions = recentSubmissions.filter(s => s.status !== 'ACCEPTED');
    const wrongTagMap: Record<string, number> = {};
    for (const sub of wrongSubmissions) {
      const tags: string[] = JSON.parse(sub.problem.tags || '[]');
      for (const tag of tags) {
        wrongTagMap[tag] = (wrongTagMap[tag] || 0) + 1;
      }
    }
    const wrongTagsSorted = Object.entries(wrongTagMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const submissionPattern = recentSubmissions.slice(0, 20).map(s => ({
      title: s.problem.title,
      status: s.status,
      tags: JSON.parse(s.problem.tags || '[]'),
      difficulty: s.problem.difficulty,
    }));

    const lowAcNodes = Object.entries(knowledgeMap)
      .filter(([, rate]) => rate < 40)
      .slice(0, 5)
      .map(([nodeId, rate]) => ({ nodeId, acRate: rate }));

    const solvedProblemIds = new Set(
      recentSubmissions.filter(s => s.status === 'ACCEPTED').map(s => s.problemId)
    );

    const difficultyFilter = options.difficulty
      ? { difficulty: options.difficulty }
      : {};

    const candidateProblems = await prisma.problem.findMany({
      where: {
        type: 'PROGRAMMING',
        ...difficultyFilter,
      },
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        type: true,
      },
      take: 100,
    });

    if (candidateProblems.length === 0) {
      return {
        title: type === 'EXAM' ? '个性化考试' : '个性化题单',
        description: '系统中暂无可用题目',
        problems: [],
        estimatedTime: '0分钟',
        focusAreas: [],
      };
    }

    const aiEnabled = await this.isFeatureEnabled('personalized-plan');
    const config = await this.getConfig();

    if (aiEnabled && config?.apiKey) {
      const problemList = candidateProblems.map(p => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        tags: JSON.parse(p.tags || '[]'),
        solved: solvedProblemIds.has(p.id),
      }));

      const typeInstruction = type === 'EXAM'
        ? `请组织一份考试试卷，要求：
1. 难度分布合理（简单:中等:困难 ≈ 3:5:2）
2. 题目之间知识点不重复
3. 考试时间控制在 ${options.timeLimit || 60} 分钟内
4. 优先考查学生的薄弱环节`
        : `请组织一份练习题单，要求：
1. 难度渐进：从学生薄弱但能上手的基础题开始，逐步提升
2. 重点针对学生的薄弱标签安排更多练习
3. 同一知识点的题目不超过2道
4. 包含少量已掌握领域的综合题以巩固`;

      const prompt = `你是一位专业的编程教育专家。请根据以下学生数据，${type === 'EXAM' ? '为其组织一份个性化考试' : '为其制定一份个性化练习题单'}。

## 学生能力雷达
${Object.entries(abilityRadar).map(([dim, val]) => `- ${dim}: ${val}%`).join('\n') || '- 暂无数据'}

## 薄弱知识点（按错误频次排序）
${weakPoints.map(wp => `- ${wp.tag}: 错误 ${wp.errorCount} 次`).join('\n') || '- 暂无数据'}

## 错误标签分布
${wrongTagsSorted.map(wt => `- ${wt.tag}: ${wt.count} 次`).join('\n') || '- 暂无数据'}

## 近期提交模式
${submissionPattern.map(sp => `- ${sp.title} (${sp.difficulty}) [${sp.tags.join(', ')}] → ${sp.status}`).join('\n') || '- 暂无数据'}

## 知识地图薄弱节点（AC率 < 40%）
${lowAcNodes.map(n => `- 节点 ${n.nodeId}: AC率 ${n.acRate}%`).join('\n') || '- 暂无数据'}

${options.targetArea ? `## 目标领域\n${options.targetArea}\n` : ''}

## 可选题目列表
${JSON.stringify(problemList, null, 2)}

${typeInstruction}

请以JSON格式返回：
{
  "title": "题单/考试标题",
  "description": "简要描述（1-2句话）",
  "selectedProblems": [
    { "id": "题目ID", "reason": "选择该题的理由" }
  ],
  "estimatedTime": "预计完成时间（如：45分钟）",
  "focusAreas": ["重点关注的领域1", "领域2"]
}

请选择 ${count} 道题目。`;

      try {
        const response = await this.callAI(prompt, config, 'personalized-plan', userId);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validIds = new Set(candidateProblems.map(p => p.id));
          const problems = (parsed.selectedProblems || [])
            .filter((p: any) => validIds.has(p.id))
            .slice(0, count);
          return {
            title: parsed.title || (type === 'EXAM' ? '个性化考试' : '个性化题单'),
            description: parsed.description || '',
            problems,
            estimatedTime: parsed.estimatedTime || `${count * 15}分钟`,
            focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [],
          };
        }
      } catch (e) {
        console.error('AI个性化计划生成失败，降级为规则选择:', e);
      }
    }

    return this.fallbackGeneratePersonalizedPlan(
      candidateProblems,
      weakPoints,
      solvedProblemIds,
      type,
      count,
    );
  }

  /**
   * 基于规则的个性化计划降级方案：
   * 按薄弱标签匹配题目，按难度渐进排序。
   */
  private fallbackGeneratePersonalizedPlan(
    candidates: Array<{ id: string; title: string; difficulty: string; tags: string; type: string }>,
    weakPoints: Array<{ tag: string; errorCount: number }>,
    solvedIds: Set<string>,
    type: 'PROBLEM_LIST' | 'EXAM',
    count: number,
  ): {
    title: string;
    description: string;
    problems: Array<{ id: string; reason: string }>;
    estimatedTime: string;
    focusAreas: string[];
  } {
    const weakTags = new Set(weakPoints.map(wp => wp.tag));
    const difficultyOrder: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };

    const scored = candidates.map(p => {
      const tags: string[] = JSON.parse(p.tags || '[]');
      const weakMatch = tags.filter(t => weakTags.has(t)).length;
      const score = weakMatch * 10 + (difficultyOrder[p.difficulty] ?? 1);
      return { ...p, parsedTags: tags, weakMatch, score };
    });

    if (type === 'PROBLEM_LIST') {
      scored.sort((a, b) => {
        if (a.weakMatch !== b.weakMatch) return b.weakMatch - a.weakMatch;
        return (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
      });
    } else {
      scored.sort(() => Math.random() - 0.5);
    }

    const selected = scored.slice(0, count);
    const focusAreas = [...weakTags].slice(0, 3);

    return {
      title: type === 'EXAM' ? '个性化考试' : '个性化练习题单',
      description: `基于你的薄弱点${focusAreas.length > 0 ? `（${focusAreas.join('、')}）` : ''}，为你${type === 'EXAM' ? '组织了考试' : '精选了练习题'}`,
      problems: selected.map(p => ({
        id: p.id,
        reason: p.weakMatch > 0
          ? `针对薄弱点 ${p.parsedTags.filter(t => weakTags.has(t)).join('、')} 的练习`
          : `${p.difficulty} 难度综合练习`,
      })),
      estimatedTime: `${count * 15}分钟`,
      focusAreas,
    };
  }

  /**
   * 获取个性化学习建议：基于学生画像和提交记录，
   * 由 AI 分析学生的优劣势并给出下一步学习方向。
   * AI 不可用时降级为基于规则的建议。
   */
  async getPersonalizedRecommendations(params: {
    userId: string;
  }): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    nextSteps: Array<{ area: string; reason: string; problemIds: string[] }>;
  }> {
    const { userId } = params;

    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    const abilityRadar: Record<string, number> = profile?.abilityRadar
      ? JSON.parse(profile.abilityRadar)
      : {};
    const weakPoints: Array<{ tag: string; errorCount: number }> = profile?.weakPoints
      ? JSON.parse(profile.weakPoints)
      : [];

    const wrongSubmissions = await prisma.submission.findMany({
      where: { userId, status: { not: 'ACCEPTED' } },
      include: {
        problem: {
          select: { id: true, title: true, tags: true, difficulty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const wrongTagMap: Record<string, number> = {};
    for (const sub of wrongSubmissions) {
      const tags: string[] = JSON.parse(sub.problem.tags || '[]');
      for (const tag of tags) {
        wrongTagMap[tag] = (wrongTagMap[tag] || 0) + 1;
      }
    }

    const aiEnabled = await this.isFeatureEnabled('personalized-recommendations');
    const config = await this.getConfig();

    if (aiEnabled && config?.apiKey) {
      const prompt = `你是一位专业的编程教育分析师。请根据以下学生数据，分析其学习状况并给出个性化建议。

## 学生能力雷达
${Object.entries(abilityRadar).map(([dim, val]) => `- ${dim}: ${val}%`).join('\n') || '- 暂无数据'}

## 薄弱知识点
${weakPoints.map(wp => `- ${wp.tag}: 错误 ${wp.errorCount} 次`).join('\n') || '- 暂无数据'}

## 错误标签分布
${Object.entries(wrongTagMap)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 8)
  .map(([tag, count]) => `- ${tag}: ${count} 次`)
  .join('\n') || '- 暂无数据'}

请以JSON格式返回：
{
  "summary": "总体学习情况概述（2-3句话）",
  "strengths": ["优势1", "优势2", ...],
  "weaknesses": ["不足1", "不足2", ...],
  "nextSteps": [
    {
      "area": "建议加强的领域",
      "reason": "为什么建议加强这个领域",
      "suggestedTags": ["相关标签1", "标签2"]
    }
  ]
}

要求：
1. strengths 列出2-3个优势领域
2. weaknesses 列出2-3个不足领域
3. nextSteps 给出3-5个具体可执行的下一步学习方向`;

      try {
        const response = await this.callAI(prompt, config, 'personalized-recommendations', userId);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const nextSteps = await this.enrichNextStepsWithProblems(
            Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
          );
          return {
            summary: parsed.summary || '暂无分析',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            nextSteps,
          };
        }
      } catch (e) {
        console.error('AI个性化建议生成失败，降级为规则建议:', e);
      }
    }

    return this.fallbackGetPersonalizedRecommendations(abilityRadar, weakPoints, wrongTagMap);
  }

  /**
   * 将 AI 返回的 nextSteps 中的 suggestedTags 映射为实际题目 ID
   */
  private async enrichNextStepsWithProblems(
    nextSteps: Array<{ area: string; reason: string; suggestedTags?: string[] }>,
  ): Promise<Array<{ area: string; reason: string; problemIds: string[] }>> {
    const enriched = [];
    for (const step of nextSteps.slice(0, 5)) {
      const tags = step.suggestedTags || [];
      let problems: Array<{ id: string; tags: string }> = [];
      if (tags.length > 0) {
        problems = await prisma.problem.findMany({
          where: { type: 'PROGRAMMING' },
          select: { id: true, tags: true },
          take: 30,
        });
        problems = problems.filter(p => {
          const pTags: string[] = JSON.parse(p.tags || '[]');
          return tags.some(t => pTags.some(pt => pt.includes(t) || t.includes(pt)));
        });
      }
      if (problems.length === 0) {
        const fallback = await prisma.problem.findMany({
          where: { type: 'PROGRAMMING' },
          select: { id: true },
          take: 3,
          orderBy: { createdAt: 'desc' },
        });
        problems = fallback.map(p => ({ id: p.id, tags: '[]' }));
      }
      enriched.push({
        area: step.area,
        reason: step.reason,
        problemIds: problems.slice(0, 3).map(p => p.id),
      });
    }
    return enriched;
  }

  /**
   * 基于规则的个性化建议降级方案
   */
  private fallbackGetPersonalizedRecommendations(
    abilityRadar: Record<string, number>,
    weakPoints: Array<{ tag: string; errorCount: number }>,
    wrongTagMap: Record<string, number>,
  ): {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    nextSteps: Array<{ area: string; reason: string; problemIds: string[] }>;
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [dim, val] of Object.entries(abilityRadar)) {
      if (val >= 60) strengths.push(`${dim}（掌握率 ${val}%）`);
      else if (val < 40) weaknesses.push(`${dim}（掌握率 ${val}%）`);
    }

    if (strengths.length === 0) strengths.push('暂无突出优势，继续练习即可建立');
    if (weaknesses.length === 0 && weakPoints.length > 0) {
      weaknesses.push(...weakPoints.slice(0, 3).map(wp => `${wp.tag}（错误 ${wp.errorCount} 次）`));
    }
    if (weaknesses.length === 0) weaknesses.push('数据不足，暂无法判断薄弱点');

    const topWeakTags = Object.entries(wrongTagMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);

    const nextSteps: Array<{ area: string; reason: string; problemIds: string[] }> = [];
    for (const tag of topWeakTags) {
      nextSteps.push({
        area: tag,
        reason: `在${tag}相关题目上错误较多，建议加强练习`,
        problemIds: [],
      });
    }

    if (nextSteps.length === 0) {
      nextSteps.push({
        area: '基础练习',
        reason: '建议从基础题目开始，逐步建立各领域能力',
        problemIds: [],
      });
    }

    const acceptedCount = Object.values(abilityRadar).filter(v => v >= 50).length;
    const totalDims = Object.keys(abilityRadar).length || 5;
    const summary = totalDims > 0
      ? `你在 ${acceptedCount}/${totalDims} 个能力维度上达到及格水平。${weaknesses.length > 0 ? `需要重点关注：${weaknesses.slice(0, 2).join('、')}。` : '继续保持！'}`
      : '暂无足够数据进行分析，建议多做题以积累学习画像。';

    return { summary, strengths, weaknesses, nextSteps };
  }

  /**
   * 检查指定功能是否启用
   * 如果配置记录不存在，默认视为启用（向后兼容）
   */
  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const globalEnabled = await this.isEnabled();
    if (!globalEnabled) return false;

    const config = await prisma.aIFeatureConfig.findUnique({
      where: { featureKey },
      select: { enabled: true },
    });

    if (!config) return true;
    return config.enabled;
  }
}

export const aiService = new AIService();
