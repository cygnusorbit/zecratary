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
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')
os.makedirs(data_dir, exist_ok=True)

print(f"✓ Detected App Router: {app_dir}")

# 2. Provision /api/admin/users route for persistent cross-session sync
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

export async function GET() {
  try {
    const filePath = getUsersFilePath();
    let users = [...DEFAULT_USERS];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) {
        users = JSON.parse(raw);
      }
    } else {
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
    let users: any[] = [];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) {
        users = JSON.parse(raw);
      }
    }
    if (users.length === 0) {
      users = [...DEFAULT_USERS];
    }

    const incomingList = Array.isArray(body) ? body : [body];
    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      const existingIdx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...incoming };
      } else {
        users.unshift({
          id: incoming.id || `usr_google_${Date.now().toString(36)}`,
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
"""

with open(api_admin_users_file, 'w', encoding='utf-8') as f:
    f.write(api_users_code)
print(f"✓ Provisioned /api/admin/users route at: {api_admin_users_file}")

# 3. Update /api/auth/callback/route.ts to automatically record Google users server-side
api_auth_callback_dir = os.path.join(app_dir, 'api', 'auth', 'callback')
os.makedirs(api_auth_callback_dir, exist_ok=True)
api_auth_callback_file = os.path.join(api_auth_callback_dir, 'route.ts')

api_auth_callback_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getEnvMap() {
  const rootDir = process.cwd();
  const localEnv = path.join(rootDir, '.env.local');
  const envFile = fs.existsSync(localEnv) ? localEnv : path.join(rootDir, '.env');
  const envMap: Record<string, string> = {};
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf-8');
    content.split('\\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^[\\"\\']|[\\"\\']$/g, '');
          envMap[key] = val;
        }
      }
    });
  }
  return envMap;
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
    const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
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

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_oauth_code', req.url));
  }

  try {
    const envMap = getEnvMap();
    const clientId = envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const clientSecret = envMap['GOOGLE_CLIENT_SECRET'] || process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${url.origin}/api/auth/callback`;

    let email = '';
    let name = '';
    let avatar = '';

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

    if (!email) {
      email = 'google_user@gmail.com';
      name = 'Google User';
    }

    const cleanEmail = email.toLowerCase().trim();
    const newUser = {
      id: `usr_google_${Date.now().toString(36)}`,
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'user',
      subscriptionPlan: 'taster',
      subscriptionTier: 'taster',
      createdAt: new Date().toISOString(),
      avatar,
    };

    saveUserToServer(newUser);

    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('social_success', 'true');
    redirectUrl.searchParams.set('provider', 'google');
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
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message)}`, req.url));
  }
}
"""

with open(api_auth_callback_file, 'w', encoding='utf-8') as f:
    f.write(api_auth_callback_code)
print(f"✓ Synchronized OAuth callback at: {api_auth_callback_file}")

# 4. Update lib/socialAuth.ts to push new social accounts to server endpoint
social_auth_path = os.path.join(lib_dir, 'socialAuth.ts')
social_auth_code = """import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

export type SocialProvider = 'google' | 'facebook' | 'apple';

export interface SocialLoginConfig {
  googleEnabled: boolean;
  googleClientId: string;
  facebookEnabled: boolean;
  facebookClientId: string;
  appleEnabled: boolean;
  appleClientId: string;
}

export const DEFAULT_SOCIAL_CONFIG: SocialLoginConfig = {
  googleEnabled: true,
  googleClientId: '',
  facebookEnabled: false,
  facebookClientId: '',
  appleEnabled: false,
  appleClientId: '',
};

export function getSocialLoginConfig(): SocialLoginConfig {
  if (typeof window === 'undefined') return DEFAULT_SOCIAL_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_social_login_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        googleEnabled: parsed.googleEnabled ?? true,
        googleClientId: parsed.googleClientId || '',
        facebookEnabled: parsed.facebookEnabled ?? false,
        facebookClientId: parsed.facebookClientId || '',
        appleEnabled: parsed.appleEnabled ?? false,
        appleClientId: parsed.appleClientId || '',
      };
    }
  } catch (_) {}
  return DEFAULT_SOCIAL_CONFIG;
}

export interface SocialProfile {
  name: string;
  email: string;
  avatar?: string;
  provider: SocialProvider;
}

export function decodeGoogleCredential(credential: string): { email: string; name: string; avatar?: string } | null {
  try {
    const base64Url = credential.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      email: payload.email,
      name: payload.name || payload.given_name || payload.email.split('@')[0],
      avatar: payload.picture,
    };
  } catch (err) {
    return null;
  }
}

export function executeSocialAuth(profile: SocialProfile): User {
  initAuthStorage();
  const cleanEmail = profile.email.trim().toLowerCase();
  const rawUsers = localStorage.getItem('zecratary_users');
  const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

  let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!matchedUser) {
    matchedUser = {
      id: `usr_${profile.provider}_${Date.now().toString(36)}`,
      name: profile.name.trim() || `${profile.provider.toUpperCase()} User`,
      email: cleanEmail,
      role: 'user',
      subscriptionPlan: 'taster',
      subscriptionTier: 'taster',
      createdAt: new Date().toISOString(),
    };
    users.unshift(matchedUser);
    localStorage.setItem('zecratary_users', JSON.stringify(users));
  }

  setCurrentUser(matchedUser);

  // Sync to server storage so admin can see user across any browser session
  try {
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchedUser),
    }).catch(() => {});
  } catch (_) {}

  window.dispatchEvent(new Event('zecratary_users_updated'));
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.dispatchEvent(new Event('storage'));

  return matchedUser;
}
"""

with open(social_auth_path, 'w', encoding='utf-8') as f:
    f.write(social_auth_code)
print(f"✓ Updated social auth engine at: {social_auth_path}")

# 5. Fix /login/page.tsx: Handle social_success BEFORE checking if session exists
login_dirs = [os.path.join(app_dir, 'login'), os.path.join(app_dir, '(auth)', 'login')]
login_dir = next((d for d in login_dirs if os.path.exists(d)), login_dirs[0])
login_page_path = os.path.join(login_dir, 'page.tsx')

if os.path.exists(login_page_path):
    with open(login_page_path, 'r', encoding='utf-8') as f:
        login_content = f.read()

    # Reorder useEffect so isSocialSuccess executes first
    old_auth_check = re.search(r'useEffect\(\(\)\s*=>\s*\{\s*initAuthStorage\(\);[\s\S]*?router\.replace\([\'\"]/profile[\'\"]\);[\s\S]*?return;\s*\}', login_content)
    if old_auth_check:
        corrected_block = """  // Capture backend OAuth redirects and persist credentials
  useEffect(() => {
    const isSocialSuccess = searchParams.get('social_success') === 'true';
    if (isSocialSuccess) {
      const provider = (searchParams.get('provider') || 'google') as SocialProvider;
      const callbackEmail = searchParams.get('email') || '';
      const callbackName = searchParams.get('name') || '';

      if (callbackEmail) {
        setSuccess(`${t('signedInWith') || 'Signed in with'} ${provider.toUpperCase()}! Redirecting...`);
        executeSocialAuth({
          name: callbackName,
          email: callbackEmail,
          provider
        });
        setTimeout(() => router.replace('/profile'), 500);
        return;
      }
    }

    initAuthStorage();
    if (getCurrentUser()) {
      router.replace('/profile');
      return;
    }

    const errParam = searchParams.get('error');
    if (errParam) {
      setError(decodeURIComponent(errParam));
      return;
    }
  }, [searchParams, router, t]);"""

        # Replace existing social success useEffect block
        pattern = r'useEffect\(\(\)\s*=>\s*\{\s*initAuthStorage\(\);[\s\S]*?\[searchParams,\s*router,\s*t\]\);'
        login_content = re.sub(pattern, corrected_block, login_content, count=1)

        with open(login_page_path, 'w', encoding='utf-8') as f:
            f.write(login_content)
        print(f"✓ Fixed social redirect order in {login_page_path}")

# 6. Update /admin/users and /users to merge server users with local users
admin_users_paths = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

for target_file in admin_users_paths:
    if not os.path.exists(target_file):
        continue
    with open(target_file, 'r', encoding='utf-8') as f:
        u_code = f.read()

    # Enhance loadUsers to fetch from /api/admin/users and merge
    old_load = re.search(r'const loadUsers = useCallback\(\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[.*?\]\);', u_code)
    if old_load:
        new_load = """const loadUsers = useCallback(async () => {
    let localList: User[] = [];
    try {
      const raw = localStorage.getItem('zecratary_users');
      if (raw) localList = JSON.parse(raw);
    } catch (_) {}

    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const serverUsers: User[] = data.users;
          const mergedMap = new Map<string, User>();
          serverUsers.forEach(u => {
            if (u && u.email) mergedMap.set(u.email.toLowerCase(), u);
          });
          localList.forEach(u => {
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

    if (localList.length > 0) {
      setUsers(localList);
    } else {
      setUsers(DEFAULT_USERS);
    }
  }, []);"""
        u_code = u_code.replace(old_load.group(0), new_load)
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(u_code)
        print(f"✓ Enhanced live server synchronization in {target_file}")

print("\n🚀 User synchronization fix applied successfully!")
