// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1, is_default: true },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92, is_default: false },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rate: 36.5, is_default: false },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79, is_default: false }
];

export async function GET() {
  try {
    // 1. Try PostgreSQL
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        const res = await query(`
          SELECT currencies FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;
        `).catch(() => null);

        if (res?.rows?.[0]?.currencies) {
          const parsed = typeof res.rows[0].currencies === 'string'
            ? JSON.parse(res.rows[0].currencies)
            : res.rows[0].currencies;
          if (Array.isArray(parsed) && parsed.length > 0) {
            return NextResponse.json({ success: true, currencies: parsed });
          }
        }
      }
    } catch (_) {}

    // 2. Try Local JSON
    const p = path.join(process.cwd(), 'data', 'admin_settings.json');
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.currencies) && data.currencies.length > 0) {
          return NextResponse.json({ success: true, currencies: data.currencies });
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, currencies: DEFAULT_CURRENCIES });
  } catch (err: any) {
    return NextResponse.json({ success: true, currencies: DEFAULT_CURRENCIES });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const currencies = body.currencies || [];

    // 1. Update PostgreSQL
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(`
          INSERT INTO admin_settings (id, currencies, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            currencies = EXCLUDED.currencies,
            updated_at = NOW();
        `, [JSON.stringify(currencies)]);
      }
    } catch (_) {}

    // 2. Update Local JSON
    const p = path.join(process.cwd(), 'data', 'admin_settings.json');
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        data.currencies = currencies;
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
      } catch (_) {}
    }

    return NextResponse.json({ success: true, currencies });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
