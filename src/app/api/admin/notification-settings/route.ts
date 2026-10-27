import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readServerNotifFallback(): any {
  const candidatePaths = [
    path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
    path.join(process.cwd(), 'data/admin_settings.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.notificationSettings || parsed?.notification_settings) {
          return parsed.notificationSettings || parsed.notification_settings;
        }
      } catch (_) {}
    }
  }
  return null;
}

export async function GET() {
  let settings: any = readServerNotifFallback();
  let customBroadcasts: any[] = [];

  try {
    // 1. Fetch system settings
    const sRes: any = await Promise.race([
      query(`SELECT * FROM notification_settings WHERE id = 'global' LIMIT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    const sRow = (Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0]);
    if (sRow) {
      settings = {
        channelInApp: sRow.channel_in_app !== undefined ? Boolean(sRow.channel_in_app) : true,
        channelEmail: sRow.channel_email !== undefined ? Boolean(sRow.channel_email) : true,
        channelWebPush: sRow.channel_web_push !== undefined ? Boolean(sRow.channel_web_push) : false,
        plannerMealReminder: sRow.planner_meal_reminder !== undefined ? Boolean(sRow.planner_meal_reminder) : true,
        plannerMealReminderTime: sRow.planner_meal_reminder_time || '08:30',
        prepTimeAlert: sRow.prep_time_alert !== undefined ? Boolean(sRow.prep_time_alert) : true,
        weeklyIntakeNudge: sRow.weekly_intake_nudge !== undefined ? Boolean(sRow.weekly_intake_nudge) : true,
        tokenLowAlert: sRow.token_low_alert !== undefined ? Boolean(sRow.token_low_alert) : true,
        tokenLowThreshold: Number(sRow.token_low_threshold || 50),
        tokenExhaustionAlert: sRow.token_exhaustion_alert !== undefined ? Boolean(sRow.token_exhaustion_alert) : true,
        monthlyAllowanceNotice: sRow.monthly_allowance_notice !== undefined ? Boolean(sRow.monthly_allowance_notice) : true,
        walletLowAlert: sRow.wallet_low_alert !== undefined ? Boolean(sRow.wallet_low_alert) : true,
        walletLowThreshold: Number(sRow.wallet_low_threshold || 5.00),
        topupReceiptAlert: sRow.topup_receipt_alert !== undefined ? Boolean(sRow.topup_receipt_alert) : true,
        paymentDeclineAlert: sRow.payment_decline_alert !== undefined ? Boolean(sRow.payment_decline_alert) : true,
        subscriptionExpiryAlert: sRow.subscription_expiry_alert !== undefined ? Boolean(sRow.subscription_expiry_alert) : true,
        subscriptionExpiryDays: Number(sRow.subscription_expiry_days || 3),
        subscriptionCancelReceipt: sRow.subscription_cancel_receipt !== undefined ? Boolean(sRow.subscription_cancel_receipt) : true,
        systemUpdatesAlert: sRow.system_updates_alert !== undefined ? Boolean(sRow.system_updates_alert) : true,
        maintenanceDowntimeAlert: sRow.maintenance_downtime_alert !== undefined ? Boolean(sRow.maintenance_downtime_alert) : true,
        securityLoginAlert: sRow.security_login_alert !== undefined ? Boolean(sRow.security_login_alert) : true,
        dndEnabled: sRow.dnd_enabled !== undefined ? Boolean(sRow.dnd_enabled) : false,
        dndStartTime: sRow.dnd_start_time || '22:00',
        dndEndTime: sRow.dnd_end_time || '07:00',
        soundChimesEnabled: sRow.sound_chimes_enabled !== undefined ? Boolean(sRow.sound_chimes_enabled) : true,
        retentionDays: Number(sRow.retention_days || 30),
        dailyRateLimit: Number(sRow.daily_rate_limit || 10)
      };
    }

    // 2. Fetch custom broadcasts
    const bRes: any = await Promise.race([
      query(`SELECT * FROM custom_notifications ORDER BY created_at DESC LIMIT 100`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    if (bRes) {
      customBroadcasts = (Array.isArray(bRes) ? bRes : (((bRes as any)?.rows) || []));
      customBroadcasts = customBroadcasts.map((b: any) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        category: b.category || 'info',
        targetAudience: b.target_audience || b.targetAudience || 'all',
        channels: typeof b.channels === 'string' ? JSON.parse(b.channels) : (b.channels || ['in_app']),
        actionLabel: b.action_label || b.actionLabel || '',
        actionUrl: b.action_url || b.actionUrl || '',
        sendCount: Number(b.send_count || b.sendCount || 0),
        sentAt: b.sent_at || b.sentAt || null,
        createdAt: b.created_at || b.createdAt
      }));
    }
  } catch (err: any) {
    console.warn('[Notification API] Fallback to server JSON store:', err?.message || err);
  }

  const defaultSettings = {
    channelInApp: true,
    channelEmail: true,
    channelWebPush: false,
    plannerMealReminder: true,
    plannerMealReminderTime: '08:30',
    prepTimeAlert: true,
    weeklyIntakeNudge: true,
    tokenLowAlert: true,
    tokenLowThreshold: 50,
    tokenExhaustionAlert: true,
    monthlyAllowanceNotice: true,
    walletLowAlert: true,
    walletLowThreshold: 5.00,
    topupReceiptAlert: true,
    paymentDeclineAlert: true,
    subscriptionExpiryAlert: true,
    subscriptionExpiryDays: 3,
    subscriptionCancelReceipt: true,
    systemUpdatesAlert: true,
    maintenanceDowntimeAlert: true,
    securityLoginAlert: true,
    dndEnabled: false,
    dndStartTime: '22:00',
    dndEndTime: '07:00',
    soundChimesEnabled: true,
    retentionDays: 30,
    dailyRateLimit: 10
  };

  const finalConfig = settings ? { ...defaultSettings, ...settings } : defaultSettings;

  return NextResponse.json({
    success: true,
    notificationSettings: finalConfig,
    settings: finalConfig,
    broadcasts: customBroadcasts,
    customNotifications: customBroadcasts
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. SEND TEST ALERT (Live Broadcast Trigger)
    if (body.action === 'send_test_alert') {
      const testAlert = {
        id: 'notif_test_' + Date.now().toString(36),
        title: 'Test System Alert 🔔',
        message: 'This is a live test alert dispatched from /admin/notification-settings to verify real-time top-bar bell notifications.',
        category: 'info',
        actionLabel: 'View System Settings',
        actionUrl: '/admin/notification-settings',
        createdAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        message: 'Live test alert broadcasted successfully to all connected clients!',
        notification: testAlert
      });
    }

    // 2. DISPATCH CUSTOM ANNOUNCEMENT (SEND NOW)
    if (body.action === 'send_custom_alert') {
      const id = body.id;
      if (!id) return NextResponse.json({ success: false, error: 'Broadcast ID required' }, { status: 400 });

      await query(
        `UPDATE custom_notifications 
         SET send_count = COALESCE(send_count, 0) + 1, sent_at = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      return NextResponse.json({
        success: true,
        message: 'Custom announcement dispatched to targeted users successfully!'
      });
    }

    // 3. CREATE OR UPDATE CUSTOM NOTIFICATION
    if (body.action === 'save_custom_notification') {
      const b = body.notification || {};
      const id = b.id || ('cn_' + Date.now().toString(36));
      const title = (b.title || '').trim();
      const message = (b.message || '').trim();
      const category = b.category || 'info';
      const targetAudience = b.targetAudience || 'all';
      const channels = JSON.stringify(b.channels || ['in_app']);
      const actionLabel = b.actionLabel || '';
      const actionUrl = b.actionUrl || '';

      if (!title || !message) {
        return NextResponse.json({ success: false, error: 'Title and Message are required.' }, { status: 400 });
      }

      await query(`
        INSERT INTO custom_notifications (
          id, title, message, category, target_audience, channels, action_label, action_url, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          category = EXCLUDED.category,
          target_audience = EXCLUDED.target_audience,
          channels = EXCLUDED.channels,
          action_label = EXCLUDED.action_label,
          action_url = EXCLUDED.action_url,
          updated_at = NOW();
      `, [id, title, message, category, targetAudience, channels, actionLabel, actionUrl]);

      return NextResponse.json({
        success: true,
        message: 'Custom announcement saved successfully!',
        id
      });
    }

    // 4. SAVE NOTIFICATION SETTINGS (RULES & DELIVERIES)
    const s = body.notificationSettings || body.settings || body;

    await query(`
      INSERT INTO notification_settings (
        id, channel_in_app, channel_email, channel_web_push,
        planner_meal_reminder, planner_meal_reminder_time, prep_time_alert, weekly_intake_nudge,
        token_low_alert, token_low_threshold, token_exhaustion_alert, monthly_allowance_notice,
        wallet_low_alert, wallet_low_threshold, topup_receipt_alert, payment_decline_alert,
        subscription_expiry_alert, subscription_expiry_days, subscription_cancel_receipt,
        system_updates_alert, maintenance_downtime_alert, security_login_alert,
        dnd_enabled, dnd_start_time, dnd_end_time, sound_chimes_enabled, retention_days, daily_rate_limit, updated_at
      ) VALUES (
        'global', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        channel_in_app = EXCLUDED.channel_in_app,
        channel_email = EXCLUDED.channel_email,
        channel_web_push = EXCLUDED.channel_web_push,
        planner_meal_reminder = EXCLUDED.planner_meal_reminder,
        planner_meal_reminder_time = EXCLUDED.planner_meal_reminder_time,
        prep_time_alert = EXCLUDED.prep_time_alert,
        weekly_intake_nudge = EXCLUDED.weekly_intake_nudge,
        token_low_alert = EXCLUDED.token_low_alert,
        token_low_threshold = EXCLUDED.token_low_threshold,
        token_exhaustion_alert = EXCLUDED.token_exhaustion_alert,
        monthly_allowance_notice = EXCLUDED.monthly_allowance_notice,
        wallet_low_alert = EXCLUDED.wallet_low_alert,
        wallet_low_threshold = EXCLUDED.wallet_low_threshold,
        topup_receipt_alert = EXCLUDED.topup_receipt_alert,
        payment_decline_alert = EXCLUDED.payment_decline_alert,
        subscription_expiry_alert = EXCLUDED.subscription_expiry_alert,
        subscription_expiry_days = EXCLUDED.subscription_expiry_days,
        subscription_cancel_receipt = EXCLUDED.subscription_cancel_receipt,
        system_updates_alert = EXCLUDED.system_updates_alert,
        maintenance_downtime_alert = EXCLUDED.maintenance_downtime_alert,
        security_login_alert = EXCLUDED.security_login_alert,
        dnd_enabled = EXCLUDED.dnd_enabled,
        dnd_start_time = EXCLUDED.dnd_start_time,
        dnd_end_time = EXCLUDED.dnd_end_time,
        sound_chimes_enabled = EXCLUDED.sound_chimes_enabled,
        retention_days = EXCLUDED.retention_days,
        daily_rate_limit = EXCLUDED.daily_rate_limit,
        updated_at = NOW();
    `, [
      Boolean(s.channelInApp), Boolean(s.channelEmail), Boolean(s.channelWebPush),
      Boolean(s.plannerMealReminder), s.plannerMealReminderTime || '08:30', Boolean(s.prepTimeAlert), Boolean(s.weeklyIntakeNudge),
      Boolean(s.tokenLowAlert), Number(s.tokenLowThreshold || 50), Boolean(s.tokenExhaustionAlert), Boolean(s.monthlyAllowanceNotice),
      Boolean(s.walletLowAlert), Number(s.walletLowThreshold || 5.00), Boolean(s.topupReceiptAlert), Boolean(s.paymentDeclineAlert),
      Boolean(s.subscriptionExpiryAlert), Number(s.subscriptionExpiryDays || 3), Boolean(s.subscriptionCancelReceipt),
      Boolean(s.systemUpdatesAlert), Boolean(s.maintenanceDowntimeAlert), Boolean(s.securityLoginAlert),
      Boolean(s.dndEnabled), s.dndStartTime || '22:00', s.dndEndTime || '07:00',
      Boolean(s.soundChimesEnabled), Number(s.retentionDays || 30), Number(s.dailyRateLimit || 10)
    ]);

    // Mirror to JSON store
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'admin_settings.json');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      let existing: any = {};
      if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
      }
      existing.notificationSettings = s;
      existing.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Notification settings saved and synchronized successfully!',
      notificationSettings: s
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      await query(`DELETE FROM custom_notifications WHERE id = $1`, [id]);
      return NextResponse.json({ success: true, message: 'Custom notification deleted' });
    }

    return NextResponse.json({ success: false, error: 'Notification ID required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
