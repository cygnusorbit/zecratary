// Generated / Updated by AI Collaborator
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Polymorphic Database Query Adapter (Strictly typed without TS2774 function conditional)
async function queryDb(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  try {
    const res: any = await (query as any)(text, params);
    if (Array.isArray(res)) {
      return { rows: res };
    }
    if (res && Array.isArray(res.rows)) {
      return { rows: res.rows };
    }
    return { rows: [] };
  } catch (err) {
    console.error('[chef/history] queryDb error:', err);
    return { rows: [] };
  }
}

let tablesInitialized = false;

async function ensureHistoryTables(): Promise<void> {
  if (tablesInitialized) return;
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS chef_chat_categories (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(64) DEFAULT 'Utensils',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryDb(`
      CREATE TABLE IF NOT EXISTS chef_chat_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        category_id VARCHAR(255),
        title VARCHAR(255) DEFAULT 'New Culinary Consultation',
        messages JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryDb(`
      ALTER TABLE chef_chat_sessions 
      ADD COLUMN IF NOT EXISTS category_id VARCHAR(255);
    `);

    await queryDb(`
      ALTER TABLE chef_chat_sessions 
      ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'New Culinary Consultation';
    `);

    tablesInitialized = true;
  } catch (err) {
    console.warn('[chef/history] Table initialization warning:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureHistoryTables();
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || searchParams.get('email') || '').trim();

    if (!userId) {
      return NextResponse.json({
        success: true,
        sessions: [],
        categories: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });
    }

    const categoryId = searchParams.get('categoryId') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const search = (searchParams.get('search') || '').trim();

    // 1. Fetch categories
    const categoriesRes = await queryDb(
      `SELECT id, user_id, name, icon, created_at 
       FROM chef_chat_categories 
       WHERE user_id = $1 
       ORDER BY name ASC`,
      [userId]
    );
    const categories = categoriesRes.rows || [];

    // 2. Query sessions
    const whereClauses: string[] = ['user_id = $1'];
    const queryParams: any[] = [userId];

    if (categoryId && categoryId !== 'all') {
      queryParams.push(categoryId);
      whereClauses.push(`category_id = $${queryParams.length}`);
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`title ILIKE $${queryParams.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const countRes = await queryDb(
      `SELECT COUNT(*) as total FROM chef_chat_sessions WHERE ${whereStr}`,
      queryParams
    );
    const countRow = (countRes.rows || [])[0] || {};
    const total = Number(countRow.total ?? countRow.count ?? 0);

    queryParams.push(limit);
    const limitParamIdx = queryParams.length;
    queryParams.push(offset);
    const offsetParamIdx = queryParams.length;

    const sessionsRes = await queryDb(
      `SELECT id, user_id, category_id, title, messages, created_at, updated_at 
       FROM chef_chat_sessions 
       WHERE ${whereStr} 
       ORDER BY updated_at DESC 
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      queryParams
    );

    const sessions = (sessionsRes.rows || []).map((session: any) => {
      let parsedMessages: any[] = [];
      try {
        if (typeof session.messages === 'string') {
          parsedMessages = JSON.parse(session.messages);
        } else if (Array.isArray(session.messages)) {
          parsedMessages = session.messages;
        } else if (session.messages) {
          parsedMessages = [session.messages];
        }
      } catch (_) {
        parsedMessages = [];
      }

      return {
        id: session.id,
        userId: session.user_id,
        categoryId: session.category_id,
        title: session.title || 'Culinary Consultation',
        messages: parsedMessages,
        messageCount: parsedMessages.length,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      sessions,
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    console.error('[chef/history] GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureHistoryTables();
    const body = await req.json();
    const { action, userId, sessionId, categoryId, title, name, icon, messages } = body;

    const targetUserId = (userId || body.user_id || '').trim();
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'create_category' || (!sessionId && name)) {
      const catId = categoryId || 'cat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      await queryDb(
        `INSERT INTO chef_chat_categories (id, user_id, name, icon, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon`,
        [catId, targetUserId, name || 'Custom Category', icon || 'Utensils']
      );
      return NextResponse.json({ success: true, category: { id: catId, name, icon } });
    }

    const targetSessionId = sessionId || ('sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
    const safeMessages = JSON.stringify(Array.isArray(messages) ? messages : []);
    const sessionTitle = title || 'Culinary Consultation';

    await queryDb(
      `INSERT INTO chef_chat_sessions (id, user_id, category_id, title, messages, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
         title = COALESCE(EXCLUDED.title, chef_chat_sessions.title),
         category_id = COALESCE(EXCLUDED.category_id, chef_chat_sessions.category_id),
         messages = EXCLUDED.messages,
         updated_at = CURRENT_TIMESTAMP`,
      [targetSessionId, targetUserId, categoryId || null, sessionTitle, safeMessages]
    );

    return NextResponse.json({
      success: true,
      sessionId: targetSessionId,
      title: sessionTitle
    });
  } catch (err: any) {
    console.error('[chef/history] POST error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureHistoryTables();
    const body = await req.json();
    const { sessionId, title, categoryId, userId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [sessionId];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }

    if (categoryId !== undefined) {
      params.push(categoryId === 'all' || categoryId === '' ? null : categoryId);
      updates.push(`category_id = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      await queryDb(
        `UPDATE chef_chat_sessions SET ${updates.join(', ')} WHERE id = $1 AND user_id = $${params.length}`,
        params
      );
    } else {
      await queryDb(
        `UPDATE chef_chat_sessions SET ${updates.join(', ')} WHERE id = $1`,
        params
      );
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (err: any) {
    console.error('[chef/history] PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureHistoryTables();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || searchParams.get('id');
    const userId = searchParams.get('userId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll && userId) {
      await queryDb(`DELETE FROM chef_chat_sessions WHERE user_id = $1`, [userId]);
      return NextResponse.json({ success: true, message: 'All sessions deleted' });
    }

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    if (userId) {
      await queryDb(`DELETE FROM chef_chat_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
    } else {
      await queryDb(`DELETE FROM chef_chat_sessions WHERE id = $1`, [sessionId]);
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (err: any) {
    console.error('[chef/history] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
