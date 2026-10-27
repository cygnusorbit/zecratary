import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile } = body || {};

    if (!profile || !profile.email) {
      return NextResponse.json({ success: false, error: 'Profile with email is required' }, { status: 400 });
    }

    const cleanEmail = profile.email.toLowerCase().trim();
    const displayName = profile.name || profile.given_name || cleanEmail.split('@')[0];
    const avatar = profile.picture || profile.avatar || '';

    const userObj = {
      id: profile.sub ? `usr_google_${profile.sub}` : `usr_${Date.now()}`,
      name: displayName,
      email: cleanEmail,
      avatar: avatar,
      provider: 'google',
      role: cleanEmail.includes('admin') ? 'admin' : 'user',
      token_balance: 50000,
      subscription_plan: 'taster'
    };

    // Upsert into PostgreSQL users table (Constraint 8)
    try {
      const { query } = await import('@/lib/db');
      if (typeof query === 'function') {
        await query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE NOT NULL,
            avatar TEXT,
            provider VARCHAR(50) DEFAULT 'local',
            role VARCHAR(50) DEFAULT 'user',
            token_balance BIGINT DEFAULT 50000,
            subscription_plan VARCHAR(100) DEFAULT 'free',
            last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await query(`
          INSERT INTO users (id, name, email, avatar, provider, role, token_balance, subscription_plan, last_login_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            avatar = EXCLUDED.avatar,
            last_login_at = NOW(),
            updated_at = NOW()
        `, [userObj.id, userObj.name, userObj.email, userObj.avatar, userObj.provider, userObj.role, userObj.token_balance, userObj.subscription_plan]);
      }
    } catch (dbErr) {
      console.warn('[google-session] Database sync warning:', dbErr);
    }

    // Always redirect to /dashboard upon successful Google login
    const response = NextResponse.json({
      success: true,
      user: userObj,
      redirectUrl: '/dashboard'
    });

    const userRaw = JSON.stringify(userObj);
    const userEncoded = encodeURIComponent(userRaw);
    const keys = ['zecratary_session', 'zecratary_current_user', 'zecratary_auth_session', 'currentUser'];
    
    keys.forEach(k => {
      response.cookies.set({
        name: k,
        value: userEncoded,
        path: '/',
        maxAge: 604800,
        sameSite: 'lax'
      });
    });

    return response;
  } catch (err: any) {
    console.error('[google-session] Handler error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
