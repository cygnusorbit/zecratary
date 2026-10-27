import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let isDbInitialized = false;

async function ensureSidebarDb() {
  if (isDbInitialized) return;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_sidebar_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure all columns exist individually before any query attempts to reference them
    const cols = [
      'id VARCHAR(255)',
      'user_id VARCHAR(255)',
      'user_email VARCHAR(255)',
      'collapsed_sections JSONB DEFAULT \'[]\'::jsonb',
      'collapsed JSONB DEFAULT \'[]\'::jsonb',
      'settings JSONB DEFAULT \'{}\'::jsonb',
      'updated_at TIMESTAMPTZ DEFAULT NOW()'
    ];

    for (const c of cols) {
      try {
        await query(`ALTER TABLE user_sidebar_settings ADD COLUMN IF NOT EXISTS ${c};`);
      } catch (_) {}
    }

    try {
      await query(`UPDATE user_sidebar_settings SET id = user_id WHERE (id IS NULL OR id = '') AND user_id IS NOT NULL;`);
      await query(`UPDATE user_sidebar_settings SET user_id = id WHERE (user_id IS NULL OR user_id = '') AND id IS NOT NULL;`);
      await query(`CREATE INDEX IF NOT EXISTS idx_user_sidebar_settings_id ON user_sidebar_settings (id);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_user_sidebar_settings_user_id ON user_sidebar_settings (user_id);`);
    } catch (_) {}

    isDbInitialized = true;
  } catch (_) {
    // Flag as initialized to prevent repeated DDL overhead
    isDbInitialized = true;
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureSidebarDb();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || searchParams.get('user_id')?.trim() || '';
    const email = searchParams.get('email')?.trim().toLowerCase() || '';

    const targetKey = userId || email || 'usr_admin_1';

    let settingsPayload: any = {
      collapsedSections: [],
      collapsed_sections: [],
      isCollapsed: false,
    };

    // 1. Try PostgreSQL & MySQL Query
    try {
      const res: any = await query(`
        SELECT * FROM user_sidebar_settings
        WHERE ($1 != '' AND (user_id::text = $1 OR id::text = $1))
           OR ($2 != '' AND LOWER(TRIM(COALESCE(user_email, ''))) = LOWER(TRIM($2)))
        ORDER BY updated_at DESC
        LIMIT 1;
      `, [userId, email]);

      const row = (Array.isArray(res) ? res[0] : (res as any)?.rows?.[0]);
      if (row) {
        let sections = row.collapsed_sections || row.collapsed || [];
        if (typeof sections === 'string') {
          try { sections = JSON.parse(sections); } catch (_) { sections = []; }
        }

        let customSettings = row.settings || {};
        if (typeof customSettings === 'string') {
          try { customSettings = JSON.parse(customSettings); } catch (_) { customSettings = {}; }
        }

        settingsPayload = {
          ...customSettings,
          collapsedSections: sections,
          collapsed_sections: sections,
          userId: row.user_id || row.id || targetKey,
        };

        return NextResponse.json({
          success: true,
          settings: settingsPayload,
          collapsedSections: sections,
          collapsed_sections: sections,
        });
      }
    } catch (_) {}

    // 2. Fallback to Local JSON Storage
    const jsonPaths = [
      path.join(process.cwd(), 'apps', 'web', 'data', 'user_sidebar_settings.json'),
      path.join(process.cwd(), 'data', 'user_sidebar_settings.json'),
    ];

    for (const jp of jsonPaths) {
      if (fs.existsSync(jp)) {
        try {
          const raw = JSON.parse(fs.readFileSync(jp, 'utf8'));
          if (raw && (raw[targetKey] || raw['default'])) {
            const data = raw[targetKey] || raw['default'];
            return NextResponse.json({
              success: true,
              settings: data,
              collapsedSections: data.collapsedSections || data.collapsed_sections || [],
              collapsed_sections: data.collapsedSections || data.collapsed_sections || [],
            });
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      settings: settingsPayload,
      collapsedSections: [],
      collapsed_sections: [],
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      settings: { collapsedSections: [], collapsed_sections: [] },
      collapsedSections: [],
      collapsed_sections: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSidebarDb();
    const body = await req.json();
    const userId = body.userId || body.user_id || 'usr_admin_1';
    const email = body.email || body.userEmail || '';

    const collapsedSections = Array.isArray(body.collapsedSections)
      ? body.collapsedSections
      : Array.isArray(body.collapsed_sections)
        ? body.collapsed_sections
        : [];

    const customSettings = typeof body.settings === 'object' && body.settings !== null
      ? body.settings
      : {};

    const safeSectionsJson = JSON.stringify(collapsedSections);
    const safeSettingsJson = JSON.stringify(customSettings);

    // 1. Resilient Update-Then-Insert (works regardless of table primary key configuration)
    try {
      const updateRes: any = await query(`
        UPDATE user_sidebar_settings
        SET collapsed_sections = $1::jsonb,
            collapsed = $1::jsonb,
            settings = $2::jsonb,
            user_email = COALESCE(NULLIF($3, ''), user_email),
            updated_at = NOW()
        WHERE user_id = $4 OR id = $4;
      `, [safeSectionsJson, safeSettingsJson, email, userId]);

      const updatedCount = Array.isArray(updateRes) ? updateRes.length : (updateRes?.rowCount || 0);

      if (updatedCount === 0) {
        await query(`
          INSERT INTO user_sidebar_settings (id, user_id, user_email, collapsed_sections, collapsed, settings, updated_at)
          VALUES ($1, $1, $2, $3::jsonb, $3::jsonb, $4::jsonb, NOW());
        `, [userId, email, safeSectionsJson, safeSettingsJson]);
      }
    } catch (_) {}

    // 2. Mirror to Local JSON Cache
    const jsonPaths = [
      path.join(process.cwd(), 'apps', 'web', 'data', 'user_sidebar_settings.json'),
      path.join(process.cwd(), 'data', 'user_sidebar_settings.json'),
    ];

    for (const jp of jsonPaths) {
      try {
        const dir = path.dirname(jp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let current: any = {};
        if (fs.existsSync(jp)) {
          try { current = JSON.parse(fs.readFileSync(jp, 'utf8')); } catch (_) {}
        }
        current[userId] = {
          userId,
          email,
          collapsedSections,
          collapsed_sections: collapsedSections,
          ...customSettings,
          updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(jp, JSON.stringify(current, null, 2), 'utf8');
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      userId,
      collapsedSections,
      collapsed_sections: collapsedSections,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
