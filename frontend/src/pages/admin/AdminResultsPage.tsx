import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Award, CheckCircle, Send, Users, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import { competitionService } from '@/services/competitionService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { getRankSuffix } from '@/utils';
import type { Round, LeaderboardEntry } from '@/types';

export default function AdminResultsPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [round, setRound] = useState<Round | null>(null);
  const [roundsInComp, setRoundsInComp] = useState<Round[]>([]);
  const [results, setResults] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected participants to advance
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [nextRoundId, setNextRoundId] = useState('');

  // Publish / Advance modal states
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [advanceConfirm, setAdvanceConfirm] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const loadData = () => {
    if (!roundId) return;
    setLoading(true);
    // Fetch round details
    fetch(`/api/rounds/${roundId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then(r => r.json())
      .then(data => {
        setRound(data.data);
        // Fetch sibling rounds in competition
        return competitionService.getRounds(data.data.competitionId);
      })
      .then(roundList => {
        setRoundsInComp(roundList.sort((a, b) => a.orderIndex - b.orderIndex));
      })
      .catch(() => {});

    // Fetch round results
    adminService.getRoundResults(roundId)
      .then(setResults)
      .catch(() => toast.error('Failed to load round results'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [roundId]);

  // Next round options (all rounds after current orderIndex)
  const nextRounds = roundsInComp.filter(r => round && r.orderIndex > round.orderIndex);
  useEffect(() => {
    if (nextRounds.length > 0) {
      setNextRoundId(nextRounds[0].id);
    }
  }, [roundsInComp, round]);

  const toggleSelectUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === results.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(results.map(r => r.userId)));
    }
  };

  const handlePublish = async () => {
    if (!roundId || publishing) return;
    setPublishing(true);
    try {
      await adminService.publishResults(roundId);
      toast.success('Results published and ranks updated!');
      setPublishConfirm(false);
      loadData();
    } catch {
      toast.error('Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  const handleAdvance = async () => {
    if (!roundId || !nextRoundId || selectedUserIds.size === 0 || advancing) return;
    setAdvancing(true);
    try {
      await adminService.advanceParticipants({
        currentRoundId: roundId,
        nextRoundId,
        participantIds: Array.from(selectedUserIds),
      });
      toast.success(`${selectedUserIds.size} participants advanced successfully!`);
      setAdvanceConfirm(false);
      setSelectedUserIds(new Set());
      loadData();
    } catch {
      toast.error('Failed to advance participants');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const isPublished = round?.isPublished;

  return (
    <div style={{ padding: 40 }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Rounds
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, gap: 16 }}>
        <div>
          <span style={{ fontSize: 13, color: '#a855f7', fontWeight: 600 }}>Results Console</span>
          <h1 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            {round?.title} Standings
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!isPublished && (
            <Button onClick={() => setPublishConfirm(true)} leftIcon={<Send size={15} />}>
              Publish Results
            </Button>
          )}
          {isPublished && (
            <Badge variant="green">✓ Results Published</Badge>
          )}
        </div>
      </div>

      {/* Advancement options (visible only if there is a next round) */}
      {nextRounds.length > 0 && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass"
          style={{ borderRadius: 16, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
              <Users size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Advance Participants</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Select participants below and click advance to enroll them in the next stage.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={nextRoundId}
              onChange={e => setNextRoundId(e.target.value)}
              style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5',
                borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
              }}
            >
              {nextRounds.map(r => (
                <option key={r.id} value={r.id}>Next: {r.title}</option>
              ))}
            </select>

            <Button
              disabled={selectedUserIds.size === 0}
              onClick={() => setAdvanceConfirm(true)}
            >
              Advance Selected ({selectedUserIds.size})
            </Button>
          </div>
        </motion.div>
      )}

      {/* Standings table */}
      {results.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <Award size={40} color="#333" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No scores recorded</h3>
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14 }}>Participations will show up here once candidates attempt or submit.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {nextRounds.length > 0 && (
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.size === results.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 15, height: 15 }}
                    />
                  </th>
                )}
                <th style={{ width: 80, textAlign: 'center' }}>Rank</th>
                <th>Participant</th>
                <th>Department / USN</th>
                <th style={{ textAlign: 'center' }}>Attempted</th>
                <th style={{ textAlign: 'center' }}>Correct</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => {
                const rank = r.rank || (idx + 1);
                return (
                  <tr key={r.userId} style={{ background: selectedUserIds.has(r.userId) ? 'rgba(168,85,247,0.03)' : undefined }}>
                    {nextRounds.length > 0 && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(r.userId)}
                          onChange={() => toggleSelectUser(r.userId)}
                          style={{ cursor: 'pointer', width: 15, height: 15 }}
                        />
                      </td>
                    )}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                      {getRankSuffix(rank)}
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, color: '#f5f5f5' }}>{r.name || 'Anonymous'}</span>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{r.email}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span>{r.department || 'N/A'}</span>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{r.usn || 'N/A'}</p>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                      {r.questionsAttempted ?? '-'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#22c55e' }}>
                      {r.questionsCorrect ?? '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={r.advanced ? 'green' : 'gray'}>
                        {r.advanced ? 'Advanced' : 'Pending'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#a855f7', fontSize: 15 }}>
                      {parseFloat(r.totalScore).toFixed(1)} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Publish Confirm Dialog */}
      <ConfirmDialog
        isOpen={publishConfirm}
        onClose={() => setPublishConfirm(false)}
        onConfirm={handlePublish}
        title="Publish Standings"
        message="Are you sure you want to publish the results for this round? This will finalize ranks, update the competition-level leaderboard totals, and allow candidates to view their verified round performance. This action cannot be undone."
        confirmLabel="Finalize & Publish"
        loading={publishing}
      />

      {/* Advance Confirm Dialog */}
      <ConfirmDialog
        isOpen={advanceConfirm}
        onClose={() => setAdvanceConfirm(false)}
        onConfirm={handleAdvance}
        title="Advance Participants"
        message={`Are you sure you want to advance the ${selectedUserIds.size} selected participants to the next round? This will automatically enroll them in the target round stage.`}
        confirmLabel="Advance"
        loading={advancing}
      />
    </div>
  );
}
