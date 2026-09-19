import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_usage JSONB DEFAULT '{}'::jsonb;
    `);

    const rows = await query('SELECT * FROM users ORDER BY created_at DESC');

    const formatted = rows.map((u: any) => {
      const tu = u.token_usage || {};
      const pTokens = Number(tu.promptTokens ?? u.prompt_tokens ?? 0);
      const cTokens = Number(tu.completionTokens ?? u.completion_tokens ?? 0);
      const tTokens = Number(tu.totalTokens ?? u.total_tokens ?? (pTokens + cTokens));
      const reqCount = Number(tu.requestCount ?? u.request_count ?? 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        subscriptionPlan: u.subscription_plan || 'taster',
        planSlug: u.subscription_plan || 'taster',
        planExpiryDate: u.plan_expiry_date,
        createdAt: u.created_at,
        linkedProviders: Array.isArray(u.linked_providers) ? u.linked_providers : [],
        promptTokens: pTokens,
        prompt_tokens: pTokens,
        completionTokens: cTokens,
        completion_tokens: cTokens,
        totalTokens: tTokens,
        total_tokens: tTokens,
        requestCount: reqCount,
        request_count: reqCount,
        tokenUsage: {
          promptTokens: pTokens,
          completionTokens: cTokens,
          totalTokens: tTokens,
          requestCount: reqCount
        },
        token_usage: {
          promptTokens: pTokens,
          completionTokens: cTokens,
          totalTokens: tTokens,
          requestCount: reqCount
        }
      };
    });

    return NextResponse.json({ success: true, users: formatted }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role, subscriptionPlan, planExpiryDate, linkedProviders, password } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanId = id || 'usr_' + Date.now().toString(36);
    const cleanPlan = (subscriptionPlan || 'taster').toLowerCase().trim();

    await query(`
      INSERT INTO users (id, name, email, role, subscription_plan, plan_expiry_date, linked_providers, password, created_at, updated_at)
      VALUES ($1, $2, $3, COALESCE($4, 'user'), $5, $6, $7::jsonb, $8, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, users.name),
        email = COALESCE(EXCLUDED.email, users.email),
        role = COALESCE(EXCLUDED.role, users.role),
        subscription_plan = COALESCE(EXCLUDED.subscription_plan, users.subscription_plan),
        plan_expiry_date = COALESCE(EXCLUDED.plan_expiry_date, users.plan_expiry_date),
        linked_providers = COALESCE(EXCLUDED.linked_providers, users.linked_providers),
        password = COALESCE(EXCLUDED.password, users.password),
        updated_at = NOW()
    `, [
      cleanId, name || '', cleanEmail, role || 'user', cleanPlan,
      planExpiryDate || null, JSON.stringify(linkedProviders || []), password || null
    ]);

    return NextResponse.json({ success: true, message: 'User updated in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
