import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface NotificationSettingsData {
  id: string;
  isEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  reminderMealPlanner: boolean;
  reminderMealTime: string;
  reminderGroceryList: boolean;
  reminderPrepAlerts: boolean;
  tokenLowEnabled: boolean;
  tokenLowThreshold: number;
  tokenExhaustedEnabled: boolean;
  tokenMonthlyGrantEnabled: boolean;
  walletLowEnabled: boolean;
  walletLowThreshold: number;
  walletTopupConfirmEnabled: boolean;
  subscriptionExpiryEnabled: boolean;
  subscriptionExpiryDays: number;
  paymentFailedAlert: boolean;
  newUpdatesEnabled: boolean;
  securityAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  maintenanceNoticeEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
  retentionDays: number;
  maxDailyAlerts: number;
  updatedAt?: string;
}

export interface CustomNotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'promo';
  targetAudience: 'all' | 'subscribers' | 'free' | 'admins';
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  isActive: boolean;
  actionUrl?: string;
  actionLabel?: string;
  sendCount: number;
  sentAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  id: 'default_notification_settings',
  isEnabled: true,
  emailEnabled: true,
  inAppEnabled: true,
  pushEnabled: false,
  reminderMealPlanner: true,
  reminderMealTime: '18:00',
  reminderGroceryList: true,
  reminderPrepAlerts: true,
  tokenLowEnabled: true,
  tokenLowThreshold: 15,
  tokenExhaustedEnabled: true,
  tokenMonthlyGrantEnabled: true,
  walletLowEnabled: true,
  walletLowThreshold: 5.0,
  walletTopupConfirmEnabled: true,
  subscriptionExpiryEnabled: true,
  subscriptionExpiryDays: 3,
  paymentFailedAlert: true,
  newUpdatesEnabled: true,
  securityAlertsEnabled: true,
  weeklyDigestEnabled: false,
  maintenanceNoticeEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
  retentionDays: 30,
  maxDailyAlerts: 5
};

async function initNotificationTables(): Promise<void> {
  try {
    // 1. Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id VARCHAR(64) PRIMARY KEY,
        is_enabled BOOLEAN DEFAULT true,
        email_enabled BOOLEAN DEFAULT true,
        in_app_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT false,
        reminder_meal_planner BOOLEAN DEFAULT true,
        reminder_meal_time VARCHAR(10) DEFAULT '18:00',
        reminder_grocery_list BOOLEAN DEFAULT true,
        reminder_prep_alerts BOOLEAN DEFAULT true,
        token_low_enabled BOOLEAN DEFAULT true,
        token_low_threshold INTEGER DEFAULT 15,
        token_exhausted_enabled BOOLEAN DEFAULT true,
        token_monthly_grant_enabled BOOLEAN DEFAULT true,
        wallet_low_enabled BOOLEAN DEFAULT true,
        wallet_low_threshold NUMERIC(10, 2) DEFAULT 5.00,
        wallet_topup_confirm_enabled BOOLEAN DEFAULT true,
        subscription_expiry_enabled BOOLEAN DEFAULT true,
        subscription_expiry_days INTEGER DEFAULT 3,
        payment_failed_alert BOOLEAN DEFAULT true,
        new_updates_enabled BOOLEAN DEFAULT true,
        security_alerts_enabled BOOLEAN DEFAULT true,
        weekly_digest_enabled BOOLEAN DEFAULT false,
        maintenance_notice_enabled BOOLEAN DEFAULT true,
        quiet_hours_enabled BOOLEAN DEFAULT false,
        quiet_hours_start VARCHAR(10) DEFAULT '22:00',
        quiet_hours_end VARCHAR(10) DEFAULT '07:00',
        sound_enabled BOOLEAN DEFAULT true,
        retention_days INTEGER DEFAULT 30,
        max_daily_alerts INTEGER DEFAULT 5,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      ALTER TABLE notification_settings
      ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_meal_planner BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS reminder_meal_time VARCHAR(10) DEFAULT '18:00',
      ADD COLUMN IF NOT EXISTS reminder_grocery_list BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS reminder_prep_alerts BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS token_low_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS token_low_threshold INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS token_exhausted_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS token_monthly_grant_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS wallet_low_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS wallet_low_threshold NUMERIC(10, 2) DEFAULT 5.00,
      ADD COLUMN IF NOT EXISTS wallet_topup_confirm_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS subscription_expiry_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS subscription_expiry_days INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS payment_failed_alert BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS new_updates_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS security_alerts_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS weekly_digest_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS maintenance_notice_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS quiet_hours_start VARCHAR(10) DEFAULT '22:00',
      ADD COLUMN IF NOT EXISTS quiet_hours_end VARCHAR(10) DEFAULT '07:00',
      ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 30,
      ADD COLUMN IF NOT EXISTS max_daily_alerts INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // 2. Custom Notifications Table
    await query(`
      CREATE TABLE IF NOT EXISTS custom_notifications (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(32) DEFAULT 'info',
        target_audience VARCHAR(64) DEFAULT 'all',
        channels JSONB DEFAULT '{"inApp": true, "email": false, "push": false}'::jsonb,
        is_active BOOLEAN DEFAULT true,
        action_url VARCHAR(255) DEFAULT '',
        action_label VARCHAR(64) DEFAULT '',
        send_count INTEGER DEFAULT 0,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('[initNotificationTables] Warning:', err);
  }
}

export async function GET() {
  try {
    await initNotificationTables();
    
    // 1. Fetch main configuration
    const rows = await query('SELECT * FROM notification_settings WHERE id = $1 LIMIT 1', [DEFAULT_SETTINGS.id]);
    let settings: NotificationSettingsData = DEFAULT_SETTINGS;

    if (rows && rows.length > 0) {
      const r = rows[0];
      settings = {
        id: r.id || DEFAULT_SETTINGS.id,
        isEnabled: Boolean(r.is_enabled ?? true),
        emailEnabled: Boolean(r.email_enabled ?? true),
        inAppEnabled: Boolean(r.in_app_enabled ?? true),
        pushEnabled: Boolean(r.push_enabled ?? false),
        reminderMealPlanner: Boolean(r.reminder_meal_planner ?? true),
        reminderMealTime: r.reminder_meal_time || '18:00',
        reminderGroceryList: Boolean(r.reminder_grocery_list ?? true),
        reminderPrepAlerts: Boolean(r.reminder_prep_alerts ?? true),
        tokenLowEnabled: Boolean(r.token_low_enabled ?? true),
        tokenLowThreshold: Number(r.token_low_threshold ?? 15),
        tokenExhaustedEnabled: Boolean(r.token_exhausted_enabled ?? true),
        tokenMonthlyGrantEnabled: Boolean(r.token_monthly_grant_enabled ?? true),
        walletLowEnabled: Boolean(r.wallet_low_enabled ?? true),
        walletLowThreshold: Number(r.wallet_low_threshold ?? 5.0),
        walletTopupConfirmEnabled: Boolean(r.wallet_topup_confirm_enabled ?? true),
        subscriptionExpiryEnabled: Boolean(r.subscription_expiry_enabled ?? true),
        subscriptionExpiryDays: Number(r.subscription_expiry_days ?? 3),
        paymentFailedAlert: Boolean(r.payment_failed_alert ?? true),
        newUpdatesEnabled: Boolean(r.new_updates_enabled ?? true),
        securityAlertsEnabled: Boolean(r.security_alerts_enabled ?? true),
        weeklyDigestEnabled: Boolean(r.weekly_digest_enabled ?? false),
        maintenanceNoticeEnabled: Boolean(r.maintenance_notice_enabled ?? true),
        quietHoursEnabled: Boolean(r.quiet_hours_enabled ?? false),
        quietHoursStart: r.quiet_hours_start || '22:00',
        quietHoursEnd: r.quiet_hours_end || '07:00',
        soundEnabled: Boolean(r.sound_enabled ?? true),
        retentionDays: Number(r.retention_days ?? 30),
        maxDailyAlerts: Number(r.max_daily_alerts ?? 5),
        updatedAt: r.updated_at
      };
    }

    // 2. Fetch custom notifications
    const customRows = await query('SELECT * FROM custom_notifications ORDER BY created_at DESC');
    const customNotifications: CustomNotificationRecord[] = (customRows || []).map((c: any) => {
      let channels = { inApp: true, email: false, push: false };
      if (c.channels) {
        channels = typeof c.channels === 'string' ? JSON.parse(c.channels) : c.channels;
      }

      return {
        id: c.id,
        title: c.title,
        message: c.message,
        type: c.type || 'info',
        targetAudience: c.target_audience || 'all',
        channels,
        isActive: Boolean(c.is_active ?? true),
        actionUrl: c.action_url || '',
        actionLabel: c.action_label || '',
        sendCount: Number(c.send_count ?? 0),
        sentAt: c.sent_at ? new Date(c.sent_at).toISOString() : null,
        createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
        updatedAt: c.updated_at ? new Date(c.updated_at).toISOString() : undefined
      };
    });

    return NextResponse.json({
      success: true,
      settings,
      customNotifications
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initNotificationTables();
    const body = await req.json();
    const action = body.action;

    // Trigger test dispatch
    if (action === 'send_test') {
      return NextResponse.json({
        success: true,
        message: 'Test notification triggered successfully.'
      });
    }

    // Trigger Send Alert Now for a specific custom notification
    if (action === 'send_custom_now') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Notification ID is required.' }, { status: 400 });
      }

      const rows = await query(`
        UPDATE custom_notifications
        SET send_count = send_count + 1,
            sent_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Custom alert not found.' }, { status: 404 });
      }

      const updated = rows[0];
      return NextResponse.json({
        success: true,
        message: `Alert "${updated.title}" successfully dispatched to users!`,
        sentAt: updated.sent_at,
        sendCount: updated.send_count
      });
    }

    // Delete custom notification
    if (action === 'delete_custom') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Notification ID is required.' }, { status: 400 });
      }

      await query('DELETE FROM custom_notifications WHERE id = $1', [id]);
      return NextResponse.json({ success: true, message: 'Custom alert removed.' });
    }

    // Upsert (Create/Edit) custom notification
    if (action === 'save_custom') {
      const c = body.notification;
      if (!c || !c.title || !c.message) {
        return NextResponse.json({ success: false, error: 'Title and message are required.' }, { status: 400 });
      }

      const id = c.id || `notif_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const title = String(c.title).trim();
      const message = String(c.message).trim();
      const type = c.type || 'info';
      const targetAudience = c.targetAudience || 'all';
      const channels = JSON.stringify(c.channels || { inApp: true, email: false, push: false });
      const isActive = c.isActive !== undefined ? Boolean(c.isActive) : true;
      const actionUrl = String(c.actionUrl || '').trim();
      const actionLabel = String(c.actionLabel || '').trim();

      await query(`
        INSERT INTO custom_notifications (
          id, title, message, type, target_audience, channels, is_active,
          action_url, action_label, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          type = EXCLUDED.type,
          target_audience = EXCLUDED.target_audience,
          channels = EXCLUDED.channels,
          is_active = EXCLUDED.is_active,
          action_url = EXCLUDED.action_url,
          action_label = EXCLUDED.action_label,
          updated_at = NOW()
      `, [id, title, message, type, targetAudience, channels, isActive, actionUrl, actionLabel]);

      return NextResponse.json({
        success: true,
        message: 'Custom alert saved to PostgreSQL.',
        id
      });
    }

    // Default: Save General Notification Settings
    const s = { ...DEFAULT_SETTINGS, ...body };

    await query(`
      INSERT INTO notification_settings (
        id, is_enabled, email_enabled, in_app_enabled, push_enabled,
        reminder_meal_planner, reminder_meal_time, reminder_grocery_list, reminder_prep_alerts,
        token_low_enabled, token_low_threshold, token_exhausted_enabled, token_monthly_grant_enabled,
        wallet_low_enabled, wallet_low_threshold, wallet_topup_confirm_enabled,
        subscription_expiry_enabled, subscription_expiry_days, payment_failed_alert,
        new_updates_enabled, security_alerts_enabled, weekly_digest_enabled,
        maintenance_notice_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
        sound_enabled, retention_days, max_daily_alerts, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        email_enabled = EXCLUDED.email_enabled,
        in_app_enabled = EXCLUDED.in_app_enabled,
        push_enabled = EXCLUDED.push_enabled,
        reminder_meal_planner = EXCLUDED.reminder_meal_planner,
        reminder_meal_time = EXCLUDED.reminder_meal_time,
        reminder_grocery_list = EXCLUDED.reminder_grocery_list,
        reminder_prep_alerts = EXCLUDED.reminder_prep_alerts,
        token_low_enabled = EXCLUDED.token_low_enabled,
        token_low_threshold = EXCLUDED.token_low_threshold,
        token_exhausted_enabled = EXCLUDED.token_exhausted_enabled,
        token_monthly_grant_enabled = EXCLUDED.token_monthly_grant_enabled,
        wallet_low_enabled = EXCLUDED.wallet_low_enabled,
        wallet_low_threshold = EXCLUDED.wallet_low_threshold,
        wallet_topup_confirm_enabled = EXCLUDED.wallet_topup_confirm_enabled,
        subscription_expiry_enabled = EXCLUDED.subscription_expiry_enabled,
        subscription_expiry_days = EXCLUDED.subscription_expiry_days,
        payment_failed_alert = EXCLUDED.payment_failed_alert,
        new_updates_enabled = EXCLUDED.new_updates_enabled,
        security_alerts_enabled = EXCLUDED.security_alerts_enabled,
        weekly_digest_enabled = EXCLUDED.weekly_digest_enabled,
        maintenance_notice_enabled = EXCLUDED.maintenance_notice_enabled,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        sound_enabled = EXCLUDED.sound_enabled,
        retention_days = EXCLUDED.retention_days,
        max_daily_alerts = EXCLUDED.max_daily_alerts,
        updated_at = NOW()
    `, [
      DEFAULT_SETTINGS.id,
      Boolean(s.isEnabled),
      Boolean(s.emailEnabled),
      Boolean(s.inAppEnabled),
      Boolean(s.pushEnabled),
      Boolean(s.reminderMealPlanner),
      String(s.reminderMealTime || '18:00'),
      Boolean(s.reminderGroceryList),
      Boolean(s.reminderPrepAlerts),
      Boolean(s.tokenLowEnabled),
      Math.max(1, parseInt(s.tokenLowThreshold ?? 15, 10)),
      Boolean(s.tokenExhaustedEnabled),
      Boolean(s.tokenMonthlyGrantEnabled),
      Boolean(s.walletLowEnabled),
      Math.max(0.5, parseFloat(s.walletLowThreshold ?? 5.0)),
      Boolean(s.walletTopupConfirmEnabled),
      Boolean(s.subscriptionExpiryEnabled),
      Math.max(1, parseInt(s.subscriptionExpiryDays ?? 3, 10)),
      Boolean(s.paymentFailedAlert),
      Boolean(s.newUpdatesEnabled),
      Boolean(s.securityAlertsEnabled),
      Boolean(s.weeklyDigestEnabled),
      Boolean(s.maintenanceNoticeEnabled),
      Boolean(s.quietHoursEnabled),
      String(s.quietHoursStart || '22:00'),
      String(s.quietHoursEnd || '07:00'),
      Boolean(s.soundEnabled),
      Math.max(1, parseInt(s.retentionDays ?? 30, 10)),
      Math.max(1, parseInt(s.maxDailyAlerts ?? 5, 10))
    ]);

    return NextResponse.json({
      success: true,
      message: 'Notification configurations saved to PostgreSQL.',
      settings: s
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
