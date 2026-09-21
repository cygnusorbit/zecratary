import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let cachedPool: any = null;

async function getPostgresPool() {
  if (cachedPool) return cachedPool;
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connStr) return null;
  try {
    const { Pool } = await import('pg');
    const requiresSsl = connStr.includes('sslmode=require') || 
                        connStr.includes('neon.tech') || 
                        connStr.includes('supabase.co') || 
                        process.env.NODE_ENV === 'production';
    cachedPool = new Pool({
      connectionString: connStr,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    });
    return cachedPool;
  } catch (err) {
    console.error('[PostgreSQL] Settings Pool Init Error:', err);
    return null;
  }
}

async function ensureSettingsTable(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(100) PRIMARY KEY DEFAULT 'primary_settings',
        value JSONB DEFAULT '{}'::jsonb,
        chef_ai_settings JSONB,
        ai_model VARCHAR(255),
        ai_provider VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS chef_ai_settings JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR(255);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(100);
    `);
  } catch (err) {
    console.error('[PostgreSQL] ensureSettingsTable Notice:', err);
  }
}

export async function GET() {
  try {
    const pool = await getPostgresPool();
    let currentSettings: any = {};

    if (pool) {
      await ensureSettingsTable(pool);
      const res = await pool.query('SELECT * FROM admin_settings ORDER BY updated_at DESC LIMIT 1;');
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        let val = row.value || {};
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (_) { val = {}; }
        }

        let chefAi = row.chef_ai_settings;
        if (typeof chefAi === 'string') {
          try { chefAi = JSON.parse(chefAi); } catch (_) { chefAi = {}; }
        }

        currentSettings = {
          ...val,
          chefAiSettings: chefAi || val.chefAiSettings || val.aiSettings || {},
          aiModel: row.ai_model || val.aiModel || (chefAi?.model) || val.chefAiSettings?.model || 'gemini-2.5-flash',
          aiProvider: row.ai_provider || val.aiProvider || (chefAi?.provider) || val.chefAiSettings?.provider || 'gemini'
        };
      }
    }

    // Disk fallback if database returned empty
    if (Object.keys(currentSettings).length === 0) {
      try {
        const diskPath = path.join(process.cwd(), 'data', 'admin_settings.json');
        if (fs.existsSync(diskPath)) {
          const raw = fs.readFileSync(diskPath, 'utf-8');
          currentSettings = JSON.parse(raw);
        }
      } catch (_) {}
    }

    return NextResponse.json(
      {
        success: true,
        settings: currentSettings,
        chefAiSettings: currentSettings.chefAiSettings,
        aiModel: currentSettings.aiModel || currentSettings.chefAiSettings?.model,
        aiProvider: currentSettings.aiProvider || currentSettings.chefAiSettings?.provider,
        ...currentSettings
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getPostgresPool();

    let existing: any = {};
    let rowId = 'primary_settings';

    if (pool) {
      await ensureSettingsTable(pool);
      const res = await pool.query('SELECT * FROM admin_settings LIMIT 1;');
      if (res.rows && res.rows.length > 0) {
        rowId = res.rows[0].id || 'primary_settings';
        let val = res.rows[0].value || {};
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (_) { val = {}; }
        }
        existing = val;
      }
    }

    // Perform deep merge to guarantee no sub-properties are lost
    const incomingChef = body.chefAiSettings || body.aiSettings || {};
    const existingChef = existing.chefAiSettings || existing.aiSettings || {};

    const resolvedModel = body.aiModel || incomingChef.model || existing.aiModel || existingChef.model || 'gemini-2.5-flash';
    const resolvedProvider = body.aiProvider || incomingChef.provider || existing.aiProvider || existingChef.provider || 'gemini';

    const mergedChefAiSettings = {
      ...existingChef,
      ...incomingChef,
      model: resolvedModel,
      provider: resolvedProvider,
      updatedAt: new Date().toISOString()
    };

    const merged = {
      ...existing,
      ...body,
      chefAiSettings: mergedChefAiSettings,
      aiModel: resolvedModel,
      aiProvider: resolvedProvider,
      updatedAt: new Date().toISOString()
    };

    if (pool) {
      await pool.query(`
        INSERT INTO admin_settings (id, value, chef_ai_settings, ai_model, ai_provider, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
          value = EXCLUDED.value,
          chef_ai_settings = EXCLUDED.chef_ai_settings,
          ai_model = EXCLUDED.ai_model,
          ai_provider = EXCLUDED.ai_provider,
          updated_at = NOW();
      `, [
        rowId,
        JSON.stringify(merged),
        JSON.stringify(mergedChefAiSettings),
        resolvedModel,
        resolvedProvider
      ]);
    }

    // Disk backup sync
    try {
      const diskDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(diskDir)) fs.mkdirSync(diskDir, { recursive: true });
      fs.writeFileSync(path.join(diskDir, 'admin_settings.json'), JSON.stringify(merged, null, 2), 'utf-8');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Admin settings persisted successfully to PostgreSQL.',
      settings: merged,
      chefAiSettings: mergedChefAiSettings,
      aiModel: resolvedModel,
      aiProvider: resolvedProvider
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
