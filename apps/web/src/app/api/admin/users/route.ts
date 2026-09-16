import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    return NextResponse.json({ success: true, users: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
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

      return NextResponse.json({ success: true, message: 'User updated in PostgreSQL.' });
    } else {
      const id = body.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      await query(`
        INSERT INTO users (id, name, email, role, subscription_plan, plan_expiry_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [id, name, email, role, subscriptionPlan, planExpiryDate]);

      return NextResponse.json({ success: true, message: 'User created in PostgreSQL.' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    const target = await query('SELECT id, role, email FROM users WHERE id = $1 OR email = $2 LIMIT 1', [id || '', email || '']);
    if (target.length > 0 && target[0].role === 'admin' && (target[0].id === 'usr_admin_1' || target[0].email === 'admin@zecratary.com')) {
      return NextResponse.json({ success: false, error: 'Cannot delete the primary system administrator.' }, { status: 403 });
    }

    if (id) {
      await query('DELETE FROM users WHERE id = $1', [id]);
    } else if (email) {
      await query('DELETE FROM users WHERE email = $1', [email]);
    }

    return NextResponse.json({ success: true, message: 'User deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
