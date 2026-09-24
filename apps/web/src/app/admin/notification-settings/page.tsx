'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, BellRing, Save, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw,
  Mail, Smartphone, Calendar, ShoppingCart, ChefHat, Coins, Wallet,
  Sparkles, ShieldCheck, AlertTriangle, Send, Sliders, Info, ShieldAlert,
  Clock, Check
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface NotificationSettingsState {
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
}

export default function AdminNotificationSettingsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active sub-tab: 'all' | 'reminders' | 'tokens' | 'wallet' | 'system'
  const [activeTab, setActiveTab] = useState<'all' | 'reminders' | 'tokens' | 'wallet' | 'system'>('all');

  const [settings, setSettings] = useState<NotificationSettingsState>({
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
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notification-settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = <K extends keyof NotificationSettingsState>(key: K, value: NotificationSettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed saving notification settings');
      }

      setSuccessMsg(t('notifSettingsSaved', 'Notification configurations saved to PostgreSQL!'));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_notification_settings_updated'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTesting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Test notification delivery failed');
      }

      setSuccessMsg(t('testNotifSent', 'Test notification triggered! Check your top bar notification bell.'));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_new_notification', {
          detail: {
            title: 'Test System Alert',
            message: 'Notification subsystem is operating normally in PostgreSQL.',
            timestamp: new Date().toISOString(),
            type: 'system'
          }
        }));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed sending test alert');
    } finally {
      setTesting(false);
    }
  };

  // Reusable custom switch component that strictly avoids <form> submissions
  const renderToggle = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (val: boolean) => void,
    icon?: React.ReactNode,
    extraControls?: React.ReactNode
  ) => {
    return (
      <div 
        className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start gap-3 flex-1">
          {icon && (
            <div 
              className="p-2 rounded-xl shrink-0 mt-0.5"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' }}
            >
              {icon}
            </div>
          )}
          <div className="space-y-0.5">
            <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
              {label}
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {description}
            </p>
            {extraControls && <div className="pt-2">{extraControls}</div>}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 self-end sm:self-center ${
            checked ? 'bg-emerald-500' : 'bg-slate-600/40'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen p-8 flex items-center justify-center font-sans transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <span className="text-xs font-bold">{t('loadingNotifSettings', 'Loading Notification Settings...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6 pt-4 font-sans transition-colors duration-200 min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <BellRing className="h-6 w-6 text-amber-500" /> {t('adminNotifTitle', 'Notification Settings')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('adminNotifSubtitle', 'Configure reminders for meal planners, token depletion warnings, wallet balance limits, renewal notices, and updates.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={testing}
            className="px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('testNotifBtnDesc', 'Trigger a test broadcast to verify user notification delivery')}
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin text-amber-500" /> : <Send className="h-4 w-4 text-amber-500" />}
            <span>{t('testAlertBtn', 'Send Test Alert')}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> {t('saving', 'Saving to PostgreSQL...')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {t('saveConfigurations', 'Save Configurations')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)' }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Section 1: Master Dispatcher & Delivery Channels */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('masterDispatchHeading', 'Master Dispatcher & Communication Channels')}
            </h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e) => updateSetting('isEnabled', e.target.checked)}
              className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <span style={{ color: settings.isEnabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
              {settings.isEnabled ? t('systemActive', 'Notifications Enabled') : t('systemPaused', 'All Paused')}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {renderToggle(
            t('inAppChannel', 'In-App Alerts'),
            t('inAppChannelDesc', 'Render notifications in the top bar bell dropdown and system flyouts.'),
            settings.inAppEnabled,
            (val) => updateSetting('inAppEnabled', val),
            <Bell className="h-4 w-4" />
          )}

          {renderToggle(
            t('emailChannel', 'Email Dispatch'),
            t('emailChannelDesc', 'Send transactional emails for critical warnings, renewals, and low balances.'),
            settings.emailEnabled,
            (val) => updateSetting('emailEnabled', val),
            <Mail className="h-4 w-4" />
          )}

          {renderToggle(
            t('pushChannel', 'Browser Push Alerts'),
            t('pushChannelDesc', 'Broadcast native Web Push notifications directly to subscriber desktops/mobiles.'),
            settings.pushEnabled,
            (val) => updateSetting('pushEnabled', val),
            <Smartphone className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200 overflow-x-auto"
        style={{
          backgroundColor: 'var(--color-inner-dark)',
          borderColor: 'var(--color-border)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'all' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'all' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>{t('tabAllAlerts', 'All Notifications')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'reminders' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'reminders' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{t('tabPlannerReminders', 'Planner & Reminders')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'tokens' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'tokens' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Coins className="h-3.5 w-3.5" />
          <span>{t('tabTokenAlerts', 'Token Quotas')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'wallet' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'wallet' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Wallet className="h-3.5 w-3.5" />
          <span>{t('tabWalletRenewals', 'Wallet & Billing')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'system' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'system' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t('tabUpdatesSecurity', 'Updates & Security')}</span>
        </button>
      </div>

      {/* Category 1: Reminders & Meal Planner */}
      {(activeTab === 'all' || activeTab === 'reminders') && (
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <Calendar className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('plannerRemindersHeading', 'Meal Planner & Routine Reminders')}
            </h2>
          </div>

          <div className="space-y-3">
            {renderToggle(
              t('dailyMealPlannerAlert', 'Daily Meal Planner Reminder'),
              t('dailyMealPlannerAlertDesc', 'Prompt users with their scheduled dinner/lunch menu and prep checklist.'),
              settings.reminderMealPlanner,
              (val) => updateSetting('reminderMealPlanner', val),
              <ChefHat className="h-4 w-4 text-emerald-500" />,
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('reminderTimeLabel', 'Dispatch Time:')}
                </span>
                <input
                  type="time"
                  value={settings.reminderMealTime}
                  onChange={(e) => updateSetting('reminderMealTime', e.target.value)}
                  className="px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            )}

            {renderToggle(
              t('groceryListAlert', 'Grocery & Shopping Day Reminders'),
              t('groceryListAlertDesc', 'Remind users about missing ingredients for upcoming planned meals.'),
              settings.reminderGroceryList,
              (val) => updateSetting('reminderGroceryList', val),
              <ShoppingCart className="h-4 w-4 text-blue-400" />
            )}

            {renderToggle(
              t('prepAlerts', 'Recipe Defrosting & Advance Prep Alerts'),
              t('prepAlertsDesc', 'Send advance notices when recipes require marinating or defrosting 4-8 hours prior.'),
              settings.reminderPrepAlerts,
              (val) => updateSetting('reminderPrepAlerts', val),
              <Clock className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </div>
      )}

      {/* Category 2: AI Token Quota Warnings */}
      {(activeTab === 'all' || activeTab === 'tokens') && (
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <Coins className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('tokenAlertsHeading', 'AI Token & Quota Reminders')}
            </h2>
          </div>

          <div className="space-y-3">
            {renderToggle(
              t('tokenLowAlert', 'Token Balance Running Low'),
              t('tokenLowAlertDesc', 'Warn users before they run out of tokens for /chef AI Chat or /import scraping.'),
              settings.tokenLowEnabled,
              (val) => updateSetting('tokenLowEnabled', val),
              <Coins className="h-4 w-4 text-amber-500" />,
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tokenThresholdLabel', 'Trigger when balance drops below:')}
                </span>
                <input
                  type="number"
                  min="1"
                  value={settings.tokenLowThreshold}
                  onChange={(e) => updateSetting('tokenLowThreshold', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs font-bold text-amber-500">🪙 Tokens</span>
              </div>
            )}

            {renderToggle(
              t('tokenExhaustedAlert', 'Zero Balance / Token Exhaustion Alert'),
              t('tokenExhaustedAlertDesc', 'Immediate alert when a user query fails due to complete token depletion, prompting package top-ups.'),
              settings.tokenExhaustedEnabled,
              (val) => updateSetting('tokenExhaustedEnabled', val),
              <AlertTriangle className="h-4 w-4 text-red-400" />
            )}

            {renderToggle(
              t('tokenMonthlyGrantAlert', 'Monthly Plan Token Grant Notice'),
              t('tokenMonthlyGrantAlertDesc', 'Notify subscribers when their recurring monthly plan token allowance is credited.'),
              settings.tokenMonthlyGrantEnabled,
              (val) => updateSetting('tokenMonthlyGrantEnabled', val),
              <Sparkles className="h-4 w-4 text-purple-400" />
            )}
          </div>
        </div>
      )}

      {/* Category 3: Wallet Funds & Subscription Renewals */}
      {(activeTab === 'all' || activeTab === 'wallet') && (
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <Wallet className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('walletAlertsHeading', 'Wallet Funds & Subscription Renewals')}
            </h2>
          </div>

          <div className="space-y-3">
            {renderToggle(
              t('walletLowAlert', 'Wallet Funds Low Alert'),
              t('walletLowAlertDesc', 'Alert users when store credit dips below the safe threshold required for purchases.'),
              settings.walletLowEnabled,
              (val) => updateSetting('walletLowEnabled', val),
              <Wallet className="h-4 w-4 text-emerald-400" />,
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('walletThresholdLabel', 'Trigger when store balance drops below:')}
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={settings.walletLowThreshold}
                  onChange={(e) => updateSetting('walletLowThreshold', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs font-bold text-emerald-400">$ USD</span>
              </div>
            )}

            {renderToggle(
              t('walletTopupAlert', 'Top-Up & Deposit Confirmation'),
              t('walletTopupAlertDesc', 'Dispatch immediate receipts and confirmation notices when store wallet funds are credited.'),
              settings.walletTopupConfirmEnabled,
              (val) => updateSetting('walletTopupConfirmEnabled', val),
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}

            {renderToggle(
              t('subscriptionExpiryAlert', 'Recurring Plan 3-Day Expiry & Renewal Notice'),
              t('subscriptionExpiryAlertDesc', 'Notify subscribers in advance before recurring billing cycles or expiration.'),
              settings.subscriptionExpiryEnabled,
              (val) => updateSetting('subscriptionExpiryEnabled', val),
              <Calendar className="h-4 w-4 text-amber-400" />,
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('advanceDaysLabel', 'Notify prior by:')}
                </span>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={settings.subscriptionExpiryDays}
                  onChange={(e) => updateSetting('subscriptionExpiryDays', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>days</span>
              </div>
            )}

            {renderToggle(
              t('paymentFailedAlert', 'Payment Failed / Renewal Error Notice'),
              t('paymentFailedAlertDesc', 'Immediately alert users when automatic card renewals fail, providing a direct link to update payment methods.'),
              settings.paymentFailedAlert,
              (val) => updateSetting('paymentFailedAlert', val),
              <ShieldAlert className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      )}

      {/* Category 4: Platform Updates & Security */}
      {(activeTab === 'all' || activeTab === 'system') && (
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('updatesSecurityHeading', 'Platform Releases, Digest & Security Alerts')}
            </h2>
          </div>

          <div className="space-y-3">
            {renderToggle(
              t('newUpdatesAlert', 'New Feature Announcements & Releases'),
              t('newUpdatesAlertDesc', 'Broadcast announcements when major AI engine versions or culinary tools are deployed.'),
              settings.newUpdatesEnabled,
              (val) => updateSetting('newUpdatesEnabled', val),
              <Sparkles className="h-4 w-4 text-amber-400" />
            )}

            {renderToggle(
              t('securityAlert', 'Security & New Device Login Alerts'),
              t('securityAlertDesc', 'Notify users when their account is accessed from an unfamiliar IP address or device.'),
              settings.securityAlertsEnabled,
              (val) => updateSetting('securityAlertsEnabled', val),
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            )}

            {renderToggle(
              t('weeklyDigestAlert', 'Weekly Nutrition & Activity Digest'),
              t('weeklyDigestAlertDesc', 'Send a weekend email summarizing meals cooked, tokens utilized, and meal planning metrics.'),
              settings.weeklyDigestEnabled,
              (val) => updateSetting('weeklyDigestEnabled', val),
              <Mail className="h-4 w-4 text-purple-400" />
            )}

            {renderToggle(
              t('maintenanceAlert', 'Scheduled Maintenance Notices'),
              t('maintenanceAlertDesc', 'Alert users 24 hours prior to scheduled server or database maintenance.'),
              settings.maintenanceNoticeEnabled,
              (val) => updateSetting('maintenanceNoticeEnabled', val),
              <Info className="h-4 w-4 text-cyan-400" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
