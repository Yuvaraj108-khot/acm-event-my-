import { api } from './api';
import type { ApiResponse, LeaderboardEntry } from '@/types';

export const leaderboardService = {
  getCompetitionLeaderboard: async (competitionId: string) => {
    const { data } = await api.get<ApiResponse<LeaderboardEntry[]>>(`/leaderboard/competition/${competitionId}`);
    return data.data;
  },

  getRoundLeaderboard: async (roundId: string) => {
    const { data } = await api.get<ApiResponse<LeaderboardEntry[]>>(`/leaderboard/round/${roundId}`);
    return data.data;
  },

  rebuildLeaderboard: async (competitionId: string) => {
    await api.post(`/leaderboard/rebuild/${competitionId}`);
  },
};
