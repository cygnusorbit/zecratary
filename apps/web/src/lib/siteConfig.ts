'use client';

export const DEFAULT_SITE_NAME = 'Zecratary';
export const DEFAULT_SITE_ICON = '🥕';

export const PRESET_ICONS = ['🥕', '🍳', '👨‍🍳', '🥑', '🥗', '🍲', '🍕', '🥘', '🌮', '🍔', '🍰', '🍎'];

export const updateFavicon = (icon: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const emoji = icon.trim() || DEFAULT_SITE_ICON;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  const faviconUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = faviconUrl;
};

export const getSiteName = (): string => {
  if (typeof window === 'undefined') return DEFAULT_SITE_NAME;
  try {
    const saved = localStorage.getItem('zecratary_site_name');
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}
  return DEFAULT_SITE_NAME;
};

export const getSiteIcon = (): string => {
  if (typeof window === 'undefined') return DEFAULT_SITE_ICON;
  try {
    const saved = localStorage.getItem('zecratary_site_icon');
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}
  return DEFAULT_SITE_ICON;
};

export const saveSiteConfig = (name: string, icon: string) => {
  if (typeof window === 'undefined') return;
  const cleanName = name.trim() || DEFAULT_SITE_NAME;
  const cleanIcon = icon.trim() || DEFAULT_SITE_ICON;
  localStorage.setItem('zecratary_site_name', cleanName);
  localStorage.setItem('zecratary_site_icon', cleanIcon);
  updateFavicon(cleanIcon);
  window.dispatchEvent(new CustomEvent('zecratary_site_settings_changed', {
    detail: { name: cleanName, icon: cleanIcon }
  }));
  window.dispatchEvent(new Event('storage'));
};

export const saveSiteName = (name: string) => {
  saveSiteConfig(name, getSiteIcon());
};

export const saveSiteIcon = (icon: string) => {
  saveSiteConfig(getSiteName(), icon);
};
