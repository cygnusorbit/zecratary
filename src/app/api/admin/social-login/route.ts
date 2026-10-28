// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SETTINGS = {
  google: {
    enabled: true,
    environment: 'production',
    clientId: '',
    clientSecret: '',
    callbackUrl: '/api/auth/callback/google'
  },
  facebook: {
    enabled: true,
    environment: 'production',
    appId: '',
    appSecret: '',
    callbackUrl: '/api/auth/callback/facebook'
  },
  apple: {
    enabled: true,
    environment: 'production',
    clientId: '',
    teamId: '',
    keyId: '',
    privateKey: '',
    callbackUrl: '/api/auth/callback/apple'
  }
};

const DISK_FILES = [
  path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
  path.join(process.cwd(), 'data', 'admin_settings.json'),
  path.join(process.cwd(), 'admin_settings.json')
];

function readDiskSettings() {
  for (const fp of DISK_FILES) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        const parsed = JSON.parse(raw);
        const sl = parsed.socialLogin || parsed.settings?.socialLogin || parsed.social_login;
        if (sl) return sl;
      } catch (_) {}
    }
  }
  return DEFAULT_SETTINGS;
}

function writeDiskSettings(socialLogin: any) {
  for (const fp of DISK_FILES) {
    try {
      let existing: any = {};
      if (fs.existsSync(fp)) {
        try {
          existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        } catch (_) {
          existing = {};
        }
      } else {
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      }

      existing.socialLogin = socialLogin;
      existing.social_login = socialLogin;
      if (existing.settings && typeof existing.settings === 'object') {
        existing.settings.socialLogin = socialLogin;
      }

      fs.writeFileSync(fp, JSON.stringify(existing, null, 2), 'utf-8');
    } catch (_) {}
  }
}

export async function GET() {
  let dbSettings: any = null;

  // 1. Check PostgreSQL
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, ''),
        ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      const res = await pool.query(`
        SELECT settings, social_login FROM admin_settings WHERE id IN (1, '1', 'primary_settings') LIMIT 1;
      `);

      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        dbSettings = row.social_login || row.settings?.socialLogin;
      }
      await pool.end();
    } catch (_) {}
  }

  // 2. Check MySQL
  if (!dbSettings && (process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL)) {
    try {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection(process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL);
      const [rows]: any = await conn.execute(`
        SELECT settings, social_login FROM admin_settings WHERE id IN (1, '1', 'primary_settings') LIMIT 1;
      `);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const s = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
        const sl = typeof row.social_login === 'string' ? JSON.parse(row.social_login) : row.social_login;
        dbSettings = sl || s?.socialLogin;
      }
      await conn.end();
    } catch (_) {}
  }

  const finalSettings = dbSettings || readDiskSettings();
  return NextResponse.json({
    socialLogin: {
      google: { ...DEFAULT_SETTINGS.google, ...(finalSettings.google || {}) },
      facebook: { ...DEFAULT_SETTINGS.facebook, ...(finalSettings.facebook || {}) },
      apple: { ...DEFAULT_SETTINGS.apple, ...(finalSettings.apple || {}) }
    }
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incoming = body.socialLogin || body.settings?.socialLogin || body;

    const merged = {
      google: { ...DEFAULT_SETTINGS.google, ...(incoming.google || {}) },
      facebook: { ...DEFAULT_SETTINGS.facebook, ...(incoming.facebook || {}) },
      apple: { ...DEFAULT_SETTINGS.apple, ...(incoming.apple || {}) }
    };

    // 1. Sync PostgreSQL
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      try {
        const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, ''),
          ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
        });

        await pool.query(`
          INSERT INTO admin_settings (id, social_login, updated_at)
          VALUES ('1', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE
          SET social_login = $1::jsonb,
              settings = jsonb_set(COALESCE(admin_settings.settings, '{}'::jsonb), '{socialLogin}', $1::jsonb),
              updated_at = NOW();
        `, [JSON.stringify(merged)]);

        await pool.end();
      } catch (_) {}
    }

    // 2. Sync MySQL
    if (process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL) {
      try {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection(process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL);
        const jsonStr = JSON.stringify(merged);
        await conn.execute(`
          INSERT INTO admin_settings (id, social_login, updated_at)
          VALUES ('1', ?, NOW())
          ON DUPLICATE KEY UPDATE
            social_login = VALUES(social_login),
            settings = JSON_SET(COALESCE(settings, '{}'), '$.socialLogin', CAST(? AS JSON)),
            updated_at = NOW();
        `, [jsonStr, jsonStr]);
        await conn.end();
      } catch (_) {}
    }

    // 3. Sync Disk Stores
    writeDiskSettings(merged);

    return NextResponse.json({
      success: true,
      socialLogin: merged
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to persist settings' }, { status: 500 });
  }
}
