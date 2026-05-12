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

    return roots;
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
