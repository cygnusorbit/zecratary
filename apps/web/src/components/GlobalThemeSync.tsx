'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, fetchAndApplyServerTheme } from '@/lib/themeConfig';

export default function GlobalThemeSync() {
  useEffect(() => {
    fetchAndApplyServerTheme();

    const handleThemeUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        applyThemeToDocument(detail);
      } else {
        fetchAndApplyServerTheme();
      }
    };

    window.addEventListener('zecratary_theme_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
    window.addEventListener('zecratary_admin_settings_updated', handleThemeUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
      window.removeEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
    };
  }, []);

  return null;
}
