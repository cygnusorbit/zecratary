// Generated & Maintained by AI Collaborator - Production Build Compliant
// @ts-nocheck
import { NextResponse } from 'next/server';
import { query, parseDbRows } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface LanguageItem {
  id?: string;
  code: string;
  name: string;
  native?: string;
  flag?: string;
  direction?: 'ltr' | 'rtl';
  status: 'active' | 'inactive';
  is_default: boolean;
}

const DEFAULT_SUPPORTED_LANGUAGES: LanguageItem[] = [
  { id: 'lang_en', code: 'en', name: 'English', native: 'English', flag: '🇺🇸', direction: 'ltr', status: 'active', is_default: true },
  { id: 'lang_th', code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_es', code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_fr', code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', direction: 'ltr', status: 'active', is_default: false }
];

function getJsonStorePath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'src', 'data', 'admin_settings.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

function readLocalSettingsFallback(): any {
  try {
    const p = getJsonStorePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

function normalizeLanguageList(rawList: any[]): LanguageItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_SUPPORTED_LANGUAGES;
  }
  return rawList.map((item: any, idx: number) => {
    if (!item) return DEFAULT_SUPPORTED_LANGUAGES[0];
    const code = (item.code || item.locale || item.lang || `lang_${idx}`).toLowerCase().trim();
    const name = item.name || code.toUpperCase();
    const native = item.native || item.nativeName || item.native_name || name;
    const flag = item.flag || '🌐';
    const direction = item.direction || (code === 'ar' || code === 'he' ? 'rtl' : 'ltr');
    let status: 'active' | 'inactive' = 'active';
    if (item.status === 'inactive' || item.status === 'disabled' || item.is_active === false || item.isActive === false) {
      status = 'inactive';
    }
    const is_default = Boolean(item.is_default || item.isDefault || code === 'en');
    return {
      id: item.id || `lang_${code}`,
      code,
      name,
      native,
      flag,
      direction,
      status,
      is_default
    };
  });
}

export async function GET() {
  let supportedLanguages: LanguageItem[] = DEFAULT_SUPPORTED_LANGUAGES;
  let translations: Record<string, Record<string, string>> = {};
  let defaultLanguage = 'en';
  let dbLoaded = false;

  // 1. Authoritative query from PostgreSQL / MySQL using centralized adaptive query()
  try {
    const adminRes = await query(`
      SELECT supported_languages, translations, default_language, settings 
      FROM admin_settings 
      WHERE id = 'primary_settings' OR id = '1' OR key = 'current' OR key = 'default' 
      ORDER BY updated_at DESC LIMIT 1;
    `);

    const rows = parseDbRows(adminRes);
    if (rows && rows.length > 0) {
      const row = rows[0];
      const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});

      if (row.supported_languages) {
        const parsed = typeof row.supported_languages === 'string' ? JSON.parse(row.supported_languages) : row.supported_languages;
        supportedLanguages = normalizeLanguageList(parsed);
        dbLoaded = true;
      } else if (settings?.supportedLanguages || settings?.languages) {
        supportedLanguages = normalizeLanguageList(settings.supportedLanguages || settings.languages);
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
  } catch (_) {}

  // 2. Query dedicated app_translations table if available
  try {
    const transRes = await query(`SELECT lang_code, dictionary FROM app_translations;`);
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

  // 3. Fallback to local admin_settings.json if database was cold or uninitialized
  if (!dbLoaded || Object.keys(translations).length === 0) {
    const fileData = readLocalSettingsFallback();
    if (fileData) {
      const langConfig = fileData.languages || fileData;
      const fileLangs = langConfig.supportedLanguages || langConfig.languages || fileData.supported_languages;
      if (Array.isArray(fileLangs) && fileLangs.length > 0) {
        supportedLanguages = normalizeLanguageList(fileLangs);
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
    languages: supportedLanguages,
    translations,
    defaultLanguage
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawLanguages = body.supportedLanguages || body.languages || body.supported_languages || [];
    const supportedLanguages = normalizeLanguageList(rawLanguages);
    const translations = body.translations || {};
    const defaultLanguage = body.defaultLanguage || body.default_language || 'en';

    // 1. Ensure table structure exists in PostgreSQL / MySQL
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(255) PRIMARY KEY,
          site_name VARCHAR(255) DEFAULT 'Zecratary',
          tagline TEXT DEFAULT 'Autonomous Culinary Intelligence & Precision Meal Planning',
          titlebar_emoji VARCHAR(50) DEFAULT '👨‍🍳',
          titlebar_image TEXT DEFAULT '',
          favicon_emoji VARCHAR(50) DEFAULT '👨‍🍳',
          favicon_image TEXT DEFAULT '',
          font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
          theme_colors JSONB DEFAULT '{}'::jsonb,
          supported_languages JSONB DEFAULT '[]'::jsonb,
          translations JSONB DEFAULT '{}'::jsonb,
          default_language VARCHAR(32) DEFAULT 'en',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '[]'::jsonb;`);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;`);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(32) DEFAULT 'en';`);

      await query(`
        CREATE TABLE IF NOT EXISTS app_translations (
          lang_code VARCHAR(32) PRIMARY KEY,
          dictionary JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (_) {}

    // 2. Upsert into admin_settings
    try {
      await query(`
        INSERT INTO admin_settings (id, supported_languages, translations, default_language, updated_at)
        VALUES ('primary_settings', $1::jsonb, $2::jsonb, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET
          supported_languages = EXCLUDED.supported_languages,
          translations = EXCLUDED.translations,
          default_language = EXCLUDED.default_language,
          updated_at = NOW();
      `, [
        JSON.stringify(supportedLanguages),
        JSON.stringify(translations),
        String(defaultLanguage)
      ]);
    } catch (err: any) {
      try {
        await query(`
          INSERT INTO admin_settings (key, supported_languages, translations, default_language, updated_at)
          VALUES ('current', $1::jsonb, $2::jsonb, $3, NOW())
          ON CONFLICT (key) DO UPDATE SET
            supported_languages = EXCLUDED.supported_languages,
            translations = EXCLUDED.translations,
            default_language = EXCLUDED.default_language,
            updated_at = NOW();
        `, [
          JSON.stringify(supportedLanguages),
          JSON.stringify(translations),
          String(defaultLanguage)
        ]);
      } catch (_) {}
    }

    // 3. Upsert individual dictionaries into app_translations
    if (translations && typeof translations === 'object') {
      for (const [code, dict] of Object.entries(translations)) {
        try {
          await query(`
            INSERT INTO app_translations (lang_code, dictionary, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (lang_code) DO UPDATE SET
              dictionary = EXCLUDED.dictionary,
              updated_at = NOW();
          `, [code.toLowerCase(), JSON.stringify(dict)]);
        } catch (_) {}
      }
    }

    // 4. Mirror to filesystem data/admin_settings.json
    try {
      const p = getJsonStorePath();
      fs.mkdirSync(path.dirname(p), { recursive: true });
      let currentData: any = {};
      if (fs.existsSync(p)) {
        try {
          currentData = JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch (_) {}
      }
      currentData.supported_languages = supportedLanguages;
      currentData.supportedLanguages = supportedLanguages;
      currentData.languages = {
        ...(currentData.languages || {}),
        supportedLanguages,
        languages: supportedLanguages,
        translations,
        defaultLanguage
      };
      currentData.translations = { ...(currentData.translations || {}), ...translations };
      currentData.defaultLanguage = defaultLanguage;
      currentData.updated_at = new Date().toISOString();
      fs.writeFileSync(p, JSON.stringify(currentData, null, 2), 'utf-8');

      const altP = p.includes('apps/web') ? p.replace('apps/web/', '') : path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json');
      if (altP !== p && fs.existsSync(path.dirname(altP))) {
        fs.writeFileSync(altP, JSON.stringify(currentData, null, 2), 'utf-8');
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Language settings synchronized with PostgreSQL, MySQL, and server store.',
      supportedLanguages,
      languages: supportedLanguages,
      translations,
      defaultLanguage
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update language settings' },
      { status: 500 }
    );
  }
}
