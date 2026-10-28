import { cx } from '../../utils/cx';
import styles from './PageHeader.module.css';

/**
 * Page title as a TV lower-third: a flood tab with the section label,
 * the title huge beneath, actions on the right.
 */
export default function PageHeader({ eyebrow, title, meta, actions, className }) {
  return (
    <header className={cx(styles.header, className)}>
      <div className={styles.main}>
        {eyebrow && <p className={cx(styles.eyebrow, 'wp-reveal')}>{eyebrow}</p>}
        <h1 className={cx('wp-title', 'wp-reveal')} style={{ '--d': 1 }}>
          {title}
        </h1>
        {meta && (
          <div className={cx(styles.meta, 'wp-reveal')} style={{ '--d': 2 }}>
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className={cx(styles.actions, 'wp-reveal')} style={{ '--d': 3 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
