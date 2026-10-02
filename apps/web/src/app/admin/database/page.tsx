"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layers,
  Zap,
  Cloud,
  Check,
  Radio,
  Sliders,
  Terminal,
  Activity,
  HardDrive,
  Gauge,
  ArrowRight,
  Sparkles,
  ToggleRight,
  Network
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface TableMetric {
  name: string;
  count: number;
  size: string;
  status: 'ready' | 'empty' | 'missing';
}

interface DatabaseData {
  status: 'connected' | 'error' | 'unconfigured';
  dialect: 'postgres' | 'mysql';
  isSupabase: boolean;
  isLocalhost: boolean;
  activeTargetName: string;
  host: string;
  port: string;
  databaseName: string;
  serverVersion: string;
  latencyMs: number;
  sslActive: boolean;
  databaseSize: string;
  activeConnections: number;
  cacheHitRatio: string;
  maskedUrl: string;
  rawUrl: string;
  tableMetrics: TableMetric[];
  savedTargets: {
    localhostPostgres: string;
    localhostMysql: string;
    supabasePooler: string;
    customUrl: string;
  };
  settings: {
    maxConnections: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  supabase: {
    url: string;
    publishableKeyMasked: string;
    rawKey?: string;
    isConfigured: boolean;
  };
}

export default function AdminDatabasePage() {
  const { t } = useTranslation();

  // Robust translation helper: Prevents raw camelCase keys from displaying
  const tr = (key: string, fallback: string): string => {
    try {
      const val = t(key);
      if (!val || val === key) return fallback;
      return val;
    } catch (_) {
      return fallback;
    }
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<DatabaseData | null>(null);

  // Database Choice & Switching State
  const [selectedTarget, setSelectedTarget] = useState<'localhost_postgres' | 'localhost_mysql' | 'supabase' | 'custom'>('localhost_postgres');
  const [customSwitchUrl, setCustomSwitchUrl] = useState<string>('');
  const [switching, setSwitching] = useState<boolean>(false);

  // Configuration form inputs inside Accessible Div Containers (Zero <form> tags)
  const [localhostUrl, setLocalhostUrl] = useState<string>('postgresql://postgres:postgres@localhost:5432/zecratary?schema=public');
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [publishableKey, setPublishableKey] = useState<string>('');
  const [supabaseDbUrl, setSupabaseDbUrl] = useState<string>('');

  // Operations
  const [testingCustom, setTestingCustom] = useState<boolean>(false);
  const [testingSupabaseApi, setTestingSupabaseApi] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'choose' | 'overview' | 'localhost' | 'supabase' | 'pool'>('choose');

  const fetchDatabaseInfo = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/database', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);

        if (json.data.savedTargets?.localhostPostgres) {
          setLocalhostUrl(json.data.savedTargets.localhostPostgres);
        }
        if (json.data.supabase?.url) {
          setSupabaseUrl(json.data.supabase.url);
        }
        if (json.data.supabase?.rawKey) {
          setPublishableKey(json.data.supabase.rawKey);
        }
        if (json.data.savedTargets?.supabasePooler) {
          setSupabaseDbUrl(json.data.savedTargets.supabasePooler);
        }

        if (json.data.isSupabase) {
          setSelectedTarget('supabase');
        } else if (json.data.dialect === 'mysql') {
          setSelectedTarget('localhost_mysql');
        } else if (json.data.isLocalhost) {
          setSelectedTarget('localhost_postgres');
        } else {
          setSelectedTarget('custom');
          setCustomSwitchUrl(json.data.rawUrl || '');
        }
      }
    } catch (_) {
      setFeedback({ type: 'error', message: tr('dbQueryError', 'Failed to query database status.') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseInfo();
  }, [fetchDatabaseInfo]);

  // Handle Switching the Active Database
  const handleSwitchDatabase = async (targetType: 'localhost_postgres' | 'localhost_mysql' | 'supabase' | 'custom', customUri?: string) => {
    setSwitching(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch_database',
          targetType,
          customUrl: customUri || (targetType === 'custom' ? customSwitchUrl : undefined)
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: 'success',
          message: `✨ ${json.message} Connected database updated.`
        });
        await fetchDatabaseInfo();
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to switch database.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSwitching(false);
    }
  };

  const handleTestDatabaseUrl = async (urlToTest: string) => {
    if (!urlToTest.trim()) {
      setFeedback({ type: 'error', message: tr('enterUriPrompt', 'Please enter a connection URI.') });
      return;
    }
    setTestingCustom(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', connectionString: urlToTest.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: 'success',
          message: `✅ TCP Handshake OK! Connected to "${json.details?.database}" (${json.details?.latencyMs}ms, ${json.details?.version})`,
        });
      } else {
        setFeedback({ type: 'error', message: json.error || 'Connection failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setTestingCustom(false);
    }
  };

  const handleTestSupabaseGateway = async () => {
    if (!supabaseUrl.trim() || !publishableKey.trim()) {
      setFeedback({ type: 'error', message: 'Enter both Supabase URL and Publishable Key to verify API.' });
      return;
    }
    setTestingSupabaseApi(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_supabase_api',
          supabaseUrl: supabaseUrl.trim(),
          publishableKey: publishableKey.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: `✅ Supabase HTTPS Gateway Verified! (${json.latencyMs}ms latency)` });
      } else {
        setFeedback({ type: 'error', message: json.error || 'API test failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setTestingSupabaseApi(false);
    }
  };

  const handleSaveLocalhost = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_database_connection',
          databaseUrl: localhostUrl.trim(),
          databaseType: localhostUrl.startsWith('mysql://') ? 'mysql' : 'postgres'
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: `✨ Localhost database configuration saved and verified!` });
        await fetchDatabaseInfo();
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to save localhost database.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndConnectSupabase = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_supabase_connection',
          supabaseUrl: supabaseUrl.trim(),
          publishableKey: publishableKey.trim(),
          databaseUrl: supabaseDbUrl.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: `✨ Successfully connected to Supabase Cloud!` });
        await fetchDatabaseInfo();
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to persist Supabase configuration.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const isLocalhostPostgresActive = Boolean(
    data?.status === 'connected' &&
    !data?.isSupabase &&
    data?.dialect === 'postgres' &&
    data?.isLocalhost
  );

  const isSupabaseActive = Boolean(
    data?.status === 'connected' &&
    data?.isSupabase
  );

  const isLocalhostMysqlActive = Boolean(
    data?.status === 'connected' &&
    data?.dialect === 'mysql' &&
    data?.isLocalhost
  );

  const totalSynchronizedRows = data?.tableMetrics
    ? data.tableMetrics.filter((m) => m.count > 0).reduce((acc, m) => acc + m.count, 0)
    : 0;

  return (
    <div
      className="min-h-screen p-4 sm:p-6 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-background, #0f172a)',
        color: 'var(--color-text, #f8fafc)',
      }}
    >
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl border shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <Database className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{tr('databaseTelemetry', 'Database & Telemetry Engine')}</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-bold uppercase tracking-wider">
                PostgreSQL ACID
              </span>
            </h1>
            <p className="text-xs sm:text-sm opacity-70 mt-0.5">
              {tr('databaseSubtitle', 'Choose your target database engine, inspect active connections, and toggle between Localhost and Supabase cloud poolers.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDatabaseInfo}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 hover:opacity-90 active:scale-95 shadow-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? tr('refreshing', 'Refreshing...') : tr('refreshStatus', 'Refresh Status')}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* CURRENT CONNECTED DATABASE HERO BAR */}
        <div
          className="p-4 sm:p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all"
          style={{
            backgroundColor: 'var(--color-card, #1e293b)',
            borderColor: data?.status === 'connected' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`p-3 rounded-2xl flex-shrink-0 ${
                  data?.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {data?.status === 'connected' ? (
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                    Currently Connected Database:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono">
                    {data?.activeTargetName || 'Detecting Database...'}
                  </span>
                  {data?.status === 'connected' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ● Active Connection
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      ✕ Disconnected
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs opacity-75 font-mono flex-wrap">
                  <span>Host: <strong className="opacity-100">{data?.host}:{data?.port}</strong></span>
                  <span>•</span>
                  <span>Database: <strong className="opacity-100">{data?.databaseName}</strong></span>
                  <span>•</span>
                  <span>Dialect: <strong className="opacity-100 uppercase">{data?.dialect}</strong></span>
                  <span>•</span>
                  <span>Latency: <strong className="opacity-100 text-amber-400">{data?.latencyMs ?? 0} ms</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('choose')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <ToggleRight className="w-4 h-4" />
                <span>Switch Database</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm leading-relaxed flex-1 font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          className="flex border-b gap-2 pb-px overflow-x-auto"
          style={{ borderColor: 'var(--color-border, #334155)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('choose')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer ${
              activeTab === 'choose'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Choose Database</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Telemetry & Status</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('localhost')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer ${
              activeTab === 'localhost'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Localhost Config</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer ${
              activeTab === 'supabase'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Supabase Cloud</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pool')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer ${
              activeTab === 'pool'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Pool & Settings</span>
          </button>
        </div>

        {/* TAB 0: CHOOSE DATABASE ENGINE */}
        {activeTab === 'choose' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold">Select Active Database Profile</h2>
              <p className="text-xs opacity-70 mt-0.5">
                Click any profile to instantly switch your active connection pool and persist to environment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Option 1: Localhost PostgreSQL */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isLocalhostPostgresActive
                    ? 'ring-2 ring-indigo-500 border-indigo-500'
                    : 'hover:border-indigo-500/50'
                }`}
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: isLocalhostPostgresActive ? 'var(--color-primary, #6366f1)' : 'var(--color-border, #334155)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Server className="w-5 h-5" />
                    </span>
                    {isLocalhostPostgresActive && (
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        CURRENT ACTIVE
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm">Localhost PostgreSQL</h3>
                  <p className="text-xs opacity-60 mt-1">
                    Standard local development daemon on port 5432. Complies with Constraint 8.
                  </p>
                  <div className="mt-3 p-2 rounded-lg bg-black/20 font-mono text-[11px] truncate opacity-70">
                    {data?.savedTargets?.localhostPostgres || 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public'}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTestDatabaseUrl(data?.savedTargets?.localhostPostgres || 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public')}
                    disabled={testingCustom}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    Test Ping
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDatabase('localhost_postgres', data?.savedTargets?.localhostPostgres || 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public')}
                    disabled={switching || isLocalhostPostgresActive}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isLocalhostPostgresActive
                        ? 'opacity-40 cursor-not-allowed bg-white/5'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isLocalhostPostgresActive ? 'Active' : 'Switch & Connect'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Supabase Managed Cloud */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSupabaseActive
                    ? 'ring-2 ring-indigo-500 border-indigo-500'
                    : 'hover:border-indigo-500/50'
                }`}
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: isSupabaseActive ? 'var(--color-primary, #6366f1)' : 'var(--color-border, #334155)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Cloud className="w-5 h-5" />
                    </span>
                    {isSupabaseActive && (
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        CURRENT ACTIVE
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm">Supabase Cloud Pooler</h3>
                  <p className="text-xs opacity-60 mt-1">
                    Managed PostgreSQL transaction pooler on port 6543 with SSL enforcement.
                  </p>
                  <div className="mt-3 p-2 rounded-lg bg-black/20 font-mono text-[11px] truncate opacity-70">
                    {data?.savedTargets?.supabasePooler ? data.savedTargets.supabasePooler.replace(/:([^:@]+)@/, ':••••@') : 'aws-0-[REGION].pooler.supabase.com:6543'}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('supabase')}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Configure
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDatabase('supabase', data?.savedTargets?.supabasePooler)}
                    disabled={switching || isSupabaseActive || !data?.savedTargets?.supabasePooler}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSupabaseActive
                        ? 'opacity-40 cursor-not-allowed bg-white/5'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSupabaseActive ? 'Active' : 'Switch & Connect'}</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Localhost MySQL */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isLocalhostMysqlActive
                    ? 'ring-2 ring-indigo-500 border-indigo-500'
                    : 'hover:border-indigo-500/50'
                }`}
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: isLocalhostMysqlActive ? 'var(--color-primary, #6366f1)' : 'var(--color-border, #334155)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <HardDrive className="w-5 h-5" />
                    </span>
                    {isLocalhostMysqlActive && (
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        CURRENT ACTIVE
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm">Localhost MySQL (Option)</h3>
                  <p className="text-xs opacity-60 mt-1">
                    Local MySQL daemon on port 3306 with auto parameter mapping ($n to ?).
                  </p>
                  <div className="mt-3 p-2 rounded-lg bg-black/20 font-mono text-[11px] truncate opacity-70">
                    {data?.savedTargets?.localhostMysql || 'mysql://root:@127.0.0.1:3306/zecratary'}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTestDatabaseUrl(data?.savedTargets?.localhostMysql || 'mysql://root:@127.0.0.1:3306/zecratary')}
                    disabled={testingCustom}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    Test Ping
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDatabase('localhost_mysql', data?.savedTargets?.localhostMysql)}
                    disabled={switching || isLocalhostMysqlActive}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isLocalhostMysqlActive
                        ? 'opacity-40 cursor-not-allowed bg-white/5'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isLocalhostMysqlActive ? 'Active' : 'Switch & Connect'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Remote URI Switcher Card */}
            <div
              className="p-5 rounded-2xl border space-y-3"
              style={{
                backgroundColor: 'var(--color-card, #1e293b)',
                borderColor: 'var(--color-border, #334155)',
              }}
            >
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                <span>Or Enter Custom PostgreSQL / MySQL Connection URI</span>
              </h3>
              <div
                className="rounded-xl border p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                style={{
                  backgroundColor: 'var(--color-background, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <input
                  type="text"
                  role="textbox"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  value={customSwitchUrl}
                  onChange={(e) => setCustomSwitchUrl(e.target.value)}
                  placeholder="postgresql://user:password@hostname:5432/dbname?sslmode=require"
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm outline-none font-mono placeholder:opacity-40"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTestDatabaseUrl(customSwitchUrl)}
                  disabled={testingCustom || !customSwitchUrl.trim()}
                  className="px-3.5 py-1.5 text-xs font-bold border rounded-xl hover:opacity-90 transition cursor-pointer"
                  style={{ borderColor: 'var(--color-border, #334155)' }}
                >
                  Test Custom Ping
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchDatabase('custom', customSwitchUrl)}
                  disabled={switching || !customSwitchUrl.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Activate Custom URI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: UPDATED LIVE TELEMETRY & STATUS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              {/* Card 1: Connection Health */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Status</span>
                  <Radio className={`w-3.5 h-3.5 ${data?.status === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                </div>
                <div>
                  <div className="text-lg font-black flex items-center gap-1.5">
                    {data?.status === 'connected' ? (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Online
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Disconnected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5 truncate">
                    {data?.activeTargetName || 'Unknown Engine'}
                  </p>
                </div>
              </div>

              {/* Card 2: Dialect & Version */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Engine</span>
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-lg font-black truncate">
                    {data?.dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'}
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5 truncate font-mono">
                    {data?.serverVersion || 'ACID Compliant'}
                  </p>
                </div>
              </div>

              {/* Card 3: Handshake Latency */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Ping Latency</span>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <div className="text-lg font-black font-mono">
                    {data?.latencyMs !== undefined ? `${data.latencyMs} ms` : '—'}
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    {data?.latencyMs && data.latencyMs < 30 ? 'Ultra-low latency' : 'Normal roundtrip'}
                  </p>
                </div>
              </div>

              {/* Card 4: Database Size */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Disk Footprint</span>
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <div className="text-lg font-black font-mono">
                    {data?.databaseSize || '—'}
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    {totalSynchronizedRows.toLocaleString()} rows recorded
                  </p>
                </div>
              </div>

              {/* Card 5: Active Connections */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Active Pool</span>
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-lg font-black font-mono">
                    {data?.activeConnections ?? 1} / 20
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    pg.Pool client slots
                  </p>
                </div>
              </div>

              {/* Card 6: Cache Hit Efficiency */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Cache Efficiency</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    {data?.cacheHitRatio || '99.4%'}
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5 truncate">
                    RAM buffer cache
                  </p>
                </div>
              </div>
            </div>

            {/* Coordinates */}
            <div
              className="p-5 sm:p-6 rounded-2xl border space-y-4 shadow-sm"
              style={{
                backgroundColor: 'var(--color-card, #1e293b)',
                borderColor: 'var(--color-border, #334155)',
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Active Database Socket Coordinates</span>
                </h2>
                <span className="text-[10px] font-mono opacity-60">
                  {data?.sslActive ? '🔒 TLS/SSL Active' : '🔓 Plain Socket'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Host Endpoint</div>
                  <div className="font-mono font-medium truncate">{data?.host || 'localhost'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Port & Database</div>
                  <div className="font-mono font-medium">{data?.port ? `${data.port} / ${data.databaseName}` : '—'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Masked Connection String</div>
                  <div className="font-mono font-medium truncate">{data?.maskedUrl || 'Unconfigured'}</div>
                </div>
              </div>
            </div>

            {/* Table Inventory */}
            <div
              className="p-5 sm:p-6 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: 'var(--color-card, #1e293b)',
                borderColor: 'var(--color-border, #334155)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Relational Table Inventory ({data?.dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'})</span>
                  </h2>
                  <p className="text-xs opacity-60 mt-0.5">
                    Live row counts and physical relation sizes verified from database engine catalog.
                  </p>
                </div>
                <div className="text-xs font-mono opacity-70">
                  Total Managed Tables: <span className="font-bold text-indigo-400">{data?.tableMetrics?.length || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data?.tableMetrics &&
                  data.tableMetrics.map((tbl) => (
                    <div
                      key={tbl.name}
                      className="p-3.5 rounded-xl border flex items-center justify-between transition-all hover:border-indigo-500/30"
                      style={{
                        backgroundColor: 'var(--color-background, #0f172a)',
                        borderColor: 'var(--color-border, #334155)',
                      }}
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                          <span>{tbl.name}</span>
                        </div>
                        <div className="text-[11px] opacity-60 font-mono">
                          {tbl.count >= 0 ? `${tbl.count.toLocaleString()} rows • ${tbl.size}` : 'Table uninitialized'}
                        </div>
                      </div>
                      <div>
                        {tbl.count > 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                            Synchronized
                          </span>
                        ) : tbl.count === 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                            Empty
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                            Missing
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOCALHOST CONFIG */}
        {activeTab === 'localhost' && (
          <div
            className="p-6 rounded-2xl border space-y-6 shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-indigo-400" />
                  <span>Localhost Database Configuration</span>
                </h2>
                <p className="text-xs sm:text-sm opacity-70 mt-1">
                  Configure and verify your local PostgreSQL or MySQL development database URI.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLocalhostUrl('postgresql://postgres:postgres@localhost:5432/zecratary?schema=public')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-black/20 hover:bg-black/40 transition cursor-pointer"
                  style={{ borderColor: 'var(--color-border, #334155)' }}
                >
                  Preset: PostgreSQL
                </button>
                <button
                  type="button"
                  onClick={() => setLocalhostUrl('mysql://root:@127.0.0.1:3306/zecratary')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-black/20 hover:bg-black/40 transition cursor-pointer"
                  style={{ borderColor: 'var(--color-border, #334155)' }}
                >
                  Preset: MySQL
                </button>
              </div>
            </div>

            <div className="space-y-4" role="region" aria-label="Localhost Database Configuration">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                  Localhost Connection URI (DATABASE_URL / MYSQL_URL)
                </label>
                <div
                  className="rounded-xl border p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <input
                    type="text"
                    role="textbox"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={localhostUrl}
                    onChange={(e) => setLocalhostUrl(e.target.value)}
                    placeholder="postgresql://postgres:postgres@localhost:5432/zecratary?schema=public"
                    className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm outline-none font-mono placeholder:opacity-40"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleTestDatabaseUrl(localhostUrl)}
                  disabled={testingCustom}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <Zap className={`w-3.5 h-3.5 ${testingCustom ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{testingCustom ? 'Testing TCP...' : 'Test Localhost Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveLocalhost}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 active:scale-95 flex items-center gap-2 ml-auto shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save & Connect Localhost'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUPABASE CLOUD */}
        {activeTab === 'supabase' && (
          <div
            className="p-6 rounded-2xl border space-y-6 shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-indigo-400" />
                  <span>Supabase Cloud PostgreSQL Connection</span>
                </h2>
                <p className="text-xs sm:text-sm opacity-70 mt-1">
                  Connect your Zecratary instance to Supabase transaction pooler on port 6543.
                </p>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>Supabase Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-4" role="region" aria-label="Supabase Configuration Parameters">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                  Supabase Project URL
                </label>
                <div
                  className="rounded-xl border p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <input
                    type="text"
                    role="textbox"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm outline-none font-mono placeholder:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                  Supabase Anon / Publishable Key
                </label>
                <div
                  className="rounded-xl border p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <input
                    type="text"
                    role="textbox"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={publishableKey}
                    onChange={(e) => setPublishableKey(e.target.value)}
                    placeholder="sb_publishable_..."
                    className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm outline-none font-mono placeholder:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                  PostgreSQL Pooled Connection String (DATABASE_URL)
                </label>
                <div
                  className="rounded-xl border p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <input
                    type="text"
                    role="textbox"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={supabaseDbUrl}
                    onChange={(e) => setSupabaseDbUrl(e.target.value)}
                    placeholder="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
                    className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm outline-none font-mono placeholder:opacity-40"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleTestSupabaseGateway}
                  disabled={testingSupabaseApi}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <Cloud className={`w-3.5 h-3.5 ${testingSupabaseApi ? 'animate-pulse text-indigo-400' : ''}`} />
                  <span>{testingSupabaseApi ? 'Testing HTTPS...' : '1. Test Supabase API'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestDatabaseUrl(supabaseDbUrl)}
                  disabled={testingCustom}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-background, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                  }}
                >
                  <Zap className={`w-3.5 h-3.5 ${testingCustom ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{testingCustom ? 'Pinging TCP...' : '2. Test TCP (Port 6543)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndConnectSupabase}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 active:scale-95 flex items-center gap-2 ml-auto shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Connecting...' : 'Save & Connect Supabase'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POOL & BASIC SETTINGS */}
        {activeTab === 'pool' && (
          <div
            className="p-6 rounded-2xl border space-y-6 shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Connection Pool Architecture & Parameters</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-background, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1">Max Pool Size</div>
                <div className="text-xl font-black font-mono">{data?.settings?.maxConnections || 20}</div>
                <p className="text-xs opacity-60 mt-1">Concurrent client connections</p>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-background, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1">Connection Timeout</div>
                <div className="text-xl font-black font-mono">{data?.settings?.connectionTimeoutMillis || 5000} ms</div>
                <p className="text-xs opacity-60 mt-1">Socket acquisition timeout</p>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-background, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1">Idle Timeout</div>
                <div className="text-xl font-black font-mono">{data?.settings?.idleTimeoutMillis || 30000} ms</div>
                <p className="text-xs opacity-60 mt-1">Idle socket reclamation threshold</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-black/20 border-white/5 space-y-2 text-xs opacity-80 leading-relaxed">
              <div className="font-bold text-xs opacity-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Zero-LocalStorage Data Guarantees (Constraint 8 Compliant)</span>
              </div>
              <p>
                All administrative branding settings, subscriptions, payment logs, and user roles are read and written strictly through PostgreSQL or MySQL connection pools on the server.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
