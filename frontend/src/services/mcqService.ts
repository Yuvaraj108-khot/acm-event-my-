import { api } from './api';
import type { ApiResponse, MCQQuestion, QuizAttempt } from '@/types';

export const mcqService = {
  getQuestions: async (roundId: string) => {
    const { data } = await api.get<ApiResponse<MCQQuestion[]>>('/mcq/questions', { params: { roundId } });
    return data.data;
  },

  saveAnswer: async (answer: {
    roundId: string;
    questionId: string;
    selectedOptionId: string | null;
    isMarkedForReview: boolean;
  }) => {
    const { data } = await api.post<ApiResponse<{ success: boolean }>>('/mcq/answers/save', answer);
    return data;
  },

  submitRound: async (roundId: string) => {
    const { data } = await api.post<ApiResponse<{
      totalScore: number;
      questionsAttempted: number;
      questionsCorrect: number;
    }>>('/mcq/submit', { roundId });
    return data.data;
  },

  // Admin
  createQuestion: async (question: {
    roundId: string;
    questionText: string;
    difficulty: string;
    points: number;
    options: { optionText: string; isCorrect: boolean }[];
  }) => {
    const { data } = await api.post<ApiResponse<MCQQuestion>>('/mcq/questions', question);
    return data.data;
  },

  updateQuestion: async (id: string, question: Partial<MCQQuestion>) => {
    const { data } = await api.put<ApiResponse<MCQQuestion>>(`/mcq/questions/${id}`, question);
    return data.data;
  },

  deleteQuestion: async (id: string) => {
    await api.delete(`/mcq/questions/${id}`);
  },
};
