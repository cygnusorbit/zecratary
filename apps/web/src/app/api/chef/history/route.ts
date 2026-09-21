import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureChefChatTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS chef_chat_categories (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        name VARCHAR(128) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chef_chat_sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        category_id VARCHAR(64) REFERENCES chef_chat_categories(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_chef_sessions_user ON chef_chat_sessions(user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chef_categories_user ON chef_chat_categories(user_id, created_at ASC);
    `);
  } catch (err) {
    console.error('Error initializing chef chat tables:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureChefChatTables();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest';
    const categoryId = searchParams.get('categoryId') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 10;
    const offset = (page - 1) * limit;

    // Fetch categories
    const categories = await query(
      `SELECT * FROM chef_chat_categories WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );

    // Fetch sessions matching filter
    let sessionQuery = `
      SELECT s.id, s.title, s.category_id, s.created_at, s.updated_at,
             jsonb_array_length(s.messages) as message_count,
             c.name as category_name
      FROM chef_chat_sessions s
      LEFT JOIN chef_chat_categories c ON s.category_id = c.id
      WHERE s.user_id = $1
    `;
    const params: any[] = [userId];

    if (categoryId !== 'all') {
      if (categoryId === 'uncategorized') {
        sessionQuery += ` AND s.category_id IS NULL`;
      } else {
        params.push(categoryId);
        sessionQuery += ` AND s.category_id = $${params.length}`;
      }
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${sessionQuery}) as filtered`;
    const countRes = await query(countQuery, params);
    const total = parseInt(countRes[0]?.total || '0');
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Paginated results
    sessionQuery += ` ORDER BY s.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const sessions = await query(sessionQuery, params);

    return NextResponse.json({
      success: true,
      sessions,
      categories,
      page,
      limit,
      total,
      totalPages
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureChefChatTables();
    const body = await req.json();
    const { action, userId = 'guest' } = body;

    if (action === 'create_category') {
      const name = (body.name || '').trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
      }
      const catId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await query(
        `INSERT INTO chef_chat_categories (id, user_id, name) VALUES ($1, $2, $3)`,
        [catId, userId, name]
      );
      return NextResponse.json({ success: true, categoryId: catId, name });
    }

    if (action === 'save_session') {
      const { id, title = 'New Conversation', messages = [], categoryId = null } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
      }

      await query(
        `INSERT INTO chef_chat_sessions (id, user_id, category_id, title, messages, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category_id = COALESCE(EXCLUDED.category_id, chef_chat_sessions.category_id),
           messages = EXCLUDED.messages,
           updated_at = NOW()`,
        [id, userId, categoryId || null, title, JSON.stringify(messages)]
      );

      return NextResponse.json({ success: true, sessionId: id });
    }

    if (action === 'set_session_category') {
      const { sessionId, categoryId } = body;
      await query(
        `UPDATE chef_chat_sessions SET category_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [categoryId || null, sessionId, userId]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureChefChatTables();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId') || 'guest';

    if (action === 'delete_session') {
      const sessionId = searchParams.get('sessionId');
      if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

      await query(`DELETE FROM chef_chat_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
      return NextResponse.json({ success: true, message: 'Chat deleted' });
    }

    if (action === 'delete_category') {
      const categoryId = searchParams.get('categoryId');
      if (!categoryId) return NextResponse.json({ error: 'Category ID required' }, { status: 400 });

      await query(`UPDATE chef_chat_sessions SET category_id = NULL WHERE category_id = $1`, [categoryId]);
      await query(`DELETE FROM chef_chat_categories WHERE id = $1 AND user_id = $2`, [categoryId, userId]);
      return NextResponse.json({ success: true, message: 'Category deleted' });
    }

    return NextResponse.json({ success: false, error: 'Invalid delete action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
