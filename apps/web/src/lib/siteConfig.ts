export const DEFAULT_SITE_NAME = 'Zecratary';
export const DEFAULT_SITE_ICON = '🥑';

export interface SiteIdentityConfig {
  siteName: string;
  titlebarEmoji: string;
  titlebarImage: string;
  faviconEmoji: string;
  faviconImage: string;
}

const DEFAULT_CONFIG: SiteIdentityConfig = {
  siteName: DEFAULT_SITE_NAME,
  titlebarEmoji: DEFAULT_SITE_ICON,
  titlebarImage: '',
  faviconEmoji: DEFAULT_SITE_ICON,
  faviconImage: ''
};

export function getSiteConfig(): SiteIdentityConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_site_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        siteName: parsed.siteName || parsed.name || DEFAULT_SITE_NAME,
        titlebarEmoji: parsed.titlebarEmoji || parsed.icon || DEFAULT_SITE_ICON,
        titlebarImage: parsed.titlebarImage || '',
        faviconEmoji: parsed.faviconEmoji || parsed.titlebarEmoji || parsed.icon || DEFAULT_SITE_ICON,
        faviconImage: parsed.faviconImage || ''
      };
    }
  } catch (_) {}
  return DEFAULT_CONFIG;
}

export function getSiteName(): string {
  return getSiteConfig().siteName;
}

export function getSiteIcon(): string {
  const cfg = getSiteConfig();
  return cfg.titlebarImage || cfg.titlebarEmoji || DEFAULT_SITE_ICON;
}

export function getFavicon(): string {
  const cfg = getSiteConfig();
  return cfg.faviconImage || cfg.faviconEmoji || cfg.titlebarImage || cfg.titlebarEmoji || DEFAULT_SITE_ICON;
}

export function updateFavicon(iconOrUrl?: string) {
  if (typeof window === 'undefined') return;
  const target = iconOrUrl || getFavicon();
  let href = target;

  if (
    !target.startsWith('data:') && 
    !target.startsWith('http://') && 
    !target.startsWith('https://') && 
    !target.startsWith('/')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${target}</text></svg>`;
    href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;

  let shortcut = document.querySelector<HTMLLinkElement>("link[rel~='shortcut icon']");
  if (shortcut) {
    shortcut.href = href;
  }
}

export function saveSiteConfig(config: Partial<SiteIdentityConfig>) {
  if (typeof window === 'undefined') return;
  const current = getSiteConfig();
  const updated: SiteIdentityConfig = { ...current, ...config };
  localStorage.setItem('zecratary_site_settings', JSON.stringify(updated));
  localStorage.setItem('zecratary_site_name', updated.siteName);
  localStorage.setItem('zecratary_site_icon', updated.titlebarImage || updated.titlebarEmoji);
  
  window.dispatchEvent(new Event('zecratary_site_settings_changed'));
  window.dispatchEvent(new Event('storage'));
  updateFavicon(updated.faviconImage || updated.faviconEmoji || updated.titlebarEmoji);

  // Sync to backend API for cross-browser synchronization
  try {
    fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSettings: updated })
    }).catch(() => {});
  } catch (_) {}
}

export async function syncSiteConfigFromServer(): Promise<SiteIdentityConfig | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/system-settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings?.siteSettings) {
        const s = data.settings.siteSettings;
        const current = getSiteConfig();
        const merged: SiteIdentityConfig = {
          siteName: s.siteName || current.siteName,
          titlebarEmoji: s.titlebarEmoji || current.titlebarEmoji,
          titlebarImage: s.titlebarImage !== undefined ? s.titlebarImage : current.titlebarImage,
          faviconEmoji: s.faviconEmoji || current.faviconEmoji,
          faviconImage: s.faviconImage !== undefined ? s.faviconImage : current.faviconImage
        };
        localStorage.setItem('zecratary_site_settings', JSON.stringify(merged));
        window.dispatchEvent(new Event('zecratary_site_settings_changed'));
        updateFavicon(merged.faviconImage || merged.faviconEmoji || merged.titlebarEmoji);
        return merged;
      }
    }
  } catch (_) {}
  return null;
}
