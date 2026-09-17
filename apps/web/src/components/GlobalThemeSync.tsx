'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, fetchAndApplyServerTheme } from '@/lib/themeConfig';

export default function GlobalThemeSync() {
  useEffect(() => {
    fetchAndApplyServerTheme();

    const handleThemeUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail === 'object' && !('mode' in detail)) {
        applyThemeToDocument(detail);
      } else {
        fetchAndApplyServerTheme();
      }
    };

    const handleModeUpdate = () => {
      applyThemeToDocument();
    };

    window.addEventListener('zecratary_theme_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_changed', handleThemeUpdate);
    window.addEventListener('zecratary_theme_mode_changed', handleModeUpdate);
    window.addEventListener('storage', handleThemeUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_changed', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_mode_changed', handleModeUpdate);
      window.removeEventListener('storage', handleThemeUpdate);
    };
  }, []);

  return null;
}
