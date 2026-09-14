import os
import glob
import re

# 1. Discover App Router root directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/users/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(matches[0])))

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')
os.makedirs(data_dir, exist_ok=True)

# 2. Update /api/admin/users/route.ts to handle user creation and un-tombstone records
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
    let deletedList = readDeleted();
    const incomingList = Array.isArray(body) ? body : [body];

    // Remove incoming created users from tombstone list
    const incomingEmails = new Set(incomingList.map(u => (u.email || '').toLowerCase().trim()));
    const incomingIds = new Set(incomingList.map(u => (u.id || '').toLowerCase().trim()));
    deletedList = deletedList.filter(d => {
      const lower = d.toLowerCase().trim();
      return !incomingEmails.has(lower) && !incomingIds.has(lower);
    });
    writeDeleted(deletedList);

    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      const existingIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

      const userRecord = {
        id: incoming.id || `usr_${Date.now().toString(36)}`,
        name: incoming.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: incoming.password || 'password123',
        role: incoming.role || 'user',
        subscriptionPlan: incoming.subscriptionPlan || incoming.subscriptionTier || 'taster',
        subscriptionTier: incoming.subscriptionTier || incoming.subscriptionPlan || 'taster',
        createdAt: incoming.createdAt || new Date().toISOString(),
        ...incoming
      };

      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...userRecord };
      } else {
        users.unshift(userRecord);
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

    const deletedList = readDeleted();
    if (cleanEmail && !deletedList.includes(cleanEmail)) deletedList.push(cleanEmail);
    if (cleanId && !deletedList.includes(cleanId)) deletedList.push(cleanId);
    writeDeleted(deletedList);

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
print(f"✓ Provisioned /api/admin/users route at {api_users_file}")

# 3. Patch /admin/users/page.tsx
user_page_paths = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

for page_path in user_page_paths:
    if not os.path.exists(page_path):
        continue

    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Async handleAddUserSubmit with API persistence and tombstone cleanup
    new_add_user_submit = """  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError('Please fill in all required fields.');
      return;
    }

    if (users.some(u => u && u.email && u.email.toLowerCase() === cleanEmail)) {
      setAddError('A user with this email address already exists.');
      return;
    }

    if (addPassword.length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    const assignedPlan = addSubscriptionPlan || (addRole === 'admin' ? 'nutrition-pro-annual' : 'taster');

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      subscriptionPlan: assignedPlan,
      createdAt: new Date().toISOString()
    };

    // 1. Un-blacklist email from local tombstone store if previously deleted
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const delList: string[] = JSON.parse(rawDel);
        const filteredDel = delList.filter(s => s.toLowerCase().trim() !== cleanEmail && s !== newUser.id);
        localStorage.setItem('zecratary_deleted_users', JSON.stringify(filteredDel));
      }
    } catch (_) {}

    // 2. Persist to server API registry
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
    } catch (err) {
      console.error('Failed to sync new user to backend:', err);
    }

    // 3. Update local state & storage
    const updated = [newUser, ...users.filter(u => !u.email || u.email.toLowerCase() !== cleanEmail)];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`User "${newUser.name}" created with "${getPlanBadge(newUser.subscriptionPlan).label}" plan!`);
  };"""

    # Sync edited user to server
    new_edit_sync = """    saveUsersList(updated);

    const editedTarget = updated.find(u => u.id === editingUserId);
    if (editedTarget) {
      fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedTarget),
      }).catch(() => {});
    }"""

    # Robust server loadUsers
    new_load_users = """  const loadUsers = useCallback(async () => {
    initAuthStorage();
    let deletedSet = new Set<string>();
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const parsed: string[] = JSON.parse(rawDel);
        parsed.forEach((s) => deletedSet.add(s.toLowerCase().trim()));
      }
    } catch (_) {}

    let localList: AppUser[] = [];
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        localList = JSON.parse(raw);
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          if (Array.isArray(data.deletedUsers)) {
            data.deletedUsers.forEach((s: string) => deletedSet.add(s.toLowerCase().trim()));
          }

          const serverUsers: AppUser[] = data.users;
          const mergedMap = new Map<string, AppUser>();
          serverUsers.forEach((u: any) => {
            if (u && u.email) mergedMap.set(u.email.toLowerCase(), u);
          });
          localList.forEach((u: any) => {
            if (u && u.email) {
              const existing = mergedMap.get(u.email.toLowerCase()) || {};
              mergedMap.set(u.email.toLowerCase(), { ...existing, ...u });
            }
          });

          const merged = Array.from(mergedMap.values())
            .filter((u: any) => {
              if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
              if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
              return true;
            })
            .map((u: any) => ({
              ...u,
              subscriptionPlan: u.subscriptionPlan || (u.role === 'admin' ? 'nutrition-pro-annual' : 'taster')
            }));

          setUsers(merged);
          localStorage.setItem('zecratary_users', JSON.stringify(merged));
          return;
        }
      }
    } catch (_) {}

    const filtered = localList
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
  }, []);"""

    # Replace handleAddUserSubmit
    add_pattern = re.compile(r'const\s+handleAddUserSubmit\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?showToast\([^;]+;\s*\};', re.MULTILINE)
    if add_pattern.search(content):
        content = add_pattern.sub(new_add_user_submit, content, count=1)
        print(f"✓ Patched handleAddUserSubmit in {page_path}")

    # Replace loadUsers
    load_pattern = re.compile(r'const\s+loadUsers\s*=\s*useCallback\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[.*?\]\);', re.MULTILINE)
    if load_pattern.search(content):
        content = load_pattern.sub(new_load_users, content, count=1)
        print(f"✓ Patched loadUsers in {page_path}")

    # Replace edit sync
    if "editedTarget" not in content:
        content = content.replace("saveUsersList(updated);", new_edit_sync, 1)

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 User creation patch successfully installed!")
