import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'wp-theme';
const META_COLOR = { dark: '#0E0F0C', light: '#F2F0E6' };

const initialTheme = () => {
  const attr = document.documentElement.getAttribute('data-bs-theme');
  return attr === 'light' ? 'light' : 'dark';
};

// Night match = Bootstrap "dark", Day match = Bootstrap "light".
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme]);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode: theme just won't persist */
    }
  }, [theme]);

  const setTheme = useCallback((t) => setThemeState(t === 'light' ? 'light' : 'dark'), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, setTheme, toggle, isNight: theme === 'dark' }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
