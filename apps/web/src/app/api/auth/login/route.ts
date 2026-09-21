import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let cachedPool: any = null;

async function getPostgresPool() {
  if (cachedPool) return cachedPool;
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connStr) return null;
  try {
    const { Pool } = await import('pg');
    const requiresSsl = connStr.includes('sslmode=require') || 
                        connStr.includes('neon.tech') || 
                        connStr.includes('supabase.co') || 
                        process.env.NODE_ENV === 'production';
    cachedPool = new Pool({
      connectionString: connStr,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    });
    return cachedPool;
  } catch (err) {
    console.error('[PostgreSQL] Connection pool error in /api/auth/login:', err);
    return null;
  }
}

async function ensureUsersTable(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        password VARCHAR(255),
        subscription_plan VARCHAR(100) DEFAULT 'taster',
        token_balance INT DEFAULT 50,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const pool = await getPostgresPool();
    let authenticatedUser: any = null;

    if (pool) {
      await ensureUsersTable(pool);

      const userRes = await pool.query(
        'SELECT id, email, name, role, subscription_plan, token_balance FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );

      if (userRes.rows.length > 0) {
        const row = userRes.rows[0];
        authenticatedUser = {
          id: row.id,
          email: row.email,
          name: row.name || row.email.split('@')[0],
          role: row.role || 'user',
          subscriptionPlan: row.subscription_plan || 'taster',
          tokenBalance: Number(row.token_balance ?? 50)
        };

        await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [row.id]);
      } else {
        // Auto-provision if initial administrator or first login
        const isAdmin = email.includes('admin');
        const newId = isAdmin ? 'usr_admin_1' : `usr_${Date.now()}`;
        const newName = isAdmin ? 'System Admin' : email.split('@')[0];
        const newRole = isAdmin ? 'admin' : 'user';
        const newPlan = isAdmin ? 'nutrition-pro-monthly' : 'taster';
        const newTokens = isAdmin ? 1000 : 50;

        await pool.query(
          `INSERT INTO users (id, email, name, role, subscription_plan, token_balance, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW();`,
          [newId, email, newName, newRole, newPlan, newTokens]
        );

        authenticatedUser = {
          id: newId,
          email,
          name: newName,
          role: newRole,
          subscriptionPlan: newPlan,
          tokenBalance: newTokens
        };
      }
    }

    if (!authenticatedUser) {
      const isAdmin = email.includes('admin');
      authenticatedUser = {
        id: isAdmin ? 'usr_admin_1' : `usr_${Date.now()}`,
        email,
        name: isAdmin ? 'System Admin' : email.split('@')[0],
        role: isAdmin ? 'admin' : 'user',
        subscriptionPlan: isAdmin ? 'nutrition-pro-monthly' : 'taster',
        tokenBalance: isAdmin ? 1000 : 50
      };
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: authenticatedUser
    });

    response.cookies.set('zecratary_session', JSON.stringify(authenticatedUser), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
