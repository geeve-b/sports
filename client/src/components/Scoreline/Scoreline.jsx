import { cx } from '../../utils/cx';
import FlipNumber from '../FlipNumber/FlipNumber';
import styles from './Scoreline.module.css';

const STATUS_LABEL = { scheduled: 'KO', live: 'Live', ht: 'HT', ft: 'FT', postponed: 'P-P' };
const OUTCOME_LABEL = { W: 'Win', D: 'Draw', L: 'Loss' };

const kickoff = (date) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const matchDate = (date) =>
  new Date(date).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();

/**
 * Broadcast score bug.
 *   home / away: { name, shortName, score, color }
 *   status: 'scheduled' | 'live' | 'ht' | 'ft' | 'postponed'
 *   outcome: 'W' | 'D' | 'L' from our side (shown once the match is over)
 *   size: 'lg' (Match Centre) | 'sm' (fixture timeline rows)
 */
export default function Scoreline({
  home,
  away,
  status = 'ft',
  minute,
  competition,
  date,
  venue,
  outcome,
  scorers,
  size = 'lg',
  className,
}) {
  const played = status === 'live' || status === 'ht' || status === 'ft';
  const summary = played
    ? `${home.name} ${home.score}, ${away.name} ${away.score}, ${status === 'live' ? `live, ${minute} minutes` : STATUS_LABEL[status]}`
    : `${home.name} versus ${away.name}, kick-off ${date ? `${matchDate(date)} ${kickoff(date)}` : 'to be confirmed'}`;

  return (
    <section className={cx(styles.scoreline, styles[size], className)} aria-label={summary}>
      {competition && size === 'lg' && (
        <p className={styles.comp}>
          <span>{competition}</span>
          {date && <span className={styles.compDate}>{matchDate(date)}</span>}
        </p>
      )}

      <div className={styles.bug} aria-hidden="true">
        {outcome && status === 'ft' && (
          <span className={cx(styles.outcome, styles[`out${outcome}`])} title={OUTCOME_LABEL[outcome]}>
            {outcome}
          </span>
        )}

        <span className={cx(styles.team, styles.home)}>
          <span className={styles.stripe} style={{ background: home.color }} />
          <span className={styles.full}>{home.name}</span>
          <span className={styles.short}>{home.shortName}</span>
        </span>

        <span className={styles.score}>
          {played ? (
            <>
              <FlipNumber value={home.score} tiles />
              <span className={styles.dash}>–</span>
              <FlipNumber value={away.score} tiles />
            </>
          ) : (
            <span className={styles.ko}>{date ? kickoff(date) : 'TBC'}</span>
          )}
        </span>

        <span className={cx(styles.team, styles.away)}>
          <span className={styles.full}>{away.name}</span>
          <span className={styles.short}>{away.shortName}</span>
          <span className={styles.stripe} style={{ background: away.color }} />
        </span>

        <span className={cx(styles.status, styles[`st_${status}`])}>
          {status === 'live' && <span className={styles.liveDot} />}
          {status === 'live' && minute != null ? `${minute}'` : STATUS_LABEL[status]}
        </span>
      </div>

      {size === 'lg' && (venue || scorers?.length) && (
        <div className={styles.meta}>
          {scorers?.length > 0 && (
            <ul className={styles.scorers}>
              {scorers.map((s) => (
                <li key={`${s.name}-${s.minute}`}>
                  {s.name} <span className="wp-num">{s.minute}'</span>
                </li>
              ))}
            </ul>
          )}
          {venue && <p className={styles.venue}>{venue}</p>}
        </div>
      )}
    </section>
  );
}
