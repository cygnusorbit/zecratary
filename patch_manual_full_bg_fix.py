import os
import glob

candidates = [
    'apps/web/src/app/recipes/manual/page.tsx', 
    'src/app/recipes/manual/page.tsx', 
    'apps/web/src/app/manual/page.tsx', 
    'src/app/manual/page.tsx'
]
manual_path = next((p for p in candidates if os.path.exists(p)), None)
if not manual_path:
    matches = glob.glob('**/manual/page.tsx', recursive=True)
    if matches:
        manual_path = matches[0]

if not manual_path:
    print("❌ Error: Could not locate manual recipe page")
    exit(1)

with open(manual_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Ensure applySavedTheme sets document.body.style.backgroundColor for day mode
old_apply = """      if (isDayMode) {
        if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
        if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        if (c.accentEmerald || c.accentColor) {
          root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
        }
      }"""

new_apply = """      if (isDayMode) {
        if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
        if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        if (c.accentEmerald || c.accentColor) {
          root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
        }
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }"""

if old_apply in content:
    content = content.replace(old_apply, new_apply)

with open(manual_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully patched body background synchronization in {manual_path}")
