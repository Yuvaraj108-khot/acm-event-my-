import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { mcqService } from '@/services/mcqService';
import { competitionService } from '@/services/competitionService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatSeconds } from '@/utils';
import type { MCQQuestion, Round } from '@/types';
import { ConfirmDialog } from '@/components/ui/Modal';

export default function MCQRoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [round, setRound] = useState<Round | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { selectedOptionId: string | null; isMarkedForReview: boolean }>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<{ totalScore: number; questionsAttempted?: number; questionsCorrect?: number } | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roundId) return;
    Promise.all([
      mcqService.getQuestions(roundId),
      fetch(`/api/rounds/${roundId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()),
      fetch(`/api/results/round/${roundId}/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()).catch(() => ({ data: null })),
    ]).then(([qs, roundRes, resultRes]) => {
      setQuestions(qs);
      const initialAnswers = new Map<string, { selectedOptionId: string | null; isMarkedForReview: boolean }>();
      qs.forEach(q => {
        initialAnswers.set(q.id, {
          selectedOptionId: q.userAnswer?.selectedOptionId ?? null,
          isMarkedForReview: q.userAnswer?.isMarkedForReview ?? false,
        });
      });
      setAnswers(initialAnswers);

      const rData = roundRes.data;
      setRound(rData);
      setTimeLeft(rData?.durationMinutes ? rData.durationMinutes * 60 : 0);

      // Check if already completed
      if (rData?.userStatus?.status === 'completed' || resultRes?.data) {
        setSubmitted(true);
        if (resultRes?.data) {
          setScoreInfo({
            totalScore: parseFloat(resultRes.data.totalScore || '0'),
            questionsAttempted: resultRes.data.questionsAttempted,
            questionsCorrect: resultRes.data.questionsCorrect,
          });
        } else if (rData?.userStatus?.score) {
          setScoreInfo({ totalScore: parseFloat(rData.userStatus.score || '0') });
        }
      }
    }).catch(() => {
      toast.error('Failed to load round details');
    }).finally(() => setLoading(false));
  }, [roundId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (!submitted && answers.size > 0) saveCurrentAnswer(false);
    }, 30000);
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current); };
  }, [answers, submitted]);

  const saveCurrentAnswer = useCallback(async (showToast = false) => {
    if (!roundId || submitted) return;
    const q = questions[currentIdx];
    if (!q) return;
    const answer = answers.get(q.id);
    if (!answer) return;
    setAutoSaving(true);
    try {
      await mcqService.saveAnswer({ roundId, questionId: q.id, ...answer });
      if (showToast) toast.success('Answer saved', { duration: 1000 });
    } catch {} finally {
      setAutoSaving(false);
    }
  }, [roundId, currentIdx, questions, answers, submitted]);

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (submitted) return;
    const current = answers.get(questionId) || { selectedOptionId: null, isMarkedForReview: false };
    const newAnswer = { ...current, selectedOptionId: optionId };
    setAnswers(prev => new Map(prev).set(questionId, newAnswer));

    // Save immediately on selection
    if (roundId) {
      try {
        await mcqService.saveAnswer({ roundId, questionId, ...newAnswer });
      } catch {}
    }
  };

  const toggleReview = () => {
    const q = questions[currentIdx];
    if (!q || submitted) return;
    const current = answers.get(q.id) || { selectedOptionId: null, isMarkedForReview: false };
    const newAnswer = { ...current, isMarkedForReview: !current.isMarkedForReview };
    setAnswers(prev => new Map(prev).set(q.id, newAnswer));
  };

  const handleSubmit = async () => {
    if (!roundId || submitting || submitted) return;
    setSubmitting(true);
    try {
      const result = await mcqService.submitRound(roundId);
      setSubmitted(true);
      setScoreInfo({
        totalScore: result.totalScore,
        questionsAttempted: result.questionsAttempted,
        questionsCorrect: result.questionsCorrect,
      });
      toast.success(`Round submitted! Score: ${result.totalScore.toFixed(2)} pts`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast('⏰ Time\'s up! Auto-submitting...', { icon: '⏱' });
    await handleSubmit();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answered = Array.from(answers.values()).filter(a => a.selectedOptionId).length;
  const markedForReview = Array.from(answers.values()).filter(a => a.isMarkedForReview).length;
  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : '#22c55e';

  const getQuestionStatus = (q: MCQQuestion) => {
    const ans = answers.get(q.id);
    if (ans?.isMarkedForReview) return 'review';
    if (ans?.selectedOptionId) return 'answered';
    return 'unanswered';
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass"
          style={{ borderRadius: 24, padding: 40, maxWidth: 520, width: '100%', textAlign: 'center' }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={36} color="#22c55e" />
          </div>

          <h2 style={{ color: '#f5f5f5', fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Round Completed!</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: '0 0 24px' }}>
            Your test has been successfully submitted and recorded.
          </p>

          {/* Score box */}
          <div style={{
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
            borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Score</p>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#a855f7' }}>
              {scoreInfo ? scoreInfo.totalScore.toFixed(2) : '0.00'}{' '}
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                / {round?.maxPoints ? parseFloat(round.maxPoints).toFixed(0) : '100'} pts
              </span>
            </div>

            {(scoreInfo?.questionsAttempted !== undefined || scoreInfo?.questionsCorrect !== undefined) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>Attempted</p>
                  <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>
                    {scoreInfo.questionsAttempted ?? 0} / {questions.length}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>Correct</p>
                  <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: '#22c55e' }}>
                    {scoreInfo.questionsCorrect ?? 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {round?.competitionId && (
              <Button onClick={() => navigate(`/leaderboard/${round.competitionId}`)} style={{ width: '100%' }}>
                View Leaderboard 🏆
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid #1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#111', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>{round?.title || 'MCQ Round'}</h1>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <span>{answered}/{questions.length} answered</span>
            {markedForReview > 0 && <span style={{ color: '#f59e0b' }}>{markedForReview} for review</span>}
            {autoSaving && <span style={{ color: '#a855f7' }}>Saving...</span>}
          </div>
        </div>

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: `${timerColor}18`, border: `1px solid ${timerColor}40`,
          borderRadius: 10, padding: '8px 16px',
          color: timerColor, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22,
        }}>
          <Clock size={18} />
          {formatSeconds(timeLeft)}
        </div>

        <Button onClick={() => setShowConfirm(true)} rightIcon={<Send size={15} />}>
          Submit Round
        </Button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Question navigator (left panel) */}
        <div style={{
          width: 200, borderRight: '1px solid #1e1e1e', padding: 16,
          background: '#0f0f0f', overflow: 'auto', flexShrink: 0,
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Questions
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {questions.map((q, i) => {
              const status = getQuestionStatus(q);
              const isCurrent = i === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: `2px solid ${isCurrent ? '#a855f7' : status === 'answered' ? '#22c55e' : status === 'review' ? '#f59e0b' : '#2a2a2a'}`,
                    background: isCurrent ? 'rgba(168,85,247,0.15)' : status === 'answered' ? 'rgba(34,197,94,0.08)' : status === 'review' ? 'rgba(245,158,11,0.08)' : '#111',
                    color: isCurrent ? '#a855f7' : status === 'answered' ? '#22c55e' : status === 'review' ? '#f59e0b' : 'var(--color-text-tertiary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {[
              { color: '#22c55e', label: 'Answered' },
              { color: '#f59e0b', label: 'Review' },
              { color: '#2a2a2a', label: 'Not answered' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${color}`, background: `${color}18` }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Question area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
          {currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Question {currentIdx + 1} of {questions.length}</span>
                    <Badge variant={currentQuestion.difficulty === 'easy' ? 'green' : currentQuestion.difficulty === 'medium' ? 'yellow' : 'red'}>
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="gray">{parseFloat(currentQuestion.points)} pts</Badge>
                  </div>
                  <button
                    onClick={toggleReview}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 8, border: '1px solid',
                      borderColor: answers.get(currentQuestion.id)?.isMarkedForReview ? '#f59e0b' : '#2a2a2a',
                      background: answers.get(currentQuestion.id)?.isMarkedForReview ? 'rgba(245,158,11,0.1)' : 'transparent',
                      color: answers.get(currentQuestion.id)?.isMarkedForReview ? '#f59e0b' : 'var(--color-text-tertiary)',
                      cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    }}
                  >
                    <Flag size={13} />
                    {answers.get(currentQuestion.id)?.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                {/* Question text */}
                <div className="glass" style={{ borderRadius: 14, padding: 28, marginBottom: 24 }}>
                  <p style={{ margin: 0, fontSize: 17, color: '#f5f5f5', lineHeight: 1.7, fontWeight: 500 }}>
                    {currentQuestion.questionText}
                  </p>
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {currentQuestion.options.map((option, i) => {
                    const selected = answers.get(currentQuestion.id)?.selectedOptionId === option.id;
                    const letter = String.fromCharCode(65 + i);
                    return (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '16px 20px',
                          borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${selected ? '#a855f7' : '#2a2a2a'}`,
                          background: selected ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                          color: selected ? '#a855f7' : '#f5f5f5',
                          fontSize: 15, fontWeight: selected ? 500 : 400,
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: selected ? 'rgba(168,85,247,0.2)' : '#2a2a2a',
                          color: selected ? '#a855f7' : 'var(--color-text-tertiary)',
                          fontSize: 13, fontWeight: 700,
                        }}>
                          {selected ? <CheckCircle size={16} /> : letter}
                        </div>
                        {option.optionText}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div style={{
        padding: '12px 24px', borderTop: '1px solid #1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#111', flexShrink: 0,
      }}>
        <Button
          variant="secondary"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(i => i - 1)}
          leftIcon={<ChevronLeft size={16} />}
        >
          Previous
        </Button>

        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          {currentIdx + 1} / {questions.length}
        </span>

        {currentIdx < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIdx(i => i + 1)}
            rightIcon={<ChevronRight size={16} />}
          >
            Next
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} rightIcon={<Send size={16} />}>
            Submit
          </Button>
        )}
      </div>

      {/* Confirm submit dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="Submit Round"
        message={`You've answered ${answered} of ${questions.length} questions. ${questions.length - answered > 0 ? `${questions.length - answered} unanswered question(s) will receive no marks.` : ''} Are you sure you want to submit?`}
        confirmLabel="Submit"
        loading={submitting}
      />
    </div>
  );
}
