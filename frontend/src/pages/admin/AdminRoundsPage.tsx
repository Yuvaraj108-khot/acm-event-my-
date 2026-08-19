import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Settings, Play, Square, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { competitionService } from '@/services/competitionService';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ROUND_STATUS_LABELS, ROUTES } from '@/constants';
import { formatDuration, getErrorMessage, safeToInputDateTime } from '@/utils';
import type { Competition, Round } from '@/types';

const roundFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 chars').max(100),
  description: z.string().optional(),
  type: z.enum(['mcq', 'coding']),
  durationMinutes: z.coerce.number().int().positive('Duration must be positive'),
  maxPoints: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid decimal number'),
  negativeMarkingEnabled: z.boolean().default(false),
  negativeMarkingValue: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid decimal number'),
  passingScore: z.string().optional().nullable(),
  maxAdvancingParticipants: z.coerce.number().int().positive().optional().nullable(),
  scheduledStartAt: z.string().optional().nullable(),
});

type RoundFormValues = z.infer<typeof roundFormSchema>;

export default function AdminRoundsPage() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<RoundFormValues>({
    resolver: zodResolver(roundFormSchema),
    defaultValues: { type: 'mcq', durationMinutes: 30, maxPoints: '100', negativeMarkingEnabled: false, negativeMarkingValue: '0' },
  });

  const loadData = () => {
    if (!competitionId) return;
    setLoading(true);
    Promise.all([
      competitionService.getById(competitionId),
      competitionService.getRounds(competitionId),
    ]).then(([comp, roundList]) => {
      setCompetition(comp);
      setRounds(roundList.sort((a, b) => a.orderIndex - b.orderIndex));
    }).catch(() => toast.error('Failed to load competition details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [competitionId]);

  const handleOpenAdd = () => {
    setEditingRound(null);
    reset({
      title: '', description: '', type: 'mcq', durationMinutes: 30,
      maxPoints: '100', negativeMarkingEnabled: false, negativeMarkingValue: '0',
      passingScore: null, maxAdvancingParticipants: null, scheduledStartAt: null,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (round: Round) => {
    setEditingRound(round);
    reset({
      title: round.title,
      description: round.description || '',
      type: round.type,
      durationMinutes: round.durationMinutes,
      maxPoints: round.maxPoints,
      negativeMarkingEnabled: round.negativeMarkingEnabled,
      negativeMarkingValue: round.negativeMarkingValue,
      passingScore: round.passingScore || undefined,
      maxAdvancingParticipants: round.maxAdvancingParticipants || null,
      scheduledStartAt: safeToInputDateTime(round.scheduledStartAt),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: RoundFormValues) => {
    if (!competitionId) return;
    try {
      const payload = {
        ...data,
        competitionId,
        orderIndex: editingRound ? editingRound.orderIndex : rounds.length + 1,
        scheduledStartAt: data.scheduledStartAt || null,
        passingScore: data.passingScore || undefined,
      };

      if (editingRound) {
        await competitionService.updateRound(editingRound.id, payload as any);
        toast.success('Round updated');
      } else {
        await competitionService.createRound(payload as any);
        toast.success('Round created');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Save failed'));
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await competitionService.deleteRound(deletingId);
      toast.success('Round deleted');
      setConfirmOpen(false);
      loadData();
    } catch {
      toast.error('Failed to delete round');
    }
  };

  const handleReorder = async (direction: 'up' | 'down', index: number) => {
    if (!competitionId) return;
    const newRounds = [...rounds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newRounds.length) return;

    // Swap order
    const temp = newRounds[index];
    newRounds[index] = newRounds[targetIdx];
    newRounds[targetIdx] = temp;

    // Map new orderIndex
    const payload = newRounds.map((r, i) => ({ id: r.id, orderIndex: i + 1 }));

    try {
      await competitionService.reorderRounds(competitionId, payload);
      setRounds(newRounds.map((r, i) => ({ ...r, orderIndex: i + 1 })));
      toast.success('Round order updated');
    } catch {
      toast.error('Failed to reorder rounds');
    }
  };

  const handleStartRound = async (id: string) => {
    try {
      await competitionService.startRound(id);
      toast.success('Round is now live!');
      loadData();
    } catch {
      toast.error('Failed to start round');
    }
  };

  const handleEndRound = async (id: string) => {
    try {
      await competitionService.endRound(id);
      toast.success('Round ended');
      loadData();
    } catch {
      toast.error('Failed to end round');
    }
  };

  const configureRoundContent = (round: Round) => {
    if (round.type === 'mcq') navigate(`/admin/rounds/${round.id}/mcq`);
    else navigate(`/admin/rounds/${round.id}/coding`);
  };

  const viewResults = (round: Round) => {
    navigate(`/admin/rounds/${round.id}/results`);
  };

  const watchedNegative = watch('negativeMarkingEnabled');

  return (
    <div style={{ padding: 40 }}>
      {/* Back */}
      <button onClick={() => navigate(ROUTES.ADMIN_COMPETITIONS)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Competitions
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <span style={{ fontSize: 13, color: '#a855f7', fontWeight: 600 }}>{competition?.title}</span>
          <h1 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            Rounds
          </h1>
        </div>
        <Button onClick={handleOpenAdd} leftIcon={<Plus size={16} />}>
          Add Round
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : rounds.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <Settings size={40} color="#333" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No rounds created</h3>
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 16 }}>Rounds represent individual stages in the competition.</p>
          <Button onClick={handleOpenAdd} size="sm">Add Round</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rounds.map((round, idx) => {
            const statusInfo = ROUND_STATUS_LABELS[round.status];
            return (
              <motion.div
                key={round.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass"
                style={{ borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}
              >
                {/* Reorder actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    disabled={idx === 0}
                    onClick={() => handleReorder('up', idx)}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    disabled={idx === rounds.length - 1}
                    onClick={() => handleReorder('down', idx)}
                    style={{ background: 'none', border: 'none', cursor: idx === rounds.length - 1 ? 'not-allowed' : 'pointer', color: idx === rounds.length - 1 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Index badge */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#1a1a1a', border: '1px solid #2a2a2a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#a855f7',
                }}>
                  {idx + 1}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#f5f5f5', fontSize: 16 }}>{round.title}</span>
                    <Badge variant={statusInfo?.color?.replace('badge-', '') as any}>{statusInfo?.label}</Badge>
                    <Badge variant="gray">{round.type.toUpperCase()}</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    <span>Duration: {formatDuration(round.durationMinutes)}</span>
                    <span>Max Points: {parseFloat(round.maxPoints).toFixed(0)}</span>
                    {round.negativeMarkingEnabled && <span style={{ color: '#ef4444' }}>Neg Marking: -{round.negativeMarkingValue}</span>}
                  </div>
                </div>

                {/* Operation controls */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {round.status === 'upcoming' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStartRound(round.id)} leftIcon={<Play size={12} />} style={{ color: '#22c55e' }}>
                      Start Round
                    </Button>
                  )}
                  {round.status === 'active' && (
                    <Button size="sm" variant="secondary" onClick={() => handleEndRound(round.id)} leftIcon={<Square size={12} />} style={{ color: '#ef4444' }}>
                      End Round
                    </Button>
                  )}
                  {round.status === 'completed' && (
                    <Button size="sm" variant="secondary" onClick={() => viewResults(round)} leftIcon={<Eye size={12} />}>
                      Results
                    </Button>
                  )}

                  <div style={{ width: 1, height: 24, background: '#2a2a2a', margin: '0 4px' }} />

                  <Button size="sm" variant="secondary" onClick={() => configureRoundContent(round)}>
                    Manage {round.type === 'mcq' ? 'Questions' : 'Problems'}
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(round)} leftIcon={<Edit2 size={13} />} />
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(round.id)} leftIcon={<Trash2 size={13} />} className="hover:text-red-500" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Round Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingRound ? 'Edit Round' : 'Create Round'} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Round Title"
              placeholder="Preliminary Quiz"
              error={errors.title?.message}
              required
              {...register('title')}
            />

            <Textarea
              label="Description / Rules"
              placeholder="Instructions for participants..."
              error={errors.description?.message}
              {...register('description')}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Select
                label="Round Type"
                disabled={!!editingRound}
                error={errors.type?.message}
                options={[
                  { value: 'mcq', label: 'MCQ (Quiz)' },
                  { value: 'coding', label: 'Coding Challenge' },
                ]}
                {...register('type')}
              />

              <Input
                label="Duration (Minutes)"
                type="number"
                error={errors.durationMinutes?.message}
                required
                {...register('durationMinutes')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Maximum Points"
                placeholder="100"
                error={errors.maxPoints?.message}
                required
                {...register('maxPoints')}
              />

              <Input
                label="Passing Score (Optional)"
                placeholder="eg. 40"
                error={errors.passingScore?.message}
                {...register('passingScore')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Max Advancing Participants"
                type="number"
                placeholder="eg. 30"
                error={errors.maxAdvancingParticipants?.message}
                {...register('maxAdvancingParticipants')}
              />

              <Input
                label="Scheduled Start At (Optional)"
                type="datetime-local"
                error={errors.scheduledStartAt?.message}
                {...register('scheduledStartAt')}
              />
            </div>

            <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="negativeMarkingEnabled"
                  type="checkbox"
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                  {...register('negativeMarkingEnabled')}
                />
                <label htmlFor="negativeMarkingEnabled" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                  Enable negative marking
                </label>
              </div>

              {watchedNegative && (
                <div style={{ marginTop: 12 }}>
                  <Input
                    label="Negative Mark Value per Wrong Answer"
                    placeholder="0.25"
                    error={errors.negativeMarkingValue?.message}
                    {...register('negativeMarkingValue')}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Round</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Round"
        message="Are you sure you want to delete this round? This will permanently delete all configured questions, test cases, and candidate attempts for this round. This action is irreversible."
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
