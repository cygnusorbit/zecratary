// Generated / Updated by AI Collaborator - Server-backed settings synchronization
'use client';

export function purgeLegacyBrowserAdminStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const legacyKeys = [
      'zecratary_ingredient_categories',
      'ingredient_categories',
      'zecratary_categories',
      'zecratary_legacy_admin'
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
  } catch (_) {}
}

export async function fetchServerAdminSettings(): Promise<any> {
  try {
    const res = await fetch('/api/admin/settings?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data?.settings || data;
    }
  } catch (err) {
    console.error('[adminSync] fetchServerAdminSettings failed:', err);
  }
  return null;
}

export async function persistServerAdminSettings(partialSettings: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: partialSettings, ...partialSettings })
    });
    if (res.ok) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_admin_settings_updated', { detail: partialSettings }));
      }
      return true;
    }
  } catch (err) {
    console.error('[adminSync] persistServerAdminSettings failed:', err);
  }
  return false;
}
