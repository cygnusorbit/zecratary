import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function readFallbackData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'chef_chat_history.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (_) {}
  return { sessions: [], categories: [] };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('sessionId');
    if (!id) return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });

    try {
      const dbModule = await import('@/lib/db').catch(() => null);
      if (dbModule && typeof dbModule.query === 'function') {
        const res = await dbModule.query(
          `SELECT messages FROM chef_chat_sessions WHERE id = $1 LIMIT 1`,
          [id]
        ).catch(async () => {
          return await dbModule.query(
            `SELECT messages FROM chef_chat_sessions WHERE id = ? LIMIT 1`,
            [id]
          );
        });

        if (res && res.rows && res.rows[0]) {
          const raw = res.rows[0].messages;
          const messages = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
          return NextResponse.json({ success: true, messages });
        }
      }
    } catch (_) {}

    const fb = readFallbackData();
    const session = fb.sessions.find((s: any) => s.id === id);
    return NextResponse.json({
      success: true,
      messages: session?.messages || []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
