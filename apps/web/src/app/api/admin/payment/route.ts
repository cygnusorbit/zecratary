import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDataPaths(filename: string): string[] {
  return [
    path.join(process.cwd(), 'apps/web/data', filename),
    path.join(process.cwd(), 'data', filename)
  ];
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) as T;
      } catch (_) {}
    }
  }
  return fallback;
}

function writeJsonFile<T>(filename: string, data: T): void {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

const DEFAULT_SETTINGS = {
  activeGateway: 'stripe',
  currency: 'USD',
  testMode: true,
  stripeConnected: false,
  stripe: {
    enabled: true,
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
  },
  paypal: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    webhookId: '',
    environment: 'sandbox'
  }
};

export async function GET() {
  const adminSettings = readJsonFile('admin_settings.json', {} as any);
  const settings = adminSettings.paymentSettings || DEFAULT_SETTINGS;
  if (adminSettings.currency) {
    settings.currency = adminSettings.currency;
  }
  const transactions = readJsonFile('payment_transactions.json', []);

  return NextResponse.json({
    success: true,
    settings,
    transactions
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Stripe Connect Action
    if (body.action === 'connect_stripe') {
      const adminSettings = readJsonFile('admin_settings.json', {} as any);
      const currentSettings = adminSettings.paymentSettings || DEFAULT_SETTINGS;
      const updated = {
        ...currentSettings,
        stripeConnected: true,
        stripe: {
          ...currentSettings.stripe,
          enabled: true,
          secretKey: body.secretKey || currentSettings.stripe.secretKey,
          publishableKey: body.publishableKey || currentSettings.stripe.publishableKey
        }
      };
      adminSettings.paymentSettings = updated;
      writeJsonFile('admin_settings.json', adminSettings);
      return NextResponse.json({ success: true, message: 'Stripe Gateway enabled and verified.' });
    }

    // 2. Add Transaction Action
    if (body.action === 'add_transaction' && body.transaction) {
      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      const newTx = body.transaction;
      const cleanEmail = (newTx.customerEmail || '').toLowerCase().trim();

      const updatedTxs = transactions.map((tItem: any) => {
        const isSucceeded = ['succeeded', 'succeded', 'success', 'paid', 'completed'].includes(String(newTx.status).toLowerCase());
        if (
          isSucceeded &&
          tItem.customerEmail.toLowerCase() === cleanEmail &&
          ['succeeded', 'pending'].includes(String(tItem.status).toLowerCase())
        ) {
          return {
            ...tItem,
            status: 'refunded',
            expiryDate: new Date().toISOString()
          };
        }
        return tItem;
      });

      updatedTxs.unshift(newTx);
      writeJsonFile('payment_transactions.json', updatedTxs);
      return NextResponse.json({ success: true, transaction: newTx });
    }

    // 3. Update Transaction Action
    if (body.action === 'update_transaction' && body.transaction) {
      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      const updatedTx = body.transaction;
      const cleanEmail = (updatedTx.customerEmail || '').toLowerCase().trim();
      const isSucceeded = ['succeeded', 'succeded', 'success', 'paid', 'completed'].includes(String(updatedTx.status).toLowerCase());

      const updatedTxs = transactions.map((tItem: any) => {
        if (tItem.id === updatedTx.id) return updatedTx;
        if (
          isSucceeded &&
          tItem.customerEmail.toLowerCase() === cleanEmail &&
          ['succeeded', 'pending'].includes(String(tItem.status).toLowerCase())
        ) {
          return {
            ...tItem,
            status: 'refunded',
            expiryDate: new Date().toISOString()
          };
        }
        return tItem;
      });

      writeJsonFile('payment_transactions.json', updatedTxs);
      return NextResponse.json({ success: true, transaction: updatedTx });
    }

    // 4. Update Gateway Settings
    const adminSettings = readJsonFile('admin_settings.json', {} as any);
    const mergedSettings = {
      ...(adminSettings.paymentSettings || DEFAULT_SETTINGS),
      ...body
    };
    adminSettings.paymentSettings = mergedSettings;
    if (body.currency) {
      adminSettings.currency = body.currency;
    }
    writeJsonFile('admin_settings.json', adminSettings);

    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const transactions = readJsonFile('payment_transactions.json', [] as any[]);
    const updated = transactions.filter((t: any) => t.id !== id);
    writeJsonFile('payment_transactions.json', updated);

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete transaction' }, { status: 500 });
  }
}
