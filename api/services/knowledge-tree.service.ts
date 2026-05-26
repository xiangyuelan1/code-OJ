import prisma from '../lib/prisma';
import { aiService } from './ai.service';

export interface KnowledgeNodeInput {
  name: string;
  description?: string;
  parentId?: string;
  level?: number;
  order?: number;
}

export class KnowledgeTreeService {
  async getKnowledgeTree() {
    const nodes = await prisma.knowledgeTree.findMany({
      orderBy: [
        { level: 'asc' },
        { order: 'asc' }
      ],
      include: {
        _count: {
          select: { problems: true }
        }
      }
    });

    return this.buildTree(nodes);
  }

  private buildTree(nodes: any[]) {
    const map = new Map();
    const roots: any[] = [];

    nodes.forEach(node => {
      map.set(node.id, {
        id: node.id,
        name: node.name,
        description: node.description,
        parentId: node.parentId,
        level: node.level,
        order: node.order,
        problemCount: node._count.problems,
        children: []
      });
    });

    nodes.forEach(node => {
      const current = map.get(node.id);
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children.push(current);
        }
      } else {
        roots.push(current);
      }
    });

    this.aggregateProblemCounts(roots);

    return roots;
  }

  /** 递归聚合子节点的题目数到父节点，使一级分类显示包含所有子分类的题目 */
  private aggregateProblemCounts(nodes: any[]): number {
    let total = 0;
    for (const node of nodes) {
      const childTotal = this.aggregateProblemCounts(node.children);
      node.problemCount = node.problemCount + childTotal;
      total += node.problemCount;
    }
    return total;
  }

  async createNode(data: KnowledgeNodeInput) {
    const level = data.level || (data.parentId ? 2 : 1);
    
    const existingNodes = await prisma.knowledgeTree.count({
      where: { parentId: data.parentId || null }
    });

    return await prisma.knowledgeTree.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        level,
        order: data.order ?? existingNodes
      }
    });
  }

  async updateNode(id: string, data: Partial<KnowledgeNodeInput>) {
    return await prisma.knowledgeTree.update({
      where: { id },
      data
    });
  }

  async deleteNode(id: string) {
    const children = await prisma.knowledgeTree.findMany({
      where: { parentId: id }
    });

    for (const child of children) {
      await this.deleteNode(child.id);
    }

    await prisma.problem.updateMany({
      where: { knowledgeTreeId: id },
      data: { knowledgeTreeId: null }
    });

    return await prisma.knowledgeTree.delete({
      where: { id }
    });
  }

  async importFromFile(fileContent: string, fileType: string) {
    const knowledgeNodes = await aiService.parseFileToKnowledgeTree(fileContent);
    
    if (!knowledgeNodes || knowledgeNodes.length === 0) {
      throw new Error('AI无法从文件中提取知识树');
    }

    const createdNodes: any[] = [];
    
    for (const node of knowledgeNodes) {
      const parentNode = await prisma.knowledgeTree.create({
        data: {
          name: node.name,
          description: node.description,
          level: 1,
          order: node.order || 0
        }
      });
      createdNodes.push(parentNode);

      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          await prisma.knowledgeTree.create({
            data: {
              name: child.name,
              description: child.description,
              parentId: parentNode.id,
              level: 2,
              order: i
            }
          });
        }
      }
    }

    return createdNodes;
  }

  async classifyProblem(problemId: string, knowledgeTreeId?: string) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
    });

    if (!problem) {
      throw new Error('题目不存在');
    }

    if (knowledgeTreeId) {
      await prisma.problem.update({
        where: { id: problemId },
        data: { knowledgeTreeId }
      });
      return { nodeId: knowledgeTreeId, reason: '手动选择' };
    }

    const knowledgeTree = await this.getKnowledgeTree();
    const result = await aiService.classifyProblem(
      {
        title: problem.title,
        description: problem.description,
        type: problem.type
      },
      knowledgeTree
    );

    if (result.nodeIds && result.nodeIds.length > 0) {
      await prisma.problem.update({
        where: { id: problemId },
        data: { knowledgeTreeId: result.nodeIds[0] }
      });
    }

    return result;
  }

  async getProblemsByNode(nodeId: string) {
    const node = await prisma.knowledgeTree.findUnique({
      where: { id: nodeId }
    });

    if (!node) {
      throw new Error('节点不存在');
    }

    if (node.level === 1) {
      const childIds = await prisma.knowledgeTree.findMany({
        where: { parentId: nodeId },
        select: { id: true }
      });

      return await prisma.problem.findMany({
        where: {
          OR: [
            { knowledgeTreeId: nodeId },
            { knowledgeTreeId: { in: childIds.map(c => c.id) } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return await prisma.problem.findMany({
      where: { knowledgeTreeId: nodeId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 从自然语言描述自动组建题单：
   * 1. 调用 AI 解析描述为结构化需求（主题、难度、数量、标签）
   * 2. 从数据库搜索匹配条件的题目
   * 3. 将题目按 AI 建议的知识树结构分配到各节点
   * 4. 创建知识树节点并关联题目
   */
  async autoComposeFromNL(userId: string, description: string) {
    const parsed = await aiService.autoComposeFromNL(description, userId);
    const { requirements, nodes: suggestedNodes } = parsed;

    const where: any = {};
    if (requirements.difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(requirements.difficulty)) {
      where.difficulty = requirements.difficulty;
    }
    if (requirements.tags.length > 0) {
      where.OR = requirements.tags.map(tag => ({
        tags: { contains: tag }
      }));
    }

    let candidates = await prisma.problem.findMany({
      where: Object.keys(where).length > 0 ? where : {},
      select: { id: true, title: true, difficulty: true, tags: true, type: true },
    });

    if (candidates.length === 0) {
      candidates = await prisma.problem.findMany({
        select: { id: true, title: true, difficulty: true, tags: true, type: true },
      });
    }

    const scored = candidates.map(p => {
      const pTags: string[] = JSON.parse(p.tags || '[]');
      const commonTags = pTags.filter(t => requirements.tags.includes(t));
      let score = commonTags.length * 10;
      if (requirements.difficulty && p.difficulty === requirements.difficulty) score += 5;
      return { ...p, score, pTags };
    }).sort((a, b) => b.score - a.score);

    const targetCount = Math.min(requirements.count, scored.length);
    const selectedProblems = scored.slice(0, targetCount);

    if (selectedProblems.length === 0) {
      throw new Error('系统中暂无匹配的题目，请先创建题目后再使用此功能');
    }

    const createdNodes: Array<{ id: string; name: string; problemCount: number }> = [];
    const problemsPerNode = Math.ceil(selectedProblems.length / suggestedNodes.length);

    for (let i = 0; i < suggestedNodes.length; i++) {
      const nodeDef = suggestedNodes[i];
      const parentNode = await prisma.knowledgeTree.create({
        data: {
          name: nodeDef.name,
          description: nodeDef.description,
          level: 1,
          order: i,
        },
      });

      const start = i * problemsPerNode;
      const end = Math.min(start + problemsPerNode, selectedProblems.length);
      const nodeProblems = selectedProblems.slice(start, end);

      for (const problem of nodeProblems) {
        await prisma.problem.update({
          where: { id: problem.id },
          data: { knowledgeTreeId: parentNode.id },
        });
      }

      createdNodes.push({
        id: parentNode.id,
        name: nodeDef.name,
        problemCount: nodeProblems.length,
      });
    }

    return {
      treeId: createdNodes.length > 0 ? createdNodes[0].id : null,
      nodes: createdNodes,
      totalProblems: selectedProblems.length,
      title: parsed.title,
      description: parsed.description,
    };
  }

  async getNodeStatistics() {
    const totalNodes = await prisma.knowledgeTree.count();
    const level1Nodes = await prisma.knowledgeTree.count({
      where: { level: 1 }
    });
    const level2Nodes = await prisma.knowledgeTree.count({
      where: { level: 2 }
    });
    const problemsWithTree = await prisma.problem.count({
      where: { knowledgeTreeId: { not: null } }
    });

    return {
      totalNodes,
      level1Nodes,
      level2Nodes,
      problemsWithTree
    };
  }
}

export const knowledgeTreeService = new KnowledgeTreeService();
