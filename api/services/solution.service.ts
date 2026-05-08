import prisma from '../lib/prisma';

export interface SolutionInput {
  problemId: string;
  title: string;
  content: string;
  code?: string;
  complexity?: string;
}

export class SolutionService {
  async createSolution(data: SolutionInput) {
    return await prisma.solution.create({
      data: {
        problemId: data.problemId,
        title: data.title,
        content: data.content,
        code: data.code || null,
        complexity: data.complexity || null
      }
    });
  }

  async getSolutionsByProblemId(problemId: string) {
    return await prisma.solution.findMany({
      where: { problemId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getSolutionById(id: string) {
    return await prisma.solution.findUnique({
      where: { id },
      include: {
        problem: {
          select: { id: true, title: true, type: true }
        }
      }
    });
  }

  async updateSolution(id: string, data: Partial<SolutionInput>) {
    const updateData: any = {};
    
    if (data.title) updateData.title = data.title;
    if (data.content) updateData.content = data.content;
    if (data.code !== undefined) updateData.code = data.code || null;
    if (data.complexity !== undefined) updateData.complexity = data.complexity || null;

    return await prisma.solution.update({
      where: { id },
      data: updateData
    });
  }

  async deleteSolution(id: string) {
    return await prisma.solution.delete({
      where: { id }
    });
  }

  async getAllSolutions() {
    return await prisma.solution.findMany({
      include: {
        problem: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const solutionService = new SolutionService();
