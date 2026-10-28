import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', direction: 'ltr', status: 'active', isDefault: true },
  { code: 'th', name: 'Thai', native: 'ไทย', nativeName: 'ไทย', flag: '🇹🇭', dir: 'ltr', direction: 'ltr', status: 'active', isDefault: false },
  { code: 'es', name: 'Spanish', native: 'Español', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', direction: 'ltr', status: 'active', isDefault: false },
  { code: 'fr', name: 'French', native: 'Français', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', direction: 'ltr', status: 'active', isDefault: false }
];

function normalizeLangList(list: any[]): any[] {
  if (!Array.isArray(list)) return DEFAULT_LANGUAGES;
  return list.map(item => {
    const nativeVal = item.native || item.nativeName || item.name || '';
    const dirVal = item.dir || item.direction || 'ltr';
    return {
      ...item,
      native: nativeVal,
      nativeName: nativeVal,
      dir: dirVal,
      direction: dirVal,
      status: item.status || 'active',
      isDefault: !!item.isDefault
    };
  });
}

function getPool() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) return null;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cleanConn = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  return new Pool({ connectionString: cleanConn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
}

export async function GET() {
  let supportedLanguages = DEFAULT_LANGUAGES;
  let translations: Record<string, any> = {};
  let defaultLanguage = 'en';

  // 1. Try PostgreSQL
  const pool = getPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query("SELECT supported_languages, translations, default_language FROM admin_settings WHERE id::text = 'primary_settings' OR id::text = '1' OR id::text = 'current' LIMIT 1;");
        if (res.rows?.[0]) {
          const row = res.rows[0];
          if (row.supported_languages) {
            const parsed = typeof row.supported_languages === 'string' ? JSON.parse(row.supported_languages) : row.supported_languages;
            supportedLanguages = normalizeLangList(parsed);
          }
          if (row.translations) {
            translations = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
          }
          if (row.default_language) defaultLanguage = row.default_language;
        }
      } finally {
        client.release();
        await pool.end();
      }
    } catch (e) {
      console.warn('API Languages DB read notice:', e);
    }
  }

  // 2. Read from local JSON fallback if empty
  if (Object.keys(translations).length === 0) {
    for (const f of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const p = path.join(process.cwd(), f);
      if (fs.existsSync(p)) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (data.translations) translations = { ...translations, ...data.translations };
          if (data.supportedLanguages && supportedLanguages === DEFAULT_LANGUAGES) {
            supportedLanguages = normalizeLangList(data.supportedLanguages);
          }
          if (data.defaultLanguage) defaultLanguage = data.defaultLanguage;
        } catch (_) {}
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
    const { supportedLanguages, translations, defaultLanguage, code, name, dictionary } = body;

    let targetLangs = supportedLanguages ? normalizeLangList(supportedLanguages) : null;
    let targetTranslations = translations || null;

    // Handle legacy single-dictionary additions { code, name, dictionary }
    if (code && dictionary) {
      targetTranslations = { ...(targetTranslations || {}), [code]: dictionary };
    }

    // 1. Dual write to JSON stores
    for (const f of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const p = path.join(process.cwd(), f);
      os_mkdir(path.dirname(p));
      let existing: any = {};
      if (fs.existsSync(p)) {
        try {
          existing = JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (_) { existing = {}; }
      }
      if (targetLangs) existing.supportedLanguages = targetLangs;
      if (targetTranslations) existing.translations = { ...(existing.translations || {}), ...targetTranslations };
      if (defaultLanguage) existing.defaultLanguage = defaultLanguage;
      existing.lastUpdated = new Date().toISOString();
      fs.writeFileSync(p, JSON.stringify(existing, null, 2), 'utf8');
    }

    // 2. Persist to PostgreSQL
    const pool = getPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(`
            INSERT INTO admin_settings (id, supported_languages, translations, default_language, updated_at)
            VALUES ('primary_settings', $1::jsonb, $2::jsonb, $3, NOW())
            ON CONFLICT (id) DO UPDATE SET
              supported_languages = COALESCE(EXCLUDED.supported_languages, admin_settings.supported_languages),
              translations = COALESCE(EXCLUDED.translations, admin_settings.translations),
              default_language = COALESCE(EXCLUDED.default_language, admin_settings.default_language),
              updated_at = NOW();
          `, [
            JSON.stringify(targetLangs || DEFAULT_LANGUAGES),
            JSON.stringify(targetTranslations || {}),
            defaultLanguage || 'en'
          ]);

          if (code && dictionary) {
            await client.query(`
              INSERT INTO app_translations (lang_code, dictionary, updated_at)
              VALUES ($1, $2::jsonb, NOW())
              ON CONFLICT (lang_code) DO UPDATE SET
                dictionary = EXCLUDED.dictionary,
                updated_at = NOW();
            `, [code, JSON.stringify(dictionary)]);
          }
        } finally {
          client.release();
          await pool.end();
        }
      } catch (dbErr) {
        console.warn('API Languages DB write notice:', dbErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { code } = await req.json();
    if (!code || code === 'en') {
      return NextResponse.json({ success: false, error: 'Cannot delete baseline locale' }, { status: 400 });
    }

    for (const f of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const p = path.join(process.cwd(), f);
      if (fs.existsSync(p)) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (Array.isArray(data.supportedLanguages)) {
            data.supportedLanguages = data.supportedLanguages.filter((l: any) => l.code !== code);
          }
          if (data.translations && data.translations[code]) {
            delete data.translations[code];
          }
          fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
        } catch (_) {}
      }
    }

    const pool = getPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query("DELETE FROM app_translations WHERE lang_code = $1", [code]);
        } finally {
          client.release();
          await pool.end();
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: `Locale ${code} deleted.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function os_mkdir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
