import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Ticker from '../components/Ticker/Ticker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { cx } from '../utils/cx';
import { initials, pad2 } from '../utils/format';
import styles from './AppShell.module.css';
import { bottomTabsFor, navItemsFor } from './navItems';

function TeamSheet({ items, onNavigate }) {
  return (
    <ol className={styles.sheet}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => cx(styles.sheetLink, isActive && styles.active)}
            >
              <span className={styles.sheetNo} aria-hidden="true">{pad2(i + 1)}</span>
              <span className={styles.sheetLabel}>{item.label}</span>
              <Icon className={styles.sheetIcon} size={16} strokeWidth={1.5} aria-hidden="true" />
            </NavLink>
          </li>
        );
      })}
    </ol>
  );
}

function Crest({ team, season }) {
  return (
    <div className={styles.crest}>
      <span className={styles.crestMark} aria-hidden="true">{team?.shortName ?? 'WP'}</span>
      <span className={styles.crestText}>
        <span className={styles.crestName}>{team?.name ?? 'Wildplay'}</span>
        <span className="wp-label">{season?.name ? `Season ${season.name}` : 'No season set'}</span>
      </span>
    </div>
  );
}

function UserBlock({ user, onSignOut }) {
  const { isNight, toggle } = useTheme();
  return (
    <div className={styles.userBlock}>
      <div className={styles.user}>
        <span className={styles.avatar} aria-hidden="true">
          {user.avatar ? <img src={user.avatar} alt="" /> : initials(user.name)}
        </span>
        <span className={styles.userText}>
          <span className={styles.userName}>{user.name}</span>
          <span className="wp-label">{user.role}</span>
        </span>
      </div>
      <div className={styles.userActions}>
        <button type="button" className={styles.iconBtn} onClick={toggle} aria-label={isNight ? 'Switch to day match theme' : 'Switch to night match theme'}>
          {isNight ? <Sun size={16} strokeWidth={1.5} aria-hidden="true" /> : <Moon size={16} strokeWidth={1.5} aria-hidden="true" />}
          <span>{isNight ? 'Day' : 'Night'}</span>
        </button>
        <button type="button" className={styles.iconBtn} onClick={onSignOut}>
          <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user, team, player, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const mainRef = useRef(null);
  // The wipe only plays once the user has actually moved between pages.
  const firstPath = useRef(location.pathname);
  const navigated = useRef(false);
  if (location.pathname !== firstPath.current) navigated.current = true;

  const items = navItemsFor({ role, player });
  const tabs = bottomTabsFor({ role }).map((to) => items.find((i) => i.to === to)).filter(Boolean);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Move focus to the page on navigation so keyboard and screen-reader users land on the new content.
  // Compare against the previous path (not a first-render flag) so StrictMode's double effect doesn't steal focus.
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <div className={styles.tickerBar}>
        <Ticker />
      </div>

      {/* Mobile top bar */}
      <header className={styles.topbar}>
        <Crest team={team} season={team?.season} />
      </header>

      <div className={styles.body}>
        <aside className={styles.side} aria-label="Team sheet">
          <Crest team={team} season={team?.season} />
          <p className={cx('wp-label', styles.sheetHead)}>Team sheet</p>
          <nav aria-label="Main">
            <TeamSheet items={items} />
          </nav>
          <UserBlock user={user} onSignOut={signOut} />
        </aside>

        <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
          {/* Accent wipe on route change; skipped on first load. */}
          {navigated.current && (
            <motion.div
              key={`wipe-${location.pathname}`}
              className={styles.wipe}
              initial={{ x: '-101%' }}
              animate={{ x: '101%' }}
              transition={{ duration: 0.5, ease: [0.77, 0, 0.18, 1] }}
              aria-hidden="true"
            />
          )}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.16 }}
            className={styles.page}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className={styles.tabbar} aria-label="Primary">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx(styles.tab, isActive && styles.tabActive)}>
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>{item.short}</span>
            </NavLink>
          );
        })}
        <button type="button" className={styles.tab} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
          <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <Offcanvas show={moreOpen} onHide={() => setMoreOpen(false)} placement="end" className={styles.offcanvas}>
        <Offcanvas.Header closeButton closeLabel="Close menu">
          <Offcanvas.Title className="wp-label">Team sheet</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className={styles.offcanvasBody}>
          <nav aria-label="All pages">
            <TeamSheet items={items} onNavigate={() => setMoreOpen(false)} />
          </nav>
          <UserBlock user={user} onSignOut={signOut} />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
