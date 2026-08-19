import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Clock, Users, Calendar, ArrowRight, Lock, CheckCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { competitionService } from '@/services/competitionService';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { COMPETITION_STATUS_LABELS, ROUND_STATUS_LABELS, ROUTES } from '@/constants';
import { formatDate, formatDateTime, formatDuration, isCompetitionOpen, getErrorMessage } from '@/utils';
import type { Competition, Round } from '@/types';

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [competition, setCompetition] = useState<(Competition & { isRegistered: boolean }) | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      competitionService.getById(id),
      competitionService.getRounds(id),
    ]).then(([comp, roundList]) => {
      setCompetition(comp);
      setRounds(roundList);
    }).catch(err => {
      toast.error('Competition not found');
      navigate(ROUTES.COMPETITIONS);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    if (!user) { navigate(ROUTES.LOGIN); return; }
    if (!competition) return;
    setRegistering(true);
    try {
      await competitionService.register(competition.id);
      setCompetition(prev => prev ? { ...prev, isRegistered: true } : prev);
      toast.success('Successfully registered!');
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Registration failed');
      toast.error(msg);
    } finally {
      setRegistering(false);
    }
  };

  const enterRound = (round: Round) => {
    if (round.type === 'mcq') navigate(`/round/mcq/${round.id}`);
    else navigate(`/round/coding/${round.id}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!competition) return null;

  const statusInfo = COMPETITION_STATUS_LABELS[competition.status];
  const open = isCompetitionOpen(competition);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Back */}
        <button onClick={() => navigate(ROUTES.COMPETITIONS)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Competitions
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>
          {/* Main content */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Title */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Badge variant={statusInfo?.color?.replace('badge-', '') as 'green' | 'blue' | 'purple' | 'yellow' | 'red' | 'gray'} dot>
                  {statusInfo?.label}
                </Badge>
                {competition.isRegistered && (
                  <Badge variant="green"><CheckCircle size={10} /> Registered</Badge>
                )}
              </div>
              <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
                {competition.title}
              </h1>
              <p style={{ margin: 0, fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {competition.description}
              </p>
            </div>

            {/* Meta info */}
            <div className="glass" style={{ borderRadius: 14, padding: 20, marginBottom: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {competition.registrationStartsAt && (
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registration Opens</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#f5f5f5', fontWeight: 500 }}>{formatDate(competition.registrationStartsAt)}</p>
                </div>
              )}
              {competition.registrationEndsAt && (
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registration Closes</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#f5f5f5', fontWeight: 500 }}>{formatDate(competition.registrationEndsAt)}</p>
                </div>
              )}
              {competition.startsAt && (
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Competition Starts</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#f5f5f5', fontWeight: 500 }}>{formatDateTime(competition.startsAt)}</p>
                </div>
              )}
              {competition.registrationCount !== undefined && (
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Participants</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#f5f5f5', fontWeight: 500 }}>{competition.registrationCount}{competition.maxParticipants ? ` / ${competition.maxParticipants}` : ''}</p>
                </div>
              )}
            </div>

            {/* Rounds */}
            <div>
              <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600, color: '#f5f5f5' }}>
                Rounds ({rounds.length})
              </h2>

              {rounds.length === 0 ? (
                <div className="glass" style={{ borderRadius: 12, padding: 32, textAlign: 'center' }}>
                  <p style={{ margin: 0, color: 'var(--color-text-tertiary)' }}>No rounds configured yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {rounds.map((round, idx) => {
                    const roundStatus = ROUND_STATUS_LABELS[round.status];
                    const canEnter = round.status === 'active' && competition.isRegistered;
                    return (
                      <motion.div
                        key={round.id}
                        whileHover={canEnter ? { x: 4 } : {}}
                        className="glass"
                        style={{
                          borderRadius: 14, padding: '18px 20px',
                          display: 'flex', alignItems: 'center', gap: 16,
                          cursor: canEnter ? 'pointer' : 'default',
                          border: round.status === 'active' ? '1px solid rgba(34,197,94,0.3)' : undefined,
                        }}
                        onClick={() => canEnter && enterRound(round)}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0, fontWeight: 700,
                          background: round.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.1)',
                          border: `1px solid ${round.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: round.status === 'active' ? '#22c55e' : '#a855f7',
                          fontSize: 14,
                        }}>
                          {idx + 1}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: '#f5f5f5' }}>{round.title}</span>
                            <Badge variant={roundStatus?.color?.replace('badge-', '') as 'green' | 'blue' | 'gray' | 'red' | 'yellow' | 'purple'}>
                              {roundStatus?.label}
                            </Badge>
                            <Badge variant="gray">{round.type.toUpperCase()}</Badge>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            <span><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />{formatDuration(round.durationMinutes)}</span>
                            <span>Max: {parseFloat(round.maxPoints).toFixed(0)} pts</span>
                            {round.negativeMarkingEnabled && <span>Negative marking: -{round.negativeMarkingValue}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {round.type === 'coding' ? (
                            <Button 
                              size="sm" 
                              variant={canEnter ? 'primary' : 'secondary'}
                              disabled={!canEnter}
                              onClick={(e) => { e.stopPropagation(); if (canEnter) enterRound(round); }}
                              rightIcon={canEnter ? <Play size={14} /> : <Lock size={14} />}
                            >
                              {canEnter ? 'Open IDE' : 'IDE Locked'}
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant={canEnter ? 'primary' : 'secondary'}
                              disabled={!canEnter}
                              onClick={(e) => { e.stopPropagation(); if (canEnter) enterRound(round); }}
                              rightIcon={canEnter ? <Play size={14} /> : <Lock size={14} />}
                            >
                              {canEnter ? 'Start Quiz' : 'Quiz Locked'}
                            </Button>
                          )}
                          {round.status === 'completed' && <CheckCircle size={16} color="#22c55e" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{ position: 'sticky', top: 100 }}
          >
            <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
              {competition.isRegistered ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={24} color="#22c55e" />
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>You're registered!</p>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    Wait for active rounds to participate.
                  </p>
                  <Button variant="secondary" style={{ width: '100%' }} onClick={() => navigate(`/leaderboard/${competition.id}`)}>
                    View Leaderboard
                  </Button>
                </div>
              ) : open ? (
                <>
                  <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600, color: '#f5f5f5' }}>Join Competition</h3>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    Registration is open. Join now to participate in all rounds.
                  </p>
                  <Button
                    loading={registering}
                    onClick={handleRegister}
                    style={{ width: '100%' }}
                    rightIcon={<ArrowRight size={16} />}
                  >
                    Register Now
                  </Button>
                  {competition.maxParticipants && (
                    <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      {competition.registrationCount} / {competition.maxParticipants} spots filled
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>Registration Closed</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {competition.status === 'completed' ? 'This competition has ended.' : 'Registration is not currently open.'}
                  </p>
                </>
              )}

              <div style={{ borderTop: '1px solid #1e1e1e', marginTop: 20, paddingTop: 20 }}>
                <Button variant="ghost" size="sm" style={{ width: '100%' }} onClick={() => navigate(`/leaderboard/${competition.id}`)}>
                  View Leaderboard →
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
