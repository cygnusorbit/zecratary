import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Local disk fallback store
function getLocalFallbackFile(): string {
  const dir = path.join(process.cwd(), 'data');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  return path.join(dir, 'chef_chat_history.json');
}

function readFallbackData(): { sessions: any[]; categories: any[] } {
  try {
    const filePath = getLocalFallbackFile();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return { sessions: [], categories: [] };
}

function writeFallbackData(data: { sessions: any[]; categories: any[] }) {
  try {
    const filePath = getLocalFallbackFile();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) {}
}

async function getDb() {
  try {
    const dbModule = await import('@/lib/db').catch(() => null);
    if (dbModule && typeof dbModule.query === 'function') {
      return dbModule;
    }
  } catch (_) {}
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest';
    const categoryId = searchParams.get('categoryId') || 'all';
    const sessionId = searchParams.get('sessionId') || searchParams.get('id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    const db = await getDb();

    // 1. Single Session Retrieval
    if (sessionId) {
      if (db) {
        try {
          const res = await db.query(
            `SELECT id, user_id, category_id, title, messages, created_at, updated_at 
             FROM chef_chat_sessions WHERE id = $1 LIMIT 1`,
            [sessionId]
          ).catch(async () => {
            // MySQL fallback syntax
            return await db.query(
              `SELECT id, user_id, category_id, title, messages, created_at, updated_at 
               FROM chef_chat_sessions WHERE id = ? LIMIT 1`,
              [sessionId]
            );
          });

          if (res && res.rows && res.rows[0]) {
            const row = res.rows[0];
            const msgs = typeof row.messages === 'string' ? JSON.parse(row.messages) : (row.messages || []);
            return NextResponse.json({ success: true, session: { ...row, messages: msgs } });
          }
        } catch (_) {}
      }

      // Fallback
      const fb = readFallbackData();
      const match = fb.sessions.find(s => s.id === sessionId);
      if (match) {
        return NextResponse.json({ success: true, session: match });
      }
      return NextResponse.json({ success: true, session: { id: sessionId, messages: [] } });
    }

    // 2. Paginated Sessions & Categories
    if (db) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS chef_chat_categories (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS chef_chat_sessions (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            category_id VARCHAR(255),
            title VARCHAR(500) NOT NULL,
            messages TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).catch(() => {});

        let querySql = `
          SELECT s.id, s.title, s.category_id, c.name as category_name, s.created_at, s.updated_at
          FROM chef_chat_sessions s
          LEFT JOIN chef_chat_categories c ON s.category_id = c.id
          WHERE s.user_id = $1
        `;
        const params: any[] = [userId];

        if (categoryId && categoryId !== 'all') {
          querySql += ` AND s.category_id = $2`;
          params.push(categoryId);
        }

        querySql += ` ORDER BY s.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const listRes = await db.query(querySql, params);
        const countRes = await db.query(
          `SELECT COUNT(*) as total FROM chef_chat_sessions WHERE user_id = $1 ${categoryId && categoryId !== 'all' ? 'AND category_id = $2' : ''}`,
          categoryId && categoryId !== 'all' ? [userId, categoryId] : [userId]
        );
        const catRes = await db.query(`SELECT id, name, created_at FROM chef_chat_categories WHERE user_id = $1 ORDER BY created_at ASC`, [userId]);

        const total = parseInt(countRes?.rows?.[0]?.total || '0', 10);
        return NextResponse.json({
          success: true,
          sessions: listRes?.rows || [],
          categories: catRes?.rows || [],
          total,
          page,
          totalPages: Math.max(1, Math.ceil(total / limit))
        });
      } catch (dbErr) {
        console.warn('[history API] DB query failed, falling back to disk store:', dbErr);
      }
    }

    // Disk Store Fallback
    const fb = readFallbackData();
    let userSessions = fb.sessions.filter(s => s.user_id === userId);
    if (categoryId && categoryId !== 'all') {
      userSessions = userSessions.filter(s => s.category_id === categoryId);
    }
    userSessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const total = userSessions.length;
    const paginated = userSessions.slice(offset, offset + limit).map(s => {
      const cat = fb.categories.find(c => c.id === s.category_id);
      return {
        id: s.id,
        title: s.title,
        category_id: s.category_id,
        category_name: cat ? cat.name : null,
        created_at: s.created_at,
        updated_at: s.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      sessions: paginated,
      categories: fb.categories.filter(c => c.user_id === userId),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId = 'guest', id, title, messages = [], name, categoryId, sessionId, sessionIds = [] } = body;
    const db = await getDb();

    // 1. SAVE SESSION
    if (action === 'save_session') {
      const sessId = id || ('sess_' + Date.now());
      const sessTitle = title || 'Chef Conversation';
      const msgsJson = typeof messages === 'string' ? messages : JSON.stringify(messages);

      if (db) {
        try {
          await db.query(
            `INSERT INTO chef_chat_sessions (id, user_id, title, messages, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET 
               title = EXCLUDED.title,
               messages = EXCLUDED.messages,
               updated_at = NOW();`,
            [sessId, userId, sessTitle, msgsJson]
          );
          return NextResponse.json({ success: true, id: sessId });
        } catch (_) {}
      }

      // Fallback
      const fb = readFallbackData();
      const existingIdx = fb.sessions.findIndex(s => s.id === sessId);
      const sessionObj = {
        id: sessId,
        user_id: userId,
        title: sessTitle,
        messages: Array.isArray(messages) ? messages : JSON.parse(msgsJson),
        created_at: existingIdx >= 0 ? fb.sessions[existingIdx].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (existingIdx >= 0) fb.sessions[existingIdx] = { ...fb.sessions[existingIdx], ...sessionObj };
      else fb.sessions.unshift(sessionObj);
      writeFallbackData(fb);
      return NextResponse.json({ success: true, id: sessId });
    }

    // 2. CREATE CATEGORY
    if (action === 'create_category') {
      const catId = 'cat_' + Date.now();
      const cleanName = (name || '').trim();
      if (!cleanName) return NextResponse.json({ success: false, error: 'Category name required' }, { status: 400 });

      if (db) {
        try {
          await db.query(
            `INSERT INTO chef_chat_categories (id, user_id, name, created_at) VALUES ($1, $2, $3, NOW())`,
            [catId, userId, cleanName]
          );
          return NextResponse.json({ success: true, category: { id: catId, name: cleanName } });
        } catch (_) {}
      }

      const fb = readFallbackData();
      fb.categories.push({ id: catId, user_id: userId, name: cleanName, created_at: new Date().toISOString() });
      writeFallbackData(fb);
      return NextResponse.json({ success: true, category: { id: catId, name: cleanName } });
    }

    // 3. SET SESSION CATEGORY
    if (action === 'set_session_category') {
      if (db) {
        try {
          await db.query(
            `UPDATE chef_chat_sessions SET category_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
            [categoryId || null, sessionId, userId]
          );
          return NextResponse.json({ success: true });
        } catch (_) {}
      }

      const fb = readFallbackData();
      const sess = fb.sessions.find(s => s.id === sessionId);
      if (sess) {
        sess.category_id = categoryId || null;
        sess.updated_at = new Date().toISOString();
        writeFallbackData(fb);
      }
      return NextResponse.json({ success: true });
    }

    // 4. BATCH DELETE SESSIONS
    if (action === 'delete_sessions') {
      const idsToDelete = Array.isArray(sessionIds) ? sessionIds : [];
      if (idsToDelete.length === 0) return NextResponse.json({ success: true, deleted: 0 });

      if (db) {
        try {
          await db.query(
            `DELETE FROM chef_chat_sessions WHERE id = ANY($1::varchar[]) AND user_id = $2`,
            [idsToDelete, userId]
          );
          return NextResponse.json({ success: true, deleted: idsToDelete.length });
        } catch (_) {}
      }

      const fb = readFallbackData();
      fb.sessions = fb.sessions.filter(s => !idsToDelete.includes(s.id));
      writeFallbackData(fb);
      return NextResponse.json({ success: true, deleted: idsToDelete.length });
    }

    // 5. CLEAR ALL HISTORY FOR USER
    if (action === 'clear_all_history') {
      if (db) {
        try {
          await db.query(`DELETE FROM chef_chat_sessions WHERE user_id = $1`, [userId]);
          return NextResponse.json({ success: true });
        } catch (_) {}
      }

      const fb = readFallbackData();
      fb.sessions = fb.sessions.filter(s => s.user_id !== userId);
      writeFallbackData(fb);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('userId') || 'guest';
    const sessionId = searchParams.get('sessionId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const sessionIdsParam = searchParams.get('sessionIds') || '';

    const db = await getDb();

    // 1. Delete single session
    if (action === 'delete_session' && sessionId) {
      if (db) {
        try {
          await db.query(`DELETE FROM chef_chat_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
          return NextResponse.json({ success: true });
        } catch (_) {}
      }
      const fb = readFallbackData();
      fb.sessions = fb.sessions.filter(s => s.id !== sessionId);
      writeFallbackData(fb);
      return NextResponse.json({ success: true });
    }

    // 2. Batch delete sessions via query param
    if (action === 'delete_sessions' && sessionIdsParam) {
      const idsToDelete = sessionIdsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (db) {
        try {
          await db.query(`DELETE FROM chef_chat_sessions WHERE id = ANY($1::varchar[]) AND user_id = $2`, [idsToDelete, userId]);
          return NextResponse.json({ success: true, deleted: idsToDelete.length });
        } catch (_) {}
      }
      const fb = readFallbackData();
      fb.sessions = fb.sessions.filter(s => !idsToDelete.includes(s.id));
      writeFallbackData(fb);
      return NextResponse.json({ success: true, deleted: idsToDelete.length });
    }

    // 3. Clear all history
    if (action === 'clear_all_history') {
      if (db) {
        try {
          await db.query(`DELETE FROM chef_chat_sessions WHERE user_id = $1`, [userId]);
          return NextResponse.json({ success: true });
        } catch (_) {}
      }
      const fb = readFallbackData();
      fb.sessions = fb.sessions.filter(s => s.user_id !== userId);
      writeFallbackData(fb);
      return NextResponse.json({ success: true });
    }

    // 4. Delete category (keeps sessions, sets category_id to NULL)
    if (action === 'delete_category' && categoryId) {
      if (db) {
        try {
          await db.query(`UPDATE chef_chat_sessions SET category_id = NULL WHERE category_id = $1 AND user_id = $2`, [categoryId, userId]);
          await db.query(`DELETE FROM chef_chat_categories WHERE id = $1 AND user_id = $2`, [categoryId, userId]);
          return NextResponse.json({ success: true });
        } catch (_) {}
      }
      const fb = readFallbackData();
      fb.categories = fb.categories.filter(c => c.id !== categoryId);
      fb.sessions.forEach(s => { if (s.category_id === categoryId) s.category_id = null; });
      writeFallbackData(fb);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid delete action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
