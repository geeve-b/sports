import { useMemo, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { matchesApi } from '../../api/services';
import Button from '../../components/Button/Button';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import Scoreline from '../../components/Scoreline/Scoreline';
import Segmented from '../../components/Segmented/Segmented';
import Skeleton from '../../components/Skeleton/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { fmtDate, fmtTime } from '../../utils/format';
import { resultOf, toScoreline } from '../../utils/match';
import MatchFormModal from './MatchFormModal';
import styles from './Fixtures.module.css';

const FILTERS = [
  { value: 'all', label: 'Season' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'results', label: 'Results' },
];

export default function Fixtures() {
  const { team, isStaff } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => matchesApi.list(), []);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);

  const record = useMemo(() => {
    const r = { W: 0, D: 0, L: 0 };
    for (const m of data ?? []) {
      const res = resultOf(m);
      if (res) r[res] += 1;
    }
    return r;
  }, [data]);

  const months = useMemo(() => {
    const list = (data ?? []).filter((m) =>
      filter === 'upcoming' ? m.status === 'scheduled' || m.status === 'postponed' : filter === 'results' ? m.status !== 'scheduled' && m.status !== 'postponed' : true,
    );
    if (filter === 'results') list.reverse();
    const groups = new Map();
    for (const m of list) {
      const key = fmtDate(m.date, { month: 'long', year: 'numeric' });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    return [...groups.entries()];
  }, [data, filter]);

  const nextId = (data ?? []).find((m) => m.status === 'scheduled' && new Date(m.date) > new Date())?._id;

  return (
    <>
      <PageHeader
        eyebrow={team?.season?.name ? `Season ${team.season.name}` : 'Fixtures'}
        title="Fixtures & results"
        meta={
          data && (
            <>
              <span>{data.length} matches</span>
              <span>W {record.W} · D {record.D} · L {record.L}</span>
            </>
          )
        }
        actions={isStaff && <Button icon={Plus} cut onClick={() => setAdding(true)}>Add fixture</Button>}
      />

      <Segmented label="Show" hideLabel value={filter} onChange={setFilter} options={FILTERS} className="mb-4" />

      {loading ? (
        <Skeleton rows={8} label="Loading fixtures" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !months.length ? (
        <EmptyState
          title={filter === 'results' ? 'No results yet.' : 'No fixtures yet. The pitch is quiet.'}
          action={isStaff && filter !== 'results' && <Button icon={Plus} onClick={() => setAdding(true)}>Add the first fixture</Button>}
        >
          {filter === 'results' ? 'Results appear after the final whistle.' : 'Once fixtures are on the calendar, the season builds up here.'}
        </EmptyState>
      ) : (
        <div className={styles.timeline}>
          {months.map(([month, matches], gi) => (
            <section key={month} className={styles.month} aria-labelledby={`m-${gi}`}>
              <h2 id={`m-${gi}`} className={styles.monthName}>{month}</h2>
              <ol className={styles.rows}>
                {matches.map((m, i) => (
                  <li key={m._id} className={cx(styles.row, m._id === nextId && styles.isNext, 'wp-reveal')} style={{ '--d': Math.min(i + gi, 8) }}>
                    <div className={styles.date}>
                      <span className={styles.day}>{fmtDate(m.date, { day: '2-digit' })}</span>
                      <span className="wp-label">{fmtDate(m.date, { weekday: 'short' })} · {fmtTime(m.date)}</span>
                    </div>
                    <div className={styles.score}>
                      {m._id === nextId && <span className={styles.nextTag}>Next up</span>}
                      <Scoreline {...toScoreline(m, team)} size="sm" />
                    </div>
                    <div className={styles.meta}>
                      <span>{m.competition}</span>
                      <span>{m.venue}</span>
                    </div>
                    <Link to={`/fixtures/${m._id}`} className={cx('stretched-link', styles.open)} aria-label={`${m.homeAway === 'home' ? 'Home' : 'Away'} against ${m.opponent}, ${fmtDate(m.date)}: open match`}>
                      <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <MatchFormModal show={adding} onHide={() => setAdding(false)} onSaved={(m) => navigate(`/fixtures/${m._id}`)} />
    </>
  );
}
