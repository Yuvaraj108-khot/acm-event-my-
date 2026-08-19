import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, UserPlus, Save, Key, Database, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime, getErrorMessage } from '@/utils';
import { api } from '@/services/api';

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New admin state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [adding, setAdding] = useState(false);

  const loadAdmins = () => {
    if (user?.role !== 'super_admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    adminService.getAdmins()
      .then(setAdmins)
      .catch(() => toast.error('Failed to load administrator accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAdmins(); }, [user]);

  const handleRoleChange = async (adminId: string, newRole: string) => {
    try {
      await adminService.updateAdminRole(adminId, newRole);
      toast.success('Admin role updated');
      loadAdmins();
    } catch {
      toast.error('Failed to update admin role');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    setAdding(true);
    try {
      // Create user directly via admin command or API
      await api.post('/admin/admins', { email: newAdminEmail, role: newAdminRole });

      toast.success('New administrator invited / added successfully!');
      setNewAdminEmail('');
      loadAdmins();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to add admin'));
    } finally {
      setAdding(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
          Platform Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Configure administrators, roles, security policies, and backups
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
        {/* Left Column: Admin list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {isSuperAdmin ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass"
              style={{ borderRadius: 16, padding: 24 }}
            >
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="var(--color-text-tertiary)" />
                Administrative Roles
              </h2>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <div className="spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Last Login</th>
                        <th style={{ textAlign: 'right' }}>Update Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map(adm => (
                        <tr key={adm.id}>
                          <td style={{ fontWeight: 500 }}>{adm.email}</td>
                          <td>
                            <Badge variant={adm.role === 'super_admin' ? 'purple' : 'blue'}>
                              {adm.role.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            {adm.lastLoginAt ? formatDateTime(adm.lastLoginAt) : 'Never logged in'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {adm.role !== 'super_admin' ? (
                              <select
                                value={adm.role}
                                onChange={e => handleRoleChange(adm.id, e.target.value)}
                                style={{
                                  background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5',
                                  borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                                }}
                              >
                                <option value="admin">Admin</option>
                                <option value="moderator">Moderator</option>
                              </select>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: '#f5f5f5' }}>Access Restricted</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Administrator role management is only accessible to Super Administrators. Contact your platform owner for role changes.
              </p>
            </div>
          )}

          {/* Database utilities */}
          <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="var(--color-text-tertiary)" />
              Database Operations
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Utilities for rebuilding indices, leaderboards, and seeding data.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  toast.promise(
                    api.post('/admin/rebuild-leaderboards'),
                    {
                      loading: 'Rebuilding leaderboards...',
                      success: 'Leaderboards rebuilt successfully!',
                      error: 'Failed to rebuild leaderboards',
                    }
                  );
                }}
                leftIcon={<RefreshCw size={13} />}
              >
                Rebuild All Leaderboards
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Invite admin */}
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass"
            style={{ borderRadius: 16, padding: 24, position: 'sticky', top: 40 }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={16} />
              Add Administrator
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Add a new email directly into the admin database schema.
            </p>

            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Email Address"
                placeholder="colleague@gmail.com"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                required
              />

              <Select
                label="Administrative Role"
                value={newAdminRole}
                onChange={e => setNewAdminRole(e.target.value as any)}
                options={[
                  { value: 'admin', label: 'Admin (Full access)' },
                  { value: 'moderator', label: 'Moderator (View only)' },
                ]}
              />

              <Button type="submit" loading={adding} style={{ width: '100%' }}>
                Grant Admin Access
              </Button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
