// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let isSidebarDbInitialized = false;

async function ensureSidebarSettingsTable() {
  if (isSidebarDbInitialized) return;
  try {
    const { query } = await import('@/lib/db').catch(() => ({ query: null }));
    if (typeof query === 'function') {
      await query(`
        CREATE TABLE IF NOT EXISTS user_sidebar_settings (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          user_email VARCHAR(255),
          collapsed BOOLEAN DEFAULT false,
          hidden_items JSONB DEFAULT '[]',
          pinned_items JSONB DEFAULT '[]',
          custom_order JSONB DEFAULT '[]',
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_sidebar_settings_user ON user_sidebar_settings(user_id);
      `);
      isSidebarDbInitialized = true;
    }
  } catch (err: any) {
    console.warn('[Sidebar Settings DB init notice]:', err.message);
  }
}

function getLocalSidebarSettingsPath() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'user_sidebar_settings.json');
}

function readLocalSidebarSettings(): Record<string, any> {
  try {
    const p = getLocalSidebarSettingsPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || {};
    }
  } catch (_) {}
  return {};
}

function writeLocalSidebarSettings(data: Record<string, any>) {
  try {
    const p = getLocalSidebarSettingsPath();
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) {}
}

const DEFAULT_SETTINGS = {
  collapsed: false,
  hidden_items: [],
  pinned_items: [],
  custom_order: [],
  settings: {}
};

export async function GET(request: Request) {
  try {
    await ensureSidebarSettingsTable();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim() || '';
    const email = searchParams.get('email')?.trim().toLowerCase() || '';

    // 1. Try PostgreSQL with clean parameterized SQL (No syntax errors at LIMIT)
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        let result: any = null;
        if (userId && email) {
          result = await query(
            'SELECT * FROM user_sidebar_settings WHERE user_id = $1 OR LOWER(user_email) = $2 ORDER BY updated_at DESC LIMIT 1',
            [userId, email]
          );
        } else if (userId) {
          result = await query(
            'SELECT * FROM user_sidebar_settings WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
            [userId]
          );
        } else if (email) {
          result = await query(
            'SELECT * FROM user_sidebar_settings WHERE LOWER(user_email) = $1 ORDER BY updated_at DESC LIMIT 1',
            [email]
          );
        } else {
          result = await query(
            'SELECT * FROM user_sidebar_settings ORDER BY updated_at DESC LIMIT 1'
          );
        }

        const rows = result?.rows || result || [];
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          return NextResponse.json({
            success: true,
            settings: {
              collapsed: !!row.collapsed,
              hidden_items: typeof row.hidden_items === 'string' ? JSON.parse(row.hidden_items) : (row.hidden_items || []),
              pinned_items: typeof row.pinned_items === 'string' ? JSON.parse(row.pinned_items) : (row.pinned_items || []),
              custom_order: typeof row.custom_order === 'string' ? JSON.parse(row.custom_order) : (row.custom_order || []),
              settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {})
            }
          });
        }
      }
    } catch (e: any) {
      console.warn('[Sidebar Settings GET notice]:', e.message);
    }

    // 2. Fallback to Local JSON
    const localAll = readLocalSidebarSettings();
    const localUserSetting = localAll[userId] || localAll[email] || DEFAULT_SETTINGS;

    return NextResponse.json({
      success: true,
      settings: localUserSetting
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS
    });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSidebarSettingsTable();
    const body = await request.json().catch(() => ({}));
    const { userId, email, collapsed, hidden_items, pinned_items, custom_order, settings } = body;

    const targetUserId = userId || 'usr_admin_1';
    const targetEmail = email || '';
    const recordId = `sidebar_${targetUserId}`;

    const payload = {
      collapsed: !!collapsed,
      hidden_items: Array.isArray(hidden_items) ? hidden_items : [],
      pinned_items: Array.isArray(pinned_items) ? pinned_items : [],
      custom_order: Array.isArray(custom_order) ? custom_order : [],
      settings: settings || {}
    };

    // 1. Try PostgreSQL Upsert
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(`
          INSERT INTO user_sidebar_settings (
            id, user_id, user_email, collapsed, hidden_items, pinned_items, custom_order, settings, updated_at
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            collapsed = EXCLUDED.collapsed,
            hidden_items = EXCLUDED.hidden_items,
            pinned_items = EXCLUDED.pinned_items,
            custom_order = EXCLUDED.custom_order,
            settings = EXCLUDED.settings,
            updated_at = NOW();
        `, [
          recordId,
          targetUserId,
          targetEmail,
          payload.collapsed,
          JSON.stringify(payload.hidden_items),
          JSON.stringify(payload.pinned_items),
          JSON.stringify(payload.custom_order),
          JSON.stringify(payload.settings)
        ]);
      }
    } catch (e: any) {
      console.warn('[Sidebar Settings POST notice]:', e.message);
    }

    // 2. Update Local JSON
    const localAll = readLocalSidebarSettings();
    localAll[targetUserId] = payload;
    if (targetEmail) localAll[targetEmail] = payload;
    writeLocalSidebarSettings(localAll);

    return NextResponse.json({ success: true, settings: payload });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
