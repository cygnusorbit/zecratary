import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureFrontendPagesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS frontend_pages (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        is_default BOOLEAN DEFAULT FALSE,
        is_published BOOLEAN DEFAULT TRUE,
        elements JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      ALTER TABLE frontend_pages 
      ADD COLUMN IF NOT EXISTS padding JSONB DEFAULT '{"top": "2.5rem", "bottom": "4rem", "x": "1.5rem", "maxWidth": "max-w-7xl"}'::jsonb;
    `);
    await query(`
      ALTER TABLE frontend_pages 
      ADD COLUMN IF NOT EXISTS footer JSONB DEFAULT '{"enabled": true, "aboutText": "Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.", "copyrightText": "© 2026 Zecratary. All rights reserved.", "columns": [{"id": "col_platform", "title": "Platform", "links": [{"id": "l_1", "label": "AI Chef", "url": "/chef"}, {"id": "l_2", "label": "Saved Recipes", "url": "/saved"}, {"id": "l_3", "label": "Meal Planner", "url": "/planner"}]}, {"id": "col_company", "title": "Company", "links": [{"id": "l_4", "label": "About Us", "url": "/about"}, {"id": "l_5", "label": "Subscription Plans", "url": "/subscriptions"}, {"id": "l_6", "label": "Privacy Policy", "url": "/privacy"}, {"id": "l_7", "label": "Terms of Service", "url": "/terms"}]}], "socials": {"twitter": "https://x.com", "github": "https://github.com", "discord": "https://discord.com"}}'::jsonb;
    `);
  } catch (err) {
    console.error('Error ensuring frontend_pages table schema:', err);
  }
}

const defaultPadding = {
  top: '2.5rem',
  bottom: '4rem',
  x: '1.5rem',
  maxWidth: 'max-w-7xl'
};

const defaultFooter = {
  enabled: true,
  aboutText: 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
  copyrightText: '© 2026 Zecratary. All rights reserved.',
  columns: [
    {
      id: 'col_platform',
      title: 'Platform',
      links: [
        { id: 'l_1', label: 'AI Chef', url: '/chef' },
        { id: 'l_2', label: 'Saved Recipes', url: '/saved' },
        { id: 'l_3', label: 'Meal Planner', url: '/planner' }
      ]
    },
    {
      id: 'col_company',
      title: 'Company',
      links: [
        { id: 'l_4', label: 'About Us', url: '/about' },
        { id: 'l_5', label: 'Subscription Plans', url: '/subscriptions' },
        { id: 'l_6', label: 'Privacy Policy', url: '/privacy' },
        { id: 'l_7', label: 'Terms of Service', url: '/terms' }
      ]
    }
  ],
  socials: {
    twitter: 'https://x.com',
    github: 'https://github.com',
    discord: 'https://discord.com'
  }
};

const defaultElements = [
  {
    id: 'elem_hero_title',
    type: 'title',
    title: 'Autonomous Culinary Intelligence & Precision Meal Planning',
    subtitle: 'Discover hyper-personalized recipes, pantry inventory management, and automated nutritional balancing.',
    level: 'h1',
    alignment: 'center',
    accentColor: 'var(--color-primary, #E05638)'
  },
  {
    id: 'elem_recipes_grid',
    type: 'recipe',
    title: 'Community Recipes Gallery',
    subtitle: 'Explore recipes synchronized directly from your saved library. Click any card to view detailed ingredients and cooking steps.',
    recipeGridDensity: 3,
    recipeLimit: 6,
    recipeCategoryFilter: 'all',
    buttonText: 'Cook with AI Chef',
    buttonUrl: '/chef',
    bgColor: 'transparent',
    borderColor: 'var(--color-border, #1e293b)',
    accentColor: 'var(--color-primary, #E05638)'
  },
  {
    id: 'elem_features_grid',
    type: 'column',
    title: 'Engineered for Peak Nutrition',
    columnsCount: 3,
    columns: [
      { id: 'col_1', title: 'Smart AI Chef', content: 'Generate tailored culinary creations based exclusively on ingredients currently available in your pantry.' },
      { id: 'col_2', title: 'Real-time Macro Breakdown', content: 'Track calories, protein, carbs, and micronutrient ratios seamlessly across all scheduled meals.' },
      { id: 'col_3', title: 'Zero Food Waste', content: 'Intelligent shelf-life monitors proactively notify you when stored groceries approach expiration.' }
    ],
    accentColor: 'var(--color-primary, #E05638)'
  },
  {
    id: 'elem_plans_catalog',
    type: 'subscription',
    title: 'Flexible Membership & Culinary AI Plans',
    subtitle: 'Select between monthly or annual membership to power your personal kitchen assistant.',
    planSlug: 'all',
    planBillingInterval: 'MONTH',
    planShowTokens: true,
    planShowAiModels: true,
    planCtaText: 'Choose Plan',
    planCtaUrl: '/subscriptions',
    bgColor: 'var(--color-card, #0b0f17)',
    borderColor: 'var(--color-border, #1e293b)',
    accentColor: 'var(--color-primary, #E05638)'
  }
];

export async function GET(req: NextRequest) {
  await ensureFrontendPagesTable();
  const { searchParams } = new URL(req.url);

  // Return all authentic saved recipes from PostgreSQL saved_recipes
  if (searchParams.get('all_recipes') === 'true' || searchParams.get('recipes') === 'true') {
    try {
      const rawRecipes: any = await query(`
        SELECT * FROM saved_recipes ORDER BY created_at DESC;
      `);
      const rows = Array.isArray(rawRecipes) ? rawRecipes : (rawRecipes?.rows || []);

      const formatted = rows.map((r: any) => {
        let ingredients = r.ingredients;
        if (typeof ingredients === 'string') {
          try { ingredients = JSON.parse(ingredients); } catch (_) { ingredients = []; }
        }

        let directions = r.directions || r.instructions || r.steps;
        if (typeof directions === 'string') {
          try { directions = JSON.parse(directions); } catch (_) { directions = []; }
        }

        let nutrition = r.nutrition;
        if (typeof nutrition === 'string') {
          try { nutrition = JSON.parse(nutrition); } catch (_) { nutrition = {}; }
        }

        const prepNum = parseInt(String(r.prep_time || r.prepTime || '15'), 10) || 15;
        const cookNum = parseInt(String(r.cook_time || r.cookTime || '20'), 10) || 20;

        return {
          id: String(r.id),
          userId: r.user_id || r.userId || 'usr_admin_1',
          user_id: r.user_id || r.userId || 'usr_admin_1',
          title: r.title || r.name || 'Saved Recipe',
          name: r.title || r.name || 'Saved Recipe',
          description: r.description || '',
          recipeType: r.recipe_type || r.category || 'Main Dish',
          category: r.recipe_type || r.category || 'Main Dish',
          recipe_type: r.recipe_type || r.category || 'Main Dish',
          cuisine: r.cuisine || '',
          prepTime: r.prep_time ? `${r.prep_time} mins` : '15 mins',
          cookTime: r.cook_time ? `${r.cook_time} mins` : '20 mins',
          prepTimeMinutes: prepNum,
          cookTimeMinutes: cookNum,
          calories: r.calories || nutrition?.calories || '450 kcal',
          servings: Number(r.servings) || 2,
          difficulty: r.difficulty || 'Medium',
          ingredients: Array.isArray(ingredients) ? ingredients : [],
          directions: Array.isArray(directions) ? directions : [],
          instructions: Array.isArray(directions) ? directions : [],
          steps: Array.isArray(directions) ? directions : [],
          imageUrl: r.image_url || r.imageUrl || r.image || '',
          image: r.image_url || r.imageUrl || r.image || '',
          image_url: r.image_url || r.imageUrl || r.image || '',
          sourceUrl: r.source_url || r.sourceUrl || '',
          source_url: r.source_url || r.sourceUrl || '',
          rating: Number(r.rating) || 5,
          isFavorite: Boolean(r.is_favorite || r.isFavorite),
          is_favorite: Boolean(r.is_favorite || r.isFavorite),
          isCooked: Boolean(r.is_cooked || r.isCooked),
          is_cooked: Boolean(r.is_cooked || r.isCooked),
          creatorName: r.creator_name || r.creatorName || (r.created_by ? r.created_by.split('@')[0] : 'Chef AI'),
          created_at: r.created_at || new Date().toISOString()
        };
      });

      return NextResponse.json(
        { success: true, recipes: formatted },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    } catch (err: any) {
      console.warn('Could not query saved_recipes table:', err.message);
      return NextResponse.json({ success: true, recipes: [] });
    }
  }

  try {
    const rawResult: any = await query(`
      SELECT * FROM frontend_pages ORDER BY is_default DESC, created_at ASC;
    `);
    let rows = Array.isArray(rawResult) ? rawResult : (rawResult?.rows || []);

    if (!rows || rows.length === 0) {
      await query(`
        INSERT INTO frontend_pages (
          id, title, slug, description, is_default, is_published, elements, padding, footer, created_at, updated_at
        ) VALUES (
          'page_home',
          'Homepage',
          '/',
          'Default landing and home experience for visitors and members.',
          true,
          true,
          $1::jsonb,
          $2::jsonb,
          $3::jsonb,
          NOW(),
          NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [JSON.stringify(defaultElements), JSON.stringify(defaultPadding), JSON.stringify(defaultFooter)]);

      const fresh: any = await query(`SELECT * FROM frontend_pages ORDER BY is_default DESC;`);
      rows = Array.isArray(fresh) ? fresh : (fresh?.rows || []);
    }

    const pages = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description || '',
      is_default: Boolean(r.is_default),
      is_published: Boolean(r.is_published),
      elements: typeof r.elements === 'string' ? JSON.parse(r.elements) : (r.elements || []),
      padding: typeof r.padding === 'string' ? JSON.parse(r.padding) : (r.padding || defaultPadding),
      footer: typeof r.footer === 'string' ? JSON.parse(r.footer) : (r.footer || defaultFooter),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    return NextResponse.json(
      { success: true, pages },
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
    const { action, page, id, newDefaultId } = body;

    if (action === 'save_page' && page) {
      const pageId = page.id || `page_${Date.now()}`;
      const title = page.title || 'Untitled Page';
      let slug = page.slug ? page.slug.trim() : '/';
      if (!slug.startsWith('/')) slug = `/${slug}`;
      const description = page.description || '';
      const isDefault = Boolean(page.is_default);
      const isPublished = page.is_published !== undefined ? Boolean(page.is_published) : true;
      const elementsJson = JSON.stringify(page.elements || []);
      const paddingJson = JSON.stringify(page.padding || defaultPadding);
      const footerJson = JSON.stringify(page.footer || defaultFooter);

      if (isDefault) {
        await query(`UPDATE frontend_pages SET is_default = FALSE WHERE id != $1;`, [pageId]);
      }

      await query(`
        INSERT INTO frontend_pages (
          id, title, slug, description, is_default, is_published, elements, padding, footer, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          is_default = EXCLUDED.is_default,
          is_published = EXCLUDED.is_published,
          elements = EXCLUDED.elements,
          padding = EXCLUDED.padding,
          footer = EXCLUDED.footer,
          updated_at = NOW();
      `, [pageId, title, slug, description, isDefault, isPublished, elementsJson, paddingJson, footerJson]);

      return NextResponse.json({ success: true, message: 'Page configuration, padding, and footer saved successfully.' });
    }

    if (action === 'delete_page' && id) {
      const check: any = await query(`SELECT is_default FROM frontend_pages WHERE id = $1;`, [id]);
      const rows = Array.isArray(check) ? check : (check?.rows || []);
      if (rows.length > 0 && rows[0].is_default) {
        return NextResponse.json({ success: false, error: 'Cannot delete the default homepage.' }, { status: 400 });
      }

      await query(`DELETE FROM frontend_pages WHERE id = $1;`, [id]);
      return NextResponse.json({ success: true, message: 'Page deleted successfully.' });
    }

    if (action === 'set_default' && newDefaultId) {
      await query(`UPDATE frontend_pages SET is_default = FALSE;`);
      await query(`UPDATE frontend_pages SET is_default = TRUE WHERE id = $1;`, [newDefaultId]);
      return NextResponse.json({ success: true, message: 'Default homepage updated.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
