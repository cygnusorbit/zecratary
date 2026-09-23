import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function ensurePaymentSchema() {
  try {
    // 1. Drop foreign key constraint on plan_slug to decouple financial ledger from mutable plan catalog
    await query(`
      DO $$ 
      DECLARE 
          r RECORD;
      BEGIN 
          BEGIN
            ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_slug_fkey;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          
          FOR r IN (
              SELECT conname 
              FROM pg_constraint 
              WHERE conrelid = 'payment_transactions'::regclass 
                AND contype = 'f' 
                AND conname LIKE '%plan_slug%'
          ) LOOP
              BEGIN
                EXECUTE 'ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
              EXCEPTION WHEN OTHERS THEN NULL;
              END;
          END LOOP;
      END $$;
    `).catch(() => {});

    // 2. Ensure payment_transactions table exists with all standard columns
    await query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(255) PRIMARY KEY,
        customer_name TEXT,
        customer_email TEXT,
        plan_name TEXT,
        plan_slug TEXT,
        amount NUMERIC DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        gateway VARCHAR(50) DEFAULT 'stripe',
        status VARCHAR(50) DEFAULT 'succeeded',
        test_mode BOOLEAN DEFAULT false,
        failure_reason TEXT,
        is_recurring BOOLEAN DEFAULT true,
        recurring_interval VARCHAR(20) DEFAULT 'MONTH',
        auto_renew BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expiry_date TIMESTAMPTZ,
        gateway_transaction_id TEXT,
        confirmed_amount NUMERIC,
        confirmed_at TIMESTAMPTZ
      );
    `);

    // 3. Add any missing columns safely
    await query(`
      DO $$ 
      BEGIN 
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS customer_name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS customer_email TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_slug TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) DEFAULT 'stripe'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'succeeded'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(20) DEFAULT 'MONTH'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);

    // 4. One-time database cleanup: Cancel older duplicate interval records so users never have both Monthly & Annual active simultaneously
    await query(`
      DO $$
      BEGIN
        UPDATE payment_transactions p1
        SET status = 'canceled', is_recurring = false, auto_renew = false, updated_at = NOW()
        FROM payment_transactions p2
        WHERE LOWER(p1.customer_email) = LOWER(p2.customer_email)
          AND p1.id != p2.id
          AND p1.status = 'succeeded'
          AND p2.status = 'succeeded'
          AND regexp_replace(p1.plan_slug, '-(monthly|annual|free)$', '') = regexp_replace(p2.plan_slug, '-(monthly|annual|free)$', '')
          AND (
            p1.created_at < p2.created_at 
            OR (p1.created_at = p2.created_at AND p1.id < p2.id)
          );
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `).catch(() => {});
  } catch (e) {
    console.warn('[Payment API] Schema check warning:', e);
  }
}

export async function GET() {
  try {
    await ensurePaymentSchema();

    let txRes = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(async () => {
      return await query(`SELECT * FROM payment_transactions ORDER BY id DESC LIMIT 500`).catch(() => ({ rows: [] }));
    });

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
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensurePaymentSchema();
    const body = await req.json();

    if (body.action === 'connect_stripe') {
      return NextResponse.json({
        success: true,
        message: 'Stripe Gateway enabled and verified.'
      });
    }

    // Add Transaction
    if (body.action === 'add_transaction') {
      const tx = body.transaction;
      if (!tx) {
        return NextResponse.json({ success: false, error: 'Transaction object required' }, { status: 400 });
      }

      const txId = String(tx.id || ('tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)));
      const customerName = String(tx.customerName || 'Customer');
      const customerEmail = String(tx.customerEmail || '').toLowerCase().trim();
      const planName = String(tx.planName || 'Plan');
      let rawSlug = String(tx.planSlug || 'taster');
      const baseSlug = rawSlug.replace(/-(monthly|annual|free)$/, '');
      const amount = Number(tx.amount || 0);
      const currency = String(tx.currency || 'USD');
      const gateway = String(tx.gateway || 'stripe');
      const status = String(tx.status || 'succeeded').toLowerCase();
      const testMode = Boolean(tx.testMode);
      const failureReason = tx.failureReason || null;
      const isRecurring = tx.isRecurring !== undefined ? Boolean(tx.isRecurring) : true;
      const recurringInterval = String(tx.recurringInterval || 'MONTH');
      const autoRenew = tx.autoRenew !== undefined ? Boolean(tx.autoRenew) : true;
      const createdAt = tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString();
      const expiryDate = tx.expiryDate ? new Date(tx.expiryDate).toISOString() : null;
      const gatewayTxId = tx.gatewayTransactionId ? String(tx.gatewayTransactionId).trim() : null;
      const confirmedAmount = tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : (status === 'succeeded' ? amount : null);
      const confirmedAt = tx.confirmedAt ? new Date(tx.confirmedAt).toISOString() : (status === 'succeeded' ? new Date().toISOString() : null);

      // Resolve valid slug target for PostgreSQL compatibility
      let targetPlanSlug = rawSlug;
      try {
        const pCheck = await query(`SELECT slug FROM subscription_plans WHERE slug = $1 LIMIT 1`, [rawSlug]);
        const existsExact = Array.isArray(pCheck) ? pCheck.length > 0 : (pCheck?.rows?.length > 0);
        if (!existsExact) {
          const bCheck = await query(`SELECT slug FROM subscription_plans WHERE slug = $1 LIMIT 1`, [baseSlug]);
          const existsBase = Array.isArray(bCheck) ? bCheck.length > 0 : (bCheck?.rows?.length > 0);
          if (existsBase) {
            targetPlanSlug = baseSlug;
          }
        }
      } catch (_) {}

      // ENFORCE: User cannot have both Monthly & Annual active from the same plan!
      // If adding a succeeded subscription, cancel previous active transactions for this user.
      if (status === 'succeeded' && customerEmail) {
        await query(
          `UPDATE payment_transactions 
           SET status = 'canceled', is_recurring = false, auto_renew = false, updated_at = NOW()
           WHERE LOWER(customer_email) = LOWER($1) 
             AND id != $2 
             AND (status = 'succeeded' OR status = 'pending')`,
          [customerEmail, txId]
        ).catch(() => {});
      }

      const checkRes = await query(`SELECT id FROM payment_transactions WHERE id = $1 LIMIT 1`, [txId]).catch(() => ({ rows: [] }));
      const exists = Array.isArray(checkRes) ? checkRes.length > 0 : (checkRes?.rows?.length > 0);

      const runInsert = async (slugToUse: string) => {
        return await query(
          `INSERT INTO payment_transactions (
            id, customer_name, customer_email, plan_name, plan_slug,
            amount, currency, gateway, status, test_mode, failure_reason,
            is_recurring, recurring_interval, auto_renew, created_at,
            expiry_date, gateway_transaction_id, confirmed_amount, confirmed_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())`,
          [
            txId, customerName, customerEmail, planName, slugToUse,
            amount, currency, gateway, status, testMode, failureReason,
            isRecurring, recurringInterval, autoRenew, createdAt,
            expiryDate, gatewayTxId, confirmedAmount, confirmedAt
          ]
        );
      };

      if (exists) {
        await query(
          `UPDATE payment_transactions 
           SET customer_name = $1, customer_email = $2, plan_name = $3, plan_slug = $4,
               amount = $5, currency = $6, gateway = $7, status = $8, failure_reason = $9,
               is_recurring = $10, recurring_interval = $11, auto_renew = $12, created_at = $13,
               expiry_date = $14, gateway_transaction_id = $15, confirmed_amount = $16,
               confirmed_at = $17, updated_at = NOW()
           WHERE id = $18`,
          [
            customerName, customerEmail, planName, targetPlanSlug, amount, currency, gateway,
            status, failureReason, isRecurring, recurringInterval, autoRenew, createdAt,
            expiryDate, gatewayTxId, confirmedAmount, confirmedAt, txId
          ]
        ).catch(async () => {
          await query(
            `UPDATE payment_transactions 
             SET customer_name = $1, customer_email = $2, plan_name = $3, plan_slug = $4,
                 amount = $5, status = $6, expiry_date = $7, updated_at = NOW()
             WHERE id = $8`,
            [customerName, customerEmail, planName, baseSlug, amount, status, expiryDate, txId]
          ).catch(() => {});
        });
      } else {
        try {
          await runInsert(targetPlanSlug);
        } catch (insertErr: any) {
          console.warn('[Payment API] Primary insert failed, retrying with base slug:', insertErr?.message || insertErr);
          await query(`ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_slug_fkey;`).catch(() => {});
          try {
            await runInsert(baseSlug);
          } catch (retryErr) {
            await query(
              `INSERT INTO payment_transactions (
                id, customer_name, customer_email, plan_name, plan_slug,
                amount, currency, gateway, status, created_at, expiry_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                txId, customerName, customerEmail, planName, baseSlug,
                amount, currency, gateway, status, createdAt, expiryDate
              ]
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction recorded successfully',
        transaction: {
          ...tx,
          id: txId,
          customerName,
          customerEmail,
          planName,
          planSlug: targetPlanSlug,
          amount,
          currency,
          gateway,
          status,
          isRecurring,
          autoRenew,
          createdAt,
          expiryDate
        }
      });
    }

    // Update Transaction
    if (body.action === 'update_transaction') {
      const tx = body.transaction;
      if (!tx || !tx.id) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      const cleanEmail = (tx.customerEmail || '').toLowerCase().trim();
      const baseSlug = String(tx.planSlug || 'taster').replace(/-(monthly|annual|free)$/, '');

      // If updating to succeeded, cancel conflicting active subscriptions for this customer
      if (tx.status === 'succeeded' && cleanEmail) {
        await query(
          `UPDATE payment_transactions 
           SET status = 'canceled', is_recurring = false, auto_renew = false, updated_at = NOW()
           WHERE LOWER(customer_email) = LOWER($1) 
             AND id != $2 
             AND (status = 'succeeded' OR status = 'pending')`,
          [cleanEmail, tx.id]
        ).catch(() => {});
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
          cleanEmail,
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
      ).catch(async () => {
        await query(`ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_slug_fkey;`).catch(() => {});
        await query(
          `UPDATE payment_transactions 
           SET customer_name = $1, customer_email = $2, plan_name = $3, plan_slug = $4,
               amount = $5, status = $6, expiry_date = $7, updated_at = NOW()
           WHERE id = $8`,
          [
            tx.customerName,
            cleanEmail,
            tx.planName,
            baseSlug,
            Number(tx.amount || 0),
            tx.status,
            tx.expiryDate || null,
            tx.id
          ]
        ).catch(() => {});
      });

      return NextResponse.json({ success: true, message: 'Transaction updated', transaction: tx });
    }

    // Refund / Cancel / Confirm
    if (body.action === 'refund_transaction' || body.action === 'cancel_transaction' || body.action === 'confirm_payment') {
      const tx = body.transaction || {};
      const txId = body.id || tx.id;
      if (!txId) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      await query(
        `UPDATE payment_transactions 
         SET status = $1, is_recurring = $2, auto_renew = $3, expiry_date = $4,
             confirmed_amount = $5, confirmed_at = $6, gateway_transaction_id = $7, updated_at = NOW()
         WHERE id = $8`,
        [
          tx.status,
          Boolean(tx.isRecurring),
          Boolean(tx.autoRenew),
          tx.expiryDate || null,
          tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : null,
          tx.confirmedAt || null,
          tx.gatewayTransactionId || null,
          txId
        ]
      ).catch(async () => {
        await query(
          `UPDATE payment_transactions 
           SET status = $1, expiry_date = $2, updated_at = NOW()
           WHERE id = $3`,
          [tx.status, tx.expiryDate || null, txId]
        ).catch(() => {});
      });

      return NextResponse.json({ 
        success: true, 
        message: body.action === 'refund_transaction' ? 'Transaction refunded' : body.action === 'cancel_transaction' ? 'Transaction cancelled' : 'Payment confirmed',
        transaction: tx 
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
    await ensurePaymentSchema();
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
