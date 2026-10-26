import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

async function ensureStorageColumns() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query('ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS storage_settings JSONB DEFAULT \'{}\'::jsonb;');
    await query('ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS storage JSONB DEFAULT \'{}\'::jsonb;');
  } catch (_) {}
}

export async function GET() {
  try {
    await ensureStorageColumns();
    const res = await query('SELECT storage_settings, storage FROM admin_settings WHERE id = $1 LIMIT 1;', ['primary_settings']);
    const row = Array.isArray(res) ? res[0] : res?.rows?.[0];

    let storage = {
      provider: 'localhost',
      localPath: '/recipes/images/',
      recipesJsonDir: '/recipes/',
      supabase: {
        enabled: true,
        endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
        bucket: 'recipes',
        region: 'us-west-1'
      }
    };

    if (row && (row.storage_settings || row.storage)) {
      const raw = row.storage_settings || row.storage;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      storage = { ...storage, ...parsed };
    } else {
      // Fallback to server JSON store
      const jsonPath = path.join(process.cwd(), 'data', 'admin_settings.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          if (fileData.storage_settings || fileData.storage) {
            storage = { ...storage, ...(fileData.storage_settings || fileData.storage) };
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({ success: true, storage, settings: storage });
  } catch (err: any) {
    return NextResponse.json({ success: true, storage: { provider: 'localhost' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureStorageColumns();
    const body = await req.json();
    const payload = body.storage || body.settings || body;

    await query(`
      INSERT INTO admin_settings (id, storage_settings, updated_at)
      VALUES ('primary_settings', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        storage_settings = EXCLUDED.storage_settings,
        updated_at = NOW();
    `, [JSON.stringify(payload)]);

    return NextResponse.json({ success: true, storage: payload });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
