import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  if (pool) return pool;

  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.PG_CONNECTION_STRING;

  if (!connectionString) {
    return null;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return pool;
  } catch (err) {
    console.error('[PostgreSQL] Pool initialization error:', err);
    return null;
  }
}

export async function syncUserToPostgres(user: any): Promise<any> {
  let resolvedUser = { ...user };
  const p = getPostgresPool();

  if (p) {
    try {
      await p.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          picture TEXT,
          avatar TEXT,
          subscription_plan VARCHAR(100) DEFAULT 'taster',
          provider VARCHAR(50) DEFAULT 'credentials',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const alterQueries = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'credentials'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'taster'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
      ];
      for (const q of alterQueries) {
        try { await p.query(q); } catch (_) {}
      }

      const email = user.email.toLowerCase().trim();
      const existing = await p.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );

      if (existing.rows && existing.rows.length > 0) {
        const row = existing.rows[0];
        const updatedRes = await p.query(
          `UPDATE users SET 
            name = COALESCE($1, name),
            picture = COALESCE($2, picture),
            avatar = COALESCE($2, avatar),
            provider = COALESCE(provider, 'google'),
            updated_at = CURRENT_TIMESTAMP
          WHERE LOWER(email) = LOWER($3)
          RETURNING *`,
          [
            user.name || row.name, 
            user.picture || row.picture || row.avatar, 
            email
          ]
        );
        const ur = updatedRes.rows[0] || row;
        resolvedUser = {
          id: ur.id,
          name: ur.name,
          email: ur.email,
          role: ur.role || row.role || user.role || 'user',
          subscriptionPlan: ur.subscription_plan || row.subscription_plan || 'taster',
          picture: ur.picture || ur.avatar || user.picture || '',
          avatar: ur.avatar || ur.picture || user.avatar || '',
          createdAt: ur.created_at || user.createdAt
        };
      } else {
        const insertRes = await p.query(
          `INSERT INTO users (id, name, email, role, picture, avatar, subscription_plan, provider, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $5, $6, 'google', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            user.id,
            user.name,
            email,
            user.role || 'user',
            user.picture || '',
            user.subscriptionPlan || 'taster'
          ]
        );
        const nr = insertRes.rows[0];
        if (nr) {
          resolvedUser = {
            id: nr.id,
            name: nr.name,
            email: nr.email,
            role: nr.role,
            subscriptionPlan: nr.subscription_plan,
            picture: nr.picture || nr.avatar || '',
            avatar: nr.avatar || nr.picture || '',
            createdAt: nr.created_at
          };
        }
      }
    } catch (dbErr) {
      console.error('[PostgreSQL] Failed to sync user to PostgreSQL:', dbErr);
    }
  }

  // File-based store fallback
  try {
    const cwd = process.cwd();
    const paths = [
      path.join(cwd, 'apps/web/data/users.json'),
      path.join(cwd, 'data/users.json')
    ];
    for (const p of paths) {
      try {
        let list: any[] = [];
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          list = JSON.parse(raw);
          if (!Array.isArray(list)) list = [];
        } else {
          fs.mkdirSync(path.dirname(p), { recursive: true });
        }
        const idx = list.findIndex(u => u && u.email && u.email.toLowerCase() === resolvedUser.email.toLowerCase());
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...resolvedUser };
        } else {
          list.unshift(resolvedUser);
        }
        fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf-8');
      } catch (_) {}
    }
  } catch (_) {}

  return resolvedUser;
}
