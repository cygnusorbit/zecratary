export interface AdminSettingsPayload {
  siteName?: string;
  titlebarEmoji?: string;
  titlebarImage?: string;
  faviconEmoji?: string;
  faviconImage?: string;
  themeColors?: Record<string, any>;
  [key: string]: any;
}

export async function fetchServerAdminSettings(): Promise<AdminSettingsPayload | null> {
  try {
    const res = await fetch('/api/admin/settings', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const data = await res.json();
      return (data && data.settings) ? data.settings : data;
    }
  } catch (err) {
    console.error('[adminSync] fetchServerAdminSettings error:', err);
  }
  return null;
}

export async function persistServerAdminSettings(payload: AdminSettingsPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('[adminSync] persistServerAdminSettings error:', err);
    return false;
  }
}

export function purgeLegacyBrowserAdminStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('zecratary_theme_colors');
    localStorage.removeItem('zecratary_site_config');
    localStorage.removeItem('zecratary_theme_config');
    localStorage.removeItem('zecratary_admin_settings');
  } catch (_) {}
}
