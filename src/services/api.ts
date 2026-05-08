import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
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
};

export const submissionsAPI = {
  submit: (data: any) => api.post('/api/submissions', data),
  getById: (id: string) => api.get(`/api/submissions/${id}`),
  getMySubmissions: () => api.get('/api/submissions/user/me'),
  getProblemSubmissions: (problemId: string) =>
    api.get(`/api/submissions/problem/${problemId}`),
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
};

export default api;
