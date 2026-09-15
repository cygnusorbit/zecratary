export interface ThemeColors {
  primary?: string;
  primaryColor?: string;
  primaryHover?: string;
  accentEmerald?: string;
  accentColor?: string;
  accent?: string;
  backgroundColor?: string;
  backgroundDark?: string;
  cardBackground?: string;
  cardBorder?: string;
  textSecondary?: string;
}

export function applyThemeToDocument(colors: ThemeColors | null | undefined): void {
  if (!colors || typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDayMode = localStorage.getItem('zecratary_theme_mode') === 'light';

  const primary = colors.primary || colors.primaryColor;
  const primaryHover = colors.primaryHover;
  const accent = colors.accentEmerald || colors.accentColor || colors.accent;
  const bg = colors.backgroundColor || colors.backgroundDark;
  const card = colors.cardBackground;
  const border = colors.cardBorder;
  const textSec = colors.textSecondary;

  if (primary) {
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--primary', primary);
  }
  if (primaryHover) {
    root.style.setProperty('--color-primary-hover', primaryHover);
    root.style.setProperty('--primary-hover', primaryHover);
  }
  if (accent) {
    root.style.setProperty('--color-emerald', accent);
    root.style.setProperty('--color-accent', accent);
    root.style.setProperty('--accent', accent);
  }

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
    root.style.setProperty('--color-inner-dark', '#f1f5f9');
    if (document.body) {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    if (bg) {
      root.style.setProperty('--color-bg', bg);
      root.style.setProperty('--color-bg-dark', bg);
      root.style.setProperty('--color-inner-dark', bg);
      if (document.body) {
        document.body.style.backgroundColor = bg;
      }
    }
    if (card) {
      root.style.setProperty('--color-card', card);
      root.style.setProperty('--color-card-dark', card);
    }
    if (border) {
      root.style.setProperty('--color-border', border);
      root.style.setProperty('--color-border-dark', border);
    }
    if (textSec) {
      root.style.setProperty('--color-text-secondary', textSec);
    }
    if (document.body) {
      document.body.style.color = '#ffffff';
    }
  }
}

export function saveThemeColors(colors: ThemeColors): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
    localStorage.setItem('zecratary_theme_config', JSON.stringify(colors));
  } catch (_) {}

  applyThemeToDocument(colors);
  window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
  window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: colors }));
  window.dispatchEvent(new Event('storage'));

  try {
    fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors, settings: { themeColors: colors } })
    }).catch(() => {});
  } catch (_) {}
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const cached = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
    if (cached) {
      applyThemeToDocument(JSON.parse(cached));
    }
  } catch (_) {}

  try {
    const res = await fetch('/api/system-settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const colors = data?.settings?.themeColors || data?.themeColors;
      if (data.success && colors) {
        localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
        applyThemeToDocument(colors);
        window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
      }
    }
  } catch (_) {}
}
