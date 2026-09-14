import os
import glob
import re

# 1. Discover App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
components_dir = os.path.join(base_dir, 'components')

# 2. Redirect legacy /admin/add-user to /admin/users
add_user_dir = os.path.join(app_dir, 'admin', 'add-user')
if os.path.exists(add_user_dir):
    add_user_page = os.path.join(add_user_dir, 'page.tsx')
    redirect_code = """'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyAddUserRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);
  return null;
}
"""
    with open(add_user_page, 'w', encoding='utf-8') as f:
        f.write(redirect_code)
    print(f"✓ Configured legacy route redirect in {add_user_page} -> /admin/users")

# 3. Synchronize Sidebar navigation links
sidebar_candidates = [
    os.path.join(components_dir, 'Sidebar.tsx'),
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((p for p in sidebar_candidates if os.path.exists(p)), None)

if sidebar_path:
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        sidebar_content = f.read()

    if '/admin/add-user' in sidebar_content:
        sidebar_content = sidebar_content.replace('/admin/add-user', '/admin/users')
        sidebar_content = re.sub(r'>\s*Add User\s*<', '>Users<', sidebar_content)
        with open(sidebar_path, 'w', encoding='utf-8') as f:
            f.write(sidebar_content)
        print(f"✓ Updated Sidebar.tsx link to point exclusively to /admin/users")
    else:
        print(f"✓ Sidebar.tsx already points to /admin/users")

print("\n🚀 Route standardization to /admin/users enforced successfully!")
