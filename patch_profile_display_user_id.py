import os
import glob
import re

# 1. Locate profile page
candidates = [
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx',
    'apps/web/app/profile/page.tsx',
    'app/profile/page.tsx'
]

profile_path = next((p for p in candidates if os.path.exists(p)), None)

if not profile_path:
    matches = glob.glob('**/profile/page.tsx', recursive=True)
    matches = [p for p in matches if 'node_modules' not in p and '.next' not in p]
    if matches:
        profile_path = matches[0]

if not profile_path:
    print("❌ Error: Could not locate profile/page.tsx")
    exit(1)

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Prevent duplicate additions
if 'ID: {user.id}' in content or 'ID:</span>' in content:
    print(f"ℹ️ User ID is already displayed in {profile_path}")
    exit(0)

# 3. Locate the user email paragraph in the header card and append User ID
email_pattern = re.compile(r'(<p[^>]*font-mono[^>]*>[\s\S]*?\{user\.email\}[\s\S]*?</p>)')

id_snippet = r'''\1
                {user.id && (
                  <p className="text-[11px] font-mono tracking-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    ID: {user.id}
                  </p>
                )}'''

new_content, count = email_pattern.subn(id_snippet, content, count=1)

if count == 0:
    # Fallback to direct string replacement
    target = '{user.email}</p>'
    if target in content:
        replacement = """{user.email}</p>
                {user.id && (
                  <p className="text-[11px] font-mono tracking-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    ID: {user.id}
                  </p>
                )}"""
        new_content = content.replace(target, replacement, 1)
        count = 1

if count > 0:
    with open(profile_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"✓ Successfully displayed User ID on {profile_path}")
else:
    print(f"❌ Error: Could not match user email element in {profile_path}")
    exit(1)

print("🚀 User ID display patch applied!")
