'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, fetchAndApplyServerTheme, applyGlobalFont } from '@/lib/themeConfig';

export default function GlobalThemeSync() {
  useEffect(() => {
    // Initial fetch from PostgreSQL-backed API
    fetchAndApplyServerTheme();

    const handleThemeUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail === 'object') {
        applyThemeToDocument(detail);
        if (detail.fontFamily) {
          (applyGlobalFont as any)(detail.fontFamily, detail.fontSize, detail.fontLetterSpacing);
        }
      } else {
        fetchAndApplyServerTheme();
      }
    };

    window.addEventListener('zecratary_theme_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
    window.addEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
    window.addEventListener('storage', handleThemeUpdate);
    window.addEventListener('focus', handleThemeUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
      window.removeEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
      window.removeEventListener('storage', handleThemeUpdate);
      window.removeEventListener('focus', handleThemeUpdate);
    };
  }, []);

  return null;
}
