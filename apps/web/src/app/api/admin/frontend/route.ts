import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
  aboutText: 'Zecratary is an autonomous culinary intelligence platform designed for intelligent recipe management, meal planning, and nutrition telemetry.',
  copyrightText: '© 2026 Zecratary Inc. All rights reserved.',
  columns: [
    {
      title: 'Platform',
      links: [
        { label: 'AI Assistant', url: '/chef' },
        { label: 'Recipe Library', url: '/saved' },
        { label: 'Cookbooks', url: '/books' },
        { label: 'Meal Planner', url: '/planner' },
      ],
    },
    {
      title: 'Finance & Quotas',
      links: [
        { label: 'Token Portal', url: '/token' },
        { label: 'Store Wallet', url: '/wallet' },
        { label: 'Subscription Plans', url: '/subscriptions' },
        { label: 'Billing History', url: '/billing' },
      ],
    },
  ],
  socials: {
    twitter: 'https://twitter.com',
    github: 'https://github.com/cygnusorbit/zecratary',
    discord: 'https://discord.com',
  },
};

const DEFAULT_HOME_ELEMENTS = [
  {
    id: 'elem_hero_title',
    type: 'title',
    title: 'Autonomous Culinary Planning & Intelligence',
    subtitle: 'Plan gourmet meals, track pantry macros, scale recipes, and command Chef AI with production-grade telemetry.',
    level: 'h1',
    align: 'center',
  },
  {
    id: 'elem_community_recipes',
    type: 'recipe',
    title: 'Featured Culinary Dishes',
    subtitle: 'Explore community-tested dishes with dynamic serving scaling and nutritional breakdowns.',
    gridDensity: '3x3',
    itemsPerPage: 6,
    showServings: true,
    showPrepTime: true,
  },
  {
    id: 'elem_plans_showcase',
    type: 'subscription',
    title: 'Subscription Tiers & AI Quotas',
    subtitle: 'Choose the ideal culinary quota for home cooks, meal prep pros, and commercial kitchens.',
    planBillingInterval: 'monthly',
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
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';

      -- Ensure default homepage exists with complete structure
      INSERT INTO frontend_pages (
        id, title, slug, description, content, status, is_default, show_in_nav, show_in_footer, order_index, elements, padding, footer
      )
      VALUES (
        'page_home',
        'Home',
        'home',
        'Zecratary Autonomous Culinary Planning Platform',
        'Welcome to Zecratary Culinary Intelligence',
        'published',
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
    console.warn('[frontend_pages schema notice]:', err.message);
  }
}

export async function GET(req: NextRequest) {
  await ensureFrontendPagesTable();
  const url = new URL(req.url);

  // Return community recipes for the Recipe Grid element
  if (url.searchParams.get('all_recipes') === 'true') {
    try {
      const recipes: any = await query(`
        SELECT id, title, description, image, prep_time, cook_time, servings, is_favorite, tags 
        FROM saved_recipes 
        ORDER BY created_at DESC 
        LIMIT 50;
      `).catch(() => []);
      const list = Array.isArray(recipes) ? recipes : (recipes?.rows || []);
      return NextResponse.json(
        { success: true, recipes: list },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    } catch (_) {
      return NextResponse.json(
        { success: true, recipes: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }
  }

  try {
    const rows: any = await query('SELECT * FROM frontend_pages ORDER BY order_index ASC, created_at ASC;');
    const pages = Array.isArray(rows) ? rows : (rows?.rows || []);

    const sanitizedPages = pages.map((p: any) => {
      let elementsArray: any[] = [];
      if (Array.isArray(p.elements)) {
        elementsArray = p.elements;
      } else if (typeof p.elements === 'string' && p.elements.trim()) {
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
        slug: p.slug || 'untitled',
        description: p.description || '',
        content: p.content || '',
        status: p.status || 'published',
        is_default: Boolean(p.is_default),
        show_in_nav: p.show_in_nav !== false,
        show_in_footer: p.show_in_footer !== false,
        order_index: p.order_index || 0,
        elements: Array.isArray(elementsArray) ? elementsArray : [],
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
    console.error('Error fetching frontend pages:', err.message);
    return NextResponse.json(
      {
        success: true,
        pages: [
          {
            id: 'page_home',
            title: 'Home',
            slug: 'home',
            description: 'Zecratary Autonomous Culinary Planning',
            content: '',
            status: 'published',
            is_default: true,
            show_in_nav: true,
            show_in_footer: true,
            order_index: 1,
            elements: DEFAULT_HOME_ELEMENTS,
            padding: DEFAULT_PADDING,
            footer: DEFAULT_FOOTER,
          },
        ],
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

export async function POST(req: NextRequest) {
  await ensureFrontendPagesTable();
  try {
    const body = await req.json();
    const action = body.action;

    // 1. Action: set_default (Designate Homepage)
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

    // 2. Action: delete_page
    if (action === 'delete_page') {
      const pageId = body.id || body.pageId;
      if (!pageId) {
        return NextResponse.json({ success: false, error: 'Page ID required' }, { status: 400 });
      }
      // Protect default homepage from deletion
      const check = await query('SELECT is_default, slug FROM frontend_pages WHERE id = $1;', [pageId]);
      const target = Array.isArray(check) ? check[0] : check?.rows?.[0];
      if (target?.is_default || target?.slug === 'home') {
        return NextResponse.json({ success: false, error: 'Cannot delete the active default homepage' }, { status: 400 });
      }
      await query('DELETE FROM frontend_pages WHERE id = $1;', [pageId]);
      return NextResponse.json({ success: true, message: 'Page deleted successfully' });
    }

    // 3. Action: save_page (or direct upsert)
    const pageData = body.page || body;
    const id = pageData.id || ('page_' + Date.now().toString(36));
    const title = pageData.title || 'Untitled Page';
    const slug = (pageData.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const description = pageData.description || '';
    const content = pageData.content || '';
    const status = pageData.status || 'published';
    const isDefault = Boolean(pageData.is_default);
    const showInNav = pageData.show_in_nav !== false;
    const showInFooter = pageData.show_in_footer !== false;
    const orderIndex = Number(pageData.order_index) || 0;

    const elementsJson = JSON.stringify(Array.isArray(pageData.elements) ? pageData.elements : []);
    const paddingJson = JSON.stringify(pageData.padding || DEFAULT_PADDING);
    const footerJson = JSON.stringify(pageData.footer || DEFAULT_FOOTER);

    // If marked default, clear default flag on all other pages
    if (isDefault) {
      await query('UPDATE frontend_pages SET is_default = false WHERE id != $1 AND slug != $2;', [id, slug]);
    }

    await query(`
      INSERT INTO frontend_pages (
        id, title, slug, description, content, status, is_default, show_in_nav, show_in_footer, order_index, elements, padding, footer, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        content = EXCLUDED.content,
        status = EXCLUDED.status,
        is_default = EXCLUDED.is_default,
        show_in_nav = EXCLUDED.show_in_nav,
        show_in_footer = EXCLUDED.show_in_footer,
        order_index = EXCLUDED.order_index,
        elements = EXCLUDED.elements,
        padding = EXCLUDED.padding,
        footer = EXCLUDED.footer,
        updated_at = NOW();
    `, [
      id, title, slug, description, content, status, isDefault, 
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
        show_in_nav: showInNav,
        show_in_footer: showInFooter,
        order_index: orderIndex,
        elements: pageData.elements || [],
        padding: pageData.padding || DEFAULT_PADDING,
        footer: pageData.footer || DEFAULT_FOOTER,
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/frontend:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
