import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Code2, BarChart3, User, LogOut, Menu, X, ChevronRight, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/Button';
import logo from '@/assets/logo.png';

const navLinks = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: BarChart3 },
  { label: 'Competitions', href: ROUTES.COMPETITIONS, icon: Trophy },
  { label: 'Profile', href: ROUTES.PROFILE, icon: User },
];

export function Navbar() {
  const { user, profile, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    clearAuth();
    navigate(ROUTES.LOGIN);
  };

  const isAdmin = user?.role && ['admin', 'super_admin', 'moderator'].includes(user.role);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
      background: scrolled ? 'rgba(10,10,10,0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
    }}>
      <nav style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to={ROUTES.HOME} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            height: 36,
            padding: '2px 8px',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img src={logo} alt="ACM Logo" style={{ height: 28, objectFit: 'contain' }} />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.3px' }}>ACM</span>
            <span style={{ fontSize: 15, fontWeight: 400, color: '#a855f7', marginLeft: 4 }}>NMAMIT</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 4 }}>
          {user ? (
            <>
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    fontSize: 14, fontWeight: 500,
                    textDecoration: 'none',
                    color: location.pathname === href ? '#a855f7' : 'var(--color-text-secondary)',
                    background: location.pathname === href ? 'rgba(168,85,247,0.1)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to={ROUTES.ADMIN}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    fontSize: 14, fontWeight: 500,
                    textDecoration: 'none',
                    color: 'var(--color-text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  Admin
                </Link>
              )}
              <div style={{ width: 1, height: 20, background: '#2a2a2a', margin: '0 8px' }} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', fontSize: 14,
                  padding: '8px 12px', borderRadius: 8,
                  transition: 'color 0.2s',
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <Button onClick={() => navigate(ROUTES.LOGIN)} size="sm">
              Login
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f5f5f5', padding: 8 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: '#0a0a0a', borderTop: '1px solid #1e1e1e', overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {user ? (
                <>
                  {navLinks.map(({ label, href }) => (
                    <Link
                      key={href}
                      to={href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        padding: '12px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                        textDecoration: 'none',
                        color: location.pathname === href ? '#a855f7' : 'var(--color-text-secondary)',
                        background: location.pathname === href ? 'rgba(168,85,247,0.1)' : 'transparent',
                      }}
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    style={{
                      textAlign: 'left', padding: '12px 16px', borderRadius: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-tertiary)', fontSize: 15,
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)} style={{
                  padding: '12px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                  color: '#a855f7', textDecoration: 'none',
                }}>
                  Login →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
