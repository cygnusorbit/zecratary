import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SYSTEM_LANGUAGES = [
  { id: 'lang_en', code: 'en', name: 'English', native: 'English', flag: '🇺🇸', direction: 'ltr', status: 'active', is_default: true, file: 'en.ts' },
  { id: 'lang_es', code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', direction: 'ltr', status: 'active', is_default: false, file: 'es.ts' },
  { id: 'lang_fr', code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', direction: 'ltr', status: 'active', is_default: false, file: 'fr.ts' },
  { id: 'lang_th', code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', direction: 'ltr', status: 'active', is_default: false, file: 'th.ts' }
];

function getLocalFileLanguages(): any[] | null {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    try {
      const p = path.join(process.cwd(), rel);
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const langs = raw.supportedLanguages || raw.supported_languages;
        if (Array.isArray(langs) && langs.length > 0) return langs;
      }
    } catch (_) {}
  }
  return null;
}

export async function GET() {
  try {
    let languages = null;
    let translations = {};

    try {
      const res: any = await query(`
        SELECT supported_languages, settings, translations FROM admin_settings 
        WHERE id = 'primary_settings' OR id = '1' 
        ORDER BY updated_at DESC LIMIT 1;
      `);
      const row = Array.isArray(res) ? res[0] : res?.rows?.[0];
      if (row) {
        if (row.supported_languages) {
          const parsed = typeof row.supported_languages === 'string'
            ? JSON.parse(row.supported_languages)
            : row.supported_languages;
          if (Array.isArray(parsed) && parsed.length > 0) languages = parsed;
        } else if (row.settings) {
          const s = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
          const l = s?.supportedLanguages || s?.supported_languages;
          if (Array.isArray(l) && l.length > 0) languages = l;
        }

        if (row.translations) {
          translations = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
        }
      }
    } catch (_) {}

    if (!languages) {
      languages = getLocalFileLanguages() || DEFAULT_SYSTEM_LANGUAGES;
    }

    return NextResponse.json(
      { success: true, languages, translations },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: true, languages: DEFAULT_SYSTEM_LANGUAGES, translations: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const languages = Array.isArray(body) ? body : (body.languages || body.supportedLanguages);
    const translations = body.translations;

    if (Array.isArray(languages)) {
      // Update Dual-Path Server JSON Files
      for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
        try {
          const p = path.join(process.cwd(), rel);
          osEnsureDir(path.dirname(p));
          let existing: any = {};
          if (fs.existsSync(p)) {
            try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {}
          }
          existing.supportedLanguages = languages;
          existing.supported_languages = languages;
          fs.writeFileSync(p, JSON.stringify(existing, null, 2), 'utf8');
        } catch (_) {}
      }

      // Update PostgreSQL / MySQL
      try {
        await query(`
          INSERT INTO admin_settings (id, supported_languages, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            supported_languages = EXCLUDED.supported_languages,
            updated_at = NOW();
        `, [JSON.stringify(languages)]);
      } catch (_) {}
    }

    if (translations && typeof translations === 'object') {
      try {
        await query(`
          INSERT INTO admin_settings (id, translations, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            translations = EXCLUDED.translations,
            updated_at = NOW();
        `, [JSON.stringify(translations)]);
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: 'Languages synchronized successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function osEnsureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
