import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Trophy, Clock, Users, Filter, ArrowRight } from 'lucide-react';
import { competitionService } from '@/services/competitionService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COMPETITION_STATUS_LABELS } from '@/constants';
import { formatDate, isCompetitionOpen } from '@/utils';
import type { Competition } from '@/types';

type StatusFilter = 'all' | 'published' | 'active' | 'completed';

export default function CompetitionsPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Debounce search input to prevent rapid api calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    competitionService.list({
      status: filter === 'all' ? undefined : filter,
      search: debouncedSearch || undefined,
      page,
      limit: 12,
    }).then(result => {
      setCompetitions(prev => page === 1 ? result.data : [...prev, ...result.data]);
      setHasMore(result.pagination.hasNextPage);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, debouncedSearch, page]);

  // Reset page when filter/search changes
  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Upcoming', value: 'published' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            Competitions
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text-secondary)' }}>
            Browse and join coding and MCQ competitions hosted by ACM NMAMIT
          </p>
        </motion.div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="Search competitions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftElement={<Search size={15} />}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, padding: 4 }}>
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: filter === f.value ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'transparent',
                  color: filter === f.value ? 'white' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {loading && page === 1 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 200, borderRadius: 16, background: '#111', border: '1px solid #1e1e1e' }} />
            ))}
          </div>
        ) : competitions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <Trophy size={48} color="#333" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: 'var(--color-text-secondary)' }}>No competitions found</h3>
            <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              {search ? 'Try a different search term.' : 'Check back later for new competitions.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {competitions.map((comp, i) => {
                const statusInfo = COMPETITION_STATUS_LABELS[comp.status];
                const open = isCompetitionOpen(comp);
                return (
                  <motion.div
                    key={comp.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i % 12) * 0.04 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/competitions/${comp.id}`)}
                    className="glass glass-hover"
                    style={{ borderRadius: 16, padding: 24, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16 }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: 'rgba(168,85,247,0.12)',
                        border: '1px solid rgba(168,85,247,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Trophy size={20} color="#a855f7" />
                      </div>
                      <Badge variant={statusInfo?.color?.replace('badge-', '') as 'green' | 'purple' | 'blue' | 'yellow' | 'red' | 'gray'} dot>
                        {statusInfo?.label}
                      </Badge>
                    </div>

                    {/* Title & desc */}
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#f5f5f5', lineHeight: 1.3 }}>
                        {comp.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {comp.shortDescription || comp.description}
                      </p>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #1e1e1e', paddingTop: 14 }}>
                      {comp.registrationCount !== undefined && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={11} />{comp.registrationCount} registered
                        </span>
                      )}
                      {comp.startsAt && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />{formatDate(comp.startsAt)}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: open ? '#22c55e' : 'var(--color-text-muted)', fontWeight: 500 }}>
                        {open ? 'Open' : comp.isRegistered ? '✓ Registered' : 'Closed'}
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Button variant="secondary" onClick={() => setPage(p => p + 1)} loading={loading}>
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
