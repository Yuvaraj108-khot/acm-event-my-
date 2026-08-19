// ── User / Auth ───────────────────────────────────────────────────────────────

export type UserRole = 'participant' | 'admin' | 'moderator' | 'super_admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profileCompleted: boolean;
}

export interface ParticipantProfile {
  id: string;
  userId: string;
  name: string;
  usn: string;
  department: string;
  semester: number;
  phone: string;
  avatarUrl?: string;
  totalPoints: string;
  rank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  profile: ParticipantProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ── Competition ───────────────────────────────────────────────────────────────

export type CompetitionStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled';

export interface Competition {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  bannerUrl?: string;
  status: CompetitionStatus;
  isPublic: boolean;
  maxParticipants?: number;
  registrationStartsAt?: string;
  registrationEndsAt?: string;
  startsAt?: string;
  endsAt?: string;
  registrationCount?: number;
  isRegistered?: boolean;
  createdAt: string;
}

// ── Round ─────────────────────────────────────────────────────────────────────

export type RoundType = 'mcq' | 'coding';
export type RoundStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Round {
  id: string;
  competitionId: string;
  title: string;
  description?: string;
  type: RoundType;
  orderIndex: number;
  status: RoundStatus;
  durationMinutes: number;
  maxPoints: string;
  negativeMarkingEnabled: boolean;
  negativeMarkingValue: string;
  passingScore?: string;
  maxAdvancingParticipants?: number;
  scheduledStartAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  isPublished: boolean;
  createdAt: string;
  userStatus?: RoundParticipant | null;
}

export interface RoundParticipant {
  id: string;
  roundId: string;
  userId: string;
  competitionId: string;
  status: string;
  score: string;
  rank?: number;
  completedAt?: string;
  advancedToNextRound: boolean;
}

// ── MCQ ───────────────────────────────────────────────────────────────────────

export interface MCQOption {
  id: string;
  questionId: string;
  optionText: string;
  optionImageUrl?: string;
  orderIndex: number;
  isCorrect?: boolean; // Only present for admins
}

export interface MCQQuestion {
  id: string;
  roundId: string;
  questionText: string;
  questionImageUrl?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: string;
  orderIndex: number;
  options: MCQOption[];
  userAnswer?: QuizAttempt | null;
}

export interface QuizAttempt {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  isCorrect?: boolean | null;
  pointsAwarded: string;
}

// ── Coding ───────────────────────────────────────────────────────────────────

export interface CodingLanguage {
  id: string;
  name: string;
  slug: string;
  version?: string;
  starterCode: string;
  monacoLanguage: string;
  isEnabled: boolean;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
  explanation?: string;
  orderIndex: number;
}

export interface CodingProblem {
  id: string;
  roundId: string;
  title: string;
  slug: string;
  description: string;
  hints?: string | null;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  orderIndex: number;
  testCases: TestCase[];
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  status: string;
  executionTimeMs: number;
  memoryUsedKb: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  errorMessage?: string;
}

export interface CodingSubmission {
  id: string;
  status: string;
  score: string;
  executionTimeMs?: number;
  testCasesPassed: number;
  totalTestCases: number;
  languageId: string;
  submittedAt: string;
  isRunOnly: boolean;
}

export interface SubmissionResult {
  submission: CodingSubmission | null;
  result: {
    compilationError?: string;
    testResults: TestCaseResult[];
    overallStatus: string;
    totalPassed: number;
    totalTests: number;
  };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank?: number;
  userId: string;
  totalScore: string;
  roundsCompleted?: number;
  questionsAttempted?: number;
  questionsCorrect?: number;
  advanced?: boolean;
  name?: string;
  usn?: string;
  department?: string;
  email: string;
  lastUpdatedAt?: string;
  roundScores?: Record<string, string>;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalParticipants: number;
  totalCompetitions: number;
  totalRounds: number;
  totalRegistrations: number;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  userEmail?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
