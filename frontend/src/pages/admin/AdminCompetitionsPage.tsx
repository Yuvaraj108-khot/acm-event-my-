import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Calendar, Settings, Eye, Trophy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { competitionService } from '@/services/competitionService';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { COMPETITION_STATUS_LABELS } from '@/constants';
import { formatDate, getErrorMessage, safeToInputDateTime } from '@/utils';
import type { Competition } from '@/types';

const compFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 chars').max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and dashes only'),
  description: z.string().min(10, 'Description must be at least 10 chars'),
  shortDescription: z.string().max(200).optional(),
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled']),
  isPublic: z.boolean().default(true),
  maxParticipants: z.coerce.number().int().positive().optional().nullable(),
  registrationStartsAt: z.string().optional().nullable(),
  registrationEndsAt: z.string().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

type CompFormValues = z.infer<typeof compFormSchema>;

export default function AdminCompetitionsPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CompFormValues>({
    resolver: zodResolver(compFormSchema),
    defaultValues: { status: 'draft', isPublic: true },
  });

  const loadCompetitions = () => {
    setLoading(true);
    competitionService.list({ limit: 100 })
      .then(res => setCompetitions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCompetitions(); }, []);

  // Sync title to slug
  const watchedTitle = watch('title');
  useEffect(() => {
    if (watchedTitle && !editingComp) {
      const generated = watchedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setValue('slug', generated, { shouldValidate: true });
    }
  }, [watchedTitle, editingComp, setValue]);

  const handleOpenAdd = () => {
    setEditingComp(null);
    reset({
      title: '', slug: '', description: '', shortDescription: '',
      status: 'draft', isPublic: true, maxParticipants: null,
      registrationStartsAt: null, registrationEndsAt: null,
      startsAt: null, endsAt: null,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (comp: Competition) => {
    setEditingComp(comp);
    reset({
      title: comp.title,
      slug: comp.slug,
      description: comp.description,
      shortDescription: comp.shortDescription || '',
      status: comp.status,
      isPublic: comp.isPublic,
      maxParticipants: comp.maxParticipants || undefined,
      registrationStartsAt: safeToInputDateTime(comp.registrationStartsAt),
      registrationEndsAt: safeToInputDateTime(comp.registrationEndsAt),
      startsAt: safeToInputDateTime(comp.startsAt),
      endsAt: safeToInputDateTime(comp.endsAt),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: CompFormValues) => {
    try {
      // Convert datetime-local values to ISO strings for the backend
      const toISO = (val: string | null | undefined): string | undefined => {
        if (!val) return undefined;
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      };

      const formatted: any = {
        ...data,
        registrationStartsAt: toISO(data.registrationStartsAt),
        registrationEndsAt: toISO(data.registrationEndsAt),
        startsAt: toISO(data.startsAt),
        endsAt: toISO(data.endsAt),
        maxParticipants: data.maxParticipants || undefined,
      };

      // Remove undefined keys so the backend doesn't choke on them
      Object.keys(formatted).forEach(k => {
        if (formatted[k] === undefined || formatted[k] === '') delete formatted[k];
      });

      if (editingComp) {
        await competitionService.update(editingComp.id, formatted);
        toast.success('Competition updated');
      } else {
        await competitionService.create(formatted);
        toast.success('Competition created');
      }
      setModalOpen(false);
      loadCompetitions();
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
      await competitionService.delete(deletingId);
      toast.success('Competition deleted');
      setConfirmOpen(false);
      loadCompetitions();
    } catch {
      toast.error('Failed to delete competition');
    }
  };

  return (
    <div style={{ padding: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            Competitions
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Manage competitions, configure schedules, and status
          </p>
        </div>
        <Button onClick={handleOpenAdd} leftIcon={<Plus size={16} />}>
          New Competition
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : competitions.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <Trophy size={40} color="#333" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No competitions</h3>
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 16 }}>Get started by creating your first competition.</p>
          <Button onClick={handleOpenAdd} size="sm">Create Competition</Button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Registration Period</th>
                <th>Event Date</th>
                <th>Registrations</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map(comp => {
                const statusInfo = COMPETITION_STATUS_LABELS[comp.status];
                return (
                  <tr key={comp.id}>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, color: '#f5f5f5' }}>{comp.title}</span>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>/{comp.slug}</p>
                      </div>
                    </td>
                    <td>
                      <Badge variant={statusInfo?.color?.replace('badge-', '') as any}>
                        {statusInfo?.label}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {comp.registrationStartsAt ? (
                        <div>
                          <span>{formatDate(comp.registrationStartsAt)}</span>
                          <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>to</span>
                          <span>{comp.registrationEndsAt ? formatDate(comp.registrationEndsAt) : 'open'}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {comp.startsAt ? formatDate(comp.startsAt) : '-'}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {comp.registrationCount ?? 0}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/competitions/${comp.id}/rounds`)} title="Manage Rounds">
                          Rounds
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(comp)} leftIcon={<Edit2 size={13} />} />
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(comp.id)} leftIcon={<Trash2 size={13} />} className="hover:text-red-500" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingComp ? 'Edit Competition' : 'Create Competition'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Competition Title"
              placeholder="CodeStorm 2026"
              error={errors.title?.message}
              required
              {...register('title')}
            />

            <Input
              label="Slug URL"
              placeholder="codestorm-2026"
              error={errors.slug?.message}
              required
              {...register('slug')}
            />

            <Input
              label="Short Description"
              placeholder="Brief summary shown on listings"
              error={errors.shortDescription?.message}
              {...register('shortDescription')}
            />

            <Textarea
              label="Detailed Description"
              placeholder="Supports markdown formatting"
              error={errors.description?.message}
              required
              {...register('description')}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Select
                label="Status"
                error={errors.status?.message}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'active', label: 'Active (Live)' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                {...register('status')}
              />

              <Input
                label="Max Participants"
                type="number"
                placeholder="Unlimited"
                error={errors.maxParticipants?.message}
                {...register('maxParticipants')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Registration Starts At"
                type="datetime-local"
                error={errors.registrationStartsAt?.message}
                {...register('registrationStartsAt')}
              />

              <Input
                label="Registration Ends At"
                type="datetime-local"
                error={errors.registrationEndsAt?.message}
                {...register('registrationEndsAt')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Competition Starts At"
                type="datetime-local"
                error={errors.startsAt?.message}
                {...register('startsAt')}
              />

              <Input
                label="Competition Ends At"
                type="datetime-local"
                error={errors.endsAt?.message}
                {...register('endsAt')}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input
                id="isPublic"
                type="checkbox"
                style={{ width: 16, height: 16, cursor: 'pointer' }}
                {...register('isPublic')}
              />
              <label htmlFor="isPublic" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                Visible to public listing
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Competition</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Competition"
        message="Are you sure you want to delete this competition? This will permanently delete all registered participants, rounds, questions, and submission histories. This action is irreversible."
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
