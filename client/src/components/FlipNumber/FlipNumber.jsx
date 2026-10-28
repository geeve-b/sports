import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cx } from '../../utils/cx';
import styles from './FlipNumber.module.css';

const EASE = [0.77, 0, 0.18, 1];

/**
 * Split-flap scoreboard digits. Each digit flips independently when it
 * changes (and on first load), staggered right to left like a real board.
 * Screen readers get the plain value; the flaps are aria-hidden.
 */
export default function FlipNumber({ value, pad = 0, tiles = false, label, className }) {
  const reduce = useReducedMotion();
  const text = String(value ?? 0).padStart(pad, '0');
  const digits = text.split('');

  return (
    <span className={cx(styles.flip, tiles && styles.tiles, className)}>
      <span className="visually-hidden">{label ? `${label}: ${text}` : text}</span>
      {digits.map((d, i) => {
        // Key by position from the right so "9 → 10" flips the units, adds a tens.
        const slot = digits.length - i;
        return (
          <span key={slot} className={styles.cell} aria-hidden="true">
            <AnimatePresence initial={!reduce}>
              <motion.span
                key={d}
                className={styles.digit}
                initial={reduce ? false : { rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.42, delay: reduce ? 0 : (slot - 1) * 0.07, ease: EASE }}
              >
                {d}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
