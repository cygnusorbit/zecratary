import os
import glob
import re

# 1. Locate App Router root
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/users/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(matches[0])))

if not app_dir:
    print("❌ Error: Could not locate Next.js App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')

print(f"✓ Target App Router directory: {app_dir}")

# 2. Patch lib/auth.ts initAuthStorage to respect deleted tombstones
auth_paths = glob.glob('**/lib/auth.ts', recursive=True)
auth_paths = [p for p in auth_paths if 'node_modules' not in p and '.next' not in p]

if auth_paths:
    auth_path = auth_paths[0]
    with open(auth_path, 'r', encoding='utf-8') as f:
        auth_code = f.read()

    new_init_auth = """export function initAuthStorage(): void {
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

    const initialLen = users.length;
    users = users.filter((u) => {
      if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
      if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
      return true;
    });
    if (users.length !== initialLen) modified = true;

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

    init_pattern = re.compile(r'export\s+function\s+initAuthStorage\s*\([^)]*\)\s*:\s*void\s*\{[\s\S]*?\n\}', re.MULTILINE)
    if init_pattern.search(auth_code):
        auth_code = init_pattern.sub(lambda _: new_init_auth, auth_code, count=1)
        with open(auth_path, 'w', encoding='utf-8') as f:
            f.write(auth_code)
        print(f"✓ Patched initAuthStorage in {auth_path}")

# 3. Patch loadUsers in admin/users/page.tsx
user_page_paths = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

new_load_users = """  const loadUsers = useCallback(() => {
    initAuthStorage();
    let deletedSet = new Set<string>();
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const parsed: string[] = JSON.parse(rawDel);
        deletedSet = new Set(parsed.map((s) => s.toLowerCase().trim()));
      }
    } catch (_) {}

    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter((u: any) => {
          if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
          if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
          return true;
        });

        const mapped = filtered.map((u: any) => ({
          ...u,
          subscriptionPlan: u.subscriptionPlan || (u.role === 'admin' ? 'nutrition-pro-annual' : 'taster')
        }));
        setUsers(mapped);
      } catch (e) {}
    }
  }, []);"""

for upp in user_page_paths:
    if not os.path.exists(upp):
        continue
    with open(upp, 'r', encoding='utf-8') as f:
        page_content = f.read()

    load_pattern = re.compile(r'const\s+loadUsers\s*=\s*useCallback\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\]\);', re.MULTILINE)
    if load_pattern.search(page_content):
        page_content = load_pattern.sub(lambda _: new_load_users, page_content, count=1)
        with open(upp, 'w', encoding='utf-8') as f:
            f.write(page_content)
        print(f"✓ Patched loadUsers to filter tombstones in {upp}")

# 4. Ensure /api/admin/users/route.ts DELETE handler
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
print(f"✓ Updated API users route with robust DELETE: {api_users_file}")

print("\n🚀 User resurrection bug successfully fixed!")
