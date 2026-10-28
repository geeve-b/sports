import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle, X } from 'lucide-react';
import { cx } from '../../utils/cx';
import { POSITION_NAMES, surname } from '../../utils/format';
import styles from './FormationBuilder.module.css';

const SPRING = { type: 'spring', stiffness: 520, damping: 34 };
const AVAIL = {
  true: { icon: Check, label: 'available' },
  false: { icon: X, label: 'unavailable' },
  null: { icon: HelpCircle, label: 'no reply' },
};

/**
 * A draggable player. `variant` = 'shirt' (on the pitch) or 'chip' (squad list / bench).
 * Shares a layoutId so moving between pitch, bench and list animates on a spring.
 */
export default function PlayerToken({ player, variant, available, held, onPick, onDragMove, onDrop, locationLabel, describedBy }) {
  const dragged = useRef(false);
  const a = AVAIL[String(available ?? null)];
  const AvailIcon = a.icon;
  const unfit = player.status === 'injured' || player.status === 'suspended' || available === false;

  const label = `#${player.jerseyNumber ?? '–'} ${player.name}, ${POSITION_NAMES[player.position]}, ${a.label}${
    player.status !== 'fit' ? `, ${player.status}` : ''
  }. ${locationLabel}.`;

  return (
    <motion.button
      type="button"
      layoutId={`tok-${player._id}`}
      layout
      transition={SPRING}
      className={cx(styles.token, styles[variant], held && styles.held, unfit && styles.unfit)}
      aria-pressed={held}
      aria-label={label}
      aria-describedby={describedBy}
      drag
      dragSnapToOrigin
      dragElastic={0.65}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 480, bounceDamping: 24 }}
      whileDrag={{ scale: 1.14, rotate: -4, zIndex: 60, cursor: 'grabbing' }}
      whileHover={{ scale: 1.04 }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDrag={(_e, info) => onDragMove(info.point)}
      onDragEnd={(_e, info) => {
        onDrop(player._id, info.point);
        // Swallow the click that follows a drag.
        setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
      onClick={() => {
        if (!dragged.current) onPick(player._id);
      }}
    >
      <span className={styles.shirt} aria-hidden="true">{player.jerseyNumber ?? '–'}</span>
      <span className={styles.tokenName} aria-hidden="true">
        {variant === 'shirt' ? surname(player.name) : player.name}
      </span>
      {variant === 'chip' && (
        <span className={cx(styles.avail, styles[`avail_${String(available ?? null)}`])} aria-hidden="true">
          <AvailIcon size={13} strokeWidth={2} />
        </span>
      )}
    </motion.button>
  );
}
