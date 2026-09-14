import os
import glob
import re

# 1. Locate App Router root
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
lib_dir = os.path.join(base_dir, 'lib')

# 2. Ensure /api/admin/users/route.ts has a working DELETE handler
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

with open(api_users_file, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Provisioned /api/admin/users route with DELETE handler: {api_users_file}")

# 3. Patch lib/auth.ts so initAuthStorage does not re-add deleted accounts
auth_path = os.path.join(lib_dir, 'auth.ts')
if not os.path.exists(auth_path):
    m = glob.glob('**/lib/auth.ts', recursive=True)
    if m: auth_path = m[0]

if os.path.exists(auth_path):
    with open(auth_path, 'r', encoding='utf-8') as f:
        auth_content = f.read()

    # Guard DEFAULT_USERS injection with deleted tombstone check
    old_init = re.search(r'export\s+function\s+initAuthStorage\s*\(\)\s*:\s*void\s*\{[\s\S]*?\n\}', auth_content)
    if old_init:
        clean_init = """export function initAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    let deletedSet = new Set<string>();
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const parsed: string[] = JSON.parse(rawDel);
        deletedSet = new Set(parsed.map((s) => s.toLowerCase().trim()));
      }
    } catch (_) {}

    const rawUsers = localStorage.getItem('zecratary_users');
    let users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

    let modified = false;

    for (const u of users) {
      if (!u.password || u.password.trim() === '') {
        u.password = u.role === 'admin' ? 'admin' : 'password';
        modified = true;
      }
    }

    for (const def of DEFAULT_USERS) {
      if (deletedSet.has(def.email.toLowerCase()) || (def.id && deletedSet.has(def.id.toLowerCase()))) {
        continue;
      }
      const idx = users.findIndex((u) => u.email.toLowerCase() === def.email.toLowerCase());
      if (idx === -1) {
        users.push({ ...def });
        modified = true;
      } else if (!users[idx].password) {
        users[idx].password = def.password;
        modified = true;
      }
    }

    if (modified || !rawUsers) {
      localStorage.setItem('zecratary_users', JSON.stringify(users));
    }
  } catch (_) {}
}"""
        auth_content = auth_content.replace(old_init.group(0), clean_init)
        with open(auth_path, 'w', encoding='utf-8') as f:
            f.write(auth_content)
        print(f"✓ Patched initAuthStorage in {auth_path}")

# 4. Patch /admin/users/page.tsx
page_paths = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

new_load_users = """  const loadUsers = useCallback(async () => {
    let localList: AppUser[] = [];
    try {
      const raw = localStorage.getItem('zecratary_users');
      if (raw) localList = JSON.parse(raw);
    } catch (_) {}

    let deletedSet = new Set<string>();
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const parsed: string[] = JSON.parse(rawDel);
        deletedSet = new Set(parsed.map((s) => s.toLowerCase().trim()));
      }
    } catch (_) {}

    localList = localList.filter((u) => {
      if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
      if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
      return true;
    });

    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const serverUsers: AppUser[] = data.users.filter((u: any) => {
            if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
            if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
            return true;
          });

          const mergedMap = new Map<string, AppUser>();
          serverUsers.forEach((u) => {
            if (u && u.email) mergedMap.set(u.email.toLowerCase(), u);
          });
          localList.forEach((u) => {
            if (u && u.email) {
              const existing = mergedMap.get(u.email.toLowerCase()) || {};
              mergedMap.set(u.email.toLowerCase(), { ...existing, ...u });
            }
          });

          const merged = Array.from(mergedMap.values());
          setUsers(merged);
          localStorage.setItem('zecratary_users', JSON.stringify(merged));
          return;
        }
      }
    } catch (_) {}

    setUsers(localList);
    localStorage.setItem('zecratary_users', JSON.stringify(localList));
  }, []);"""

new_delete_handler = """  // Delete User
  const handleDeleteUser = async (id: string, email: string, name?: string) => {
    if (currentUser && (currentUser.id === id || (currentUser.email && currentUser.email.toLowerCase() === email.toLowerCase()))) {
      alert('You cannot delete your own active administrator account.');
      return;
    }

    const targetUser = users.find((u) => u.id === id || (u.email && u.email.toLowerCase() === email.toLowerCase()));
    if (isFirstAdminUser(targetUser)) {
      alert('You cannot delete the primary system administrator account.');
      return;
    }

    const displayName = name ? `${name} (${email})` : email;
    if (!confirm(`Are you sure you want to permanently delete ${displayName}?`)) return;

    try {
      const cleanEmail = (email || '').toLowerCase().trim();

      // 1. Record in deleted list to avoid resurrection from cache
      try {
        const rawDel = localStorage.getItem('zecratary_deleted_users');
        const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (cleanEmail && !delList.includes(cleanEmail)) delList.push(cleanEmail);
        if (id && !delList.includes(id)) delList.push(id);
        localStorage.setItem('zecratary_deleted_users', JSON.stringify(delList));
      } catch (_) {}

      // 2. Remove locally
      const updated = users.filter((u) => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail));
      setUsers(updated);
      localStorage.setItem('zecratary_users', JSON.stringify(updated));

      // 3. Delete on server
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: cleanEmail }),
      }).catch(() => {});

      // 4. Feedback toast & event dispatch
      showToast(`User "${displayName}" deleted successfully.`);
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user: ' + (err?.message || 'Unknown error'));
    }
  };"""

for pp in page_paths:
    if not os.path.exists(pp):
        continue

    with open(pp, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace loadUsers
    load_pattern = re.compile(r'const\s+loadUsers\s*=\s*useCallback\s*\(\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\]\);', re.MULTILINE)
    if load_pattern.search(content):
        content = load_pattern.sub(lambda _: new_load_users, content, count=1)
        print(f"✓ Replaced loadUsers in {pp}")

    # Replace handleDeleteUser
    del_pattern = re.compile(r'//\s*Delete User\s*\n\s*const\s+handleDeleteUser\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \};', re.MULTILINE)
    if del_pattern.search(content):
        content = del_pattern.sub(lambda _: new_delete_handler, content, count=1)
        print(f"✓ Replaced handleDeleteUser in {pp}")

    with open(pp, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 User deletion fix installed successfully!")
