import { motion } from 'framer-motion';
import styles from './AvailabilityBar.module.css';

const SEGMENTS = [
  { key: 'available', label: 'Available' },
  { key: 'pending', label: 'No reply' },
  { key: 'unavailable', label: 'Unavailable' },
];

/** Segmented squad-availability bar. summary: { squad, available, pending, unavailable } */
export default function AvailabilityBar({ summary, showLegend = true }) {
  const total = summary?.squad || 0;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const description = SEGMENTS.map((s) => `${summary?.[s.key] ?? 0} ${s.label.toLowerCase()}`).join(', ');

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="img" aria-label={`Squad of ${total}: ${description}`}>
        {SEGMENTS.map((s, i) => (
          <motion.span
            key={s.key}
            className={styles[s.key]}
            initial={{ width: 0 }}
            animate={{ width: `${pct(summary?.[s.key] ?? 0)}%` }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.77, 0, 0.18, 1] }}
          />
        ))}
      </div>
      {showLegend && (
        <dl className={styles.legend}>
          {SEGMENTS.map((s) => (
            <div key={s.key}>
              <dt>
                <span className={`${styles.swatch} ${styles[s.key]}`} aria-hidden="true" />
                {s.label}
              </dt>
              <dd>{summary?.[s.key] ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
