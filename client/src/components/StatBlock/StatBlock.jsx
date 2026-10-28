import { cx } from '../../utils/cx';
import FlipNumber from '../FlipNumber/FlipNumber';
import styles from './StatBlock.module.css';

/**
 * A number printed like a jersey numeral, with a 11px label.
 * size: 'xl' (hero, 120px+) | 'lg' | 'md' | 'sm'
 */
export default function StatBlock({ label, value, suffix, sub, size = 'md', tone, flip = true, className }) {
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const shown = value ?? '–';
  return (
    <div className={cx(styles.block, styles[size], tone && styles[tone], className)}>
      <span className={styles.value}>
        {numeric && flip ? <FlipNumber value={shown} label={label} /> : shown}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
      <span className={styles.label} aria-hidden={numeric && flip ? 'true' : undefined}>
        {label}
      </span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}
