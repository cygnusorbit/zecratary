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
  } catch (_) {
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
  } catch (_) {}
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json();
    const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');

    if (!cleanKey) {
      return NextResponse.json({ success: false, error: 'No API key provided to test.' }, { status: 400 });
    }

    if (provider === 'gemini') {
      if (cleanKey.includes('.apps.googleusercontent.com')) {
        return NextResponse.json({
          success: false,
          error: "Invalid Credential Type: You entered a Google OAuth Client ID (for Social Login), not a Gemini API Key. Please get an API key starting with 'AIzaSy' from Google AI Studio (https://aistudio.google.com/app/apikey)."
        }, { status: 400 });
      }

      if (cleanKey.startsWith('GOCSPX-')) {
        return NextResponse.json({
          success: false,
          error: "Invalid Credential Type: You entered a Google OAuth Client Secret, not a Gemini API Key. Please get an API key starting with 'AIzaSy' from Google AI Studio (https://aistudio.google.com/app/apikey)."
        }, { status: 400 });
      }

      let discoveredModels: any[] = [];
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
        const listRes = await fetch(listUrl, {
          cache: 'no-store',
          headers: {
            'x-goog-api-key': cleanKey
          }
        });
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
        } else {
          const errData = await listRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || '';
          if (listRes.status === 401 || errMsg.includes('authentication credentials') || errMsg.includes('API key')) {
            return NextResponse.json({
              success: false,
              error: "Google API Authentication Failed (401): The provided Gemini API Key is invalid or expired. Please check your API key at https://aistudio.google.com/app/apikey."
            }, { status: 401 });
          }
        }
      } catch (err) {
        console.warn('[Gemini] Model listing error:', err);
      }

      const activeModel = model || (discoveredModels.length > 0 ? discoveredModels[0].id : 'gemini-2.5-flash');
      const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(genUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 3 }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        const rawMsg = data.error?.message || `Google API handshake failed (${res.status})`;
        let friendly = rawMsg;
        if (res.status === 401 || rawMsg.includes('authentication credentials') || rawMsg.includes('API key')) {
          friendly = "Google API Authentication Failed (401): The provided Gemini API Key is invalid, expired, or rejected. Please obtain an active API key from Google AI Studio (https://aistudio.google.com/app/apikey).";
        }
        return NextResponse.json({
          success: false,
          error: friendly,
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
