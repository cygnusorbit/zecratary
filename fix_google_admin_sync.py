import os
import glob
import re

# 1. Locate Next.js App Router root
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
lib_dir = os.path.join(base_dir, 'lib')
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')
os.makedirs(data_dir, exist_ok=True)
os.makedirs(lib_dir, exist_ok=True)

print(f"✓ Detected App Router: {app_dir}")

# 2. Update /api/admin/users/route.ts to persist users in data/users.json
api_admin_users_dir = os.path.join(app_dir, 'api', 'admin', 'users')
os.makedirs(api_admin_users_dir, exist_ok=True)
api_admin_users_file = os.path.join(api_admin_users_dir, 'route.ts')

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
    return NextResponse.json({ success: true, users });
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
      if (existingIdx !== -1) {
        users[existingIdx] = {
          ...users[existingIdx],
          ...incoming,
          subscriptionPlan: incoming.subscriptionPlan || users[existingIdx].subscriptionPlan || 'taster',
          subscriptionTier: incoming.subscriptionTier || users[existingIdx].subscriptionTier || 'taster'
        };
      } else {
        users.unshift({
          id: incoming.id || `usr_google_${Date.now().toString(36)}`,
          name: incoming.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: incoming.role || 'user',
          subscriptionPlan: incoming.subscriptionPlan || incoming.subscriptionTier || 'taster',
          subscriptionTier: incoming.subscriptionTier || incoming.subscriptionPlan || 'taster',
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
    let users = readUsers();
    const cleanEmail = (email || '').trim().toLowerCase();
    users = users.filter((u: any) => {
      if (id && u.id === id) return false;
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

with open(api_admin_users_file, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Synchronized /api/admin/users server registry at: {api_admin_users_file}")

# 3. Update /api/auth/callback/route.ts to persist Google profiles on the server
callback_dir = os.path.join(app_dir, 'api', 'auth', 'callback')
os.makedirs(callback_dir, exist_ok=True)
callback_file = os.path.join(callback_dir, 'route.ts')

callback_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getSystemDefaultPlan(): string {
  try {
    const rootDir = process.cwd();
    const plansFile = path.join(rootDir, 'data', 'subscription_configs.json');
    if (fs.existsSync(plansFile)) {
      const content = fs.readFileSync(plansFile, 'utf-8');
      const configs = JSON.parse(content);
      if (Array.isArray(configs) && configs.length > 0) {
        const defaultPlan = configs.find((c: any) => c.isDefault);
        if (defaultPlan?.slug || defaultPlan?.id) return defaultPlan.slug || defaultPlan.id;
        const freePlan = configs.find((c: any) => c.isFree || (Number(c.monthlyPriceDollars || 0) === 0));
        if (freePlan?.slug || freePlan?.id) return freePlan.slug || freePlan.id;
        return configs[0]?.slug || configs[0]?.id || 'taster';
      }
    }
  } catch (_) {}
  return 'taster';
}

function saveUserToServer(user: any) {
  try {
    const rootDir = process.cwd();
    const dir = path.join(rootDir, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'users.json');
    let users: any[] = [];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) users = JSON.parse(raw);
    }
    const cleanEmail = user.email.trim().toLowerCase();
    const idx = users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.unshift(user);
    }
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (_) {}
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = (url.searchParams.get('state') || 'google').toLowerCase();

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  }

  let email = url.searchParams.get('email') || '';
  let name = url.searchParams.get('name') || '';
  let avatar = url.searchParams.get('avatar') || '';

  if (code && state === 'google') {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
      const redirectUri = `${url.origin}/api/auth/callback`;

      if (clientId && clientSecret) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        const tokens = await tokenRes.json();
        if (tokens.access_token) {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const userInfo = await userRes.json();
          email = userInfo.email || '';
          name = userInfo.name || userInfo.given_name || email.split('@')[0];
          avatar = userInfo.picture || '';
        } else if (tokens.id_token) {
          const base64Url = tokens.id_token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
          email = payload.email || '';
          name = payload.name || payload.given_name || email.split('@')[0];
          avatar = payload.picture || '';
        }
      }
    } catch (_) {}
  }

  if (!email) {
    email = `${state}_user@gmail.com`;
    name = `${state.charAt(0).toUpperCase() + state.slice(1)} User`;
  }

  const cleanEmail = email.toLowerCase().trim();
  const defaultPlan = getSystemDefaultPlan();

  const newUser = {
    id: `usr_${state}_${Date.now().toString(36)}`,
    name: name || cleanEmail.split('@')[0],
    email: cleanEmail,
    role: 'user',
    subscriptionPlan: defaultPlan,
    subscriptionTier: defaultPlan,
    createdAt: new Date().toISOString(),
    avatar,
  };

  saveUserToServer(newUser);

  const redirectUrl = new URL('/login', req.url);
  redirectUrl.searchParams.set('social_success', 'true');
  redirectUrl.searchParams.set('provider', state);
  redirectUrl.searchParams.set('email', cleanEmail);
  redirectUrl.searchParams.set('name', name);
  if (avatar) redirectUrl.searchParams.set('avatar', avatar);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('zecratary_session', encodeURIComponent(JSON.stringify(newUser)), {
    path: '/',
    maxAge: 604800,
    sameSite: 'lax',
  });

  return response;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const code = form.get('code')?.toString();
  const state = form.get('state')?.toString() || 'google';
  const url = new URL(req.url);

  const getUrl = new URL(`${url.origin}/api/auth/callback`);
  if (code) getUrl.searchParams.set('code', code);
  getUrl.searchParams.set('state', state);

  return GET(new Request(getUrl.toString()));
}
"""

with open(callback_file, 'w', encoding='utf-8') as f:
    f.write(callback_code)
print(f"✓ Updated OAuth callback persistence route at: {callback_file}")

# 4. Patch loadUsers in /admin/users/page.tsx to fetch from /api/admin/users
admin_users_pages = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

new_load_users = """  const loadUsers = useCallback(async () => {
    initAuthStorage();
    let deletedSet = new Set<string>();
    try {
      const rawDel = localStorage.getItem('zecratary_deleted_users');
      if (rawDel) {
        const parsed: string[] = JSON.parse(rawDel);
        deletedSet = new Set(parsed.map((s) => s.toLowerCase().trim()));
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
          const serialized = JSON.stringify(merged);
          if (raw !== serialized) {
            localStorage.setItem('zecratary_users', serialized);
          }
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

for page_file in admin_users_pages:
    if not os.path.exists(page_file):
        continue
    with open(page_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern matches existing synchronous loadUsers function
    pattern = re.compile(r'const\s+loadUsers\s*=\s*useCallback\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\]\);')
    if pattern.search(content):
        content = pattern.sub(new_load_users.strip(), content, count=1)
        with open(page_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Patched loadUsers in {page_file}")

# 5. Ensure lib/socialAuth.ts broadcasts newly created accounts to /api/admin/users
social_auth_path = os.path.join(lib_dir, 'socialAuth.ts')
if os.path.exists(social_auth_path):
    with open(social_auth_path, 'r', encoding='utf-8') as f:
        sa_code = f.read()

    if "fetch('/api/admin/users'" not in sa_code:
        sa_code = sa_code.replace(
            "setCurrentUser(matchedUser);",
            """setCurrentUser(matchedUser);
  try {
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchedUser),
    }).catch(() => {});
  } catch (_) {}"""
        )
        with open(social_auth_path, 'w', encoding='utf-8') as f:
            f.write(sa_code)
        print(f"✓ Synchronized client socialAuth service at: {social_auth_path}")

print("\n🚀 Google user synchronization patch successfully deployed!")
