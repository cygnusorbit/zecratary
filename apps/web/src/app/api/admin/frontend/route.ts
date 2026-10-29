import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';


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
export const revalidate = 0;

const DEFAULT_PADDING = {
  top: '2.5rem',
  bottom: '4rem',
  left: '1.5rem',
  right: '1.5rem',
  x: '1.5rem',
  maxWidth: 'max-w-7xl',
};

const DEFAULT_FOOTER = {
  enabled: true,
  aboutText: 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
  copyrightText: '© 2026 Zecratary Inc. All rights reserved.',
  columns: [
    {
      id: 'col_platform',
      title: 'Platform',
      links: [
        { id: 'l_1', label: 'AI Chef', url: '/chef' },
        { id: 'l_2', label: 'Saved Recipes', url: '/saved' },
        { id: 'l_3', label: 'Meal Planner', url: '/planner' },
      ],
    },
    {
      id: 'col_company',
      title: 'Company',
      links: [
        { id: 'l_4', label: 'About Us', url: '/about' },
        { id: 'l_5', label: 'Subscription Plans', url: '/subscriptions' },
        { id: 'l_6', label: 'Token Portal', url: '/token' },
      ],
    },
  ],
  socials: {
    twitter: 'https://x.com',
    github: 'https://github.com/cygnusorbit/zecratary',
    discord: 'https://discord.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
  },
  bgColor: 'var(--color-card, #0b0f17)',
  textColor: 'var(--color-text, #f1f5f9)',
  borderColor: 'var(--color-border, #1e293b)',
  accentColor: 'var(--color-primary, #E05638)',
};

const DEFAULT_HOME_ELEMENTS = [
  {
    id: 'elem_hero_title',
    type: 'title',
    title: 'Autonomous Culinary Intelligence & Precision Meal Planning',
    subtitle: 'Plan gourmet meals, track pantry macros, scale recipes, and command Chef AI with production-grade telemetry.',
    level: 'h1',
    alignment: 'center',
    accentColor: 'var(--color-primary, #E05638)',
  },
  {
    id: 'elem_recipes_grid',
    type: 'recipe',
    title: 'Featured Culinary Dishes',
    subtitle: 'Explore community-tested dishes with dynamic serving scaling and nutritional breakdowns.',
    recipeGridDensity: 3,
    recipeLimit: 6,
    recipeCategoryFilter: 'all',
    buttonText: 'Cook with AI Chef',
    buttonUrl: '/chef',
    bgColor: 'transparent',
    borderColor: 'var(--color-border, #1e293b)',
    accentColor: 'var(--color-primary, #E05638)',
  },
  {
    id: 'elem_features_grid',
    type: 'column',
    title: 'Engineered for Peak Nutrition',
    columnsCount: 3,
    columns: [
      { id: 'col_1', title: 'Smart AI Chef', content: 'Generate tailored culinary creations based exclusively on ingredients currently available in your pantry.' },
      { id: 'col_2', title: 'Real-time Macro Breakdown', content: 'Track calories, protein, carbs, and micronutrient ratios seamlessly across all scheduled meals.' },
      { id: 'col_3', title: 'Zero Food Waste', content: 'Intelligent shelf-life monitors proactively notify you when stored groceries approach expiration.' },
    ],
    accentColor: 'var(--color-primary, #E05638)',
  },
  {
    id: 'elem_plans_catalog',
    type: 'subscription',
    title: 'Subscription Tiers & AI Quotas',
    subtitle: 'Choose the ideal culinary quota for home cooks, meal prep pros, and commercial kitchens.',
    planSlug: 'all',
    planBillingInterval: 'MONTH',
    planShowTokens: true,
    planShowAiModels: true,
    planCtaText: 'Choose Plan',
    planCtaUrl: '/subscriptions',
    bgColor: 'var(--color-card, #0b0f17)',
    borderColor: 'var(--color-border, #1e293b)',
    accentColor: 'var(--color-primary, #E05638)',
  },
];

async function ensureFrontendPagesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS frontend_pages (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        content TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'published',
        is_default BOOLEAN DEFAULT false,
        is_published BOOLEAN DEFAULT true,
        show_in_nav BOOLEAN DEFAULT true,
        show_in_footer BOOLEAN DEFAULT true,
        order_index INT DEFAULT 0,
        elements JSONB DEFAULT '[]'::jsonb,
        padding JSONB DEFAULT '{"top":"2.5rem","bottom":"4rem","left":"1.5rem","right":"1.5rem","maxWidth":"max-w-7xl"}'::jsonb,
        footer JSONB DEFAULT '{"enabled":true}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS elements JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS padding JSONB DEFAULT '{"top":"2.5rem","bottom":"4rem","left":"1.5rem","right":"1.5rem","maxWidth":"max-w-7xl"}'::jsonb;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS footer JSONB DEFAULT '{"enabled":true}'::jsonb;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';

      INSERT INTO frontend_pages (
        id, title, slug, description, content, status, is_default, is_published, show_in_nav, show_in_footer, order_index, elements, padding, footer
      )
      VALUES (
        'page_home',
        'Home',
        '/',
        'Zecratary Autonomous Culinary Planning Platform',
        'Welcome to Zecratary Culinary Intelligence',
        'published',
        true,
        true,
        true,
        true,
        1,
        $1::jsonb,
        $2::jsonb,
        $3::jsonb
      )
      ON CONFLICT (slug) DO UPDATE SET
        is_default = true,
        elements = CASE WHEN frontend_pages.elements IS NULL OR frontend_pages.elements = '[]'::jsonb THEN EXCLUDED.elements ELSE frontend_pages.elements END,
        padding = CASE WHEN frontend_pages.padding IS NULL THEN EXCLUDED.padding ELSE frontend_pages.padding END,
        footer = CASE WHEN frontend_pages.footer IS NULL THEN EXCLUDED.footer ELSE frontend_pages.footer END;
    `, [JSON.stringify(DEFAULT_HOME_ELEMENTS), JSON.stringify(DEFAULT_PADDING), JSON.stringify(DEFAULT_FOOTER)]);
  } catch (err: any) {
    // MySQL compatibility fallback
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS frontend_pages (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          content TEXT,
          status VARCHAR(50) DEFAULT 'published',
          is_default BOOLEAN DEFAULT false,
          is_published BOOLEAN DEFAULT true,
          show_in_nav BOOLEAN DEFAULT true,
          show_in_footer BOOLEAN DEFAULT true,
          order_index INT DEFAULT 0,
          elements JSON,
          padding JSON,
          footer JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);
    } catch (_) {}
  }
}

export async function GET(req: NextRequest) {
  await ensureFrontendPagesTable();
  const url = new URL(req.url);

  if (url.searchParams.get('all_recipes') === 'true' || url.searchParams.get('recipes') === 'true') {
    try {
      const recipes: any = await query(`
        SELECT id, user_id, title, description, image, image_url, prep_time, cook_time, servings, calories, rating, is_favorite, is_cooked, ingredients, directions, instructions, source_url, category, recipe_type, created_at 
        FROM saved_recipes 
        ORDER BY created_at DESC 
        LIMIT 60;
      `).catch(() => []);
      const list = (Array.isArray(recipes) ? recipes : (((recipes as any)?.rows) || []));
      return NextResponse.json(
        { success: true, recipes: list },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    } catch (_) {
      return NextResponse.json({ success: true, recipes: [] });
    }
  }

  try {
    const rows: any = await query('SELECT * FROM frontend_pages ORDER BY is_default DESC, order_index ASC, created_at ASC;');
    const pages = (Array.isArray(rows) ? rows : (((rows as any)?.rows) || []));

    const sanitizedPages = pages.map((p: any) => {
      let elementsArray: any[] = [];
      if (Array.isArray(p.elements)) elementsArray = p.elements;
      else if (typeof p.elements === 'string' && p.elements.trim()) {
        try { elementsArray = JSON.parse(p.elements); } catch (_) {}
      }

      let paddingObj: any = DEFAULT_PADDING;
      if (p.padding && typeof p.padding === 'object' && !Array.isArray(p.padding)) {
        paddingObj = { ...DEFAULT_PADDING, ...p.padding };
      } else if (typeof p.padding === 'string' && p.padding.trim()) {
        try { paddingObj = { ...DEFAULT_PADDING, ...JSON.parse(p.padding) }; } catch (_) {}
      }

      let footerObj: any = DEFAULT_FOOTER;
      if (p.footer && typeof p.footer === 'object' && !Array.isArray(p.footer)) {
        footerObj = { ...DEFAULT_FOOTER, ...p.footer };
      } else if (typeof p.footer === 'string' && p.footer.trim()) {
        try { footerObj = { ...DEFAULT_FOOTER, ...JSON.parse(p.footer) }; } catch (_) {}
      }

      return {
        id: p.id,
        title: p.title || 'Untitled Page',
        slug: p.slug || '/',
        description: p.description || '',
        content: p.content || '',
        status: p.status || 'published',
        is_default: Boolean(p.is_default),
        is_published: p.is_published !== undefined ? Boolean(p.is_published) : true,
        show_in_nav: p.show_in_nav !== false,
        show_in_footer: p.show_in_footer !== false,
        order_index: p.order_index || 0,
        elements: elementsArray,
        padding: paddingObj,
        footer: footerObj,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    return NextResponse.json(
      { success: true, pages: sanitizedPages },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureFrontendPagesTable();
  try {
    const body = await req.json();
    const action = body.action;

    // Action 1: set_default
    if (action === 'set_default' || action === 'set_default_page') {
      const pageId = body.id || body.pageId;
      const slug = body.slug;
      if (!pageId && !slug) {
        return NextResponse.json({ success: false, error: 'Page ID or slug required' }, { status: 400 });
      }
      await query('UPDATE frontend_pages SET is_default = false;');
      if (pageId) {
        await query('UPDATE frontend_pages SET is_default = true, updated_at = NOW() WHERE id = $1;', [pageId]);
      } else {
        await query('UPDATE frontend_pages SET is_default = true, updated_at = NOW() WHERE slug = $1;', [slug]);
      }
      return NextResponse.json({ success: true, message: 'Default homepage set successfully' });
    }

    // Action 2: delete_page
    if (action === 'delete_page') {
      const pageId = body.id || body.pageId;
      if (!pageId) {
        return NextResponse.json({ success: false, error: 'Page ID required' }, { status: 400 });
      }
      const check: any = await query('SELECT is_default, slug FROM frontend_pages WHERE id = $1;', [pageId]);
      const target = (Array.isArray(check) ? check[0] : (check as any)?.rows?.[0]);
      if (target?.is_default || target?.slug === '/' || target?.slug === 'home') {
        return NextResponse.json({ success: false, error: 'Cannot delete the active default homepage' }, { status: 400 });
      }
      await query('DELETE FROM frontend_pages WHERE id = $1;', [pageId]);
      return NextResponse.json({ success: true, message: 'Page deleted successfully' });
    }

    // Action 3: save_page
    const pageData = body.page || body;
    const id = pageData.id || ('page_' + Date.now().toString(36));
    const title = pageData.title || 'Untitled Page';
    let slug = pageData.slug ? pageData.slug.trim() : '/';
    if (!slug.startsWith('/') && slug !== 'home') slug = `/${slug}`;
    const description = pageData.description || '';
    const content = pageData.content || '';
    const status = pageData.status || 'published';
    const isDefault = Boolean(pageData.is_default);
    const isPublished = pageData.is_published !== undefined ? Boolean(pageData.is_published) : true;
    const showInNav = pageData.show_in_nav !== false;
    const showInFooter = pageData.show_in_footer !== false;
    const orderIndex = Number(pageData.order_index) || 0;

    const elementsJson = JSON.stringify(Array.isArray(pageData.elements) ? pageData.elements : []);
    const paddingJson = JSON.stringify(pageData.padding || DEFAULT_PADDING);
    const footerJson = JSON.stringify(pageData.footer || DEFAULT_FOOTER);

    if (isDefault) {
      await query('UPDATE frontend_pages SET is_default = false WHERE id != $1 AND slug != $2;', [id, slug]);
    }

    await query(`
      INSERT INTO frontend_pages (
        id, title, slug, description, content, status, is_default, is_published, show_in_nav, show_in_footer, order_index, elements, padding, footer, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        content = EXCLUDED.content,
        status = EXCLUDED.status,
        is_default = EXCLUDED.is_default,
        is_published = EXCLUDED.is_published,
        show_in_nav = EXCLUDED.show_in_nav,
        show_in_footer = EXCLUDED.show_in_footer,
        order_index = EXCLUDED.order_index,
        elements = EXCLUDED.elements,
        padding = EXCLUDED.padding,
        footer = EXCLUDED.footer,
        updated_at = NOW();
    `, [
      id, title, slug, description, content, status, isDefault, isPublished,
      showInNav, showInFooter, orderIndex, elementsJson, paddingJson, footerJson
    ]);

    return NextResponse.json({
      success: true,
      page: {
        id,
        title,
        slug,
        description,
        content,
        status,
        is_default: isDefault,
        is_published: isPublished,
        show_in_nav: showInNav,
        show_in_footer: showInFooter,
        order_index: orderIndex,
        elements: pageData.elements || [],
        padding: pageData.padding || DEFAULT_PADDING,
        footer: pageData.footer || DEFAULT_FOOTER,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
