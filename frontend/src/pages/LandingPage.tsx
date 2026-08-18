import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import {
  Trophy, Code2, Zap, Users, CheckCircle, ChevronRight, ArrowRight,
  Star, Shield, Clock, BarChart3, Terminal, Brain, ChevronDown,
} from 'lucide-react';
import { competitionService } from '@/services/competitionService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ROUTES, COMPETITION_STATUS_LABELS } from '@/constants';
import { formatDate, isCompetitionOpen } from '@/utils';
import type { Competition } from '@/types';

// ── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Animated background */}
      <div className="animated-bg grid-pattern" style={{ position: 'absolute', inset: 0 }} />

      {/* Glowing orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <motion.div
          animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '10%', left: '15%',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <motion.div
          animate={{ y: [0, 20, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{
            position: 'absolute', bottom: '15%', right: '10%',
            width: 350, height: 350, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '120px 24px 80px', maxWidth: 860, margin: '0 auto' }}>
        {/* Chip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'inline-flex', marginBottom: 28 }}
        >
          <span className="badge badge-purple" style={{ fontSize: 12, padding: '6px 14px' }}>
            <Zap size={12} />
            ACM NMAMIT Chapter
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ margin: '0 0 20px', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', color: '#f5f5f5' }}
        >
          Compete. Code.
          <br />
          <span className="gradient-brand-text">Conquer.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'var(--color-text-secondary)', marginBottom: 40, lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px' }}
        >
          The official competition platform for ACM NMAMIT. Test your skills in MCQ challenges and coding competitions. Rise through the ranks.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center px-4"
        >
          <Button className="w-full sm:w-auto" size="lg" onClick={() => navigate(ROUTES.COMPETITIONS)} rightIcon={<ArrowRight size={18} />}>
            Browse Competitions
          </Button>
          <Button className="w-full sm:w-auto" size="lg" variant="secondary" onClick={() => navigate(ROUTES.LOGIN)}>
            Sign In
          </Button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ display: 'flex', gap: 48, justifyContent: 'center', marginTop: 60, flexWrap: 'wrap' }}
        >
          {[
            { value: '500+', label: 'Participants' },
            { value: '20+', label: 'Competitions' },
            { value: '100+', label: 'Problems' },
            { value: '5', label: 'Languages' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#a855f7', letterSpacing: '-0.5px' }}>{value}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: 'var(--color-text-muted)' }}
      >
        <ChevronDown size={24} />
      </motion.div>
    </section>
  );
}

// ── Competition Card ──────────────────────────────────────────────────────────
function CompetitionCard({ competition }: { competition: Competition }) {
  const navigate = useNavigate();
  const statusInfo = COMPETITION_STATUS_LABELS[competition.status];
  const open = isCompetitionOpen(competition);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={() => navigate(`/competitions/${competition.id}`)}
      className="glass glass-hover"
      style={{ borderRadius: 16, padding: 24, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {competition.title}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {competition.shortDescription || competition.description}
          </p>
        </div>
        <Badge variant={statusInfo?.color?.replace('badge-', '') as 'purple' | 'green' | 'yellow' | 'red' | 'blue' | 'gray'}>
          {statusInfo?.label}
        </Badge>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {competition.registrationCount !== undefined && (
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} />
            {competition.registrationCount} registered
          </span>
        )}
        {competition.startsAt && (
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            {formatDate(competition.startsAt)}
          </span>
        )}
      </div>

      {open && (
        <div style={{ paddingTop: 8, borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>Registration Open</span>
          <ChevronRight size={16} color="#a855f7" />
        </div>
      )}
    </motion.div>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  const steps = [
    { icon: Users, title: 'Register & Create Profile', description: 'Sign up with your college email, complete your profile with USN and department details.' },
    { icon: Trophy, title: 'Join Competitions', description: 'Browse active competitions and register. Each competition has multiple rounds of varying difficulty.' },
    { icon: Brain, title: 'Solve MCQ Challenges', description: 'Answer timed multiple-choice questions on algorithms, data structures, and CS fundamentals.' },
    { icon: Code2, title: 'Code Your Way Up', description: 'Submit solutions in C, C++, Java, Python, or JavaScript against hidden test cases.' },
    { icon: BarChart3, title: 'Track Your Progress', description: 'Monitor your rank in real-time on the live leaderboard and advance to next rounds.' },
    { icon: Star, title: 'Win Prizes', description: 'Top performers get recognized and win prizes at ACM NMAMIT events.' },
  ];

  return (
    <section ref={ref} style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 60 }}
      >
        <h2 style={{ fontSize: 40, fontWeight: 800, color: '#f5f5f5', margin: '0 0 12px', letterSpacing: '-0.8px' }}>
          How It Works
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>
          From registration to winning — everything in one place.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {steps.map(({ icon: Icon, title, description }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="glass"
            style={{ borderRadius: 16, padding: 28 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, marginBottom: 16,
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} color="#a855f7" />
            </div>
            <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP {i + 1}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const faqs = [
    { q: 'Who can participate?', a: 'All students of NMAMIT, Nitte are eligible to participate in ACM competitions. You need a valid college email and USN to register.' },
    { q: 'What programming languages are supported?', a: 'Currently we support C, C++, Java, Python 3, and JavaScript (Node.js). More languages may be added in future competitions.' },
    { q: 'How are rounds structured?', a: 'Each competition has multiple rounds configured by admins. Rounds can be MCQ-based or coding-based in any sequence. You must advance through rounds to participate in later ones.' },
    { q: 'Is there negative marking in MCQ rounds?', a: 'Negative marking is configurable per round. Admins set whether negative marking applies and the deduction value. Check each round\'s details before attempting.' },
    { q: 'How is the leaderboard calculated?', a: 'The leaderboard aggregates scores across all completed rounds. For MCQ rounds, score is based on correct answers (minus negative marking). For coding rounds, partial marks are awarded based on test cases passed.' },
    { q: 'When are results announced?', a: 'Results are published by admins after reviewing all submissions. Participants who advance to the next round are notified through the platform.' },
  ];

  return (
    <section ref={ref} style={{ padding: '100px 24px', maxWidth: 800, margin: '0 auto' }}>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        style={{ textAlign: 'center', fontSize: 40, fontWeight: 800, color: '#f5f5f5', margin: '0 0 48px', letterSpacing: '-0.8px' }}
      >
        Frequently Asked Questions
      </motion.h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {faqs.map(({ q, a }, i) => (
          <motion.div
            key={q}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.05 }}
            className="glass"
            style={{ borderRadius: 12, overflow: 'hidden' }}
          >
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: '100%', padding: '18px 20px',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#f5f5f5', fontSize: 15, fontWeight: 500, textAlign: 'left',
              }}
            >
              {q}
              <motion.div animate={{ rotate: openIdx === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={18} color="var(--color-text-tertiary)" />
              </motion.div>
            </button>
            <motion.div
              initial={false}
              animate={{ height: openIdx === i ? 'auto' : 0, opacity: openIdx === i ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <p style={{ margin: 0, padding: '0 20px 18px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{a}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #1e1e1e',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f5' }}>ACM NMAMIT</span>
        </div>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14, margin: '0 0 24px' }}>
          Association for Computing Machinery — NMAMIT Chapter, Nitte
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {['Competitions', 'Leaderboard', 'Login'].map(label => (
            <Link key={label} to={`/${label.toLowerCase()}`} style={{ color: 'var(--color-text-secondary)', fontSize: 14, textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          © {new Date().getFullYear()} ACM NMAMIT Chapter. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    competitionService.list({ status: 'published', limit: 6 })
      .then(result => setCompetitions(result.data))
      .catch(() => {});
  }, []);

  const active = competitions.filter(c => c.status === 'active');
  const featured = competitions.filter(c => c.status !== 'active').slice(0, 3);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <HeroSection />

      {/* Active Competitions */}
      {active.length > 0 && (
        <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f5f5f5' }}>
              🔴 Live Now
            </h2>
            <Link to={ROUTES.COMPETITIONS} style={{ color: '#a855f7', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {active.map(c => <CompetitionCard key={c.id} competition={c} />)}
          </div>
        </section>
      )}

      {/* Featured Competitions */}
      {featured.length > 0 && (
        <section style={{ padding: '40px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f5f5f5' }}>Upcoming Competitions</h2>
            <Link to={ROUTES.COMPETITIONS} style={{ color: '#a855f7', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {featured.map(c => <CompetitionCard key={c.id} competition={c} />)}
          </div>
        </section>
      )}

      <HowItWorksSection />
      <FaqSection />
      <Footer />
    </div>
  );
}
