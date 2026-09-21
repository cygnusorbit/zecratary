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
    return null;
  }
}

async function initPostgresTables(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_api_keys (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        provider VARCHAR(100),
        env_key VARCHAR(100) UNIQUE,
        key_value TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {}
}

function getEnvFilePaths(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, 'apps', 'web', '.env'),
    path.join(cwd, 'apps', 'web', '.env.local'),
    path.resolve(cwd, '..', '.env'),
    path.resolve(cwd, '..', '.env.local')
  ];
  const existing = candidates.filter(p => fs.existsSync(p));
  return existing.length > 0 ? Array.from(new Set(existing)) : [path.join(cwd, '.env')];
}

function parseEnvFile(filePath: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return map;
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.substring(0, idx).trim();
        let v = trimmed.substring(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        map[k] = v;
      }
    }
  } catch (_) {}
  return map;
}

function updateEnvFile(filePath: string, key: string, value: string) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const safeVal = value.includes(' ') || value.includes('#') ? `"${value}"` : value;

  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${safeVal}`);
  } else {
    if (content.length > 0 && !content.endsWith('\n')) content += '\n';
    content += `${key}=${safeVal}\n`;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export async function GET() {
  try {
    const envMap: Record<string, string> = {};
    const envPaths = getEnvFilePaths();
    for (const ep of envPaths) {
      Object.assign(envMap, parseEnvFile(ep));
    }

    ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY'].forEach(k => {
      if (process.env[k] && !envMap[k]) envMap[k] = process.env[k]!;
    });

    const pool = await getPostgresPool();
    const dbKeys: any[] = [];
    if (pool) {
      await initPostgresTables(pool);
      const res = await pool.query('SELECT * FROM admin_api_keys ORDER BY updated_at DESC;');
      for (const row of res.rows) {
        dbKeys.push({
          id: row.id,
          name: row.name,
          provider: row.provider,
          envKey: row.env_key,
          keyValue: row.key_value,
          status: row.status
        });
        if (row.env_key && row.key_value) envMap[row.env_key] = row.key_value;
      }
    }

    return NextResponse.json({ success: true, keys: dbKeys, envMap });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, provider, envKey, keyValue, model, status } = body;

    const keyToSave = (envKey || (provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY')).trim();
    const valToSave = (keyValue || '').trim();

    if (!keyToSave) {
      return NextResponse.json({ success: false, error: 'Target environment key is required.' }, { status: 400 });
    }

    // 1. Update .env files
    for (const ep of getEnvFilePaths()) {
      try { updateEnvFile(ep, keyToSave, valToSave); } catch (_) {}
    }

    // 2. Sync process runtime memory
    process.env[keyToSave] = valToSave;
    if (keyToSave === 'GEMINI_API_KEY') process.env['GOOGLE_API_KEY'] = valToSave;

    // 3. Persist to PostgreSQL admin_api_keys
    const pool = await getPostgresPool();
    if (pool) {
      await initPostgresTables(pool);
      await pool.query(
        `INSERT INTO admin_api_keys (name, provider, env_key, key_value, status, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (env_key)
         DO UPDATE SET
           key_value = EXCLUDED.key_value,
           name = COALESCE(EXCLUDED.name, admin_api_keys.name),
           provider = COALESCE(EXCLUDED.provider, admin_api_keys.provider),
           status = COALESCE(EXCLUDED.status, admin_api_keys.status),
           updated_at = NOW();`,
        [
          name || (provider === 'gemini' ? 'Google Gemini Production' : 'OpenAI GPT-4o'),
          provider || 'gemini',
          keyToSave,
          valToSave,
          status || 'active'
        ]
      );

      // Synchronize admin_settings without destroying existing model identifier
      try {
        const settingsRes = await pool.query("SELECT * FROM admin_settings LIMIT 1;");
        if (settingsRes.rows && settingsRes.rows.length > 0) {
          const row = settingsRes.rows[0];
          let val = row.value || {};
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (_) { val = {}; }
          }
          if (!val.chefAiSettings) val.chefAiSettings = {};
          val.chefAiSettings.apiKey = valToSave;
          val.chefAiSettings.provider = provider || val.chefAiSettings.provider || 'gemini';
          if (model) {
            val.chefAiSettings.model = model;
            val.aiModel = model;
          }
          await pool.query(
            "UPDATE admin_settings SET value = $1::jsonb, updated_at = NOW() WHERE id = $2;",
            [JSON.stringify(val), row.id]
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Key saved to local .env and synchronized (${keyToSave})`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
