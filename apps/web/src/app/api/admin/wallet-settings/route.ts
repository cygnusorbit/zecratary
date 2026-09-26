import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export async function GET(req: NextRequest) {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'current',
        is_enabled BOOLEAN DEFAULT true,
        currency VARCHAR(10) DEFAULT 'USD',
        min_topup NUMERIC(10,2) DEFAULT 5.00,
        max_topup NUMERIC(10,2) DEFAULT 1000.00,
        preset_amounts JSONB DEFAULT '[10, 25, 50, 100, 250]',
        bonus_rules JSONB DEFAULT '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]',
        allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]',
        allow_site_purchases BOOLEAN DEFAULT true,
        ledger_columns JSONB DEFAULT '{"customer":true,"type":true,"amount":true,"balanceAfter":true,"gateway":true,"description":true,"date":true,"actions":true}',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS ledger_columns JSONB DEFAULT '{"customer":true,"type":true,"amount":true,"balanceAfter":true,"gateway":true,"description":true,"date":true,"actions":true}';
    `).catch(() => {});

    const settingsRes = await client.query('SELECT * FROM wallet_settings WHERE id = $1', ['current']);
    const settings = settingsRes.rows[0] || {
      is_enabled: true,
      currency: 'USD',
      min_topup: 5.00,
      max_topup: 1000.00,
      preset_amounts: [10, 25, 50, 100, 250],
      bonus_rules: [
        { threshold: 50, bonus_percent: 5 },
        { threshold: 100, bonus_percent: 10 }
      ],
      allowed_gateways: ['stripe', 'paypal', 'manual'],
      allow_site_purchases: true,
      ledger_columns: {
        customer: true,
        type: true,
        amount: true,
        balanceAfter: true,
        gateway: true,
        description: true,
        date: true,
        actions: true,
      },
    };

    const txRes = await client.query(
      'SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 500'
    );

    const usersRes = await client.query(
      'SELECT id, email, name, wallet_balance FROM users ORDER BY email ASC LIMIT 500'
    );

    return NextResponse.json({
      success: true,
      settings,
      transactions: txRes.rows,
      users: usersRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await getPool().connect();
  try {
    const body = await req.json();
    const action = body.action;

    // 1. DELETE ACTION VIA POST
    if (action === 'delete_transactions' || action === 'delete') {
      let ids: string[] = [];
      if (body.id) ids.push(String(body.id).trim());
      if (Array.isArray(body.ids)) ids.push(...body.ids.map((s: any) => String(s).trim()).filter(Boolean));

      ids = Array.from(new Set(ids)).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ success: false, error: 'No transaction ID(s) provided for deletion.' }, { status: 400 });
      }

      const delRes = await client.query(
        'DELETE FROM wallet_transactions WHERE id = ANY($1::varchar[]) RETURNING id',
        [ids]
      );

      return NextResponse.json({
        success: true,
        deletedCount: delRes.rowCount,
        deletedIds: delRes.rows.map((r: any) => r.id),
        message: `Successfully deleted ${delRes.rowCount} transaction record(s).`,
      });
    }

    // 2. SAVE COLUMN PREFERENCES
    if (action === 'save_column_settings') {
      const { ledger_columns } = body;
      await client.query(`
        UPDATE wallet_settings 
        SET ledger_columns = $1, updated_at = NOW() 
        WHERE id = 'current'
      `, [JSON.stringify(ledger_columns)]);
      return NextResponse.json({ success: true, message: 'Column preferences saved.' });
    }

    // 3. SAVE CORE SETTINGS
    if (action === 'save_settings') {
      const {
        is_enabled,
        currency,
        min_topup,
        max_topup,
        preset_amounts,
        bonus_rules,
        allowed_gateways,
        allow_site_purchases,
      } = body;

      await client.query(`
        INSERT INTO wallet_settings (
          id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases, updated_at
        ) VALUES (
          'current', $1, $2, $3, $4, $5, $6, $7, $8, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          is_enabled = EXCLUDED.is_enabled,
          currency = EXCLUDED.currency,
          min_topup = EXCLUDED.min_topup,
          max_topup = EXCLUDED.max_topup,
          preset_amounts = EXCLUDED.preset_amounts,
          bonus_rules = EXCLUDED.bonus_rules,
          allowed_gateways = EXCLUDED.allowed_gateways,
          allow_site_purchases = EXCLUDED.allow_site_purchases,
          updated_at = NOW()
      `, [
        is_enabled !== false,
        (currency || 'USD').toUpperCase(),
        parseFloat(min_topup || 5),
        parseFloat(max_topup || 1000),
        JSON.stringify(preset_amounts || [10, 25, 50, 100, 250]),
        JSON.stringify(bonus_rules || []),
        JSON.stringify(allowed_gateways || ['stripe', 'paypal', 'manual']),
        allow_site_purchases !== false,
      ]);

      return NextResponse.json({ success: true, message: 'Wallet settings saved successfully!' });
    }

    // 4. ADMIN MANUAL ADJUSTMENT
    if (action === 'admin_adjustment') {
      const { user_email, amount, reason } = body;
      const adjAmount = parseFloat(amount || 0);

      if (!user_email || isNaN(adjAmount) || adjAmount === 0) {
        return NextResponse.json({ success: false, error: 'A valid target email and non-zero adjustment amount are required.' }, { status: 400 });
      }

      await client.query('BEGIN');
      try {
        const uRes = await client.query(
          'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) RETURNING id, email, wallet_balance',
          [adjAmount, user_email.trim()]
        );

        if (uRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
        }

        const user = uRes.rows[0];
        const newBalance = parseFloat(user.wallet_balance || 0);
        const txId = `wtx_adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        await client.query(`
          INSERT INTO wallet_transactions (
            id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata
          ) VALUES ($1, $2, $3, 'admin_adjustment', $4, $5, 'manual', $6, 'succeeded', $7, $8)
        `, [
          txId,
          String(user.id),
          user.email,
          adjAmount,
          newBalance,
          `adj_${Date.now()}`,
          reason || 'Admin manual balance adjustment',
          JSON.stringify({ adjustedBy: 'admin', reason }),
        ]);

        await client.query('COMMIT');
        return NextResponse.json({
          success: true,
          message: `Successfully adjusted balance by ${adjAmount >= 0 ? '+' : ''}${adjAmount.toFixed(2)}. New balance: $${newBalance.toFixed(2)}`,
          wallet_balance: newBalance,
        });
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  const client = await getPool().connect();
  try {
    const { searchParams } = new URL(req.url);
    let ids: string[] = [];

    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (idParam) ids.push(idParam.trim());
    if (idsParam) ids.push(...idsParam.split(',').map((s) => s.trim()).filter(Boolean));

    if (ids.length === 0) {
      try {
        const body = await req.json();
        if (body.id) ids.push(String(body.id).trim());
        if (Array.isArray(body.ids)) ids.push(...body.ids.map((s: any) => String(s).trim()).filter(Boolean));
      } catch (_) {}
    }

    ids = Array.from(new Set(ids)).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No transaction ID(s) provided for deletion.' }, { status: 400 });
    }

    const delRes = await client.query(
      'DELETE FROM wallet_transactions WHERE id = ANY($1::varchar[]) RETURNING id',
      [ids]
    );

    return NextResponse.json({
      success: true,
      deletedCount: delRes.rowCount,
      deletedIds: delRes.rows.map((r: any) => r.id),
      message: `Successfully deleted ${delRes.rowCount} transaction record(s).`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
