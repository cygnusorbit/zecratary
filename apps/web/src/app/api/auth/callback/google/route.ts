import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = req.nextUrl.origin || 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error || 'Google authorization cancelled')}`);
  }

  try {
    // 1. Fetch Client Secrets from PostgreSQL admin_settings
    const settingsRows = await query('SELECT social_login FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    const googleConfig = settingsRows[0]?.social_login?.google || {};

    const clientId = googleConfig.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = googleConfig.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/callback/google`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Google OAuth is not fully configured in Admin.')}`);
    }

    // 2. Exchange authorization code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(tokenData.error_description || 'Token exchange failed')}`);
    }

    // 3. Fetch Google User Profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Could not retrieve email from Google profile')}`);
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || email.split('@')[0];

    // 4. Query or Create User in PostgreSQL users table
    const existingUsers = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    let activeUser: any;

    if (existingUsers.length > 0) {
      activeUser = existingUsers[0];
      await query(`
        UPDATE users SET
          name = COALESCE($1, name),
          updated_at = NOW()
        WHERE email = $2
      `, [name, email]);
    } else {
      const newId = 'usr_google_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const isFirstAdmin = email === 'admin@zecratary.com' || email.includes('admin@');
      const role = isFirstAdmin ? 'admin' : 'user';

      await query(`
        INSERT INTO users (id, name, email, role, subscription_plan, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'taster', NOW(), NOW())
      `, [newId, name, email, role]);

      activeUser = {
        id: newId,
        name,
        email,
        role,
        subscriptionPlan: 'taster'
      };
    }

    const sessionPayload = {
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: activeUser.role,
      subscriptionPlan: activeUser.subscription_plan || activeUser.subscriptionPlan || 'taster',
      provider: 'google'
    };

    const targetRoute = activeUser.role === 'admin' ? '/admin' : '/dashboard';
    const response = NextResponse.redirect(`${origin}${targetRoute}`);

    response.cookies.set('zecratary_session', JSON.stringify(sessionPayload), {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'Authentication error')}`);
  }
}
