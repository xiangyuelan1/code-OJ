import axios from 'axios';

interface ApiSuccessResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005',
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
};

export const submissionsAPI = {
  submit: (data: any) => api.post('/api/submissions', data),
  getById: (id: string) => api.get(`/api/submissions/${id}`),
  getMySubmissions: () => api.get('/api/submissions/user/me'),
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
  endMatch: (id: string) => api.get(`/api/matches/${id}/end`),
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

export default api;
