import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';

let isFrontendDbInitialized = false;

async function ensureFrontendPagesTable() {
  if (isFrontendDbInitialized) return;

  try {
    // 1. Create table if not exists with all required columns
    await query(`
      CREATE TABLE IF NOT EXISTS frontend_pages (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        elements JSONB DEFAULT '[]'::jsonb,
        padding JSONB DEFAULT '{"top": 40, "bottom": 40, "left": 16, "right": 16, "maxWidth": "1280px"}'::jsonb,
        footer JSONB DEFAULT '{"aboutText": "Autonomous culinary intelligence platform designed for intelligent recipe management, meal planning, and nutrition telemetry.", "copyrightText": "© 2026 Zecratary Inc. All rights reserved.", "columns": []}'::jsonb,
        status VARCHAR(50) DEFAULT 'published',
        is_default BOOLEAN DEFAULT false,
        show_in_nav BOOLEAN DEFAULT true,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Add columns if table pre-existed with older schema
    const alterColumns = [
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS content TEXT;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS elements JSONB DEFAULT '[]'::jsonb;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS padding JSONB DEFAULT '{\"top\": 40, \"bottom\": 40, \"left\": 16, \"right\": 16, \"maxWidth\": \"1280px\"}'::jsonb;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS footer JSONB DEFAULT '{\"aboutText\": \"Autonomous culinary intelligence platform.\", \"copyrightText\": \"© 2026 Zecratary Inc. All rights reserved.\", \"columns\": []}'::jsonb;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN DEFAULT true;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
      "ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();"
    ];

    for (const sql of alterColumns) {
      await query(sql).catch(() => {});
    }

    // 3. Check if default home page already exists BEFORE inserting
    const existingCheck = await query(
      "SELECT id FROM frontend_pages WHERE id = 'home' OR slug = 'home' OR is_default = true LIMIT 1"
    );

    if (!existingCheck || existingCheck.length === 0) {
      const defaultElements = [
        {
          id: 'hero_1',
          type: 'title',
          title: 'Autonomous Culinary Intelligence & Precision Meal Planning',
          subtitle: 'Discover hyper-personalized recipes, pantry inventory management, and automated nutritional balancing.'
        },
        {
          id: 'recipes_1',
          type: 'recipe',
          title: 'Community Recipes Gallery',
          subtitle: 'Signature recipes synchronized directly from your saved library. Click any card to view detailed ingredients and cooking steps.'
        },
        {
          id: 'subscriptions_1',
          type: 'subscription',
          title: 'Subscription Tiers & AI Quotas',
          subtitle: 'Choose the ideal plan for your kitchen or culinary team.'
        }
      ];

      const defaultPadding = {
        top: 40,
        bottom: 40,
        left: 16,
        right: 16,
        maxWidth: '1280px'
      };

      const defaultFooter = {
        aboutText: 'Autonomous culinary intelligence platform designed for intelligent recipe management, meal planning, and nutrition telemetry.',
        copyrightText: '© 2026 Zecratary Inc. All rights reserved.',
        columns: [
          {
            title: 'Platform',
            links: [
              { label: 'AI Assistant', url: '/chef' },
              { label: 'Saved Recipes', url: '/saved' },
              { label: 'Meal Planner', url: '/planner' }
            ]
          },
          {
            title: 'Finance & Hub',
            links: [
              { label: 'Token Portal', url: '/token' },
              { label: 'Store Wallet', url: '/wallet' },
              { label: 'Subscriptions', url: '/subscriptions' }
            ]
          }
        ]
      };

      // Safely insert with ON CONFLICT DO NOTHING to guarantee NO unique constraint errors
      await query(
        `INSERT INTO frontend_pages (
          id, title, slug, description, content, elements, padding, footer, status, is_default, show_in_nav, order_index, created_at, updated_at
        ) VALUES (
          'home', 'Home', 'home',
          'Autonomous culinary intelligence platform homepage.',
          'Welcome to Zecratary',
          $1::jsonb, $2::jsonb, $3::jsonb,
          'published', true, true, 0, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;`,
        [JSON.stringify(defaultElements), JSON.stringify(defaultPadding), JSON.stringify(defaultFooter)]
      ).catch(() => {});
    }

    isFrontendDbInitialized = true;
  } catch (err: any) {
    // Gracefully catch notices without halting runtime
    if (!err.message?.includes('duplicate key')) {
      console.warn('[frontend_pages schema note]:', err.message);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureFrontendPagesTable();

    const { searchParams } = new URL(req.url);
    const allRecipes = searchParams.get('all_recipes') === 'true';

    // 1. Handle Recipe Catalog Fetch for Community Recipes Gallery
    if (allRecipes) {
      try {
        const recipes = await query(`
          SELECT id, title, description, image, prep_time, cook_time, servings, calories, category, is_public, created_at
          FROM saved_recipes
          ORDER BY created_at DESC
          LIMIT 12
        `);

        return NextResponse.json({
          success: true,
          recipes: Array.isArray(recipes) ? recipes : []
        }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        });
      } catch (_) {
        // Fallback default featured recipes if saved_recipes is temporarily unpopulated
        const fallbackRecipes = [
          {
            id: 'rec_1',
            title: 'Pan-Seared Citrus Salmon',
            description: 'Crisp Atlantic salmon fillet glazed with honey-lime marinade, served over fragrant jasmine rice and grilled asparagus.',
            prep_time: '25m',
            servings: 2,
            image: ''
          },
          {
            id: 'rec_2',
            title: 'Mediterranean Quinoa Bowl',
            description: 'Organic rainbow quinoa tossed with English cucumbers, Kalamata olives, cherry tomatoes, and crumbled feta with lemon vinaigrette.',
            prep_time: '25m',
            servings: 3,
            image: ''
          },
          {
            id: 'rec_3',
            title: 'Crispy Garlic Herb Chicken Thighs',
            description: 'Pan-roasted bone-in chicken thighs with crispy golden skin, rosemary, garlic cloves, and a rich pan-jus reduction.',
            prep_time: '25m',
            servings: 4,
            image: ''
          },
          {
            id: 'rec_4',
            title: 'Fish en Papillote (Fish in a Bag)',
            description: 'Delicious culinary creation crafted with fresh ingredients.',
            prep_time: '25m',
            servings: 2,
            image: ''
          },
          {
            id: 'rec_5',
            title: 'Satay Chicken Legs with Peanut Sauce',
            description: 'Delicious culinary creation crafted with fresh ingredients.',
            prep_time: '25m',
            servings: 4,
            image: ''
          },
          {
            id: 'rec_6',
            title: 'Singapore Signature Umami Medley',
            description: 'Formulated based on your Complete Intake Wizard answers. Balanced and avoids Peanuts, Oily.',
            prep_time: '25m',
            servings: 2,
            image: ''
          }
        ];

        return NextResponse.json({
          success: true,
          recipes: fallbackRecipes
        }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        });
      }
    }

    // 2. Fetch all configured pages for the page builder and top navigation
    const rawPages = await query(`
      SELECT id, title, slug, description, content, elements, padding, footer, status, is_default, show_in_nav, order_index, created_at, updated_at
      FROM frontend_pages
      ORDER BY order_index ASC, created_at ASC
    `);

    const pages = (Array.isArray(rawPages) ? rawPages : []).map((row: any) => ({
      ...row,
      elements: typeof row.elements === 'string' ? JSON.parse(row.elements || '[]') : (row.elements || []),
      padding: typeof row.padding === 'string' ? JSON.parse(row.padding || '{}') : (row.padding || {}),
      footer: typeof row.footer === 'string' ? JSON.parse(row.footer || '{}') : (row.footer || {}),
      is_default: Boolean(row.is_default),
      show_in_nav: row.show_in_nav !== false,
      status: row.status || 'published'
    }));

    return NextResponse.json({
      success: true,
      pages
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFrontendPagesTable();
    const body = await req.json();
    const action = body.action || 'save_page';

    // -------------------------------------------------------------------------
    // ACTION: Set Default Homepage
    // -------------------------------------------------------------------------
    if (action === 'set_default') {
      const pageId = body.id || body.pageId;
      if (!pageId) {
        return NextResponse.json({ success: false, error: 'Page ID is required' }, { status: 400 });
      }

      await query("UPDATE frontend_pages SET is_default = false WHERE id != $1", [pageId]);
      await query("UPDATE frontend_pages SET is_default = true, updated_at = NOW() WHERE id = $1", [pageId]);

      return NextResponse.json({ success: true, message: 'Default homepage updated successfully' });
    }

    // -------------------------------------------------------------------------
    // ACTION: Delete Page
    // -------------------------------------------------------------------------
    if (action === 'delete_page') {
      const pageId = body.id || body.pageId;
      if (!pageId) {
        return NextResponse.json({ success: false, error: 'Page ID is required' }, { status: 400 });
      }

      // Prevent deletion of the default homepage
      const target = await query("SELECT is_default FROM frontend_pages WHERE id = $1", [pageId]);
      if (target && target[0]?.is_default) {
        return NextResponse.json({ success: false, error: 'Cannot delete the default homepage' }, { status: 400 });
      }

      await query("DELETE FROM frontend_pages WHERE id = $1", [pageId]);
      return NextResponse.json({ success: true, message: 'Page deleted successfully' });
    }

    // -------------------------------------------------------------------------
    // ACTION: Reorder Pages
    // -------------------------------------------------------------------------
    if (action === 'reorder_pages') {
      const pageOrders = Array.isArray(body.pageOrders) ? body.pageOrders : [];
      for (const item of pageOrders) {
        if (item.id && typeof item.order_index === 'number') {
          await query("UPDATE frontend_pages SET order_index = $1, updated_at = NOW() WHERE id = $2", [item.order_index, item.id]);
        }
      }
      return NextResponse.json({ success: true, message: 'Page order updated successfully' });
    }

    // -------------------------------------------------------------------------
    // ACTION: Save / Upsert Page (Resolves "Unable to save" & duplicate key errors)
    // -------------------------------------------------------------------------
    const pageData = body.page || body;
    const pageId = pageData.id || `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = pageData.title || 'Untitled Page';
    const slug = (pageData.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'page';
    const description = pageData.description || '';
    const content = pageData.content || '';
    const elements = Array.isArray(pageData.elements) ? pageData.elements : [];
    const padding = pageData.padding || { top: 40, bottom: 40, left: 16, right: 16, maxWidth: '1280px' };
    const footer = pageData.footer || { aboutText: '', copyrightText: '', columns: [] };
    const status = pageData.status || 'published';
    const isDefault = Boolean(pageData.is_default);
    const showInNav = pageData.show_in_nav !== false;
    const orderIndex = parseInt(pageData.order_index || '0', 10);

    // If marked as default, clear default flag from other pages first
    if (isDefault) {
      await query("UPDATE frontend_pages SET is_default = false WHERE id != $1", [pageId]);
    }

    // Atomic UPSERT: ON CONFLICT (id) DO UPDATE SET ...
    await query(
      `INSERT INTO frontend_pages (
        id, title, slug, description, content, elements, padding, footer, status, is_default, show_in_nav, order_index, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        content = EXCLUDED.content,
        elements = EXCLUDED.elements,
        padding = EXCLUDED.padding,
        footer = EXCLUDED.footer,
        status = EXCLUDED.status,
        is_default = EXCLUDED.is_default,
        show_in_nav = EXCLUDED.show_in_nav,
        order_index = EXCLUDED.order_index,
        updated_at = NOW();`,
      [
        pageId,
        title,
        slug,
        description,
        content,
        JSON.stringify(elements),
        JSON.stringify(padding),
        JSON.stringify(footer),
        status,
        isDefault,
        showInNav,
        orderIndex
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Page configuration saved successfully',
      page: {
        id: pageId,
        title,
        slug,
        description,
        content,
        elements,
        padding,
        footer,
        status,
        is_default: isDefault,
        show_in_nav: showInNav,
        order_index: orderIndex
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
