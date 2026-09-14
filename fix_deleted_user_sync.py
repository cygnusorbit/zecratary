import os
import glob
import re

# 1. Locate App Router root directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')
os.makedirs(data_dir, exist_ok=True)

# 2. Update /api/admin/users/route.ts with server-side deleted tombstone tracking
api_users_dir = os.path.join(app_dir, 'api', 'admin', 'users')
os.makedirs(api_users_dir, exist_ok=True)
api_users_file = os.path.join(api_users_dir, 'route.ts')

api_users_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getUsersFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'users.json');
}

function getDeletedFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'deleted_users.json');
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

function readDeleted(): string[] {
  const filePath = getDeletedFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) return JSON.parse(raw);
    } catch (_) {}
  }
  return [];
}

function writeDeleted(list: string[]) {
  const filePath = getDeletedFilePath();
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
}

function readUsers(): any[] {
  const filePath = getUsersFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) return JSON.parse(raw);
    } catch (_) {}
  }
  return [...DEFAULT_USERS];
}

function writeUsers(users: any[]) {
  const filePath = getUsersFilePath();
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const deletedList = readDeleted();
    const deletedSet = new Set(deletedList.map(s => s.toLowerCase().trim()));
    const rawUsers = readUsers();

    const activeUsers = rawUsers.filter((u: any) => {
      if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
      if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
      return true;
    });

    return NextResponse.json({ success: true, users: activeUsers, deletedUsers: deletedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const users = readUsers();
    const deletedList = readDeleted();
    const deletedSet = new Set(deletedList.map(s => s.toLowerCase().trim()));
    const incomingList = Array.isArray(body) ? body : [body];

    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      if (deletedSet.has(cleanEmail)) continue;

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

    writeUsers(users);
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, email } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanId = (id || '').trim().toLowerCase();

    // 1. Record in server tombstone list
    const deletedList = readDeleted();
    if (cleanEmail && !deletedList.includes(cleanEmail)) deletedList.push(cleanEmail);
    if (cleanId && !deletedList.includes(cleanId)) deletedList.push(cleanId);
    writeDeleted(deletedList);

    // 2. Remove permanently from users.json
    let users = readUsers();
    users = users.filter((u: any) => {
      if (cleanId && u.id && u.id.toLowerCase() === cleanId) return false;
      if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return false;
      return true;
    });
    writeUsers(users);

    return NextResponse.json({ success: true, deleted: { id, email }, deletedUsers: deletedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_users_file, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Updated /api/admin/users route at {api_users_file}")

# 3. Update loadUsers in /admin/users/page.tsx to synchronize cleanly with the server
admin_user_pages = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

updated_load_users = """  const loadUsers = useCallback(async () => {
    initAuthStorage();
    let deletedSet = new Set<string>();
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const parsed: string[] = JSON.parse(rawDel);
        parsed.forEach((s) => deletedSet.add(s.toLowerCase().trim()));
      }
    } catch (_) {}

    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          if (Array.isArray(data.deletedUsers)) {
            data.deletedUsers.forEach((s: string) => deletedSet.add(s.toLowerCase().trim()));
            try {
              localStorage.setItem('zecratary_deleted_users', JSON.stringify(Array.from(deletedSet)));
            } catch (_) {}
          }

          const synchronizedUsers = data.users
            .filter((u: any) => {
              if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
              if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
              return true;
            })
            .map((u: any) => ({
              ...u,
              subscriptionPlan: u.subscriptionPlan || (u.role === 'admin' ? 'nutrition-pro-annual' : 'taster')
            }));

          setUsers(synchronizedUsers);
          localStorage.setItem('zecratary_users', JSON.stringify(synchronizedUsers));
          return;
        }
      }
    } catch (_) {}

    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const filtered = parsed
          .filter((u: any) => {
            if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
            if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
            return true;
          })
          .map((u: any) => ({
            ...u,
            subscriptionPlan: u.subscriptionPlan || (u.role === 'admin' ? 'nutrition-pro-annual' : 'taster')
          }));
        setUsers(filtered);
      } catch (e) {}
    }
  }, []);"""

for target_file in admin_user_pages:
    if not os.path.exists(target_file):
        continue
    with open(target_file, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(r'const\s+loadUsers\s*=\s*useCallback\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[.*?\]\);', re.MULTILINE)
    if pattern.search(content):
        content = pattern.sub(updated_load_users.strip(), content, count=1)
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Connected server-authoritative loadUsers in {target_file}")

# 4. Verify /profile/page.tsx handleDeleteAccount
profile_paths = [
    os.path.join(app_dir, 'profile', 'page.tsx'),
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx'
]
profile_file = next((p for p in profile_paths if os.path.exists(p)), None)

if profile_file:
    with open(profile_file, 'r', encoding='utf-8') as f:
        p_content = f.read()

    if 'handleDeleteAccount' in p_content:
        print(f"✓ User self-deletion handler confirmed in {profile_file}")
    else:
        print(f"⚠ Note: Ensure handleDeleteAccount is present on {profile_file}")

print("\n🚀 Cross-session user deletion fix successfully installed!")
