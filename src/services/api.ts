import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

interface ApiSuccessResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: any) => {
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

const api = {
  get: <T = any>(url: string, config?: any): Promise<ApiSuccessResponse<T>> =>
    axiosInstance.get(url, config) as any,
  post: <T = any>(url: string, data?: any, config?: any): Promise<ApiSuccessResponse<T>> =>
    axiosInstance.post(url, data, config) as any,
  put: <T = any>(url: string, data?: any, config?: any): Promise<ApiSuccessResponse<T>> =>
    axiosInstance.put(url, data, config) as any,
  patch: <T = any>(url: string, data?: any, config?: any): Promise<ApiSuccessResponse<T>> =>
    axiosInstance.patch(url, data, config) as any,
  delete: <T = any>(url: string, config?: any): Promise<ApiSuccessResponse<T>> =>
    axiosInstance.delete(url, config) as any,
};

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};

export const problemsAPI = {
  getAll: (params?: { type?: string; difficulty?: string; search?: string }) =>
    api.get('/api/problems', { params }),
  getById: (id: string) => api.get(`/api/problems/${id}`),
  create: (data: any) => api.post('/api/problems', data),
  update: (id: string, data: any) => api.put(`/api/problems/${id}`, data),
  delete: (id: string) => api.delete(`/api/problems/${id}`),
  getStats: () => api.get('/api/problems/stats/overview'),
  getPublicStats: () => api.get('/api/problems/stats/public'),
  batchImport: (problems: any[]) => api.post('/api/problems/batch-import', { problems }),
};

export const submissionsAPI = {
  submit: (data: any) => api.post('/api/submissions', data),
  getById: (id: string) => api.get(`/api/submissions/${id}`),
  getMySubmissions: (params?: { status?: string }) =>
    api.get('/api/submissions/user/me', { params }),
  getProblemSubmissions: (problemId: string) =>
    api.get(`/api/submissions/problem/${problemId}`),
  checkAC: (problemId: string) => api.get(`/api/submissions/check-ac/${problemId}`),
};

export const solutionsAPI = {
  getByProblemId: (problemId: string) =>
    api.get(`/api/solutions/problem/${problemId}`),
  getById: (id: string) => api.get(`/api/solutions/${id}`),
  create: (data: any) => api.post('/api/solutions', data),
  update: (id: string, data: any) => api.put(`/api/solutions/${id}`, data),
  delete: (id: string) => api.delete(`/api/solutions/${id}`),
  getAll: () => api.get('/api/solutions'),
};

export const aiAPI = {
  explainCode: (data: any) => api.post('/api/ai/explain-code', data),
  getHint: (data: any) => api.post('/api/ai/hint', data),
  diagnose: (data: any) => api.post('/api/ai/diagnose', data),
  getConfig: () => api.get('/api/ai/config'),
  updateConfig: (data: any) => api.put('/api/ai/config', data),
  generateSolution: (data: any) => api.post('/api/ai/generate-solution', data),
};

export const usersAPI = {
  getAll: () => api.get('/api/admin/users'),
  toggleStatus: (id: string) => api.patch(`/api/admin/users/${id}/toggle-status`),
  resetPassword: (id: string, password: string) => api.post(`/api/admin/users/${id}/reset-password`, { password }),
  changeRole: (id: string, role: string) => api.patch(`/api/admin/users/${id}/role`, { role }),
  getAccess: (id: string) => api.get(`/api/admin/users/${id}/access`),
  updateAccess: (id: string, data: { accessType?: string; accessExpiresAt?: string | null; trialStartsAt?: string | null }) =>
    api.patch(`/api/admin/users/${id}/access`, data),
  getSystemOverview: () => api.get('/api/admin/users/system/overview'),
};

export const adminSubmissionsAPI = {
  getAll: (params?: { page?: number; pageSize?: number; userId?: string; problemId?: string; status?: string }) =>
    api.get('/api/submissions/admin/all', { params }),
};

export const adminMatchesAPI = {
  getAll: (params?: { page?: number; pageSize?: number }) =>
    api.get('/api/matches/admin/all', { params }),
};

export const pointsAPI = {
  getMyPoints: () => api.get('/api/points/me'),
  getLevels: () => api.get('/api/points/levels'),
  getLeaderboard: (limit?: number) => api.get('/api/points/leaderboard', { params: { limit } }),
  getLogs: (limit?: number) => api.get('/api/points/logs', { params: { limit } }),
};

export const knowledgeTreeAPI = {
  getAll: () => api.get('/api/knowledge-tree'),
  getTree: () => api.get('/api/knowledge-tree'),
  getStats: () => api.get('/api/knowledge-tree/stats'),
  create: (data: any) => api.post('/api/knowledge-tree', data),
  createNode: (data: any) => api.post('/api/knowledge-tree', data),
  update: (id: string, data: any) => api.put(`/api/knowledge-tree/${id}`, data),
  updateNode: (id: string, data: any) => api.put(`/api/knowledge-tree/${id}`, data),
  delete: (id: string) => api.delete(`/api/knowledge-tree/${id}`),
  deleteNode: (id: string) => api.delete(`/api/knowledge-tree/${id}`),
  importFromFile: (content: string, fileType: string) => 
    api.post('/api/knowledge-tree/import', { content, fileType }),
  classifyProblem: (problemId: string, knowledgeTreeId?: string) =>
    api.post(`/api/knowledge-tree/classify/${problemId}`, { knowledgeTreeId }),
  getNodeProblems: (nodeId: string) => 
    api.get(`/api/knowledge-tree/node/${nodeId}/problems`),
};

export const enhancedAiAPI = {
  ...aiAPI,
  generateTestCases: (data: any) => api.post('/api/ai/generate-testcases', data),
  classifyProblem: (data: any) => api.post('/api/ai/classify-problem', data),
  parseProblemFile: (content: string, fileType: string) =>
    api.post('/api/ai/parse-problem-file', { content, fileType }),
  parseKnowledgeTree: (content: string) =>
    api.post('/api/ai/parse-knowledge-tree', { content }),
  aiJudge: (data: any) => api.post('/api/ai/ai-judge', data),
  getUsageStats: (params?: any) => api.get('/api/ai/usage/stats', { params }),
  getUsageLogs: (params?: any) => api.get('/api/ai/usage/logs', { params }),
  generateExam: (data: any) => api.post('/api/ai/generate-exam', data),
  optimizeCode: (code: string, language: string) =>
    api.post('/api/ai/optimize-code', { code, language }),
  recommendSimilar: (problemId: string) =>
    api.post('/api/ai/recommend-similar', { problemId }),
  batchClassify: (data: any) => api.post('/api/ai/batch-classify', data),
  companionChat: (data: any) => api.post('/api/ai/companion', data),
};

export const uploadAPI = {
  uploadImage: (formData: FormData) =>
    api.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadFile: (formData: FormData) =>
    api.post('/api/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadFiles: (formData: FormData) =>
    api.post('/api/upload/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const examAPI = {
  getAll: () => api.get('/api/exams'),
  getById: (id: string) => api.get(`/api/exams/${id}`),
  create: (data: any) => api.post('/api/exams', data),
  update: (id: string, data: any) => api.put(`/api/exams/${id}`, data),
  delete: (id: string) => api.delete(`/api/exams/${id}`),
  start: (id: string) => api.post(`/api/exams/${id}/start`),
  submit: (id: string, answers: any) => api.post(`/api/exams/${id}/submit`, { answers }),
  getResult: (id: string) => api.get(`/api/exams/${id}/result`),
  getAnalytics: (id: string) => api.get(`/api/exams/${id}/analytics`),
  getAttempts: (id: string) => api.get(`/api/exams/${id}/attempts`),
  getMyAttempts: () => api.get('/api/exams/my-attempts'),
  logProctoring: (id: string, event: string, details?: string) =>
    api.post(`/api/exams/${id}/proctoring`, { event, details }),
};

export const matchAPI = {
  create: (data: { type: string; problemIds?: string[] }) =>
    api.post('/api/matches', data),
  getById: (id: string) => api.get(`/api/matches/${id}`),
  join: (id: string) => api.post(`/api/matches/${id}/join`),
  submitAnswer: (id: string, data: { problemIndex: number; answer: string; time: number }) =>
    api.post(`/api/matches/${id}/answer`, data),
  endMatch: (id: string) => api.post(`/api/matches/${id}/end`),
  getHistory: (limit?: number) => api.get('/api/matches/history/me', { params: { limit } }),
  getLeaderboard: (type: string, limit?: number) =>
    api.get(`/api/matches/leaderboard/${type}`, { params: { limit } }),
  findOpponent: () => api.get('/api/matches/find-opponent'),
};

export const achievementAPI = {
  initialize: () => api.post('/api/achievements/initialize'),
  getAll: () => api.get('/api/achievements'),
  getMine: () => api.get('/api/achievements/me'),
  getProgress: () => api.get('/api/achievements/progress'),
  getStats: () => api.get('/api/achievements/stats'),
  check: () => api.post('/api/achievements/check'),
};

export const classAPI = {
  getAll: () => api.get('/api/classes'),
  create: (data: any) => api.post('/api/classes', data),
  update: (id: string, data: any) => api.put(`/api/classes/${id}`, data),
  delete: (id: string) => api.delete(`/api/classes/${id}`),
  getById: (id: string) => api.get(`/api/classes/${id}`),
  getMembers: (id: string) => api.get(`/api/classes/${id}/members`),
  addMember: (id: string, userId: string, role?: string) =>
    api.post(`/api/classes/${id}/members`, { userId, role }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/api/classes/${id}/members/${userId}`),
  join: (id: string) => api.post(`/api/classes/${id}/join`),
  leave: (id: string) => api.post(`/api/classes/${id}/leave`),
  requestJoin: (id: string, message?: string) =>
    api.post(`/api/access/classes/${id}/join-request`, { message }),
  getJoinRequests: (id: string) => api.get(`/api/access/classes/${id}/join-requests`),
  reviewJoinRequest: (requestId: string, approved: boolean) =>
    api.put(`/api/access/classes/join-requests/${requestId}`, { approved }),
  getAnalytics: (id: string) => api.get(`/api/classes/${id}/analytics`),
  getHomework: (id: string) => api.get(`/api/classes/${id}/homework`),
  createHomework: (id: string, data: any) => api.post(`/api/classes/${id}/homework`, data),
  getHomeworkDetail: (homeworkId: string) => api.get(`/api/classes/homework/${homeworkId}`),
  getHomeworkProgress: (homeworkId: string) => api.get(`/api/classes/homework/${homeworkId}/progress`),
  submitHomework: (homeworkId: string, data: any) => api.post(`/api/classes/homework/${homeworkId}/submit`, data),
  getMemberDetail: (classId: string, userId: string) => api.get(`/api/classes/${classId}/members/${userId}/detail`),
  joinByCode: (classCode: string, message?: string) => api.post('/api/classes/join-by-code', { classCode, message }),
  getMyJoinRequests: () => api.get('/api/classes/my-join-requests'),
  getPendingCount: () => api.get('/api/classes/pending-count'),
  generateClassCode: (id: string) => api.post(`/api/classes/${id}/generate-code`),
  createClassExam: (id: string, data: any) => api.post(`/api/classes/${id}/exams`, data),
  getClassExams: (id: string) => api.get(`/api/classes/${id}/exams`),
  createClassBattle: (data: any) => api.post('/api/classes/battle', data),
  acceptClassBattle: (battleId: string) => api.post(`/api/classes/battle/${battleId}/accept`),
  submitClassBattleAnswer: (battleId: string, data: any) => api.post(`/api/classes/battle/${battleId}/answer`, data),
  completeClassBattle: (battleId: string) => api.post(`/api/classes/battle/${battleId}/complete`),
  getClassBattles: (id: string) => api.get(`/api/classes/${id}/battles`),
  getTeacherDashboard: () => api.get('/api/classes/teacher/dashboard'),
};

export const accessAPI = {
  check: () => api.get('/api/access/check'),
  getConfig: () => api.get('/api/access/config'),
  updateConfig: (key: string, value: string) => api.put('/api/access/config', { key, value }),
};

export const paymentAPI = {
  submit: (data: any) => api.post('/api/payments', data),
  getAll: () => api.get('/api/payments'),
  approve: (id: string) => api.patch(`/api/payments/${id}/approve`),
  reject: (id: string) => api.patch(`/api/payments/${id}/reject`),
  uploadQrCode: (data: FormData) =>
    api.post('/api/payments/qr-code', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMethods: () => api.get('/api/payments/methods'),
  getConfig: () => api.get('/api/payments/config'),
  deleteQrCode: (method: string) => api.delete(`/api/payments/qr-code/${method}`),
  updateChannel: (method: string, data: { enabled: boolean; config?: Record<string, string> }) =>
    api.put(`/api/payments/channel/${method}`, data),
};

export const promotionAPI = {
  create: (data: any) => api.post('/api/promotions', data),
  getAll: () => api.get('/api/promotions'),
  getStats: () => api.get('/api/promotions/stats'),
  useCode: (code: string) => api.post('/api/promotions/use', { code }),
  toggle: (id: string) => api.patch(`/api/promotions/${id}/toggle`),
  delete: (id: string) => api.delete(`/api/promotions/${id}`),
  createPlan: (data: any) => api.post('/api/promotions/plans', data),
  getPlans: () => api.get('/api/promotions/plans'),
  getActivePlans: () => api.get('/api/promotions/plans/active'),
  updatePlan: (id: string, data: any) => api.put(`/api/promotions/plans/${id}`, data),
  togglePlan: (id: string) => api.patch(`/api/promotions/plans/${id}/toggle`),
  deletePlan: (id: string) => api.delete(`/api/promotions/plans/${id}`),
  createOrder: (data: any) => api.post('/api/promotions/orders', data),
  getOrders: () => api.get('/api/promotions/orders'),
  getFinancial: () => api.get('/api/promotions/financial'),
};

export const profileAPI = {
  getMine: () => api.get('/api/profile/me'),
  update: (data: any) => api.put('/api/profile/me', data),
  getRecommendations: (count?: number) => api.get('/api/profile/recommendations', { params: { count } }),
  refresh: () => api.post('/api/profile/refresh'),
};

export const discussionAPI = {
  getAll: (params?: any) => api.get('/api/discussions', { params }),
  getById: (id: string) => api.get(`/api/discussions/${id}`),
  create: (data: any) => api.post('/api/discussions', data),
  createReply: (id: string, content: string) => api.post(`/api/discussions/${id}/replies`, { content }),
  vote: (id: string, isUpvote: boolean) => api.post(`/api/discussions/${id}/vote`, { isUpvote }),
  delete: (id: string) => api.delete(`/api/discussions/${id}`),
};

export const dailyAPI = {
  getToday: () => api.get('/api/daily-challenge/today'),
  submit: (data: any) => api.post('/api/daily-challenge/submit', data),
  getStats: () => api.get('/api/daily-challenge/stats'),
};

export const streamAPI = {
  companionStream: (data: {
    type: 'CODE_REVIEW' | 'ERROR_DIAGNOSIS' | 'HINT' | 'KNOWLEDGE_LINK';
    code?: string;
    language?: string;
    problem?: any;
    errorResult?: any;
  }): ReadableStream<string> | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const url = `${baseUrl}/api/ai/companion-stream`;

    const abortController = new AbortController();

    return new ReadableStream<string>({
      async start(streamController) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
            signal: abortController.signal,
          });

          if (!response.ok || !response.body) {
            streamController.error(new Error(`请求失败: ${response.status}`));
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;

              const jsonStr = trimmed.slice(6);
              if (!jsonStr) continue;

              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.done) {
                  streamController.close();
                  return;
                }
                if (parsed.error) {
                  streamController.error(new Error(parsed.error));
                  return;
                }
                if (parsed.content) {
                  streamController.enqueue(parsed.content);
                }
              } catch {
                continue;
              }
            }
          }

          streamController.close();
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            streamController.error(err);
          }
        }
      },
      cancel() {
        abortController.abort();
      },
    });
  },
};

export function consumeStream(
  stream: ReadableStream<string>,
  onChunk: (text: string) => void,
  onDone?: () => void,
  onError?: (error: Error) => void,
): () => void {
  const reader = stream.getReader();
  let cancelled = false;

  (async () => {
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(value);
      }
      if (!cancelled && onDone) onDone();
    } catch (err) {
      if (!cancelled && onError) onError(err as Error);
    }
  })();

  return () => {
    cancelled = true;
    reader.cancel();
  };
}

export default api;
