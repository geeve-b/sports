import { cx } from '../../utils/cx';
import styles from './Skeleton.module.css';

const WIDTHS = ['92%', '64%', '78%', '48%', '86%', '58%'];

/** Loading placeholder: rows of blinking scoreboard dashes, never a spinner. */
export default function Skeleton({ rows = 3, label = 'Loading', big = false, className }) {
  return (
    <div className={cx(styles.wrap, className)} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {big && (
        <div className={styles.big} aria-hidden="true">
          <span>–</span>
          <span>–</span>
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row} style={{ width: WIDTHS[i % WIDTHS.length], animationDelay: `${i * 90}ms` }} aria-hidden="true" />
      ))}
    </div>
  );
}

/** Full-page loading state: a dark scoreboard with blinking dashes. */
export function ScoreboardLoader({ label = 'Loading Wildplay' }) {
  return (
    <div className={styles.board} role="status">
      <span className="visually-hidden">{label}</span>
      <div className={styles.boardDigits} aria-hidden="true">
        <span>–</span><span>–</span><b>:</b><span>–</span><span>–</span>
      </div>
      <p className="wp-label mb-0" aria-hidden="true">{label}</p>
    </div>
  );
}
