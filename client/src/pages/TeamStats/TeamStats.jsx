import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statsApi } from '../../api/services';
import ChartTooltip, { axisProps } from '../../components/Charts/ChartTooltip';
import chartStyles from '../../components/Charts/Charts.module.css';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import FormGuide from '../../components/FormGuide/FormGuide';
import Leaderboard from '../../components/Leaderboard/Leaderboard';
import PageHeader from '../../components/PageHeader/PageHeader';
import Skeleton from '../../components/Skeleton/Skeleton';
import StatBlock from '../../components/StatBlock/StatBlock';
import { useAuth } from '../../hooks/useAuth';
import { useChartColors } from '../../hooks/useChartColors';
import { useFetch } from '../../hooks/useFetch';
import { fmtDate } from '../../utils/format';
import styles from './TeamStats.module.css';

export default function TeamStats() {
  const { team } = useAuth();
  const c = useChartColors();
  const { data, loading, error, reload } = useFetch(() => statsApi.team(team._id), [team?._id], { skip: !team });

  const header = <PageHeader eyebrow={team?.season?.name ? `Season ${team.season.name}` : 'Stats'} title="Team stats" />;

  if (!team) return <>{header}<EmptyState title="No team yet.">Stats appear once your account is on a team.</EmptyState></>;
  if (loading) return <>{header}<Skeleton rows={8} big label="Loading team stats" /></>;
  if (error) return <>{header}<ErrorState error={error} onRetry={reload} /></>;

  const { summary: s, trend, form, topScorers, topAssists, topRated } = data;
  if (!s.played) {
    return (
      <>
        {header}
        <EmptyState title="No final whistles yet.">Win rate, goals and form fill in once the first result is entered.</EmptyState>
      </>
    );
  }

  const chartData = trend.map((t) => ({ ...t, label: t.opponentShort, against: t.goalsAgainst, for: t.goalsFor }));
  const avgFor = (s.goalsFor / s.played).toFixed(1);
  const avgAgainst = (s.goalsAgainst / s.played).toFixed(1);
  const gfShare = s.goalsFor + s.goalsAgainst ? (s.goalsFor / (s.goalsFor + s.goalsAgainst)) * 100 : 50;
  const labelFor = (l, p) => {
    const row = p?.[0]?.payload;
    return row ? `${row.opponent} · ${fmtDate(row.date, { day: 'numeric', month: 'short' })}` : l;
  };

  return (
    <>
      {header}

      {/* Headline: win rate, huge, beside the record and goals split */}
      <section className={styles.headline} aria-label="Season summary">
        <StatBlock size="xl" label="Win rate" value={s.winRate} suffix="%" tone="accent" />
        <div className={styles.headlineSide}>
          <div className={styles.record} aria-label={`Played ${s.played}: ${s.wins} won, ${s.draws} drawn, ${s.losses} lost`}>
            {[['W', s.wins], ['D', s.draws], ['L', s.losses]].map(([k, v]) => (
              <div key={k} className={styles[`rec${k}`]}>
                <span className={styles.recNum}>{v}</span>
                <span className="wp-label">{k === 'W' ? 'Won' : k === 'D' ? 'Drawn' : 'Lost'}</span>
              </div>
            ))}
            <div>
              <span className={styles.recNum}>{s.points}</span>
              <span className="wp-label">Points</span>
            </div>
          </div>
          <div className={styles.goals}>
            <div className={styles.goalsLabels}>
              <span><b>{s.goalsFor}</b> scored · {avgFor} a game</span>
              <span>{avgAgainst} a game · <b>{s.goalsAgainst}</b> conceded</span>
            </div>
            <div className={styles.goalsBar} role="img" aria-label={`${s.goalsFor} goals scored, ${s.goalsAgainst} conceded`}>
              <span style={{ width: `${gfShare}%` }} />
            </div>
            <p className="wp-label mb-0">Goal difference {s.goalDifference > 0 ? '+' : ''}{s.goalDifference} · {s.cleanSheets} clean sheets</p>
          </div>
        </div>
      </section>

      <div className="row g-5">
        <section className="col-lg-8" aria-labelledby="trend-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">01</span>
            <h2 id="trend-h">Points over the season</h2>
          </div>
          <div style={{ height: 280 }} role="img" aria-label={`Cumulative points: ${chartData.map((d) => `${d.label} ${d.cumulativePoints}`).join(', ')}`}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <pattern id="wp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill={c.accentFill} />
                    <line x1="0" y1="0" x2="0" y2="6" stroke={c.accentLine} strokeWidth="1" strokeOpacity=".35" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" {...axisProps(c)} />
                <YAxis allowDecimals={false} {...axisProps(c)} axisLine={false} />
                <Tooltip cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} content={<ChartTooltip labelFormatter={labelFor} />} />
                <Area
                  type="linear"
                  dataKey="cumulativePoints"
                  name="Points"
                  stroke={c.accentLine}
                  strokeWidth={2}
                  fill="url(#wp-hatch)"
                  dot={{ r: 4, fill: c.surface, stroke: c.accentLine, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: c.accent, stroke: c.accentLine, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <aside className="col-lg-4" aria-labelledby="form-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">02</span>
            <h2 id="form-h">Form</h2>
          </div>
          <FormGuide items={form} size="lg" />
          <p className="wp-meta mt-3">Last {form.length} results, oldest first. Hover a tile for the score.</p>
          <dl className={styles.mini}>
            <div><dt>Played</dt><dd>{s.played}</dd></div>
            <div><dt>Clean sheets</dt><dd>{s.cleanSheets}</dd></div>
            <div><dt>Scored / game</dt><dd>{avgFor}</dd></div>
          </dl>
        </aside>
      </div>

      <section className="mt-5" aria-labelledby="gfga-h">
        <div className="wp-slate">
          <span className="wp-slate-tab">03</span>
          <h2 id="gfga-h">Goals for &amp; against</h2>
        </div>
        <div style={{ height: 260 }} role="img" aria-label={`Goals per match: ${chartData.map((d) => `${d.label} ${d.for}–${d.against}`).join(', ')}`}>
          <ResponsiveContainer>
            <BarChart data={chartData} barGap={2} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="label" {...axisProps(c)} />
              <YAxis allowDecimals={false} {...axisProps(c)} axisLine={false} />
              <ReferenceLine y={Number(avgFor)} stroke={c.accentLine} strokeDasharray="4 4" />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip labelFormatter={labelFor} />} />
              <Bar dataKey="for" name="Scored" fill={c.accent} stroke={c.accentLine} strokeWidth={c.accentLine === c.accent ? 0 : 1} maxBarSize={26} />
              <Bar dataKey="against" name="Conceded" fill={c.secondary} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className={chartStyles.legend}>
          <li><span className={chartStyles.key} style={{ background: c.accent, outline: `1px solid ${c.accentLine}` }} />Scored</li>
          <li><span className={chartStyles.key} style={{ background: c.secondary }} />Conceded</li>
          <li><span className={chartStyles.keyLine} style={{ borderColor: c.accentLine, borderTopStyle: 'dashed' }} />Average scored ({avgFor})</li>
        </ul>
      </section>

      <div className="row g-5 mt-0">
        <section className="col-lg-5" aria-labelledby="ts-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">GL</span>
            <h2 id="ts-h">Top scorers</h2>
          </div>
          <Leaderboard rows={topScorers} valueKey="goals" valueLabel="Goals" emptyText="Nobody has scored yet." />
        </section>
        <section className="col-lg-4" aria-labelledby="ta-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">AS</span>
            <h2 id="ta-h">Assists</h2>
          </div>
          <Leaderboard rows={topAssists} valueKey="assists" valueLabel="Assists" emptyText="No assists yet." />
        </section>
        <section className="col-lg-3" aria-labelledby="tr-h">
          <div className="wp-slate">
            <span className="wp-slate-tab">RT</span>
            <h2 id="tr-h">Ratings</h2>
          </div>
          <Leaderboard rows={topRated} valueKey="rating" valueLabel="Avg rating" format={(v) => v?.toFixed(1)} emptyText="Two appearances needed to qualify." />
        </section>
      </div>
    </>
  );
}
