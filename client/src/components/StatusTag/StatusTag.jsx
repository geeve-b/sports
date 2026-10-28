import { cx } from '../../utils/cx';
import { STATUS_NAMES } from '../../utils/format';
import styles from './StatusTag.module.css';

/** Fitness status: flood pip (fit), hatch (doubtful), red (injured), red outline (suspended). */
export default function StatusTag({ status = 'fit', className }) {
  return (
    <span className={cx(styles.tag, styles[status], className)}>
      <span className={styles.pip} aria-hidden="true" />
      {STATUS_NAMES[status] ?? status}
    </span>
  );
}
