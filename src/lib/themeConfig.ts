// Generated / Updated by AI Collaborator - Dynamic CSS Variables & Smooth Day/Dark Transitions
'use client';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  backgroundDark: string;
  cardDark: string;
  innerDark: string;
  borderColor: string;
  accentEmerald: string;
  textColor: string;
  textSecondary: string;
  [key: string]: string;
}

export const DEFAULT_THEME: ThemeColors = {
  primary: '#E05638',
  primaryHover: '#c94529',
  backgroundDark: '#070b13',
  cardDark: '#111726',
  innerDark: '#0B101D',
  borderColor: '#1e293b',
  accentEmerald: '#10b981',
  textColor: '#ffffff',
  textSecondary: '#94a3b8'
};

export function applyTheme(isDayMode: boolean, customColors?: Partial<ThemeColors>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const c = { ...DEFAULT_THEME, ...(customColors || {}) };

  root.style.setProperty('--color-primary', c.primary);
  root.style.setProperty('--color-primary-hover', c.primaryHover);
  root.style.setProperty('--color-emerald', c.accentEmerald);
  root.style.setProperty('--color-accent', c.accentEmerald);

  if (isDayMode) {
    root.style.setProperty('--color-bg-dark', '#f8fafc');
    root.style.setProperty('--color-background', '#f8fafc');
    root.style.setProperty('--color-bg', '#f8fafc');
    root.style.setProperty('--color-card-dark', '#ffffff');
    root.style.setProperty('--color-card', '#ffffff');
    root.style.setProperty('--color-inner-dark', '#f1f5f9');
    root.style.setProperty('--color-border', '#e2e8f0');
    root.style.setProperty('--color-text', '#0f172a');
    root.style.setProperty('--color-text-secondary', '#64748b');
    if (document.body) document.body.style.backgroundColor = '#f8fafc';
  } else {
    root.style.setProperty('--color-bg-dark', c.backgroundDark);
    root.style.setProperty('--color-background', c.backgroundDark);
    root.style.setProperty('--color-bg', c.backgroundDark);
    root.style.setProperty('--color-card-dark', c.cardDark);
    root.style.setProperty('--color-card', c.cardDark);
    root.style.setProperty('--color-inner-dark', c.innerDark);
    root.style.setProperty('--color-border', c.borderColor);
    root.style.setProperty('--color-text', c.textColor);
    root.style.setProperty('--color-text-secondary', c.textSecondary);
    if (document.body) document.body.style.backgroundColor = '';
  }
}
