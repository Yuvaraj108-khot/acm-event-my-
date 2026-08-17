import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, UserX, UserCheck, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import { competitionService } from '@/services/competitionService';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { Competition } from '@/types';

export default function AdminParticipantsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Deactivate modal states
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    competitionService.list({ limit: 100 })
      .then(res => {
        setCompetitions(res.data);
        if (res.data.length > 0) {
          setSelectedCompId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadParticipants = () => {
    if (!selectedCompId) return;
    setLoading(true);
    adminService.getParticipants({ competitionId: selectedCompId })
      .then(setParticipants)
      .catch(() => toast.error('Failed to load participants'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadParticipants();
  }, [selectedCompId]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await adminService.updateParticipantStatus(userId, selectedCompId, newStatus);
      toast.success('Status updated successfully');
      loadParticipants();
    } catch {
      toast.error('Failed to update participant status');
    }
  };

  const handleOpenDeactivate = (userId: string) => {
    setTargetUserId(userId);
    setDeactivateOpen(true);
  };

  const handleDeactivate = async () => {
    try {
      await fetch(`/api/participants/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      toast.success('Participant account deactivated');
      setDeactivateOpen(false);
      loadParticipants();
    } catch {
      toast.error('Failed to deactivate participant');
    }
  };

  const filtered = participants.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.usn?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
          Participants
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Manage participant registrations, update status, and handle deactivations
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 28, alignItems: 'end' }}>
        <div>
          <Select
            label="Filter by Competition"
            value={selectedCompId}
            onChange={e => setSelectedCompId(e.target.value)}
            options={[
              { value: '', label: 'Select competition...' },
              ...competitions.map(c => ({ value: c.id, label: c.title })),
            ]}
          />
        </div>
        <div>
          <Input
            placeholder="Search by name, USN, dept..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftElement={<Search size={14} />}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <Shield size={40} color="#333" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No participants found</h3>
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {search ? 'No matches for your search.' : 'Select a competition with registered participants.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Credentials</th>
                <th>Department / Sem</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.userId}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: '#f5f5f5' }}>{p.name || 'Profile Incomplete'}</span>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{p.email}</p>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.usn || '-'}</span>
                  </td>
                  <td>
                    {p.department ? (
                      <span>{p.department} · Sem {p.semester}</span>
                    ) : '-'}
                  </td>
                  <td>
                    <Badge variant={
                      p.registrationStatus === 'winner' ? 'green' :
                      p.registrationStatus === 'eliminated' ? 'red' :
                      p.registrationStatus === 'advanced' ? 'purple' : 'blue'
                    }>
                      {p.registrationStatus || 'Registered'}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={p.registrationStatus || 'registered'}
                        onChange={e => handleStatusChange(p.userId, e.target.value)}
                        style={{
                          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5',
                          borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        <option value="registered">Registered</option>
                        <option value="active">Active</option>
                        <option value="advanced">Advanced</option>
                        <option value="eliminated">Eliminated</option>
                        <option value="winner">Winner</option>
                      </select>

                      <Button variant="ghost" size="sm" onClick={() => handleOpenDeactivate(p.userId)} style={{ padding: 8, color: '#ef4444' }} title="Deactivate account">
                        <UserX size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deactivate confirmation */}
      <ConfirmDialog
        isOpen={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Participant"
        message="Are you sure you want to deactivate this participant account? The user will be locked out and unable to log in until reactivated by database administrators. This will not delete their historical submissions."
        confirmLabel="Deactivate Account"
        danger
      />
    </div>
  );
}
