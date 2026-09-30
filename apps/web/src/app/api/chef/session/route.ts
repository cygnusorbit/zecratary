// Generated / Updated by AI Collaborator
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function queryDb(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  try {
    const res: any = await (query as any)(text, params);
    if (Array.isArray(res)) return { rows: res };
    if (res && Array.isArray(res.rows)) return { rows: res.rows };
    return { rows: [] };
  } catch (err) {
    console.error('[chef/session] queryDb error:', err);
    return { rows: [] };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const params: any[] = [sessionId];
    let sql = `SELECT id, user_id, category_id, title, messages, created_at, updated_at FROM chef_chat_sessions WHERE id = $1`;
    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $2`;
    }

    const res = await queryDb(sql, params);
    const session = (res.rows || [])[0];

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

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

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        userId: session.user_id,
        categoryId: session.category_id,
        title: session.title || 'Culinary Consultation',
        messages: parsedMessages,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    });
  } catch (err: any) {
    console.error('[chef/session] GET error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
