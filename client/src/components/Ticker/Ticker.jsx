import { useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { announcementsApi } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import styles from './Ticker.module.css';

const ICON_KIND = { live: styles.live, alert: styles.alert, injury: styles.alert };

function Items({ items, hidden }) {
  return items.map((item, i) => (
    <Link
      key={`${item.kind}-${i}`}
      to={item.href ?? '/'}
      className={cx(styles.item, ICON_KIND[item.kind])}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
    >
      <span className={styles.kind}>{item.label}</span>
      <span className={styles.text}>{item.text}</span>
      {item.meta && <span className={styles.meta}>{item.meta}</span>}
    </Link>
  ));
}

/**
 * Infinite marquee of fixtures, results, injuries and notices.
 * Pauses on hover and keyboard focus; static and scrollable with reduced motion.
 */
export default function Ticker() {
  const reduce = useReducedMotion();
  const { data } = useFetch(() => announcementsApi.ticker(), [], { interval: 60_000 });
  const items = data ?? [];
  const live = items.some((i) => i.kind === 'live');
  // Seconds per loop scales with content so the speed stays readable.
  const duration = Math.max(30, items.length * 7);

  return (
    <section className={styles.ticker} aria-label="Club ticker">
      <span className={cx(styles.tag, live && styles.tagLive)}>
        <span className="wp-live-dot" aria-hidden="true" />
        {live ? 'Live' : 'Wildplay'}
      </span>
      <div className={cx(styles.viewport, reduce && styles.static)}>
        {items.length === 0 ? (
          <span className={styles.empty}>— — —</span>
        ) : (
          <div className={styles.track} style={{ animationDuration: `${duration}s` }}>
            <Items items={items} />
            {!reduce && <Items items={items} hidden />}
          </div>
        )}
      </div>
    </section>
  );
}
