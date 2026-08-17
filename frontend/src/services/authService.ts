import { api } from './api';
import type { ApiResponse, User, ParticipantProfile } from '@/types';

export interface LoginResult {
  user: User;
  profile: ParticipantProfile | null;
  tokens: { accessToken: string; refreshToken: string };
}

export const authService = {
  register: async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post<ApiResponse<LoginResult>>('/auth/register', { email, password });
    return data.data;
  },

  login: async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post<ApiResponse<LoginResult>>('/auth/login', { email, password });
    return data.data;
  },

  sendOtp: async (email: string) => {
    const { data } = await api.post<ApiResponse<null>>('/auth/send-otp', { email });
    return data;
  },

  verifyOtp: async (email: string, otp: string): Promise<LoginResult> => {
    const { data } = await api.post<ApiResponse<LoginResult>>('/auth/verify-otp', { email, otp });
    return data.data;
  },

  loginWithFirebase: async (idToken: string): Promise<LoginResult> => {
    const { data } = await api.post<ApiResponse<LoginResult>>('/auth/firebase-login', { idToken });
    return data.data;
  },

  getMe: async () => {
    const { data } = await api.get<ApiResponse<{ user: User; profile: ParticipantProfile | null }>>('/auth/me');
    return data.data;
  },

  completeProfile: async (profileData: {
    name: string;
    usn: string;
    department: string;
    semester: number;
    phone: string;
  }) => {
    const { data } = await api.post<ApiResponse<ParticipantProfile>>('/auth/complete-profile', profileData);
    return data.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};
