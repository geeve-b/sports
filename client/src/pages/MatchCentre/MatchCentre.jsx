import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { announcementsApi, availabilityApi, matchesApi, statsApi } from '../../api/services';
import AvailabilityBar from '../../components/AvailabilityBar/AvailabilityBar';
import AvailabilityResponder from '../../components/AvailabilityResponder/AvailabilityResponder';
import Countdown from '../../components/Countdown/Countdown';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import FormGuide from '../../components/FormGuide/FormGuide';
import Leaderboard from '../../components/Leaderboard/Leaderboard';
import Scoreline from '../../components/Scoreline/Scoreline';
import Skeleton from '../../components/Skeleton/Skeleton';
import StatBlock from '../../components/StatBlock/StatBlock';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { fmtLongDate, fmtRelative, fmtTime } from '../../utils/format';
import { toScoreline } from '../../utils/match';
import styles from './MatchCentre.module.css';

function NextFixture({ match, isStaff, availability, onAnswered }) {
  if (!match) {
    return (
      <EmptyState title="No fixtures yet. The pitch is quiet.">
        {isStaff ? 'Add the next match on the Fixtures page and the countdown starts here.' : 'Your coach hasn’t added the next match yet.'}
      </EmptyState>
    );
  }
  const away = match.homeAway === 'away';
  return (
    <div className={styles.next}>
      <p className={cx(styles.tab, 'wp-reveal')}>
        Next fixture · {match.competition} · {away ? 'Away' : 'Home'}
      </p>
      <h1 className={cx(styles.opponent, 'wp-reveal')} style={{ '--d': 1 }}>
        <span className={styles.vs}>{away ? 'at' : 'v'}</span>
        {match.opponent}
      </h1>
      <p className={cx(styles.when, 'wp-reveal')} style={{ '--d': 2 }}>
        <span>{fmtLongDate(match.date)}</span>
        <span className="wp-num">{fmtTime(match.date)}</span>
        {match.venue && (
          <span>
            <MapPin size={13} strokeWidth={1.5} aria-hidden="true" /> {match.venue}
          </span>
        )}
      </p>
      <div className="wp-reveal" style={{ '--d': 3 }}>
        <Countdown target={match.date} />
      </div>
      <div className={cx(styles.nextActions, 'wp-reveal')} style={{ '--d': 4 }}>
        {isStaff ? (
          <>
            <Link to={`/lineup/${match._id}`} className="btn btn-primary">
              Pick the lineup
            </Link>
            <Link to={`/fixtures/${match._id}`} className="btn btn-chalk">
              Match details
            </Link>
          </>
        ) : (
          <AvailabilityResponder matchId={match._id} response={availability?.response} onSaved={onAnswered} compact />
        )}
      </div>
    </div>
  );
}

export default function MatchCentre() {
  const { team, isStaff } = useAuth();

  const next = useFetch(() => matchesApi.list({ status: 'scheduled', from: new Date(Date.now() - 2 * 3600e3).toISOString(), limit: 1 }), []);
  const last = useFetch(() => matchesApi.list({ status: 'ft,live,ht', sort: 'desc', limit: 1 }), []);
  const stats = useFetch(() => statsApi.team(team._id), [team?._id], { skip: !team });
  const posts = useFetch(() => announcementsApi.list({ limit: 3 }), []);

  const nextMatch = next.data?.[0];
  const avail = useFetch(() => availabilityApi.forMatch(nextMatch._id), [nextMatch?._id], {
    skip: !nextMatch,
    interval: isStaff ? 30_000 : undefined,
  });

  if (!team) {
    return (
      <div className="pt-5">
        <EmptyState title="You’re not on a team sheet yet.">Ask a club admin to add your account to a team.</EmptyState>
      </div>
    );
  }

  const lastMatch = last.data?.[0];
  const s = stats.data?.summary;

  return (
    <div className={styles.page}>
      {/* Hero: next fixture (8) + last result and form (4) */}
      <section className={cx('row g-0', styles.hero)} aria-label="Next fixture and last result">
        <div className={cx('col-lg-8', styles.heroMain)}>
          {next.loading ? <Skeleton rows={4} big label="Loading next fixture" /> : next.error ? <ErrorState error={next.error} onRetry={next.reload} /> : (
            <NextFixture match={nextMatch} isStaff={isStaff} availability={avail.data} onAnswered={() => avail.reload({ quiet: true })} />
          )}
        </div>
        <div className={cx('col-lg-4', styles.heroSide)}>
          <div className={styles.sideBlock}>
            <p className="wp-label mb-2">Last result</p>
            {last.loading ? (
              <Skeleton rows={2} label="Loading last result" />
            ) : lastMatch ? (
              <Link to={`/fixtures/${lastMatch._id}`} className={styles.plainLink} aria-label={`Last result against ${lastMatch.opponent}, open match report`}>
                <Scoreline {...toScoreline(lastMatch, team)} />
              </Link>
            ) : (
              <EmptyState compact title="No results yet.">The first final whistle will show up here.</EmptyState>
            )}
          </div>
          <div className={styles.sideBlock}>
            <p className="wp-label mb-2">Form · last five</p>
            {stats.loading ? <Skeleton rows={1} /> : <FormGuide items={stats.data?.form ?? []} size="lg" />}
          </div>
        </div>
      </section>

      {/* Season strip: one broadcast bar, numbers at different weights */}
      <section className={styles.strip} aria-label="Season so far">
        {stats.loading || !s ? (
          <Skeleton rows={1} label="Loading season numbers" />
        ) : (
          <>
            <StatBlock size="lg" label="Points" value={s.points} tone="accent" className={styles.stripLead} />
            <div className={styles.record} aria-label={`Won ${s.wins}, drawn ${s.draws}, lost ${s.losses}`}>
              <span><b>{s.wins}</b>W</span>
              <span><b>{s.draws}</b>D</span>
              <span className={styles.loss}><b>{s.losses}</b>L</span>
            </div>
            <StatBlock size="md" label="Played" value={s.played} />
            <StatBlock size="md" label="Goal diff." value={`${s.goalDifference > 0 ? '+' : ''}${s.goalDifference}`} />
            <StatBlock size="md" label="Win rate" value={s.winRate} suffix="%" flip={false} />
            <Link to="/stats" className={cx('btn btn-ghost', styles.stripLink)}>
              Full stats <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </>
        )}
      </section>

      <div className="row g-5 mt-0">
        {/* Squad availability (7) */}
        <section className="col-lg-7" aria-labelledby="avail-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">AV</span>
            <h2 id="avail-h">Squad availability</h2>
            {nextMatch && <span className="wp-slate-end wp-label">v {nextMatch.opponentShort}</span>}
          </div>
          {!nextMatch ? (
            <EmptyState compact title="Nothing to answer.">Availability opens when the next fixture is added.</EmptyState>
          ) : avail.loading ? (
            <Skeleton rows={3} />
          ) : isStaff && avail.data?.summary ? (
            <div className={styles.availBlock}>
              <AvailabilityBar summary={avail.data.summary} />
              <ul className={styles.outList}>
                {avail.data.squad
                  .filter((r) => r.available === false)
                  .map((r) => (
                    <li key={r.player._id}>
                      <span className={styles.outNo}>{r.player.jerseyNumber}</span>
                      <span className={styles.outName}>{r.player.name}</span>
                      <span className={styles.outWhy}>{r.reason || 'No reason given'}</span>
                    </li>
                  ))}
              </ul>
              <Link to="/availability" className="btn btn-ghost">
                Who hasn’t replied? <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="wp-prose">
              {avail.data?.response
                ? avail.data.response.available
                  ? 'You’re down as available. Your coach names the squad before kick-off.'
                  : `You’re down as unavailable${avail.data.response.reason ? `: ${avail.data.response.reason}` : '.'}`
                : 'Your coach is waiting on your answer. Use the buttons above.'}
            </p>
          )}
        </section>

        {/* Top scorers (5) */}
        <section className="col-lg-5" aria-labelledby="scorers-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">GL</span>
            <h2 id="scorers-h">Top scorers</h2>
          </div>
          {stats.loading ? <Skeleton rows={4} /> : (
            <Leaderboard rows={stats.data?.topScorers ?? []} valueKey="goals" valueLabel="Goals" emptyText="Nobody has scored yet. Someone has to be first." />
          )}
        </section>
      </div>

      <section className="mt-5" aria-labelledby="posts-h">
        <div className="wp-slate">
          <span className="wp-slate-tab">PA</span>
          <h2 id="posts-h">Announcements</h2>
          <Link to="/announcements" className="wp-slate-end btn btn-ghost btn-sm">All notices</Link>
        </div>
        {posts.loading ? <Skeleton rows={3} /> : !posts.data?.length ? (
          <EmptyState compact title="No announcements. Quiet week.">Notices from the coaching staff appear here.</EmptyState>
        ) : (
          <ol className={styles.notes}>
            {posts.data.map((p, i) => (
              <li key={p._id} className={cx(styles.note, styles[p.priority], 'wp-reveal')} style={{ '--d': i }}>
                <span className="wp-label">
                  {p.priority !== 'normal' && <b className={styles.prio}>{p.priority}</b>}
                  {p.author?.name} · {fmtRelative(p.createdAt)}
                </span>
                <h3 className={styles.noteTitle}>{p.title}</h3>
                <p className={styles.noteBody}>{p.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
