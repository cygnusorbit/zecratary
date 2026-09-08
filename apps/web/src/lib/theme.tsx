'use client';
import React, { useEffect } from 'react';

export interface ThemeColors {
  primary: string;         // Brand Accent / Buttons / Active Highlights
  primaryHover: string;    // Button Hover State
  backgroundColor: string; // App Canvas Background
  cardBackground: string;  // Cards, Modals, Drawers & Sidebar
  borderColor: string;     // Container outlines & dividers
  textColor: string;       // Headings & Main Text
  textSecondary: string;   // Subtitles & Muted labels
  accentEmerald: string;   // Secondary badges & status tags
}

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#E05638',
  primaryHover: '#c94529',
  backgroundColor: '#070b13',
  cardBackground: '#111726',
  borderColor: '#1e293b',
  textColor: '#ffffff',
  textSecondary: '#94a3b8',
  accentEmerald: '#10b981',
};

export const THEME_PRESETS = [
  { name: 'Zecratary Coral (Default)', colors: DEFAULT_THEME_COLORS },
  {
    name: 'Emerald Chef',
    colors: {
      primary: '#10b981',
      primaryHover: '#059669',
      backgroundColor: '#061412',
      cardBackground: '#0d2823',
      borderColor: '#134e4a',
      textColor: '#f0fdf4',
      textSecondary: '#6ee7b7',
      accentEmerald: '#E05638'
    }
  },
  {
    name: 'Midnight Amber',
    colors: {
      primary: '#f59e0b',
      primaryHover: '#d97706',
      backgroundColor: '#090d16',
      cardBackground: '#0f172a',
      borderColor: '#1e293b',
      textColor: '#f8fafc',
      textSecondary: '#94a3b8',
      accentEmerald: '#38bdf8'
    }
  },
  {
    name: 'Royal Purple',
    colors: {
      primary: '#a855f7',
      primaryHover: '#9333ea',
      backgroundColor: '#090514',
      cardBackground: '#150d2a',
      borderColor: '#2e1065',
      textColor: '#faf5ff',
      textSecondary: '#c084fc',
      accentEmerald: '#ec4899'
    }
  }
];

export const applyCssThemeVariables = (c: ThemeColors) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', c.primary);
  root.style.setProperty('--color-primary-hover', c.primaryHover);
  root.style.setProperty('--color-bg', c.backgroundColor);
  root.style.setProperty('--color-card', c.cardBackground);
  root.style.setProperty('--color-border', c.borderColor);
  root.style.setProperty('--color-text', c.textColor);
  root.style.setProperty('--color-text-secondary', c.textSecondary);
  root.style.setProperty('--color-emerald', c.accentEmerald);
};

export const getStoredTheme = (): ThemeColors => {
  if (typeof window === 'undefined') return DEFAULT_THEME_COLORS;
  try {
    const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_custom_theme');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        primary: parsed.primary || parsed.primaryColor || DEFAULT_THEME_COLORS.primary,
        primaryHover: parsed.primaryHover || DEFAULT_THEME_COLORS.primaryHover,
        backgroundColor: parsed.backgroundColor || parsed.backgroundDark || DEFAULT_THEME_COLORS.backgroundColor,
        cardBackground: parsed.cardBackground || parsed.cardDark || DEFAULT_THEME_COLORS.cardBackground,
        borderColor: parsed.borderColor || DEFAULT_THEME_COLORS.borderColor,
        textColor: parsed.textColor || parsed.textPrimary || DEFAULT_THEME_COLORS.textColor,
        textSecondary: parsed.textSecondary || DEFAULT_THEME_COLORS.textSecondary,
        accentEmerald: parsed.accentEmerald || parsed.accentGreen || parsed.accentColor || DEFAULT_THEME_COLORS.accentEmerald,
      };
    }
  } catch (e) {}
  return DEFAULT_THEME_COLORS;
};

export const saveStoredTheme = (colors: ThemeColors) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
  applyCssThemeVariables(colors);
  window.dispatchEvent(new Event('zecratary_theme_changed'));
  window.dispatchEvent(new Event('storage'));
};

export const resetStoredTheme = () => {
  saveStoredTheme(DEFAULT_THEME_COLORS);
};

export function ThemeInitializer() {
  useEffect(() => {
    const initTheme = () => {
      const theme = getStoredTheme();
      applyCssThemeVariables(theme);
    };

    initTheme();
    window.addEventListener('zecratary_theme_changed', initTheme);
    window.addEventListener('storage', initTheme);

    return () => {
      window.removeEventListener('zecratary_theme_changed', initTheme);
      window.removeEventListener('storage', initTheme);
    };
  }, []);

  return null;
}
