import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Code2, PlusCircle, Trash, Lightbulb } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { codingService } from '@/services/codingService';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DIFFICULTY_LABELS } from '@/constants';
import type { CodingProblem } from '@/types';

const problemFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 chars').max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and dashes only'),
  description: z.string().min(10, 'Description must be at least 10 chars'),
  inputFormat: z.string().min(5, 'Input format is required'),
  outputFormat: z.string().min(5, 'Output format is required'),
  constraints: z.string().min(5, 'Constraints is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  points: z.string().regex(/^\d+(\.\d+)?$/, 'Points must be a valid decimal'),
  timeLimitMs: z.coerce.number().int().min(100).max(5000),
  memoryLimitMb: z.coerce.number().int().min(16).max(512),
  tipDurationSeconds: z.coerce.number().int().min(1, 'Minimum 1 second').max(300, 'Maximum 300 seconds').default(10),
  tips: z.array(z.object({ text: z.string().min(1, 'Tip content cannot be empty') })).optional().default([]),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string().min(1, 'Expected output is required'),
    isSample: z.boolean(),
    isHidden: z.boolean(),
    explanation: z.string().optional(),
  })).min(1, 'At least one testcase is required'),
});

type ProblemFormValues = z.infer<typeof problemFormSchema>;

export default function AdminCodingPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<ProblemFormValues>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: {
      title: '', slug: '', description: '', inputFormat: '', outputFormat: '', constraints: '',
      difficulty: 'medium', points: '10', timeLimitMs: 1000, memoryLimitMb: 128,
      tipDurationSeconds: 10, tips: [],
      testCases: [{ input: '', expectedOutput: '', isSample: true, isHidden: false, explanation: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'testCases',
  });

  const { fields: tipFields, append: appendTip, remove: removeTip } = useFieldArray({
    control,
    name: 'tips',
  });

  const loadProblems = () => {
    if (!roundId) return;
    setLoading(true);
    codingService.getProblems(roundId)
      .then(setProblems)
      .catch(() => toast.error('Failed to load problems'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProblems(); }, [roundId]);

  // Sync title to slug
  const watchedTitle = watch('title');
  useEffect(() => {
    if (watchedTitle && !editingProblem) {
      const generated = watchedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setValue('slug', generated, { shouldValidate: true });
    }
  }, [watchedTitle, editingProblem, setValue]);

  const handleOpenAdd = () => {
    setEditingProblem(null);
    reset({
      title: '', slug: '', description: '', inputFormat: '', outputFormat: '', constraints: '',
      difficulty: 'medium', points: '10', timeLimitMs: 1000, memoryLimitMb: 128,
      tipDurationSeconds: 10, tips: [],
      testCases: [{ input: '', expectedOutput: '', isSample: true, isHidden: false, explanation: '' }],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: CodingProblem) => {
    setEditingProblem(p);
    reset({
      title: p.title,
      slug: p.slug,
      description: p.description,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      constraints: p.constraints,
      difficulty: p.difficulty,
      points: p.points,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
      tipDurationSeconds: p.tipDurationSeconds ?? 10,
      tips: (p.tips || []).map(t => ({ text: t })),
      testCases: p.testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample,
        isHidden: tc.isHidden,
        explanation: tc.explanation || '',
      })),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ProblemFormValues) => {
    if (!roundId) return;
    try {
      const formattedTips = (data.tips || []).map(t => t.text.trim()).filter(Boolean);
      const payload = {
        ...data,
        tips: formattedTips,
        roundId,
        orderIndex: editingProblem ? editingProblem.orderIndex : problems.length + 1,
      };

      if (editingProblem) {
        await codingService.updateProblem(editingProblem.id, payload as any);
        toast.success('Problem updated');
      } else {
        await codingService.createProblem(payload as any);
        toast.success('Problem created');
      }
      setModalOpen(false);
      loadProblems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await codingService.deleteProblem(deletingId);
      toast.success('Problem deleted');
      setConfirmOpen(false);
      loadProblems();
    } catch {
      toast.error('Failed to delete problem');
    }
  };

  return (
    <div style={{ padding: 40 }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Rounds
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            Coding Problems
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Configure problems, limits, and testcases for this coding challenge round
          </p>
        </div>
        <Button onClick={handleOpenAdd} leftIcon={<Plus size={16} />}>
          New Problem
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : problems.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <Code2 size={40} color="#333" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No problems yet</h3>
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 16 }}>Get started by adding your first coding problem.</p>
          <Button onClick={handleOpenAdd} size="sm">Create Problem</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {problems.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass"
              style={{ borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#f5f5f5', fontSize: 16 }}>{idx + 1}. {p.title}</span>
                  <Badge variant={DIFFICULTY_LABELS[p.difficulty]?.color?.replace('badge-', '') as any}>{p.difficulty}</Badge>
                  <Badge variant="gray">{parseFloat(p.points).toFixed(0)} pts</Badge>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  <span>Time Limit: {p.timeLimitMs}ms</span>
                  <span>Memory Limit: {p.memoryLimitMb}MB</span>
                  <span>Test Cases: {p.testCases.length} ({p.testCases.filter(t => t.isSample).length} sample)</span>
                  <span style={{ color: '#eab308' }}>Tips: {p.tips?.length || 0} ({p.tipDurationSeconds ?? 10}s view)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(p)} leftIcon={<Edit2 size={13} />} />
                <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(p.id)} leftIcon={<Trash2 size={13} />} className="hover:text-red-500" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProblem ? 'Edit Problem' : 'Create Problem'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left: General Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5', margin: '0 0 4px' }}>Problem details</h3>

              <Input
                label="Problem Title"
                placeholder="Two Sum"
                error={errors.title?.message}
                required
                {...register('title')}
              />

              <Input
                label="Slug URL"
                placeholder="two-sum"
                error={errors.slug?.message}
                required
                {...register('slug')}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Select
                  label="Difficulty"
                  error={errors.difficulty?.message}
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                  {...register('difficulty')}
                />

                <Input
                  label="Points"
                  placeholder="20"
                  error={errors.points?.message}
                  required
                  {...register('points')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input
                  label="Time Limit (ms)"
                  type="number"
                  placeholder="1000"
                  error={errors.timeLimitMs?.message}
                  required
                  {...register('timeLimitMs')}
                />

                <Input
                  label="Memory Limit (MB)"
                  type="number"
                  placeholder="128"
                  error={errors.memoryLimitMb?.message}
                  required
                  {...register('memoryLimitMb')}
                />
              </div>

              <Input
                label="Tips Visibility Duration (Seconds)"
                type="number"
                placeholder="10"
                error={errors.tipDurationSeconds?.message}
                required
                {...register('tipDurationSeconds')}
              />

              <Textarea
                label="Problem Description (Supports Markdown)"
                placeholder="Given an array of integers..."
                error={errors.description?.message}
                required
                style={{ minHeight: 120 }}
                {...register('description')}
              />

              <Textarea
                label="Input Format"
                placeholder="First line contains N..."
                error={errors.inputFormat?.message}
                required
                {...register('inputFormat')}
              />

              <Textarea
                label="Output Format"
                placeholder="Print the index sum..."
                error={errors.outputFormat?.message}
                required
                {...register('outputFormat')}
              />

              <Textarea
                label="Constraints"
                placeholder="1 <= N <= 10^5"
                error={errors.constraints?.message}
                required
                {...register('constraints')}
              />

              {/* Tips Section */}
              <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#eab308', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lightbulb size={16} /> Problem Tips ({tipFields.length})
                  </h4>
                  <Button type="button" size="sm" variant="secondary" onClick={() => appendTip({ text: '' })} leftIcon={<PlusCircle size={14} />}>
                    Add Tip
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '200px', overflowY: 'auto' }}>
                  {tipFields.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>No tips added yet. Click "Add Tip" to create tips for participants.</p>
                  ) : (
                    tipFields.map((field, index) => (
                      <div key={field.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <Input
                            placeholder={`Tip #${index + 1} e.g., Use Hash Map for O(N) lookup`}
                            {...register(`tips.${index}.text` as const)}
                            error={errors.tips?.[index]?.text?.message}
                          />
                        </div>
                        <button type="button" onClick={() => removeTip(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginTop: 10 }}>
                          <Trash size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Test Cases */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>Test Cases</h3>
                <Button type="button" size="sm" variant="secondary" onClick={() => append({ input: '', expectedOutput: '', isSample: false, isHidden: false, explanation: '' })} leftIcon={<PlusCircle size={14} />}>
                  Add Test Case
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '600px', overflowY: 'auto', paddingRight: 6 }}>
                {fields.map((field, index) => (
                  <div key={field.id} className="glass" style={{ borderRadius: 10, padding: 16, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#a855f7' }}>Test Case #{index + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Textarea
                        label="Input"
                        placeholder="1 2 3"
                        {...register(`testCases.${index}.input`)}
                        style={{ minHeight: 60 }}
                      />

                      <Textarea
                        label="Expected Output"
                        placeholder="6"
                        required
                        error={errors.testCases?.[index]?.expectedOutput?.message}
                        {...register(`testCases.${index}.expectedOutput`)}
                        style={{ minHeight: 60 }}
                      />

                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="checkbox" id={`tc-sample-${index}`} {...register(`testCases.${index}.isSample`)} />
                          <label htmlFor={`tc-sample-${index}`} style={{ fontSize: 12, cursor: 'pointer' }}>Is Sample (Visible)</label>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="checkbox" id={`tc-hidden-${index}`} {...register(`testCases.${index}.isHidden`)} />
                          <label htmlFor={`tc-hidden-${index}`} style={{ fontSize: 12, cursor: 'pointer' }}>Is Hidden</label>
                        </div>
                      </div>

                      <Input
                        label="Explanation (Optional)"
                        placeholder="Shown to user for samples"
                        {...register(`testCases.${index}.explanation`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, borderTop: '1px solid #1e1e1e', paddingTop: 16 }}>
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Problem</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Problem"
        message="Are you sure you want to delete this coding problem? This will permanently delete all candidate submissions and execution results associated with it."
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
