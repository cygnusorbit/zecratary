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

  if (primary) {
    root.style.setProperty('--color-primary', primary);
  }
  if (primaryHover) {
    root.style.setProperty('--color-primary-hover', primaryHover);
  }
  if (accent) {
    root.style.setProperty('--color-emerald', accent);
    root.style.setProperty('--color-accent', accent);
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
      if (document.body) {
        document.body.style.backgroundColor = bg;
      }
    }
    if (colors.cardBackground) {
      root.style.setProperty('--color-card', colors.cardBackground);
      root.style.setProperty('--color-card-dark', colors.cardBackground);
    }
    if (colors.cardBorder) {
      root.style.setProperty('--color-border', colors.cardBorder);
      root.style.setProperty('--color-border-dark', colors.cardBorder);
    }
    if (colors.textSecondary) {
      root.style.setProperty('--color-text-secondary', colors.textSecondary);
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
      body: JSON.stringify({ themeColors: colors })
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
      if (data.success && data.settings?.themeColors) {
        const colors = data.settings.themeColors;
        localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
        applyThemeToDocument(colors);
        window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
      }
    }
  } catch (_) {}
}
