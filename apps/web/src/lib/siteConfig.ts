// Universal Site Configuration & Branding Architecture (Constraint 8)
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
  fontFamily?: string;
  font_family?: string;
  metaDescription?: string;
  meta_description?: string;
  metaKeywords?: string;
  meta_keywords?: string;
  metaAuthor?: string;
  meta_author?: string;
  [key: string]: any;
}

export interface SiteBrandingConfig extends SiteIdentityConfig {}

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
  fontFamily?: string;
  font_family?: string;
  metaDescription?: string;
  meta_description?: string;
  metaKeywords?: string;
  meta_keywords?: string;
  metaAuthor?: string;
  meta_author?: string;
  currency?: string;
  themeMode?: string;
  theme_mode?: string;
  [key: string]: any;
}

export const DEFAULT_SITE_NAME = 'Zecratary';
export const DEFAULT_SITE_ICON = '👨‍🍳';
export const DEFAULT_SITE_TAGLINE = 'Autonomous Culinary Intelligence & Precision Meal Planning';
export const DEFAULT_TITLEBAR_EMOJI = '👨‍🍳';
export const DEFAULT_FAVICON_EMOJI = '👨‍🍳';
export const DEFAULT_FONT_FAMILY = 'Inter, sans-serif';
export const DEFAULT_META_DESCRIPTION = 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.';
export const DEFAULT_META_KEYWORDS = 'culinary ai, recipe generator, meal planner, pantry management';
export const DEFAULT_META_AUTHOR = 'Zecratary Culinary Intelligence Inc.';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: DEFAULT_SITE_NAME,
  siteIcon: DEFAULT_SITE_ICON,
  site_name: DEFAULT_SITE_NAME,
  site_icon: DEFAULT_SITE_ICON,
  siteTagline: DEFAULT_SITE_TAGLINE,
  site_tagline: DEFAULT_SITE_TAGLINE,
  tagline: DEFAULT_SITE_TAGLINE,
  titlebarEmoji: DEFAULT_TITLEBAR_EMOJI,
  titlebar_emoji: DEFAULT_TITLEBAR_EMOJI,
  titlebarImage: '',
  titlebar_image: '',
  faviconEmoji: DEFAULT_FAVICON_EMOJI,
  favicon_emoji: DEFAULT_FAVICON_EMOJI,
  faviconImage: '',
  favicon_image: '',
  fontFamily: DEFAULT_FONT_FAMILY,
  font_family: DEFAULT_FONT_FAMILY,
  metaDescription: DEFAULT_META_DESCRIPTION,
  meta_description: DEFAULT_META_DESCRIPTION,
  metaKeywords: DEFAULT_META_KEYWORDS,
  meta_keywords: DEFAULT_META_KEYWORDS,
  metaAuthor: DEFAULT_META_AUTHOR,
  meta_author: DEFAULT_META_AUTHOR,
  currency: 'USD',
  themeMode: 'dark',
};

let memorySiteConfig: SiteConfig = { ...DEFAULT_SITE_CONFIG };

// Internal helper to read localStorage synchronously before DOM paint
function readLocalStorageConfig(): Partial<SiteConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('zecratary_site_config');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

export function getSiteName(): string {
  const local = readLocalStorageConfig();
  if (local?.siteName || local?.site_name) {
    return local.siteName || local.site_name || DEFAULT_SITE_NAME;
  }
  return memorySiteConfig.siteName || memorySiteConfig.site_name || DEFAULT_SITE_NAME;
}

export function getSiteIcon(): string {
  const local = readLocalStorageConfig();
  if (local) {
    const localIcon =
      local.titlebarImage ||
      local.titlebar_image ||
      local.titlebarEmoji ||
      local.titlebar_emoji ||
      local.siteIcon ||
      local.site_icon;
    if (localIcon) return localIcon;
  }
  return (
    memorySiteConfig.titlebarImage ||
    memorySiteConfig.titlebar_image ||
    memorySiteConfig.titlebarEmoji ||
    memorySiteConfig.titlebar_emoji ||
    memorySiteConfig.siteIcon ||
    memorySiteConfig.site_icon ||
    DEFAULT_SITE_ICON
  );
}

export function getSiteConfig(fallback?: Partial<SiteConfig>): SiteConfig {
  let cfg = { ...memorySiteConfig };
  if (fallback) {
    cfg = { ...cfg, ...fallback };
  }
  const local = readLocalStorageConfig();
  if (local) {
    cfg = { ...cfg, ...local };
    memorySiteConfig = cfg;
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
    if (icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('data:image')) {
      memorySiteConfig.titlebarImage = icon;
      memorySiteConfig.titlebar_image = icon;
    } else {
      memorySiteConfig.titlebarEmoji = icon;
      memorySiteConfig.titlebar_emoji = icon;
    }
    memorySiteConfig.siteIcon = icon;
    memorySiteConfig.site_icon = icon;
  }
}

export function updateFavicon(faviconUrlOrEmoji?: string): void {
  if (typeof document === 'undefined') return;
  try {
    const iconToUse =
      faviconUrlOrEmoji ||
      memorySiteConfig.faviconImage ||
      memorySiteConfig.favicon_image ||
      memorySiteConfig.faviconEmoji ||
      memorySiteConfig.favicon_emoji ||
      memorySiteConfig.titlebarImage ||
      memorySiteConfig.titlebarEmoji ||
      DEFAULT_FAVICON_EMOJI;

    const existing = document.querySelectorAll("link[rel*='icon']");
    existing.forEach((el) => el.parentNode?.removeChild(el));

    const link: HTMLLinkElement = document.createElement('link');
    link.rel = 'icon';

    if (iconToUse.startsWith('data:image/svg+xml') || iconToUse.includes('<svg')) {
      link.type = 'image/svg+xml';
      link.href = iconToUse.startsWith('data:')
        ? iconToUse
        : `data:image/svg+xml,${encodeURIComponent(iconToUse)}`;
    } else if (iconToUse.startsWith('data:image/png')) {
      link.type = 'image/png';
      link.href = iconToUse;
    } else if (iconToUse.startsWith('/') || iconToUse.startsWith('http')) {
      link.href = `${iconToUse}?v=${Date.now()}`;
    } else {
      link.type = 'image/svg+xml';
      link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${iconToUse}</text></svg>`;
    }

    document.head.appendChild(link);
  } catch (_) {}
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        const resolvedTagline =
          settings.siteTagline || settings.tagline || settings.site_tagline || DEFAULT_SITE_TAGLINE;
        const resolvedImage =
          settings.titlebarImage || settings.titlebar_image || '';
        const resolvedEmoji =
          settings.titlebarEmoji || settings.titlebar_emoji || DEFAULT_TITLEBAR_EMOJI;
        const resolvedFaviconImage =
          settings.faviconImage || settings.favicon_image || '';
        const resolvedFaviconEmoji =
          settings.faviconEmoji || settings.favicon_emoji || DEFAULT_FAVICON_EMOJI;

        const resolvedIcon = resolvedImage || resolvedEmoji || DEFAULT_SITE_ICON;

        const mapped: Partial<SiteConfig> = {
          siteName: settings.siteName || settings.site_name || memorySiteConfig.siteName,
          site_name: settings.siteName || settings.site_name || memorySiteConfig.siteName,
          siteTagline: resolvedTagline,
          site_tagline: resolvedTagline,
          tagline: resolvedTagline,
          siteIcon: resolvedIcon,
          site_icon: resolvedIcon,
          titlebarImage: resolvedImage,
          titlebar_image: resolvedImage,
          titlebarEmoji: resolvedEmoji,
          titlebar_emoji: resolvedEmoji,
          faviconImage: resolvedFaviconImage,
          favicon_image: resolvedFaviconImage,
          faviconEmoji: resolvedFaviconEmoji,
          favicon_emoji: resolvedFaviconEmoji,
          fontFamily:
            settings.fontFamily || settings.font_family || memorySiteConfig.fontFamily,
          metaDescription:
            settings.metaDescription ||
            settings.meta_description ||
            settings.seoDescription ||
            memorySiteConfig.metaDescription,
          metaKeywords:
            settings.metaKeywords ||
            settings.meta_keywords ||
            settings.seoKeywords ||
            memorySiteConfig.metaKeywords,
          metaAuthor:
            settings.metaAuthor ||
            settings.meta_author ||
            settings.author ||
            memorySiteConfig.metaAuthor,
          currency: settings.currency || memorySiteConfig.currency,
        };

        memorySiteConfig = { ...memorySiteConfig, ...mapped };
        try {
          localStorage.setItem('zecratary_site_config', JSON.stringify(memorySiteConfig));
        } catch (_) {}
      }
    } catch (_) {}
  }
  return memorySiteConfig;
}

export async function saveSiteConfig(newConfig: any): Promise<SiteConfig> {
  const cfg = newConfig || {};
  const resolvedName = cfg.siteName || cfg.site_name || memorySiteConfig.siteName;
  const resolvedImage =
    cfg.titlebarImage !== undefined
      ? cfg.titlebarImage
      : cfg.titlebar_image !== undefined
      ? cfg.titlebar_image
      : memorySiteConfig.titlebarImage;
  const resolvedEmoji =
    cfg.titlebarEmoji || cfg.titlebar_emoji || memorySiteConfig.titlebarEmoji;
  const resolvedFaviconImage =
    cfg.faviconImage !== undefined
      ? cfg.faviconImage
      : cfg.favicon_image !== undefined
      ? cfg.favicon_image
      : memorySiteConfig.faviconImage;
  const resolvedFaviconEmoji =
    cfg.faviconEmoji || cfg.favicon_emoji || memorySiteConfig.faviconEmoji;

  const resolvedIcon = resolvedImage || resolvedEmoji || memorySiteConfig.siteIcon;
  const resolvedTagline =
    cfg.siteTagline ||
    cfg.site_tagline ||
    cfg.tagline ||
    memorySiteConfig.siteTagline;
  const resolvedDescription =
    cfg.metaDescription ||
    cfg.meta_description ||
    cfg.seoDescription ||
    memorySiteConfig.metaDescription;
  const resolvedKeywords =
    cfg.metaKeywords ||
    cfg.meta_keywords ||
    cfg.seoKeywords ||
    memorySiteConfig.metaKeywords;
  const resolvedAuthor =
    cfg.metaAuthor ||
    cfg.meta_author ||
    cfg.author ||
    memorySiteConfig.metaAuthor;

  memorySiteConfig = {
    ...memorySiteConfig,
    ...cfg,
    siteName: resolvedName,
    site_name: resolvedName,
    siteIcon: resolvedIcon,
    site_icon: resolvedIcon,
    siteTagline: resolvedTagline,
    site_tagline: resolvedTagline,
    tagline: resolvedTagline,
    titlebarImage: resolvedImage,
    titlebar_image: resolvedImage,
    titlebarEmoji: resolvedEmoji,
    titlebar_emoji: resolvedEmoji,
    faviconImage: resolvedFaviconImage,
    favicon_image: resolvedFaviconImage,
    faviconEmoji: resolvedFaviconEmoji,
    favicon_emoji: resolvedFaviconEmoji,
    metaDescription: resolvedDescription,
    meta_description: resolvedDescription,
    metaKeywords: resolvedKeywords,
    meta_keywords: resolvedKeywords,
    metaAuthor: resolvedAuthor,
    meta_author: resolvedAuthor,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('zecratary_site_config', JSON.stringify(memorySiteConfig));
      window.dispatchEvent(
        new CustomEvent('zecratary_site_config_updated', { detail: memorySiteConfig })
      );
      window.dispatchEvent(
        new CustomEvent('zecratary_site_settings_changed', { detail: memorySiteConfig })
      );
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      if (resolvedFaviconImage) {
        updateFavicon(resolvedFaviconImage);
      } else if (resolvedFaviconEmoji) {
        updateFavicon(resolvedFaviconEmoji);
      }
    } catch (_) {}

    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cfg,
          siteName: resolvedName,
          site_name: resolvedName,
          siteTagline: resolvedTagline,
          site_tagline: resolvedTagline,
          tagline: resolvedTagline,
          titlebarImage: resolvedImage,
          titlebar_image: resolvedImage,
          titlebarEmoji: resolvedEmoji,
          titlebar_emoji: resolvedEmoji,
          faviconImage: resolvedFaviconImage,
          favicon_image: resolvedFaviconImage,
          faviconEmoji: resolvedFaviconEmoji,
          favicon_emoji: resolvedFaviconEmoji,
          metaDescription: resolvedDescription,
          meta_description: resolvedDescription,
          metaKeywords: resolvedKeywords,
          meta_keywords: resolvedKeywords,
          metaAuthor: resolvedAuthor,
          meta_author: resolvedAuthor,
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
  DEFAULT_SITE_TAGLINE,
  DEFAULT_TITLEBAR_EMOJI,
  DEFAULT_FAVICON_EMOJI,
  DEFAULT_FONT_FAMILY,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_META_KEYWORDS,
  DEFAULT_META_AUTHOR,
  DEFAULT_SITE_CONFIG,
};
