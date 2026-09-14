import os
import glob
import re

# 1. Locate active App Router directory
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
os.makedirs(lib_dir, exist_ok=True)

# 2. Update lib/socialAuth.ts with dynamic default subscription plan resolver
social_auth_path = os.path.join(lib_dir, 'socialAuth.ts')
social_auth_code = """import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

export type SocialProvider = 'google' | 'facebook' | 'apple' | 'github';

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

export function getDefaultSubscriptionPlan(): string {
  if (typeof window === 'undefined') return 'taster';
  try {
    const explicitDefault = localStorage.getItem('zecratary_default_plan');
    if (explicitDefault) return explicitDefault;

    const rawConfigs = localStorage.getItem('zecratary_subscription_configs');
    if (rawConfigs) {
      const configs = JSON.parse(rawConfigs);
      if (Array.isArray(configs) && configs.length > 0) {
        const defaultPlan = configs.find((c: any) => c.isDefault);
        if (defaultPlan?.slug || defaultPlan?.id) return defaultPlan.slug || defaultPlan.id;

        const freePlan = configs.find(
          (c: any) => c.isFree || (Number(c.monthlyPriceDollars || 0) === 0 && Number(c.annualPriceDollars || 0) === 0)
        );
        if (freePlan?.slug || freePlan?.id) return freePlan.slug || freePlan.id;

        if (configs[0]?.slug || configs[0]?.id) return configs[0].slug || configs[0].id;
      }
    }

    const rawPlans = localStorage.getItem('zecratary_subscription_plans');
    if (rawPlans) {
      const plans = JSON.parse(rawPlans);
      if (Array.isArray(plans) && plans.length > 0) {
        const free = plans.find((p: any) => p.priceCents === 0 || p.isFree);
        if (free?.slug || free?.id) return free.slug || free.id;
      }
    }
  } catch (_) {}
  return 'taster';
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
    const systemDefaultPlan = getDefaultSubscriptionPlan();
    matchedUser = {
      id: `usr_${profile.provider}_${Date.now().toString(36)}`,
      name: profile.name.trim() || `${profile.provider.toUpperCase()} User`,
      email: cleanEmail,
      role: 'user',
      subscriptionPlan: systemDefaultPlan,
      subscriptionTier: systemDefaultPlan,
      createdAt: new Date().toISOString(),
      avatar: profile.avatar,
    } as any;
    users.unshift(matchedUser);
    localStorage.setItem('zecratary_users', JSON.stringify(users));
  }

  setCurrentUser(matchedUser);

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
print(f"✓ Updated social authentication library with system default plan resolution: {social_auth_path}")

# 3. Update /api/auth/callback/route.ts to set system default subscription plan on server registration
callback_path = os.path.join(app_dir, 'api', 'auth', 'callback', 'route.ts')
callback_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getSystemDefaultPlan(): string {
  try {
    const rootDir = process.cwd();
    const plansFile = path.join(rootDir, 'data', 'subscription_configs.json');
    const altPlansFile = path.join(rootDir, 'data', 'plans.json');
    const target = fs.existsSync(plansFile) ? plansFile : (fs.existsSync(altPlansFile) ? altPlansFile : null);
    if (target) {
      const content = fs.readFileSync(target, 'utf-8');
      const configs = JSON.parse(content);
      if (Array.isArray(configs) && configs.length > 0) {
        const defaultPlan = configs.find((c: any) => c.isDefault);
        if (defaultPlan?.slug || defaultPlan?.id) return defaultPlan.slug || defaultPlan.id;
        const freePlan = configs.find(
          (c: any) => c.isFree || (Number(c.monthlyPriceDollars || 0) === 0 && Number(c.annualPriceDollars || 0) === 0)
        );
        if (freePlan?.slug || freePlan?.id) return freePlan.slug || freePlan.id;
        if (configs[0]?.slug || configs[0]?.id) return configs[0].slug || configs[0].id;
      }
    }
  } catch (_) {}
  return 'taster';
}

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
  const state = (url.searchParams.get('state') || 'google').toLowerCase();

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

    if (clientId && clientSecret && state === 'google') {
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
      email = url.searchParams.get('email') || `${state}_user@example.com`;
      name = url.searchParams.get('name') || `${state.charAt(0).toUpperCase() + state.slice(1)} User`;
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
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message)}`, req.url));
  }
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
with open(callback_path, 'w', encoding='utf-8') as f:
    f.write(callback_code)
print(f"✓ Updated OAuth callback route with system default plan resolution: {callback_path}")

# 4. Update /api/admin/users/route.ts default plan handling
admin_users_api_path = os.path.join(app_dir, 'api', 'admin', 'users', 'route.ts')
admin_users_api_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getUsersFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'users.json');
}

function getSystemDefaultPlan(): string {
  try {
    const rootDir = process.cwd();
    const plansFile = path.join(rootDir, 'data', 'subscription_configs.json');
    const altPlansFile = path.join(rootDir, 'data', 'plans.json');
    const target = fs.existsSync(plansFile) ? plansFile : (fs.existsSync(altPlansFile) ? altPlansFile : null);
    if (target) {
      const content = fs.readFileSync(target, 'utf-8');
      const configs = JSON.parse(content);
      if (Array.isArray(configs) && configs.length > 0) {
        const defaultPlan = configs.find((c: any) => c.isDefault);
        if (defaultPlan?.slug || defaultPlan?.id) return defaultPlan.slug || defaultPlan.id;
        const freePlan = configs.find(
          (c: any) => c.isFree || (Number(c.monthlyPriceDollars || 0) === 0 && Number(c.annualPriceDollars || 0) === 0)
        );
        if (freePlan?.slug || freePlan?.id) return freePlan.slug || freePlan.id;
        if (configs[0]?.slug || configs[0]?.id) return configs[0].slug || configs[0].id;
      }
    }
  } catch (_) {}
  return 'taster';
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
      if (raw.trim()) users = JSON.parse(raw);
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
      if (raw.trim()) users = JSON.parse(raw);
    }
    if (users.length === 0) users = [...DEFAULT_USERS];

    const defaultPlan = getSystemDefaultPlan();
    const incomingList = Array.isArray(body) ? body : [body];

    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      const existingIdx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      const plan = incoming.subscriptionPlan || incoming.subscriptionTier || defaultPlan;

      if (existingIdx !== -1) {
        users[existingIdx] = {
          ...users[existingIdx],
          ...incoming,
          subscriptionPlan: users[existingIdx].subscriptionPlan || plan,
          subscriptionTier: users[existingIdx].subscriptionTier || plan,
        };
      } else {
        users.unshift({
          id: incoming.id || `usr_${Date.now().toString(36)}`,
          name: incoming.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: incoming.role || 'user',
          subscriptionPlan: plan,
          subscriptionTier: plan,
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
    let users: any[] = [];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) users = JSON.parse(raw);
    }
    const cleanEmail = (email || '').toLowerCase().trim();
    users = users.filter(u => u.id !== id && (!cleanEmail || u.email.toLowerCase() !== cleanEmail));
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    return NextResponse.json({ success: true, deleted: { id, email } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(admin_users_api_path, 'w', encoding='utf-8') as f:
    f.write(admin_users_api_code)
print(f"✓ Updated /api/admin/users route with default plan resolution: {admin_users_api_path}")

# 5. Patch all register/page.tsx instances to resolve default system plan
register_files = glob.glob(f'{app_dir}/**/register/page.tsx', recursive=True)
for reg_file in register_files:
    with open(reg_file, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'getDefaultSubscriptionPlan' not in content:
        content = content.replace(
            "import { getCurrentUser, setCurrentUser, initAuthStorage, User } from '@/lib/auth';",
            "import { getCurrentUser, setCurrentUser, initAuthStorage, User } from '@/lib/auth';\nimport { getDefaultSubscriptionPlan } from '@/lib/socialAuth';"
        )

        content = re.sub(
            r"subscriptionPlan:\s*['\"]taster['\"]",
            "subscriptionPlan: getDefaultSubscriptionPlan()",
            content
        )
        content = re.sub(
            r"subscriptionTier:\s*['\"]taster['\"]",
            "subscriptionTier: getDefaultSubscriptionPlan()",
            content
        )

        with open(reg_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Patched register page with dynamic default subscription plan: {reg_file}")

print("\n🚀 System default subscription plan assignment applied successfully!")
