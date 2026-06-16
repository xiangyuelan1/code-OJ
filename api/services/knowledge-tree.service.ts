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
        isTemporary: node.isTemporary,
        source: node.source,
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

  private buildAiTree(nodes: any[]) {
    const map = new Map();
    const roots: any[] = [];

    nodes.forEach(node => {
      map.set(node.id, {
        id: node.id,
        name: node.name,
        description: node.description,
        parentId: node.parentId,
        level: node.level,
        children: []
      });
    });

    nodes.forEach(node => {
      const current = map.get(node.id);
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) parent.children.push(current);
      } else {
        roots.push(current);
      }
    });

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

  private parseProblemTags(tags: string): string[] {
    try {
      const parsed = JSON.parse(tags || '[]');
      return Array.isArray(parsed) ? parsed.map(tag => String(tag)) : [];
    } catch {
      return [];
    }
  }

  /** 限制批次大小，默认最大200（可按调用方需要指定） */
  private clampLimit(limit: number, max = 200) {
    return Math.max(1, Math.min(max, Math.floor(Number(limit) || 20)));
  }

  private formatSuggestion(suggestion: any) {
    return {
      id: suggestion.id,
      problemId: suggestion.problemId,
      problemTitle: suggestion.problem?.title,
      suggestedNodeId: suggestion.suggestedNodeId,
      suggestedNodeName: suggestion.suggestedNode?.name ?? suggestion.temporaryNodeName ?? null,
      suggestedNodeTemporary: suggestion.suggestedNode?.isTemporary ?? false,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      status: suggestion.status,
    };
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

  async getOrCreateAiPendingRoot() {
    const existing = await prisma.knowledgeTree.findFirst({
      where: { name: 'AI待确认分类', parentId: null }
    });

    if (existing) return existing;

    const rootCount = await prisma.knowledgeTree.count({ where: { parentId: null } });
    return prisma.knowledgeTree.create({
      data: {
        name: 'AI待确认分类',
        description: 'AI 无法确定相近父节点时创建的临时分类根节点，需管理员确认后再转为正式知识节点。',
        level: 1,
        order: rootCount,
        isTemporary: true,
        source: 'AI',
      },
    });
  }

  async getKnowledgeTreeForAi() {
    const nodes = await prisma.knowledgeTree.findMany({
      orderBy: [
        { level: 'asc' },
        { order: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        level: true,
        parentId: true,
      },
    });

    return this.buildAiTree(nodes);
  }

  async suggestClassifyUnassignedProblems(
    userId: string,
    limit = 20,
    onProgress?: (current: number, total: number, phase: string) => void,
  ) {
    const take = this.clampLimit(limit);
    const knowledgeTree = await this.getKnowledgeTreeForAi();
    const problems = await prisma.problem.findMany({
      where: { knowledgeTreeId: null },
      orderBy: { createdAt: 'desc' },
      take,
    });

    onProgress?.(0, problems.length, '开始AI分类分析...');
    const suggestions: any[] = [];

    for (let i = 0; i < problems.length; i++) {
      const problem = problems[i];
      onProgress?.(i + 1, problems.length, `正在分析: ${problem.title}`);
      const aiResult = await aiService.suggestKnowledgeClassification({
        title: problem.title,
        description: problem.description,
        type: problem.type,
        difficulty: problem.difficulty,
        tags: this.parseProblemTags(problem.tags),
      }, knowledgeTree, userId);

      let suggestedNodeId: string | undefined;
      let temporaryNodeName: string | undefined;
      let temporaryNodeDescription: string | undefined;
      let temporaryParentId: string | undefined;

      if (aiResult.mode === 'EXISTING_NODE' && aiResult.nodeId) {
        const existingNode = await prisma.knowledgeTree.findUnique({ where: { id: aiResult.nodeId } });
        if (existingNode) suggestedNodeId = existingNode.id;
      }

      if (aiResult.mode === 'TEMPORARY_NODE' && aiResult.temporaryNode) {
        const aiParentId = aiResult.temporaryNode.parentId;
        const parent = aiParentId
          ? await prisma.knowledgeTree.findUnique({ where: { id: aiParentId } })
          : null;
        const parentNode = parent ?? await this.getOrCreateAiPendingRoot();
        const siblingCount = await prisma.knowledgeTree.count({ where: { parentId: parentNode.id } });
        const temporaryNode = await prisma.knowledgeTree.findFirst({
          where: {
            parentId: parentNode.id,
            name: aiResult.temporaryNode.name,
            isTemporary: true,
          },
        }) ?? await prisma.knowledgeTree.create({
          data: {
            name: aiResult.temporaryNode.name,
            description: aiResult.temporaryNode.description,
            parentId: parentNode.id,
            level: parentNode.level + 1,
            order: siblingCount,
            isTemporary: true,
            source: 'AI',
          },
        });

        suggestedNodeId = temporaryNode.id;
        temporaryNodeName = aiResult.temporaryNode.name;
        temporaryNodeDescription = aiResult.temporaryNode.description;
        temporaryParentId = parentNode.id;
      }

      await prisma.aIClassificationSuggestion.updateMany({
        where: { problemId: problem.id, status: 'PENDING' },
        data: { status: 'SKIPPED' },
      });

      const suggestion = await prisma.aIClassificationSuggestion.create({
        data: {
          problemId: problem.id,
          suggestedNodeId,
          temporaryNodeName,
          temporaryNodeDescription,
          temporaryParentId,
          confidence: aiResult.confidence,
          reason: aiResult.reason,
          status: 'PENDING',
        },
        include: {
          problem: { select: { id: true, title: true } },
          suggestedNode: { select: { id: true, name: true, isTemporary: true } },
        },
      });

      suggestions.push(this.formatSuggestion(suggestion));
    }

    return suggestions;
  }

  async organizeUnassignedProblems(
    userId: string,
    options: { limit?: number; autoApplyThreshold?: number } = {},
    onProgress?: (current: number, total: number, phase: string) => void,
  ) {
    const threshold = Math.min(100, Math.max(0, options.autoApplyThreshold ?? 85));
    const suggestions = await this.suggestClassifyUnassignedProblems(userId, options.limit ?? 30, onProgress);

    let autoApplied = 0;
    let pending = 0;
    let skipped = 0;
    const temporaryNodeIds = new Set<string>();
    const pendingSuggestions: any[] = [];
    const appliedSuggestions: any[] = [];
    const skippedSuggestions: any[] = [];

    for (const suggestion of suggestions) {
      if (suggestion.suggestedNodeTemporary && suggestion.suggestedNodeId) {
        temporaryNodeIds.add(suggestion.suggestedNodeId);
      }

      if (suggestion.suggestedNodeId && suggestion.confidence >= threshold) {
        const applied = await this.applyClassificationSuggestion(suggestion.id);
        autoApplied += 1;
        appliedSuggestions.push(applied);
        continue;
      }

      if (!suggestion.suggestedNodeId || suggestion.confidence < 70) {
        const skippedSuggestion = await prisma.aIClassificationSuggestion.update({
          where: { id: suggestion.id },
          data: { status: 'SKIPPED' },
          include: {
            problem: { select: { id: true, title: true } },
            suggestedNode: { select: { id: true, name: true, isTemporary: true } },
          },
        });
        skipped += 1;
        skippedSuggestions.push(this.formatSuggestion(skippedSuggestion));
        continue;
      }

      pending += 1;
      pendingSuggestions.push(suggestion);
    }

    return {
      scanned: suggestions.length,
      autoApplied,
      pending,
      skipped,
      temporaryNodes: temporaryNodeIds.size,
      threshold,
      appliedSuggestions,
      pendingSuggestions,
      skippedSuggestions,
    };
  }

  async getPendingClassificationSuggestions() {
    const suggestions = await prisma.aIClassificationSuggestion.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        problem: { select: { id: true, title: true } },
        suggestedNode: { select: { id: true, name: true, isTemporary: true } },
      },
    });

    return suggestions.map(suggestion => this.formatSuggestion(suggestion));
  }

  async applyClassificationSuggestion(id: string) {
    const suggestion = await prisma.aIClassificationSuggestion.findFirst({
      where: { id, status: 'PENDING' },
      include: {
        problem: { select: { id: true, title: true } },
        suggestedNode: { select: { id: true, name: true, isTemporary: true } },
      },
    });

    if (!suggestion) throw new Error('待处理分类建议不存在');
    if (!suggestion.suggestedNodeId) throw new Error('该建议没有可绑定的知识树节点');

    const updated = await prisma.$transaction(async tx => {
      await tx.problem.update({
        where: { id: suggestion.problemId },
        data: { knowledgeTreeId: suggestion.suggestedNodeId },
      });

      return tx.aIClassificationSuggestion.update({
        where: { id },
        data: { status: 'APPLIED' },
        include: {
          problem: { select: { id: true, title: true } },
          suggestedNode: { select: { id: true, name: true, isTemporary: true } },
        },
      });
    });

    return this.formatSuggestion(updated);
  }

  async skipClassificationSuggestion(id: string) {
    const suggestion = await prisma.aIClassificationSuggestion.findFirst({
      where: { id, status: 'PENDING' },
    });

    if (!suggestion) throw new Error('待处理分类建议不存在');

    const updated = await prisma.aIClassificationSuggestion.update({
      where: { id },
      data: { status: 'SKIPPED' },
      include: {
        problem: { select: { id: true, title: true } },
        suggestedNode: { select: { id: true, name: true, isTemporary: true } },
      },
    });

    return this.formatSuggestion(updated);
  }

  async confirmTemporaryNode(id: string) {
    return prisma.knowledgeTree.update({
      where: { id },
      data: { isTemporary: false, source: 'MANUAL' },
    });
  }

  async findProblemsForNode(nodeId: string, scope: 'unassigned' | 'all', userId: string, limit = 20) {
    const take = this.clampLimit(limit);
    const node = await prisma.knowledgeTree.findUnique({
      where: { id: nodeId },
      select: { id: true, name: true, description: true },
    });

    if (!node) throw new Error('节点不存在');

    const where = scope === 'all'
      ? { NOT: { knowledgeTreeId: nodeId } }
      : { knowledgeTreeId: null };

    const candidates = await prisma.problem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        knowledgeTree: { select: { id: true, name: true } },
      },
    });

    if (candidates.length === 0) {
      throw new Error(scope === 'unassigned'
        ? '当前没有未分类的题目可供搜索'
        : '当前没有可供搜索的候选题目');
    }

    const candidatePayload = candidates.map(problem => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      type: problem.type,
      difficulty: problem.difficulty,
      tags: this.parseProblemTags(problem.tags),
      currentKnowledgeTreeName: problem.knowledgeTree?.name ?? null,
    }));

    const matches = await aiService.findProblemsForKnowledgeNode({ node, limit: take }, candidatePayload, userId);
    const problemMap = new Map(candidates.map(problem => [problem.id, problem]));

    return matches.map(match => {
      const problem = problemMap.get(match.problemId)!;
      return {
        problemId: problem.id,
        title: problem.title,
        type: problem.type,
        difficulty: problem.difficulty,
        tags: this.parseProblemTags(problem.tags),
        currentKnowledgeTreeId: problem.knowledgeTreeId,
        currentKnowledgeTreeName: problem.knowledgeTree?.name ?? null,
        confidence: match.confidence,
        reason: match.reason,
      };
    });
  }

  async attachProblemsToNode(nodeId: string, problemIds: string[]) {
    const node = await prisma.knowledgeTree.findUnique({ where: { id: nodeId }, select: { id: true } });
    if (!node) throw new Error('节点不存在');

    const uniqueProblemIds = [...new Set(problemIds.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))];
    if (uniqueProblemIds.length === 0) return { updatedCount: 0 };

    const result = await prisma.problem.updateMany({
      where: { id: { in: uniqueProblemIds } },
      data: { knowledgeTreeId: nodeId },
    });

    return { updatedCount: result.count };
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
