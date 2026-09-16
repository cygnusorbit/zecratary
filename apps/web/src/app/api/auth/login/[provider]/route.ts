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

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ provider: string }> | { provider: string } }
) {
  const params = await Promise.resolve(context.params);
  const provider = (params?.provider || '').toLowerCase();
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/profile';
  const settings = getAdminSettings();
  const social = settings?.socialLogin || {};

  if (provider === 'google') {
    const clientId = social.googleClientId || 
                     process.env.GOOGLE_CLIENT_ID || 
                     process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId || clientId.trim() === '') {
      const errorUrl = new URL('/login', req.url);
      errorUrl.searchParams.set('error', 'missing_google_client_id');
      return NextResponse.redirect(errorUrl);
    }

    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/callback/google`;

    const statePayload = JSON.stringify({
      callbackUrl,
      provider: 'google',
      nonce: Math.random().toString(36).substring(2, 12),
      timestamp: Date.now()
    });
    const state = Buffer.from(statePayload).toString('base64url');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId.trim());
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('prompt', 'select_account'); // Prompt user to select Gmail account
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

  // Fallback for unconfigured providers
  const fallbackUrl = new URL('/login', req.url);
  fallbackUrl.searchParams.set('error', `unsupported_provider_${provider}`);
  return NextResponse.redirect(fallbackUrl);
}
