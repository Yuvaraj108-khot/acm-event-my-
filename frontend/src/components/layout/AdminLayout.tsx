import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Trophy, Users, Settings, LogOut, Zap,
  ChevronRight, Code2, BarChart2, ListChecks, FileCode,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { ROUTES } from '@/constants';

const adminNavItems = [
  { label: 'Dashboard', href: ROUTES.ADMIN, icon: LayoutDashboard, exact: true },
  { label: 'Competitions', href: ROUTES.ADMIN_COMPETITIONS, icon: Trophy },
  { label: 'Participants', href: ROUTES.ADMIN_PARTICIPANTS, icon: Users },
  { label: 'Settings', href: ROUTES.ADMIN_SETTINGS, icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    clearAuth();
    navigate(ROUTES.LOGIN);
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: '#111',
        borderRight: '1px solid #1e1e1e',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px', borderBottom: '1px solid #1e1e1e' }}>
          <Link to={ROUTES.HOME} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={16} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f5' }}>ACM Admin</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', overflow: 'auto' }}>
          {adminNavItems.map(({ label, href, icon: Icon, exact }) => (
            <Link
              key={href}
              to={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                fontSize: 14, fontWeight: isActive(href, exact) ? 600 : 400,
                textDecoration: 'none',
                color: isActive(href, exact) ? '#a855f7' : 'var(--color-text-secondary)',
                background: isActive(href, exact) ? 'rgba(168,85,247,0.1)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '12px 12px', borderTop: '1px solid #1e1e1e' }}>
          <div style={{
            background: '#1a1a1a', borderRadius: 8, padding: '10px 12px',
            marginBottom: 8,
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#a855f7', fontWeight: 500, marginTop: 2 }}>
              {user?.role?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', fontSize: 13,
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
