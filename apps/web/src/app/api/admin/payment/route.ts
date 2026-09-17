import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensurePaymentTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(128) PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        plan_name VARCHAR(255),
        plan_slug VARCHAR(128),
        amount NUMERIC(10, 2) DEFAULT 0,
        currency VARCHAR(16) DEFAULT 'USD',
        gateway VARCHAR(64) DEFAULT 'stripe',
        status VARCHAR(64) DEFAULT 'succeeded',
        failure_reason TEXT,
        test_mode BOOLEAN DEFAULT TRUE,
        expiry_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_email ON payment_transactions(customer_email);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensurePaymentTable();
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    let sql = 'SELECT * FROM payment_transactions';
    const params: any[] = [];
    if (email) {
      params.push(email.toLowerCase().trim());
      sql += ' WHERE LOWER(customer_email) = $1';
    }
    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    const transactions = rows.map((r: any) => ({
      id: r.id,
      customerName: r.customer_name || 'Customer',
      customerEmail: (r.customer_email || '').toLowerCase().trim(),
      planName: r.plan_name || 'Subscription',
      planSlug: r.plan_slug || '',
      amount: Number(r.amount) || 0,
      currency: r.currency || 'USD',
      gateway: r.gateway || 'stripe',
      status: r.status || 'succeeded',
      failureReason: r.failure_reason,
      testMode: Boolean(r.test_mode),
      expiryDate: r.expiry_date ? new Date(r.expiry_date).toISOString() : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));

    return NextResponse.json(
      { success: true, transactions },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensurePaymentTable();
  try {
    const body = await req.json();
    const action = body.action;

    // Atomic cancellation of active transactions for a given email
    if (action === 'cancel_user_transactions') {
      const email = (body.email || body.customerEmail || body.customer_email || '').toLowerCase().trim();
      if (email) {
        await query(`
          UPDATE payment_transactions
          SET status = 'refunded',
              expiry_date = NOW(),
              updated_at = NOW()
          WHERE LOWER(customer_email) = $1 AND LOWER(status) IN ('succeeded', 'paid', 'active')
        `, [email]);
        return NextResponse.json({ success: true, message: 'Prior transactions cancelled in PostgreSQL.' });
      }
    }

    const tx = body.transaction || body;

    if (action === 'update_transaction' && tx?.id) {
      await query(`
        UPDATE payment_transactions
        SET status = $1,
            expiry_date = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [
        tx.status || 'refunded',
        tx.expiryDate || tx.expiry_date || new Date().toISOString(),
        tx.id
      ]);
      return NextResponse.json({ success: true, message: 'Transaction updated in PostgreSQL.' });
    }

    if (!tx || (!tx.customerEmail && !tx.customer_email)) {
      return NextResponse.json({ success: false, error: 'Customer email is required.' }, { status: 400 });
    }

    const id = tx.id || 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const cName = tx.customerName || tx.customer_name || 'Customer';
    const cEmail = (tx.customerEmail || tx.customer_email || '').toLowerCase().trim();
    const pName = tx.planName || tx.plan_name || 'Subscription';
    const pSlug = tx.planSlug || tx.plan_slug || '';
    const amount = Number(tx.amount || 0);
    const currency = tx.currency || 'USD';
    const gateway = tx.gateway || 'stripe';
    const status = tx.status || 'succeeded';
    const failureReason = tx.failureReason || tx.failure_reason || null;
    const testMode = tx.testMode !== undefined ? Boolean(tx.testMode) : true;
    const expiryDate = tx.expiryDate || tx.expiry_date || null;

    // Cancel prior active records for this user
    await query(`
      UPDATE payment_transactions
      SET status = 'refunded',
          expiry_date = NOW(),
          updated_at = NOW()
      WHERE LOWER(customer_email) = $1 AND LOWER(status) IN ('succeeded', 'paid', 'active') AND id != $2
    `, [cEmail, id]);

    await query(`
      INSERT INTO payment_transactions (
        id, customer_name, customer_email, plan_name, plan_slug, amount,
        currency, gateway, status, failure_reason, test_mode, expiry_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        expiry_date = EXCLUDED.expiry_date,
        updated_at = NOW()
    `, [
      id, cName, cEmail, pName, pSlug, amount, currency, gateway, status, failureReason, testMode, expiryDate
    ]);

    return NextResponse.json({ success: true, message: 'Transaction saved in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
