import { NextRequest, NextResponse } from 'next/server';

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
  } catch (_) {
    return null;
  }
}

async function ensurePluginsTable(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plugins (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) DEFAULT '1.0.0',
        description TEXT,
        author VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        manifest JSONB DEFAULT '{}'::jsonb,
        files JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {}
}

export async function GET() {
  try {
    const pool = await getPostgresPool();
    if (pool) {
      await ensurePluginsTable(pool);
      const res = await pool.query('SELECT id, name, version, description, author, is_active, manifest, created_at FROM plugins ORDER BY created_at DESC');
      return NextResponse.json({ success: true, plugins: res.rows });
    }
    return NextResponse.json({ success: true, plugins: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'install';
    const pool = await getPostgresPool();
    if (!pool) {
      return NextResponse.json({ success: false, error: 'Database connection unavailable' }, { status: 500 });
    }
    await ensurePluginsTable(pool);

    if (action === 'toggle') {
      const { id, isActive } = body;
      await pool.query('UPDATE plugins SET is_active = $1 WHERE id = $2', [Boolean(isActive), id]);
      return NextResponse.json({ success: true, message: 'Plugin status updated successfully.' });
    }

    if (action === 'install' || action === 'upload_zip') {
      const pluginId = body.id || `plugin_${Date.now()}`;
      const name = body.name || 'Custom Extension Plugin';
      const version = body.version || '1.0.0';
      const description = body.description || 'Admin uploaded extension package.';
      const author = body.author || 'System Administrator';
      const manifest = body.manifest || {};
      const files = body.files || {};

      await pool.query(
        `INSERT INTO plugins (id, name, version, description, author, is_active, manifest, files)
         VALUES ($1, $2, $3, $4, $5, true, $6::jsonb, $7::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           version = EXCLUDED.version,
           description = EXCLUDED.description,
           author = EXCLUDED.author,
           manifest = EXCLUDED.manifest,
           files = EXCLUDED.files;`,
        [pluginId, name, version, description, author, JSON.stringify(manifest), JSON.stringify(files)]
      );

      return NextResponse.json({
        success: true,
        message: `Plugin "${name}" installed and stored in PostgreSQL successfully.`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Plugin ID required' }, { status: 400 });
    }

    const pool = await getPostgresPool();
    if (pool) {
      await ensurePluginsTable(pool);
      await pool.query('DELETE FROM plugins WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true, message: 'Plugin uninstalled successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
