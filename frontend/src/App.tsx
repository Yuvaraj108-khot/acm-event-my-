import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ROUTES } from '@/constants';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ProfileSetupPage = lazy(() => import('@/pages/ProfileSetupPage'));
const ParticipantDashboard = lazy(() => import('@/pages/ParticipantDashboard'));
const CompetitionsPage = lazy(() => import('@/pages/CompetitionsPage'));
const CompetitionDetailPage = lazy(() => import('@/pages/CompetitionDetailPage'));
const MCQRoundPage = lazy(() => import('@/pages/MCQRoundPage'));
const CodingRoundPage = lazy(() => import('@/pages/CodingRoundPage'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminCompetitionsPage = lazy(() => import('@/pages/admin/AdminCompetitionsPage'));
const AdminRoundsPage = lazy(() => import('@/pages/admin/AdminRoundsPage'));
const AdminMCQPage = lazy(() => import('@/pages/admin/AdminMCQPage'));
const AdminCodingPage = lazy(() => import('@/pages/admin/AdminCodingPage'));
const AdminParticipantsPage = lazy(() => import('@/pages/admin/AdminParticipantsPage'));
const AdminResultsPage = lazy(() => import('@/pages/admin/AdminResultsPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));

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
