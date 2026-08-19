import { api } from './api';
import type { ApiResponse, AdminStats, AuditLog } from '@/types';

export const adminService = {
  getStats: async () => {
    const { data } = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return data.data;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get<ApiResponse<AuditLog[]>>('/admin/audit-logs', { params });
    return data.data;
  },

  getParticipants: async (params?: { competitionId?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<ApiResponse<unknown[]>>('/participants', { params });
    return data.data;
  },

  getRoundResults: async (roundId: string) => {
    const { data } = await api.get<ApiResponse<any[]>>(`/results/round/${roundId}`);
    return data.data;
  },

  publishResults: async (roundId: string) => {
    await api.post(`/results/round/${roundId}/publish`);
  },

  advanceParticipants: async (payload: {
    currentRoundId: string;
    nextRoundId: string;
    participantIds: string[];
  }) => {
    const { data } = await api.post<ApiResponse<{ advanced: number }>>('/results/advance', payload);
    return data.data;
  },

  updateParticipantStatus: async (userId: string, competitionId: string, status: string) => {
    const { data } = await api.put(`/participants/${userId}/status`, { competitionId, status });
    return data;
  },

  getAdmins: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/admin/admins');
    return data.data;
  },

  updateAdminRole: async (adminId: string, role: string) => {
    const { data } = await api.put(`/admin/admins/${adminId}/role`, { role });
    return data.data;
  },

  deactivateParticipant: async (userId: string) => {
    const { data } = await api.delete(`/participants/${userId}`);
    return data.data;
  },

  reactivateParticipant: async (userId: string) => {
    const { data } = await api.post(`/participants/${userId}/reactivate`);
    return data.data;
  },
};
