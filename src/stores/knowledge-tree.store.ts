import { create } from 'zustand';
import { knowledgeTreeAPI } from '../services/api';

interface KnowledgeNode {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  order: number;
  problemCount: number;
  children: KnowledgeNode[];
}

interface KnowledgeTreeStats {
  totalNodes: number;
  level1Nodes: number;
  level2Nodes: number;
  problemsWithTree: number;
}

interface KnowledgeTreeState {
  tree: KnowledgeNode[];
  stats: KnowledgeTreeStats | null;
  selectedNode: KnowledgeNode | null;
  nodeProblems: any[];
  isLoading: boolean;
  isImporting: boolean;
  error: string | null;
  
  fetchTree: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createNode: (data: any) => Promise<void>;
  updateNode: (id: string, data: any) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  importFromFile: (content: string, fileType: string) => Promise<void>;
  classifyProblem: (problemId: string, knowledgeTreeId?: string) => Promise<void>;
  selectNode: (node: KnowledgeNode | null) => void;
  fetchNodeProblems: (nodeId: string) => Promise<void>;
  clearError: () => void;
}

export const useKnowledgeTreeStore = create<KnowledgeTreeState>((set, get) => ({
  tree: [],
  stats: null,
  selectedNode: null,
  nodeProblems: [],
  isLoading: false,
  isImporting: false,
  error: null,

  fetchTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await knowledgeTreeAPI.getTree();
      if (response.success) {
        set({ tree: response.data, isLoading: false });
      }
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '获取知识树失败' 
      });
    }
  },

  fetchStats: async () => {
    try {
      const response = await knowledgeTreeAPI.getStats();
      if (response.success) {
        set({ stats: response.data });
      }
    } catch (error: any) {
      console.error('获取知识树统计失败:', error);
    }
  },

  createNode: async (data: any) => {
    try {
      const response = await knowledgeTreeAPI.createNode(data);
      if (response.success) {
        await get().fetchTree();
      }
    } catch (error: any) {
      set({ error: error.message || '创建节点失败' });
    }
  },

  updateNode: async (id: string, data: any) => {
    try {
      const response = await knowledgeTreeAPI.updateNode(id, data);
      if (response.success) {
        await get().fetchTree();
      }
    } catch (error: any) {
      set({ error: error.message || '更新节点失败' });
    }
  },

  deleteNode: async (id: string) => {
    try {
      const response = await knowledgeTreeAPI.deleteNode(id);
      if (response.success) {
        await get().fetchTree();
      }
    } catch (error: any) {
      set({ error: error.message || '删除节点失败' });
    }
  },

  importFromFile: async (content: string, fileType: string) => {
    set({ isImporting: true, error: null });
    try {
      const response = await knowledgeTreeAPI.importFromFile(content, fileType);
      if (response.success) {
        await get().fetchTree();
        await get().fetchStats();
        set({ isImporting: false });
      }
    } catch (error: any) {
      set({ 
        isImporting: false, 
        error: error.message || '导入失败' 
      });
    }
  },

  classifyProblem: async (problemId: string, knowledgeTreeId?: string) => {
    try {
      const response = await knowledgeTreeAPI.classifyProblem(problemId, knowledgeTreeId);
      if (response.success) {
        await get().fetchTree();
      }
    } catch (error: any) {
      set({ error: error.message || '分类失败' });
    }
  },

  selectNode: (node: KnowledgeNode | null) => {
    set({ selectedNode: node });
  },

  fetchNodeProblems: async (nodeId: string) => {
    try {
      const response = await knowledgeTreeAPI.getNodeProblems(nodeId);
      if (response.success) {
        set({ nodeProblems: response.data });
      }
    } catch (error: any) {
      console.error('获取节点题目失败:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
