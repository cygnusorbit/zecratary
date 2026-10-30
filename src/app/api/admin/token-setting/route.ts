import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let currency = 'USD';
    let currencySymbol = '$';

    try {
      const adminRes: any = await query(
        `SELECT * FROM admin_settings WHERE id::text = 'primary_settings' OR key::text = 'current' OR id::text = '1' LIMIT 1;`
      ).catch(() => null);
      const row = Array.isArray(adminRes) ? adminRes[0] : adminRes?.rows?.[0];
      if (row) {
        if (row.currency) currency = row.currency;
        if (row.currency_symbol) currencySymbol = row.currency_symbol;
        if (row.currencies && Array.isArray(row.currencies)) {
          const active = row.currencies.find((c: any) => c.is_default || c.active);
          if (active) {
            currency = active.code || currency;
            currencySymbol = active.symbol || currencySymbol;
          }
        }
      }
    } catch (_) {}

    let plans: any[] = [];
    try {
      const plansRes: any = await query(`SELECT * FROM subscription_plans;`).catch(() => null);
      const rows = Array.isArray(plansRes) ? plansRes : (plansRes?.rows || []);
      plans = rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price ?? p.monthly_price_dollars ?? p.price_monthly ?? 0),
        monthly_price_dollars: Number(p.monthly_price_dollars ?? p.price ?? 0),
        interval: p.interval || 'month',
        token_limit: Number(p.token_limit ?? p.tokens_monthly ?? 50000),
        is_active: p.is_active !== false,
      }));
      plans.sort((a, b) => a.price - b.price);
    } catch (_) {}

    let settings = {
      is_enabled: true,
      default_free_tokens: 500,
      tokens_per_request: 1,
      cost_per_1k_tokens: 0.002,
    };

    try {
      const tRes: any = await query(
        `SELECT * FROM token_settings WHERE id::text = 'current' OR id::text = '1' LIMIT 1;`
      ).catch(() => null);
      const tRow = Array.isArray(tRes) ? tRes[0] : tRes?.rows?.[0];
      if (tRow) {
        settings = {
          is_enabled: tRow.is_enabled !== false,
          default_free_tokens: Number(tRow.default_free_tokens ?? 500),
          tokens_per_request: Number(tRow.tokens_per_request ?? 1),
          cost_per_1k_tokens: Number(tRow.cost_per_1k_tokens ?? 0.002),
        };
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      currency,
      currencySymbol,
      plans,
      settings,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { settings } = body;

    if (settings) {
      await query(`
        INSERT INTO token_settings (id, is_enabled, default_free_tokens, tokens_per_request, cost_per_1k_tokens, updated_at)
        VALUES ('current', $1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          is_enabled = EXCLUDED.is_enabled,
          default_free_tokens = EXCLUDED.default_free_tokens,
          tokens_per_request = EXCLUDED.tokens_per_request,
          cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
          updated_at = NOW();
      `, [
        settings.is_enabled !== false,
        parseInt(settings.default_free_tokens || '500', 10),
        parseInt(settings.tokens_per_request || '1', 10),
        parseFloat(settings.cost_per_1k_tokens || '0.002')
      ]).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
