import { useEffect, useMemo, useState } from 'react';
import { availabilityApi, matchesApi } from '../../api/services';
import AvailabilityBar from '../../components/AvailabilityBar/AvailabilityBar';
import AvailabilityResponder from '../../components/AvailabilityResponder/AvailabilityResponder';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import Select from '../../components/Select/Select';
import Skeleton from '../../components/Skeleton/Skeleton';
import StatusTag from '../../components/StatusTag/StatusTag';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { fmtDate, fmtLongDate, fmtRelative, fmtTime } from '../../utils/format';
import styles from './Availability.module.css';

function PlayerView() {
  const { data, loading, error, reload } = useFetch(() => availabilityApi.mine(), []);
  if (loading) return <Skeleton rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.length) return <EmptyState title="No fixtures yet. The pitch is quiet.">When the coach adds a match, you’ll answer here.</EmptyState>;

  return (
    <ol className={styles.fixtures}>
      {data.map(({ match, response }, i) => (
        <li key={match._id} className={cx(styles.fixture, 'wp-reveal')} style={{ '--d': i }}>
          <div className={styles.fixtureInfo}>
            <span className="wp-label">{match.competition} · {match.homeAway === 'home' ? 'Home' : 'Away'}</span>
            <h2 className={styles.opponent}>{match.homeAway === 'home' ? 'v' : 'at'} {match.opponent}</h2>
            <span className="wp-label">{fmtLongDate(match.date)} · {fmtTime(match.date)}</span>
          </div>
          <AvailabilityResponder matchId={match._id} response={response} />
        </li>
      ))}
    </ol>
  );
}

const GROUPS = [
  { key: 'pending', title: 'No reply', test: (r) => r.available === null },
  { key: 'unavailable', title: 'Unavailable', test: (r) => r.available === false },
  { key: 'available', title: 'Available', test: (r) => r.available === true },
];

function CoachView() {
  const toast = useToast();
  const matches = useFetch(() => matchesApi.list({ status: 'scheduled,postponed' }), []);
  const [matchId, setMatchId] = useState('');

  useEffect(() => {
    if (!matchId && matches.data?.length) setMatchId(matches.data[0]._id);
  }, [matches.data, matchId]);

  // Refreshes every 15 seconds so answers arrive without reloading.
  const avail = useFetch(() => availabilityApi.forMatch(matchId), [matchId], { skip: !matchId, interval: 15_000 });
  const [updatedAt, setUpdatedAt] = useState(null);
  useEffect(() => {
    if (avail.data) setUpdatedAt(new Date());
  }, [avail.data]);

  const grouped = useMemo(() => GROUPS.map((g) => ({ ...g, rows: (avail.data?.squad ?? []).filter(g.test) })), [avail.data]);

  const setFor = async (playerId, available) => {
    try {
      await availabilityApi.respond({ match: matchId, player: playerId, available, reason: available ? '' : 'Set by coach' });
      avail.reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (matches.loading) return <Skeleton rows={5} />;
  if (matches.error) return <ErrorState error={matches.error} onRetry={matches.reload} />;
  if (!matches.data.length) return <EmptyState title="No fixtures yet. The pitch is quiet.">Add an upcoming match and players can start answering.</EmptyState>;

  const match = matches.data.find((m) => m._id === matchId);

  return (
    <div className="d-grid gap-4">
      <div className={styles.controls}>
        <div style={{ minWidth: 280 }}>
          <Select
            label="Match"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            options={matches.data.map((m) => ({ value: m._id, label: `${fmtDate(m.date, { day: '2-digit', month: 'short' })} · ${m.homeAway === 'home' ? 'v' : '@'} ${m.opponent}` }))}
          />
        </div>
        <p className={styles.live} aria-live="polite">
          <span className="wp-live-dot" aria-hidden="true" /> Live · updated {updatedAt ? fmtTime(updatedAt) : '—'}
        </p>
      </div>

      {avail.loading || !avail.data ? (
        <Skeleton rows={4} />
      ) : (
        <>
          <section className={styles.summary} aria-label="Summary">
            <div>
              <p className="wp-label mb-1">{match && fmtLongDate(match.date)}</p>
              <p className={styles.bigCount}>
                <span className="text-accent">{avail.data.summary.available}</span>
                <span className={styles.of}>/ {avail.data.summary.squad}</span>
              </p>
              <p className="wp-label mb-0">can play</p>
            </div>
            <div className="flex-grow-1">
              <AvailabilityBar summary={avail.data.summary} />
            </div>
          </section>

          <div className="row g-4">
            {grouped.map((g) => (
              <section key={g.key} className="col-lg-4" aria-labelledby={`g-${g.key}`}>
                <div className="wp-slate">
                  <span className={cx('wp-slate-tab', styles[`tab_${g.key}`])}>{g.rows.length}</span>
                  <h2 id={`g-${g.key}`}>{g.title}</h2>
                </div>
                {!g.rows.length ? (
                  <p className="wp-meta">{g.key === 'pending' ? 'Everyone has answered.' : 'Nobody.'}</p>
                ) : (
                  <ul className={styles.list}>
                    {g.rows.map((r) => (
                      <li key={r.player._id}>
                        <span className={styles.no}>{r.player.jerseyNumber ?? '–'}</span>
                        <span className={styles.who}>
                          <span className={styles.name}>{r.player.name}</span>
                          {r.reason && <span className={styles.reason}>{r.reason}</span>}
                          {r.player.status !== 'fit' && <StatusTag status={r.player.status} />}
                        </span>
                        <span className={styles.rowEnd}>
                          {r.respondedAt && <span className={styles.when}>{fmtRelative(r.respondedAt)}</span>}
                          {g.key === 'pending' && (
                            <span className={styles.quick}>
                              <button type="button" onClick={() => setFor(r.player._id, true)} aria-label={`Mark ${r.player.name} available`}>In</button>
                              <button type="button" onClick={() => setFor(r.player._id, false)} aria-label={`Mark ${r.player.name} unavailable`}>Out</button>
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Availability() {
  const { isStaff } = useAuth();
  return (
    <>
      <PageHeader eyebrow="Availability" title={isStaff ? 'Who can play' : 'Can you play?'} meta={!isStaff && <span>Only your coaches see your reasons</span>} />
      {isStaff ? <CoachView /> : <PlayerView />}
    </>
  );
}
