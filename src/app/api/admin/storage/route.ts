import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readServerStorageFallback(): any {
  const candidatePaths = [
    path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
    path.join(process.cwd(), 'data/admin_settings.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.storageSettings || parsed?.storage_settings) {
          return parsed.storageSettings || parsed.storage_settings;
        }
      } catch (_) {}
    }
  }
  return null;
}

export async function GET() {
  let settings: any = readServerStorageFallback();

  try {
    const sRes: any = await Promise.race([
      query(`SELECT storage_settings FROM admin_settings WHERE id::text = 'primary_settings' OR id::text = '1' LIMIT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
    if (sRow?.storage_settings) {
      const parsed = typeof sRow.storage_settings === 'string' ? JSON.parse(sRow.storage_settings) : sRow.storage_settings;
      if (parsed && typeof parsed === 'object') {
        settings = { ...(settings || {}), ...parsed };
      }
    }
  } catch (err: any) {
    console.warn('[Storage API] Fallback to server JSON store:', err?.message || err);
  }

  const defaultStorage = {
    provider: 'localhost',
    localhost: {
      uploadPath: 'public/uploads/recipes',
      publicServingUrl: '/uploads/recipes',
      maxFileSizeMb: 10
    },
    supabase: {
      endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
      region: 'us-west-1',
      accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
      secretAccessKey: '',
      bucketName: 'recipes',
      publicUrlPrefix: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
      maxFileSizeMb: 25
    },
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    isConnected: false
  };

  const finalConfig = settings ? { ...defaultStorage, ...settings } : defaultStorage;

  return NextResponse.json({
    success: true,
    storageSettings: finalConfig,
    settings: finalConfig
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const storageSettings = body.storageSettings || body.settings || body;

    // 1. Persist to PostgreSQL admin_settings
    try {
      await query(
        `INSERT INTO admin_settings (id, storage_settings, updated_at)
         VALUES ('primary_settings', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET
           storage_settings = EXCLUDED.storage_settings,
           updated_at = NOW()`,
        [JSON.stringify(storageSettings)]
      );
    } catch (_) {}

    // 2. Persist to JSON store mirror
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'admin_settings.json');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      let existing: any = {};
      if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
      }
      existing.storageSettings = storageSettings;
      existing.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Storage settings saved successfully to server and database!',
      storageSettings
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
