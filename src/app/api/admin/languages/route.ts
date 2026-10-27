import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isDefault: true, isEnabled: true },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', isDefault: false, isEnabled: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', isDefault: false, isEnabled: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', isDefault: false, isEnabled: true },
];

export async function GET(req: NextRequest) {
  try {
    let supportedLanguages = DEFAULT_LANGUAGES;
    let translations: Record<string, any> = {};
    let defaultLanguage = 'en';

    // 1. Try PostgreSQL / MySQL with safe SELECT *
    try {
      const res: any = await query('SELECT * FROM admin_settings WHERE id IN (\'primary_settings\', \'1\') OR key = \'current\' LIMIT 1');
      const row = (Array.isArray(res) ? res[0] : (res as any)?.rows?.[0]);
      if (row) {
        if (row.supported_languages) {
          const parsed = typeof row.supported_languages === 'string'
            ? JSON.parse(row.supported_languages)
            : row.supported_languages;
          if (Array.isArray(parsed) && parsed.length > 0) supportedLanguages = parsed;
        }
        if (row.translations) {
          translations = typeof row.translations === 'string'
            ? JSON.parse(row.translations)
            : row.translations;
        }
        if (row.default_language) defaultLanguage = row.default_language;
      }
    } catch (_) {}

    // 2. Hydrate from app_translations if available
    try {
      const appTransRes: any = await query('SELECT lang_code, dictionary FROM app_translations');
      const rows = Array.isArray(appTransRes) ? appTransRes : appTransRes?.rows || [];
      rows.forEach((r: any) => {
        if (r && r.lang_code) {
          const dict = typeof r.dictionary === 'string' ? JSON.parse(r.dictionary) : r.dictionary;
          translations[r.lang_code] = { ...(translations[r.lang_code] || {}), ...dict };
        }
      });
    } catch (_) {}

    // 3. Fallback to Local JSON store
    const jsonPaths = [
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'data', 'admin_settings.json'),
    ];
    for (const jp of jsonPaths) {
      if (fs.existsSync(jp)) {
        try {
          const fileData = JSON.parse(fs.readFileSync(jp, 'utf8'));
          if (Array.isArray(fileData.supported_languages) && fileData.supported_languages.length > 0 && supportedLanguages === DEFAULT_LANGUAGES) {
            supportedLanguages = fileData.supported_languages;
          }
          if (fileData.translations && Object.keys(translations).length === 0) {
            translations = fileData.translations;
          }
          if (fileData.default_language && defaultLanguage === 'en') {
            defaultLanguage = fileData.default_language;
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      supportedLanguages,
      translations,
      defaultLanguage
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      supportedLanguages: DEFAULT_LANGUAGES,
      translations: {},
      defaultLanguage: 'en'
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supportedLanguages, translations, defaultLanguage } = body;

    const safeLangs = Array.isArray(supportedLanguages) ? supportedLanguages : DEFAULT_LANGUAGES;
    const safeTrans = translations || {};
    const safeDefault = defaultLanguage || 'en';

    // 1. PostgreSQL & MySQL Persistence
    try {
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '[]'::jsonb;`);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;`);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(32) DEFAULT 'en';`);

      await query(`
        INSERT INTO admin_settings (id, supported_languages, translations, default_language, updated_at)
        VALUES ('primary_settings', $1::jsonb, $2::jsonb, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET
          supported_languages = EXCLUDED.supported_languages,
          translations = EXCLUDED.translations,
          default_language = EXCLUDED.default_language,
          updated_at = NOW();
      `, [JSON.stringify(safeLangs), JSON.stringify(safeTrans), safeDefault]);

      await query(`
        CREATE TABLE IF NOT EXISTS app_translations (
          lang_code VARCHAR(16) PRIMARY KEY,
          lang_name VARCHAR(64),
          dictionary JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      for (const [code, dict] of Object.entries(safeTrans)) {
        await query(`
          INSERT INTO app_translations (lang_code, dictionary, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (lang_code) DO UPDATE SET
            dictionary = EXCLUDED.dictionary,
            updated_at = NOW();
        `, [code, JSON.stringify(dict)]);
      }
    } catch (_) {}

    // 2. Mirror to JSON files
    const jsonPaths = [
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'data', 'admin_settings.json'),
    ];
    for (const jp of jsonPaths) {
      try {
        const dir = path.dirname(jp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let existing: any = {};
        if (fs.existsSync(jp)) {
          try { existing = JSON.parse(fs.readFileSync(jp, 'utf8')); } catch (_) {}
        }
        existing.supported_languages = safeLangs;
        existing.translations = safeTrans;
        existing.default_language = safeDefault;
        fs.writeFileSync(jp, JSON.stringify(existing, null, 2), 'utf8');
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      supportedLanguages: safeLangs,
      translations: safeTrans,
      defaultLanguage: safeDefault
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
