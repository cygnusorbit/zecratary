import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
        ai_model VARCHAR(128) DEFAULT 'gemini-1.5-flash',
        gemini_api_key TEXT,
        chef_ai_settings JSONB DEFAULT '{}'::jsonb,
        settings JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR(128) DEFAULT 'gemini-1.5-flash';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS chef_ai_settings JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
  } catch (_) {}
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    const row = rows[0] || {};
    const chefCfg = row.chef_ai_settings || {};
    const settings = row.settings || {};
    const aiModel = (row.ai_model || chefCfg.model || 'gemini-1.5-flash').replace(/^models\//, '');
    const geminiApiKey = row.gemini_api_key || chefCfg.apiKey || chefCfg.geminiApiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || '';

    return NextResponse.json({
      success: true,
      aiModel,
      hasApiKey: Boolean(geminiApiKey),
      geminiApiKey: geminiApiKey ? `${geminiApiKey.slice(0, 6)}...${geminiApiKey.slice(-4)}` : '',
      chefAiSettings: {
        model: aiModel,
        apiKey: geminiApiKey,
        ...chefCfg
      },
      settings: {
        aiModel,
        geminiApiKey,
        chefAiSettings: {
          model: aiModel,
          apiKey: geminiApiKey,
          ...chefCfg
        },
        ...settings
      }
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const chefAiSettings = body.chefAiSettings || body.settings?.chefAiSettings || body;
    const aiModel = (body.aiModel || body.model || chefAiSettings.model || 'gemini-1.5-flash').replace(/^models\//, '');
    const geminiApiKey = body.geminiApiKey || body.apiKey || chefAiSettings.apiKey || chefAiSettings.geminiApiKey || undefined;

    await query(`
      INSERT INTO admin_settings (id, ai_model, gemini_api_key, chef_ai_settings, settings, updated_at)
      VALUES (
        'primary_settings',
        $1,
        $2,
        $3::jsonb,
        $4::jsonb,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        ai_model = EXCLUDED.ai_model,
        gemini_api_key = COALESCE(EXCLUDED.gemini_api_key, admin_settings.gemini_api_key),
        chef_ai_settings = EXCLUDED.chef_ai_settings,
        settings = EXCLUDED.settings,
        updated_at = NOW();
    `, [
      aiModel,
      geminiApiKey || null,
      JSON.stringify(chefAiSettings),
      JSON.stringify(body.settings || body)
    ]);

    return NextResponse.json({
      success: true,
      message: 'AI settings synchronized successfully in PostgreSQL.',
      aiModel,
      hasApiKey: Boolean(geminiApiKey)
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
