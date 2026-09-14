import os
import glob
import re

# 1. Discover App Router root and lib directories
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
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')

os.makedirs(data_dir, exist_ok=True)
os.makedirs(lib_dir, exist_ok=True)

# 2. Ensure /api/system-settings route persists settings directly to local server disk
sys_settings_dir = os.path.join(app_dir, 'api', 'system-settings')
os.makedirs(sys_settings_dir, exist_ok=True)
sys_settings_file = os.path.join(sys_settings_dir, 'route.ts')

sys_settings_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSettingsPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'system_settings.json');
}

export async function GET() {
  try {
    const sPath = getSettingsPath();
    let settings: any = {};
    if (fs.existsSync(sPath)) {
      const raw = fs.readFileSync(sPath, 'utf-8');
      if (raw.trim()) settings = JSON.parse(raw);
    }
    return new NextResponse(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sPath = getSettingsPath();
    let current: any = {};
    if (fs.existsSync(sPath)) {
      try {
        const raw = fs.readFileSync(sPath, 'utf-8');
        if (raw.trim()) current = JSON.parse(raw);
      } catch (_) {}
    }
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    fs.writeFileSync(sPath, JSON.stringify(updated, null, 2), 'utf-8');
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(sys_settings_file, 'w', encoding='utf-8') as f:
    f.write(sys_settings_code)
print(f"✓ Created/Updated server settings persistence endpoint: {sys_settings_file}")

# 3. Ensure /api/admin/users persists all users directly to data/users.json on server disk
api_users_dir = os.path.join(app_dir, 'api', 'admin', 'users')
os.makedirs(api_users_dir, exist_ok=True)
api_users_file = os.path.join(api_users_dir, 'route.ts')

api_users_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUsersFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    const users = readUsers();
    return new NextResponse(JSON.stringify({ success: true, users }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const users = readUsers();
    const incomingList = Array.isArray(body) ? body : [body];

    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      const existingIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

      const record = {
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
        users[existingIdx] = { ...users[existingIdx], ...record };
      } else {
        users.unshift(record);
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
    let users = readUsers();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanId = (id || '').trim().toLowerCase();

    if (cleanId === 'usr_admin_1') {
      return NextResponse.json({ success: false, error: 'Cannot delete primary admin' }, { status: 403 });
    }

    users = users.filter((u: any) => {
      if (cleanId && u.id && u.id.toLowerCase() === cleanId) return false;
      if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return false;
      return true;
    });

    writeUsers(users);
    return NextResponse.json({ success: true, deleted: { id, email } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_users_file, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Created/Updated server user persistence endpoint: {api_users_file}")

# 4. Patch lib/siteConfig.ts so saveSiteConfig() syncs to the server API immediately
site_config_path = os.path.join(lib_dir, 'siteConfig.ts')
if os.path.exists(site_config_path):
    with open(site_config_path, 'r', encoding='utf-8') as f:
        s_content = f.read()

    server_sync_dispatch = """  // Synchronize to local server disk storage
  try {
    fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSettings: updated })
    }).catch(() => {});
  } catch (_) {}"""

    if "fetch('/api/system-settings'" not in s_content:
        s_content = re.sub(
            r"(updateFavicon\([^)]*\);?)",
            f"\\1\n{server_sync_dispatch}",
            s_content,
            count=1
        )
        with open(site_config_path, 'w', encoding='utf-8') as f:
            f.write(s_content)
        print(f"✓ Connected server sync inside {site_config_path}")

# 5. Patch lib/auth.ts to sync user mutations to server on setCurrentUser
auth_path = os.path.join(lib_dir, 'auth.ts')
if os.path.exists(auth_path):
    with open(auth_path, 'r', encoding='utf-8') as f:
        a_content = f.read()

    server_user_sync = """  // Synchronize user to server disk storage
  try {
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).catch(() => {});
  } catch (_) {}"""

    if "fetch('/api/admin/users'" not in a_content:
        a_content = re.sub(
            r"(syncSessionCookie\(user\);?)",
            f"\\1\n{server_user_sync}",
            a_content,
            count=1
        )
        with open(auth_path, 'w', encoding='utf-8') as f:
            f.write(a_content)
        print(f"✓ Connected server sync inside {auth_path}")

print("\n🚀 Server-side data synchronization patch successfully applied!")
