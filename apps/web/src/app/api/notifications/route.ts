import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { queryMysql } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

async function resolveUserFromReq(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let rawUserId = searchParams.get('userId')?.trim() || '';
  let rawEmail = searchParams.get('email')?.trim().toLowerCase() || '';

  if (rawUserId === 'undefined' || rawUserId === 'null') rawUserId = '';
  if (rawEmail === 'undefined' || rawEmail === 'null') rawEmail = '';

  if (!rawUserId && !rawEmail) {
    const authCookies = ['zecratary_session', 'currentUser', 'zecratary_user', 'zecratary_current_user'];
    for (const cName of authCookies) {
      const cVal = req.cookies.get(cName)?.value;
      if (cVal) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cVal));
          if (parsed?.id) rawUserId = String(parsed.id);
          if (parsed?.email) rawEmail = String(parsed.email).toLowerCase();
          if (rawUserId || rawEmail) break;
        } catch (_) {}
      }
    }
  }

  return { userId: rawUserId, email: rawEmail };
}

export async function GET(req: NextRequest) {
  try {
    const { userId, email } = await resolveUserFromReq(req);

    // Ensure PostgreSQL notifications schema exists
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          user_email VARCHAR(255),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(32) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          action_url VARCHAR(255),
          action_label VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (_) {}

    let rows: any[] = [];
    if (userId || email) {
      rows = await query(
        `SELECT id, title, message, type, is_read, action_url, action_label, created_at 
         FROM notifications 
         WHERE ($1 != '' AND user_id::text = $1) 
            OR ($2 != '' AND LOWER(TRIM(user_email)) = LOWER(TRIM($2)))
         ORDER BY created_at DESC LIMIT 30`,
        [userId, email]
      );
    }

    // Seed default welcoming notices if empty
    if (!rows || rows.length === 0) {
      const defaultNotifs = [
        {
          id: `notif_welcome_${Date.now()}_1`,
          title: '🎉 Welcome to Zecratary!',
          message: 'Your wallet credits and AI tokens are active and synchronized with PostgreSQL.',
          type: 'success',
          is_read: false,
          created_at: new Date().toISOString()
        },
        {
          id: `notif_sync_${Date.now()}_2`,
          title: '⚡ Real-Time Balance Sync',
          message: 'Balances update live across all open browser tabs without refreshing.',
          type: 'info',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ];

      if (userId || email) {
        try {
          for (const n of defaultNotifs) {
            await query(
              `INSERT INTO notifications (id, user_id, user_email, title, message, type, is_read, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [n.id, userId || 'usr_default', email || 'user@zecratary.com', n.title, n.message, n.type, false]
            );
          }
        } catch (_) {}
      }
      rows = defaultNotifs;
    }

    const unreadCount = rows.filter((r: any) => !r.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: rows.map((r: any) => ({
        id: String(r.id),
        title: r.title,
        message: r.message,
        type: r.type || 'info',
        isRead: Boolean(r.is_read),
        actionUrl: r.action_url || '',
        actionLabel: r.action_label || '',
        createdAt: r.created_at
      })),
      unreadCount
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await resolveUserFromReq(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'mark_all_read';
    const notifId = body?.id || '';

    if (action === 'mark_all_read') {
      try {
        await query(
          `UPDATE notifications SET is_read = true 
           WHERE ($1 != '' AND user_id::text = $1) 
              OR ($2 != '' AND LOWER(TRIM(user_email)) = LOWER(TRIM($2)))`,
          [userId, email]
        );
      } catch (_) {}

      try {
        await queryMysql(
          `UPDATE notifications SET is_read = true 
           WHERE (? != '' AND user_id = ?) 
              OR (? != '' AND LOWER(TRIM(user_email)) = LOWER(TRIM(?)))`,
          [userId, userId, email, email]
        );
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'All notifications marked as read', unreadCount: 0 });
    }

    if (action === 'mark_read' && notifId) {
      try {
        await query(`UPDATE notifications SET is_read = true WHERE id = $1`, [notifId]);
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
