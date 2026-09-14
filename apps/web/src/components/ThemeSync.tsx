'use client';

import { useEffect } from 'react';
import { fetchAndApplyServerTheme, applyThemeToDocument } from '@/lib/themeConfig';

export default function ThemeSync() {
  useEffect(() => {
    fetchAndApplyServerTheme();

    const handleSync = (e: any) => {
      if (e?.detail) {
        applyThemeToDocument(e.detail);
      } else {
        try {
          const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
          if (stored) applyThemeToDocument(JSON.parse(stored));
        } catch (_) {}
      }
    };

    window.addEventListener('zecratary_theme_changed', handleSync);
    window.addEventListener('zecratary_theme_updated', handleSync);
    window.addEventListener('storage', handleSync);

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetchAndApplyServerTheme();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('zecratary_theme_changed', handleSync);
      window.removeEventListener('zecratary_theme_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
