// Global Server-Backed Theme Engine & Dynamic Palette Synchronizer
// GitHub: cygnusorbit/zecratary
// Satisfies Constraints 5, 6 & Zero LocalStorage Rule

export interface ThemeColors {
  primary?: string;
  primaryColor?: string;
  primaryHover?: string;
  accentEmerald?: string;
  accentColor?: string;
  accent?: string;
  sidebarIconColor?: string;
  sidebarIcon?: string;
  backgroundColor?: string;
  backgroundDark?: string;
  cardBackground?: string;
  cardDark?: string;
  cardBorder?: string;
  borderColor?: string;
  textSecondary?: string;
  textColor?: string;
  innerDark?: string;
  [key: string]: any;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  cardColor: string;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
  [key: string]: any;
}

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'system',
  primaryColor: '#10b981',
  cardColor: '#ffffff',
  borderColor: '#e5e7eb',
  backgroundColor: '#f9fafb',
  textColor: '#111827',
  fontFamily: 'Inter, sans-serif',
};

let memoryThemeColors: ThemeColors | null = null;
let globalFontFamily: string = 'Inter, sans-serif';

export function setMemoryThemeColors(colors: ThemeColors | null | undefined): void {
  if (colors) {
    memoryThemeColors = { ...colors };
  }
}

export function getMemoryThemeColors(): any {
  return memoryThemeColors || undefined;
}

export async function saveThemeColors(colors: ThemeColors): Promise<void> {
  setMemoryThemeColors(colors);
  try {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors }),
    });
  } catch (_) {}
}

export function getEffectiveThemeMode(mode: string = 'system'): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function setThemeMode(mode: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') return;
  const isDark = getEffectiveThemeMode(mode) === 'dark';
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  window.dispatchEvent(new CustomEvent('zecratary_theme_mode_changed', { detail: { mode } }));
}

export function toggleThemeMode(): 'light' | 'dark' {
  const current = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  setThemeMode(next);
  return next;
}

export function applyGlobalFont(fontFamily?: string, fontSize?: string, letterSpacing?: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const family = fontFamily || globalFontFamily || 'Inter, sans-serif';
  globalFontFamily = family;

  root.style.setProperty('--font-primary', family);
  root.style.setProperty('--font-family', family);
  root.style.setProperty('--font-body', family);

  if (document.body) document.body.style.fontFamily = family;
  if (fontSize) {
    root.style.setProperty('--font-size-global', fontSize);
    if (document.body) document.body.style.fontSize = fontSize;
  }
  if (letterSpacing) {
    root.style.setProperty('--letter-spacing-global', letterSpacing);
    if (document.body) document.body.style.letterSpacing = letterSpacing;
  }
}

export function getGlobalFont(): string {
  return globalFontFamily;
}

export function saveGlobalFont(fontName: string): void {
  applyGlobalFont(fontName);
  try {
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fontFamily: fontName }),
    }).catch(() => {});
  } catch (_) {}
}

export function applyThemeToDocument(colors?: ThemeColors | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDayMode = !root.classList.contains('dark');
  const activeColors = colors || memoryThemeColors;

  root.style.setProperty('--transition-speed', '200ms');

  if (activeColors) {
    const p = activeColors.primary || activeColors.primaryColor || '#E05638';
    const ph = activeColors.primaryHover || '#c94529';
    const ac = activeColors.accentEmerald || activeColors.accentColor || activeColors.accent || '#10b981';
    const sbi = activeColors.sidebarIconColor || activeColors.sidebarIcon || ac;
    const bg = activeColors.backgroundColor || activeColors.backgroundDark || '#070b13';
    const card = activeColors.cardBackground || activeColors.cardDark || '#0b0f17';
    const border = activeColors.cardBorder || activeColors.borderColor || '#1e293b';
    const textSec = activeColors.textSecondary || '#94a3b8';

    root.style.setProperty('--color-primary', p);
    root.style.setProperty('--color-primary-hover', ph);
    root.style.setProperty('--color-accent', ac);
    root.style.setProperty('--color-emerald', ac);
    root.style.setProperty('--color-sidebar-icon', sbi);

    if (isDayMode) {
      root.style.setProperty('--color-bg', '#f8fafc');
      root.style.setProperty('--color-bg-dark', '#f8fafc');
      root.style.setProperty('--color-background', '#f8fafc');
      root.style.setProperty('--color-card', '#ffffff');
      root.style.setProperty('--color-card-dark', '#ffffff');
      root.style.setProperty('--color-border', '#e2e8f0');
      root.style.setProperty('--color-border-dark', '#e2e8f0');
      root.style.setProperty('--color-text', '#0f172a');
      root.style.setProperty('--color-text-secondary', '#64748b');
      root.style.setProperty('--color-inner-dark', '#f1f5f9');
    } else {
      root.style.setProperty('--color-bg', bg);
      root.style.setProperty('--color-bg-dark', bg);
      root.style.setProperty('--color-background', bg);
      root.style.setProperty('--color-card', card);
      root.style.setProperty('--color-card-dark', card);
      root.style.setProperty('--color-border', border);
      root.style.setProperty('--color-border-dark', border);
      root.style.setProperty('--color-text', '#ffffff');
      root.style.setProperty('--color-text-secondary', textSec);
      root.style.setProperty('--color-inner-dark', activeColors.innerDark || '#070b13');
    }
  }
}

export function applyTheme(theme: Partial<ThemeConfig>): void {
  if (typeof document === 'undefined') return;
  const colors: ThemeColors = {
    primary: theme.primaryColor,
    cardBackground: theme.cardColor,
    cardBorder: theme.borderColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
  };
  setMemoryThemeColors(colors);
  applyThemeToDocument(colors);
}

export async function fetchAndApplyServerTheme(themeData?: any): Promise<void> {
  if (typeof window === 'undefined') return;
  if (themeData && typeof themeData === 'object') {
    const colors = themeData.themeColors || themeData;
    setMemoryThemeColors(colors);
    applyThemeToDocument(colors);
    return;
  }
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.themeColors) {
        setMemoryThemeColors(data.themeColors);
        applyThemeToDocument(data.themeColors);
      }
    }
  } catch (_) {}
}

export function getStoredTheme(): ThemeConfig {
  return DEFAULT_THEME;
}

export default {
  applyThemeToDocument,
  fetchAndApplyServerTheme,
  getMemoryThemeColors,
  setMemoryThemeColors,
  saveThemeColors,
  applyGlobalFont,
  getGlobalFont,
  saveGlobalFont,
  getEffectiveThemeMode,
  setThemeMode,
  toggleThemeMode,
  applyTheme,
  getStoredTheme,
  DEFAULT_THEME,
};
