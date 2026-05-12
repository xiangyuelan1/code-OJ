import { create } from 'zustand';
import { pointsAPI } from '../services/api';

interface LevelConfig {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon?: string;
}

interface PointLog {
  id: string;
  delta: number;
  reason: string;
  details: any;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  avatar?: string;
  points: number;
  level: number;
  levelName: string;
}

interface PointsState {
  points: number;
  level: number;
  levelName: string;
  rank: number;
  totalUsers: number;
  levels: LevelConfig[];
  logs: PointLog[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  
  fetchMyPoints: () => Promise<void>;
  fetchLevels: () => Promise<void>;
  fetchLeaderboard: (limit?: number) => Promise<void>;
  fetchLogs: (limit?: number) => Promise<void>;
  clearError: () => void;
}

export const usePointsStore = create<PointsState>((set) => ({
  points: 0,
  level: 1,
  levelName: '青铜',
  rank: 0,
  totalUsers: 0,
  levels: [],
  logs: [],
  leaderboard: [],
  isLoading: false,
  error: null,

  fetchMyPoints: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await pointsAPI.getMyPoints();
      if (response.success) {
        set({
          points: response.data.points,
          level: response.data.level,
          levelName: response.data.levelName,
          rank: response.data.rank,
          totalUsers: response.data.totalUsers,
          isLoading: false
        });
      }
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '获取积分信息失败' 
      });
    }
  },

  fetchLevels: async () => {
    try {
      const response = await pointsAPI.getLevels();
      if (response.success) {
        set({ levels: response.data });
      }
    } catch (error: any) {
      console.error('获取等级信息失败:', error);
    }
  },

  fetchLeaderboard: async (limit = 10) => {
    try {
      const response = await pointsAPI.getLeaderboard(limit);
      if (response.success) {
        set({ leaderboard: response.data });
      }
    } catch (error: any) {
      console.error('获取排行榜失败:', error);
    }
  },

  fetchLogs: async (limit = 20) => {
    try {
      const response = await pointsAPI.getLogs(limit);
      if (response.success) {
        set({ logs: response.data });
      }
    } catch (error: any) {
      console.error('获取积分日志失败:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
