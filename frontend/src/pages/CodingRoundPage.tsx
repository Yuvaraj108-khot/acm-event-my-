import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Send, Clock, CheckCircle, XCircle, Loader2, Terminal,
  ChevronUp, ChevronDown, Lightbulb, History, BookOpen, FlaskConical,
  RotateCcw, Maximize2, Minimize2, AlignLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { codingService } from '@/services/codingService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DIFFICULTY_LABELS, SUBMISSION_STATUS_LABELS, ROUTES } from '@/constants';
import { formatSeconds, getErrorMessage } from '@/utils';
import type { CodingProblem, CodingLanguage, SubmissionResult, TestCaseResult, Round } from '@/types';
import { mcqService } from '@/services/mcqService';
import { ConfirmDialog } from '@/components/ui/Modal';
import { api } from '@/services/api';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const CodeEditor = lazyWithRetry(() => import('@/components/coding/CodeEditor').then((module) => ({ default: module.CodeEditor })));
const MarkdownContent = lazyWithRetry(() => import('@/components/coding/MarkdownContent').then((module) => ({ default: module.MarkdownContent })));

// ── Local Storage helpers ──────────────────────────────────────────────────────
const LS_KEY = (roundId: string, problemId: string, langSlug: string) =>
  `acm_code_${roundId}_${problemId}_${langSlug}`;

function saveCode(roundId: string, problemId: string, langSlug: string, code: string) {
  try { localStorage.setItem(LS_KEY(roundId, problemId, langSlug), code); } catch {}
}

function loadCode(roundId: string, problemId: string, langSlug: string): string | null {
  try { return localStorage.getItem(LS_KEY(roundId, problemId, langSlug)); } catch { return null; }
}

// ── Language icons (emoji fallback) ───────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  c: '#555555', cpp: '#f34b7d', java: '#b07219',
  python: '#3572A5', javascript: '#f1e05a', typescript: '#2b7489',
  go: '#00ADD8', rust: '#dea584', default: '#a855f7',
};

// ── Difficulty color ──────────────────────────────────────────────────────────
const DIFF_VARIANT: Record<string, 'green' | 'yellow' | 'red'> = {
  easy: 'green', medium: 'yellow', hard: 'red',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CodingRoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  // Data
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [languages, setLanguages] = useState<CodingLanguage[]>([]);
  const [selectedLang, setSelectedLang] = useState<CodingLanguage | null>(null);
  const [code, setCode] = useState('');
  const [round, setRound] = useState<Round | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingRound, setSubmittingRound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Left panel tabs
  const [leftTab, setLeftTab] = useState<'description' | 'hints' | 'submissions'>('description');

  // Results panel
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);
  const [outputHeight, setOutputHeight] = useState(240);
  const [customInput, setCustomInput] = useState('');
  const [customInputMode, setCustomInputMode] = useState(false);

  // Resizable left panel
  const [leftWidth, setLeftWidth] = useState(42); // percent
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // ── Resize handler ─────────────────────────────────────────────────────────
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current || !isDragging.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(65, Math.max(25, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roundId) return;
    Promise.all([
      codingService.getProblems(roundId),
      codingService.getLanguages(),
      api.get(`/rounds/${roundId}`).then(r => r.data),
      api.get(`/results/round/${roundId}/me`).then(r => r.data).catch(() => ({ data: null })),
    ]).then(([probs, langs, roundRes, resultRes]) => {
      const enabledLangs = langs.filter((l: CodingLanguage) => l.isEnabled);
      setProblems(probs);
      setLanguages(enabledLangs);

      const rData = roundRes.data;
      setRound(rData);
      setTimeLeft(rData?.durationMinutes ? rData.durationMinutes * 60 : 0);

      if (rData?.userStatus?.status === 'completed' || resultRes?.data) {
        setSubmitted(true);
      }

      if (probs.length > 0 && enabledLangs.length > 0) {
        const firstProblem = probs[0];
        const firstLang = enabledLangs[0];
        setSelectedProblem(firstProblem);
        setSelectedLang(firstLang);
        const saved = loadCode(roundId, firstProblem.id, firstLang.slug);
        setCode(saved ?? firstLang.starterCode);
      }
    }).catch(err => toast.error(getErrorMessage(err, 'Failed to load problems'))).finally(() => setLoading(false));
  }, [roundId]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleAutoFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft > 0]);

  const handleAutoFinish = async () => {
    if (!roundId) return;
    try {
      await mcqService.submitRound(roundId);
      setSubmitted(true);
      toast('⏱ Time\'s up! Round auto-submitted.', { icon: '🕐' });
    } catch {}
  };

  // ── Language change ────────────────────────────────────────────────────────
  const handleLanguageChange = (langId: string) => {
    const lang = languages.find(l => l.id === langId);
    if (!lang || !selectedProblem || !roundId) return;
    // Save current code
    if (selectedLang) saveCode(roundId, selectedProblem.id, selectedLang.slug, code);
    setSelectedLang(lang);
    const saved = loadCode(roundId, selectedProblem.id, lang.slug);
    setCode(saved ?? lang.starterCode);
    setResult(null);
  };

  // ── Problem change ─────────────────────────────────────────────────────────
  const handleProblemSelect = (p: CodingProblem) => {
    if (!roundId || !selectedLang) return;
    // Save current
    if (selectedProblem) saveCode(roundId, selectedProblem.id, selectedLang.slug, code);
    setSelectedProblem(p);
    const saved = loadCode(roundId, p.id, selectedLang.slug);
    setCode(saved ?? selectedLang.starterCode);
    setResult(null);
    setOutputOpen(false);
    setLeftTab('description');
  };

  // ── Code save on change (debounced) ───────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCodeChange = (val: string | undefined) => {
    const v = val ?? '';
    setCode(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (roundId && selectedProblem && selectedLang) {
        saveCode(roundId, selectedProblem.id, selectedLang.slug, v);
      }
    }, 800);
  };

  // ── Reset to starter code ─────────────────────────────────────────────────
  const handleReset = () => {
    if (!selectedLang) return;
    setCode(selectedLang.starterCode);
    toast('Reset to starter code', { icon: '↩️' });
  };

  // ── Run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!selectedProblem || !selectedLang || !roundId || running) return;
    setRunning(true);
    setOutputOpen(true);
    setResult(null);
    try {
      const res = await codingService.submitCode({
        problemId: selectedProblem.id,
        roundId,
        languageId: selectedLang.id,
        sourceCode: code,
        isRunOnly: true,
      });
      setResult(res);
    } catch {
      toast.error('Execution failed');
    } finally {
      setRunning(false);
    }
  };

  // ── Submit code ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedProblem || !selectedLang || !roundId || submitting) return;
    setSubmitting(true);
    setOutputOpen(true);
    setResult(null);
    try {
      const res = await codingService.submitCode({
        problemId: selectedProblem.id,
        roundId,
        languageId: selectedLang.id,
        sourceCode: code,
        isRunOnly: false,
      });
      setResult(res);
      // Load submissions
      loadSubmissions(selectedProblem.id);
      if (res.result.overallStatus === 'accepted') {
        toast.success('✅ All test cases passed!');
      } else {
        toast.error(`❌ ${res.result.overallStatus.replace(/_/g, ' ')}`);
      }
    } catch {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const loadSubmissions = async (problemId: string) => {
    try {
      const subs = await codingService.getSubmissions(problemId);
      setSubmissions(subs);
    } catch {}
  };

  // ── Finish round ──────────────────────────────────────────────────────────
  const handleFinishRound = async () => {
    if (!roundId || submittingRound) return;
    setSubmittingRound(true);
    try {
      await mcqService.submitRound(roundId);
      setSubmitted(true);
      toast.success('Coding round completed and submitted!');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to finish round'));
    } finally {
      setSubmittingRound(false);
      setShowFinishConfirm(false);
    }
  };

  // ── Timer color ───────────────────────────────────────────────────────────
  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : '#22c55e';

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading IDE...</p>
      </div>
    );
  }

  // ── Submitted screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass"
          style={{ borderRadius: 24, padding: 48, maxWidth: 520, width: '100%', textAlign: 'center' }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircle size={40} color="#22c55e" />
          </div>
          <h2 style={{ color: '#f5f5f5', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Round Submitted! 🎉</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
            Your solutions have been evaluated. Check the leaderboard to see your rank!
          </p>
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

  // ── Main IDE Layout ───────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d0d0d', overflow: 'hidden' }}>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div style={{
        height: 52, borderBottom: '1px solid #1a1a1a', background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0, gap: 12,
      }}>
        {/* Left: exit + problem tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-tertiary)',
              cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 6,
              transition: 'color 0.15s', flexShrink: 0,
            }}
          >
            ← Exit
          </button>

          <div style={{ width: 1, height: 20, background: '#222' }} />

          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {problems.map((p, i) => (
              <button
                key={p.id}
                onClick={() => handleProblemSelect(p)}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                  background: selectedProblem?.id === p.id ? 'rgba(168,85,247,0.15)' : 'transparent',
                  color: selectedProblem?.id === p.id ? '#c084fc' : 'var(--color-text-secondary)',
                  borderBottom: selectedProblem?.id === p.id ? '2px solid #a855f7' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {i + 1}. {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Center: timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          background: `${timerColor}18`, border: `1px solid ${timerColor}35`,
          borderRadius: 8, padding: '5px 14px',
          color: timerColor, fontFamily: 'JetBrains Mono, monospace',
          fontSize: 16, fontWeight: 700, letterSpacing: 1,
          transition: 'all 0.5s',
        }}>
          <Clock size={14} />
          {formatSeconds(timeLeft)}
        </div>

        {/* Right: finish */}
        <Button
          size="sm"
          onClick={() => setShowFinishConfirm(true)}
          rightIcon={<Send size={13} />}
          style={{ flexShrink: 0 }}
        >
          Finish Round
        </Button>
      </div>

      {/* ── Main Split ────────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Left Panel — Problem */}
        <div style={{ width: `${leftWidth}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', background: '#111', flexShrink: 0 }}>
            {([
              { id: 'description', label: 'Description', icon: <BookOpen size={13} /> },
              { id: 'hints', label: 'Hints', icon: <Lightbulb size={13} /> },
              { id: 'submissions', label: 'Submissions', icon: <History size={13} /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setLeftTab(tab.id);
                  if (tab.id === 'submissions' && selectedProblem) loadSubmissions(selectedProblem.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: leftTab === tab.id ? '#161616' : 'transparent',
                  color: leftTab === tab.id ? '#f5f5f5' : 'var(--color-text-tertiary)',
                  borderBottom: leftTab === tab.id ? '2px solid #a855f7' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <AnimatePresence mode="wait">
              {leftTab === 'description' && selectedProblem && (
                <motion.div key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {/* Title + badges */}
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#f5f5f5', lineHeight: 1.3 }}>
                      {selectedProblem.title}
                    </h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge variant={DIFF_VARIANT[selectedProblem.difficulty] ?? 'gray'}>
                        {selectedProblem.difficulty}
                      </Badge>
                      <Badge variant="gray">{parseFloat(selectedProblem.points)} pts</Badge>
                      <Badge variant="gray">⏱ {selectedProblem.timeLimitMs}ms</Badge>
                      <Badge variant="gray">💾 {selectedProblem.memoryLimitMb}MB</Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.75,
                    marginBottom: 24,
                  }}
                    className="prose"
                  >
                    <Suspense fallback={<p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Loading description...</p>}>
                      <MarkdownContent>{selectedProblem.description}</MarkdownContent>
                    </Suspense>
                  </div>

                  {/* Input format */}
                  {selectedProblem.inputFormat && (
                    <Section title="Input Format">
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                        {selectedProblem.inputFormat}
                      </p>
                    </Section>
                  )}

                  {/* Output format */}
                  {selectedProblem.outputFormat && (
                    <Section title="Output Format">
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                        {selectedProblem.outputFormat}
                      </p>
                    </Section>
                  )}

                  {/* Constraints */}
                  {selectedProblem.constraints && (
                    <Section title="Constraints">
                      <pre style={{
                        margin: 0, background: '#151515', border: '1px solid #222',
                        borderRadius: 8, padding: '12px 16px', fontSize: 13,
                        color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace',
                        whiteSpace: 'pre-wrap', lineHeight: 1.7,
                      }}>
                        {selectedProblem.constraints}
                      </pre>
                    </Section>
                  )}

                  {/* Sample test cases */}
                  {selectedProblem.testCases.filter(t => t.isSample).map((tc, i) => (
                    <Section key={tc.id} title={`Example ${i + 1}`}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <IOBlock label="Input" content={tc.input || '(none)'} />
                        <IOBlock label="Output" content={tc.expectedOutput} color="#22c55e" />
                      </div>
                      {tc.explanation && (
                        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: '#f5f5f5' }}>Explanation: </strong>{tc.explanation}
                        </p>
                      )}
                    </Section>
                  ))}

                  {/* Hidden test count */}
                  {selectedProblem.testCases.filter(t => !t.isSample).length > 0 && (
                    <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      + {selectedProblem.testCases.filter(t => !t.isSample).length} hidden test cases
                    </p>
                  )}
                </motion.div>
              )}

              {leftTab === 'hints' && selectedProblem && (
                <motion.div key="hints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <Lightbulb size={20} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f5f5f5' }}>Hints & Strategy</h3>
                  </div>

                  {(selectedProblem as any).hints ? (
                    <div style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                      <Suspense fallback={<p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Loading hints...</p>}>
                        <MarkdownContent>{(selectedProblem as any).hints}</MarkdownContent>
                      </Suspense>
                    </div>
                  ) : (
                    <>
                      {/* Auto-generated approach hints from problem data */}
                      <HintCard number={1} title="Read the problem carefully">
                        Break down the input format and constraints before writing code. Pay attention to edge cases like empty input, single elements, or boundary values.
                      </HintCard>
                      <HintCard number={2} title="Start with the brute force">
                        Write a correct O(n²) or O(n³) solution first, then optimize. This ensures you understand the problem completely before thinking about optimization.
                      </HintCard>
                      {selectedProblem.constraints && selectedProblem.constraints.includes('10^') && (
                        <HintCard number={3} title="Consider time complexity">
                          The constraints suggest you need an efficient solution. Look for patterns that allow O(n log n) or O(n) approaches — sorting, hashing, or binary search might help.
                        </HintCard>
                      )}
                      <HintCard number={selectedProblem.constraints?.includes('10^') ? 4 : 3} title="Test on the examples first">
                        Before submitting, trace through each sample test case manually with your code to verify correctness.
                      </HintCard>
                    </>
                  )}
                </motion.div>
              )}

              {leftTab === 'submissions' && (
                <motion.div key="subs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#f5f5f5' }}>My Submissions</h3>
                  {submissions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <History size={36} color="#333" style={{ marginBottom: 12 }} />
                      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14, margin: 0 }}>
                        No submissions yet for this problem
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {submissions.map((sub, i) => {
                        const isAC = sub.status === 'accepted';
                        return (
                          <div key={sub.id ?? i} className="glass" style={{
                            borderRadius: 10, padding: '12px 16px',
                            border: `1px solid ${isAC ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {isAC
                                ? <CheckCircle size={16} color="#22c55e" />
                                : <XCircle size={16} color="#ef4444" />}
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isAC ? '#4ade80' : '#f87171' }}>
                                  {sub.status?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                                  {sub.testCasesPassed}/{sub.totalTestCases} passed · {sub.executionTimeMs}ms
                                </p>
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>
                              {sub.submittedAt
                                ? new Date(sub.submittedAt?.toDate?.() ?? sub.submittedAt).toLocaleTimeString()
                                : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Drag Divider ────────────────────────────────────────────────── */}
        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            width: 4, background: '#1a1a1a', cursor: 'col-resize', flexShrink: 0,
            transition: 'background 0.15s', zIndex: 10,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#a855f7')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
        />

        {/* ── Right Panel — Editor + Output ───────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Editor toolbar */}
          <div style={{
            height: 46, borderBottom: '1px solid #1a1a1a', background: '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', flexShrink: 0, gap: 10,
          }}>
            {/* Language selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedLang && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: LANG_COLORS[selectedLang.slug] ?? LANG_COLORS.default,
                  flexShrink: 0,
                }} />
              )}
              <select
                value={selectedLang?.id ?? ''}
                onChange={e => handleLanguageChange(e.target.value)}
                style={{
                  background: '#1a1a1a', border: '1px solid #252525', color: '#f5f5f5',
                  borderRadius: 7, padding: '5px 28px 5px 10px', fontSize: 13,
                  cursor: 'pointer', fontWeight: 500,
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                {languages.map(l => (
                  <option key={l.id} value={l.id}>{l.name} {l.version ? `(${l.version})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={handleReset}
                title="Reset to starter code"
                style={{
                  background: 'none', border: '1px solid #252525', color: 'var(--color-text-tertiary)',
                  borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f5f5f5'; e.currentTarget.style.borderColor = '#444'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; e.currentTarget.style.borderColor = '#252525'; }}
              >
                <RotateCcw size={13} />
              </button>

              <Button
                variant="secondary"
                size="sm"
                loading={running}
                onClick={handleRun}
                leftIcon={running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              >
                Run
              </Button>

              <Button
                size="sm"
                loading={submitting}
                onClick={handleSubmit}
                leftIcon={submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              >
                Submit
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <Suspense
              fallback={
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                  Loading editor...
                </div>
              }
            >
              <CodeEditor
                language={selectedLang?.monacoLanguage ?? 'plaintext'}
                value={code}
                onChange={handleCodeChange}
              />
            </Suspense>
          </div>

          {/* ── Output Panel ──────────────────────────────────────────────── */}
          <div style={{
            borderTop: '1px solid #1a1a1a',
            background: '#0f0f0f',
            display: 'flex', flexDirection: 'column',
            height: outputOpen ? outputHeight : 40,
            transition: 'height 0.25s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {/* Output header */}
            <div
              onClick={() => setOutputOpen(o => !o)}
              style={{
                height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 14px', cursor: 'pointer', borderBottom: outputOpen ? '1px solid #1a1a1a' : 'none',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={13} color="var(--color-text-tertiary)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  Output
                </span>
                {result && !running && !submitting && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: result.result.overallStatus === 'accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: result.result.overallStatus === 'accepted' ? '#4ade80' : '#f87171',
                    border: `1px solid ${result.result.overallStatus === 'accepted' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    {result.result.overallStatus === 'accepted' ? '✓ Accepted' : result.result.overallStatus.replace(/_/g, ' ')}
                  </span>
                )}
                {(running || submitting) && (
                  <span style={{ fontSize: 12, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={11} className="animate-spin" /> {running ? 'Running...' : 'Judging...'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-tertiary)' }}>
                {outputOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
            </div>

            {/* Output content */}
            {outputOpen && (
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {!result && !running && !submitting && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                    Run or submit your code to see output here
                  </p>
                )}

                {(running || submitting) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    {running ? 'Executing against sample test cases...' : 'Judging against all test cases...'}
                  </div>
                )}

                {result && !running && !submitting && (
                  result.result.compilationError ? (
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#f87171' }}>
                        ⚠ Compilation Error
                      </p>
                      <pre style={{
                        background: '#150a0a', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8, padding: 14, fontSize: 12.5,
                        color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace',
                        overflow: 'auto', margin: 0, lineHeight: 1.6,
                      }}>
                        {result.result.compilationError}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      {/* Summary */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {result.result.totalPassed}/{result.result.totalTests} test cases passed
                        </span>
                      </div>

                      {/* Test case tabs */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {result.result.testResults.map((tr: TestCaseResult, i: number) => (
                          <TestResultChip key={tr.testCaseId} index={i} result={tr} />
                        ))}
                      </div>

                      {/* Failed details */}
                      {result.result.testResults.filter(tr => !tr.passed).map((tr, i) => (
                        <div key={tr.testCaseId + '_detail'} style={{ marginTop: 14 }}>
                          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                            ✗ Test {result.result.testResults.indexOf(tr) + 1} — {tr.status.replace(/_/g, ' ')} ({tr.executionTimeMs}ms)
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <IOBlock label="Expected" content={tr.expectedOutput} color="#22c55e" small />
                            <IOBlock label="Got" content={tr.actualOutput || tr.errorMessage || '(empty)'} color="#f87171" small />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finish confirm dialog */}
      <ConfirmDialog
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={handleFinishRound}
        title="Finish Coding Round"
        message="Are you sure you want to finish and submit this coding round? All your saved solutions will be evaluated and finalized."
        confirmLabel="Finish & Submit"
        loading={submittingRound}
      />
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22, marginBottom: 4 }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#f5f5f5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function IOBlock({
  label, content, color = '#e2e8f0', small = false
}: { label: string; content: string; color?: string; small?: boolean }) {
  return (
    <div>
      <p style={{ margin: '0 0 5px', fontSize: small ? 10 : 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
        {label}
      </p>
      <pre style={{
        margin: 0, background: '#141414', border: '1px solid #222',
        borderRadius: 8, padding: small ? '8px 12px' : '12px 14px',
        fontSize: small ? 12 : 13, color, fontFamily: 'JetBrains Mono, monospace',
        overflow: 'auto', lineHeight: 1.6, maxHeight: small ? 80 : 140,
      }}>
        {content}
      </pre>
    </div>
  );
}

function HintCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="glass"
      style={{ borderRadius: 12, marginBottom: 12, overflow: 'hidden', border: '1px solid #222' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 16px', color: '#f5f5f5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {number}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        </div>
        {open ? <ChevronUp size={14} color="var(--color-text-tertiary)" /> : <ChevronDown size={14} color="var(--color-text-tertiary)" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p style={{ margin: '0 0 14px', padding: '0 16px 14px 52px', fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.7, borderTop: '1px solid #1a1a1a' }}>
              {children}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TestResultChip({ index, result }: { index: number; result: TestCaseResult }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
      background: result.passed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color: result.passed ? '#4ade80' : '#f87171',
      border: `1px solid ${result.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      {result.passed ? <CheckCircle size={11} /> : <XCircle size={11} />}
      Test {index + 1}
    </div>
  );
}
