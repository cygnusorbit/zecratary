import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDiskUserPaths(): string[] {
  return [
    path.join(process.cwd(), 'data', 'users.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'users.json'),
    path.join(process.cwd(), 'src', 'data', 'users.json'),
    path.join(process.cwd(), 'apps', 'web', 'src', 'data', 'users.json'),
    path.join(process.cwd(), 'apps', 'web', 'apps', 'web', 'data', 'users.json')
  ];
}

function purgeUserFromDisk(id?: string, email?: string) {
  const cleanId = (id || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanId && !cleanEmail) return;

  for (const p of getDiskUserPaths()) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((item: any) => {
            const matchId = cleanId && item.id === cleanId;
            const matchEmail = cleanEmail && item.email && item.email.toLowerCase().trim() === cleanEmail;
            return !(matchId || matchEmail);
          });
          fs.writeFileSync(p, JSON.stringify(filtered, null, 2), 'utf-8');
        }
      }
    } catch (_) {}
  }
}

async function ensureUsersTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(64) DEFAULT 'user',
        subscription_plan VARCHAR(128) DEFAULT 'taster',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deleted_users (
        email VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(128),
        deleted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(64) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
  } catch (e) {
    console.error('[ensureUsersTable Error]:', e);
  }
}

async function cleanupForeignKeysForUser(userId: string, userEmail: string) {
  const cleanId = (userId || '').trim();
  const cleanEmail = (userEmail || '').toLowerCase().trim();

  // 1. Dynamic Foreign Key resolution via PostgreSQL catalog
  try {
    const fkRows = await query(`
      SELECT 
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema 
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name 
        AND ccu.table_schema = tc.table_schema 
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'users';
    `);

    for (const fk of fkRows) {
      const tbl = fk.table_name;
      const col = fk.column_name;
      if (!tbl || !col || tbl === 'users') continue;

      try {
        if (tbl === 'recipes' || tbl === 'payment_transactions') {
          try {
            await query(`UPDATE "${tbl}" SET "${col}" = NULL WHERE "${col}"::text = $1 OR "${col}"::text = $2`, [cleanId, cleanEmail]);
          } catch (_) {
            await query(`DELETE FROM "${tbl}" WHERE "${col}"::text = $1 OR "${col}"::text = $2`, [cleanId, cleanEmail]);
          }
        } else {
          await query(`DELETE FROM "${tbl}" WHERE "${col}"::text = $1 OR "${col}"::text = $2`, [cleanId, cleanEmail]);
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[Dynamic FK cleanup note]:', err);
  }

  // 2. Explicit cleanup across all known entities
  const knownTables = [
    { table: 'saved_recipes', col: 'user_id', action: 'delete' },
    { table: 'user_meal_plans', col: 'user_id', action: 'delete' },
    { table: 'meal_plans', col: 'user_id', action: 'delete' },
    { table: 'shopping_lists', col: 'user_id', action: 'delete' },
    { table: 'pantry_items', col: 'user_id', action: 'delete' },
    { table: 'favorites', col: 'user_id', action: 'delete' },
    { table: 'user_preferences', col: 'user_id', action: 'delete' },
    { table: 'user_settings', col: 'user_id', action: 'delete' },
    { table: 'chef_conversations', col: 'user_id', action: 'delete' },
    { table: 'chat_history', col: 'user_id', action: 'delete' },
    { table: 'recipe_ratings', col: 'user_id', action: 'delete' },
    { table: 'recipe_likes', col: 'user_id', action: 'delete' },
    { table: 'recipe_comments', col: 'user_id', action: 'delete' },
    { table: 'comments', col: 'user_id', action: 'delete' },
    { table: 'user_tokens', col: 'user_id', action: 'delete' },
    { table: 'user_quotas', col: 'user_id', action: 'delete' },
    { table: 'notifications', col: 'user_id', action: 'delete' },
    { table: 'payment_transactions', col: 'user_id', action: 'nullify_or_delete' },
    { table: 'recipes', col: 'user_id', action: 'nullify_or_delete' }
  ];

  for (const item of knownTables) {
    try {
      if (item.action === 'nullify_or_delete') {
        try {
          await query(`UPDATE "${item.table}" SET "${item.col}" = NULL WHERE "${item.col}"::text = $1 OR "${item.col}"::text = $2`, [cleanId, cleanEmail]);
        } catch (_) {
          await query(`DELETE FROM "${item.table}" WHERE "${item.col}"::text = $1 OR "${item.col}"::text = $2`, [cleanId, cleanEmail]);
        }
      } else {
        await query(`DELETE FROM "${item.table}" WHERE "${item.col}"::text = $1 OR "${item.col}"::text = $2`, [cleanId, cleanEmail]);
      }
    } catch (_) {}
  }
}

export async function GET() {
  await ensureUsersTable();
  try {
    let rows = await query(`
      SELECT 
        id,
        name,
        email,
        password,
        role,
        COALESCE(subscription_plan, 'taster') AS "subscriptionPlan",
        created_at AS "createdAt"
      FROM users
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at DESC
    `);

    // Ensure system root administrator exists in PostgreSQL
    const hasAdmin = rows.some((u: any) => u.id === 'usr_admin_1' || u.email?.toLowerCase() === 'admin@zecratary.com');
    if (!hasAdmin) {
      await query(`
        INSERT INTO users (id, name, email, password, role, subscription_plan, created_at, updated_at)
        VALUES ('usr_admin_1', 'System Administrator', 'admin@zecratary.com', '$2a$10$DefaultHashedPasswordPlaceholderForDemoOnly', 'admin', 'nutrition-pro-annual', NOW(), NOW())
        ON CONFLICT (email) DO NOTHING;
      `);
      rows = await query(`
        SELECT id, name, email, password, role, COALESCE(subscription_plan, 'taster') AS "subscriptionPlan", created_at AS "createdAt"
        FROM users ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at DESC
      `);
    }

    return NextResponse.json(
      { success: true, users: rows },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    console.error('[API users GET Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureUsersTable();
  try {
    const body = await req.json();
    if (!body || !body.email) {
      return NextResponse.json({ success: false, error: 'User email is required.' }, { status: 400 });
    }

    const cleanEmail = body.email.toLowerCase().trim();
    const id = body.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
    const name = body.name || 'User';
    const password = body.password || '$2a$10$DefaultHashedPasswordPlaceholderForDemoOnly';
    const role = (body.role || 'user').toLowerCase();
    const subscriptionPlan = (body.subscriptionPlan || body.planSlug || 'taster').toLowerCase().trim();

    await query('DELETE FROM deleted_users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);

    await query(`
      INSERT INTO users (id, name, email, password, role, subscription_plan, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = COALESCE(NULLIF(EXCLUDED.password, ''), users.password),
        role = EXCLUDED.role,
        subscription_plan = EXCLUDED.subscription_plan,
        updated_at = NOW()
    `, [id, name, cleanEmail, password, role, subscriptionPlan, body.createdAt || null]);

    const rows = await query(`
      SELECT 
        id,
        name,
        email,
        password,
        role,
        COALESCE(subscription_plan, 'taster') AS "subscriptionPlan",
        created_at AS "createdAt"
      FROM users
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at DESC
    `);

    return NextResponse.json({ success: true, users: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureUsersTable();
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let email = searchParams.get('email');

    if (!id && !email) {
      try {
        const body = await req.json();
        id = body?.id;
        email = body?.email;
      } catch (_) {}
    }

    if (!id && !email) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required for deletion.' }, { status: 400 });
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanId = (id || '').trim();

    // 1. Identify user row
    const target = await query(
      'SELECT id, role, email FROM users WHERE id::text = $1 OR id::text = $2 OR LOWER(email) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1',
      [cleanId || cleanEmail, cleanEmail || cleanId]
    );

    let targetId = cleanId;
    let targetEmail = cleanEmail;

    if (target.length > 0) {
      const user = target[0];

      // Protect primary root admin
      if (user.role === 'admin' && (user.id === 'usr_admin_1' || user.email?.toLowerCase() === 'admin@zecratary.com')) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the primary system administrator.' },
          { status: 403 }
        );
      }

      targetId = user.id;
      targetEmail = (user.email || '').toLowerCase().trim();
    } else {
      if (cleanId === 'usr_admin_1' || cleanEmail === 'admin@zecratary.com') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the primary system administrator.' },
          { status: 403 }
        );
      }
    }

    // 2. Insert into PostgreSQL deleted_users tombstone table
    if (targetEmail) {
      await query(`
        INSERT INTO deleted_users (email, user_id, deleted_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (email) DO UPDATE SET deleted_at = NOW();
      `, [targetEmail, targetId]);
    }

    // 3. Foreign Key Safety: Clean up any foreign key constraints across dependent tables
    await cleanupForeignKeysForUser(targetId, targetEmail);

    // 4. Delete user from PostgreSQL users table
    await query(
      'DELETE FROM users WHERE id::text = $1 OR id::text = $2 OR LOWER(email) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [targetId, targetEmail]
    );

    // 5. Purge from disk caches
    purgeUserFromDisk(targetId, targetEmail);

    // 6. Return updated remaining user list
    const remaining = await query(`
      SELECT 
        id,
        name,
        email,
        password,
        role,
        COALESCE(subscription_plan, 'taster') AS "subscriptionPlan",
        created_at AS "createdAt"
      FROM users
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at DESC
    `);

    return NextResponse.json({
      success: true,
      message: 'User permanently deleted from PostgreSQL.',
      users: remaining
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err: any) {
    console.error('[API users DELETE Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
