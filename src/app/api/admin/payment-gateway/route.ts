import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function ensureGatewaySchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY DEFAULT 1,
        payment_settings JSONB,
        currency VARCHAR(10) DEFAULT 'USD',
        site_name TEXT,
        theme_colors JSONB,
        value JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(255) PRIMARY KEY,
        customer_name TEXT,
        customer_email TEXT,
        plan_name TEXT,
        plan_slug TEXT,
        amount NUMERIC(12,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        gateway VARCHAR(50) DEFAULT 'stripe',
        status VARCHAR(50) DEFAULT 'pending',
        transfer_reference TEXT,
        failure_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('[PaymentGateway API] Schema initialization notice:', err);
  }
}

export async function GET() {
  await ensureGatewaySchema();
  try {
    let settings: any = {
      currency: 'USD',
      activeGateway: 'stripe',
      stripe: { enabled: true, testMode: true, publishableKey: '', secretKey: '', webhookSecret: '' },
      paypal: { enabled: false, testMode: true, clientId: '', clientSecret: '', webhookId: '', environment: 'sandbox' },
      manualSettlement: {
        enabled: true,
        bankName: 'Bangkok Bank',
        accountHolder: 'Zecratary Culinary Ltd',
        accountNumber: '123-4-56789-0',
        routingNumber: '002',
        swiftBic: 'BKKBTHBK',
        branchName: 'Siam Paragon Branch',
        instructions: 'Please transfer the exact subscription or wallet balance amount and upload your transfer slip.',
        requireReference: true,
        requireApproval: true,
      }
    };

    // Strictly target row id = 1 to prevent multi-row merge conflicts
    const sRes = await query(`SELECT * FROM admin_settings WHERE id = 1 LIMIT 1`);
    const row = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
    if (row) {
      if (row.payment_settings) {
        const ps = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
        if (ps && typeof ps === 'object') settings = { ...settings, ...ps };
      }
      if (row.currency) settings.currency = row.currency;
    }

    if (!settings.stripe.publishableKey) {
      settings.stripe.publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
    }
    if (!settings.stripe.secretKey) {
      settings.stripe.secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
    }
    if (!settings.stripe.webhookSecret) {
      settings.stripe.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }
    if (!settings.paypal.clientId) {
      settings.paypal.clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
    }
    if (!settings.paypal.clientSecret) {
      settings.paypal.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    }

    const tRes = await query(`SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 100`);
    const transactions = Array.isArray(tRes) ? tRes : (tRes?.rows || []);

    return NextResponse.json({
      success: true,
      paymentSettings: settings,
      currency: settings.currency || 'USD',
      transactions
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureGatewaySchema();
  try {
    const body = await req.json();
    const action = body.action || 'save_settings';

    if (action === 'save_settings' || action === 'toggle_gateway') {
      const ps = body.paymentSettings;
      if (!ps || typeof ps !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid payment settings object' }, { status: 400 });
      }

      const stripeEnabled = ps.stripe?.enabled !== false;
      const paypalEnabled = Boolean(ps.paypal?.enabled);
      const activeGw = body.activeGateway || ((stripeEnabled && paypalEnabled)
        ? 'both'
        : stripeEnabled
        ? 'stripe'
        : paypalEnabled
        ? 'paypal'
        : 'none');

      ps.activeGateway = activeGw;

      await query(
        `INSERT INTO admin_settings (id, payment_settings, currency, updated_at)
         VALUES (1, $1::jsonb, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET 
           payment_settings = $1::jsonb,
           currency = $2,
           updated_at = NOW()`,
        [JSON.stringify(ps), ps.currency || 'USD']
      );

      return NextResponse.json({
        success: true,
        message: 'Payment gateway settings saved successfully in PostgreSQL & MySQL!',
        activeGateway: activeGw,
        paymentSettings: ps
      });
    }

    if (action === 'toggle_stripe_test_mode') {
      const nextTestMode = Boolean(body.testMode);
      await query(
        `UPDATE admin_settings 
         SET payment_settings = jsonb_set(COALESCE(payment_settings, '{}'::jsonb), '{stripe,testMode}', $1::jsonb),
             updated_at = NOW()
         WHERE id = 1`,
        [JSON.stringify(nextTestMode)]
      );
      return NextResponse.json({ success: true, message: `Stripe test mode updated to ${nextTestMode}` });
    }

    if (action === 'toggle_paypal_test_mode') {
      const nextTestMode = Boolean(body.testMode);
      const nextEnv = body.environment || (nextTestMode ? 'sandbox' : 'live');
      await query(
        `UPDATE admin_settings 
         SET payment_settings = jsonb_set(
               jsonb_set(COALESCE(payment_settings, '{}'::jsonb), '{paypal,testMode}', $1::jsonb),
               '{paypal,environment}', $2::jsonb
             ),
             updated_at = NOW()
         WHERE id = 1`,
        [JSON.stringify(nextTestMode), JSON.stringify(nextEnv)]
      );
      return NextResponse.json({ success: true, message: `PayPal test mode updated to ${nextTestMode}` });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
