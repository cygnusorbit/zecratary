import os

target_paths = [
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx'
]

profile_path = next((p for p in target_paths if os.path.exists(p)), None)

if not profile_path:
    print("Error: Could not locate profile/page.tsx")
    exit(1)

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update applySavedTheme to set document.body.style.backgroundColor
old_theme_func = """  // Dynamic Theme & Day/Night Mode Synchronization
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        const root = document.documentElement;
        if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
        if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
        if (c.accentEmerald || c.accentColor) {
          root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
          root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor);
        }
      }"""

new_theme_func = """  // Dynamic Theme & Day/Night Mode Synchronization
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        const root = document.documentElement;
        if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
        if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
        if (c.accentEmerald || c.accentColor) {
          root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
          root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor);
        }
      }

      if (isDay) {
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }"""

old_cleanup = """    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_payment_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
    };"""

new_cleanup = """    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_payment_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };"""

old_wrapper = """  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >"""

new_wrapper = """  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ 
        color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)',
        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)'
      }}
    >"""

if old_theme_func in content:
    content = content.replace(old_theme_func, new_theme_func)
if old_cleanup in content:
    content = content.replace(old_cleanup, new_cleanup)
if old_wrapper in content:
    content = content.replace(old_wrapper, new_wrapper)

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully patched background styling for day/night mode in {profile_path}")
