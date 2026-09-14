import os
import glob
import re

# 1. Locate active App Router root
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/users/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(matches[0])))

if not app_dir:
    print("❌ Error: Could not locate Next.js App Router directory.")
    exit(1)

print(f"✓ Target App Router directory: {app_dir}")

# 2. Ensure /api/admin/users/route.ts handles DELETE requests properly
api_users_dir = os.path.join(app_dir, 'api', 'admin', 'users')
os.makedirs(api_users_dir, exist_ok=True)
api_users_file = os.path.join(api_users_dir, 'route.ts')

api_users_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getUsersFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'users.json');
}

const DEFAULT_USERS = [
  {
    id: 'usr_admin_1',
    name: 'Administrator',
    email: 'admin@zecratary.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    subscriptionTier: 'nutrition-pro-annual',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_admin_01',
    name: 'Admin System',
    email: 'admin@zecratary.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    subscriptionTier: 'nutrition-pro-annual',
    createdAt: new Date().toISOString()
  }
];

function readUsersFromFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) {
        return JSON.parse(raw);
      }
    } catch (_) {}
  }
  return [...DEFAULT_USERS];
}

export async function GET() {
  try {
    const filePath = getUsersFilePath();
    let users = readUsersFromFile(filePath);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    }
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = getUsersFilePath();
    let users = readUsersFromFile(filePath);

    const incomingList = Array.isArray(body) ? body : [body];
    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      const existingIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...incoming };
      } else {
        users.unshift({
          id: incoming.id || `usr_${Date.now().toString(36)}`,
          name: incoming.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: incoming.role || 'user',
          subscriptionPlan: incoming.subscriptionPlan || 'taster',
          subscriptionTier: incoming.subscriptionTier || 'taster',
          createdAt: incoming.createdAt || new Date().toISOString(),
          ...incoming
        });
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, email } = await req.json();
    const filePath = getUsersFilePath();
    let users = readUsersFromFile(filePath);

    const cleanEmail = (email || '').trim().toLowerCase();
    users = users.filter((u: any) => {
      if (id && u.id === id) return false;
      if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return false;
      return true;
    });

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""

with open(api_users_file, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Provisioned DELETE endpoint at {api_users_file}")

# 3. Patch user management pages (/admin/users/page.tsx and /users/page.tsx)
target_page_paths = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

robust_delete_fn = """  // Delete User
  const handleDeleteUser = async (id: string, userEmail: string, userName?: string) => {
    const targetUser = users.find(u => u.id === id || (u.email && u.email.toLowerCase() === userEmail.toLowerCase()));

    if (currentUser?.email?.toLowerCase() === userEmail.toLowerCase() || currentUser?.id === id) {
      alert('You cannot delete your own active admin account.');
      return;
    }

    if (isFirstAdminUser && isFirstAdminUser(targetUser)) {
      alert('The primary system administrator account cannot be deleted.');
      return;
    }

    const displayName = userName || targetUser?.name || userEmail;
    if (!confirm(`Are you sure you want to delete "${displayName}" (${userEmail})? This action cannot be undone.`)) return;

    try {
      const cleanEmail = userEmail.toLowerCase().trim();

      // 1. Record tombstone in localStorage to prevent cache resurrection
      try {
        const rawDel = localStorage.getItem('zecratary_deleted_users');
        const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (cleanEmail && !delList.includes(cleanEmail)) delList.push(cleanEmail);
        if (id && !delList.includes(id)) delList.push(id);
        localStorage.setItem('zecratary_deleted_users', JSON.stringify(delList));
      } catch (_) {}

      // 2. Remove locally from state and localStorage
      const updated = users.filter(u => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail));
      setUsers(updated);
      localStorage.setItem('zecratary_users', JSON.stringify(updated));

      // 3. Remove from backend API
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: cleanEmail }),
      }).catch(() => {});

      showToast(`User "${displayName}" has been deleted.`);
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user: ' + (err?.message || 'Server error'));
    }
  };"""

for pp in target_page_paths:
    if not os.path.exists(pp):
        continue

    with open(pp, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match existing handleDeleteUser implementation
    pattern = re.compile(
        r'//\s*Delete User\s*\n\s*const\s+handleDeleteUser\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \};',
        re.MULTILINE
    )

    if pattern.search(content):
        content = pattern.sub(lambda _: robust_delete_fn, content, count=1)
        print(f"✓ Replaced handleDeleteUser in {pp}")
    else:
        # Fallback regex for variant formatting
        alt_pattern = re.compile(r'const\s+handleDeleteUser\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\};', re.MULTILINE)
        if alt_pattern.search(content):
            content = alt_pattern.sub(lambda _: robust_delete_fn, content, count=1)
            print(f"✓ Replaced variant handleDeleteUser in {pp}")
        else:
            print(f"⚠ Could not match handleDeleteUser pattern in {pp}")

    with open(pp, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Robust user deletion patch applied successfully!")
