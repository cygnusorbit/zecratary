import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query(`
      SELECT 
        id,
        name,
        email,
        role,
        subscription_plan AS "subscriptionPlan",
        plan_expiry_date AS "planExpiryDate",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at ASC
    `);

    return NextResponse.json(
      { success: true, users: rows },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    console.error('[API users GET] DB Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const name = body.name || 'User';
    const role = body.role || 'user';
    const subscriptionPlan = body.subscriptionPlan || body.subscription_plan || 'taster';
    const planExpiryDate = body.planExpiryDate || body.plan_expiry_date ? new Date(body.planExpiryDate || body.plan_expiry_date) : null;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.length > 0) {
      await query(`
        UPDATE users SET
          name = $1,
          role = $2,
          subscription_plan = $3,
          plan_expiry_date = $4,
          updated_at = NOW()
        WHERE email = $5
      `, [name, role, subscriptionPlan, planExpiryDate, email]);
    } else {
      const id = body.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      await query(`
        INSERT INTO users (id, name, email, role, subscription_plan, plan_expiry_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [id, name, email, role, subscriptionPlan, planExpiryDate]);
    }

    const remaining = await query(`
      SELECT 
        id, name, email, role,
        subscription_plan AS "subscriptionPlan",
        plan_expiry_date AS "planExpiryDate",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at ASC
    `);

    return NextResponse.json({ success: true, message: 'User updated in PostgreSQL.', users: remaining });
  } catch (err: any) {
    console.error('[API users POST] DB Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let email = searchParams.get('email');

    // If query params are absent, parse request body
    if (!id && !email) {
      try {
        const body = await req.json();
        id = body?.id || id;
        email = body?.email || email;
      } catch (_) {}
    }

    if (!id && !email) {
      return NextResponse.json(
        { success: false, error: 'User ID or Email is required for deletion' },
        { status: 400 }
      );
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanId = (id || '').trim();

    // 1. Identify user row
    const target = await query(
      'SELECT id, role, email FROM users WHERE id = $1 OR email = $2 LIMIT 1',
      [cleanId, cleanEmail]
    );

    if (target.length > 0) {
      const user = target[0];

      // Protect primary root admin
      if (user.role === 'admin' && (user.id === 'usr_admin_1' || user.email?.toLowerCase() === 'admin@zecratary.com')) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the primary system administrator.' },
          { status: 403 }
        );
      }

      const targetId = user.id;
      const targetEmail = user.email.toLowerCase().trim();

      // 2. Foreign Key Safety: Nullify user_id references in saved_recipes
      await query('UPDATE saved_recipes SET user_id = NULL WHERE user_id = $1', [targetId]);

      // 3. Delete from PostgreSQL users table
      await query('DELETE FROM users WHERE id = $1 OR email = $2', [targetId, targetEmail]);
    } else {
      // Direct deletion fallback
      if (cleanId) {
        await query('UPDATE saved_recipes SET user_id = NULL WHERE user_id = $1', [cleanId]);
        await query('DELETE FROM users WHERE id = $1', [cleanId]);
      }
      if (cleanEmail) {
        await query('DELETE FROM users WHERE email = $1', [cleanEmail]);
      }
    }

    // 4. Synchronize legacy JSON files if present
    const dataPaths = [
      path.join(process.cwd(), 'apps/web/data', 'users.json'),
      path.join(process.cwd(), 'apps/web/apps/web/data', 'users.json'),
      path.join(process.cwd(), 'data', 'users.json')
    ];

    for (const p of dataPaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((item: any) =>
              item.id !== cleanId && (!item.email || item.email.toLowerCase().trim() !== cleanEmail)
            );
            fs.writeFileSync(p, JSON.stringify(filtered, null, 2), 'utf-8');
          }
        } catch (_) {}
      }
    }

    // 5. Return updated remaining user list
    const remaining = await query(`
      SELECT 
        id,
        name,
        email,
        role,
        subscription_plan AS "subscriptionPlan",
        plan_expiry_date AS "planExpiryDate",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at ASC
    `);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully from PostgreSQL.',
      users: remaining
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err: any) {
    console.error('[API users DELETE] DB Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
