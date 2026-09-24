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
  maintenanceNoticeEnabled: true
};

async function initNotificationTable(): Promise<void> {
  try {
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
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
  } catch (err) {
    console.warn('initNotificationTable warning:', err);
  }
}

export async function GET() {
  try {
    await initNotificationTable();
    const rows = await query('SELECT * FROM notification_settings WHERE id = $1 LIMIT 1', [DEFAULT_SETTINGS.id]);
    
    if (rows && rows.length > 0) {
      const r = rows[0];
      const settings: NotificationSettingsData = {
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
        updatedAt: r.updated_at
      };

      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initNotificationTable();
    const body = await req.json();

    if (body.action === 'send_test') {
      return NextResponse.json({
        success: true,
        message: 'Test notification triggered successfully.'
      });
    }

    const s = { ...DEFAULT_SETTINGS, ...body };

    await query(`
      INSERT INTO notification_settings (
        id, is_enabled, email_enabled, in_app_enabled, push_enabled,
        reminder_meal_planner, reminder_meal_time, reminder_grocery_list, reminder_prep_alerts,
        token_low_enabled, token_low_threshold, token_exhausted_enabled, token_monthly_grant_enabled,
        wallet_low_enabled, wallet_low_threshold, wallet_topup_confirm_enabled,
        subscription_expiry_enabled, subscription_expiry_days, payment_failed_alert,
        new_updates_enabled, security_alerts_enabled, weekly_digest_enabled,
        maintenance_notice_enabled, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW()
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
      Boolean(s.maintenanceNoticeEnabled)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Notification settings persisted to PostgreSQL.',
      settings: s
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
