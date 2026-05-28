import prisma from '../lib/prisma';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export class LearningAdminService {
  async getLearningModuleStats() {
    const [regionCount, planetCount, interviewTemplates, bugScenarios] = await Promise.all([
      prisma.starRegion.count(),
      prisma.starPlanet.count(),
      prisma.interviewTemplate.count(),
      prisma.bugScenario.count(),
    ]);

    const totalExplorers = await prisma.userPlanetProgress.groupBy({
      by: ['userId'],
      _count: true,
    });

    return {
      starPath: { regionCount, planetCount, totalExplorers: totalExplorers.length },
      interview: { templateCount: interviewTemplates },
      bugHunter: { scenarioCount: bugScenarios },
    };
  }

  async manageStarRegion(data: {
    id?: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
  }) {
    if (data.id) {
      return prisma.starRegion.update({
        where: { id: data.id },
        data: {
          name: data.name,
          ...(data.description !== undefined && { description: data.description }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.order !== undefined && { order: data.order }),
        },
      });
    }
    return prisma.starRegion.create({
      data: {
        name: data.name,
        description: data.description || '',
        icon: data.icon || '⭐',
        color: data.color || '#4FC3F7',
        order: data.order ?? 0,
      },
    });
  }

  async deleteStarRegion(id: string) {
    return prisma.starRegion.delete({ where: { id } });
  }

  async manageStarPlanet(data: {
    id?: string;
    regionId: string;
    name: string;
    description?: string;
    difficulty?: string;
    tags?: string[];
    order?: number;
    posX?: number;
    posY?: number;
    problemIds?: string[];
  }) {
    if (data.id) {
      return prisma.starPlanet.update({
        where: { id: data.id },
        data: {
          regionId: data.regionId,
          name: data.name,
          ...(data.description !== undefined && { description: data.description }),
          ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
          ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.posX !== undefined && { posX: data.posX }),
          ...(data.posY !== undefined && { posY: data.posY }),
          ...(data.problemIds !== undefined && { problemIds: JSON.stringify(data.problemIds) }),
        },
      });
    }
    return prisma.starPlanet.create({
      data: {
        regionId: data.regionId,
        name: data.name,
        description: data.description || '',
        difficulty: data.difficulty || 'MEDIUM',
        tags: JSON.stringify(data.tags || []),
        order: data.order ?? 0,
        posX: data.posX ?? 0.5,
        posY: data.posY ?? 0.5,
        problemIds: JSON.stringify(data.problemIds || []),
      },
    });
  }

  async deleteStarPlanet(id: string) {
    return prisma.starPlanet.delete({ where: { id } });
  }

  async assignProblemsToPlanet(planetId: string, problemIds: string[]) {
    return prisma.starPlanet.update({
      where: { id: planetId },
      data: { problemIds: JSON.stringify(problemIds) },
    });
  }

  async getInterviewTemplates() {
    return prisma.interviewTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInterviewTemplate(data: {
    id?: string;
    role: string;
    difficulty: string;
    question: string;
    expectedTopics: string[];
    hints: string[];
    correctAnswer?: string;
  }) {
    if (data.id) {
      return prisma.interviewTemplate.update({
        where: { id: data.id },
        data: {
          role: data.role,
          difficulty: data.difficulty,
          question: data.question,
          expectedTopics: JSON.stringify(data.expectedTopics),
          hints: JSON.stringify(data.hints),
          ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        },
      });
    }
    return prisma.interviewTemplate.create({
      data: {
        role: data.role,
        difficulty: data.difficulty,
        question: data.question,
        expectedTopics: JSON.stringify(data.expectedTopics),
        hints: JSON.stringify(data.hints),
        correctAnswer: data.correctAnswer || '',
      },
    });
  }

  async deleteInterviewTemplate(id: string) {
    return prisma.interviewTemplate.delete({ where: { id } });
  }

  async getBugScenarios() {
    return prisma.bugScenario.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBugScenario(data: {
    id?: string;
    topic: string;
    difficulty: string;
    buggyCode: string;
    correctCode: string;
    hints: string[];
    bugExplanations: string[];
    language?: string;
  }) {
    if (data.id) {
      return prisma.bugScenario.update({
        where: { id: data.id },
        data: {
          topic: data.topic,
          difficulty: data.difficulty,
          buggyCode: data.buggyCode,
          correctCode: data.correctCode,
          hints: JSON.stringify(data.hints),
          bugExplanations: JSON.stringify(data.bugExplanations),
          ...(data.language !== undefined && { language: data.language }),
        },
      });
    }
    return prisma.bugScenario.create({
      data: {
        topic: data.topic,
        difficulty: data.difficulty,
        buggyCode: data.buggyCode,
        correctCode: data.correctCode,
        hints: JSON.stringify(data.hints),
        bugExplanations: JSON.stringify(data.bugExplanations),
        language: data.language || 'python',
      },
    });
  }

  async deleteBugScenario(id: string) {
    return prisma.bugScenario.delete({ where: { id } });
  }
}

export const learningAdminService = new LearningAdminService();
