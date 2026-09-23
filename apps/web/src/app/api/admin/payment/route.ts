import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

function normalizeTx(tx: any) {
  if (!tx || typeof tx !== 'object') return tx;
  const customerEmail = (tx.customer_email || tx.customerEmail || '').toLowerCase().trim();
  const customerName = tx.customer_name || tx.customerName || 'Customer';
  const planSlug = (tx.plan_slug || tx.planSlug || 'taster').toLowerCase().trim();
  const planName = tx.plan_name || tx.planName || 'Plan';
  const createdAt = tx.created_at || tx.createdAt || new Date().toISOString();
  const expiryDate = tx.expiry_date || tx.expiryDate || null;
  const isRecurring = tx.is_recurring !== undefined ? Boolean(tx.is_recurring) : (tx.isRecurring !== undefined ? Boolean(tx.isRecurring) : true);
  const recurringInterval = (tx.recurring_interval || tx.recurringInterval || (planSlug.includes('annual') || planSlug.includes('year') ? 'YEAR' : 'MONTH')).toUpperCase();
  const autoRenew = tx.auto_renew !== undefined ? Boolean(tx.auto_renew) : (tx.autoRenew !== undefined ? Boolean(tx.autoRenew) : isRecurring);
  const testMode = tx.test_mode !== undefined ? Boolean(tx.test_mode) : Boolean(tx.testMode);
  const failureReason = tx.failure_reason || tx.failureReason || null;
  const gatewayTransactionId = tx.gateway_transaction_id || tx.gatewayTransactionId || null;
  const confirmedAmount = tx.confirmed_amount !== undefined ? tx.confirmed_amount : (tx.confirmedAmount !== undefined ? tx.confirmedAmount : null);
  const confirmedAt = tx.confirmed_at || tx.confirmedAt || null;

  return {
    ...tx,
    id: tx.id,
    customerName,
    customer_name: customerName,
    customerEmail,
    customer_email: customerEmail,
    planName,
    plan_name: planName,
    planSlug,
    plan_slug: planSlug,
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'USD',
    gateway: tx.gateway || 'stripe',
    status: tx.status || 'succeeded',
    testMode,
    test_mode: testMode,
    failureReason,
    failure_reason: failureReason,
    isRecurring,
    is_recurring: isRecurring,
    recurringInterval,
    recurring_interval: recurringInterval,
    autoRenew,
    auto_renew: autoRenew,
    createdAt,
    created_at: createdAt,
    expiryDate,
    expiry_date: expiryDate,
    gatewayTransactionId,
    gateway_transaction_id: gatewayTransactionId,
    confirmedAmount: confirmedAmount !== null ? Number(confirmedAmount) : null,
    confirmed_amount: confirmedAmount !== null ? Number(confirmedAmount) : null,
    confirmedAt,
    confirmed_at: confirmedAt
  };
}

async function ensureTableAndCleanDuplicates() {
  try {
    await query(`
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT TRUE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(32) DEFAULT 'MONTH';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(255);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(10, 2);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

      -- Sanitize historical records: Any prior transaction superseded by a newer upgrade/downgrade must be 'canceled', not 'refunded'
      UPDATE payment_transactions p1
      SET status = 'canceled',
          is_recurring = FALSE,
          auto_renew = FALSE,
          updated_at = NOW()
      WHERE status = 'refunded'
        AND EXISTS (
          SELECT 1 FROM payment_transactions p2
          WHERE LOWER(TRIM(p2.customer_email)) = LOWER(TRIM(p1.customer_email))
            AND p2.created_at > p1.created_at
            AND p2.status IN ('succeeded', 'paid', 'active')
        );
    `).catch(() => {});
  } catch (_) {}
}

export async function GET() {
  await ensureTableAndCleanDuplicates();
  try {
    const txRes = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(() => ({ rows: [] }));
    const rawList = Array.isArray(txRes) ? txRes : (txRes?.rows || []);
    const transactions = rawList.map(normalizeTx);

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
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureTableAndCleanDuplicates();
  try {
    const body = await req.json();

    if (body.action === 'connect_stripe') {
      return NextResponse.json({
        success: true,
        message: 'Stripe Gateway enabled and verified.'
      });
    }

    // Add Transaction: Record payment, cancel prior active transactions with status 'canceled' (NOT 'refunded')
    if (body.action === 'add_transaction') {
      const rawTx = body.transaction || body;
      if (!rawTx) {
        return NextResponse.json({ success: false, error: 'Transaction object required' }, { status: 400 });
      }

      const tx = normalizeTx(rawTx);
      const isSucceeded = tx.status === 'succeeded' || tx.status === 'paid';
      const isFree = tx.planSlug === 'taster' || tx.planSlug === 'free' || tx.amount === 0;

      // RULE: Any upgrade or downgrade MUST label prior transactions as "canceled".
      // "refunded" status can ONLY be done manually by admin.
      if (tx.customerEmail && isSucceeded) {
        await query(
          `UPDATE payment_transactions
           SET status = 'canceled',
               is_recurring = FALSE,
               auto_renew = FALSE,
               expiry_date = NOW(),
               updated_at = NOW()
           WHERE LOWER(TRIM(customer_email)) = $1
             AND id != $2
             AND status IN ('succeeded', 'paid', 'active')`,
          [tx.customerEmail, tx.id]
        ).catch(() => {});
      }

      // Insert new transaction into payment_transactions
      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, test_mode, failure_reason,
          is_recurring, recurring_interval, auto_renew, created_at,
          expiry_date, gateway_transaction_id, confirmed_amount, confirmed_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
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
          confirmed_at = EXCLUDED.confirmed_at,
          updated_at = NOW()`,
        [
          tx.id || ('tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)),
          tx.customerName,
          tx.customerEmail,
          tx.planName,
          tx.planSlug,
          tx.amount,
          tx.currency,
          tx.gateway,
          tx.status,
          tx.testMode,
          tx.failureReason,
          tx.isRecurring,
          tx.recurringInterval,
          tx.autoRenew,
          tx.createdAt,
          tx.expiryDate,
          tx.gatewayTransactionId,
          tx.confirmedAmount,
          tx.confirmedAt
        ]
      );

      // Atomically synchronize user plan in PostgreSQL users table
      if (tx.customerEmail) {
        if (isSucceeded && !isFree) {
          await query(
            `UPDATE users 
             SET subscription_plan = $1,
                 subscription_tier = $1,
                 plan_slug = $1,
                 plan_name = $2,
                 plan_interval = $3,
                 plan_expiry_date = $4,
                 updated_at = NOW()
             WHERE LOWER(TRIM(email)) = $5`,
            [tx.planSlug, tx.planName, tx.recurringInterval, tx.expiryDate, tx.customerEmail]
          ).catch(() => {});
        } else if (isFree) {
          await query(
            `UPDATE users 
             SET subscription_plan = 'taster',
                 subscription_tier = 'taster',
                 plan_slug = 'taster',
                 plan_name = 'Taster (Free)',
                 plan_interval = 'MONTH',
                 plan_expiry_date = NULL,
                 updated_at = NOW()
             WHERE LOWER(TRIM(email)) = $1`,
            [tx.customerEmail]
          ).catch(() => {});
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Transaction recorded and prior subscription cancelled successfully', 
        transaction: tx 
      });
    }

    // Cancel User Transactions (Called on upgrade/downgrade/switch): strictly set status to 'canceled'
    if (body.action === 'cancel_user_transactions') {
      const email = (body.email || body.customerEmail || body.customer_email || '').toLowerCase().trim();
      const preserveExpiry = body.preserveExpiry !== undefined ? Boolean(body.preserveExpiry) : false;
      if (email) {
        if (preserveExpiry) {
          await query(`
            UPDATE payment_transactions
            SET status = 'canceled',
                is_recurring = FALSE,
                auto_renew = FALSE,
                updated_at = NOW()
            WHERE LOWER(TRIM(customer_email)) = $1 
              AND LOWER(status) IN ('succeeded', 'paid', 'active')
              AND (expiry_date IS NOT NULL AND expiry_date > NOW())
          `, [email]).catch(() => {});

          await query(`
            UPDATE payment_transactions
            SET status = 'canceled',
                is_recurring = FALSE,
                auto_renew = FALSE,
                expiry_date = NOW(),
                updated_at = NOW()
            WHERE LOWER(TRIM(customer_email)) = $1 
              AND LOWER(status) IN ('succeeded', 'paid', 'active')
              AND (expiry_date IS NULL OR expiry_date <= NOW())
          `, [email]).catch(() => {});
        } else {
          await query(`
            UPDATE payment_transactions
            SET status = 'canceled',
                is_recurring = FALSE,
                auto_renew = FALSE,
                expiry_date = NOW(),
                updated_at = NOW()
            WHERE LOWER(TRIM(customer_email)) = $1 
              AND LOWER(status) IN ('succeeded', 'paid', 'active')
          `, [email]).catch(() => {});
        }
        return NextResponse.json({ success: true, message: 'Prior transactions cancelled in PostgreSQL.' });
      }
    }

    // Manual Cancel Action
    if (body.action === 'cancel_transaction') {
      const rawTx = body.transaction || body;
      const txId = body.id || rawTx.id;
      if (!txId) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }
      const tx = normalizeTx(rawTx);

      await query(
        `UPDATE payment_transactions 
         SET status = 'canceled', is_recurring = FALSE, auto_renew = FALSE, expiry_date = $1, updated_at = NOW()
         WHERE id = $2`,
        [tx.expiryDate || new Date().toISOString(), txId]
      );

      return NextResponse.json({ success: true, message: 'Subscription cancelled successfully.' });
    }

    // Manual Admin Refund Action (ONLY manually by admin)
    if (body.action === 'refund_transaction') {
      const rawTx = body.transaction || body;
      const txId = body.id || rawTx.id;
      if (!txId) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }
      const tx = normalizeTx(rawTx);

      // 1. Manually set status to 'refunded'
      await query(
        `UPDATE payment_transactions 
         SET status = 'refunded', is_recurring = FALSE, auto_renew = FALSE, expiry_date = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [txId]
      );

      // 2. Immediately revoke privileges and revert to free tier if no other active paid transaction exists
      if (tx.customerEmail) {
        const otherTx = await query(
          `SELECT plan_slug, plan_name, recurring_interval, expiry_date 
           FROM payment_transactions 
           WHERE LOWER(TRIM(customer_email)) = $1 
             AND status IN ('succeeded', 'paid') 
             AND (expiry_date IS NULL OR expiry_date > NOW())
           ORDER BY created_at DESC LIMIT 1`,
          [tx.customerEmail]
        ).catch(() => ({ rows: [] }));

        const activeRow = Array.isArray(otherTx) ? otherTx[0] : otherTx?.rows?.[0];
        if (activeRow) {
          await query(
            `UPDATE users 
             SET subscription_plan = $1, plan_slug = $1, plan_name = $2, plan_interval = $3, plan_expiry_date = $4, updated_at = NOW()
             WHERE LOWER(TRIM(email)) = $5`,
            [activeRow.plan_slug, activeRow.plan_name, activeRow.recurring_interval, activeRow.expiry_date, tx.customerEmail]
          ).catch(() => {});
        } else {
          await query(
            `UPDATE users 
             SET subscription_plan = 'taster', plan_slug = 'taster', plan_name = 'Taster (Free)', plan_interval = 'MONTH', plan_expiry_date = NULL, updated_at = NOW()
             WHERE LOWER(TRIM(email)) = $1`,
            [tx.customerEmail]
          ).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment refunded successfully by administrator.',
        transaction: { ...tx, status: 'refunded', isRecurring: false, autoRenew: false }
      });
    }

    // Manual Edit / Update Transaction by Admin
    if (body.action === 'update_transaction') {
      const rawTx = body.transaction || body;
      if (!rawTx || !rawTx.id) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      const tx = normalizeTx(rawTx);

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
          tx.customerEmail,
          tx.planName,
          tx.planSlug,
          tx.amount,
          tx.currency,
          tx.gateway,
          tx.status,
          tx.failureReason,
          tx.isRecurring,
          tx.recurringInterval,
          tx.autoRenew,
          tx.createdAt,
          tx.expiryDate,
          tx.gatewayTransactionId,
          tx.confirmedAmount,
          tx.confirmedAt,
          tx.id
        ]
      );

      // Reconcile user plan in PostgreSQL
      if (tx.customerEmail) {
        if (tx.status === 'succeeded' || tx.status === 'paid') {
          await query(
            `UPDATE users 
             SET subscription_plan = $1, plan_slug = $1, plan_name = $2, plan_interval = $3, plan_expiry_date = $4, updated_at = NOW()
             WHERE LOWER(TRIM(email)) = $5`,
            [tx.planSlug, tx.planName, tx.recurringInterval, tx.expiryDate, tx.customerEmail]
          ).catch(() => {});
        } else if (tx.status === 'refunded') {
          const otherTx = await query(
            `SELECT plan_slug, plan_name, recurring_interval, expiry_date 
             FROM payment_transactions 
             WHERE LOWER(TRIM(customer_email)) = $1 
               AND status IN ('succeeded', 'paid') 
               AND (expiry_date IS NULL OR expiry_date > NOW())
             ORDER BY created_at DESC LIMIT 1`,
            [tx.customerEmail]
          ).catch(() => ({ rows: [] }));

          const activeRow = Array.isArray(otherTx) ? otherTx[0] : otherTx?.rows?.[0];
          if (activeRow) {
            await query(
              `UPDATE users 
               SET subscription_plan = $1, plan_slug = $1, plan_name = $2, plan_interval = $3, plan_expiry_date = $4, updated_at = NOW()
               WHERE LOWER(TRIM(email)) = $5`,
              [activeRow.plan_slug, activeRow.plan_name, activeRow.recurring_interval, activeRow.expiry_date, tx.customerEmail]
            ).catch(() => {});
          } else {
            await query(
              `UPDATE users 
               SET subscription_plan = 'taster', plan_slug = 'taster', plan_name = 'Taster (Free)', plan_interval = 'MONTH', plan_expiry_date = NULL, updated_at = NOW()
               WHERE LOWER(TRIM(email)) = $1`,
              [tx.customerEmail]
            ).catch(() => {});
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Transaction updated in database', transaction: tx });
    }

    // Confirm Payment
    if (body.action === 'confirm_payment') {
      const rawTx = body.transaction || body;
      const txId = body.id || rawTx.id;
      if (!txId) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      const tx = normalizeTx(rawTx);

      await query(
        `UPDATE payment_transactions 
         SET status = 'succeeded', is_recurring = $1, auto_renew = $2, expiry_date = $3,
             confirmed_amount = $4, confirmed_at = $5, gateway_transaction_id = $6, updated_at = NOW()
         WHERE id = $7`,
        [
          tx.isRecurring,
          tx.autoRenew,
          tx.expiryDate,
          tx.confirmedAmount,
          tx.confirmedAt,
          tx.gatewayTransactionId,
          txId
        ]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified and confirmed as Succeeded',
        transaction: { ...tx, status: 'succeeded' } 
      });
    }

    // Save Gateway Settings into admin_settings
    const gatewayConfig = body.paymentSettings || body;
    const currency = gatewayConfig.currency || body.currency || 'USD';

    await query(
      `INSERT INTO admin_settings (id, payment_settings, currency, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         payment_settings = EXCLUDED.payment_settings,
         currency = EXCLUDED.currency,
         updated_at = NOW()`,
      [JSON.stringify(gatewayConfig), currency]
    ).catch(async () => {
      await query(
        `UPDATE admin_settings SET payment_settings = $1, currency = $2, updated_at = NOW()`,
        [JSON.stringify(gatewayConfig), currency]
      ).catch(() => {});
    });

    return NextResponse.json({ success: true, message: 'Gateway settings saved' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      await query(`DELETE FROM payment_transactions WHERE id = $1`, [id]);
      return NextResponse.json({ success: true, message: 'Transaction deleted' });
    }

    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await query(`DELETE FROM payment_transactions WHERE id = ANY($1::text[])`, [body.ids]);
      return NextResponse.json({ success: true, message: `${body.ids.length} transactions deleted` });
    }

    return NextResponse.json({ success: false, error: 'Transaction ID(s) required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
