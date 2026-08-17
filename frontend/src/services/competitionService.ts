import { api } from './api';
import type { ApiResponse, Competition, Round, PaginatedData } from '@/types';

export const competitionService = {
  list: async (params?: { status?: string; page?: number; limit?: number; search?: string }) => {
    const { data } = await api.get<ApiResponse<PaginatedData<Competition>>>('/competitions', { params });
    return data.data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<Competition & { isRegistered: boolean }>>(`/competitions/${id}`);
    return data.data;
  },

  getBySlug: async (slug: string) => {
    const { data } = await api.get<ApiResponse<Competition & { isRegistered: boolean }>>(`/competitions/slug/${slug}`);
    return data.data;
  },

  create: async (competition: Partial<Competition>) => {
    const { data } = await api.post<ApiResponse<Competition>>('/competitions', competition);
    return data.data;
  },

  update: async (id: string, competition: Partial<Competition>) => {
    const { data } = await api.put<ApiResponse<Competition>>(`/competitions/${id}`, competition);
    return data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/competitions/${id}`);
  },

  register: async (id: string) => {
    const { data } = await api.post<ApiResponse<unknown>>(`/competitions/${id}/register`);
    return data;
  },

  getRounds: async (competitionId: string) => {
    const { data } = await api.get<ApiResponse<Round[]>>('/rounds', { params: { competitionId } });
    return data.data;
  },

  createRound: async (round: Partial<Round>) => {
    const { data } = await api.post<ApiResponse<Round>>('/rounds', round);
    return data.data;
  },

  updateRound: async (id: string, round: Partial<Round>) => {
    const { data } = await api.put<ApiResponse<Round>>(`/rounds/${id}`, round);
    return data.data;
  },

  deleteRound: async (id: string) => {
    await api.delete(`/rounds/${id}`);
  },

  reorderRounds: async (competitionId: string, rounds: { id: string; orderIndex: number }[]) => {
    const { data } = await api.put<ApiResponse<Round[]>>('/rounds/reorder', { competitionId, rounds });
    return data.data;
  },

  startRound: async (id: string) => {
    const { data } = await api.post<ApiResponse<Round>>(`/rounds/${id}/start`);
    return data.data;
  },

  endRound: async (id: string) => {
    const { data } = await api.post<ApiResponse<Round>>(`/rounds/${id}/end`);
    return data.data;
  },
};
