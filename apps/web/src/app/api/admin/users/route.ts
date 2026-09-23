import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDiskUserPaths(): string[] {
  return [
    path.join(process.cwd(), 'data', 'users.json'),
    path.join(process.cwd(), 'data', 'users.json.bak'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'users.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'users.json.bak'),
    path.join(process.cwd(), 'apps', 'web', 'apps', 'web', 'data', 'users.json'),
    path.join(process.cwd(), 'src', 'data', 'users.json'),
    path.join(process.cwd(), 'apps', 'web', 'src', 'data', 'users.json')
  ];
}

async function ensureUsersTableAndMigrate() {
  try {
    // 1. Ensure table and all schema columns exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(64) DEFAULT 'user',
        subscription_plan VARCHAR(128) DEFAULT 'taster',
        subscription_tier VARCHAR(128) DEFAULT 'taster',
        plan_slug VARCHAR(128) DEFAULT 'taster',
        plan_name VARCHAR(255) DEFAULT 'Taster (Free)',
        plan_interval VARCHAR(32) DEFAULT 'MONTH',
        plan_expiry_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deleted_users (
        email VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(128),
        deleted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(64) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_slug VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) DEFAULT 'Taster (Free)';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_interval VARCHAR(32) DEFAULT 'MONTH';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `).catch(() => {});

    // 2. Fetch deleted tombstone
    let deletedEmails = new Set<string>();
    try {
      const deletedRows = await query('SELECT LOWER(TRIM(email)) AS email FROM deleted_users');
      const dArr = Array.isArray(deletedRows) ? deletedRows : (deletedRows?.rows || []);
      deletedEmails = new Set(dArr.map((r: any) => r.email));
    } catch (_) {}

    // 3. Harvest user profiles from disk
    const usersToInsert = new Map<string, any>();

    // Baseline root admin
    usersToInsert.set('admin@zecratary.com', {
      id: 'usr_admin_1',
      name: 'System Administrator',
      email: 'admin@zecratary.com',
      password: '$2a$10$DefaultHashedPasswordPlaceholderForDemoOnly',
      role: 'admin',
      subscriptionPlan: 'nutrition-pro-annual',
      planName: 'Nutrition Pro (Annual)',
      planInterval: 'YEAR',
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    const defaultSeedUsers = [
      {
        id: 'usr_user_1',
        name: 'Jordan Smith',
        email: 'jordan@example.com',
        role: 'user',
        subscriptionPlan: 'taster',
        planName: 'Taster (Free)',
        planInterval: 'MONTH',
        createdAt: '2026-01-05T08:30:00.000Z'
      },
      {
        id: 'usr_user_2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'user',
        subscriptionPlan: 'nutrition-pro-monthly',
        planName: 'Nutrition Pro (Monthly)',
        planInterval: 'MONTH',
        createdAt: '2026-01-10T11:15:00.000Z'
      },
      {
        id: 'usr_user_3',
        name: 'Michael Chang',
        email: 'michael@example.com',
        role: 'user',
        subscriptionPlan: 'nutrition-pro-annual',
        planName: 'Nutrition Pro (Annual)',
        planInterval: 'YEAR',
        createdAt: '2026-01-15T14:45:00.000Z'
      },
      {
        id: 'usr_user_4',
        name: 'Elena Rostova',
        email: 'elena@example.com',
        role: 'user',
        subscriptionPlan: 'taster',
        planName: 'Taster (Free)',
        planInterval: 'MONTH',
        createdAt: '2026-01-20T16:20:00.000Z'
      }
    ];

    for (const dUser of defaultSeedUsers) {
      const em = dUser.email.toLowerCase().trim();
      if (!deletedEmails.has(em)) {
        usersToInsert.set(em, dUser);
      }
    }

    for (const p of getDiskUserPaths()) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            for (const u of list) {
              if (u && u.email) {
                const em = u.email.toLowerCase().trim();
                if (!deletedEmails.has(em)) {
                  usersToInsert.set(em, {
                    id: u.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
                    name: u.name || em.split('@')[0],
                    email: em,
                    password: u.password || '$2a$10$DefaultHashedPasswordPlaceholderForDemoOnly',
                    role: (u.role || 'user').toLowerCase(),
                    subscriptionPlan: u.subscriptionPlan || u.subscription_plan || u.planSlug || 'taster',
                    planName: u.planName || u.plan_name || 'Taster (Free)',
                    planInterval: u.planInterval || u.plan_interval || 'MONTH',
                    createdAt: u.createdAt || u.created_at || new Date().toISOString()
                  });
                }
              }
            }
          }
        }
      } catch (_) {}
    }

    // 4. Upsert into PostgreSQL users table
    for (const u of Array.from(usersToInsert.values())) {
      const cleanEmail = u.email.toLowerCase().trim();
      await query(`
        INSERT INTO users (
          id, name, email, password, role, subscription_plan, subscription_tier, plan_slug,
          plan_name, plan_interval, plan_expiry_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $6, $6, $7, $8, $9, COALESCE($10::timestamptz, NOW()), NOW())
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(NULLIF(users.name, ''), EXCLUDED.name),
          role = COALESCE(NULLIF(users.role, ''), EXCLUDED.role),
          subscription_plan = COALESCE(NULLIF(users.subscription_plan, ''), EXCLUDED.subscription_plan),
          updated_at = NOW()
      `, [
        u.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
        u.name || 'User',
        cleanEmail,
        u.password || '$2a$10$DefaultHashedPasswordPlaceholderForDemoOnly',
        (u.role || 'user').toLowerCase(),
        u.subscriptionPlan || 'taster',
        u.planName || (u.subscriptionPlan === 'taster' ? 'Taster (Free)' : u.subscriptionPlan),
        u.planInterval || 'MONTH',
        u.planExpiryDate || null,
        u.createdAt || new Date().toISOString()
      ]).catch(() => {});
    }

    // 5. Populate any customer accounts from payment_transactions into users
    await query(`
      INSERT INTO users (
        id, name, email, role, subscription_plan, subscription_tier, plan_slug,
        plan_name, plan_interval, plan_expiry_date, created_at, updated_at
      )
      SELECT 
        'usr_' || SUBSTRING(MD5(customer_email) FROM 1 FOR 10),
        COALESCE(NULLIF(customer_name, ''), SPLIT_PART(customer_email, '@', 1)),
        LOWER(TRIM(customer_email)),
        'user',
        COALESCE(NULLIF(plan_slug, ''), 'taster'),
        COALESCE(NULLIF(plan_slug, ''), 'taster'),
        COALESCE(NULLIF(plan_slug, ''), 'taster'),
        COALESCE(NULLIF(plan_name, ''), 'Taster (Free)'),
        COALESCE(NULLIF(recurring_interval, ''), 'MONTH'),
        expiry_date,
        created_at,
        NOW()
      FROM payment_transactions
      WHERE customer_email IS NOT NULL AND TRIM(customer_email) != ''
      ON CONFLICT (email) DO NOTHING;
    `).catch(() => {});
  } catch (err) {
    console.error('[ensureUsersTableAndMigrate Error]:', err);
  }
}

export async function GET() {
  await ensureUsersTableAndMigrate();
  try {
    // 1. Fetch users from PostgreSQL with defensive fallback
    let rawUsers: any[] = [];
    try {
      const uRes = await query(`
        SELECT 
          id, name, email, password, role, subscription_plan, subscription_tier,
          plan_slug, plan_name, plan_interval, plan_expiry_date, created_at, updated_at
        FROM users 
        ORDER BY 
          CASE WHEN LOWER(role) = 'admin' THEN 0 ELSE 1 END,
          created_at DESC
      `);
      rawUsers = Array.isArray(uRes) ? uRes : (uRes?.rows || []);
    } catch (_) {
      const fallbackRes = await query(`SELECT * FROM users ORDER BY created_at DESC`).catch(() => []);
      rawUsers = Array.isArray(fallbackRes) ? fallbackRes : (fallbackRes?.rows || []);
    }

    // 2. Fetch latest active succeeded transactions from payment_transactions
    let rawTxs: any[] = [];
    try {
      const txRes = await query(`
        SELECT customer_email, plan_slug, plan_name, recurring_interval, expiry_date, status, created_at
        FROM payment_transactions 
        WHERE status IN ('succeeded', 'paid', 'active') 
          AND (expiry_date IS NULL OR expiry_date > NOW())
        ORDER BY created_at DESC
      `).catch(() => []);
      rawTxs = Array.isArray(txRes) ? txRes : (txRes?.rows || []);
    } catch (_) {}

    const activeTxMap = new Map<string, any>();
    rawTxs.forEach((tx: any) => {
      const email = (tx.customer_email || tx.customerEmail || '').toLowerCase().trim();
      if (email && !activeTxMap.has(email)) {
        activeTxMap.set(email, tx);
      }
    });

    const users = rawUsers.map((u: any) => {
      const email = (u.email || '').toLowerCase().trim();
      const activeTx = activeTxMap.get(email);
      const isAdmin = (u.role || '').toLowerCase() === 'admin';

      let effectivePlan = (u.subscription_plan || u.subscriptionPlan || u.plan_slug || 'taster').toLowerCase().trim();
      let effectivePlanName = u.plan_name || u.planName || (effectivePlan === 'taster' ? 'Taster (Free)' : effectivePlan);
      let effectiveInterval = (u.plan_interval || u.planInterval || (effectivePlan.includes('annual') ? 'YEAR' : 'MONTH')).toUpperCase();
      let effectiveExpiry = u.plan_expiry_date || u.planExpiryDate || null;

      if (activeTx) {
        effectivePlan = (activeTx.plan_slug || activeTx.planSlug || effectivePlan).toLowerCase().trim();
        effectivePlanName = activeTx.plan_name || activeTx.planName || effectivePlanName;
        effectiveInterval = (activeTx.recurring_interval || activeTx.recurringInterval || (effectivePlan.includes('annual') ? 'YEAR' : 'MONTH')).toUpperCase();
        effectiveExpiry = activeTx.expiry_date || activeTx.expiryDate || effectiveExpiry;
      } else if (!isAdmin && effectivePlan !== 'taster' && !effectivePlan.includes('free')) {
        if (effectiveExpiry && new Date(effectiveExpiry).getTime() < Date.now()) {
          effectivePlan = 'taster';
          effectivePlanName = 'Taster (Free)';
          effectiveInterval = 'MONTH';
          effectiveExpiry = null;
        }
      }

      return {
        id: u.id,
        name: u.name || 'User',
        email: u.email,
        password: u.password,
        role: (u.role || 'user').toLowerCase(),
        subscriptionPlan: effectivePlan,
        subscription_plan: effectivePlan,
        subscriptionTier: effectivePlan,
        planSlug: effectivePlan,
        plan_slug: effectivePlan,
        planName: effectivePlanName,
        plan_name: effectivePlanName,
        planInterval: effectiveInterval,
        plan_interval: effectiveInterval,
        planExpiryDate: effectiveExpiry,
        plan_expiry_date: effectiveExpiry,
        expiryDate: effectiveExpiry,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
        updatedAt: u.updated_at || u.updatedAt || new Date().toISOString()
      };
    });

    return NextResponse.json(
      { success: true, users },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureUsersTableAndMigrate();
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
    const subscriptionPlan = (body.subscriptionPlan || body.planSlug || body.subscription_plan || 'taster').toLowerCase().trim();
    const planName = body.planName || body.plan_name || (subscriptionPlan === 'taster' ? 'Taster (Free)' : subscriptionPlan);
    const planInterval = (body.planInterval || body.plan_interval || (subscriptionPlan.includes('annual') ? 'YEAR' : 'MONTH')).toUpperCase();
    const planExpiryDate = body.planExpiryDate || body.expiryDate || null;

    await query('DELETE FROM deleted_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [cleanEmail]).catch(() => {});

    await query(`
      INSERT INTO users (
        id, name, email, password, role, subscription_plan, subscription_tier, plan_slug,
        plan_name, plan_interval, plan_expiry_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $6, $6, $7, $8, $9, COALESCE($10::timestamptz, NOW()), NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = COALESCE(NULLIF(EXCLUDED.password, ''), users.password),
        role = EXCLUDED.role,
        subscription_plan = EXCLUDED.subscription_plan,
        subscription_tier = EXCLUDED.subscription_tier,
        plan_slug = EXCLUDED.plan_slug,
        plan_name = EXCLUDED.plan_name,
        plan_interval = EXCLUDED.plan_interval,
        plan_expiry_date = EXCLUDED.plan_expiry_date,
        updated_at = NOW()
    `, [id, name, cleanEmail, password, role, subscriptionPlan, planName, planInterval, planExpiryDate, body.createdAt || null]);

    return await GET();
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    if (cleanId === 'usr_admin_1' || cleanEmail === 'admin@zecratary.com') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the primary system administrator.' },
        { status: 403 }
      );
    }

    await query(`
      INSERT INTO deleted_users (email, user_id, deleted_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (email) DO UPDATE SET deleted_at = NOW();
    `, [cleanEmail || cleanId, cleanId || cleanEmail]).catch(() => {});

    await query('DELETE FROM users WHERE id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2))', [cleanId, cleanEmail]);

    return await GET();
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
