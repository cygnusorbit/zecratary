import fs from 'fs';
import path from 'path';

export interface SocialLoginConfig {
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  facebookEnabled: boolean;
  facebookAppId: string;
  facebookAppSecret: string;
  appleEnabled: boolean;
  appleTeamId: string;
  appleKeyId: string;
  applePrivateKey: string;
}

export function getDefaultSocialSettings(): SocialLoginConfig {
  return {
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
    googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || '',
    facebookEnabled: Boolean(process.env.FACEBOOK_APP_ID),
    facebookAppId: process.env.FACEBOOK_APP_ID || '',
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',
    appleEnabled: Boolean(process.env.APPLE_TEAM_ID),
    appleTeamId: process.env.APPLE_TEAM_ID || '',
    appleKeyId: process.env.APPLE_KEY_ID || '',
    applePrivateKey: process.env.APPLE_PRIVATE_KEY || ''
  };
}

export function readSettingsFromFile(): any {
  const cwd = process.cwd();
  const fileCandidates = [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];

  for (const fp of fileCandidates) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return {};
}

export function writeSettingsToFile(data: any): void {
  const cwd = process.cwd();
  const fileCandidates = [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];

  for (const fp of fileCandidates) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

// -------------------------------------------------------------
// PostgreSQL & MySQL Storage Engine
// -------------------------------------------------------------
export async function getPersistedSocialSettings(): Promise<SocialLoginConfig> {
  const defaults = getDefaultSocialSettings();
  const fileSettings = readSettingsFromFile();
  let merged: SocialLoginConfig = {
    ...defaults,
    ...(fileSettings.socialLogin || {})
  };

  // 1. Attempt PostgreSQL Fetch
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost') ? { rejectUnauthorized: false } : undefined
      });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key VARCHAR(128) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const res = await pool.query("SELECT value FROM admin_settings WHERE key = 'socialLogin' LIMIT 1;");
      await pool.end();

      if (res.rows && res.rows.length > 0 && res.rows[0].value) {
        merged = { ...merged, ...res.rows[0].value };
        return merged;
      }
    } catch (pgErr) {
      // Graceful fallback to MySQL or local store
    }
  }

  // 2. Attempt MySQL Fetch
  if (process.env.MYSQL_URL || process.env.MYSQL_HOST) {
    try {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection(
        process.env.MYSQL_URL || {
          host: process.env.MYSQL_HOST || 'localhost',
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQL_DATABASE || 'zecratary',
          port: Number(process.env.MYSQL_PORT) || 3306
        }
      );

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          setting_key VARCHAR(128) PRIMARY KEY,
          setting_value JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      const [rows]: [any[], any] = await conn.execute(
        "SELECT setting_value FROM admin_settings WHERE setting_key = 'socialLogin' LIMIT 1;"
      );
      await conn.end();

      if (rows && rows.length > 0 && rows[0].setting_value) {
        const parsed = typeof rows[0].setting_value === 'string' 
          ? JSON.parse(rows[0].setting_value) 
          : rows[0].setting_value;
        merged = { ...merged, ...parsed };
        return merged;
      }
    } catch (myErr) {
      // Graceful fallback
    }
  }

  return merged;
}

export async function savePersistedSocialSettings(config: SocialLoginConfig): Promise<void> {
  // 1. File Replication
  const current = readSettingsFromFile();
  current.socialLogin = { ...(current.socialLogin || {}), ...config };
  writeSettingsToFile(current);

  // 2. PostgreSQL Storage
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost') ? { rejectUnauthorized: false } : undefined
      });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key VARCHAR(128) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        INSERT INTO admin_settings (key, value, updated_at)
        VALUES ('socialLogin', $1, NOW())
        ON CONFLICT (key) DO UPDATE 
        SET value = EXCLUDED.value, updated_at = NOW();
      `, [JSON.stringify(config)]);

      await pool.end();
    } catch (pgErr) {
      console.warn('[DB] PostgreSQL social settings update warning:', pgErr);
    }
  }

  // 3. MySQL Storage
  if (process.env.MYSQL_URL || process.env.MYSQL_HOST) {
    try {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection(
        process.env.MYSQL_URL || {
          host: process.env.MYSQL_HOST || 'localhost',
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQL_DATABASE || 'zecratary',
          port: Number(process.env.MYSQL_PORT) || 3306
        }
      );

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          setting_key VARCHAR(128) PRIMARY KEY,
          setting_value JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await conn.execute(`
        INSERT INTO admin_settings (setting_key, setting_value, updated_at)
        VALUES ('socialLogin', ?, NOW())
        ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value), updated_at = NOW();
      `, [JSON.stringify(config)]);

      await conn.end();
    } catch (myErr) {
      console.warn('[DB] MySQL social settings update warning:', myErr);
    }
  }
}
