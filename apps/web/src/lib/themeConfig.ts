// Global Server-Backed Theme Engine & Memory Store
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
  [key: string]: any;
}

let memoryThemeColors: ThemeColors | null = null;

export function setMemoryThemeColors(colors: ThemeColors | null | undefined): void {
  if (colors && Object.keys(colors).length > 0) {
    memoryThemeColors = { ...(memoryThemeColors || {}), ...colors };
  }
}

export function getMemoryThemeColors(): ThemeColors | null {
  return memoryThemeColors;
}

export function getEffectiveThemeMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const mode = localStorage.getItem('zecratary_theme_mode');
    if (mode === 'light' || mode === 'day') return 'light';
    if (mode === 'dark') return 'dark';
  } catch (_) {}
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('light')) return 'light';
    if (document.documentElement.classList.contains('dark')) return 'dark';
  }
  return 'dark';
}

export function applyThemeToDocument(colors?: ThemeColors | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDayMode = getEffectiveThemeMode() === 'light';

  const activeColors = (colors && Object.keys(colors).length > 0) ? colors : memoryThemeColors;

  if (activeColors) {
    setMemoryThemeColors(activeColors);
    const p = activeColors.primary || activeColors.primaryColor || '#E05638';
    const ph = activeColors.primaryHover || '#c94529';
    const ac = activeColors.accentEmerald || activeColors.accentColor || activeColors.accent || '#10b981';
    const sbi = activeColors.sidebarIconColor || activeColors.sidebarIcon || ac;
    const bg = activeColors.backgroundColor || activeColors.backgroundDark || '#070b13';
    const card = activeColors.cardBackground || activeColors.cardDark || '#0b0f17';
    const border = activeColors.cardBorder || activeColors.borderColor || '#1e293b';
    const textSec = activeColors.textSecondary || '#94a3b8';
    const txt = activeColors.textColor || '#ffffff';

    root.style.setProperty('--color-primary', p);
    root.style.setProperty('--color-primary-hover', ph);
    root.style.setProperty('--color-accent', ac);
    root.style.setProperty('--color-emerald', ac);
    root.style.setProperty('--color-sidebar-icon', sbi);

    if (isDayMode) {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.setProperty('--color-bg', '#f8fafc');
      root.style.setProperty('--color-background', '#f8fafc');
      root.style.setProperty('--color-bg-dark', '#f8fafc');
      root.style.setProperty('--color-card', '#ffffff');
      root.style.setProperty('--color-card-dark', '#ffffff');
      root.style.setProperty('--color-inner-dark', '#f1f5f9');
      root.style.setProperty('--color-border', '#e2e8f0');
      root.style.setProperty('--color-border-dark', '#e2e8f0');
      root.style.setProperty('--color-text', '#0f172a');
      root.style.setProperty('--color-text-secondary', '#64748b');
      if (document.body) {
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
        document.body.style.transition = 'background-color 200ms ease, color 200ms ease';
      }
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.setProperty('--color-bg', bg);
      root.style.setProperty('--color-background', bg);
      root.style.setProperty('--color-bg-dark', bg);
      root.style.setProperty('--color-card', card);
      root.style.setProperty('--color-card-dark', card);
      root.style.setProperty('--color-inner-dark', '#070b13');
      root.style.setProperty('--color-border', border);
      root.style.setProperty('--color-border-dark', border);
      root.style.setProperty('--color-text', txt);
      root.style.setProperty('--color-text-secondary', textSec);
      if (document.body) {
        document.body.style.backgroundColor = bg;
        document.body.style.color = txt;
        document.body.style.transition = 'background-color 200ms ease, color 200ms ease';
      }
    }
  } else {
    if (isDayMode) {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.setProperty('--color-bg', '#f8fafc');
      root.style.setProperty('--color-card', '#ffffff');
      root.style.setProperty('--color-border', '#e2e8f0');
      root.style.setProperty('--color-text', '#0f172a');
      if (document.body) {
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
      }
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      if (document.body) {
        document.body.style.backgroundColor = '#070b13';
        document.body.style.color = '#ffffff';
      }
    }
  }
}

export function setThemeMode(mode: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zecratary_theme_mode', mode);
  } catch (_) {}
  applyThemeToDocument();
  window.dispatchEvent(new CustomEvent('zecratary_theme_mode_changed', { detail: { mode } }));
  window.dispatchEvent(new Event('zecratary_theme_changed'));
}

export function toggleThemeMode(): 'light' | 'dark' {
  const current = getEffectiveThemeMode();
  const next = current === 'light' ? 'dark' : 'light';
  setThemeMode(next);
  return next;
}

export async function saveThemeColors(colors: ThemeColors): Promise<void> {
  setMemoryThemeColors(colors);
  if (typeof window !== 'undefined') {
    applyThemeToDocument(colors);
    window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: colors }));
    window.dispatchEvent(new Event('zecratary_theme_changed'));
  }

  try {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors })
    });
  } catch (_) {}

  try {
    await fetch('/api/user/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors })
    });
  } catch (_) {}
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const theme = data?.themeColors || data?.settings?.themeColors;
      if (theme && Object.keys(theme).length > 0) {
        setMemoryThemeColors(theme);
        applyThemeToDocument(theme);
        return;
      }
    }
  } catch (_) {}

  try {
    const uRes = await fetch('/api/user/theme', { cache: 'no-store' });
    if (uRes.ok) {
      const uData = await uRes.json();
      if (uData?.themeColors && Object.keys(uData.themeColors).length > 0) {
        setMemoryThemeColors(uData.themeColors);
        applyThemeToDocument(uData.themeColors);
      }
    }
  } catch (_) {}
}
