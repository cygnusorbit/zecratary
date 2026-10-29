// @ts-nocheck
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CANONICAL_LANGUAGES = [
  { id: 'lang_en', code: 'en', name: 'English', native: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr', status: 'active', is_default: true, isDefault: true },
  { id: 'lang_es', code: 'es', name: 'Spanish', native: 'Español', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr', status: 'inactive', is_default: false, isDefault: false },
  { id: 'lang_fr', code: 'fr', name: 'French', native: 'Français', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr', status: 'inactive', is_default: false, isDefault: false },
  { id: 'lang_th', code: 'th', name: 'Thai', native: 'ไทย', nativeName: 'ไทย', flag: '🇹🇭', direction: 'ltr', status: 'active', is_default: false, isDefault: false }
];

const LOCALE_METADATA: Record<string, { name: string; native: string; flag: string; direction: 'ltr' | 'rtl' }> = {
  en: { name: 'English', native: 'English', flag: '🇺🇸', direction: 'ltr' },
  th: { name: 'Thai', native: 'ไทย', flag: '🇹🇭', direction: 'ltr' },
  es: { name: 'Spanish', native: 'Español', flag: '🇪🇸', direction: 'ltr' },
  fr: { name: 'French', native: 'Français', flag: '🇫🇷', direction: 'ltr' },
  de: { name: 'German', native: 'Deutsch', flag: '🇩🇪', direction: 'ltr' },
  it: { name: 'Italian', native: 'Italiano', flag: '🇮🇹', direction: 'ltr' },
  pt: { name: 'Portuguese', native: 'Português', flag: '🇵🇹', direction: 'ltr' },
  ja: { name: 'Japanese', native: '日本語', flag: '🇯🇵', direction: 'ltr' },
  zh: { name: 'Chinese', native: '中文', flag: '🇨🇳', direction: 'ltr' },
  ko: { name: 'Korean', native: '한국어', flag: '🇰🇷', direction: 'ltr' },
  ru: { name: 'Russian', native: 'Русский', flag: '🇷🇺', direction: 'ltr' }
};

function readDiskFallback(): { languages: any[]; translations: Record<string, any> } {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(__dirname, '..', '..', '..', '..', 'data', 'admin_settings.json'),
    path.join(__dirname, '..', '..', '..', '..', 'apps', 'web', 'data', 'admin_settings.json')
  ];

  for (const fp of possiblePaths) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed) {
          return {
            languages: parsed.supportedLanguages || parsed.supported_languages || CANONICAL_LANGUAGES,
            translations: parsed.translations || {}
          };
        }
      } catch (_) {}
    }
  }
  return { languages: CANONICAL_LANGUAGES, translations: {} };
}

function normalizeLanguageList(rawList: any[]): any[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return CANONICAL_LANGUAGES;
  }

  // If rawList is an array of 10 legacy strings or empty objects, normalize or reset to canonical
  const isStringArray = typeof rawList[0] === 'string';
  if (isStringArray && rawList.length >= 10) {
    return CANONICAL_LANGUAGES;
  }

  return rawList.map((item, idx) => {
    if (typeof item === 'string') {
      const meta = LOCALE_METADATA[item.toLowerCase()] || { name: item.toUpperCase(), native: item.toUpperCase(), flag: '🌐', direction: 'ltr' };
      return {
        id: `lang_${item}`,
        code: item.toLowerCase(),
        name: meta.name,
        native: meta.native,
        nativeName: meta.native,
        flag: meta.flag,
        direction: meta.direction,
        status: item.toLowerCase() === 'en' || item.toLowerCase() === 'th' ? 'active' : 'inactive',
        is_default: item.toLowerCase() === 'en',
        isDefault: item.toLowerCase() === 'en'
      };
    }

    const code = (item.code || item.id || `lang_${idx}`).toLowerCase();
    const meta = LOCALE_METADATA[code] || { name: item.name || code.toUpperCase(), native: item.native || code.toUpperCase(), flag: item.flag || '🌐', direction: item.direction || 'ltr' };

    return {
      id: item.id || `lang_${code}`,
      code: code,
      name: item.name || meta.name,
      native: item.native || item.nativeName || meta.native,
      nativeName: item.nativeName || item.native || meta.native,
      flag: item.flag && item.flag !== '🌐' ? item.flag : meta.flag,
      direction: item.direction || meta.direction,
      status: item.status || (code === 'en' || code === 'th' ? 'active' : 'inactive'),
      is_default: Boolean(item.is_default ?? item.isDefault ?? (code === 'en')),
      isDefault: Boolean(item.isDefault ?? item.is_default ?? (code === 'en'))
    };
  });
}

export async function GET() {
  const diskData = readDiskFallback();
  let languages = CANONICAL_LANGUAGES;
  let translations: Record<string, Record<string, string>> = diskData.translations;
  let defaultLanguage = 'en';

  try {
    const adminRes: any = await query(`
      SELECT supported_languages, translations, default_language, settings 
      FROM admin_settings 
      WHERE key = 'current' OR key = 'primary_settings' OR key = 'default' OR id::text = 'primary_settings' OR id::text = '1'
      ORDER BY updated_at DESC LIMIT 1
    `);

    const rows = Array.isArray(adminRes) ? adminRes : (adminRes?.rows || []);
    if (rows && rows.length > 0) {
      const row = rows[0];
      const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});

      const rawLangs = row.supported_languages || settings?.supportedLanguages || settings?.supported_languages;
      if (rawLangs) {
        const parsed = typeof rawLangs === 'string' ? JSON.parse(rawLangs) : rawLangs;
        if (Array.isArray(parsed) && parsed.length > 0) {
          languages = normalizeLanguageList(parsed);
        }
      }

      const rawTrans = row.translations || settings?.translations;
      if (rawTrans) {
        const parsedT = typeof rawTrans === 'string' ? JSON.parse(rawTrans) : rawTrans;
        if (parsedT && typeof parsedT === 'object' && Object.keys(parsedT).length > 0) {
          translations = { ...translations, ...parsedT };
        }
      }

      if (row.default_language || settings?.defaultLanguage) {
        defaultLanguage = row.default_language || settings?.defaultLanguage;
      }
    }
  } catch (err: any) {
    console.warn('Notice reading languages from database:', err?.message || err);
  }

  // Load from app_translations if available
  try {
    const transRes: any = await query(`SELECT lang_code, dictionary FROM app_translations`);
    const transRows = Array.isArray(transRes) ? transRes : (transRes?.rows || []);
    if (transRows && transRows.length > 0) {
      transRows.forEach((r: any) => {
        if (r.lang_code && r.dictionary) {
          const dict = typeof r.dictionary === 'string' ? JSON.parse(r.dictionary) : r.dictionary;
          translations[r.lang_code] = { ...(translations[r.lang_code] || {}), ...dict };
        }
      });
    }
  } catch (_) {}

  // Fallback check
  if (languages.length === 0) {
    languages = CANONICAL_LANGUAGES;
  }

  // Auto-seed database if it was cold or empty
  if (Object.keys(translations).length === 0 && Object.keys(diskData.translations).length > 0) {
    translations = diskData.translations;
  }

  return NextResponse.json({
    success: true,
    languages,
    supportedLanguages: languages,
    translations,
    dictionaries: translations,
    defaultLanguage
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawLangs = body.supportedLanguages || body.languages || CANONICAL_LANGUAGES;
    const languages = normalizeLanguageList(rawLangs);
    const translations = body.translations || body.dictionaries || {};
    const defaultLanguage = body.defaultLanguage || body.default_language || 'en';

    // 1. Ensure tables exist in PostgreSQL
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(64) PRIMARY KEY,
          key VARCHAR(64),
          settings JSONB,
          supported_languages JSONB,
          translations JSONB,
          default_language VARCHAR(32) DEFAULT 'en',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS app_translations (
          lang_code VARCHAR(32) PRIMARY KEY,
          dictionary JSONB,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (_) {}

    // 2. Upsert admin_settings
    try {
      await query(`
        INSERT INTO admin_settings (id, key, supported_languages, translations, default_language, updated_at)
        VALUES ('primary_settings', 'current', $1, $2, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET
          supported_languages = EXCLUDED.supported_languages,
          translations = EXCLUDED.translations,
          default_language = EXCLUDED.default_language,
          updated_at = NOW();
      `, [JSON.stringify(languages), JSON.stringify(translations), String(defaultLanguage)]);
    } catch (e: any) {
      console.warn('Notice saving admin_settings:', e.message);
    }

    // 3. Upsert app_translations
    if (translations && typeof translations === 'object') {
      for (const [code, dict] of Object.entries(translations)) {
        try {
          await query(`
            INSERT INTO app_translations (lang_code, dictionary, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (lang_code) DO UPDATE SET
              dictionary = EXCLUDED.dictionary,
              updated_at = NOW();
          `, [code, JSON.stringify(dict)]);
        } catch (_) {}
      }
    }

    // 4. Update local JSON files
    for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const target = path.join(process.cwd(), rel);
      if (fs.existsSync(target)) {
        try {
          const raw = fs.readFileSync(target, 'utf-8');
          const current = JSON.parse(raw);
          current.supportedLanguages = languages;
          current.supported_languages = languages;
          current.translations = translations;
          current.defaultLanguage = defaultLanguage;
          fs.writeFileSync(target, JSON.stringify(current, null, 2), 'utf-8');
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Languages and translations synchronized successfully.',
      languages,
      supportedLanguages: languages,
      translations,
      defaultLanguage
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
