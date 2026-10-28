import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Recharts takes colour strings, not CSS variables, so resolve the design
 * tokens for the current theme.
 */
export function useChartColors() {
  const { theme } = useTheme();
  return useMemo(() => {
    const night = theme === 'dark';
    return {
      text: night ? '#F2F0E6' : '#0E0F0C',
      muted: night ? 'rgba(242,240,230,.62)' : 'rgba(14,15,12,.66)',
      grid: night ? 'rgba(242,240,230,.12)' : 'rgba(14,15,12,.14)',
      accent: '#E8FF3A',
      // Flood is invisible on chalk, so day-match lines use ink with a flood fill.
      accentLine: night ? '#E8FF3A' : '#0E0F0C',
      accentFill: night ? 'rgba(232,255,58,.18)' : 'rgba(232,255,58,.65)',
      secondary: night ? 'rgba(242,240,230,.55)' : 'rgba(14,15,12,.45)',
      red: '#E5322D',
      surface: night ? '#0E0F0C' : '#F2F0E6',
      font: '"JetBrains Mono", ui-monospace, monospace',
    };
  }, [theme]);
}
