'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleThemeMode: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  updateTheme: (settings: any) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleThemeMode: () => {},
  primaryColor: '#E05638',
  setPrimaryColor: () => {},
  updateTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [primaryColor, setPrimaryColorState] = useState<string>('#E05638');
  const [mounted, setMounted] = useState<boolean>(false);

  const applyThemeToDOM = (mode: boolean, primary: string, customColors?: any) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', mode);
    root.classList.toggle('light', !mode);
    root.style.setProperty('--color-primary', primary);

    if (customColors) {
      if (customColors.primaryHover) root.style.setProperty('--color-primary-hover', customColors.primaryHover);
      if (customColors.accentColor || customColors.accent) {
        const accent = customColors.accentColor || customColors.accent;
        root.style.setProperty('--color-accent', accent);
        root.style.setProperty('--color-emerald', accent);
      }
      if (customColors.backgroundDark || customColors.backgroundColor) {
        const bg = mode ? (customColors.backgroundDark || customColors.backgroundColor) : '#f8fafc';
        root.style.setProperty('--color-bg', bg);
        root.style.setProperty('--color-bg-dark', bg);
      }
      if (customColors.cardDark || customColors.cardBackground) {
        const card = mode ? (customColors.cardDark || customColors.cardBackground) : '#ffffff';
        root.style.setProperty('--color-card', card);
        root.style.setProperty('--color-card-dark', card);
      }
    } else {
      if (mode) {
        root.style.setProperty('--color-bg', '#070b13');
        root.style.setProperty('--color-card', '#111726');
      } else {
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card', '#ffffff');
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    const fetchServerTheme = async () => {
      try {
        const res = await fetch('/api/user/theme?userId=usr_admin_1', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const mode = data.themeMode === 'dark';
          const primary = data.primaryColor || '#E05638';
          setIsDarkMode(mode);
          setPrimaryColorState(primary);
          applyThemeToDOM(mode, primary, data);
        }
      } catch (err) {
        console.error('[ThemeProvider] Failed to fetch server theme:', err);
      }
    };
    fetchServerTheme();
  }, []);

  const updateThemeOnServer = async (newSettings: any) => {
    try {
      const payload = {
        userId: 'usr_admin_1',
        themeMode: isDarkMode ? 'dark' : 'light',
        primaryColor,
        ...newSettings
      };

      const res = await fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.theme) {
          const mode = data.theme.themeMode === 'dark';
          const primary = data.theme.primaryColor || primaryColor;
          setIsDarkMode(mode);
          setPrimaryColorState(primary);
          applyThemeToDOM(mode, primary, data.theme);
          window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: data.theme }));
        }
      }
    } catch (err) {
      console.error('[ThemeProvider] Failed to save server theme:', err);
    }
  };

  const toggleThemeMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    applyThemeToDOM(nextMode, primaryColor);
    updateThemeOnServer({ themeMode: nextMode ? 'dark' : 'light', primaryColor });
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    applyThemeToDOM(isDarkMode, color);
    updateThemeOnServer({ themeMode: isDarkMode ? 'dark' : 'light', primaryColor: color });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleThemeMode, primaryColor, setPrimaryColor, updateTheme: updateThemeOnServer }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
