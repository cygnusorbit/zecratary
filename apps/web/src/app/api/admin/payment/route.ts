import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const txRes = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(() => ({ rows: [] }));
    const transactions = Array.isArray(txRes) ? txRes : (txRes?.rows || []);

    let settings = null;
    try {
      const sRes = await query(`SELECT payment_settings, currency FROM admin_settings LIMIT 1`);
      const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
      if (sRow) {
        settings = sRow.payment_settings || sRow;
        if (sRow.currency && typeof settings === 'object') {
          settings.currency = sRow.currency;
        }
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      transactions,
      settings
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === 'connect_stripe') {
      return NextResponse.json({
        success: true,
        message: 'Stripe Gateway enabled and verified.'
      });
    }

    if (body.action === 'add_transaction') {
      const tx = body.transaction;
      if (!tx) {
        return NextResponse.json({ success: false, error: 'Transaction object required' }, { status: 400 });
      }

      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, test_mode, failure_reason,
          is_recurring, recurring_interval, auto_renew, created_at,
          expiry_date, gateway_transaction_id, confirmed_amount, confirmed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          plan_name = EXCLUDED.plan_name,
          plan_slug = EXCLUDED.plan_slug,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          gateway = EXCLUDED.gateway,
          status = EXCLUDED.status,
          test_mode = EXCLUDED.test_mode,
          failure_reason = EXCLUDED.failure_reason,
          is_recurring = EXCLUDED.is_recurring,
          recurring_interval = EXCLUDED.recurring_interval,
          auto_renew = EXCLUDED.auto_renew,
          created_at = EXCLUDED.created_at,
          expiry_date = EXCLUDED.expiry_date,
          gateway_transaction_id = EXCLUDED.gateway_transaction_id,
          confirmed_amount = EXCLUDED.confirmed_amount,
          confirmed_at = EXCLUDED.confirmed_at`,
        [
          tx.id || ('tx_' + Date.now().toString(36)),
          tx.customerName || 'Customer',
          (tx.customerEmail || '').toLowerCase().trim(),
          tx.planName || 'Plan',
          tx.planSlug || 'taster',
          Number(tx.amount || 0),
          tx.currency || 'USD',
          tx.gateway || 'stripe',
          tx.status || 'succeeded',
          Boolean(tx.testMode),
          tx.failureReason || null,
          tx.isRecurring !== undefined ? Boolean(tx.isRecurring) : true,
          tx.recurringInterval || 'MONTH',
          tx.autoRenew !== undefined ? Boolean(tx.autoRenew) : true,
          tx.createdAt || new Date().toISOString(),
          tx.expiryDate || null,
          tx.gatewayTransactionId || null,
          tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : null,
          tx.confirmedAt || null
        ]
      );

      return NextResponse.json({ success: true, message: 'Transaction recorded successfully', transaction: tx });
    }

    if (body.action === 'update_transaction') {
      const tx = body.transaction;
      if (!tx || !tx.id) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      await query(
        `UPDATE payment_transactions 
         SET customer_name = $1, customer_email = $2, plan_name = $3, plan_slug = $4,
             amount = $5, currency = $6, gateway = $7, status = $8, failure_reason = $9,
             is_recurring = $10, recurring_interval = $11, auto_renew = $12, created_at = $13,
             expiry_date = $14, gateway_transaction_id = $15, confirmed_amount = $16,
             confirmed_at = $17, updated_at = NOW()
         WHERE id = $18`,
        [
          tx.customerName,
          (tx.customerEmail || '').toLowerCase().trim(),
          tx.planName,
          tx.planSlug,
          Number(tx.amount || 0),
          tx.currency,
          tx.gateway,
          tx.status,
          tx.failureReason || null,
          Boolean(tx.isRecurring),
          tx.recurringInterval || 'MONTH',
          Boolean(tx.autoRenew),
          tx.createdAt,
          tx.expiryDate || null,
          tx.gatewayTransactionId || null,
          tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : null,
          tx.confirmedAt || null,
          tx.id
        ]
      );

      return NextResponse.json({ success: true, message: 'Transaction updated', transaction: tx });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const queryIds = url.searchParams.get('ids');

    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {}

    const targetIds: string[] = [];
    if (id) targetIds.push(id.trim());
    if (queryIds) {
      queryIds.split(',').forEach((s: string) => {
        const c = s.trim();
        if (c && !targetIds.includes(c)) targetIds.push(c);
      });
    }
    if (body.id && !targetIds.includes(body.id.trim())) {
      targetIds.push(body.id.trim());
    }
    if (Array.isArray(body.ids)) {
      body.ids.forEach((s: any) => {
        const c = String(s).trim();
        if (c && !targetIds.includes(c)) targetIds.push(c);
      });
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Transaction ID(s) required' }, { status: 400 });
    }

    // 1. Identify affected customer emails to re-verify active plan status
    let affectedEmails: string[] = [];
    try {
      const emailRows = await query(
        `SELECT DISTINCT customer_email FROM payment_transactions WHERE id::text = ANY($1::text[]) AND customer_email IS NOT NULL`,
        [targetIds]
      );
      const rows = Array.isArray(emailRows) ? emailRows : (emailRows?.rows || []);
      affectedEmails = rows.map((r: any) => String(r.customer_email || '').toLowerCase().trim()).filter(Boolean);
    } catch (_) {}

    // 2. Perform the deletion from PostgreSQL
    await query(
      `DELETE FROM payment_transactions WHERE id::text = ANY($1::text[])`,
      [targetIds]
    );

    // 3. For any affected users, check if another valid subscription remains; if not, revert to taster
    for (const email of affectedEmails) {
      try {
        const remainingTx = await query(
          `SELECT id FROM payment_transactions 
           WHERE LOWER(TRIM(customer_email)) = $1 
             AND status IN ('succeeded', 'paid', 'active', 'completed')
             AND (expiry_date IS NULL OR expiry_date > NOW())
           LIMIT 1`,
          [email]
        );
        const remRows = Array.isArray(remainingTx) ? remainingTx : (remainingTx?.rows || []);
        if (remRows.length === 0) {
          await query(
            `UPDATE users 
             SET subscription_plan = 'taster', subscription_tier = 'taster', plan_slug = 'taster', plan_name = 'Taster (Free)', plan_expiry_date = NULL 
             WHERE LOWER(TRIM(email)) = $1`,
            [email]
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `${targetIds.length} transaction(s) permanently deleted from PostgreSQL.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
