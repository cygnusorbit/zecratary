'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, fetchAndApplyServerTheme } from '@/lib/themeConfig';

export default function GlobalThemeSync() {
  useEffect(() => {
    fetchAndApplyServerTheme();

    const handleThemeUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && !detail.mode) {
        applyThemeToDocument(detail);
      } else {
        applyThemeToDocument();
      }
    };

    window.addEventListener('zecratary_theme_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
    window.addEventListener('zecratary_theme_changed', handleThemeUpdate);
    window.addEventListener('storage', handleThemeUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_changed', handleThemeUpdate);
      window.removeEventListener('storage', handleThemeUpdate);
    };
  }, []);

  return null;
}
