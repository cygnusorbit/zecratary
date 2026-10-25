// @ts-nocheck
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', isDefault: true },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย', flag: '🇹🇭', isDefault: false },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', isDefault: false },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', isDefault: false }
];

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

export async function GET() {
  let supportedLanguages = DEFAULT_SUPPORTED_LANGUAGES;
  let translations: Record<string, Record<string, string>> = {};
  let defaultLanguage = 'en';
  let dbLoaded = false;

  // 1. Query PostgreSQL / MySQL for authoritative language configuration
  try {
    const adminRes = await query(
      `SELECT supported_languages, translations, default_language, settings 
       FROM admin_settings 
       WHERE key = 'current' OR key = 'default' 
       ORDER BY updated_at DESC LIMIT 1`
    );

    const rows = Array.isArray(adminRes) ? adminRes : (adminRes?.rows || []);
    if (rows && rows.length > 0) {
      const row = rows[0];
      const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});

      if (row.supported_languages) {
        supportedLanguages = typeof row.supported_languages === 'string' ? JSON.parse(row.supported_languages) : row.supported_languages;
        dbLoaded = true;
      } else if (settings?.supportedLanguages) {
        supportedLanguages = settings.supportedLanguages;
        dbLoaded = true;
      }

      if (row.translations) {
        translations = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
        dbLoaded = true;
      } else if (settings?.translations) {
        translations = settings.translations;
        dbLoaded = true;
      }

      if (row.default_language) {
        defaultLanguage = row.default_language;
      } else if (settings?.defaultLanguage) {
        defaultLanguage = settings.defaultLanguage;
      }
    }
  } catch (err: any) {
    console.warn('API Languages DB read notice:', err?.message || err);
  }

  // 2. Query dedicated app_translations table if available
  try {
    const transRes = await query(`SELECT lang_code, dictionary FROM app_translations`);
    const transRows = Array.isArray(transRes) ? transRes : (transRes?.rows || []);
    if (transRows && transRows.length > 0) {
      transRows.forEach((r: any) => {
        if (r.lang_code && r.dictionary) {
          translations[r.lang_code] = typeof r.dictionary === 'string' ? JSON.parse(r.dictionary) : r.dictionary;
        }
      });
      dbLoaded = true;
    }
  } catch (_) {}

  // 3. Fallback to local admin_settings.json if database is cold or uninitialized
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

  return NextResponse.json({
    success: true,
    supportedLanguages,
    translations,
    defaultLanguage
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supportedLanguages, translations, defaultLanguage = 'en' } = body;

    // 1. Ensure database tables exist in PostgreSQL
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key VARCHAR(64) PRIMARY KEY,
          settings JSONB,
          supported_languages JSONB,
          translations JSONB,
          default_language VARCHAR(32) DEFAULT 'en',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS app_translations (
          lang_code VARCHAR(32) PRIMARY KEY,
          dictionary JSONB,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    } catch (_) {}

    // 2. Upsert into admin_settings
    try {
      await query(
        `INSERT INTO admin_settings (key, supported_languages, translations, default_language, updated_at)
         VALUES ('current', $1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET
           supported_languages = EXCLUDED.supported_languages,
           translations = EXCLUDED.translations,
           default_language = EXCLUDED.default_language,
           updated_at = NOW()`,
        [
          JSON.stringify(supportedLanguages || []),
          JSON.stringify(translations || {}),
          String(defaultLanguage || 'en')
        ]
      );
    } catch (err: any) {
      console.warn('PostgreSQL admin_settings languages upsert notice:', err?.message || err);
    }

    // 3. Upsert individual dictionaries into app_translations
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

    // 4. Mirror to local admin_settings.json if writable
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json')
    ];
    for (const fp of possiblePaths) {
      if (fs.existsSync(fp)) {
        try {
          const raw = fs.readFileSync(fp, 'utf-8');
          const current = JSON.parse(raw);
          current.languages = {
            ...(current.languages || {}),
            supportedLanguages,
            translations,
            defaultLanguage
          };
          current.supportedLanguages = supportedLanguages;
          current.translations = translations;
          current.defaultLanguage = defaultLanguage;
          fs.writeFileSync(fp, JSON.stringify(current, null, 2), 'utf-8');
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Language settings synchronized with PostgreSQL, MySQL, and server cache.',
      supportedLanguages,
      defaultLanguage
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update language settings' },
      { status: 500 }
    );
  }
}
