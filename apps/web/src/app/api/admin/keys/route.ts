import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT ai_provider, ai_model, chef_ai_settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    const r = rows[0] || {};
    return NextResponse.json({
      success: true,
      aiProvider: r.ai_provider || 'gemini',
      aiModel: r.ai_model || 'gemini-3.5-flash-lite',
      chefAiSettings: r.chef_ai_settings || {}
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const aiProvider = body.aiProvider || 'gemini';
    const aiModel = body.aiModel || 'gemini-3.5-flash-lite';
    const chefAiSettings = body.chefAiSettings || {};

    await query(`
      UPDATE admin_settings SET
        ai_provider = $1,
        ai_model = $2,
        chef_ai_settings = $3::jsonb,
        updated_at = NOW()
      WHERE id = 'primary_settings'
    `, [aiProvider, aiModel, JSON.stringify(chefAiSettings)]);

    return NextResponse.json({ success: true, message: 'AI configuration updated in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
