'use client';

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

export const AVAILABLE_FONTS = [
  { id: 'Inter', name: 'Inter', family: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: 'Outfit', name: 'Outfit', family: "'Outfit', system-ui, sans-serif" },
  { id: 'Poppins', name: 'Poppins', family: "'Poppins', system-ui, sans-serif" },
  { id: 'Roboto', name: 'Roboto', family: "'Roboto', system-ui, sans-serif" },
  { id: 'System Default', name: 'System Default', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
];

let inMemoryThemeColors: ThemeColors | null = null;

export function setMemoryThemeColors(colors: ThemeColors): void {
  inMemoryThemeColors = { ...colors };
}

export function getMemoryThemeColors(): ThemeColors | null {
  return inMemoryThemeColors;
}

export function applyGlobalFont(fontName?: string, fontSize?: string, letterSpacing?: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  let targetFont = fontName || (typeof localStorage !== 'undefined' ? localStorage.getItem('zecratary_font_family') : null) || 'Inter';
  let targetSize = fontSize || (typeof localStorage !== 'undefined' ? localStorage.getItem('zecratary_font_size') : null) || '16px';
  let targetSpacing = letterSpacing || (typeof localStorage !== 'undefined' ? localStorage.getItem('zecratary_font_spacing') : null) || '0em';

  const matched = AVAILABLE_FONTS.find(f => f.id.toLowerCase() === targetFont.toLowerCase() || f.name.toLowerCase() === targetFont.toLowerCase());
  const familyValue = matched ? matched.family : targetFont;

  root.style.setProperty('--font-family', familyValue);
  root.style.setProperty('--font-family-base', familyValue);
  root.style.setProperty('--font-size-base', targetSize);
  root.style.setProperty('--font-letter-spacing', targetSpacing);

  if (document.body) {
    document.body.style.fontFamily = familyValue;
  }
}

export function saveThemeColors(colors: ThemeColors): void {
  setMemoryThemeColors(colors);
  applyThemeToDocument(colors);
}

export function applyThemeToDocument(colors?: ThemeColors | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  let isDayMode = false;
  try {
    const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
    isDayMode = mode === 'light' || mode === 'day';
  } catch (_) {}

  const active = colors || inMemoryThemeColors;

  const p = active?.primary || active?.primaryColor || '#E05638';
  const ph = active?.primaryHover || '#c94529';
  const ac = active?.accentEmerald || active?.accentColor || active?.accent || '#10b981';
  const sbi = active?.sidebarIconColor || active?.sidebarIcon || ac;
  const bg = active?.backgroundColor || active?.backgroundDark || '#070b13';
  const card = active?.cardBackground || '#0b0f17';
  const border = active?.cardBorder || '#1e293b';
  const textSec = active?.textSecondary || '#94a3b8';

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
      document.body.style.transition = 'background-color 200ms ease, color 200ms ease';
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
      document.body.style.transition = 'background-color 200ms ease, color 200ms ease';
    }
  }
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const settings = data?.settings || data;
      const tc = settings?.themeColors || settings?.theme_colors;
      if (tc) {
        setMemoryThemeColors(tc);
        applyThemeToDocument(tc);
      }
      if (settings?.fontFamily || settings?.font_family) {
        applyGlobalFont(
          settings.fontFamily || settings.font_family,
          settings.fontSize || settings.font_size,
          settings.fontLetterSpacing || settings.letter_spacing
        );
      }
    }
  } catch (_) {}
}
