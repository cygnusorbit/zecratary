import { NextResponse } from 'next/server';
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
