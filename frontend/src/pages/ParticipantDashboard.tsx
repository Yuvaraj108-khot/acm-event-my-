import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Star, CheckCircle, Clock, BarChart3, ArrowRight, Zap, Code2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { competitionService } from '@/services/competitionService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ROUTES, COMPETITION_STATUS_LABELS, ROUND_STATUS_LABELS } from '@/constants';
import { formatDate, getRankSuffix } from '@/utils';
import type { Competition, Round } from '@/types';

import { authService } from '@/services/authService';

interface StatCardProps { label: string; value: string | number; icon: React.ReactNode; color: string; }
function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass"
      style={{ borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f5', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{label}</div>
      </div>
    </motion.div>
  );
}

export default function ParticipantDashboard() {
  const { user, profile, setUser, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [myRounds, setMyRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getMe()
      .then(res => {
        if (res.user && res.profile) {
          setUser(res.user);
          setProfile(res.profile);
        }
      })
      .catch(() => {});

    Promise.all([
      competitionService.list({ status: 'published', limit: 10 }),
      competitionService.list({ status: 'active', limit: 10 }),
    ]).then(([published, active]) => {
      setCompetitions([...active.data, ...published.data]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 40 }}
        >
          <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
            {greeting()},
          </p>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            {profile?.name || user?.email?.split('@')[0]} 👋
          </h1>
          {profile && (
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {profile.department} · Semester {profile.semester} · {profile.usn}
            </p>
          )}
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}
        >
          <StatCard label="Total Points" value={parseFloat(profile?.totalPoints ?? '0').toFixed(0)} icon={<Star size={20} />} color="#a855f7" />
          <StatCard label="Competitions" value={competitions.filter(c => c.isRegistered).length} icon={<Trophy size={20} />} color="#3b82f6" />
          <StatCard label="Rank" value={profile?.rank ? getRankSuffix(profile.rank) : '#1'} icon={<BarChart3 size={20} />} color="#22c55e" />
          <StatCard label="Status" value="Active" icon={<Zap size={20} />} color="#f59e0b" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Competitions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f5f5f5' }}>Active Competitions</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.COMPETITIONS)}>
                View all <ArrowRight size={14} />
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass" style={{ borderRadius: 12, padding: 20, height: 80, background: '#111' }} />
                ))
              ) : competitions.length === 0 ? (
                <div className="glass" style={{ borderRadius: 12, padding: 32, textAlign: 'center' }}>
                  <Trophy size={32} color="#333" style={{ marginBottom: 12 }} />
                  <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14 }}>No active competitions</p>
                  <Button size="sm" style={{ marginTop: 12 }} onClick={() => navigate(ROUTES.COMPETITIONS)}>
                    Browse Competitions
                  </Button>
                </div>
              ) : (
                competitions.slice(0, 5).map(comp => {
                  const statusInfo = COMPETITION_STATUS_LABELS[comp.status];
                  return (
                    <motion.div
                      key={comp.id}
                      whileHover={{ x: 2 }}
                      onClick={() => navigate(`/competitions/${comp.id}`)}
                      className="glass glass-hover"
                      style={{ borderRadius: 12, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {comp.title}
                        </p>
                        {comp.startsAt && (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                            {formatDate(comp.startsAt)}
                          </p>
                        )}
                      </div>
                      <Badge variant={statusInfo?.color?.replace('badge-', '') as 'green' | 'purple' | 'blue' | 'yellow' | 'red' | 'gray'}>
                        {statusInfo?.label}
                      </Badge>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#f5f5f5' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Browse Competitions', desc: 'Find and join competitions', icon: Trophy, href: ROUTES.COMPETITIONS, color: '#a855f7' },
                { label: 'Leaderboard', desc: 'See global rankings', icon: BarChart3, href: ROUTES.LEADERBOARD, color: '#3b82f6' },
                { label: 'My Profile', desc: 'View and edit your profile', icon: CheckCircle, href: ROUTES.PROFILE, color: '#22c55e' },
              ].map(({ label, desc, icon: Icon, href, color }) => (
                <motion.div
                  key={label}
                  whileHover={{ x: 2 }}
                  onClick={() => navigate(href)}
                  className="glass glass-hover"
                  style={{ borderRadius: 12, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 500, color: '#f5f5f5' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>{desc}</p>
                  </div>
                  <ArrowRight size={16} color="var(--color-text-muted)" />
                </motion.div>
              ))}
            </div>

            {/* Profile completeness */}
            {profile && (
              <div className="glass" style={{ borderRadius: 12, padding: 20, marginTop: 16 }}>
                <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500, color: '#f5f5f5' }}>Profile Complete</p>
                <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: 2 }}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#22c55e' }}>✓ All fields filled</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
