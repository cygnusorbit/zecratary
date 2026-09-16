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
  cardBorder?: string;
  textSecondary?: string;
}

// In-memory theme store cache (Zero LocalStorage)
let memoryThemeColors: ThemeColors | null = null;

export function setMemoryThemeColors(colors: ThemeColors | null | undefined): void {
  if (colors) {
    memoryThemeColors = { ...colors };
  }
}

export function getMemoryThemeColors(): ThemeColors | null {
  return memoryThemeColors;
}

export async function saveThemeColors(colors: ThemeColors): Promise<void> {
  setMemoryThemeColors(colors);
  try {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors })
    });
  } catch (_) {}
}

export function applyThemeToDocument(colors: ThemeColors | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDayMode = typeof window !== 'undefined' && (localStorage.getItem('zecratary_theme_mode') === 'light' || localStorage.getItem('zecratary_theme_mode') === 'day');

  const activeColors = colors || memoryThemeColors;

  if (activeColors) {
    const p = activeColors.primary || activeColors.primaryColor || '#E05638';
    const ph = activeColors.primaryHover || '#c94529';
    const ac = activeColors.accentEmerald || activeColors.accentColor || activeColors.accent || '#10b981';
    const sbi = activeColors.sidebarIconColor || activeColors.sidebarIcon || ac;
    const bg = activeColors.backgroundColor || activeColors.backgroundDark || '#070b13';
    const card = activeColors.cardBackground || '#0b0f17';
    const border = activeColors.cardBorder || '#1e293b';
    const textSec = activeColors.textSecondary || '#94a3b8';

    root.style.setProperty('--color-primary', p);
    root.style.setProperty('--color-primary-hover', ph);
    root.style.setProperty('--color-accent', ac);
    root.style.setProperty('--color-emerald', ac);
    root.style.setProperty('--color-sidebar-icon', sbi);

    if (isDayMode) {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.setProperty('--color-bg', '#f8fafc');
      root.style.setProperty('--color-bg-dark', '#f8fafc');
      root.style.setProperty('--color-card', '#ffffff');
      root.style.setProperty('--color-card-dark', '#ffffff');
      root.style.setProperty('--color-border', '#e2e8f0');
      root.style.setProperty('--color-border-dark', '#e2e8f0');
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
      root.style.setProperty('--color-text', '#ffffff');
      root.style.setProperty('--color-text-secondary', textSec);
      if (document.body) {
        document.body.style.backgroundColor = bg;
        document.body.style.color = '#ffffff';
      }
    }
  }
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;
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
