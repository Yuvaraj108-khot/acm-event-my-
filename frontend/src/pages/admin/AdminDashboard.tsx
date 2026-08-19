import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Users, BarChart3, Clock, ArrowRight, Shield, Activity, FileText } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/utils';
import type { AdminStats, AuditLog } from '@/types';

interface MetricProps { title: string; value: number; icon: React.ReactNode; color: string; }
function MetricCard({ title, value, icon, color }: MetricProps) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass" style={{ borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{title}</span>
        <h3 style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700, color: '#f5f5f5', lineHeight: 1 }}>{value}</h3>
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.getAuditLogs({ limit: 10 }),
    ]).then(([statsRes, logsRes]) => {
      setStats(statsRes);
      setAuditLogs(logsRes);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Shield size={16} color="#a855f7" />
          <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Console</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
          Overview
        </h1>
      </motion.div>

      {/* Metrics */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}
        >
          <MetricCard title="Competitions" value={stats.totalCompetitions} icon={<Trophy size={22} />} color="#a855f7" />
          <MetricCard title="Total Rounds" value={stats.totalRounds} icon={<Activity size={22} />} color="#3b82f6" />
          <MetricCard title="Total Registrations" value={stats.totalRegistrations} icon={<Users size={22} />} color="#22c55e" />
          <MetricCard title="Total Participants" value={stats.totalParticipants} icon={<Users size={22} />} color="#f59e0b" />
        </motion.div>
      )}

      {/* Audit Logs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass"
        style={{ borderRadius: 16, padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--color-text-tertiary)" />
            Recent Activity Log
          </h2>
          <Badge variant="gray">Realtime</Badge>
        </div>

        {auditLogs.length === 0 ? (
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No activity logs yet</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {log.userEmail || 'System'}
                    </td>
                    <td>
                      <Badge variant={log.action?.includes('delete') ? 'red' : log.action?.includes('create') ? 'green' : 'blue'}>
                        {log.action || 'Unknown'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {log.resourceType ? `${log.resourceType} (${log.resourceId?.slice(0, 8)})` : '-'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
