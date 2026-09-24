import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface ClientNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'promo' | 'system';
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  timestamp: string;
}

async function ensureNotificationReadTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        notification_id VARCHAR(128) NOT NULL,
        read_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_email, notification_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_notif_reads_email ON user_notification_reads(user_email);
    `);
  } catch (err) {
    console.warn('[ensureNotificationReadTable] Warning:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureNotificationReadTable();
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get('email') || '').toLowerCase().trim();
    const userId = searchParams.get('userId') || '';

    // 1. Fetch Notification Settings
    let notifSettings: any = {
      is_enabled: true,
      in_app_enabled: true,
      token_low_enabled: true,
      token_low_threshold: 15,
      token_exhausted_enabled: true,
      wallet_low_enabled: true,
      wallet_low_threshold: 5.0,
      subscription_expiry_enabled: true,
      subscription_expiry_days: 3,
      reminder_meal_planner: true,
      sound_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      retention_days: 30
    };

    try {
      const cfgRows = await query('SELECT * FROM notification_settings WHERE id = $1 LIMIT 1', ['default_notification_settings']);
      if (cfgRows && cfgRows.length > 0) {
        notifSettings = { ...notifSettings, ...cfgRows[0] };
      }
    } catch (_) {}

    // If notifications master or in-app channel is disabled, return empty
    if (!notifSettings.is_enabled || !notifSettings.in_app_enabled) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
        settings: {
          isEnabled: Boolean(notifSettings.is_enabled),
          inAppEnabled: Boolean(notifSettings.in_app_enabled),
          soundEnabled: false,
          quietHoursEnabled: false
        }
      });
    }

    // 2. Load Read Receipts for this user
    const readIds = new Set<string>();
    if (email) {
      const readRows = await query('SELECT notification_id FROM user_notification_reads WHERE LOWER(user_email) = $1', [email]);
      (readRows || []).forEach((r: any) => {
        if (r.notification_id) readIds.add(r.notification_id);
      });
    }

    const notifications: ClientNotificationItem[] = [];

    // 3. Load Custom Announcements from PostgreSQL custom_notifications
    try {
      const customRows = await query(`
        SELECT * FROM custom_notifications
        WHERE is_active = true AND (sent_at IS NOT NULL OR send_count > 0)
        ORDER BY COALESCE(sent_at, created_at) DESC
        LIMIT 25
      `);

      (customRows || []).forEach((c: any) => {
        let channels = { inApp: true };
        if (c.channels) {
          channels = typeof c.channels === 'string' ? JSON.parse(c.channels) : c.channels;
        }
        if (channels.inApp !== false) {
          notifications.push({
            id: c.id,
            title: c.title,
            message: c.message,
            type: (c.type as any) || 'info',
            isRead: readIds.has(c.id),
            actionUrl: c.action_url || '',
            actionLabel: c.action_label || '',
            timestamp: c.sent_at ? new Date(c.sent_at).toISOString() : new Date(c.created_at).toISOString()
          });
        }
      });
    } catch (_) {}

    // 4. Evaluate Dynamic User Account Warnings (Tokens, Wallet, Subscriptions)
    if (email) {
      const userRows = await query('SELECT token_balance, wallet_balance, subscription_plan, role FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
      if (userRows && userRows.length > 0) {
        const u = userRows[0];
        const tBal = Number(u.token_balance ?? 0);
        const wBal = Number(u.wallet_balance ?? 0);

        // Daily bucket key ensures threshold alerts refresh predictably
        const dayBucket = new Date().toISOString().slice(0, 10);

        // A. Token Low or Zero Alert
        if (notifSettings.token_exhausted_enabled && tBal <= 0) {
          const id = `sys_token_zero_${dayBucket}`;
          notifications.push({
            id,
            title: 'AI Tokens Exhausted',
            message: 'You have 0 tokens remaining. Chef AI requests are paused until your tokens are replenished.',
            type: 'urgent',
            isRead: readIds.has(id),
            actionUrl: '/token',
            actionLabel: 'Top Up Tokens',
            timestamp: new Date().toISOString()
          });
        } else if (notifSettings.token_low_enabled && tBal > 0 && tBal <= Number(notifSettings.token_low_threshold ?? 15)) {
          const id = `sys_token_low_${dayBucket}`;
          notifications.push({
            id,
            title: 'Token Balance Running Low',
            message: `You have ${tBal} AI tokens left. Add tokens now to keep creating recipes uninterrupted.`,
            type: 'warning',
            isRead: readIds.has(id),
            actionUrl: '/token',
            actionLabel: 'Get Tokens',
            timestamp: new Date().toISOString()
          });
        }

        // B. Wallet Balance Low Alert
        if (notifSettings.wallet_low_enabled && wBal <= Number(notifSettings.wallet_low_threshold ?? 5.0)) {
          const id = `sys_wallet_low_${dayBucket}`;
          notifications.push({
            id,
            title: 'Store Wallet Funds Low',
            message: `Your wallet balance is $${wBal.toFixed(2)}. Add funds to ensure seamless tool purchases and renewals.`,
            type: 'warning',
            isRead: readIds.has(id),
            actionUrl: '/wallet',
            actionLabel: 'Top Up Wallet',
            timestamp: new Date().toISOString()
          });
        }

        // C. Subscription Expiry Warning
        if (notifSettings.subscription_expiry_enabled && u.subscription_plan && u.subscription_plan !== 'taster' && u.subscription_plan !== 'free') {
          try {
            const txRows = await query(`
              SELECT expiry_date, plan_name FROM payment_transactions
              WHERE LOWER(customer_email) = $1 AND LOWER(status) IN ('succeeded', 'active')
              ORDER BY created_at DESC LIMIT 1
            `, [email]);

            if (txRows && txRows.length > 0 && txRows[0].expiry_date) {
              const exp = new Date(txRows[0].expiry_date);
              const now = new Date();
              const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const alertDays = Number(notifSettings.subscription_expiry_days ?? 3);

              if (diffDays <= alertDays) {
                const id = `sys_sub_expiry_${dayBucket}`;
                notifications.push({
                  id,
                  title: diffDays <= 0 ? 'Subscription Expired' : 'Subscription Renewal Reminder',
                  message: diffDays <= 0
                    ? `Your ${txRows[0].plan_name || 'Membership'} has expired. Choose a tier to keep your premium benefits.`
                    : `Your ${txRows[0].plan_name || 'Membership'} will renew in ${diffDays} day(s) on ${exp.toLocaleDateString()}.`,
                  type: diffDays <= 0 ? 'urgent' : 'info',
                  isRead: readIds.has(id),
                  actionUrl: '/subscriptions',
                  actionLabel: 'Manage Plan',
                  timestamp: new Date().toISOString()
                });
              }
            }
          } catch (_) {}
        }
      }
    }

    // 5. Default Welcome Alert if no notifications exist
    if (notifications.length === 0) {
      const welcomeId = 'sys_welcome_alert';
      notifications.push({
        id: welcomeId,
        title: '🎉 Welcome to Zecratary!',
        message: 'Your culinary portal is fully connected with live PostgreSQL storage and AI tools.',
        type: 'success',
        isRead: readIds.has(welcomeId),
        actionUrl: '/chef',
        actionLabel: 'Try Chef AI',
        timestamp: new Date().toISOString()
      });
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      settings: {
        isEnabled: Boolean(notifSettings.is_enabled),
        inAppEnabled: Boolean(notifSettings.in_app_enabled),
        soundEnabled: Boolean(notifSettings.sound_enabled),
        quietHoursEnabled: Boolean(notifSettings.quiet_hours_enabled),
        quietHoursStart: notifSettings.quiet_hours_start || '22:00',
        quietHoursEnd: notifSettings.quiet_hours_end || '07:00'
      }
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureNotificationReadTable();
    const body = await req.json();
    const action = body.action;
    const email = (body.email || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ success: false, error: 'User email is required' }, { status: 400 });
    }

    if (action === 'mark_read') {
      const notifId = body.notificationId;
      if (notifId) {
        await query(`
          INSERT INTO user_notification_reads (user_email, notification_id, read_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_email, notification_id) DO UPDATE SET read_at = NOW()
        `, [email, notifId]);
      }
      return NextResponse.json({ success: true, message: 'Notification marked as read in PostgreSQL.' });
    }

    if (action === 'mark_all_read') {
      const ids: string[] = Array.isArray(body.notificationIds) ? body.notificationIds : [];
      for (const id of ids) {
        if (id) {
          await query(`
            INSERT INTO user_notification_reads (user_email, notification_id, read_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_email, notification_id) DO NOTHING
          `, [email, id]);
        }
      }
      return NextResponse.json({ success: true, message: 'All notifications marked as read in PostgreSQL.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
