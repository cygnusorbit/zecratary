import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getStorePaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];
}

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

export async function GET() {
  try {
    const pool = await getPostgresPool();
    if (pool) {
      try {
        const res = await pool.query("SELECT * FROM user_theme WHERE user_id = 'default' LIMIT 1;");
        if (res.rows && res.rows.length > 0) {
          const colors = res.rows[0].theme_colors || res.rows[0].themeColors || res.rows[0].value;
          return NextResponse.json({
            success: true,
            themeColors: typeof colors === 'string' ? JSON.parse(colors) : colors
          });
        }
      } catch (_) {}
    }

    const filePaths = getStorePaths();
    for (const fp of filePaths) {
      if (fs.existsSync(fp)) {
        try {
          const raw = fs.readFileSync(fp, 'utf-8');
          const data = JSON.parse(raw);
          if (data?.themeColors) {
            return NextResponse.json({ success: true, themeColors: data.themeColors });
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({ success: true, themeColors: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const colors = body.themeColors || body;

    const pool = await getPostgresPool();
    if (pool) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS user_theme (
            user_id VARCHAR(100) PRIMARY KEY,
            theme_colors JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          ALTER TABLE user_theme ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
          ALTER TABLE user_theme ADD COLUMN IF NOT EXISTS theme_colors JSONB;
          ALTER TABLE user_theme ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);

        const jsonStr = JSON.stringify(colors);
        const check = await pool.query("SELECT user_id FROM user_theme WHERE user_id = 'default' LIMIT 1;");
        if (check.rows && check.rows.length > 0) {
          await pool.query(
            "UPDATE user_theme SET theme_colors = $1::jsonb, updated_at = NOW() WHERE user_id = 'default';",
            [jsonStr]
          );
        } else {
          await pool.query(
            "INSERT INTO user_theme (user_id, theme_colors, updated_at) VALUES ('default', $1::jsonb, NOW());",
            [jsonStr]
          );
        }
      } catch (e) {
        console.error('[PostgreSQL] Theme write error:', e);
      }
    }

    const filePaths = getStorePaths();
    for (const fp of filePaths) {
      try {
        if (fs.existsSync(fp)) {
          const raw = fs.readFileSync(fp, 'utf-8');
          const data = JSON.parse(raw);
          data.themeColors = { ...(data.themeColors || {}), ...colors };
          fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, themeColors: colors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
