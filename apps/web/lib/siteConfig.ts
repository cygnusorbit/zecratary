// Site identity and configuration management (Constraint 8)
// Repository: cygnusorbit/zecratary (GitHub)

export interface SiteIdentityConfig {
  siteName?: string;
  site_name?: string;
  siteTagline?: string;
  site_tagline?: string;
  tagline?: string;
  titlebarEmoji?: string;
  titlebar_emoji?: string;
  titlebarImage?: string;
  titlebar_image?: string;
  faviconEmoji?: string;
  favicon_emoji?: string;
  faviconImage?: string;
  favicon_image?: string;
  [key: string]: any;
}

export interface SiteConfig {
  siteName: string;
  siteIcon: string;
  site_name?: string;
  site_icon?: string;
  siteTagline?: string;
  site_tagline?: string;
  tagline?: string;
  titlebarEmoji?: string;
  titlebar_emoji?: string;
  titlebarImage?: string;
  titlebar_image?: string;
  faviconEmoji?: string;
  favicon_emoji?: string;
  faviconImage?: string;
  favicon_image?: string;
  currency?: string;
  themeMode?: string;
  theme_mode?: string;
  [key: string]: any;
}

export const DEFAULT_SITE_NAME = 'Zecratary';
export const DEFAULT_SITE_ICON = '🍳';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: DEFAULT_SITE_NAME,
  siteIcon: DEFAULT_SITE_ICON,
  site_name: DEFAULT_SITE_NAME,
  site_icon: DEFAULT_SITE_ICON,
  siteTagline: 'Autonomous AI Culinary Assistant',
  titlebarEmoji: DEFAULT_SITE_ICON,
  titlebar_emoji: DEFAULT_SITE_ICON,
  faviconEmoji: DEFAULT_SITE_ICON,
  favicon_emoji: DEFAULT_SITE_ICON,
  currency: 'USD',
  themeMode: 'dark',
};

let memorySiteConfig: SiteConfig = { ...DEFAULT_SITE_CONFIG };

export function getSiteName(): string {
  return memorySiteConfig.siteName || DEFAULT_SITE_NAME;
}

export function getSiteIcon(): string {
  return memorySiteConfig.siteIcon || DEFAULT_SITE_ICON;
}

export function getSiteConfig(fallback?: Partial<SiteConfig>): SiteConfig {
  let cfg = { ...memorySiteConfig };
  if (fallback) {
    cfg = { ...cfg, ...fallback };
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('zecratary_site_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        cfg = { ...cfg, ...parsed };
        memorySiteConfig = cfg;
      }
    } catch (_) {}
  }
  return cfg;
}

export function setMemorySiteConfig(cfgOrName?: any, icon?: string): void {
  if (typeof cfgOrName === 'object' && cfgOrName !== null) {
    memorySiteConfig = { ...memorySiteConfig, ...cfgOrName };
    return;
  }
  if (typeof cfgOrName === 'string') {
    memorySiteConfig.siteName = cfgOrName;
    memorySiteConfig.site_name = cfgOrName;
  }
  if (icon) {
    memorySiteConfig.siteIcon = icon;
    memorySiteConfig.site_icon = icon;
    memorySiteConfig.titlebarEmoji = icon;
    memorySiteConfig.faviconEmoji = icon;
  }
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        const mapped: Partial<SiteConfig> = {
          siteName: settings.siteName || settings.site_name || memorySiteConfig.siteName,
          site_name: settings.siteName || settings.site_name || memorySiteConfig.siteName,
          siteIcon: settings.titlebarEmoji || settings.titlebar_emoji || settings.faviconEmoji || settings.favicon_emoji || memorySiteConfig.siteIcon,
          site_icon: settings.titlebarEmoji || settings.titlebar_emoji || settings.faviconEmoji || settings.favicon_emoji || memorySiteConfig.siteIcon,
          titlebarEmoji: settings.titlebarEmoji || settings.titlebar_emoji || memorySiteConfig.titlebarEmoji,
          faviconEmoji: settings.faviconEmoji || settings.favicon_emoji || memorySiteConfig.faviconEmoji,
          currency: settings.currency || memorySiteConfig.currency,
        };
        memorySiteConfig = { ...memorySiteConfig, ...mapped };
      }
    } catch (_) {}
  }
  return memorySiteConfig;
}

export async function saveSiteConfig(newConfig: any): Promise<SiteConfig> {
  const cfg = newConfig || {};
  const resolvedName = cfg.siteName || cfg.site_name || memorySiteConfig.siteName;
  const resolvedIcon = cfg.siteIcon || cfg.site_icon || cfg.titlebarEmoji || cfg.titlebar_emoji || cfg.faviconEmoji || cfg.favicon_emoji || memorySiteConfig.siteIcon;
  const resolvedTagline = cfg.siteTagline || cfg.site_tagline || cfg.tagline || memorySiteConfig.siteTagline;

  memorySiteConfig = {
    ...memorySiteConfig,
    ...cfg,
    siteName: resolvedName,
    site_name: resolvedName,
    siteIcon: resolvedIcon,
    site_icon: resolvedIcon,
    siteTagline: resolvedTagline,
    site_tagline: resolvedTagline,
    titlebarEmoji: resolvedIcon,
    faviconEmoji: resolvedIcon,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('zecratary_site_config', JSON.stringify(memorySiteConfig));
      window.dispatchEvent(new CustomEvent('zecratary_site_settings_changed', { detail: memorySiteConfig }));
      window.dispatchEvent(new CustomEvent('zecratary_site_config_updated', { detail: memorySiteConfig }));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      if (resolvedIcon) {
        updateFavicon(resolvedIcon);
      }
    } catch (_) {}

    // Persist to database via /api/admin/settings (Constraint 8)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: resolvedName,
          site_name: resolvedName,
          siteTagline: resolvedTagline,
          site_tagline: resolvedTagline,
          titlebarEmoji: resolvedIcon,
          titlebar_emoji: resolvedIcon,
          faviconEmoji: resolvedIcon,
          favicon_emoji: resolvedIcon,
          currency: memorySiteConfig.currency,
        }),
      });
    } catch (_) {}
  }

  return memorySiteConfig;
}

export function setSiteConfig(newConfig: Partial<SiteConfig>): SiteConfig {
  saveSiteConfig(newConfig).catch(() => {});
  return memorySiteConfig;
}

export const persistSiteConfig = saveSiteConfig;

export function updateFavicon(iconUrlOrEmoji?: string): void {
  if (typeof document === 'undefined') return;
  try {
    const iconToUse = iconUrlOrEmoji || memorySiteConfig.faviconImage || memorySiteConfig.faviconEmoji || DEFAULT_SITE_ICON;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    if (iconToUse.startsWith('/') || iconToUse.startsWith('http')) {
      link.href = iconToUse;
    } else {
      link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${iconToUse}</text></svg>`;
    }
  } catch (_) {}
}

export default {
  getSiteConfig,
  saveSiteConfig,
  fetchSiteConfig,
  persistSiteConfig,
  setSiteConfig,
  getSiteName,
  getSiteIcon,
  setMemorySiteConfig,
  updateFavicon,
  DEFAULT_SITE_NAME,
  DEFAULT_SITE_ICON,
  DEFAULT_SITE_CONFIG,
};
