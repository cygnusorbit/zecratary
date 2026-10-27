// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getSettingsPath() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'admin_settings.json');
}

export async function GET() {
  try {
    let settings = {
      provider: 'localhost',
      uploadDir: 'apps/web/public/recipes/images',
      recipesJsonDir: 'apps/web/public/recipes',
      publicPrefix: '/recipes/images',
      cdnUrl: ''
    };

    // 1. Try PostgreSQL
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        const res = await query("SELECT storage_settings FROM admin_settings WHERE id = 'primary_settings' LIMIT 1");
        if (res?.rows?.[0]?.storage_settings) {
          const parsed = typeof res.rows[0].storage_settings === 'string'
            ? JSON.parse(res.rows[0].storage_settings)
            : res.rows[0].storage_settings;
          settings = { ...settings, ...parsed };
          return NextResponse.json({ success: true, storage_settings: settings });
        }
      }
    } catch (_) {}

    // 2. Fallback to Local JSON
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const data = JSON.parse(raw);
      if (data?.storage_settings) {
        settings = { ...settings, ...data.storage_settings };
      }
    }

    return NextResponse.json({ success: true, storage_settings: settings });
  } catch (err: any) {
    return NextResponse.json({ 
      success: true, 
      storage_settings: {
        provider: 'localhost',
        uploadDir: 'apps/web/public/recipes/images',
        recipesJsonDir: 'apps/web/public/recipes',
        publicPrefix: '/recipes/images'
      } 
    });
  }
}
