// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  BellRing, Bell, Send, CheckCircle2, AlertCircle, Save, RefreshCw, 
  Check, Plus, Trash2, Edit3, Sliders, History, Activity, Database, 
  Clock, Volume2, ShieldAlert, Sparkles, Filter, Search, X, 
  VolumeX, Mail, Smartphone, ExternalLink, Moon, ArrowRight,
  UserCheck, Users, Megaphone, Info
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export interface NotificationSettingsState {
  channelInApp: boolean;
  channelEmail: boolean;
  channelWebPush: boolean;
  plannerMealReminder: boolean;
  plannerMealReminderTime: string;
  prepTimeAlert: boolean;
  weeklyIntakeNudge: boolean;
  tokenLowAlert: boolean;
  tokenLowThreshold: number;
  tokenExhaustionAlert: boolean;
  monthlyAllowanceNotice: boolean;
  walletLowAlert: boolean;
  walletLowThreshold: number;
  topupReceiptAlert: boolean;
  paymentDeclineAlert: boolean;
  subscriptionExpiryAlert: boolean;
  subscriptionExpiryDays: number;
  subscriptionCancelReceipt: boolean;
  systemUpdatesAlert: boolean;
  maintenanceDowntimeAlert: boolean;
  securityLoginAlert: boolean;
  dndEnabled: boolean;
  dndStartTime: string;
  dndEndTime: string;
  soundChimesEnabled: boolean;
  retentionDays: number;
  dailyRateLimit: number;
}

export interface CustomBroadcastItem {
  id: string;
  title: string;
  message: string;
  category: 'info' | 'warning' | 'urgent' | 'promo' | 'success';
  targetAudience: 'all' | 'subscribers' | 'free' | 'admins';
  channels: string[];
  actionLabel?: string;
  actionUrl?: string;
  sendCount: number;
  sentAt?: string | null;
  createdAt: string;
}

const DEFAULT_SETTINGS: NotificationSettingsState = {
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

export default function AdminNotificationSettingsPage() {
  const { t, locale } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [activeTab, setActiveTab] = useState<'rules' | 'delivery' | 'broadcasts'>('rules');
  const [settings, setSettings] = useState<NotificationSettingsState>(DEFAULT_SETTINGS);
  const [broadcasts, setBroadcasts] = useState<CustomBroadcastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Custom Broadcast Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastCategory, setBroadcastCategory] = useState<'info' | 'warning' | 'urgent' | 'promo' | 'success'>('info');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'subscribers' | 'free' | 'admins'>('all');
  const [broadcastActionLabel, setBroadcastActionLabel] = useState<string>('');
  const [broadcastActionUrl, setBroadcastActionUrl] = useState<string>('');
  const [savingBroadcast, setSavingBroadcast] = useState<boolean>(false);

  // Search & Filter State
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sendingBroadcastId, setSendingBroadcastId] = useState<string | null>(null);

  const isFetchingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load Settings & Broadcasts from Backend API
  const loadNotificationData = useCallback(async () => {
    if (isFetchingRef.current || isSavingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/notification-settings?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.notificationSettings || data.settings) {
          setSettings(prev => ({
            ...prev,
            ...(data.notificationSettings || data.settings)
          }));
        }
        if (Array.isArray(data.broadcasts || data.customNotifications)) {
          setBroadcasts(data.broadcasts || data.customNotifications);
        }
      }
    } catch (err) {
      console.warn('[Notification Settings] Using offline fallback defaults:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    document.title = `${tr('notifDocTitle', 'Notification Settings - Admin Console')}`;
    loadNotificationData();

    const handleSync = () => loadNotificationData();
    window.addEventListener('zecratary_notification_settings_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_notification_settings_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadNotificationData, tr]);

  // Save Settings to Database
  const handleSaveSettings = async () => {
    if (saving || isSavingRef.current) return;
    setSaving(true);
    isSavingRef.current = true;
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationSettings: settings })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_notification_settings_updated'));
          localStorage.setItem('zecratary_notif_settings_updated_at', Date.now().toString());
        }
        showToast('success', tr('notifToastSaved', 'Notification settings saved and synchronized with PostgreSQL & MySQL!'));
      } else {
        throw new Error(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  // Send Test Live Alert to Topbar Bell
  const handleSendTestAlert = async () => {
    setSendingTest(true);
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test_alert' })
      });

      if (res.ok) {
        // Dispatch live event to update topbar bell in real time
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zecratary_new_notification', {
            detail: {
              title: 'Test System Alert 🔔',
              message: 'This is a live test alert dispatched from /admin/notification-settings to verify real-time top-bar bell notifications.',
              category: 'info',
              actionUrl: '/admin/notification-settings'
            }
          }));
          localStorage.setItem('zecratary_notifications_updated_at', Date.now().toString());
        }
        showToast('success', tr('notifToastTestSent', 'Live test alert broadcasted to top-bar notification bell!'));
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error sending test alert.');
    } finally {
      setSendingTest(false);
    }
  };

  // Dispatch Custom Announcement Immediately
  const handleSendCustomAlert = async (broadcast: CustomBroadcastItem) => {
    setSendingBroadcastId(broadcast.id);
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_custom_alert', id: broadcast.id })
      });

      if (res.ok) {
        setBroadcasts(prev => prev.map(b => b.id === broadcast.id ? {
          ...b,
          sendCount: (b.sendCount || 0) + 1,
          sentAt: new Date().toISOString()
        } : b));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zecratary_new_notification', {
            detail: {
              title: broadcast.title,
              message: broadcast.message,
              category: broadcast.category,
              actionLabel: broadcast.actionLabel,
              actionUrl: broadcast.actionUrl
            }
          }));
          localStorage.setItem('zecratary_notifications_updated_at', Date.now().toString());
        }
        showToast('success', tr('notifToastCustomSent', 'Custom announcement dispatched to targeted users!'));
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error dispatching announcement.');
    } finally {
      setSendingBroadcastId(null);
    }
  };

  // Save (Create/Update) Custom Broadcast
  const handleSaveCustomNotification = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert('Please enter both Notification Title and Message Body.');
      return;
    }

    setSavingBroadcast(true);
    const payload = {
      id: editingBroadcastId || undefined,
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      category: broadcastCategory,
      targetAudience: broadcastAudience,
      actionLabel: broadcastActionLabel.trim(),
      actionUrl: broadcastActionUrl.trim()
    };

    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_custom_notification',
          notification: payload
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast('success', editingBroadcastId ? tr('notifToastCustomUpdated', 'Custom notification updated successfully!') : tr('notifToastCustomCreated', 'Custom notification drafted successfully!'));
        setShowModal(false);
        loadNotificationData();
      } else {
        throw new Error(data.error || 'Failed to save announcement.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving custom notification.');
    } finally {
      setSavingBroadcast(false);
    }
  };

  // Delete Custom Broadcast
  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm(tr('notifConfirmDelete', 'Are you sure you want to delete this custom notification?'))) return;

    try {
      const res = await fetch(`/api/admin/notification-settings?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id));
        showToast('success', tr('notifToastCustomDeleted', 'Custom notification deleted.'));
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error deleting notification.');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBroadcastId(null);
    setBroadcastTitle('Special Culinary Announcement');
    setBroadcastMessage('Explore new high-protein recipes curated by our AI Chef formulator!');
    setBroadcastCategory('info');
    setBroadcastAudience('all');
    setBroadcastActionLabel('Explore Chef');
    setBroadcastActionUrl('/chef');
    setShowModal(true);
  };

  const handleOpenEditModal = (b: CustomBroadcastItem) => {
    setEditingBroadcastId(b.id);
    setBroadcastTitle(b.title);
    setBroadcastMessage(b.message);
    setBroadcastCategory(b.category);
    setBroadcastAudience(b.targetAudience);
    setBroadcastActionLabel(b.actionLabel || '');
    setBroadcastActionUrl(b.actionUrl || '');
    setShowModal(true);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset notification rules and thresholds to defaults?')) return;
    setSettings(DEFAULT_SETTINGS);
    showToast('success', 'Notification rules reset to initial defaults.');
  };

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter(b => {
      if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const mTitle = (b.title || '').toLowerCase().includes(q);
        const mMsg = (b.message || '').toLowerCase().includes(q);
        if (!mTitle && !mMsg) return false;
      }
      return true;
    });
  }, [broadcasts, search, categoryFilter]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'urgent':
        return { label: 'URGENT', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', color: '#ef4444' };
      case 'warning':
        return { label: 'WARNING', bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', color: '#f59e0b' };
      case 'promo':
        return { label: 'PROMO', bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', color: '#c084fc' };
      case 'success':
        return { label: 'SUCCESS', bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--color-emerald, #10b981)', color: 'var(--color-emerald, #10b981)' };
      default:
        return { label: 'INFO', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', color: '#60a5fa' };
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. Top Header & Action Cluster */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <BellRing className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            {tr('notifTitle', 'Notification System & Broadcast Settings')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('notifSubtitle', 'Configure delivery channels, scheduled meal reminders, AI token and wallet thresholds, and broadcast custom user announcements.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{tr('notifSyncBadge', 'Synced with PostgreSQL & MySQL')}</span>
          </div>

          <button
            type="button"
            onClick={loadNotificationData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{tr('notifBtnReload', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleSendTestAlert}
            disabled={sendingTest}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-sm disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-emerald, #10b981)',
              color: 'var(--color-emerald, #10b981)'
            }}
          >
            <Send className={`h-3.5 w-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
            <span>{sendingTest ? tr('notifBtnSendingTest', 'Sending Alert...') : tr('notifBtnSendTest', 'Send Test Alert')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? tr('notifBtnSaving', 'Saving...') : tr('notifBtnSaveSettings', 'Save Notification Settings')}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-sm animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
            color: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* 2. Workspace Sub-Tabs */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        {[
          { id: 'rules', label: tr('notifTabRules', 'System Rules & Thresholds'), icon: Sliders },
          { id: 'delivery', label: tr('notifTabDelivery', 'Delivery & Quiet Hours'), icon: Clock },
          { id: 'broadcasts', label: tr('notifTabBroadcasts', 'Custom Broadcasts'), icon: Megaphone }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              style={isActive ? {
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderWidth: '1px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              } : { color: 'var(--color-text-secondary)' }}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SYSTEM RULES & THRESHOLDS */}
      {activeTab === 'rules' && (
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-6"
        >
          {/* Master Delivery Channels */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Activity className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('notifChannelsHeading', 'Master Delivery Channels')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('notifChannelsDesc', 'Enable or disable communication delivery methods platform-wide.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'channelInApp', label: tr('notifChannelInApp', 'In-App Notification Center (Bell)'), icon: Bell, active: settings.channelInApp },
                { key: 'channelEmail', label: tr('notifChannelEmail', 'Transactional Email Notifications'), icon: Mail, active: settings.channelEmail },
                { key: 'channelWebPush', label: tr('notifChannelPush', 'Browser Web Push Notifications'), icon: Smartphone, active: settings.channelWebPush }
              ].map(ch => (
                <div
                  key={ch.key}
                  className="p-4 rounded-2xl border flex items-center justify-between"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-2.5 pr-2">
                    <ch.icon className="h-4 w-4 shrink-0" style={{ color: ch.active ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                    <span className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{ch.label}</span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={ch.active}
                    onClick={() => setSettings({ ...settings, [ch.key]: !ch.active })}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300"
                    style={{ backgroundColor: ch.active ? 'var(--color-primary)' : 'var(--color-border)' }}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ${
                        ch.active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Planner & Meal Reminders */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Clock className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('notifPlannerHeading', 'Planner & Meal Schedule Reminders')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('notifPlannerDesc', 'Scheduled alerts to keep users consistent with daily cooking and grocery routines.')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="font-bold block" style={{ color: 'var(--color-text)' }}>{tr('notifMealDailyReminder', 'Daily Meal Plan Reminder')}</span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>Trigger daily recipe lineup notice</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    autoComplete="off"
                    data-lpignore="true"
                    value={settings.plannerMealReminderTime}
                    onChange={(e) => setSettings({ ...settings, plannerMealReminderTime: e.target.value })}
                    className="px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="checkbox"
                    checked={settings.plannerMealReminder}
                    onChange={(e) => setSettings({ ...settings, plannerMealReminder: e.target.checked })}
                    className="rounded h-4 w-4"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="font-bold block" style={{ color: 'var(--color-text)' }}>{tr('notifPrepTimeAlert', 'Pre-Prep Cooking Advance Alert')}</span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>30 minutes prior to scheduled prep slot</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.prepTimeAlert}
                  onChange={(e) => setSettings({ ...settings, prepTimeAlert: e.target.checked })}
                  className="rounded h-4 w-4"
                />
              </div>
            </div>
          </div>

          {/* AI Tokens & Store Wallet Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tokens Alert Card */}
            <div 
              className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {tr('notifTokenHeading', 'AI Token Telemetry & Alerts')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('notifTokenDesc', 'Proactively alert users before they run out of tokens for AI Chef and scraping.')}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>{tr('notifTokenLowAlert', 'Low Token Balance Warning')}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      autoComplete="off"
                      data-lpignore="true"
                      value={settings.tokenLowThreshold}
                      onChange={(e) => setSettings({ ...settings, tokenLowThreshold: parseInt(e.target.value, 10) || 50 })}
                      className="w-16 px-2 py-1 rounded-lg border font-mono font-bold text-center"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                    <input
                      type="checkbox"
                      checked={settings.tokenLowAlert}
                      onChange={(e) => setSettings({ ...settings, tokenLowAlert: e.target.checked })}
                      className="rounded h-4 w-4"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>{tr('notifTokenExhaustion', 'Zero-Token Exhaustion Notice')}</span>
                  <input
                    type="checkbox"
                    checked={settings.tokenExhaustionAlert}
                    onChange={(e) => setSettings({ ...settings, tokenExhaustionAlert: e.target.checked })}
                    className="rounded h-4 w-4"
                  />
                </div>
              </div>
            </div>

            {/* Wallet Alerts Card */}
            <div 
              className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <ShieldAlert className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {tr('notifWalletHeading', 'Store Wallet & Billing Alerts')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('notifWalletDesc', 'Notify users of balance drops, deposit settlements, and payment updates.')}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>{tr('notifWalletLowAlert', 'Low Wallet Balance Warning')}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      autoComplete="off"
                      data-lpignore="true"
                      value={settings.walletLowThreshold}
                      onChange={(e) => setSettings({ ...settings, walletLowThreshold: parseFloat(e.target.value) || 5.00 })}
                      className="w-16 px-2 py-1 rounded-lg border font-mono font-bold text-center"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                    <input
                      type="checkbox"
                      checked={settings.walletLowAlert}
                      onChange={(e) => setSettings({ ...settings, walletLowAlert: e.target.checked })}
                      className="rounded h-4 w-4"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>{tr('notifWalletDepositReceipt', 'Top-Up Deposit Settlement Receipt')}</span>
                  <input
                    type="checkbox"
                    checked={settings.topupReceiptAlert}
                    onChange={(e) => setSettings({ ...settings, topupReceiptAlert: e.target.checked })}
                    className="rounded h-4 w-4"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription & System Maintenance Notices */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Megaphone className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('notifSubHeading', 'Subscription & Expiry Lifecycle Notices')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="font-bold block" style={{ color: 'var(--color-text)' }}>{tr('notifSubExpiryAlert', 'Upcoming Renewal Notice')}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Advance warning days</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    autoComplete="off"
                    data-lpignore="true"
                    value={settings.subscriptionExpiryDays}
                    onChange={(e) => setSettings({ ...settings, subscriptionExpiryDays: parseInt(e.target.value, 10) || 3 })}
                    className="w-12 px-2 py-1 rounded-lg border font-mono font-bold text-center"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="checkbox"
                    checked={settings.subscriptionExpiryAlert}
                    onChange={(e) => setSettings({ ...settings, subscriptionExpiryAlert: e.target.checked })}
                    className="rounded h-4 w-4"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <span className="font-bold" style={{ color: 'var(--color-text)' }}>{tr('notifSystemUpdates', 'Feature Releases & Platform Updates')}</span>
                <input
                  type="checkbox"
                  checked={settings.systemUpdatesAlert}
                  onChange={(e) => setSettings({ ...settings, systemUpdatesAlert: e.target.checked })}
                  className="rounded h-4 w-4"
                />
              </div>

              <div className="p-3.5 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <span className="font-bold" style={{ color: 'var(--color-text)' }}>{tr('notifSystemMaintenance', 'Scheduled Server Maintenance')}</span>
                <input
                  type="checkbox"
                  checked={settings.maintenanceDowntimeAlert}
                  onChange={(e) => setSettings({ ...settings, maintenanceDowntimeAlert: e.target.checked })}
                  className="rounded h-4 w-4"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DELIVERY & QUIET HOURS */}
      {activeTab === 'delivery' && (
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-6"
        >
          {/* Quiet Hours / DND */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Moon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {tr('notifQuietHeading', 'Quiet Hours / Do Not Disturb (DND)')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('notifQuietDesc', 'Mute non-urgent notifications during nighttime hours to prevent user fatigue.')}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.dndEnabled}
                onClick={() => setSettings({ ...settings, dndEnabled: !settings.dndEnabled })}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300"
                style={{ backgroundColor: settings.dndEnabled ? 'var(--color-primary)' : 'var(--color-border)' }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ${
                    settings.dndEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1.5 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('notifQuietStart', 'Quiet Window Start Time')}
                </label>
                <input
                  type="time"
                  autoComplete="off"
                  data-lpignore="true"
                  value={settings.dndStartTime}
                  onChange={(e) => setSettings({ ...settings, dndStartTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('notifQuietEnd', 'Quiet Window End Time')}
                </label>
                <input
                  type="time"
                  autoComplete="off"
                  data-lpignore="true"
                  value={settings.dndEndTime}
                  onChange={(e) => setSettings({ ...settings, dndEndTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>

          {/* Sound & Alert Chimes */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Volume2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {tr('notifAudioHeading', 'Audible Sound & Alert Chimes')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('notifAudioDesc', 'Play subtle sound effects on top-bar bell when high-priority alerts arrive.')}
                </p>
              </div>

              <input
                type="checkbox"
                checked={settings.soundChimesEnabled}
                onChange={(e) => setSettings({ ...settings, soundChimesEnabled: e.target.checked })}
                className="rounded h-4 w-4"
              />
            </div>
          </div>

          {/* Retention & Daily Rate Limiting */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Sliders className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('notifRetentionHeading', 'Notification Storage & Rate Limiting')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('notifRetentionDesc', 'Control database storage retention and maximum daily notifications per user.')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1.5 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('notifRetentionDays', 'Auto-Purge In-App Notifications After (Days)')}
                </label>
                <input
                  type="number"
                  min="7"
                  max="365"
                  autoComplete="off"
                  data-lpignore="true"
                  value={settings.retentionDays}
                  onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value, 10) || 30 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('notifRateLimit', 'Maximum Daily Notifications per User')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  autoComplete="off"
                  data-lpignore="true"
                  value={settings.dailyRateLimit}
                  onChange={(e) => setSettings({ ...settings, dailyRateLimit: parseInt(e.target.value, 10) || 10 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM BROADCAST ANNOUNCEMENTS */}
      {activeTab === 'broadcasts' && (
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Megaphone className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                {tr('notifBroadcastsHeading', 'Custom User Broadcast Announcements')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('notifBroadcastsDesc', 'Create targeted messages, promotional announcements, or urgent notices.')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus className="h-4 w-4" />
              <span>{tr('notifBtnCreateCustom', '+ Create Custom Notification')}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div 
            className="p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm transition-colors"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="relative w-full md:w-96">
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('notifSearchPlaceholder', 'Search broadcasts by title, message, or category...')}
                className="w-full px-3.5 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="all">{tr('notifFilterAll', 'All Categories')}</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
              <option value="promo">Promo</option>
              <option value="success">Success</option>
            </select>
          </div>

          {/* Broadcasts Table */}
          <div 
            className="border rounded-3xl overflow-hidden shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead 
                  className="border-b uppercase font-bold text-[10px] tracking-wider"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <tr>
                    <th className="px-5 py-4">{tr('notifColTitle', 'Announcement Title & Message')}</th>
                    <th className="px-5 py-4">{tr('notifColCategory', 'Category')}</th>
                    <th className="px-5 py-4">{tr('notifColAudience', 'Target Audience')}</th>
                    <th className="px-5 py-4 text-center">{tr('notifColSendCount', 'Dispatched')}</th>
                    <th className="px-5 py-4">{tr('notifColSentAt', 'Last Sent')}</th>
                    <th className="px-5 py-4 text-right">{tr('notifColActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {filteredBroadcasts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
                        {tr('notifNoBroadcasts', 'No custom notifications found matching your search.')}
                      </td>
                    </tr>
                  ) : (
                    filteredBroadcasts.map((b) => {
                      const badge = getCategoryBadge(b.category);
                      return (
                        <tr key={b.id} className="transition" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-5 py-4">
                            <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{b.title}</div>
                            <div className="text-[11px] line-clamp-2 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{b.message}</div>
                            {b.actionUrl && (
                              <div className="text-[10px] text-[var(--color-primary)] font-bold mt-1 flex items-center gap-1">
                                <span>{b.actionLabel || 'Action'}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                              style={{ backgroundColor: badge.bg, borderColor: badge.border, color: badge.color }}
                            >
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono font-bold uppercase text-[10px]" style={{ color: 'var(--color-text)' }}>
                            {b.targetAudience}
                          </td>

                          <td className="px-5 py-4 text-center font-mono font-bold">
                            {b.sendCount || 0}
                          </td>

                          <td className="px-5 py-4 text-[11px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                            {b.sentAt ? new Date(b.sentAt).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={sendingBroadcastId === b.id}
                                onClick={() => handleSendCustomAlert(b)}
                                className="px-3 py-1 rounded-xl text-white font-bold text-[11px] shadow transition hover:opacity-90 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
                                title="Dispatch this announcement now"
                              >
                                <Send className="h-3 w-3" />
                                <span>{sendingBroadcastId === b.id ? 'Sending...' : tr('notifBtnSendNow', 'Send Alert Now')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(b)}
                                className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
                                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteBroadcast(b.id)}
                                className="p-1.5 rounded-xl border text-red-400 border-red-500/30 hover:bg-red-500/10 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT BROADCAST MODAL (Formless Accessible Container - Constraint 9) */}
      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>
                  {editingBroadcastId ? tr('notifModalTitleEdit', 'Edit Custom Broadcast Notification') : tr('notifModalTitleCreate', 'Create Custom Broadcast Notification')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('notifModalDesc', 'Draft and dispatch custom notifications to user notification bells and emails.')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('notifLabelTitle', 'Notification Title *')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Special Holiday Tasting Blueprint"
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                      {tr('notifLabelCategory', 'Alert Category *')}
                    </label>
                    <select
                      value={broadcastCategory}
                      onChange={(e) => setBroadcastCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                      <option value="promo">Promo</option>
                      <option value="success">Success</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                      {tr('notifLabelAudience', 'Target User Audience *')}
                    </label>
                    <select
                      value={broadcastAudience}
                      onChange={(e) => setBroadcastAudience(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="all">All Users</option>
                      <option value="subscribers">Subscribers Only</option>
                      <option value="free">Free Tier Only</option>
                      <option value="admins">Admins Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('notifLabelMessage', 'Notification Message Body *')}
                </label>
                <textarea
                  autoComplete="off"
                  data-lpignore="true"
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Draft your announcement message clearly..."
                  className="w-full px-3 py-2 rounded-xl border outline-none resize-none font-medium text-xs"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('notifLabelActionText', 'Call-to-Action Button Label')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    value={broadcastActionLabel}
                    onChange={(e) => setBroadcastActionLabel(e.target.value)}
                    placeholder="e.g. View Recipe / Open Planner"
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('notifLabelActionUrl', 'Action Destination URL')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    value={broadcastActionUrl}
                    onChange={(e) => setBroadcastActionUrl(e.target.value)}
                    placeholder="e.g. /chef or /planner"
                    className="w-full px-3 py-2 rounded-xl border font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* LIVE USER NOTIFICATION PREVIEW FLYOUT BOX */}
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-[11px] flex items-center gap-1.5 opacity-80">
                  <Eye className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  {tr('notifPreviewHeading', 'Live Top-Bar Flyout Preview')}
                </span>

                <div 
                  className="p-4 rounded-2xl border space-y-2 max-w-md shadow-lg"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border"
                      style={getCategoryBadge(broadcastCategory)}
                    >
                      {broadcastCategory}
                    </span>
                    <span className="text-[10px] opacity-60 font-mono">Just now</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                      {broadcastTitle || 'Notification Headline'}
                    </h4>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {broadcastMessage || 'Your announcement body copy will render here as users inspect their top navigation bell...'}
                    </p>
                  </div>

                  {broadcastActionUrl && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold underline" style={{ color: 'var(--color-primary)' }}>
                        <span>{broadcastActionLabel || 'View Details'}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {tr('notifBtnCancel', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleSaveCustomNotification}
                disabled={savingBroadcast}
                className="px-5 py-2 text-white font-bold rounded-xl shadow-md transition hover:opacity-90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Check className={`h-3.5 w-3.5 ${savingBroadcast ? 'animate-spin' : ''}`} />
                <span>{tr('notifBtnSaveCustom', 'Save Announcement')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
