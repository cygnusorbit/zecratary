import { NextRequest, NextResponse } from 'next/server';
import { getSafeOrigin } from '@/lib/originHelper';
import { getPersistedSocialSettings } from '@/lib/databaseSettings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const safeOrigin = getSafeOrigin(req);
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/profile';
  
  const social = await getPersistedSocialSettings();
  const clientId = (
    social.googleClientId || 
    process.env.GOOGLE_CLIENT_ID || 
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
    ''
  ).trim();

  // If Client ID is not configured, redirect back to /login safely (without 0.0.0.0)
  if (!clientId) {
    const errorUrl = new URL('/login', safeOrigin);
    errorUrl.searchParams.set('error', 'missing_google_client_id');
    return NextResponse.redirect(errorUrl.toString(), 307);
  }

  const redirectUri = `${safeOrigin}/api/auth/callback/google`;

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
