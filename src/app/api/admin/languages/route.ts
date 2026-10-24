import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_LANGUAGES = [
  { id: 'lang_en', code: 'en', name: 'English', flag: '🇺🇸', direction: 'ltr', status: 'active', is_default: true },
  { id: 'lang_es', code: 'es', name: 'Español', flag: '🇪🇸', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_fr', code: 'fr', name: 'Français', flag: '🇫🇷', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_th', code: 'th', name: 'ภาษาไทย (Thai)', flag: '🇹🇭', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_de', code: 'de', name: 'Deutsch', flag: '🇩🇪', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_it', code: 'it', name: 'Italiano', flag: '🇮🇹', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_ja', code: 'ja', name: '日本語', flag: '🇯🇵', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_zh', code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_ko', code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_pt', code: 'pt', name: 'Português', flag: '🇵🇹', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_ru', code: 'ru', name: 'Русский', flag: '🇷🇺', direction: 'ltr', status: 'active', is_default: false },
  { id: 'lang_ar', code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦', direction: 'rtl', status: 'active', is_default: false }
];

export async function GET() {
  try {
    const res: any = await query(`
      SELECT supported_languages, translations FROM admin_settings 
      WHERE id = 'primary_settings' OR id = '1' 
      ORDER BY updated_at DESC LIMIT 1;
    `);
    const row = Array.isArray(res) ? res[0] : res?.rows?.[0];

    let languages = DEFAULT_LANGUAGES;
    let translations = {};

    if (row) {
      if (row.supported_languages) {
        const parsed = typeof row.supported_languages === 'string'
          ? JSON.parse(row.supported_languages)
          : row.supported_languages;
        if (Array.isArray(parsed) && parsed.length > 0) languages = parsed;
      }
      if (row.translations) {
        translations = typeof row.translations === 'string'
          ? JSON.parse(row.translations)
          : row.translations;
      }
    }

    return NextResponse.json(
      { success: true, languages, translations },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: true, languages: DEFAULT_LANGUAGES, translations: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const languages = Array.isArray(body) ? body : (body.languages || body.supportedLanguages);
    const translations = body.translations;

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (Array.isArray(languages)) {
      updates.push(`supported_languages = $${pIdx}::jsonb`);
      params.push(JSON.stringify(languages));
      pIdx++;
    }

    if (translations && typeof translations === 'object') {
      updates.push(`translations = $${pIdx}::jsonb`);
      params.push(JSON.stringify(translations));
      pIdx++;
    }

    if (updates.length > 0) {
      await query(`
        INSERT INTO admin_settings (id, updated_at)
        VALUES ('primary_settings', NOW())
        ON CONFLICT (id) DO UPDATE SET
          ${updates.join(', ')},
          updated_at = NOW();
      `, params);
    }

    return NextResponse.json({ success: true, message: 'Languages & translations updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
