import os
import glob
import re

# 1. Locate App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

print(f"✓ Detected App Router: {app_dir}")

# 2. Add DELETE handler to /api/admin/users/route.ts
api_users_path = os.path.join(app_dir, 'api', 'admin', 'users', 'route.ts')
os.makedirs(os.path.dirname(api_users_path), exist_ok=True)

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
    email: 'admin@foodieprep.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    subscriptionTier: 'nutrition-pro-annual',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_admin_2',
    name: 'System Admin',
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

with open(api_users_path, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Provisioned DELETE route handler in {api_users_path}")

# 3. Patch handleDeleteUser in /admin/users and /users pages
user_pages = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx'),
    os.path.join(app_dir, 'admin', 'add-user', 'page.tsx')
]

new_delete_handler = """  const handleDeleteUser = async (id: string, email: string) => {
    if (currentUser && (currentUser.id === id || (currentUser.email && currentUser.email.toLowerCase() === email.toLowerCase()))) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete ${email}?`)) return;

    try {
      // 1. Remove from server registry
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email })
      });

      // 2. Remove from local client state and localStorage
      const cleanEmail = email.toLowerCase().trim();
      const updated = users.filter(u => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail));
      setUsers(updated);
      localStorage.setItem('zecratary_users', JSON.stringify(updated));

      // 3. Notify app components
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMsg({ text: `User ${email} removed successfully.`, type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ text: 'Failed to delete user: ' + err.message, type: 'error' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };"""

for page_path in user_pages:
    if not os.path.exists(page_path):
        continue

    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match existing handleDeleteUser function
    pattern = re.compile(r'const\s+handleDeleteUser\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \};', re.MULTILINE)
    if pattern.search(content):
        content = pattern.sub(new_delete_handler, content, count=1)
        with open(page_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Connected async server deletion in {page_path}")

print("\n🚀 User deletion fix applied successfully!")
