import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { queryMysql } from '@/lib/mysql';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();
    let matchedUser: any = null;

    // 1. PostgreSQL User Authentication & Audit Timestamp
    try {
      const { query } = await import('@/lib/db');
      if (typeof query === 'function') {
        const rows = await query(
          'SELECT id, name, email, role, avatar, provider, token_balance, subscription_plan, password FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [cleanEmail]
        );
        if (rows && rows.length > 0) {
          const dbUser = rows[0];
          if (!dbUser.password || dbUser.password === cleanPassword) {
            matchedUser = {
              id: String(dbUser.id),
              name: dbUser.name || 'User',
              email: dbUser.email,
              role: dbUser.role || 'user',
              avatar: dbUser.avatar || '',
              provider: dbUser.provider || 'local',
              token_balance: Number(dbUser.token_balance ?? 50000),
              subscription_plan: dbUser.subscription_plan || 'free'
            };

            try {
              await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [dbUser.id]);
            } catch (_) {}
          }
        }
      }
    } catch (pgErr) {
      console.warn('[auth:login] PostgreSQL check bypassed or unavailable:', pgErr);
    }

    // 2. MySQL Fallback Authentication & Audit Timestamp (Constraint 8)
    if (!matchedUser) {
      try {
        const myRows = await queryMysql(
          'SELECT id, name, email, role, avatar, provider, token_balance, subscription_plan, password FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
          [cleanEmail]
        );
        if (Array.isArray(myRows) && myRows.length > 0) {
          const myUser: any = myRows[0];
          if (!myUser.password || myUser.password === cleanPassword) {
            matchedUser = {
              id: String(myUser.id),
              name: myUser.name || 'User',
              email: myUser.email,
              role: myUser.role || 'user',
              avatar: myUser.avatar || '',
              provider: myUser.provider || 'local',
              token_balance: Number(myUser.token_balance ?? 50000),
              subscription_plan: myUser.subscription_plan || 'free'
            };

            try {
              await queryMysql('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?', [myUser.id]);
            } catch (_) {}
          }
        }
      } catch (myErr) {
        console.warn('[auth:login] MySQL check bypassed or unavailable:', myErr);
      }
    }

    // 3. Fallback to default user presets & local users.json
    if (!matchedUser) {
      if (cleanEmail === 'admin@zecratary.com' && (cleanPassword === 'admin' || cleanPassword === 'admin123')) {
        matchedUser = {
          id: 'usr_admin_1',
          name: 'System Administrator',
          email: 'admin@zecratary.com',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          provider: 'local',
          token_balance: 1000000,
          subscription_plan: 'nutrition-pro'
        };
      } else if (cleanEmail === 'user@zecratary.com' && (cleanPassword === 'password' || cleanPassword === 'user123')) {
        matchedUser = {
          id: 'usr_demo_1',
          name: 'Chef Jordan',
          email: 'user@zecratary.com',
          role: 'user',
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
          provider: 'local',
          token_balance: 50000,
          subscription_plan: 'taster'
        };
      } else {
        const jsonCandidates = ['data/users.json', 'apps/web/data/users.json'];
        for (const jPath of jsonCandidates) {
          if (fs.existsSync(jPath)) {
            try {
              const fileData = JSON.parse(fs.readFileSync(jPath, 'utf-8'));
              if (Array.isArray(fileData)) {
                const found = fileData.find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
                if (found && (!found.password || found.password === cleanPassword)) {
                  matchedUser = { ...found };
                  delete matchedUser.password;
                  break;
                }
              }
            } catch (_) {}
          }
        }
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Always redirect to /dashboard upon successful login
    const response = NextResponse.json({
      success: true,
      user: matchedUser,
      redirectUrl: '/dashboard'
    });

    const userRaw = JSON.stringify(matchedUser);
    const userEncoded = encodeURIComponent(userRaw);
    const cookieKeys = ['zecratary_session', 'zecratary_current_user', 'zecratary_auth_session', 'currentUser'];

    cookieKeys.forEach(k => {
      response.cookies.set({
        name: k,
        value: userEncoded,
        path: '/',
        maxAge: 604800,
        sameSite: 'lax'
      });
    });

    return response;
  } catch (error: any) {
    console.error('[api/auth/login] Error during authentication:', error);
    return NextResponse.json({ success: false, error: 'Internal server authentication error' }, { status: 500 });
  }
}
