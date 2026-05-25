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
    if (!(await this.isEnabled())) {
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
    if (!(await this.isEnabled())) {
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
    if (!(await this.isEnabled())) {
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
    if (!(await this.isEnabled())) {
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

    if (!(await this.isEnabled())) {
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
      return { problemIds: [], reasoning: '没有找到符合条件的题目' };
    }

    if (!(await this.isEnabled())) {
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
    if (!(await this.isEnabled())) {
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

    if (!(await this.isEnabled()) || !await this.getConfig().then(c => c?.apiKey)) {
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
}

export const aiService = new AIService();
