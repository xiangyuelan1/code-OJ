import { examAPI } from './api';

export const examService = {
  getExams: async () => {
    const res = await examAPI.getAll();
    return res.data;
  },

  getExam: async (id: string) => {
    const res = await examAPI.getById(id);
    return res.data;
  },

  createExam: async (data: any) => {
    const res = await examAPI.create(data);
    return res.data;
  },

  updateExam: async (id: string, data: any) => {
    const res = await examAPI.update(id, data);
    return res.data;
  },

  deleteExam: async (id: string) => {
    const res = await examAPI.delete(id);
    return res.data;
  },

  startExam: async (examId: string) => {
    const res = await examAPI.start(examId);
    return res.data;
  },

  submitExam: async (examId: string, answers: any) => {
    const res = await examAPI.submit(examId, answers);
    return res.data;
  },

  getExamResult: async (examId: string) => {
    const res = await examAPI.getResult(examId);
    return res.data;
  },

  getExamAnalytics: async (examId: string) => {
    const res = await examAPI.getAnalytics(examId);
    return res.data;
  },

  getExamAttempts: async (examId: string) => {
    const res = await examAPI.getAttempts(examId);
    return res.data;
  },

  logProctoring: async (examId: string, event: string, details?: string) => {
    const res = await examAPI.logProctoring(examId, event, details);
    return res.data;
  },
};
