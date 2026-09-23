import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initWalletDb() {
  const client = await pool.connect();
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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        user_email VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        balance_after NUMERIC(10,2) NOT NULL,
        gateway VARCHAR(32) DEFAULT 'stripe',
        gateway_tx_id VARCHAR(255),
        status VARCHAR(32) DEFAULT 'succeeded',
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;

      INSERT INTO wallet_settings (id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases)
      VALUES ('current', true, 'USD', 5.00, 1000.00, '[10, 25, 50, 100, 250]', '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]', '["stripe", "paypal", "manual"]', true)
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    console.error('Wallet DB init notice:', err);
  } finally {
    client.release();
  }
}

export async function GET(req: NextRequest) {
  try {
    await initWalletDb();
    const client = await pool.connect();
    try {
      const settingsRes = await client.query('SELECT * FROM wallet_settings WHERE id = $1', ['current']);
      const txRes = await client.query('SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 200');
      const usersRes = await client.query('SELECT id, email, name, wallet_balance FROM users ORDER BY name ASC');

      const settings = settingsRes.rows[0] || {
        is_enabled: true,
        currency: 'USD',
        min_topup: 5.00,
        max_topup: 1000.00,
        preset_amounts: [10, 25, 50, 100, 250],
        bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
        allowed_gateways: ['stripe', 'paypal', 'manual'],
        allow_site_purchases: true,
      };

      return NextResponse.json({
        success: true,
        settings,
        transactions: txRes.rows,
        users: usersRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initWalletDb();
    const body = await req.json();
    const client = await pool.connect();

    try {
      if (body.action === 'save_settings') {
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
          UPDATE wallet_settings SET
            is_enabled = $1,
            currency = $2,
            min_topup = $3,
            max_topup = $4,
            preset_amounts = $5::jsonb,
            bonus_rules = $6::jsonb,
            allowed_gateways = $7::jsonb,
            allow_site_purchases = $8,
            updated_at = NOW()
          WHERE id = 'current'
        `, [
          is_enabled ?? true,
          currency || 'USD',
          parseFloat(min_topup) || 5.00,
          parseFloat(max_topup) || 1000.00,
          JSON.stringify(preset_amounts || [10, 25, 50, 100]),
          JSON.stringify(bonus_rules || []),
          JSON.stringify(allowed_gateways || ['stripe', 'paypal', 'manual']),
          allow_site_purchases ?? true,
        ]);

        return NextResponse.json({ success: true, message: 'Wallet settings updated successfully in PostgreSQL.' });
      }

      if (body.action === 'admin_adjustment') {
        const { user_email, amount, reason } = body;
        const adjAmount = parseFloat(amount);
        if (isNaN(adjAmount) || adjAmount === 0) {
          return NextResponse.json({ success: false, error: 'Valid adjustment amount required.' }, { status: 400 });
        }

        const userRes = await client.query('SELECT id, email, wallet_balance FROM users WHERE LOWER(email) = LOWER($1)', [user_email]);
        if (userRes.rows.length === 0) {
          return NextResponse.json({ success: false, error: 'Target user not found.' }, { status: 404 });
        }

        const user = userRes.rows[0];
        const currentBalance = parseFloat(user.wallet_balance || 0);
        const newBalance = Math.max(0, currentBalance + adjAmount);

        await client.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [newBalance, user.id]);

        const txId = `wtx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        await client.query(`
          INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, status, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          txId,
          user.id,
          user.email,
          'admin_adjustment',
          adjAmount,
          newBalance,
          'manual',
          'succeeded',
          reason || 'Administrative balance adjustment',
        ]);

        return NextResponse.json({ success: true, newBalance, message: 'Balance adjusted successfully.' });
      }

      return NextResponse.json({ success: false, error: 'Unknown action requested.' }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
