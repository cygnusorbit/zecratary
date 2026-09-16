// Server-backed Site Identity & Branding
// Zero browser localStorage writes

import { persistServerAdminSettings, fetchServerAdminSettings } from '@/lib/adminSync';

export interface SiteIdentityConfig {
  siteName: string;
  titlebarEmoji: string;
  titlebarImage?: string;
  faviconEmoji: string;
  faviconImage?: string;
}

export const DEFAULT_SITE_NAME = 'Zecratary';
export const DEFAULT_SITE_ICON = '🍳';

let memorySiteConfig: SiteIdentityConfig = {
  siteName: DEFAULT_SITE_NAME,
  titlebarEmoji: DEFAULT_SITE_ICON,
  titlebarImage: '',
  faviconEmoji: DEFAULT_SITE_ICON,
  faviconImage: ''
};

export function getSiteConfig(): SiteIdentityConfig {
  return { ...memorySiteConfig };
}

export function getSiteName(): string {
  return memorySiteConfig.siteName || DEFAULT_SITE_NAME;
}

export function getSiteIcon(): string {
  return memorySiteConfig.titlebarImage || memorySiteConfig.titlebarEmoji || DEFAULT_SITE_ICON;
}

export function setMemorySiteConfig(cfg: Partial<SiteIdentityConfig>): void {
  memorySiteConfig = { ...memorySiteConfig, ...cfg };
}

export function updateFavicon(faviconUrl?: string): void {
  if (typeof document === 'undefined') return;
  try {
    const iconToUse = faviconUrl || memorySiteConfig.faviconImage || (
      memorySiteConfig.faviconEmoji
        ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${memorySiteConfig.faviconEmoji}</text></svg>`)}`
        : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${DEFAULT_SITE_ICON}</text></svg>`)}`
    );

    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconToUse;
  } catch (_) {}
}

export async function saveSiteConfig(config: SiteIdentityConfig): Promise<boolean> {
  memorySiteConfig = { ...config };
  if (typeof window !== 'undefined') {
    if (config.faviconImage) {
      updateFavicon(config.faviconImage);
    } else if (config.faviconEmoji) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${config.faviconEmoji}</text></svg>`;
      updateFavicon(`data:image/svg+xml,${encodeURIComponent(svg)}`);
    }
    window.dispatchEvent(new CustomEvent('zecratary_site_config_updated', { detail: config }));
    window.dispatchEvent(new Event('zecratary_site_settings_changed'));
    window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
  }
  return await persistServerAdminSettings({
    siteName: config.siteName,
    titlebarEmoji: config.titlebarEmoji,
    titlebarImage: config.titlebarImage || '',
    faviconEmoji: config.faviconEmoji,
    faviconImage: config.faviconImage || ''
  });
}

// Auto-hydrate from server on startup with zero localStorage writes
if (typeof window !== 'undefined') {
  fetchServerAdminSettings().then((settings) => {
    if (settings) {
      const updated: Partial<SiteIdentityConfig> = {};
      if (settings.siteName) updated.siteName = settings.siteName;
      if (settings.titlebarEmoji) updated.titlebarEmoji = settings.titlebarEmoji;
      if (settings.titlebarImage !== undefined) updated.titlebarImage = settings.titlebarImage;
      if (settings.faviconEmoji) updated.faviconEmoji = settings.faviconEmoji;
      if (settings.faviconImage !== undefined) updated.faviconImage = settings.faviconImage;
      
      if (Object.keys(updated).length > 0) {
        setMemorySiteConfig(updated);
        updateFavicon();
        window.dispatchEvent(new Event('zecratary_site_settings_changed'));
      }
    }
  }).catch(() => {});
}
