import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, CheckCircle, Settings, HelpCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { mcqService } from '@/services/mcqService';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DIFFICULTY_LABELS } from '@/constants';
import type { MCQQuestion } from '@/types';
import { getErrorMessage } from '@/utils';

const questionFormSchema = z.object({
  questionText: z.string().min(5, 'Question must be at least 5 characters'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  points: z.string().regex(/^\d+(\.\d+)?$/, 'Points must be a decimal number'),
  explanation: z.string().optional(),
  options: z.array(z.object({
    optionText: z.string().min(1, 'Option text cannot be empty'),
    isCorrect: z.boolean(),
  })).min(2, 'Must have at least 2 options'),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function AdminMCQPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      questionText: '', difficulty: 'easy', points: '5', explanation: '',
      options: [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  const loadQuestions = () => {
    if (!roundId) return;
    setLoading(true);
    mcqService.getQuestions(roundId)
      .then(setQuestions)
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuestions(); }, [roundId]);

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    reset({
      questionText: '', difficulty: 'easy', points: '5', explanation: '',
      options: [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (q: MCQQuestion) => {
    setEditingQuestion(q);
    reset({
      questionText: q.questionText,
      difficulty: q.difficulty,
      points: q.points,
      explanation: q.explanation || '',
      options: q.options.map(opt => ({
        optionText: opt.optionText,
        isCorrect: !!opt.isCorrect,
      })),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: QuestionFormValues) => {
    if (!roundId) return;

    // Check if at least one option is correct
    const hasCorrect = data.options.some(o => o.isCorrect);
    if (!hasCorrect) {
      toast.error('At least one option must be marked as correct');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...data,
        roundId,
        points: Number(data.points),
      };

      if (editingQuestion) {
        await mcqService.updateQuestion(editingQuestion.id, payload as any);
        toast.success('Question updated');
      } else {
        await mcqService.createQuestion(payload as any);
        toast.success('Question added');
      }
      setModalOpen(false);
      loadQuestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Save failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await mcqService.deleteQuestion(deletingId);
      toast.success('Question deleted');
      setConfirmOpen(false);
      loadQuestions();
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const handleSetCorrectOnly = (idx: number) => {
    // Helper to enforce single-choice behavior in UI
    fields.forEach((_, i) => {
      setValue(`options.${i}.isCorrect`, i === idx);
    });
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
            Manage MCQ Questions
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Add, edit, and configure multiple choice questions for this quiz round
          </p>
        </div>
        <Button onClick={handleOpenAdd} leftIcon={<Plus size={16} />}>
          Add Question
        </Button>
      </div>

      {/* Questions list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : questions.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <HelpCircle size={40} color="#333" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>No questions yet</h3>
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 16 }}>Get started by adding your first MCQ question.</p>
          <Button onClick={handleOpenAdd} size="sm">Add Question</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass"
              style={{ borderRadius: 16, padding: 24 }}
            >
              {/* Question header info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Q{idx + 1}</span>
                  <Badge variant={DIFFICULTY_LABELS[q.difficulty]?.color?.replace('badge-', '') as any}>{q.difficulty}</Badge>
                  <Badge variant="gray">{parseFloat(q.points).toFixed(0)} pts</Badge>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(q)} leftIcon={<Edit2 size={13} />} />
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(q.id)} leftIcon={<Trash2 size={13} />} className="hover:text-red-500" />
                </div>
              </div>

              {/* Text */}
              <p style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 500, color: '#f5f5f5', lineHeight: 1.6 }}>{q.questionText}</p>

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {q.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <div
                      key={opt.id}
                      style={{
                        padding: '12px 16px', borderRadius: 10,
                        background: opt.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${opt.isCorrect ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: opt.isCorrect ? 'rgba(34,197,94,0.2)' : '#2a2a2a',
                        color: opt.isCorrect ? '#22c55e' : 'var(--color-text-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                      }}>
                        {opt.isCorrect ? '✓' : letter}
                      </div>
                      <span style={{ fontSize: 14, color: opt.isCorrect ? '#4ade80' : 'var(--color-text-secondary)', fontWeight: opt.isCorrect ? 500 : 400 }}>
                        {opt.optionText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--color-border)', borderRadius: '0 8px 8px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingQuestion ? 'Edit Question' : 'Add Question'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Textarea
              label="Question Text"
              placeholder="What is the time complexity of lookup in a balanced binary search tree?"
              error={errors.questionText?.message}
              required
              {...register('questionText')}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                placeholder="5"
                error={errors.points?.message}
                required
                {...register('points')}
              />
            </div>

            <Textarea
              label="Explanation (Optional)"
              placeholder="Provide context for why the correct answer is right..."
              error={errors.explanation?.message}
              {...register('explanation')}
            />

            {/* Options manager */}
            <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Options</span>
                {fields.length < 6 && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => append({ optionText: '', isCorrect: false })}>
                    Add Option
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fields.map((field, index) => (
                  <div key={field.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="correct-option-radio"
                      checked={watch(`options.${index}.isCorrect`)}
                      onChange={() => handleSetCorrectOnly(index)}
                      style={{ cursor: 'pointer', width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1 }}>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        error={errors.options?.[index]?.optionText?.message}
                        required
                        {...register(`options.${index}.optionText`)}
                      />
                    </div>
                    {fields.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} style={{ padding: 8, color: '#ef4444' }}>
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" loading={submitting}>Save Question</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Question"
        message="Are you sure you want to delete this MCQ question? This will permanently delete any answers submitted by participants for this question."
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
