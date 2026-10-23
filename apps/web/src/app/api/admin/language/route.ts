import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isDefault: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', isDefault: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', isDefault: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', isDefault: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', isDefault: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', isDefault: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', isDefault: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', isDefault: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', isDefault: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', isDefault: false },
];

async function ensureLanguageSchema() {
  try {
    await query(`
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "th"]'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(50) DEFAULT 'en';
    `);
  } catch (err: any) {
    console.warn('[admin_settings language schema notice]:', err.message);
  }
}

export async function GET() {
  await ensureLanguageSchema();
  try {
    const rows: any = await query('SELECT * FROM admin_settings LIMIT 1;').catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : (rows?.rows?.[0] || null);

    let activeLangs: any[] = DEFAULT_LANGUAGES;
    let translations: Record<string, string> = {};
    let defaultLang = 'en';

    if (row) {
      if (row.supported_languages) {
        const raw = Array.isArray(row.supported_languages) ? row.supported_languages : (typeof row.supported_languages === 'string' ? JSON.parse(row.supported_languages) : null);
        if (Array.isArray(raw)) {
          activeLangs = raw.map((c: any) => typeof c === 'string' ? (DEFAULT_LANGUAGES.find(d => d.code === c) || { code: c, name: c }) : c);
        }
      }
      if (row.translations && typeof row.translations === 'object') {
        translations = row.translations;
      }
      if (row.default_language) {
        defaultLang = row.default_language;
      }
    }

    return NextResponse.json({
      success: true,
      languages: activeLangs,
      defaultLanguage: defaultLang,
      translations,
    });
  } catch (err: any) {
    console.warn('Fallback language response:', err.message);
    return NextResponse.json({
      success: true,
      languages: DEFAULT_LANGUAGES,
      defaultLanguage: 'en',
      translations: {},
    });
  }
}

export async function POST(req: NextRequest) {
  await ensureLanguageSchema();
  try {
    const body = await req.json();
    const languages = body.languages || body.supported_languages || body.supportedLanguages;
    const defaultLanguage = body.defaultLanguage || body.default_language || 'en';
    const translations = body.translations || {};

    await query(`
      UPDATE admin_settings 
      SET 
        supported_languages = $1,
        default_language = $2,
        translations = $3,
        updated_at = NOW();
    `, [JSON.stringify(languages || DEFAULT_LANGUAGES), defaultLanguage, JSON.stringify(translations)]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
