import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getAdminSettings(): any {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return {};
}

function getRedirectUri(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
  const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
  return `${proto}://${host}/api/auth/callback/google`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/profile';
  const settings = getAdminSettings();
  const social = settings?.socialLogin || {};

  const clientId = (
    social.googleClientId || 
    process.env.GOOGLE_CLIENT_ID || 
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
    ''
  ).trim();

  if (!clientId) {
    const errorUrl = new URL('/login', req.url);
    errorUrl.searchParams.set('error', 'missing_google_client_id');
    return NextResponse.redirect(errorUrl);
  }

  const redirectUri = getRedirectUri(req);

  const statePayload = JSON.stringify({
    callbackUrl,
    provider: 'google',
    nonce: Math.random().toString(36).substring(2, 12),
    timestamp: Date.now()
  });
  const state = Buffer.from(statePayload).toString('base64url');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('include_granted_scopes', 'true');
  googleAuthUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(googleAuthUrl.toString(), 307);
  res.cookies.set('zecratary_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600
  });

  return res;
}
