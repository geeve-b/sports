import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, HeartPulse, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statsApi } from '../../api/services';
import Button from '../../components/Button/Button';
import ChartTooltip, { axisProps } from '../../components/Charts/ChartTooltip';
import chartStyles from '../../components/Charts/Charts.module.css';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import Skeleton from '../../components/Skeleton/Skeleton';
import StatBlock from '../../components/StatBlock/StatBlock';
import StatusTag from '../../components/StatusTag/StatusTag';
import { useAuth } from '../../hooks/useAuth';
import { useChartColors } from '../../hooks/useChartColors';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { age, fmtDate, FOOT_NAMES, POSITION_NAMES } from '../../utils/format';
import PlayerFormModal from '../Squad/PlayerFormModal';
import InjuryModal from './InjuryModal';
import styles from './PlayerProfile.module.css';

const RESULT_CLASS = { W: 'W', D: 'D', L: 'L' };

function Banner({ player, canEdit, onEdit, onInjury }) {
  const parts = player.name.split(' ');
  const last = parts.length > 1 ? parts.pop() : parts[0];
  const first = parts.join(' ');
  const facts = [
    POSITION_NAMES[player.position],
    player.dob && `${age(player.dob)} yrs`,
    player.height && `${player.height} cm`,
    player.foot && `${FOOT_NAMES[player.foot]} foot`,
  ].filter(Boolean);

  return (
    <header className={cx(styles.banner, styles[player.status])}>
      <motion.span
        className={styles.bigNumber}
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.85, x: -40 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        {player.jerseyNumber ?? '–'}
      </motion.span>
      <div className={styles.bannerText}>
        <Link to="/squad" className={cx('btn btn-ghost btn-sm', styles.back)}>
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" /> Squad
        </Link>
        <p className={cx(styles.posTab, 'wp-reveal')}>{player.position} · #{player.jerseyNumber ?? '–'}</p>
        <h1 className={cx(styles.name, 'wp-reveal')} style={{ '--d': 1 }}>
          {first && <span className={styles.first}>{first}</span>}
          {last}
        </h1>
        <div className={cx(styles.facts, 'wp-reveal')} style={{ '--d': 2 }}>
          <StatusTag status={player.status} />
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
        {canEdit && (
          <div className={cx(styles.actions, 'wp-reveal')} style={{ '--d': 3 }}>
            <Button variant="chalk" size="sm" icon={Pencil} onClick={onEdit}>Edit profile</Button>
            <Button variant="chalk" size="sm" icon={HeartPulse} onClick={onInjury}>Log injury</Button>
          </div>
        )}
      </div>
    </header>
  );
}

export default function PlayerProfile() {
  const { id } = useParams();
  const { isStaff } = useAuth();
  const c = useChartColors();
  const { data, loading, error, reload, setData } = useFetch(() => statsApi.player(id), [id]);
  const [editing, setEditing] = useState(false);
  const [injury, setInjury] = useState(null); // null | 'new' | injury

  if (loading) return <div className="pt-5"><Skeleton rows={6} big label="Loading player" /></div>;
  if (error) return <div className="pt-5"><ErrorState error={error} onRetry={reload} /></div>;

  const { player, radar, matches, attendance, injuries } = data;
  const t = player.stats;
  const perMatch = [...matches]
    .reverse()
    .map((m) => ({ label: m.match.opponentShort, opponent: m.match.opponent, goals: m.goals, assists: m.assists, rating: m.rating }));
  const hasMinutes = t.minutes > 0;

  const onPlayerSaved = (saved) => setData((d) => ({ ...d, player: { ...d.player, ...saved, stats: d.player.stats } }));
  const onInjurySaved = (saved) => {
    setData((d) => ({ ...d, player: { ...d.player, status: saved.status }, injuries: [...saved.injuries].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)) }));
  };

  return (
    <div className={styles.page}>
      <Banner player={player} canEdit={isStaff} onEdit={() => setEditing(true)} onInjury={() => setInjury('new')} />

      <div className="row g-5">
        {/* Charts: 8 */}
        <div className="col-lg-8">
          <section aria-labelledby="profile-h">
            <div className="wp-slate">
              <span className="wp-slate-tab">01</span>
              <h2 id="profile-h">Season profile</h2>
              <span className="wp-slate-end wp-label">Per 90, vs squad best = 100</span>
            </div>
            {!hasMinutes ? (
              <EmptyState compact title="No minutes yet.">The profile fills in once {player.name.split(' ')[0]} plays a match.</EmptyState>
            ) : (
              <div className="row g-4 align-items-center">
                <div className="col-md-6">
                  <div className={chartStyles.frame} style={{ height: 300 }} role="img" aria-label={`Radar: ${radar.map((r) => `${r.metric} ${r.value}`).join(', ')}`}>
                    <ResponsiveContainer>
                      <RadarChart data={radar} outerRadius="72%">
                        <PolarGrid stroke={c.grid} />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: c.muted, fontSize: 11, fontFamily: c.font }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" name="Score" stroke={c.accentLine} strokeWidth={2} fill={c.accent} fillOpacity={0.35} isAnimationActive />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="col-md-6">
                  <table className="table table-sm mb-0">
                    <caption className="visually-hidden">Profile values</caption>
                    <thead>
                      <tr><th scope="col">Metric</th><th scope="col" className="text-end">Per 90</th><th scope="col" className="text-end">Score</th></tr>
                    </thead>
                    <tbody>
                      {radar.map((r) => (
                        <tr key={r.metric}>
                          <td>{r.metric}</td>
                          <td className="text-end wp-num">{r.raw}</td>
                          <td className="text-end wp-num">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="mt-5" aria-labelledby="pm-h">
            <div className="wp-slate">
              <span className="wp-slate-tab">02</span>
              <h2 id="pm-h">Goals &amp; assists by match</h2>
            </div>
            {!perMatch.length ? (
              <EmptyState compact title="No appearances yet.">Match numbers show up here after the first game.</EmptyState>
            ) : (
              <>
                <div style={{ height: 240 }} role="img" aria-label="Bar chart of goals and assists per match; values are in the match history table below.">
                  <ResponsiveContainer>
                    <BarChart data={perMatch} barGap={2} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={c.grid} />
                      <XAxis dataKey="label" {...axisProps(c)} />
                      <YAxis allowDecimals={false} {...axisProps(c)} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: c.grid }}
                        content={<ChartTooltip labelFormatter={(l, p) => p?.[0]?.payload?.opponent ?? l} />}
                      />
                      <Bar dataKey="goals" name="Goals" fill={c.accent} stroke={c.accentLine} strokeWidth={c.accentLine === c.accent ? 0 : 1} maxBarSize={22} />
                      <Bar dataKey="assists" name="Assists" fill={c.secondary} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className={chartStyles.legend}>
                  <li><span className={chartStyles.key} style={{ background: c.accent, outline: `1px solid ${c.accentLine}` }} />Goals</li>
                  <li><span className={chartStyles.key} style={{ background: c.secondary }} />Assists</li>
                </ul>
              </>
            )}
          </section>
        </div>

        {/* Numbers: 4 */}
        <aside className="col-lg-4" aria-label="Season numbers">
          <div className={styles.numbers}>
            <StatBlock size="xl" label="Goals" value={t.goals} tone="accent" />
            <div className={styles.numberRow}>
              <StatBlock size="md" label="Assists" value={t.assists} />
              <StatBlock size="md" label="Apps" value={t.apps} />
              <StatBlock size="md" label="Avg rating" value={t.rating != null ? t.rating.toFixed(1) : '–'} />
            </div>
            <div className={styles.numberRow}>
              <StatBlock size="sm" label="Minutes" value={t.minutes} />
              <StatBlock size="sm" label="Shots" value={t.shots} />
              <StatBlock size="sm" label="Passes" value={t.passes} />
            </div>
            <div className={styles.attendance}>
              <StatBlock size="lg" label="Training attendance" value={attendance.rate} suffix={attendance.rate != null ? '%' : null} />
              <p className="wp-meta mb-0">
                {attendance.sessions ? `${attendance.attended} of ${attendance.sessions} sessions` : 'No sessions recorded yet.'}
              </p>
              {attendance.rate != null && (
                <div className={styles.meter} aria-hidden="true">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${attendance.rate}%` }} transition={{ duration: 0.8, ease: [0.77, 0, 0.18, 1] }} />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="row g-5 mt-0">
        <section className="col-lg-8" aria-labelledby="hist-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">03</span>
            <h2 id="hist-h">Match history</h2>
          </div>
          {!matches.length ? (
            <EmptyState compact title="Yet to make a debut.">Every appearance is listed here.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table table-league">
                <caption className="visually-hidden">Match history</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Opponent</th>
                    <th scope="col">Res</th>
                    <th scope="col" className="col-num">Min</th>
                    <th scope="col" className="col-num">G</th>
                    <th scope="col" className="col-num">A</th>
                    <th scope="col" className="col-num">Shots</th>
                    <th scope="col" className="col-pts">Rtg</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m._id}>
                      <td className="wp-num text-nowrap">{fmtDate(m.match.date, { day: '2-digit', month: 'short' })}</td>
                      <td>
                        <Link to={`/fixtures/${m.match._id}`} className={styles.tableLink}>
                          {m.match.homeAway === 'away' ? '@ ' : ''}{m.match.opponent}
                        </Link>
                      </td>
                      <td>
                        {m.match.result && (
                          <span className={cx(styles.res, styles[RESULT_CLASS[m.match.result]])}>
                            {m.match.result} {m.match.score.for}–{m.match.score.against}
                          </span>
                        )}
                      </td>
                      <td className="col-num">{m.minutes}</td>
                      <td className="col-num">{m.goals}</td>
                      <td className="col-num">{m.assists}</td>
                      <td className="col-num">{m.shots}</td>
                      <td className="col-pts">{m.rating?.toFixed(1) ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="col-lg-4" aria-labelledby="inj-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">04</span>
            <h2 id="inj-h">Injury log</h2>
          </div>
          {!injuries.length ? (
            <EmptyState compact title="Clean bill of health.">No injuries on record.</EmptyState>
          ) : (
            <ol className={styles.injuries}>
              {injuries.map((inj) => {
                const open = !inj.endDate || new Date(inj.endDate) > new Date();
                return (
                  <li key={inj._id} className={cx(styles.injury, open && styles.open)}>
                    <div className={styles.injHead}>
                      <span className="wp-label">
                        {fmtDate(inj.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} → {inj.endDate ? fmtDate(inj.endDate, { day: 'numeric', month: 'short' }) : 'still out'}
                      </span>
                      {isStaff && (
                        <button type="button" className={styles.injEdit} onClick={() => setInjury(inj)} aria-label={`Update ${inj.type}`}>
                          <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <p className={styles.injType}>{inj.type}</p>
                    {inj.notes && <p className="wp-meta mb-0">{inj.notes}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <PlayerFormModal show={editing} player={player} onHide={() => setEditing(false)} onSaved={onPlayerSaved} />
      <InjuryModal show={Boolean(injury)} playerId={player._id} injury={injury === 'new' ? null : injury} onHide={() => setInjury(null)} onSaved={onInjurySaved} />
    </div>
  );
}
