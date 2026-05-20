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

const PROBLEM_FIELDS = new Set(Object.keys(prisma.problem.fields));

function buildCreateData(data: ProblemInput): any {
  const result: any = {
    title: String(data.title || ''),
    description: String(data.description || ''),
    type: String(data.type || 'PROGRAMMING'),
    difficulty: String(data.difficulty || 'MEDIUM'),
    tags: JSON.stringify(data.tags || []),
    testCases: JSON.stringify(data.testCases || []),
    timeLimit: Number(data.timeLimit) || 2000,
    memoryLimit: Number(data.memoryLimit) || 256,
  };

  if (data.choices && data.choices.length > 0) {
    result.choices = JSON.stringify(data.choices);
  } else {
    result.choices = null;
  }

  if (data.correctAnswer != null && data.correctAnswer !== '') {
    result.correctAnswer = String(data.correctAnswer);
  } else {
    result.correctAnswer = null;
  }

  if (data.fillBlanks && data.fillBlanks.length > 0) {
    result.fillBlanks = JSON.stringify(data.fillBlanks);
  } else {
    result.fillBlanks = null;
  }

  if (PROBLEM_FIELDS.has('sourceFile') && data.sourceFile) {
    result.sourceFile = String(data.sourceFile);
  }

  return result;
}

export class ProblemService {
  async createProblem(data: ProblemInput) {
    const createData = buildCreateData(data);
    return await prisma.problem.create({ data: createData });
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
        knowledgeTree: { select: { id: true, name: true } },
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

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.testCases !== undefined) updateData.testCases = JSON.stringify(data.testCases);
    if (data.timeLimit !== undefined) updateData.timeLimit = data.timeLimit;
    if (data.memoryLimit !== undefined) updateData.memoryLimit = data.memoryLimit;
    if (data.choices !== undefined) updateData.choices = data.choices ? JSON.stringify(data.choices) : null;
    if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer;
    if (data.fillBlanks !== undefined) updateData.fillBlanks = data.fillBlanks ? JSON.stringify(data.fillBlanks) : null;

    if (PROBLEM_FIELDS.has('sourceFile') && data.sourceFile !== undefined) {
      updateData.sourceFile = data.sourceFile;
    }

    return await prisma.problem.update({
      where: { id },
      data: updateData
    });
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
        const existing = await prisma.problem.findFirst({
          where: { title: problem.title },
          select: { id: true }
        });

        let saved;
        if (existing) {
          const updateData = this.buildUpdateData(problem);
          saved = await prisma.problem.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else {
          saved = await this.createProblem(problem);
        }

        results.push({ success: true, data: saved, title: problem.title });
      } catch (error: any) {
        console.error(`批量导入题目"${problem.title}"失败:`, error.message);
        results.push({ success: false, error: error.message, title: problem.title });
      }
    }

    return results;
  }

  private buildUpdateData(data: Partial<ProblemInput>): any {
    const updateData: any = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.testCases !== undefined) updateData.testCases = JSON.stringify(data.testCases);
    if (data.timeLimit !== undefined) updateData.timeLimit = Number(data.timeLimit) || 2000;
    if (data.memoryLimit !== undefined) updateData.memoryLimit = Number(data.memoryLimit) || 256;
    if (data.choices !== undefined) updateData.choices = data.choices ? JSON.stringify(data.choices) : null;
    if (data.correctAnswer !== undefined) updateData.correctAnswer = String(data.correctAnswer || '');
    if (data.fillBlanks !== undefined) updateData.fillBlanks = data.fillBlanks ? JSON.stringify(data.fillBlanks) : null;

    if (PROBLEM_FIELDS.has('sourceFile') && data.sourceFile !== undefined) {
      updateData.sourceFile = data.sourceFile ? String(data.sourceFile) : null;
    }

    return updateData;
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
