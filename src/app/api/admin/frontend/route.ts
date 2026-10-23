import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureFrontendPagesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS frontend_pages (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'published',
        is_default BOOLEAN DEFAULT false,
        show_in_nav BOOLEAN DEFAULT true,
        show_in_footer BOOLEAN DEFAULT true,
        order_index INT DEFAULT 0,
        elements JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS elements JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
    `);
  } catch (err: any) {
    console.warn('[frontend_pages table notice]:', err.message);
  }
}

export async function GET(req: NextRequest) {
  await ensureFrontendPagesTable();
  const url = new URL(req.url);

  if (url.searchParams.get('all_recipes') === 'true') {
    try {
      const recipes: any = await query('SELECT id, title, image FROM saved_recipes ORDER BY created_at DESC LIMIT 50;').catch(() => []);
      const list = Array.isArray(recipes) ? recipes : (recipes?.rows || []);
      return NextResponse.json({ success: true, recipes: list });
    } catch (_) {
      return NextResponse.json({ success: true, recipes: [] });
    }
  }

  try {
    const rows: any = await query('SELECT * FROM frontend_pages ORDER BY order_index ASC, created_at ASC;');
    const pages = Array.isArray(rows) ? rows : (rows?.rows || []);

    return NextResponse.json({
      success: true,
      pages: pages.map((p: any) => {
        let elementsArray: any[] = [];
        if (Array.isArray(p.elements)) {
          elementsArray = p.elements;
        } else if (typeof p.elements === 'string' && p.elements.trim()) {
          try { elementsArray = JSON.parse(p.elements); } catch (_) {}
        } else if (typeof p.content === 'string' && p.content.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(p.content);
            if (Array.isArray(parsed.elements)) elementsArray = parsed.elements;
            else if (Array.isArray(parsed)) elementsArray = parsed;
          } catch (_) {}
        }

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          content: p.content || '',
          status: p.status || 'published',
          is_default: Boolean(p.is_default),
          show_in_nav: p.show_in_nav !== false,
          show_in_footer: p.show_in_footer !== false,
          order_index: p.order_index || 0,
          elements: Array.isArray(elementsArray) ? elementsArray : [],
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      }),
    });
  } catch (err: any) {
    console.error('Error fetching frontend pages:', err.message);
    return NextResponse.json({
      success: true,
      pages: [
        { id: 'page_home', title: 'Home', slug: 'home', content: '', status: 'published', is_default: true, show_in_nav: true, show_in_footer: true, order_index: 1, elements: [] },
        { id: 'page_about', title: 'About', slug: 'about', content: '', status: 'published', is_default: false, show_in_nav: true, show_in_footer: true, order_index: 2, elements: [] },
      ]
    });
  }
}

export async function POST(req: NextRequest) {
  await ensureFrontendPagesTable();
  try {
    const body = await req.json();
    const id = body.id || ('page_' + Date.now().toString(36));
    const title = body.title || 'Untitled Page';
    const slug = (body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const content = body.content || '';
    const status = body.status || 'published';
    const isDefault = Boolean(body.is_default);
    const showInNav = body.show_in_nav !== false;
    const showInFooter = body.show_in_footer !== false;
    const orderIndex = body.order_index || 0;
    const elements = Array.isArray(body.elements) ? JSON.stringify(body.elements) : '[]';

    await query(`
      INSERT INTO frontend_pages (id, title, slug, content, status, is_default, show_in_nav, show_in_footer, order_index, elements, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        status = EXCLUDED.status,
        is_default = EXCLUDED.is_default,
        show_in_nav = EXCLUDED.show_in_nav,
        show_in_footer = EXCLUDED.show_in_footer,
        order_index = EXCLUDED.order_index,
        elements = EXCLUDED.elements,
        updated_at = NOW();
    `, [id, title, slug, content, status, isDefault, showInNav, showInFooter, orderIndex, elements]);

    return NextResponse.json({ success: true, page: { id, title, slug, content, status, elements: body.elements || [] } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
