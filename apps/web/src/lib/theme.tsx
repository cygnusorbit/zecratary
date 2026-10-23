'use client';

import { useEffect } from 'react';

export function ThemeInitializer() {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedMode = localStorage.getItem('zecratary_theme_mode') || 'dark';
        if (storedMode === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }
    } catch (_) {}
  }, []);

  return null;
}

export default ThemeInitializer;
