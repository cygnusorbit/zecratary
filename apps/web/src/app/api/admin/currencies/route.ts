import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0, is_default: true },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92, is_default: false },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79, is_default: false },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rate: 35.5, is_default: false },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 150.0, is_default: false },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', rate: 1.36, is_default: false },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', rate: 1.52, is_default: false },
];

export async function GET(req: NextRequest) {
  try {
    // 1. Try PostgreSQL / MySQL with safe SELECT *
    try {
      const res: any = await query('SELECT * FROM admin_settings WHERE id IN (\'primary_settings\', \'1\') OR key = \'current\' LIMIT 1');
      const row = Array.isArray(res) ? res[0] : res?.rows?.[0];
      if (row) {
        let currencies = row.currencies;
        if (typeof currencies === 'string') {
          try { currencies = JSON.parse(currencies); } catch (_) {}
        }
        if (Array.isArray(currencies) && currencies.length > 0) {
          return NextResponse.json({
            success: true,
            currencies,
            currency: row.currency || 'USD'
          });
        }
      }
    } catch (_) {}

    // 2. Fallback to Local JSON store
    const jsonPaths = [
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'data', 'admin_settings.json'),
    ];
    for (const jp of jsonPaths) {
      if (fs.existsSync(jp)) {
        try {
          const fileData = JSON.parse(fs.readFileSync(jp, 'utf8'));
          if (Array.isArray(fileData.currencies) && fileData.currencies.length > 0) {
            return NextResponse.json({
              success: true,
              currencies: fileData.currencies,
              currency: fileData.currency || 'USD'
            });
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      currencies: DEFAULT_CURRENCIES,
      currency: 'USD'
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      currencies: DEFAULT_CURRENCIES,
      currency: 'USD'
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currencies, currency } = body;

    const safeCurrencies = Array.isArray(currencies) ? currencies : DEFAULT_CURRENCIES;
    const safeCurrency = currency || 'USD';

    // 1. PostgreSQL & MySQL Persistence
    try {
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS currencies JSONB DEFAULT '[]'::jsonb;`);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';`);
      await query(`
        INSERT INTO admin_settings (id, currencies, currency, updated_at)
        VALUES ('primary_settings', $1::jsonb, $2, NOW())
        ON CONFLICT (id) DO UPDATE SET
          currencies = EXCLUDED.currencies,
          currency = EXCLUDED.currency,
          updated_at = NOW();
      `, [JSON.stringify(safeCurrencies), safeCurrency]);
    } catch (_) {}

    // 2. Mirror to JSON files
    const jsonPaths = [
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'data', 'admin_settings.json'),
    ];
    for (const jp of jsonPaths) {
      try {
        const dir = path.dirname(jp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let existing: any = {};
        if (fs.existsSync(jp)) {
          try { existing = JSON.parse(fs.readFileSync(jp, 'utf8')); } catch (_) {}
        }
        existing.currencies = safeCurrencies;
        existing.currency = safeCurrency;
        fs.writeFileSync(jp, JSON.stringify(existing, null, 2), 'utf8');
      } catch (_) {}
    }

    return NextResponse.json({ success: true, currencies: safeCurrencies, currency: safeCurrency });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
