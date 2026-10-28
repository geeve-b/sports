import { useCountdown } from '../../hooks/useCountdown';
import { cx } from '../../utils/cx';
import FlipNumber from '../FlipNumber/FlipNumber';
import styles from './Countdown.module.css';

/** Huge split-flap countdown to kick-off. */
export default function Countdown({ target, className }) {
  const { days, hours, minutes, seconds, done } = useCountdown(target);

  if (done) {
    return (
      <p className={cx(styles.kickoff, className)}>
        <span className="wp-live-dot" aria-hidden="true" /> Kick-off
      </p>
    );
  }

  const units = [
    { label: days === 1 ? 'Day' : 'Days', value: days },
    { label: 'Hrs', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds, small: true },
  ];

  return (
    <div className={cx(styles.countdown, className)} role="timer" aria-label={`${days} days, ${hours} hours, ${minutes} minutes to kick-off`}>
      {units.map((u, i) => (
        <div key={u.label} className={cx(styles.unit, u.small && styles.sec)} aria-hidden="true">
          <FlipNumber value={u.value} pad={2} tiles />
          <span className={styles.label}>{u.label}</span>
          {i < units.length - 1 && <span className={styles.colon}>:</span>}
        </div>
      ))}
    </div>
  );
}
