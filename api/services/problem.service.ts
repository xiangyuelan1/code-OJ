import prisma from '../lib/prisma';

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export interface TestCase {
  input: string;
  output: string;
  isSample?: boolean;
}

export interface Choice {
  key: string;
  text: string;
}

export interface ProblemInput {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  tags?: string[];
  testCases?: TestCase[];
  timeLimit?: number;
  memoryLimit?: number;
  choices?: Choice[];
  correctAnswer?: string;
  fillBlanks?: string[];
  sourceFile?: string;
}

export class ProblemService {
  async createProblem(data: ProblemInput) {
    // 尝试完整创建，如果失败则尝试不带可选字段
    const baseData: any = {
      title: data.title,
      description: data.description,
      type: data.type,
      difficulty: data.difficulty,
      tags: JSON.stringify(data.tags || []),
      testCases: JSON.stringify(data.testCases || []),
      timeLimit: data.timeLimit || 2000,
      memoryLimit: data.memoryLimit || 256,
      choices: data.choices ? JSON.stringify(data.choices) : null,
      correctAnswer: data.correctAnswer || null,
      fillBlanks: data.fillBlanks ? JSON.stringify(data.fillBlanks) : null,
    };

    // 尝试添加 sourceFile，但如果报错就去掉
    try {
      return await prisma.problem.create({
        data: {
          ...baseData,
          sourceFile: data.sourceFile || null
        }
      });
    } catch (error) {
      // 如果带 sourceFile 失败，尝试不带它
      try {
        return await prisma.problem.create({
          data: baseData
        });
      } catch (error2) {
        // 进一步简化，只保留最基本的字段
        const minimalData = {
          title: data.title,
          description: data.description,
          type: data.type,
          difficulty: data.difficulty,
          tags: JSON.stringify(data.tags || []),
          testCases: JSON.stringify(data.testCases || []),
          timeLimit: data.timeLimit || 2000,
          memoryLimit: data.memoryLimit || 256,
        };
        return await prisma.problem.create({
          data: minimalData
        });
      }
    }
  }

  async getAllProblems(filters?: {
    type?: string;
    difficulty?: string;
    search?: string;
    tag?: string;
    knowledgeTreeId?: string;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }
    if (filters?.tag) {
      where.tags = { contains: filters.tag };
    }
    if (filters?.knowledgeTreeId) {
      where.knowledgeTreeId = filters.knowledgeTreeId;
    }

    return await prisma.problem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        difficulty: true,
        tags: true,
        knowledgeTreeId: true,
        createdAt: true
      }
    });
  }

  async getProblemById(id: string, includeHiddenTestCases: boolean = false) {
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (!problem) return null;

    const allTestCases: TestCase[] = safeJsonParse(problem.testCases, []);
    const visibleTestCases = includeHiddenTestCases
      ? allTestCases
      : allTestCases.filter(tc => tc.isSample);

    return {
      ...problem,
      tags: safeJsonParse(problem.tags, []),
      testCases: visibleTestCases,
      choices: safeJsonParse(problem.choices, null),
      fillBlanks: safeJsonParse(problem.fillBlanks, null),
      submissionCount: problem._count.submissions
    };
  }

  async updateProblem(id: string, data: Partial<ProblemInput>) {
    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (data.difficulty) updateData.difficulty = data.difficulty;
    if (data.tags) updateData.tags = JSON.stringify(data.tags);
    if (data.testCases) updateData.testCases = JSON.stringify(data.testCases);
    if (data.timeLimit) updateData.timeLimit = data.timeLimit;
    if (data.memoryLimit) updateData.memoryLimit = data.memoryLimit;
    if (data.choices) updateData.choices = JSON.stringify(data.choices);
    if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer;
    if (data.fillBlanks) updateData.fillBlanks = JSON.stringify(data.fillBlanks);

    // 尝试添加 sourceFile，但在错误时忽略
    try {
      if (data.sourceFile !== undefined) {
        updateData.sourceFile = data.sourceFile;
      }
    } catch (error) {
      // 忽略 sourceFile 相关错误
    }

    try {
      return await prisma.problem.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      // 如果完整更新失败，尝试简化更新
      const minimalUpdateData: any = {};
      if (data.title) minimalUpdateData.title = data.title;
      if (data.description) minimalUpdateData.description = data.description;
      if (data.type) minimalUpdateData.type = data.type;
      if (data.difficulty) minimalUpdateData.difficulty = data.difficulty;
      if (data.tags) minimalUpdateData.tags = JSON.stringify(data.tags);
      if (data.testCases) minimalUpdateData.testCases = JSON.stringify(data.testCases);
      if (data.timeLimit) minimalUpdateData.timeLimit = data.timeLimit;
      if (data.memoryLimit) minimalUpdateData.memoryLimit = data.memoryLimit;

      return await prisma.problem.update({
        where: { id },
        data: minimalUpdateData
      });
    }
  }

  async deleteProblem(id: string) {
    return await prisma.problem.delete({
      where: { id }
    });
  }

  async batchCreateProblems(problems: ProblemInput[]) {
    const results: { success: boolean; data?: any; error?: string; title?: string }[] = [];

    for (const problem of problems) {
      try {
        const created = await this.createProblem(problem);
        results.push({ success: true, data: created, title: problem.title });
      } catch (error: any) {
        results.push({ success: false, error: error.message, title: problem.title });
      }
    }

    return results;
  }

  async getProblemStats() {
    const total = await prisma.problem.count();
    const byType = await prisma.problem.groupBy({
      by: ['type'],
      _count: { type: true }
    });
    const byDifficulty = await prisma.problem.groupBy({
      by: ['difficulty'],
      _count: { difficulty: true }
    });

    return { total, byType, byDifficulty };
  }
}

export const problemService = new ProblemService();
