export const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE_SETUP: '/setup',
  DASHBOARD: '/dashboard',
  COMPETITIONS: '/competitions',
  COMPETITION: (id: string) => `/competitions/${id}`,
  MCQ_ROUND: (roundId: string) => `/round/mcq/${roundId}`,
  CODING_ROUND: (roundId: string) => `/round/coding/${roundId}`,
  LEADERBOARD: '/leaderboard',
  LEADERBOARD_COMPETITION: (id: string) => `/leaderboard/${id}`,
  PROFILE: '/profile',

  // Admin
  ADMIN: '/admin',
  ADMIN_COMPETITIONS: '/admin/competitions',
  ADMIN_ROUNDS: (competitionId: string) => `/admin/competitions/${competitionId}/rounds`,
  ADMIN_MCQ: (roundId: string) => `/admin/rounds/${roundId}/mcq`,
  ADMIN_CODING: (roundId: string) => `/admin/rounds/${roundId}/coding`,
  ADMIN_PARTICIPANTS: '/admin/participants',
  ADMIN_RESULTS: (roundId: string) => `/admin/rounds/${roundId}/results`,
  ADMIN_SETTINGS: '/admin/settings',
} as const;

export const DEPARTMENTS = [
  'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE', 'BT', 'CH', 'MBA', 'MCA', 'Other',
] as const;

export const COMPETITION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'badge-gray' },
  published: { label: 'Published', color: 'badge-blue' },
  active: { label: 'Active', color: 'badge-green' },
  completed: { label: 'Completed', color: 'badge-purple' },
  cancelled: { label: 'Cancelled', color: 'badge-red' },
};

export const ROUND_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'badge-blue' },
  active: { label: 'Live', color: 'badge-green' },
  completed: { label: 'Completed', color: 'badge-gray' },
  cancelled: { label: 'Cancelled', color: 'badge-red' },
};

export const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'badge-green' },
  medium: { label: 'Medium', color: 'badge-yellow' },
  hard: { label: 'Hard', color: 'badge-red' },
};

export const SUBMISSION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: 'Accepted', color: 'badge-green' },
  wrong_answer: { label: 'Wrong Answer', color: 'badge-red' },
  time_limit_exceeded: { label: 'TLE', color: 'badge-yellow' },
  memory_limit_exceeded: { label: 'MLE', color: 'badge-yellow' },
  compilation_error: { label: 'CE', color: 'badge-red' },
  runtime_error: { label: 'RE', color: 'badge-red' },
  pending: { label: 'Judging...', color: 'badge-gray' },
};
