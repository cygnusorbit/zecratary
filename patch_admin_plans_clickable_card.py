import os
import glob
import re

candidates = [
    'src/app/admin/plans/page.tsx',
    'apps/web/src/app/admin/plans/page.tsx',
    'apps/web/app/admin/plans/page.tsx',
    'app/admin/plans/page.tsx'
]

target_files = [p for p in candidates if os.path.exists(p)]
if not target_files:
    matches = glob.glob('**/admin/plans/page.tsx', recursive=True)
    target_files = [p for p in matches if 'node_modules' not in p and '.next' not in p]

if not target_files:
    print("❌ Error: Could not locate admin/plans/page.tsx")
    exit(1)

for page_path in target_files:
    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update the card container div to be clickable and show a pointer cursor
    old_card_pattern = re.compile(
        r'(<div\s+key=\{cardIdentifier\}\s+className="p-4 rounded-2xl border flex items-center justify-between transition shadow-xs)(")',
        re.MULTILINE
    )

    if old_card_pattern.search(content):
        content = old_card_pattern.sub(
            r'\1 cursor-pointer hover:border-[var(--color-primary,#E05638)]"\n                      onClick={() => handleEditPackage(pkg)}',
            content,
            count=1
        )
        print(f"✓ Made card background clickable in {page_path}")
    else:
        # Fallback if className already modified
        old_div = '<div\n                      key={cardIdentifier}\n                      className='
        if old_div in content:
            content = content.replace(
                old_div,
                '<div\n                      key={cardIdentifier}\n                      onClick={() => handleEditPackage(pkg)}\n                      className='
            )
            print(f"✓ Attached onClick to card container in {page_path}")

    # 2. Stop event propagation on the action buttons container so button clicks don't double-trigger
    old_actions_div = '<div className="flex items-center gap-1.5 shrink-0">'
    new_actions_div = '<div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>'

    if old_actions_div in content:
        content = content.replace(old_actions_div, new_actions_div)
        print(f"✓ Protected action buttons with stopPropagation in {page_path}")

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Background card selection on /admin/plans enabled successfully!")
