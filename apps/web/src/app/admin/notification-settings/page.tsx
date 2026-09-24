'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bell, BellRing, Save, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw,
  Mail, Smartphone, Calendar, ShoppingCart, ChefHat, Coins, Wallet,
  Sparkles, ShieldCheck, AlertTriangle, Send, Sliders, Info, ShieldAlert,
  Clock, Plus, Trash2, Edit3, X, Users, Megaphone, Volume2, ExternalLink
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
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
  retentionDays: number;
  maxDailyAlerts: number;
}

interface CustomNotification {
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
}

const EMPTY_CUSTOM_MODAL: Omit<CustomNotification, 'createdAt' | 'sendCount'> = {
  id: '',
  title: '',
  message: '',
  type: 'info',
  targetAudience: 'all',
  channels: {
    inApp: true,
    email: false,
    push: false
  },
  isActive: true,
  actionUrl: '',
  actionLabel: ''
};

export default function AdminNotificationSettingsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active sub-tab: 'all' | 'custom' | 'reminders' | 'tokens' | 'wallet' | 'system' | 'rules'
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'reminders' | 'tokens' | 'wallet' | 'system' | 'rules'>('custom');

  // General Settings State
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
    maintenanceNoticeEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    soundEnabled: true,
    retentionDays: 30,
    maxDailyAlerts: 5
  });

  // Custom Notifications List & Modal State
  const [customNotifications, setCustomNotifications] = useState<CustomNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<typeof EMPTY_CUSTOM_MODAL>(EMPTY_CUSTOM_MODAL);
  const [savingCustom, setSavingCustom] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSettingsAndAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notification-settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        if (Array.isArray(data.customNotifications)) setCustomNotifications(data.customNotifications);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsAndAlerts();
  }, [fetchSettingsAndAlerts]);

  const updateSetting = <K extends keyof NotificationSettingsState>(key: K, value: NotificationSettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
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

      setSuccessMsg(t('testNotifSent', 'Test alert broadcasted! Check your top bar notification bell.'));
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

  // Custom Notifications Actions
  const handleOpenCreateModal = () => {
    setModalForm({
      ...EMPTY_CUSTOM_MODAL,
      id: `alert_${Date.now().toString(36)}`
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CustomNotification) => {
    setModalForm({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      targetAudience: item.targetAudience,
      channels: { ...item.channels },
      isActive: item.isActive,
      actionUrl: item.actionUrl || '',
      actionLabel: item.actionLabel || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomNotification = async () => {
    if (!modalForm.title.trim() || !modalForm.message.trim()) {
      setErrorMsg(t('titleMessageRequired', 'Alert title and message body are required.'));
      return;
    }

    setSavingCustom(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_custom',
          notification: modalForm
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed saving custom alert');
      }

      setSuccessMsg(t('customAlertSaved', 'Custom alert persisted to PostgreSQL!'));
      setIsModalOpen(false);
      await fetchSettingsAndAlerts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save custom alert');
    } finally {
      setSavingCustom(false);
    }
  };

  const handleDeleteCustomNotification = async (id: string, title: string) => {
    if (!confirm(t('confirmDeleteAlert', `Are you sure you want to delete custom alert "${title}"?`))) {
      return;
    }

    setDeletingId(id);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_custom',
          id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed deleting custom alert');
      }

      setCustomNotifications(prev => prev.filter(c => c.id !== id));
      setSuccessMsg(t('customAlertDeleted', 'Custom alert deleted successfully.'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete custom alert');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendAlertNow = async (item: CustomNotification) => {
    setSendingId(item.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_custom_now',
          id: item.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch custom alert');
      }

      // Update state locally
      setCustomNotifications(prev => prev.map(c => {
        if (c.id === item.id) {
          return {
            ...c,
            sendCount: (c.sendCount || 0) + 1,
            sentAt: data.sentAt || new Date().toISOString()
          };
        }
        return c;
      }));

      // Fire in-app event for immediate top-bar reflection
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_new_notification', {
          detail: {
            title: item.title,
            message: item.message,
            timestamp: new Date().toISOString(),
            type: item.type,
            actionUrl: item.actionUrl,
            actionLabel: item.actionLabel
          }
        }));
      }

      setSuccessMsg(t('alertSentSuccess', `Alert "${item.title}" successfully dispatched to users now!`));
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch alert');
    } finally {
      setSendingId(null);
    }
  };

  const filteredCustomAlerts = useMemo(() => {
    if (!searchQuery.trim()) return customNotifications;
    const q = searchQuery.toLowerCase();
    return customNotifications.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.message.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  }, [customNotifications, searchQuery]);

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

  const getTypeBadge = (type: CustomNotification['type']) => {
    switch (type) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-red-500/15 text-red-500 border border-red-500/30">Urgent</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30">Warning</span>;
      case 'success':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">Success</span>;
      case 'promo':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-500 border border-purple-500/30">Promotion</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">Info</span>;
    }
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
            {t('adminNotifSubtitle', 'Create custom alerts, broadcast notices now, and configure automated reminders for meal planning, token balances, and wallet funds.')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Plus className="h-4 w-4 text-emerald-500" />
            <span>{t('createCustomAlertBtn', 'New Custom Alert')}</span>
          </button>

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
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> {t('saving', 'Saving...')}
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

      {/* Filter Category Tabs */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200 overflow-x-auto gap-1"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'custom' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'custom' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Megaphone className="h-3.5 w-3.5 text-amber-500" />
          <span>{t('tabCustomAlerts', 'Custom Broadcasts')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-500">
            {customNotifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'all' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'all' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>{t('tabAllAlerts', 'All Settings')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
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
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
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
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
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
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
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

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'rules' ? 'border shadow-md' : 'opacity-70'
          }`}
          style={activeTab === 'rules' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{t('tabDeliveryRules', 'Quiet Hours & Rules')}</span>
        </button>
      </div>

      {/* SECTION: CUSTOM NOTIFICATIONS (ADD, EDIT, REMOVE, SEND ALERT NOW) */}
      {(activeTab === 'all' || activeTab === 'custom') && (
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-500" />
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('customAlertsHeading', 'Custom Announcements & Broadcast Alerts')}
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('customAlertsSub', 'Draft custom messages and click "Send Alert Now" to immediately deliver notices to active users.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('searchAlertsPlaceholder', 'Search alerts...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('newAlert', 'New Alert')}</span>
              </button>
            </div>
          </div>

          {filteredCustomAlerts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <Bell className="h-8 w-8 mx-auto opacity-40 text-amber-500" />
              <div className="space-y-1">
                <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{t('noCustomAlertsTitle', 'No Custom Alerts Configured')}</p>
                <p className="text-[11px] opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('noCustomAlertsDesc', 'Create your first custom announcement to send promotional news or maintenance alerts directly to user bells.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer inline-flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('createCustomAlertBtn', 'New Custom Alert')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:border-[var(--color-primary)]/40 shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTypeBadge(alert.type)}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <Users className="h-3 w-3" />
                          <span className="capitalize">{alert.targetAudience}</span>
                        </span>
                        {!alert.isActive && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/20 text-slate-400">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(alert)}
                          className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          title={t('edit', 'Edit Alert')}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === alert.id}
                          onClick={() => handleDeleteCustomNotification(alert.id, alert.title)}
                          className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-50"
                          title={t('delete', 'Remove Alert')}
                        >
                          {deletingId === alert.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                        {alert.title}
                      </h3>
                      <p className="text-[11px] leading-relaxed pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {alert.message}
                      </p>
                    </div>

                    {alert.actionUrl && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                          <ExternalLink className="h-3 w-3" />
                          <span>{alert.actionLabel || alert.actionUrl}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="text-[10px] space-y-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      <div>
                        Sent: <span className="font-mono font-bold text-amber-500">{alert.sendCount || 0} time(s)</span>
                      </div>
                      {alert.sentAt && (
                        <div className="opacity-70">
                          Last: {new Date(alert.sentAt).toLocaleDateString()} {new Date(alert.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={sendingId === alert.id}
                      onClick={() => handleSendAlertNow(alert)}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-emerald)' }}
                      title={t('sendAlertNowDesc', 'Immediately broadcast this notification to users right now')}
                    >
                      {sendingId === alert.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>{t('sendAlertNowBtn', 'Send Alert Now')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION: MASTER CHANNELS */}
      {(activeTab === 'all' || activeTab === 'rules') && (
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
      )}

      {/* SECTION: DELIVERY RULES & QUIET HOURS */}
      {(activeTab === 'all' || activeTab === 'rules') && (
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('deliveryRulesHeading', 'Delivery Rules, Quiet Hours & Throttling')}
            </h2>
          </div>

          <div className="space-y-3">
            {renderToggle(
              t('quietHoursAlert', 'Do Not Disturb / Quiet Hours Window'),
              t('quietHoursAlertDesc', 'Silence non-urgent notifications during nighttime hours to prevent user interruption.'),
              settings.quietHoursEnabled,
              (val) => updateSetting('quietHoursEnabled', val),
              <Clock className="h-4 w-4 text-cyan-400" />,
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>From:</span>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                  className="px-2 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>To:</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                  className="px-2 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            )}

            {renderToggle(
              t('soundChimesAlert', 'Notification Audio Chimes'),
              t('soundChimesAlertDesc', 'Play a subtle audio tone when new priority notifications arrive in the browser.'),
              settings.soundEnabled,
              (val) => updateSetting('soundEnabled', val),
              <Volume2 className="h-4 w-4 text-purple-400" />
            )}

            <div 
              className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
                  {t('retentionDaysLabel', 'Notification Storage Retention Period')}
                </span>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('retentionDaysDesc', 'Automatically purge read user notifications from database after specified days.')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.retentionDays}
                  onChange={(e) => updateSetting('retentionDays', Math.max(1, parseInt(e.target.value) || 30))}
                  className="w-20 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>days</span>
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
                  {t('maxDailyAlertsLabel', 'Maximum Alerts Per User / Day (Rate Limit)')}
                </span>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('maxDailyAlertsDesc', 'Cap the total number of automated non-critical reminders a single user receives daily.')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxDailyAlerts}
                  onChange={(e) => updateSetting('maxDailyAlerts', Math.max(1, parseInt(e.target.value) || 5))}
                  className="w-20 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>alerts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: MEAL PLANNER & ROUTINE */}
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

      {/* SECTION: TOKEN QUOTAS */}
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

      {/* SECTION: WALLET & BILLING */}
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

      {/* SECTION: PLATFORM UPDATES & SECURITY */}
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

      {/* FORMLESS CUSTOM NOTIFICATION MODAL */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-xl rounded-3xl border p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-black tracking-tight">
                  {modalForm.id && customNotifications.some(c => c.id === modalForm.id)
                    ? t('editCustomAlertTitle', 'Edit Custom Alert')
                    : t('createCustomAlertTitle', 'Create New Custom Alert')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg border hover:opacity-80 transition cursor-pointer"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Alert Title */}
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('alertTitleLabel', 'Alert Title')} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flash Weekend Special / Maintenance Notice"
                  value={modalForm.title}
                  onChange={(e) => setModalForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('alertMessageLabel', 'Message Body')} *
                </label>
                <textarea
                  rows={3}
                  placeholder="Write the message text that will display in user notification dropdowns..."
                  value={modalForm.message}
                  onChange={(e) => setModalForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border outline-none font-medium leading-relaxed"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Category & Target Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('alertTypeLabel', 'Category / Priority')}
                  </label>
                  <select
                    value={modalForm.type}
                    onChange={(e) => setModalForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="info">🔵 Info / Announcement</option>
                    <option value="promo">🟣 Promotion / Marketing</option>
                    <option value="success">🟢 Success / Milestone</option>
                    <option value="warning">🟡 Warning / Advisory</option>
                    <option value="urgent">🔴 Urgent / Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('targetAudienceLabel', 'Target Audience')}
                  </label>
                  <select
                    value={modalForm.targetAudience}
                    onChange={(e) => setModalForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="all">👥 All Registered Users</option>
                    <option value="subscribers">⭐ Paid Subscribers Only</option>
                    <option value="free">🌱 Free Tier Users Only</option>
                    <option value="admins">🛡️ Administrators Only</option>
                  </select>
                </div>
              </div>

              {/* Optional Call to Action Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('actionUrlLabel', 'Action URL (Optional)')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /subscriptions or /chef"
                    value={modalForm.actionUrl || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('actionButtonLabel', 'Button Label (Optional)')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. View Plans or Claim Bonus"
                    value={modalForm.actionLabel || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, actionLabel: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* Channels & Status Switches */}
              <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('deliveryChannelsTitle', 'Channels & Status')}
                </span>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={modalForm.channels.inApp}
                      onChange={(e) => setModalForm(prev => ({
                        ...prev,
                        channels: { ...prev.channels, inApp: e.target.checked }
                      }))}
                      className="accent-amber-500 rounded"
                    />
                    <span>In-App Bell</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={modalForm.channels.email}
                      onChange={(e) => setModalForm(prev => ({
                        ...prev,
                        channels: { ...prev.channels, email: e.target.checked }
                      }))}
                      className="accent-amber-500 rounded"
                    />
                    <span>Email Broadcast</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={modalForm.channels.push}
                      onChange={(e) => setModalForm(prev => ({
                        ...prev,
                        channels: { ...prev.channels, push: e.target.checked }
                      }))}
                      className="accent-amber-500 rounded"
                    />
                    <span>Push Alerts</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-bold ml-auto">
                    <input
                      type="checkbox"
                      checked={modalForm.isActive}
                      onChange={(e) => setModalForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="accent-emerald-500 rounded"
                    />
                    <span style={{ color: modalForm.isActive ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
                      {modalForm.isActive ? 'Active' : 'Draft / Paused'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--color-border)' }}>
                <span className="block text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('previewTitle', 'Preview in User Notification Bell:')}
                </span>
                <div 
                  className="p-3 rounded-2xl border space-y-1 shadow-inner"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs" style={{ color: 'var(--color-text)' }}>
                      {modalForm.title || 'Notification Title'}
                    </span>
                    {getTypeBadge(modalForm.type)}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                    {modalForm.message || 'Notification content will render here...'}
                  </p>
                  {modalForm.actionUrl && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold underline" style={{ color: 'var(--color-primary)' }}>
                        👉 {modalForm.actionLabel || 'Check it out'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:opacity-80 transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {t('cancel', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={savingCustom}
                onClick={handleSaveCustomNotification}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {savingCustom ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t('saveAlertBtn', 'Save Alert')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
