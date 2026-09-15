// Centralized Server-Backed Admin Settings Engine
// Zero localStorage read/write persistence for administrative configs

export function purgeLegacyBrowserAdminStorage(): void {
  if (typeof window === 'undefined') return;
  const legacyKeys = [
    'zecratary_admin_settings',
    'zecratary_social_login_config',
    'zecratary_subscription_configs',
    'zecratary_subscription_plans',
    'zecratary_system_config',
    'admin_settings',
    'adminSettings',
    'site_settings'
  ];
  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  });
}

export async function fetchServerAdminSettings(): Promise<any> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return data.settings || data;
    }
  } catch (err) {
    console.error('[adminSync] Failed to fetch server settings:', err);
  }
  return null;
}

export async function persistServerAdminSettings(updates: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }
      return true;
    }
  } catch (err) {
    console.error('[adminSync] Failed to persist server settings:', err);
  }
  return false;
}
