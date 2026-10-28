import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { cx } from '../../utils/cx';
import { fmtDate } from '../../utils/format';
import styles from './FormGuide.module.css';

const WORD = { W: 'Won', D: 'Drew', L: 'Lost' };

/** Last results as W/D/L tiles, oldest on the left. items: [{ result, opponent, score, date, homeAway }] */
export default function FormGuide({ items = [], size = 'md', className }) {
  if (!items.length) return <p className="wp-meta mb-0">No results yet.</p>;
  return (
    <ol className={cx(styles.form, styles[size], className)} aria-label="Form, oldest to newest">
      {items.map((m) => {
        const tip = `${WORD[m.result]} ${m.score?.for}–${m.score?.against} ${m.homeAway === 'away' ? 'at' : 'v'} ${m.opponent} · ${fmtDate(m.date, { day: 'numeric', month: 'short' })}`;
        return (
          <OverlayTrigger key={m._id ?? m.date} placement="top" overlay={<Tooltip>{tip}</Tooltip>}>
            <li className={cx(styles.tile, styles[m.result])} tabIndex={0} aria-label={tip}>
              {m.result}
            </li>
          </OverlayTrigger>
        );
      })}
    </ol>
  );
}
