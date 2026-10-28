import { Link } from 'react-router-dom';
import { cx } from '../../utils/cx';
import styles from './Leaderboard.module.css';

/**
 * Ranked list. The leader gets a giant number; the rest sit in a tight table.
 * rows: [{ playerId, name, jerseyNumber, position, [valueKey] }]
 */
export default function Leaderboard({ rows = [], valueKey, valueLabel, format = (v) => v, emptyText = 'Nobody yet.', className }) {
  if (!rows.length) return <p className="wp-meta mb-0">{emptyText}</p>;
  const [leader, ...rest] = rows;

  return (
    <ol className={cx(styles.board, className)}>
      <li className={styles.leader}>
        <span className={styles.leaderValue}>{format(leader[valueKey])}</span>
        <span className={styles.leaderInfo}>
          <span className="wp-label">
            {valueLabel} · #{leader.jerseyNumber ?? '–'} {leader.position}
          </span>
          <Link to={`/squad/${leader.playerId}`} className={styles.leaderName}>
            {leader.name}
          </Link>
        </span>
      </li>
      {rest.map((r, i) => (
        <li key={r.playerId} className={styles.row}>
          <span className={styles.rank}>{i + 2}</span>
          <Link to={`/squad/${r.playerId}`} className={styles.name}>
            {r.name}
          </Link>
          <span className={styles.value}>{format(r[valueKey])}</span>
        </li>
      ))}
    </ol>
  );
}
