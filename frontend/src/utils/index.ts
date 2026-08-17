import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function isCompetitionOpen(competition: { registrationStartsAt?: string; registrationEndsAt?: string; status: string }): boolean {
  const now = new Date();
  if (competition.status !== 'published' && competition.status !== 'active') return false;
  if (competition.registrationStartsAt && isBefore(now, new Date(competition.registrationStartsAt))) return false;
  if (competition.registrationEndsAt && isAfter(now, new Date(competition.registrationEndsAt))) return false;
  return true;
}

export function getRankSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return `${rank}st`;
  if (j === 2 && k !== 12) return `${rank}nd`;
  if (j === 3 && k !== 13) return `${rank}rd`;
  return `${rank}th`;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: '#22c55e',
    completed: '#a855f7',
    published: '#3b82f6',
    draft: '#6b7280',
    cancelled: '#ef4444',
    upcoming: '#3b82f6',
    accepted: '#22c55e',
    wrong_answer: '#ef4444',
    time_limit_exceeded: '#f59e0b',
    compilation_error: '#ef4444',
    runtime_error: '#ef4444',
  };
  return map[status] ?? '#6b7280';
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getErrorMessage(err: unknown, defaultMessage = 'An error occurred'): string {
  if (err && typeof err === 'object') {
    const anyErr = err as any;
    if (anyErr.response?.data?.message) {
      return anyErr.response.data.message;
    }
  }
  if (err instanceof Error) return err.message;
  return defaultMessage;
}
