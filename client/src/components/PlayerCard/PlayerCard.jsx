import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cx } from '../../utils/cx';
import styles from './PlayerCard.module.css';

const POSITIONS = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' };
const STATUSES = { fit: 'Fit', doubtful: 'Doubtful', injured: 'Injured', suspended: 'Suspended' };
const TILT = 6; // degrees, max

/**
 * Trading-card tile. The jersey number is printed huge behind the name and
 * scales up on hover/focus; the card tilts toward the pointer (mouse only).
 *
 * player: { name, jerseyNumber, position: 'GK'|'DF'|'MF'|'FW', status, stats: { apps, goals, assists } }
 */
export default function PlayerCard({ player, to, index = 0, className }) {
  const reduce = useReducedMotion();
  const { name, jerseyNumber, position, status = 'fit', stats = {} } = player;
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : parts[0];
  const first = parts.length ? parts.join(' ') : '';

  // Pointer-driven tilt, sprung so it settles naturally.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 260, damping: 22 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-TILT, TILT]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [TILT, -TILT]), spring);

  const onPointerMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onPointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const Name = to ? Link : 'span';

  return (
    <motion.article
      className={cx(styles.card, styles[status], className)}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      initial={reduce ? false : { opacity: 0, x: -28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.77, 0, 0.18, 1] }}
    >
      <span className={styles.number} aria-hidden="true">{jerseyNumber}</span>

      <header className={styles.top}>
        <span className={styles.pos} title={POSITIONS[position]}>{position}</span>
        <span className={styles.status}>
          <span className={styles.pip} aria-hidden="true" />
          {STATUSES[status]}
        </span>
      </header>

      <div className={styles.name}>
        {first && <span className={styles.first}>{first}</span>}
        <h3 className={styles.last}>
          <Name {...(to ? { to } : {})} className={cx(styles.link, to && 'stretched-link')}>
            <span className="visually-hidden">#{jerseyNumber} {first} </span>
            {last}
          </Name>
        </h3>
      </div>

      <dl className={styles.stats}>
        <div><dt>Apps</dt><dd>{stats.apps ?? 0}</dd></div>
        <div><dt>Goals</dt><dd>{stats.goals ?? 0}</dd></div>
        <div><dt>Assists</dt><dd>{stats.assists ?? 0}</dd></div>
      </dl>
    </motion.article>
  );
}
