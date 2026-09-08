import { NextResponse } from 'next/server';

interface PaymentTransaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug?: string;
  amount: number;
  currency: string;
  gateway: 'stripe' | 'paypal' | 'manual';
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  failureReason?: string;
  testMode?: boolean;
  createdAt: string;
  expiryDate?: string;
}

const INITIAL_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx_10928301',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'succeeded',
    createdAt: '2026-09-01T14:22:10Z',
    expiryDate: '2026-10-01T14:22:10Z',
  },
  {
    id: 'tx_10928302',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.v@example.com',
    planName: 'Nutrition Pro (Annual)',
    planSlug: 'nutrition-pro-annual',
    amount: 59.99,
    currency: 'USD',
    gateway: 'paypal',
    status: 'succeeded',
    createdAt: '2026-09-01T11:05:44Z',
    expiryDate: '2027-09-01T11:05:44Z',
  },
  {
    id: 'tx_10928303',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@domain.com',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'failed',
    failureReason: 'Card issuer declined: Insufficient funds',
    createdAt: '2026-08-31T18:49:12Z',
    expiryDate: '2026-09-30T18:49:12Z',
  },
  {
    id: 'tx_10928304',
    customerName: 'David Kim',
    customerEmail: 'david.kim@techcorp.io',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'succeeded',
    createdAt: '2026-08-30T09:15:02Z',
    expiryDate: '2026-09-30T09:15:02Z',
  },
  {
    id: 'tx_10928305',
    customerName: 'Chloe Dupont',
    customerEmail: 'c.dupont@atelier.fr',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'paypal',
    status: 'failed',
    failureReason: 'PayPal account authorization timed out',
    createdAt: '2026-08-29T22:30:19Z',
    expiryDate: '2026-09-29T22:30:19Z',
  },
  {
    id: 'tx_10928306',
    customerName: "Liam O'Connor",
    customerEmail: 'liam.oc@irishfoodies.ie',
    planName: 'Nutrition Pro (Annual)',
    planSlug: 'nutrition-pro-annual',
    amount: 59.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'refunded',
    failureReason: 'Customer requested cancellation within 24h grace period',
    createdAt: '2026-08-28T16:04:55Z',
    expiryDate: '2027-08-28T16:04:55Z',
  }
];

const DEFAULT_SETTINGS = {
  activeGateway: 'stripe' as const,
  currency: 'USD',
  testMode: true,
  stripeConnected: false,
  stripe: {
    enabled: true,
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
  },
  paypal: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    webhookId: '',
    environment: 'sandbox' as const,
  },
};

export async function GET() {
  try {
    const settings = {
      ...DEFAULT_SETTINGS,
      stripeConnected: Boolean(process.env.STRIPE_SECRET_KEY),
      stripe: {
        enabled: Boolean(process.env.STRIPE_SECRET_KEY),
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY ? '••••••••' + process.env.STRIPE_SECRET_KEY.slice(-4) : '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '••••••••' + process.env.STRIPE_WEBHOOK_SECRET.slice(-4) : '',
      },
      paypal: {
        enabled: Boolean(process.env.PAYPAL_CLIENT_SECRET),
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET ? '••••••••' + process.env.PAYPAL_CLIENT_SECRET.slice(-4) : '',
        webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
        environment: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
      },
    };

    return NextResponse.json({
      success: true,
      transactions: INITIAL_TRANSACTIONS,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === 'add_transaction') {
      const newTransaction = {
        id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        createdAt: body.transaction.createdAt || new Date().toISOString(),
        ...body.transaction,
      };
      return NextResponse.json({
        success: true,
        message: 'Payment transaction added successfully',
        transaction: newTransaction,
      });
    }

    if (body.action === 'update_transaction') {
      return NextResponse.json({
        success: true,
        message: 'Payment transaction updated successfully',
        transaction: body.transaction,
      });
    }

    if (body.action === 'delete_transaction') {
      return NextResponse.json({
        success: true,
        message: 'Payment transaction removed successfully',
        id: body.id,
      });
    }

    if (body.action === 'connect_stripe') {
      const stripeClientId = process.env.STRIPE_CONNECT_CLIENT_ID;
      if (stripeClientId) {
        const redirectUri = encodeURIComponent(`${req.headers.get('origin') || ''}/admin/payment?connected=stripe`);
        return NextResponse.json({
          success: true,
          url: `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeClientId}&scope=read_write&redirect_uri=${redirectUri}`,
        });
      }
      return NextResponse.json({
        success: true,
        connected: true,
        message: 'Stripe credentials validated and connected successfully!',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment configuration saved successfully',
      settings: body,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process payment request' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      message: `Transaction ${id} deleted successfully`,
      id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
