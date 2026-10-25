'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, fetchAndApplyServerTheme, applyGlobalFont } from '@/lib/themeConfig';

export default function GlobalThemeSync() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('theme-preloading');
    }

    fetchAndApplyServerTheme();

    const handleThemeUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail === 'object' && !('mode' in detail)) {
        applyThemeToDocument(detail);
      } else {
        fetchAndApplyServerTheme();
      }
    };

    const handleFontUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        applyGlobalFont(detail.fontFamily, detail.fontSize, detail.fontLetterSpacing);
      } else {
        applyGlobalFont();
      }
    };

    const handleModeUpdate = () => {
      applyThemeToDocument();
    };

    window.addEventListener('zecratary_theme_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_changed', handleThemeUpdate);
    window.addEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_mode_changed', handleModeUpdate);
    window.addEventListener('zecratary_font_updated', handleFontUpdate);
    window.addEventListener('storage', handleThemeUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_changed', handleThemeUpdate);
      window.removeEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_mode_changed', handleModeUpdate);
      window.removeEventListener('zecratary_font_updated', handleFontUpdate);
      window.removeEventListener('storage', handleThemeUpdate);
    };
  }, []);

  return null;
}
