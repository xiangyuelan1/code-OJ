import { create } from 'zustand';
import { matchAPI } from '../services/api';

interface MatchState {
  currentMatch: any | null;
  history: any[];
  leaderboard: any[];
  isLoading: boolean;
  isMatching: boolean;
  error: string | null;
  
  createMatch: (type: string, problemIds?: string[]) => Promise<any>;
  fetchMatch: (matchId: string) => Promise<void>;
  joinMatch: (matchId: string) => Promise<void>;
  submitAnswer: (matchId: string, problemIndex: number, answer: string, time: number) => Promise<void>;
  endMatch: (matchId: string) => Promise<void>;
  fetchHistory: (limit?: number) => Promise<void>;
  fetchLeaderboard: (type: string, limit?: number) => Promise<void>;
  findOpponent: () => Promise<any>;
  clearError: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  currentMatch: null,
  history: [],
  leaderboard: [],
  isLoading: false,
  isMatching: false,
  error: null,

  createMatch: async (type: string, problemIds?: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const response = await matchAPI.create({ type, problemIds });
      if (response.success) {
        set({ currentMatch: response.data, isLoading: false });
        return response.data;
      }
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '创建比赛失败' });
    }
  },

  fetchMatch: async (matchId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await matchAPI.getById(matchId);
      if (response.success) {
        set({ currentMatch: response.data, isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取比赛失败' });
    }
  },

  joinMatch: async (matchId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await matchAPI.join(matchId);
      if (response.success) {
        await get().fetchMatch(matchId);
      }
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '加入比赛失败' });
    }
  },

  submitAnswer: async (matchId: string, problemIndex: number, answer: string, time: number) => {
    try {
      const response = await matchAPI.submitAnswer(matchId, {
        problemIndex,
        answer,
        time
      });
      if (response.success) {
        await get().fetchMatch(matchId);
      }
    } catch (error: any) {
      set({ error: error.message || '提交答案失败' });
    }
  },

  endMatch: async (matchId: string) => {
    try {
      const response = await matchAPI.endMatch(matchId);
      if (response.success) {
        await get().fetchMatch(matchId);
        await get().fetchHistory();
      }
    } catch (error: any) {
      set({ error: error.message || '结束比赛失败' });
    }
  },

  fetchHistory: async (limit?: number) => {
    try {
      const response = await matchAPI.getHistory(limit);
      if (response.success) {
        set({ history: response.data });
      }
    } catch (error: any) {
      console.error('获取历史记录失败:', error);
    }
  },

  fetchLeaderboard: async (type: string, limit?: number) => {
    try {
      const response = await matchAPI.getLeaderboard(type, limit);
      if (response.success) {
        set({ leaderboard: response.data });
      }
    } catch (error: any) {
      console.error('获取排行榜失败:', error);
    }
  },

  findOpponent: async () => {
    try {
      const response = await matchAPI.findOpponent();
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      console.error('查找对手失败:', error);
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
