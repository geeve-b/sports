import { cx } from '../../utils/cx';
import styles from './EmptyState.module.css';

/** A quiet pitch with a line of copy. Use for empty lists and errors. */
export default function EmptyState({ title, children, action, tone = 'quiet', compact = false, className }) {
  return (
    <div className={cx(styles.empty, compact && styles.compact, tone === 'error' && styles.error, className)}>
      <svg className={styles.pitch} viewBox="0 0 120 80" aria-hidden="true">
        <rect x="2" y="2" width="116" height="76" />
        <line x1="60" y1="2" x2="60" y2="78" />
        <circle cx="60" cy="40" r="11" />
        <rect x="2" y="22" width="16" height="36" />
        <rect x="102" y="22" width="16" height="36" />
      </svg>
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        {children && <div className={styles.body}>{children}</div>}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      tone="error"
      title="That didn’t load."
      action={
        onRetry && (
          <button type="button" className="btn btn-chalk btn-sm" onClick={() => onRetry()}>
            Try again
          </button>
        )
      }
    >
      {error?.message ?? 'Something went wrong.'}
    </EmptyState>
  );
}
