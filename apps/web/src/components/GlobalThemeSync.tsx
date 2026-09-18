'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, fetchAndApplyServerTheme, applyGlobalFont } from '@/lib/themeConfig';

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

    const handleFontUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        applyGlobalFont(detail.fontFamily, detail.fontSize, detail.fontLetterSpacing);
      } else {
        applyGlobalFont();
      }
    };

    window.addEventListener('zecratary_theme_updated', handleThemeUpdate);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
    window.addEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
    window.addEventListener('zecratary_font_updated', handleFontUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeUpdate);
      window.removeEventListener('zecratary_admin_settings_updated', handleThemeUpdate);
      window.removeEventListener('zecratary_font_updated', handleFontUpdate);
    };
  }, []);

  return null;
}
