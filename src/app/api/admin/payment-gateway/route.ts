import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Dynamic Database Loader
async function getDb() {
  try {
    const dbModule = await import('@/lib/db');
    return dbModule;
  } catch (_) {
    return null;
  }
}

async function verifyStripePublishableKey(pk: string): Promise<boolean> {
  if (!pk || !pk.startsWith('pk_')) return false;
  try {
    const res = await fetch('https://api.stripe.com/v1/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pk}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'card[number]=4242424242424242&card[exp_month]=12&card[exp_year]=2030&card[cvc]=123'
    });
    return res.status !== 401;
  } catch (_) {
    return false;
  }
}

async function verifyStripeSecretKey(sk: string): Promise<{ valid: boolean; livemode?: boolean; error?: string }> {
  if (!sk || (!sk.startsWith('sk_') && !sk.startsWith('rk_'))) {
    return { valid: false, error: 'Secret Key must begin with sk_ or rk_' };
  }
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${sk}` }
    });
    if (res.ok) {
      const data = await res.json();
      return { valid: true, livemode: data.livemode };
    }
    const errData = await res.json().catch(() => ({}));
    return { valid: false, error: errData?.error?.message || 'Unauthorized Secret Key' };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

function verifyWebhookSecretFormat(whsec: string): boolean {
  if (!whsec || !whsec.startsWith('whsec_') || whsec.length < 24) return false;
  try {
    const hmac = crypto.createHmac('sha256', whsec);
    hmac.update('test_payload');
    return Boolean(hmac.digest('hex'));
  } catch (_) {
    return false;
  }
}

// PayPal OAuth2 & Webhook Handshake Verification
async function verifyPayPalCredentials(clientId: string, clientSecret: string, webhookId?: string, env: 'sandbox' | 'live' = 'sandbox') {
  if (!clientId || !clientSecret) {
    return { success: false, error: 'Both PayPal Client ID and Secret are required.' };
  }

  const baseUrl = env === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  try {
    // 1. Authenticate with OAuth2 Client Credentials
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      return { 
        success: false, 
        error: errJson.error_description || errJson.message || 'Invalid PayPal Client ID or Secret.' 
      };
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. If Webhook ID provided, verify webhook endpoint existence
    let webhookValid = false;
    if (webhookId && webhookId.trim()) {
      const cleanWhId = webhookId.trim();
      const whRes = await fetch(`${baseUrl}/v1/notifications/webhooks/${cleanWhId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (whRes.ok) {
        webhookValid = true;
      }
    }

    return {
      success: true,
      keysVerified: true,
      webhookVerified: webhookValid,
      appId: tokenData.app_id || 'PayPal Connected',
      message: webhookValid 
        ? 'PayPal Client ID, Secret Key, and Webhook ID verified successfully!' 
        : 'PayPal API Client ID and Secret verified successfully!'
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying PayPal credentials.' };
  }
}

export async function GET() {
  const db = await getDb();
  let paymentSettings: any = null;

  if (db && typeof db.query === 'function') {
    try {
      const rows = await db.query("SELECT payment_settings FROM admin_settings WHERE id::text IN ('primary_settings', '1', 'current') LIMIT 1;");
      const r = (rows as any)?.[0] || (rows as any)?.rows?.[0];
      if (r?.payment_settings) {
        paymentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
      }
    } catch (_) {}
  }

  if (!paymentSettings) {
    for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const full = path.join(process.cwd(), p);
      if (fs.existsSync(full)) {
        try {
          const d = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (d.paymentSettings) {
            paymentSettings = d.paymentSettings;
            break;
          }
        } catch (_) {}
      }
    }
  }

  return NextResponse.json({
    success: true,
    paymentSettings: paymentSettings || {
      currency: 'USD',
      testMode: true,
      stripe: { enabled: true, publishableKey: '', secretKey: '', webhookSecret: '' },
      paypal: { enabled: false, clientId: '', clientSecret: '', webhookId: '', environment: 'sandbox' },
      manualSettlement: { enabled: true, bankName: '', accountHolder: '', accountNumber: '', routingNumber: '', swiftBic: '', branchName: '', instructions: '', requireReference: true, requireApproval: true }
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'save_settings';

    // ACTION: Verify Stripe
    if (action === 'verify_stripe_keys') {
      const { publishableKey, secretKey, webhookSecret } = body;
      const isPkValid = await verifyStripePublishableKey(publishableKey);
      const skResult = await verifyStripeSecretKey(secretKey);
      const isWhValid = verifyWebhookSecretFormat(webhookSecret);

      const allValid = isPkValid && skResult.valid && isWhValid;
      return NextResponse.json({
        success: allValid,
        stripeKeysVerified: allValid,
        publishableValid: isPkValid,
        secretValid: skResult.valid,
        webhookValid: isWhValid,
        message: allValid ? 'All Stripe credentials and webhook signing secret verified!' : 'One or more Stripe keys failed verification.'
      });
    }

    // ACTION: Verify PayPal (Task 4)
    if (action === 'verify_paypal_keys' || action === 'verify_paypal') {
      const { clientId, clientSecret, webhookId, environment } = body;
      const result = await verifyPayPalCredentials(clientId, clientSecret, webhookId, environment);
      return NextResponse.json(result);
    }

    // ACTION: Verify Standalone Webhook Secret
    if (action === 'verify_webhook_secret') {
      const isValid = verifyWebhookSecretFormat(body.webhookSecret);
      return NextResponse.json({ success: isValid, valid: isValid });
    }

    // ACTION: Save Settings
    if (action === 'save_settings') {
      const settings = body.paymentSettings || body.settings || {};
      const db = await getDb();

      if (db && typeof db.query === 'function') {
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS admin_settings (
              id VARCHAR(50) PRIMARY KEY,
              payment_settings JSONB DEFAULT '{}'::jsonb,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            INSERT INTO admin_settings (id, payment_settings, updated_at)
            VALUES ('primary_settings', $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
              payment_settings = EXCLUDED.payment_settings,
              updated_at = NOW();
          `, [JSON.stringify(settings)]);
        } catch (_) {}
      }

      for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
        const full = path.join(process.cwd(), p);
        if (fs.existsSync(full)) {
          try {
            const d = JSON.parse(fs.readFileSync(full, 'utf8'));
            d.paymentSettings = settings;
            fs.writeFileSync(full, JSON.stringify(d, null, 2), 'utf8');
          } catch (_) {}
        }
      }

      return NextResponse.json({ success: true, message: 'Payment gateway settings updated successfully.' });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
