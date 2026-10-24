import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Private default configuration to prevent TS2344 route export signature error
const DEFAULT_SOCIAL_CONFIG = {
  google: {
    enabled: true,
    clientId: '',
    clientSecret: '',
    callbackUrl: '/api/auth/callback/google'
  },
  facebook: {
    enabled: true,
    appId: '',
    appSecret: '',
    callbackUrl: '/api/auth/callback/facebook'
  },
  apple: {
    enabled: true,
    clientId: '',
    teamId: '',
    keyId: '',
    privateKey: '',
    callbackUrl: '/api/auth/callback/apple'
  }
};

function getPgPool(): Pool | null {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) return null;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cleanConn = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  return new Pool({
    connectionString: cleanConn,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
}

function getLocalFallback(): any {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), rel);
    if (fs.existsSync(full)) {
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
        const conf = raw.socialLogin || raw.settings?.socialLogin || raw.social_login;
        if (conf && typeof conf === 'object') {
          return {
            google: { ...DEFAULT_SOCIAL_CONFIG.google, ...(conf.google || {}) },
            facebook: { ...DEFAULT_SOCIAL_CONFIG.facebook, ...(conf.facebook || {}) },
            apple: { ...DEFAULT_SOCIAL_CONFIG.apple, ...(conf.apple || {}) }
          };
        }
      } catch (_) {}
    }
  }
  return DEFAULT_SOCIAL_CONFIG;
}

function saveLocalFallback(data: any) {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), rel);
    try {
      if (!fs.existsSync(path.dirname(full))) fs.mkdirSync(path.dirname(full), { recursive: true });
      let current: any = {};
      if (fs.existsSync(full)) {
        try { current = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (_) {}
      }
      current.socialLogin = data;
      current.social_login = data;
      if (current.settings) current.settings.socialLogin = data;
      fs.writeFileSync(full, JSON.stringify(current, null, 2), 'utf8');
    } catch (_) {}
  }
}

export async function GET() {
  const pool = getPgPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(`
          SELECT social_login, settings FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;
        `);
        const row = res.rows?.[0];
        let conf = row?.social_login;
        if (!conf && row?.settings?.socialLogin) {
          conf = row.settings.socialLogin;
        }
        if (typeof conf === 'string') {
          try { conf = JSON.parse(conf); } catch (_) {}
        }
        if (conf && typeof conf === 'object') {
          const merged = {
            google: { ...DEFAULT_SOCIAL_CONFIG.google, ...(conf.google || {}) },
            facebook: { ...DEFAULT_SOCIAL_CONFIG.facebook, ...(conf.facebook || {}) },
            apple: { ...DEFAULT_SOCIAL_CONFIG.apple, ...(conf.apple || {}) }
          };
          return NextResponse.json({ success: true, socialLogin: merged });
        }
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err: any) {
      console.warn('PostgreSQL social-login fetch note:', err.message);
    }
  }

  const fallback = getLocalFallback();
  return NextResponse.json({ success: true, socialLogin: fallback });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = body.socialLogin || body.settings?.socialLogin || body;

    const merged = {
      google: { ...DEFAULT_SOCIAL_CONFIG.google, ...(payload.google || {}) },
      facebook: { ...DEFAULT_SOCIAL_CONFIG.facebook, ...(payload.facebook || {}) },
      apple: { ...DEFAULT_SOCIAL_CONFIG.apple, ...(payload.apple || {}) }
    };

    saveLocalFallback(merged);

    const pool = getPgPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(`
            INSERT INTO admin_settings (id, social_login, updated_at)
            VALUES ('primary_settings', $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
              social_login = EXCLUDED.social_login,
              updated_at = NOW();
          `, [JSON.stringify(merged)]);

          // Also merge into settings JSONB column if exists
          await client.query(`
            UPDATE admin_settings
            SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{socialLogin}', $1::jsonb)
            WHERE id = 'primary_settings';
          `, [JSON.stringify(merged)]);
        } finally {
          client.release();
          await pool.end();
        }
      } catch (err: any) {
        console.warn('PostgreSQL social-login save note:', err.message);
      }
    }

    return NextResponse.json({ success: true, socialLogin: merged });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
