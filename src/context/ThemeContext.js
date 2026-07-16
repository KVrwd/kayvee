import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kv_theme_override'; // 'light' | 'dark' | null (= follow system)

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

const dark = {
  mode: 'dark',
  statusBar: 'light',
  background: '#08090C',
  surface: '#15171C',
  surfaceElevated: '#1D2027',
  surfaceBorder: '#2A2E37',
  textPrimary: '#F5F6F8',
  textSecondary: '#A6ACB9',
  textTertiary: '#666C79',
  buttonPrimary: '#F2F3F5',
  buttonPrimaryText: '#0B0C10',
  accent: '#D9A544',
  success: '#27C281',
  danger: '#FF5C5C',
  divider: '#22252C',
  chartLine: '#D9A544',
};

const light = {
  mode: 'light',
  statusBar: 'dark',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E3E6EC',
  textPrimary: '#14161A',
  textSecondary: '#575D6B',
  textTertiary: '#8A8F9B',
  buttonPrimary: '#14161A',
  buttonPrimaryText: '#FFFFFF',
  accent: '#B3800F',
  success: '#1A9B63',
  danger: '#E2483D',
  divider: '#EBEDF2',
  chartLine: '#B3800F',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [override, setOverride] = useState(null);
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark') setOverride(v);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme || 'dark'));
    return () => sub.remove();
  }, []);

  const setThemeOverride = useCallback((value) => {
    setOverride(value);
    AsyncStorage.setItem(STORAGE_KEY, value ?? '');
  }, []);

  const mode = override || systemScheme || 'dark';
  const theme = useMemo(() => (mode === 'light' ? light : dark), [mode]);

  const value = useMemo(() => ({ theme, mode, radius, setThemeOverride }), [theme, mode, setThemeOverride]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
