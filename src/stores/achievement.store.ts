import { create } from 'zustand';
import { achievementAPI } from '../services/api';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  points: number;
}

interface UserAchievement extends Achievement {
  earnedAt: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

interface AchievementStats {
  points: number;
  level: number;
  problemsCompleted: number;
  matchesWon: number;
  examsCompleted: number;
  achievementsEarned: number;
  rank: number;
}

interface AchievementState {
  achievements: Achievement[];
  myAchievements: UserAchievement[];
  progress: any[];
  stats: AchievementStats | null;
  isLoading: boolean;
  error: string | null;
  
  fetchAll: () => Promise<void>;
  fetchMine: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  fetchStats: () => Promise<void>;
  checkAchievements: () => Promise<string[]>;
  clearError: () => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: [],
  myAchievements: [],
  progress: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await achievementAPI.getAll();
      if (response.success) {
        set({ achievements: response.data, isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取成就列表失败' });
    }
  },

  fetchMine: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await achievementAPI.getMine();
      if (response.success) {
        set({ myAchievements: response.data, isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取我的成就失败' });
    }
  },

  fetchProgress: async () => {
    try {
      const response = await achievementAPI.getProgress();
      if (response.success) {
        set({ progress: response.data });
      }
    } catch (error: any) {
      console.error('获取成就进度失败:', error);
    }
  },

  fetchStats: async () => {
    try {
      const response = await achievementAPI.getStats();
      if (response.success) {
        set({ stats: response.data });
      }
    } catch (error: any) {
      console.error('获取成就统计失败:', error);
    }
  },

  checkAchievements: async () => {
    try {
      const response = await achievementAPI.check();
      if (response.success) {
        await get().fetchMine();
        await get().fetchProgress();
        return response.data.newAchievements || [];
      }
      return [];
    } catch (error: any) {
      console.error('检查成就失败:', error);
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));
