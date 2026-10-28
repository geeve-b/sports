import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import styles from './Auth.module.css';

/**
 * Stadium entry ticket: main body + perforated stub. Shared by login and register.
 */
export function Ticket({ title, kicker, stub, children }) {
  return (
    <motion.div
      className={styles.ticket}
      initial={{ opacity: 0, y: 24, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
    >
      <div className={styles.ticketMain}>
        <div className={styles.ticketHead}>
          <h1 className={styles.ticketTitle}>{title}</h1>
          <span className="wp-label wp-num">{kicker}</span>
        </div>
        {children}
      </div>
      <div className={styles.stub} aria-hidden="true">
        {stub}
        <div className={styles.barcode} />
      </div>
    </motion.div>
  );
}

/** Left-hand column: the club name stencilled huge, like a stand sign. */
export function AuthLayout({ children, side }) {
  const { isNight, toggle } = useTheme();
  return (
    <div className={styles.page}>
      <header className={styles.brand}>
        <p className={styles.brandName}>
          Wild<span>play</span>
        </p>
        <div className={styles.brandSide}>{side}</div>
        <button type="button" className={styles.themeBtn} onClick={toggle}>
          {isNight ? <Sun size={14} strokeWidth={1.5} aria-hidden="true" /> : <Moon size={14} strokeWidth={1.5} aria-hidden="true" />}
          {isNight ? 'Day match' : 'Night match'}
        </button>
      </header>
      <main className={styles.gate}>{children}</main>
    </div>
  );
}
