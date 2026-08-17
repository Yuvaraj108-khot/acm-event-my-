import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, BarChart3, Search, Clock, Award } from 'lucide-react';
import { leaderboardService } from '@/services/leaderboardService';
import { competitionService } from '@/services/competitionService';
import { useCompetitionStore } from '@/store/competitionStore';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { getRankSuffix, formatDateTime } from '@/utils';
import type { LeaderboardEntry, Competition } from '@/types';

export default function LeaderboardPage() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState(competitionId || '');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch published/completed competitions for dropdown
  useEffect(() => {
    competitionService.list({ limit: 100 })
      .then(res => {
        const list = res.data.filter(c => ['active', 'completed', 'published'].includes(c.status));
        setCompetitions(list);
        if (list.length > 0 && !competitionId) {
          setSelectedCompId(list[0].id);
          navigate(`/leaderboard/${list[0].id}`, { replace: true });
        }
      })
      .catch(() => {});
  }, [competitionId, navigate]);

  // Fetch leaderboard when selected competition changes
  useEffect(() => {
    if (!selectedCompId) return;
    setLoading(true);
    leaderboardService.getCompetitionLeaderboard(selectedCompId)
      .then(setLeaderboard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCompId]);

  const handleCompChange = (id: string) => {
    setSelectedCompId(id);
    navigate(`/leaderboard/${id}`);
  };

  const filteredLeaderboard = leaderboard.filter(entry => {
    const query = search.toLowerCase();
    return (
      entry.name?.toLowerCase().includes(query) ||
      entry.usn?.toLowerCase().includes(query) ||
      entry.email.toLowerCase().includes(query) ||
      entry.department?.toLowerCase().includes(query)
    );
  });

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#eab308'; // Gold
    if (rank === 2) return '#a1a1aa'; // Silver
    if (rank === 3) return '#ca8a04'; // Bronze
    return 'var(--color-text-secondary)';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#a855f7',
            }}>
              <Trophy size={18} />
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
              Leaderboard
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text-secondary)' }}>
            Real-time standings across all participants and competition rounds
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 28, alignItems: 'end' }}
        >
          <div>
            <Select
              label="Select Competition"
              value={selectedCompId}
              onChange={e => handleCompChange(e.target.value)}
              options={[
                { value: '', label: 'Choose a competition...' },
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
        </motion.div>

        {/* Leaderboard content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
            <BarChart3 size={40} color="#333" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No entries yet</h3>
            <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              {search ? 'No matches for your search.' : 'The leaderboard will populate as rounds are completed.'}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="table-wrap"
          >
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80, textAlign: 'center' }}>Rank</th>
                  <th>Participant</th>
                  <th>Department / USN</th>
                  <th style={{ textAlign: 'center' }}>Rounds Completed</th>
                  <th style={{ textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((entry, idx) => {
                  const rank = entry.rank || (idx + 1);
                  const isTopThree = rank <= 3;
                  return (
                    <tr key={entry.userId}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {isTopThree ? (
                            <Award size={18} color={getRankColor(rank)} fill={rank === 1 ? '#eab308' : 'none'} />
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>{getRankSuffix(rank)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: '#f5f5f5' }}>{entry.name || 'Anonymous'}</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>{entry.email}</p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500 }}>{entry.department || 'N/A'}</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>{entry.usn || 'N/A'}</p>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>
                        {entry.roundsCompleted ?? 0}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#a855f7', fontSize: 15 }}>
                        {parseFloat(entry.totalScore).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
