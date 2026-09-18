'use client';

export function purgeLegacyBrowserAdminStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'admin_site_name',
      'admin_titlebar_emoji',
      'admin_titlebar_image',
      'admin_favicon_emoji',
      'admin_favicon_image',
      'admin_theme_colors',
      'admin_font_family',
      'admin_font_size',
      'admin_font_spacing'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}

export async function fetchServerAdminSettings(): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings || data;
  } catch (err) {
    console.error('[adminSync] fetchServerAdminSettings error:', err);
    return null;
  }
}

export async function persistServerAdminSettings(settings: any): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      console.error('[adminSync] Server rejected settings with status:', res.status);
      return false;
    }
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error('[adminSync] persistServerAdminSettings error:', err);
    return false;
  }
}
