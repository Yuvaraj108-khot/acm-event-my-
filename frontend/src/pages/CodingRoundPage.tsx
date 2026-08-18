import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Send, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader, Terminal, Code2, Lightbulb } from 'lucide-react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { codingService } from '@/services/codingService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DIFFICULTY_LABELS, SUBMISSION_STATUS_LABELS, ROUTES } from '@/constants';
import { formatSeconds } from '@/utils';
import type { CodingProblem, CodingLanguage, SubmissionResult, TestCaseResult, Round } from '@/types';
import { mcqService } from '@/services/mcqService';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CodingRoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [languages, setLanguages] = useState<CodingLanguage[]>([]);
  const [selectedLang, setSelectedLang] = useState<CodingLanguage | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingRound, setSubmittingRound] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'testcases' | 'results'>('description');
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Tips states
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [tipCountdown, setTipCountdown] = useState(0);
  const tipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCloseTips = () => {
    if (tipTimerRef.current) {
      clearInterval(tipTimerRef.current);
      tipTimerRef.current = null;
    }
    setShowTipsModal(false);
  };

  const handleOpenTips = () => {
    if (!selectedProblem) return;
    const tipsList = selectedProblem.tips || [];
    if (tipsList.length === 0) {
      toast.error('No tips provided for this problem.');
      return;
    }

    if (tipTimerRef.current) {
      clearInterval(tipTimerRef.current);
    }

    const duration = selectedProblem.tipDurationSeconds ?? 10;
    setTipCountdown(duration);
    setShowTipsModal(true);

    tipTimerRef.current = setInterval(() => {
      setTipCountdown((prev) => {
        if (prev <= 1) {
          if (tipTimerRef.current) clearInterval(tipTimerRef.current);
          setShowTipsModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (tipTimerRef.current) clearInterval(tipTimerRef.current);
    };
  }, []);

  // Code map per problem & language
  const [userCodeMap, setUserCodeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!roundId) return;

    const storageKey = `coding_code_${roundId}`;
    let savedMap: Record<string, string> = {};
    try {
      savedMap = JSON.parse(localStorage.getItem(storageKey) || '{}');
      setUserCodeMap(savedMap);
    } catch {}

    Promise.all([
      codingService.getProblems(roundId),
      codingService.getLanguages(),
      fetch(`/api/rounds/${roundId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()),
      fetch(`/api/results/round/${roundId}/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()).catch(() => ({ data: null })),
    ]).then(([probs, langs, roundRes, resultRes]) => {
      setProblems(probs);
      const enabledLangs = langs.filter((l: CodingLanguage) => l.isEnabled);
      setLanguages(enabledLangs);

      const firstProb = probs.length > 0 ? probs[0] : null;
      const firstLang = enabledLangs.length > 0 ? enabledLangs[0] : null;

      if (firstProb) setSelectedProblem(firstProb);
      if (firstLang) setSelectedLang(firstLang);

      if (firstProb && firstLang) {
        const initialKey = `${firstProb.id}_${firstLang.id}`;
        setCode(savedMap[initialKey] ?? firstLang.starterCode);
      }

      const rData = roundRes.data;
      setRound(rData);
      setTimeLeft(rData?.durationMinutes ? rData.durationMinutes * 60 : 0);

      if (rData?.userStatus?.status === 'completed' || resultRes?.data) {
        setSubmitted(true);
      }
    }).catch(() => toast.error('Failed to load problems')).finally(() => setLoading(false));
  }, [roundId]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t: number) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCodeChange = (val: string) => {
    setCode(val);
    if (selectedProblem && selectedLang) {
      const key = `${selectedProblem.id}_${selectedLang.id}`;
      const newMap = { ...userCodeMap, [key]: val };
      setUserCodeMap(newMap);
      if (roundId) {
        try {
          localStorage.setItem(`coding_code_${roundId}`, JSON.stringify(newMap));
        } catch {}
      }
    }
  };

  const handleSelectProblem = (p: CodingProblem) => {
    if (selectedProblem?.id === p.id) return;
    
    // Save current code to map
    if (selectedProblem && selectedLang) {
      const currentKey = `${selectedProblem.id}_${selectedLang.id}`;
      userCodeMap[currentKey] = code;
    }

    setSelectedProblem(p);
    setResult(null);

    if (selectedLang) {
      const nextKey = `${p.id}_${selectedLang.id}`;
      setCode(userCodeMap[nextKey] ?? selectedLang.starterCode);
    }
  };

  const handleLanguageChange = (langId: string) => {
    const lang = languages.find((l: CodingLanguage) => l.id === langId);
    if (!lang || !selectedProblem) return;

    // Save current code to map
    if (selectedLang) {
      const currentKey = `${selectedProblem.id}_${selectedLang.id}`;
      userCodeMap[currentKey] = code;
    }

    setSelectedLang(lang);
    setResult(null);

    const nextKey = `${selectedProblem.id}_${lang.id}`;
    setCode(userCodeMap[nextKey] ?? lang.starterCode);
  };

  const handleRun = async () => {
    if (!selectedProblem || !selectedLang || !roundId || running) return;
    setRunning(true);
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
      setActiveTab('results');
    } catch (err) {
      toast.error('Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem || !selectedLang || !roundId || submitting) return;
    setSubmitting(true);
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
      setActiveTab('results');
      if (res.result.overallStatus === 'accepted') {
        toast.success('✅ All test cases passed!');
      } else {
        toast.error(`❌ ${res.result.overallStatus.replace(/_/g, ' ')}`);
      }
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishRound = async () => {
    if (!roundId || submittingRound) return;
    setSubmittingRound(true);
    try {
      await mcqService.submitRound(roundId);
      setSubmitted(true);
      authService.getMe().then(res => {
        if (res.user && res.profile) {
          useAuthStore.getState().setUser(res.user);
          useAuthStore.getState().setProfile(res.profile);
        }
      }).catch(() => {});
      toast.success('Coding round completed and submitted!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to finish round');
    } finally {
      setSubmittingRound(false);
      setShowFinishConfirm(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

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
            Your coding submissions have been evaluated and recorded.
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

  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        height: 52, borderBottom: '1px solid #1e1e1e', background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: 13 }}>
            ← Exit
          </button>
          {/* Problem selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            {problems.map((p: CodingProblem, i: number) => (
              <button
                key={p.id}
                onClick={() => handleSelectProblem(p)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: selectedProblem?.id === p.id ? 'rgba(168,85,247,0.15)' : 'transparent',
                  color: selectedProblem?.id === p.id ? '#a855f7' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {i + 1}. {p.title}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: `${timerColor}18`, border: `1px solid ${timerColor}40`,
            borderRadius: 8, padding: '5px 12px', color: timerColor,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
          }}>
            <Clock size={14} />{formatSeconds(timeLeft)}
          </div>
          <Button size="sm" onClick={() => setShowFinishConfirm(true)} rightIcon={<Send size={13} />}>
            Finish Round
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Problem */}
        <div style={{ width: '40%', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
            {(['description', 'testcases', 'results'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: activeTab === tab ? '#1a1a1a' : 'transparent',
                  color: activeTab === tab ? '#f5f5f5' : 'var(--color-text-tertiary)',
                  borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'results' && result && (
                  <span style={{
                    marginLeft: 6, width: 6, height: 6, borderRadius: '50%',
                    background: result.result.overallStatus === 'accepted' ? '#22c55e' : '#ef4444',
                    display: 'inline-block',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {activeTab === 'description' && selectedProblem && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#f5f5f5' }}>
                      {selectedProblem.title}
                    </h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge variant={DIFFICULTY_LABELS[selectedProblem.difficulty]?.color?.replace('badge-', '') as 'green' | 'yellow' | 'red'}>
                        {selectedProblem.difficulty}
                      </Badge>
                      <Badge variant="gray">{parseFloat(selectedProblem.points)} pts</Badge>
                      <Badge variant="gray">Time: {selectedProblem.timeLimitMs}ms</Badge>
                      <Badge variant="gray">Mem: {selectedProblem.memoryLimitMb}MB</Badge>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleOpenTips}
                    leftIcon={<Lightbulb size={15} color="#eab308" />}
                    style={{
                      background: 'rgba(234, 179, 8, 0.12)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      color: '#fef08a',
                    }}
                  >
                    Tips {selectedProblem.tips && selectedProblem.tips.length > 0 ? `(${selectedProblem.tips.length})` : ''}
                  </Button>
                </div>

                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedProblem.description}</ReactMarkdown>
                </div>

                {selectedProblem.inputFormat && (
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ color: '#f5f5f5', marginBottom: 8 }}>Input Format</h4>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{selectedProblem.inputFormat}</p>
                  </div>
                )}
                {selectedProblem.outputFormat && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ color: '#f5f5f5', marginBottom: 8 }}>Output Format</h4>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{selectedProblem.outputFormat}</p>
                  </div>
                )}
                {selectedProblem.constraints && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ color: '#f5f5f5', marginBottom: 8 }}>Constraints</h4>
                    <pre style={{ color: '#f59e0b', fontSize: 13, background: '#1a1a1a', padding: 12, borderRadius: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                      {selectedProblem.constraints}
                    </pre>
                  </div>
                )}

                {/* Sample test cases */}
                {selectedProblem.testCases.filter((t: any) => t.isSample).map((tc: any, i: number) => (
                  <div key={tc.id} style={{ marginTop: 20 }}>
                    <h4 style={{ color: '#f5f5f5', marginBottom: 10 }}>Example {i + 1}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Input</p>
                        <pre style={{ margin: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, fontSize: 13, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', overflow: 'auto' }}>
                          {tc.input || '(none)'}
                        </pre>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Output</p>
                        <pre style={{ margin: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, fontSize: 13, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', overflow: 'auto' }}>
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                    {tc.explanation && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        <strong>Explanation:</strong> {tc.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'testcases' && selectedProblem && (
              <div>
                <h3 style={{ color: '#f5f5f5', marginBottom: 16 }}>Sample Test Cases</h3>
                {selectedProblem.testCases.filter((t: any) => t.isSample).map((tc: any, i: number) => (
                  <div key={tc.id} className="glass" style={{ borderRadius: 10, padding: 16, marginBottom: 12 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#a855f7', fontWeight: 600 }}>Test Case {i + 1}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-muted)' }}>INPUT</p>
                        <pre style={{ margin: 0, background: '#1a1a1a', borderRadius: 6, padding: 10, fontSize: 12, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>
                          {tc.input || '(empty)'}
                        </pre>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-muted)' }}>EXPECTED</p>
                        <pre style={{ margin: 0, background: '#1a1a1a', borderRadius: 6, padding: 10, fontSize: 12, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedProblem.testCases.filter((t: any) => !t.isSample).length > 0 && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 16 }}>
                    + {selectedProblem.testCases.filter((t: any) => !t.isSample).length} hidden test cases
                  </p>
                )}
              </div>
            )}

            {activeTab === 'results' && result && (
              <div>
                {result.result.compilationError ? (
                  <div>
                    <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Compilation Error</h3>
                    <pre style={{ background: '#1a0000', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 16, fontSize: 12, color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace', overflow: 'auto' }}>
                      {result.result.compilationError}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <Badge variant={result.result.overallStatus === 'accepted' ? 'green' : 'red'}>
                          {result.result.overallStatus === 'accepted' ? '✅ Accepted' : `❌ ${result.result.overallStatus.replace(/_/g, ' ')}`}
                        </Badge>
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {result.result.totalPassed} / {result.result.totalTests} passed
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.result.testResults.map((tr: TestCaseResult, i: number) => (
                        <div key={tr.testCaseId} className="glass" style={{
                          borderRadius: 10, padding: 14,
                          border: `1px solid ${tr.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tr.passed ? 0 : 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {tr.passed ? <CheckCircle size={15} color="#22c55e" /> : <XCircle size={15} color="#ef4444" />}
                              <span style={{ fontSize: 13, fontWeight: 500, color: tr.passed ? '#22c55e' : '#ef4444' }}>
                                Test {i + 1}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{tr.status}</span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                              {tr.executionTimeMs}ms
                            </span>
                          </div>
                          {!tr.passed && (
                            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Expected</p>
                                <pre style={{ margin: 0, background: '#0f0f0f', borderRadius: 6, padding: 8, fontSize: 11, color: '#22c55e', fontFamily: 'monospace' }}>
                                  {tr.expectedOutput}
                                </pre>
                              </div>
                              <div>
                                <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Got</p>
                                <pre style={{ margin: 0, background: '#0f0f0f', borderRadius: 6, padding: 8, fontSize: 11, color: '#ef4444', fontFamily: 'monospace' }}>
                                  {tr.actualOutput || tr.errorMessage || '(empty)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Editor toolbar */}
          <div style={{
            height: 44, borderBottom: '1px solid #1e1e1e', background: '#0f0f0f',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', flexShrink: 0,
          }}>
            <select
              value={selectedLang?.id || ''}
              onChange={e => handleLanguageChange(e.target.value)}
              style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5',
                borderRadius: 6, padding: '4px 10px', fontSize: 13, cursor: 'pointer',
              }}
            >
              {languages.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                loading={running}
                onClick={handleRun}
                leftIcon={<Play size={13} />}
              >
                Run
              </Button>
              <Button
                size="sm"
                loading={submitting}
                onClick={handleSubmit}
                leftIcon={<Send size={13} />}
              >
                Submit
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={selectedLang?.monacoLanguage || 'plaintext'}
              value={code}
              onChange={(val: string | undefined) => handleCodeChange(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
                insertSpaces: true,
              }}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={handleFinishRound}
        title="Finish Coding Round"
        message="Are you sure you want to finish and submit this coding round? All your saved solutions will be evaluated and finalized."
        confirmLabel="Finish & Submit"
        loading={submittingRound}
      />

      {/* Tips Modal */}
      <Modal
        isOpen={showTipsModal}
        onClose={handleCloseTips}
        title=""
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Lightbulb size={20} color="#eab308" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f5f5f5' }}>
                  Problem Tips
                </h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {selectedProblem?.title}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 20, padding: '4px 12px', color: '#fca5a5',
              fontSize: 13, fontWeight: 600
            }}>
              <Clock size={13} /> Visible for {tipCountdown}s
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '350px', overflowY: 'auto' }}>
            {selectedProblem?.tips?.map((tip: string, idx: number) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                <span style={{
                  background: '#eab308', color: '#000', fontWeight: 700, fontSize: 12,
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, marginTop: 2
                }}>
                  {idx + 1}
                </span>
                <p style={{ margin: 0, fontSize: 14, color: '#f3f4f6', lineHeight: 1.6 }}>
                  {tip}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
              This popup will automatically close in {tipCountdown} seconds.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
