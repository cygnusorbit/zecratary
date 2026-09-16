// Server-backed Theme Palette Engine
// Zero browser localStorage writes

import { persistServerAdminSettings } from '@/lib/adminSync';

export function applyThemeToDocument(colors?: any): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!colors) return;
  try {
    const p = colors.primary || colors.primaryColor || '#E05638';
    const ph = colors.primaryHover || '#c94529';
    const ac = colors.accentEmerald || colors.accentColor || colors.accent || '#10b981';
    const sbi = colors.sidebarIconColor || colors.sidebarIcon || ac;
    const bg = colors.backgroundColor || colors.backgroundDark || '#070b13';
    const card = colors.cardBackground || '#0b0f17';
    const border = colors.cardBorder || '#1e293b';
    const textSec = colors.textSecondary || '#94a3b8';

    root.style.setProperty('--color-primary', p);
    root.style.setProperty('--color-primary-hover', ph);
    root.style.setProperty('--color-accent', ac);
    root.style.setProperty('--color-emerald', ac);
    root.style.setProperty('--color-sidebar-icon', sbi);
    root.style.setProperty('--color-bg', bg);
    root.style.setProperty('--color-bg-dark', bg);
    root.style.setProperty('--color-background', bg);
    root.style.setProperty('--color-card', card);
    root.style.setProperty('--color-card-dark', card);
    root.style.setProperty('--color-border', border);
    root.style.setProperty('--color-text-secondary', textSec);
  } catch (_) {}
}

let memoryThemeColors: any = null;

export function getStoredThemeColors(): any {
  return memoryThemeColors ? { ...memoryThemeColors } : null;
}

export function setMemoryThemeColors(colors: any): void {
  memoryThemeColors = colors ? { ...colors } : null;
}

export async function saveThemeColors(colors: any): Promise<boolean> {
  memoryThemeColors = { ...colors };
  applyThemeToDocument(colors);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: colors }));
    window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
  }
  return await persistServerAdminSettings({ themeColors: colors });
}
