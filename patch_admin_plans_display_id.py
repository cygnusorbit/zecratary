import os
import glob
import re

candidates = [
    'apps/web/src/app/admin/plans/page.tsx',
    'src/app/admin/plans/page.tsx',
    'apps/web/app/admin/plans/page.tsx',
    'app/admin/plans/page.tsx'
]

target_file = next((f for f in candidates if os.path.exists(f)), None)

if not target_file:
    matches = glob.glob('**/admin/plans/page.tsx', recursive=True)
    target_file = next((f for f in matches if 'node_modules' not in f and '.next' not in f), None)

if not target_file:
    print("❌ Error: Could not locate admin/plans/page.tsx")
    exit(1)

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject Plan ID badge in System Plans List cards
pkg_name_pattern = re.compile(
    r'(<span className="font-bold text-sm"[^>]*>\{pkg\.name\}</span>)'
)

id_badge_snippet = r'''\1
                          <span 
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-xs"
                            style={{
                              backgroundColor: isDayMode ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#475569' : '#94a3b8'
                            }}
                            title={`Plan ID: ${pkg.id || pkg.slug}`}
                          >
                            ID: {pkg.id || pkg.slug}
                          </span>'''

if 'ID: {pkg.id || pkg.slug}' not in content:
    content, count1 = pkg_name_pattern.subn(id_badge_snippet, content, count=1)
    if count1 > 0:
        print(f"✓ Added Plan ID badge to System Plans List in {target_file}")
    else:
        print("⚠ Could not locate {pkg.name} element in System Plans List")
else:
    print(f"ℹ️ Plan ID is already displayed in System Plans List ({target_file})")

# 2. Inject Plan ID subtitle in the Live Card Mockup preview
mockup_title_pattern = re.compile(
    r'(<h3 className="text-2xl font-black text-\[#589c3a\]">\s*\{form\.name \|\| t\(\'planNameLabel\', \'Plan Name\'\)\}\s*</h3>)'
)

mockup_id_snippet = r'''<div>
                    \1
                    {(form.id || form.slug) && (
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5 font-bold">
                        ID: {form.id || form.slug}
                      </span>
                    )}
                  </div>'''

if 'ID: {form.id || form.slug}' not in content:
    content, count2 = mockup_title_pattern.subn(mockup_id_snippet, content, count=1)
    if count2 > 0:
        print(f"✓ Added Plan ID subtitle to Live Card Mockup in {target_file}")
    else:
        print("⚠ Could not locate live mockup header element")
else:
    print(f"ℹ️ Plan ID is already displayed in Live Card Mockup ({target_file})")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n🚀 Successfully updated {target_file} with Plan ID displays!")
