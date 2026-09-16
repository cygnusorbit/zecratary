import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query(`
      SELECT 
        id,
        customer_name AS "customerName",
        customer_email AS "customerEmail",
        plan_name AS "planName",
        plan_slug AS "planSlug",
        amount,
        currency,
        gateway,
        status,
        failure_reason AS "failureReason",
        test_mode AS "testMode",
        expiry_date AS "expiryDate",
        created_at AS "createdAt"
      FROM payment_transactions
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ success: true, transactions: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerEmail = (body.customerEmail || body.email || '').toLowerCase().trim();

    if (!customerEmail) {
      return NextResponse.json({ success: false, error: 'Customer email is required' }, { status: 400 });
    }

    const customerName = body.customerName || body.name || 'Customer';
    const planName = body.planName || 'Plan';
    let planSlug = (body.planSlug || body.slug || planName).toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
    const amount = parseFloat(body.amount) || 0;
    const currency = body.currency || 'USD';
    const gateway = body.gateway || 'stripe';
    const status = body.status || 'succeeded';
    const failureReason = body.failureReason || null;
    const testMode = body.testMode !== undefined ? Boolean(body.testMode) : true;
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    const txId = body.id || ('tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

    if (planSlug) {
      const planExists = await query('SELECT 1 FROM subscription_plans WHERE slug = $1', [planSlug]);
      if (planExists.length === 0) {
        let planId = 'plan_' + planSlug;
        const idTaken = await query('SELECT 1 FROM subscription_plans WHERE id = $1', [planId]);
        if (idTaken.length > 0) {
          planId = `plan_${planSlug}_${Math.random().toString(36).substring(2, 6)}`;
        }
        await query(`
          INSERT INTO subscription_plans (id, name, slug, monthly_price_dollars, is_free, updated_at)
          VALUES ($1, $2, $3, $4, FALSE, NOW())
        `, [planId, planName, planSlug, amount]);
      }
    }

    await query(`
      INSERT INTO payment_transactions (
        id, customer_name, customer_email, plan_name, plan_slug, amount, currency,
        gateway, status, failure_reason, test_mode, expiry_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        failure_reason = EXCLUDED.failure_reason,
        expiry_date = EXCLUDED.expiry_date
    `, [
      txId, customerName, customerEmail, planName, planSlug || null,
      amount, currency, gateway, status, failureReason, testMode, expiryDate
    ]);

    if (status === 'succeeded' && planSlug) {
      await query(`
        UPDATE users SET
          subscription_plan = $1,
          plan_expiry_date = $2,
          updated_at = NOW()
        WHERE email = $3
      `, [planSlug, expiryDate, customerEmail]);
    }

    return NextResponse.json({ success: true, message: 'Payment transaction saved to PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    await query('DELETE FROM payment_transactions WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Transaction deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
