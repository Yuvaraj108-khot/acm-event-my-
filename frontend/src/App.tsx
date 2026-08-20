import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ROUTES } from '@/constants';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));
const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'));
const ProfileSetupPage = lazyWithRetry(() => import('@/pages/ProfileSetupPage'));
const ParticipantDashboard = lazyWithRetry(() => import('@/pages/ParticipantDashboard'));
const CompetitionsPage = lazyWithRetry(() => import('@/pages/CompetitionsPage'));
const CompetitionDetailPage = lazyWithRetry(() => import('@/pages/CompetitionDetailPage'));
const MCQRoundPage = lazyWithRetry(() => import('@/pages/MCQRoundPage'));
const CodingRoundPage = lazyWithRetry(() => import('@/pages/CodingRoundPage'));
const LeaderboardPage = lazyWithRetry(() => import('@/pages/LeaderboardPage'));
const ProfilePage = lazyWithRetry(() => import('@/pages/ProfilePage'));

// Admin pages
const AdminDashboard = lazyWithRetry(() => import('@/pages/admin/AdminDashboard'));
const AdminCompetitionsPage = lazyWithRetry(() => import('@/pages/admin/AdminCompetitionsPage'));
const AdminRoundsPage = lazyWithRetry(() => import('@/pages/admin/AdminRoundsPage'));
const AdminMCQPage = lazyWithRetry(() => import('@/pages/admin/AdminMCQPage'));
const AdminCodingPage = lazyWithRetry(() => import('@/pages/admin/AdminCodingPage'));
const AdminParticipantsPage = lazyWithRetry(() => import('@/pages/admin/AdminParticipantsPage'));
const AdminResultsPage = lazyWithRetry(() => import('@/pages/admin/AdminResultsPage'));
const AdminSettingsPage = lazyWithRetry(() => import('@/pages/admin/AdminSettingsPage'));

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a',
    }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const location = useLocation();
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (!user.profileCompleted && !location.pathname.startsWith('/setup')) {
    return <Navigate to={ROUTES.PROFILE_SETUP} replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const location = useLocation();
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return <>{children}</>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path={ROUTES.HOME} element={<><Navbar /><LandingPage /></>} />
        <Route path={ROUTES.LOGIN} element={
          <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
        } />
        <Route path={ROUTES.COMPETITIONS} element={<><Navbar /><CompetitionsPage /></>} />
        <Route path="/competitions/:id" element={<><Navbar /><CompetitionDetailPage /></>} />
        <Route path={ROUTES.LEADERBOARD} element={<><Navbar /><LeaderboardPage /></>} />
        <Route path="/leaderboard/:competitionId" element={<><Navbar /><LeaderboardPage /></>} />

        {/* Auth-required */}
        <Route path={ROUTES.PROFILE_SETUP} element={
          <PrivateRoute><ProfileSetupPage /></PrivateRoute>
        } />
        <Route path={ROUTES.DASHBOARD} element={
          <PrivateRoute><><Navbar /><ParticipantDashboard /></></PrivateRoute>
        } />
        <Route path={ROUTES.PROFILE} element={
          <PrivateRoute><><Navbar /><ProfilePage /></></PrivateRoute>
        } />
        <Route path="/round/mcq/:roundId" element={
          <PrivateRoute><MCQRoundPage /></PrivateRoute>
        } />
        <Route path="/round/coding/:roundId" element={
          <PrivateRoute><CodingRoundPage /></PrivateRoute>
        } />

        {/* Admin routes */}
        <Route path={ROUTES.ADMIN} element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_COMPETITIONS} element={<AdminRoute><AdminCompetitionsPage /></AdminRoute>} />
        <Route path="/admin/competitions/:competitionId/rounds" element={<AdminRoute><AdminRoundsPage /></AdminRoute>} />
        <Route path="/admin/rounds/:roundId/mcq" element={<AdminRoute><AdminMCQPage /></AdminRoute>} />
        <Route path="/admin/rounds/:roundId/coding" element={<AdminRoute><AdminCodingPage /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_PARTICIPANTS} element={<AdminRoute><AdminParticipantsPage /></AdminRoute>} />
        <Route path="/admin/rounds/:roundId/results" element={<AdminRoute><AdminResultsPage /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
