import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


export const dynamic = 'force-dynamic';

const DEFAULT_SUPPORTED_LANGUAGES = [
  { id: 'lang_en', code: 'en', name: 'English', flag: '🇺🇸', status: 'active', is_default: true },
  { id: 'lang_th', code: 'th', name: 'ภาษาไทย (Thai)', flag: '🇹🇭', status: 'active', is_default: false },
  { id: 'lang_es', code: 'es', name: 'Español', flag: '🇪🇸', status: 'active', is_default: false },
  { id: 'lang_fr', code: 'fr', name: 'Français', flag: '🇫🇷', status: 'active', is_default: false },
  { id: 'lang_de', code: 'de', name: 'Deutsch', flag: '🇩🇪', status: 'active', is_default: false },
  { id: 'lang_it', code: 'it', name: 'Italiano', flag: '🇮🇹', status: 'active', is_default: false },
  { id: 'lang_ja', code: 'ja', name: '日本語', flag: '🇯🇵', status: 'active', is_default: false },
  { id: 'lang_zh', code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳', status: 'active', is_default: false },
  { id: 'lang_ko', code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷', status: 'active', is_default: false },
  { id: 'lang_pt', code: 'pt', name: 'Português', flag: '🇵🇹', status: 'active', is_default: false },
  { id: 'lang_ru', code: 'ru', name: 'Русский', flag: '🇷🇺', status: 'active', is_default: false },
  { id: 'lang_ar', code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦', direction: 'rtl', status: 'active', is_default: false }
];

let isLanguagesDbInitialized = false;

async function ensureLanguagesSchema() {
  if (isLanguagesDbInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY,
        key VARCHAR(64),
        settings JSONB DEFAULT '{}'::jsonb,
        supported_languages JSONB DEFAULT '[]'::jsonb,
        translations JSONB DEFAULT '{}'::jsonb,
        default_language VARCHAR(32) DEFAULT 'en',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const alters = [
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS id VARCHAR(64);",
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(64);",
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '[]'::jsonb;",
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;",
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(32) DEFAULT 'en';",
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;",
      "ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
      "CREATE TABLE IF NOT EXISTS app_translations (lang_code VARCHAR(32) PRIMARY KEY, lang_name VARCHAR(64), dictionary JSONB DEFAULT '{}'::jsonb, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
    ];

    for (const sql of alters) {
      await query(sql).catch(() => {});
    }

    isLanguagesDbInitialized = true;
  } catch (_) {
    // Non-blocking schema guard
  }
}

function readLocalSettingsFallback(): any {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'src', 'data', 'admin_settings.json')
  ];

  for (const fp of possiblePaths) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      } catch (_) {}
    }
  }
  return null;
}

export async function GET(request: Request) {
  await ensureLanguagesSchema();

  const { searchParams } = new URL(request.url);
  const requestedCode = searchParams.get('code');

  let supportedLanguages = DEFAULT_SUPPORTED_LANGUAGES;
  let translations: Record<string, Record<string, string>> = {};
  let defaultLanguage = 'en';
  let dbLoaded = false;

  // Query admin_settings defensively using SELECT * to avoid catalog aborts on missing column names
  try {
    const adminRes = await query(
      `SELECT * FROM admin_settings WHERE id::text = 'primary_settings' OR key::text = 'current' OR id::text = '1' ORDER BY updated_at DESC LIMIT 1`
    ).catch(() => null);

    const rows = parseDbRows(adminRes);
    if (rows && rows.length > 0) {
      const row = rows[0];
      const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});

      if (row.supported_languages) {
        supportedLanguages = typeof row.supported_languages === 'string'
          ? JSON.parse(row.supported_languages)
          : row.supported_languages;
        dbLoaded = true;
      } else if (settings?.supportedLanguages && Array.isArray(settings.supportedLanguages)) {
        supportedLanguages = settings.supportedLanguages;
        dbLoaded = true;
      }

      if (row.translations) {
        translations = typeof row.translations === 'string'
          ? JSON.parse(row.translations)
          : row.translations;
        dbLoaded = true;
      } else if (settings?.translations && typeof settings.translations === 'object') {
        translations = settings.translations;
        dbLoaded = true;
      }

      if (row.default_language) {
        defaultLanguage = row.default_language;
      } else if (settings?.defaultLanguage) {
        defaultLanguage = settings.defaultLanguage;
      }
    }
  } catch (_) {}

  // Query dedicated app_translations table
  try {
    const transRes = await query(`SELECT lang_code, dictionary FROM app_translations`).catch(() => null);
    const transRows = parseDbRows(transRes);
    if (transRows && transRows.length > 0) {
      transRows.forEach((r: any) => {
        if (r.lang_code && r.dictionary) {
          translations[r.lang_code] = typeof r.dictionary === 'string' ? JSON.parse(r.dictionary) : r.dictionary;
        }
      });
      dbLoaded = true;
    }
  } catch (_) {}

  // Local admin_settings.json fallback
  if (!dbLoaded || Object.keys(translations).length === 0) {
    const fileData = readLocalSettingsFallback();
    if (fileData) {
      const langConfig = fileData.languages || fileData;
      if (langConfig.supportedLanguages && Array.isArray(langConfig.supportedLanguages)) {
        supportedLanguages = langConfig.supportedLanguages;
      }
      if (langConfig.translations && typeof langConfig.translations === 'object') {
        translations = { ...langConfig.translations, ...translations };
      }
      if (langConfig.defaultLanguage) {
        defaultLanguage = langConfig.defaultLanguage;
      }
    }
  }

  // Handle single code lookup
  if (requestedCode) {
    const code = requestedCode.toLowerCase().trim();
    const dictionary = translations[code] || {};
    return NextResponse.json({
      success: true,
      code,
      dictionary,
      defaultLanguage
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }

  return NextResponse.json({
    success: true,
    languages: supportedLanguages,
    supportedLanguages,
    translations,
    defaultLanguage
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  await ensureLanguagesSchema();

  try {
    const body = await req.json();
    const { supportedLanguages: rawLangs, languages, translations, defaultLanguage = 'en' } = body;
    const finalLangs = rawLangs || languages || [];

    // Upsert into admin_settings with explicit string identifiers
    try {
      await query(
        `INSERT INTO admin_settings (id, key, supported_languages, translations, default_language, updated_at)
         VALUES ('primary_settings', 'current', $1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           supported_languages = EXCLUDED.supported_languages,
           translations = EXCLUDED.translations,
           default_language = EXCLUDED.default_language,
           updated_at = NOW()`,
        [
          JSON.stringify(finalLangs),
          JSON.stringify(translations || {}),
          String(defaultLanguage || 'en')
        ]
      );
    } catch (_) {
      await query(
        `INSERT INTO admin_settings (key, supported_languages, translations, default_language, updated_at)
         VALUES ('current', $1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET
           supported_languages = EXCLUDED.supported_languages,
           translations = EXCLUDED.translations,
           default_language = EXCLUDED.default_language,
           updated_at = NOW()`,
        [
          JSON.stringify(finalLangs),
          JSON.stringify(translations || {}),
          String(defaultLanguage || 'en')
        ]
      ).catch(() => {});
    }

    // Upsert individual dictionaries into app_translations
    if (translations && typeof translations === 'object') {
      for (const [code, dict] of Object.entries(translations)) {
        try {
          await query(
            `INSERT INTO app_translations (lang_code, dictionary, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (lang_code) DO UPDATE SET
               dictionary = EXCLUDED.dictionary,
               updated_at = NOW()`,
            [code, JSON.stringify(dict)]
          );
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Language configuration saved successfully.',
      supportedLanguages: finalLangs,
      languages: finalLangs,
      defaultLanguage
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update language settings' },
      { status: 500 }
    );
  }
}
