import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readServerJsonTranslations(): Record<string, any> {
  const paths = [
    path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
    path.join(process.cwd(), 'data/admin_settings.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed?.translations) return parsed.translations;
      } catch (_) {}
    }
  }
  return {};
}

export async function GET() {
  try {
    let languages: any[] = [];
    let translations: Record<string, any> = readServerJsonTranslations();

    try {
      const res: any = await query(`
        SELECT supported_languages, translations FROM admin_settings 
        WHERE id::text = 'primary_settings' OR id::text = 'current' OR id::text = '1'
        LIMIT 1;
      `);
      const row = Array.isArray(res) ? res[0] : res?.rows?.[0];
      if (row) {
        if (row.supported_languages) {
          const parsedLangs = typeof row.supported_languages === 'string' 
            ? JSON.parse(row.supported_languages) 
            : row.supported_languages;
          if (Array.isArray(parsedLangs) && parsedLangs.length > 0) languages = parsedLangs;
        }
        if (row.translations) {
          const dbTrans = typeof row.translations === 'string' 
            ? JSON.parse(row.translations) 
            : row.translations;
          translations = { ...translations, ...dbTrans };
        }
      }
    } catch (_) {}

    if (languages.length === 0) {
      languages = [
        { id: 'lang_en', code: 'en', name: 'English', flag: '🇺🇸', status: 'active', is_default: true },
        { id: 'lang_th', code: 'th', name: 'ภาษาไทย (Thai)', flag: '🇹🇭', status: 'active', is_default: false },
        { id: 'lang_es', code: 'es', name: 'Español', flag: '🇪🇸', status: 'active', is_default: false },
        { id: 'lang_fr', code: 'fr', name: 'Français', flag: '🇫🇷', status: 'active', is_default: false },
      ];
    }

    return NextResponse.json({
      success: true,
      languages,
      translations,
      dictionaries: translations
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, languages: [], translations: {} }, { status: 500 });
  }
}
