import { create } from 'zustand';
import { examService } from '../services/exam.service';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  type: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  enableProctoring: boolean;
  createdBy: string;
  questions?: ExamQuestion[];
  _count?: {
    attempts: number;
    questions: number;
  };
}

export interface ExamQuestion {
  id: string;
  examId: string;
  problemId: string;
  order: number;
  points: number;
  problem: any;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  score?: number;
  status: string;
  answers?: any;
  exam?: Exam;
}

export interface ExamAnalytics {
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalQuestions: number;
  timeSpent: number;
  weakPoints: string[];
  recommendedProblems: any[];
}

interface ExamState {
  exams: Exam[];
  currentExam: Exam | null;
  currentAttempt: ExamAttempt | null;
  analytics: ExamAnalytics | null;
  isLoading: boolean;
  error: string | null;
  
  fetchExams: () => Promise<void>;
  fetchExam: (id: string) => Promise<void>;
  createExam: (data: any) => Promise<void>;
  updateExam: (id: string, data: any) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  startExam: (examId: string) => Promise<void>;
  submitExam: (examId: string, answers: any) => Promise<void>;
  fetchResult: (examId: string) => Promise<void>;
  fetchAnalytics: (examId: string) => Promise<void>;
  clearError: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  exams: [],
  currentExam: null,
  currentAttempt: null,
  analytics: null,
  isLoading: false,
  error: null,

  fetchExams: async () => {
    set({ isLoading: true, error: null });
    try {
      const exams = await examService.getExams();
      set({ exams, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取考试列表失败' });
    }
  },

  fetchExam: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const exam = await examService.getExam(id);
      set({ currentExam: exam, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取考试详情失败' });
    }
  },

  createExam: async (data: any) => {
    try {
      await examService.createExam(data);
      await get().fetchExams();
    } catch (error: any) {
      set({ error: error.message || '创建考试失败' });
    }
  },

  updateExam: async (id: string, data: any) => {
    try {
      await examService.updateExam(id, data);
      await get().fetchExams();
    } catch (error: any) {
      set({ error: error.message || '更新考试失败' });
    }
  },

  deleteExam: async (id: string) => {
    try {
      await examService.deleteExam(id);
      await get().fetchExams();
    } catch (error: any) {
      set({ error: error.message || '删除考试失败' });
    }
  },

  startExam: async (examId: string) => {
    set({ isLoading: true, error: null });
    try {
      const attempt = await examService.startExam(examId);
      set({ currentAttempt: attempt, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '开始考试失败' });
    }
  },

  submitExam: async (examId: string, answers: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await examService.submitExam(examId, answers);
      set({ currentAttempt: result, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '提交考试失败' });
    }
  },

  fetchResult: async (examId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await examService.getExamResult(examId);
      set({ currentAttempt: result, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取结果失败' });
    }
  },

  fetchAnalytics: async (examId: string) => {
    set({ isLoading: true, error: null });
    try {
      const analytics = await examService.getExamAnalytics(examId);
      set({ analytics, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || '获取分析失败' });
    }
  },

  clearError: () => set({ error: null }),
}));
