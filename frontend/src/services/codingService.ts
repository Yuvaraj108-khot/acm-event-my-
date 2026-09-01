import { api } from './api';
import type { ApiResponse, CodingLanguage, CodingProblem, CodingSubmission, SubmissionResult } from '@/types';

export const codingService = {
  getLanguages: async () => {
    const { data } = await api.get<ApiResponse<CodingLanguage[]>>('/coding/languages');
    return data.data;
  },

  getProblems: async (roundId: string) => {
    const { data } = await api.get<ApiResponse<CodingProblem[]>>('/coding/problems', { params: { roundId } });
    return data.data;
  },

  runCode: async (submission: {
    problemId: string;
    roundId: string;
    languageId: string;
    sourceCode: string;
  }) => {
    const { data } = await api.post<ApiResponse<SubmissionResult>>('/coding/run', submission);
    return data.data;
  },

  submitCode: async (submission: {
    problemId: string;
    roundId: string;
    languageId: string;
    sourceCode: string;
  }) => {
    const { data } = await api.post<ApiResponse<SubmissionResult>>('/coding/submit', submission);
    return data.data;
  },

  getSubmissions: async (problemId: string) => {
    const { data } = await api.get<ApiResponse<CodingSubmission[]>>(`/coding/submissions/${problemId}`);
    return data.data;
  },

  // Admin
  createProblem: async (problem: Partial<CodingProblem> & { testCases: unknown[] }) => {
    const { data } = await api.post<ApiResponse<CodingProblem>>('/coding/problems', problem);
    return data.data;
  },

  updateProblem: async (id: string, problem: Partial<CodingProblem>) => {
    const { data } = await api.put<ApiResponse<CodingProblem>>(`/coding/problems/${id}`, problem);
    return data.data;
  },

  deleteProblem: async (id: string) => {
    await api.delete(`/coding/problems/${id}`);
  },
};
