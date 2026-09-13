import os
import glob

candidates = ['apps/web/src/app/recipes/manual/page.tsx', 'src/app/recipes/manual/page.tsx', 'apps/web/src/app/manual/page.tsx', 'src/app/manual/page.tsx']
manual_path = next((p for p in candidates if os.path.exists(p)), None)
if not manual_path:
    matches = glob.glob('**/manual/page.tsx', recursive=True)
    if matches:
        manual_path = matches[0]

if not manual_path:
    print("Error: Could not locate manual recipe page")
    exit(1)

with open(manual_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_return_start = """  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ 
        color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)',
        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)'
      }}
    >"""

new_return_start = """  return (
    <div 
      className="w-full min-h-screen pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ 
        color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)',
        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">"""

if old_return_start in content:
    content = content.replace(old_return_start, new_return_start)
    content = content.replace('    </form>\n    </div>\n  );', '    </form>\n      </div>\n    </div>\n  );')

with open(manual_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully patched full-width day mode background in {manual_path}")
