import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getPostgresPool() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connStr) return null;
  try {
    const { Pool } = await import('pg');
    const requiresSsl = connStr.includes('sslmode=require') || 
                        connStr.includes('neon.tech') || 
                        connStr.includes('supabase.co') || 
                        process.env.NODE_ENV === 'production';
    return new Pool({
      connectionString: connStr,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    });
  } catch (err) {
    console.error('[PostgreSQL] Connection pool init notice:', err);
    return null;
  }
}

async function persistDiscoveredModels(provider: string, models: any[]) {
  try {
    const pool = await getPostgresPool();
    if (!pool) return;
    const settingsRes = await pool.query("SELECT * FROM admin_settings LIMIT 1;");
    if (settingsRes.rows && settingsRes.rows.length > 0) {
      const row = settingsRes.rows[0];
      let val = row.value || {};
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch (_) { val = {}; }
      }
      if (!val.chefAiSettings) val.chefAiSettings = {};
      if (provider === 'gemini') {
        val.chefAiSettings.availableGeminiModels = models;
      } else {
        val.chefAiSettings.availableOpenAiModels = models;
      }
      await pool.query(
        "UPDATE admin_settings SET value = $1::jsonb, updated_at = NOW() WHERE id = $2;",
        [JSON.stringify(val), row.id]
      );
    }
    await pool.end();
  } catch (e) {
    console.error('[PostgreSQL] Failed persisting discovered models:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json();
    const cleanKey = (apiKey || '').trim();

    if (!cleanKey) {
      return NextResponse.json({ success: false, error: 'No API key provided to test.' }, { status: 400 });
    }

    if (provider === 'gemini') {
      let discoveredModels: any[] = [];
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
        const listRes = await fetch(listUrl, { cache: 'no-store' });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData.models)) {
            discoveredModels = listData.models
              .filter((m: any) => {
                const methods = m.supportedGenerationMethods || [];
                const name = (m.name || '').toLowerCase();
                return methods.includes('generateContent') &&
                       !name.includes('embedding') &&
                       !name.includes('aqa') &&
                       !name.includes('imagen');
              })
              .map((m: any) => {
                const rawId = m.name?.startsWith('models/') ? m.name.replace('models/', '') : m.name;
                const displayName = m.displayName || rawId;
                return {
                  id: rawId,
                  name: displayName,
                  label: `${displayName} (${rawId})`,
                  description: m.description || ''
                };
              });
          }
        }
      } catch (err) {
        console.warn('[Gemini] Model listing error:', err);
      }

      const activeModel = model || (discoveredModels.length > 0 ? discoveredModels[0].id : 'gemini-2.5-flash');
      const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${cleanKey}`;
      const res = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 3 }
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return NextResponse.json({
          success: false,
          error: data.error?.message || `Google API handshake failed (${res.status})`,
          models: discoveredModels
        });
      }

      if (discoveredModels.length > 0) {
        persistDiscoveredModels('gemini', discoveredModels).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Connected to Google Gemini (${activeModel}) & synced ${discoveredModels.length} latest models!`,
        models: discoveredModels,
        testedModel: activeModel
      });
    } else {
      let discoveredModels: any[] = [];
      try {
        const listRes = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          cache: 'no-store'
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData.data)) {
            discoveredModels = listData.data
              .filter((m: any) => {
                const id = (m.id || '').toLowerCase();
                return (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3')) &&
                       !id.includes('realtime') && !id.includes('audio') &&
                       !id.includes('moderation') && !id.includes('embedding') &&
                       !id.includes('instruct') && !id.includes('similarity');
              })
              .sort((a: any, b: any) => (b.created || 0) - (a.created || 0))
              .map((m: any) => ({
                id: m.id,
                name: m.id,
                label: m.id,
                description: `OpenAI ${m.id}`
              }));
          }
        }
      } catch (err) {
        console.warn('[OpenAI] Model listing error:', err);
      }

      if (discoveredModels.length > 0) {
        persistDiscoveredModels('openai', discoveredModels).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Connected to OpenAI API & synced ${discoveredModels.length} latest models!`,
        models: discoveredModels
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Verification endpoint failed to connect.'
    });
  }
}
