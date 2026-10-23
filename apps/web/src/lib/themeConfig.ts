// Global Server-Backed Theme Engine (Constraint 5 & 6)
// GitHub: cygnusorbit/zecratary

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
  textColor?: string;
  textSecondary?: string;
  innerDark?: string;
  fontFamily?: string;
  fontSize?: string;
  fontLetterSpacing?: string;
  [key: string]: any;
}

let memoryThemeColors: ThemeColors = {
  primary: '#10b981',
  primaryColor: '#10b981',
  primaryHover: '#059669',
  accentEmerald: '#10b981',
  backgroundColor: '#070b13',
  backgroundDark: '#070b13',
  cardBackground: '#0f172a',
  cardBorder: '#1e293b',
  textSecondary: '#94a3b8',
};

export function getMemoryThemeColors(): ThemeColors {
  return memoryThemeColors;
}

export function setMemoryThemeColors(colors: Partial<ThemeColors>): void {
  memoryThemeColors = { ...memoryThemeColors, ...colors };
}

export function getEffectiveThemeMode(fallback: 'light' | 'dark' = 'dark'): 'light' | 'dark' {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem('zecratary_theme_mode');
    if (stored === 'light' || stored === 'day') return 'light';
    if (stored === 'dark' || stored === 'night') return 'dark';
    if (document.documentElement.classList.contains('light')) return 'light';
    if (document.documentElement.classList.contains('dark')) return 'dark';
  } catch (_) {}
  return fallback;
}

export function getThemeMode(): 'light' | 'dark' {
  return getEffectiveThemeMode('dark');
}

export function isDayMode(): boolean {
  return getEffectiveThemeMode('dark') === 'light';
}

export function isDarkMode(): boolean {
  return getEffectiveThemeMode('dark') === 'dark';
}

export function applyGlobalFont(fontFamily?: string, fontSize?: string, letterSpacing?: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (fontFamily) root.style.setProperty('--font-custom', fontFamily);
  if (fontSize) root.style.setProperty('--font-size-base', fontSize);
  if (letterSpacing) root.style.setProperty('--font-letter-spacing', letterSpacing);
}

// Optional parameter arity: allows applyThemeToDocument() with zero arguments
export function applyThemeToDocument(colors: ThemeColors | null | undefined = null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const activeColors = colors || memoryThemeColors;

  if (colors) {
    memoryThemeColors = { ...memoryThemeColors, ...colors };
  }

  const effectiveMode = getEffectiveThemeMode('dark');
  const isDay = effectiveMode === 'light';

  const p = activeColors.primary || activeColors.primaryColor || '#10b981';
  const ph = activeColors.primaryHover || '#059669';
  const ac = activeColors.accentEmerald || activeColors.accentColor || activeColors.accent || '#10b981';
  const bg = activeColors.backgroundColor || activeColors.backgroundDark || '#070b13';
  const card = activeColors.cardBackground || activeColors.cardDark || '#0f172a';
  const border = activeColors.cardBorder || activeColors.borderColor || '#1e293b';
  const textSec = activeColors.textSecondary || '#94a3b8';

  root.style.setProperty('--color-primary', p);
  root.style.setProperty('--color-primary-hover', ph);
  root.style.setProperty('--color-accent', ac);
  root.style.setProperty('--color-emerald', ac);

  if (isDay) {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.setProperty('--color-bg', '#f8fafc');
    root.style.setProperty('--color-bg-dark', '#f8fafc');
    root.style.setProperty('--color-card', '#ffffff');
    root.style.setProperty('--color-card-dark', '#ffffff');
    root.style.setProperty('--color-border', '#e2e8f0');
    root.style.setProperty('--color-border-dark', '#e2e8f0');
    root.style.setProperty('--color-inner-dark', '#f1f5f9');
    root.style.setProperty('--color-text', '#0f172a');
    root.style.setProperty('--color-text-secondary', '#64748b');
    if (document.body) {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.style.setProperty('--color-bg', bg);
    root.style.setProperty('--color-bg-dark', bg);
    root.style.setProperty('--color-card', card);
    root.style.setProperty('--color-card-dark', card);
    root.style.setProperty('--color-border', border);
    root.style.setProperty('--color-border-dark', border);
    root.style.setProperty('--color-inner-dark', '#111726');
    root.style.setProperty('--color-text', '#ffffff');
    root.style.setProperty('--color-text-secondary', textSec);
    if (document.body) {
      document.body.style.backgroundColor = bg;
      document.body.style.color = '#ffffff';
    }
  }

  if (document.body) {
    document.body.style.transition = 'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)';
  }
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const settings = data.settings || data;
      if (settings?.themeColors || settings?.theme_colors) {
        const colors = settings.themeColors || settings.theme_colors;
        applyThemeToDocument(colors);
      }
    }
  } catch (_) {}
}

export async function saveThemeColors(newColors: ThemeColors): Promise<void> {
  memoryThemeColors = { ...memoryThemeColors, ...newColors };
  applyThemeToDocument(memoryThemeColors);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('zecratary_theme_colors', JSON.stringify(memoryThemeColors));
      window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: memoryThemeColors }));
      await fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryThemeColors),
      }).catch(() => {});
    } catch (_) {}
  }
}

export default {
  applyThemeToDocument,
  getEffectiveThemeMode,
  getThemeMode,
  isDayMode,
  isDarkMode,
  fetchAndApplyServerTheme,
  saveThemeColors,
  applyGlobalFont,
  getMemoryThemeColors,
  setMemoryThemeColors,
};
