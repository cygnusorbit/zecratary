// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Database, Server, Cloud, RefreshCw, CheckCircle2, 
  AlertCircle, Zap, Activity, HardDrive, 
  Cpu, Lock, ArrowRightLeft, Layers, Wrench, AlertTriangle,
  Radio, Check, Globe
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface TableInfo {
  name: string;
  rowCount: number;
  size: string;
  status: string;
}

export default function AdminDatabasePage() {
  const { t } = useTranslation();

  // Navigation tab state (Choose Database, Localhost, Supabase, Migration, Telemetry)
  const [activeTab, setActiveTab] = useState<'choose' | 'localhost' | 'supabase' | 'migration' | 'telemetry'>('choose');

  // Connection & Active Target States
  const [activeProfile, setActiveProfile] = useState<'localhost_postgres' | 'localhost_mysql' | 'supabase_cloud' | 'custom'>('localhost_postgres');
  const [activeTargetLabel, setActiveTargetLabel] = useState('Localhost PostgreSQL');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [engine, setEngine] = useState<'postgresql' | 'mysql'>('postgresql');
  const [dialect, setDialect] = useState<'postgres' | 'mysql'>('postgres');
  const [connectionStringMasked, setConnectionStringMasked] = useState('postgresql://postgres:********@localhost:5432/zecratary?schema=public');
  const [activeHost, setActiveHost] = useState('localhost');
  const [activePort, setActivePort] = useState('5432');
  const [activeCatalog, setActiveCatalog] = useState('zecratary');
  const [latency, setLatency] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Form State - Localhost
  const [localhostType, setLocalhostType] = useState<'postgresql' | 'mysql'>('postgresql');
  const [localhostUri, setLocalhostUri] = useState('postgresql://postgres:postgres@localhost:5432/zecratary?schema=public');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [dbName, setDbName] = useState('zecratary');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('postgres');

  // Form State - Supabase Cloud
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceKey, setSupabaseServiceKey] = useState('');
  const [supabasePoolerUri, setSupabasePoolerUri] = useState('');

  // Form State - Custom URI
  const [customUri, setCustomUri] = useState('');

  // Telemetry & Tables
  const [telemetry, setTelemetry] = useState({
    version: 'PostgreSQL 15.x',
    databaseSize: '14.2 MB',
    cacheHitRatio: '99.4%',
    uptime: '14 days',
    activeConnections: 4,
    ssl: true
  });
  const [tables, setTables] = useState<TableInfo[]>([]);

  // UI Interactive States
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isSavingRef = useRef(false);

  // Load Database Telemetry & Settings
  const loadDatabaseData = useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/database?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data.status || 'disconnected');
        if (data.activeProfile) setActiveProfile(data.activeProfile);
        if (data.activeTargetLabel) setActiveTargetLabel(data.activeTargetLabel);
        if (data.connectionStringMasked) setConnectionStringMasked(data.connectionStringMasked);
        if (data.host) setActiveHost(data.host);
        if (data.port) setActivePort(data.port);
        if (data.databaseName) setActiveCatalog(data.databaseName);
        if (data.engine) setEngine(data.engine);
        if (data.dialect) setDialect(data.dialect);
        if (data.latency !== undefined) setLatency(data.latency);
        if (data.errorMessage) {
          setErrorMessage(data.errorMessage);
          setErrorCode(data.errorCode || 'SOCKET_ERROR');
        } else {
          setErrorMessage(null);
          setErrorCode(null);
        }

        if (data.config) {
          if (data.config.postgresUri) setLocalhostUri(data.config.postgresUri);
          if (data.config.supabaseUrl) setSupabaseUrl(data.config.supabaseUrl);
          if (data.config.supabaseAnonKey) setSupabaseAnonKey(data.config.supabaseAnonKey);
          if (data.config.supabaseServiceKey) setSupabaseServiceKey(data.config.supabaseServiceKey);
          if (data.config.supabasePoolerUri) setSupabasePoolerUri(data.config.supabasePoolerUri);
        }

        if (data.telemetry) setTelemetry(data.telemetry);
        if (Array.isArray(data.tables)) setTables(data.tables);
      }
    } catch (err) {
      console.warn('Notice loading /admin/database telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('dbPageTitle', 'Database Management & Configuration')} - Zecratary`;
    loadDatabaseData();

    const handleLocaleChange = () => {
      loadDatabaseData();
    };

    window.addEventListener('zecratary_theme_mode_changed', loadDatabaseData);
    window.addEventListener('zecratary_theme_changed', loadDatabaseData);
    window.addEventListener('zecratary_locale_changed', handleLocaleChange);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', loadDatabaseData);
      window.removeEventListener('zecratary_theme_changed', loadDatabaseData);
      window.removeEventListener('zecratary_locale_changed', handleLocaleChange);
    };
  }, [loadDatabaseData, t]);

  // Quick Preset Handlers
  const handleSelectPostgresPreset = () => {
    setLocalhostType('postgresql');
    setHost('localhost');
    setPort('5432');
    setDbName('zecratary');
    setUsername('postgres');
    setPassword('postgres');
    setLocalhostUri('postgresql://postgres:postgres@localhost:5432/zecratary?schema=public');
  };

  const handleSelectMysqlPreset = () => {
    setLocalhostType('mysql');
    setHost('127.0.0.1');
    setPort('3306');
    setDbName('zecratary');
    setUsername('root');
    setPassword('');
    setLocalhostUri('mysql://root:@127.0.0.1:3306/zecratary');
  };

  // Switch Active Database Target Profile ("Switch & Connect")
  const handleSwitchDatabase = async (targetType: string, uriToConnect: string, label: string) => {
    setSwitching(targetType);
    setToast(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch_database',
          targetProfile: targetType,
          uri: uriToConnect
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          message: `${t('switchSuccessToast', 'Switched active database successfully to')} ${label}!`
        });
        await loadDatabaseData();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to switch database.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Error executing switch.' });
    } finally {
      setSwitching(null);
    }
  };

  // Test Socket Handshake
  const handleTestConnection = async (targetUri: string) => {
    setTesting(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', uri: targetUri })
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          message: `${t('testSuccessToast', 'Database socket handshake succeeded! Latency:')} ${data.latency}ms`
        });
      } else {
        setToast({
          type: 'error',
          message: `${t('testFailedToast', 'Connection failed:')} ${data.error || 'Connection refused'}`
        });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: `${t('testFailedToast', 'Connection failed:')} ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  // Save and Activate Profile
  const handleSaveConnection = async (targetType: typeof activeProfile, uriToSave: string) => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_connection',
          targetProfile: targetType,
          uri: uriToSave,
          config: {
            supabaseUrl,
            supabaseAnonKey,
            supabaseServiceKey,
            supabasePoolerUri
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveProfile(targetType);
        setToast({
          type: 'success',
          message: t('savedToast', 'Database configuration saved and activated successfully!')
        });
        loadDatabaseData();
      } else {
        setToast({ type: 'error', message: data.error || t('errorToast', 'An error occurred while saving database settings.') });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || t('errorToast', 'An error occurred while saving database settings.') });
    } finally {
      setSaving(false);
    }
  };

  // Clone Localhost to Supabase
  const handleCloneLocalToSupabase = async () => {
    setCloning(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone_local_to_supabase',
          config: { supabasePoolerUri }
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          message: t('cloningSuccessToast', 'Database successfully cloned into Supabase Cloud!')
        });
        loadDatabaseData();
      } else {
        setToast({
          type: 'error',
          message: data.error || t('cloningErrorToast', 'Failed to clone database. Check connection sockets.')
        });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || t('cloningErrorToast', 'Failed to clone database. Check connection sockets.') });
    } finally {
      setCloning(false);
    }
  };

  // Optimize & Analyze Tables
  const handleOptimizeTables = async () => {
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize_tables' })
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          message: t('optimizingSuccessToast', 'Table statistics analyzed & vacuumed successfully!')
        });
        loadDatabaseData();
      }
    } catch (_) {}
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Database className="h-6 w-6" /> {t('dbPageTitle', 'Database Management & Configuration')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('dbPageSubtitle', 'Manage database connections, configure localhost & Supabase cloud instances, inspect live engine telemetry, and execute migrations.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDatabaseData()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title={t('refreshBtn', 'Refresh Telemetry')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refreshBtn', 'Refresh Telemetry')}</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PROMINENT CURRENTLY CONNECTED DATABASE HERO BANNER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div 
        role="region"
        aria-label="Currently Connected Database Hero"
        className="rounded-3xl p-6 border shadow-xl relative overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: isConnected ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-start sm:items-center gap-3">
            {/* Pulsing indicator */}
            <div 
              className="p-3 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
              style={{
                backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: isConnected ? 'var(--color-emerald)' : '#ef4444'
              }}
            >
              {isConnected ? (
                <CheckCircle2 className="h-6 w-6 animate-pulse" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  {isConnected ? t('heroConnectedTitle', 'Currently Connected Database') : t('heroConfiguredTitle', 'Currently Configured Database')}
                </span>

                <span 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 shadow-xs"
                  style={{
                    backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    borderColor: isConnected ? 'var(--color-emerald)' : '#ef4444',
                    color: isConnected ? 'var(--color-emerald)' : '#ef4444'
                  }}
                >
                  <Activity className="h-3 w-3" />
                  {isConnected ? t('heroActiveConnection', 'Active Connection') : t('heroDisconnected', 'Database Disconnected')}
                </span>
              </div>

              <h2 className="text-xl font-black mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                {activeTargetLabel}
              </h2>
              <div className="text-xs font-mono truncate max-w-xl opacity-80" style={{ color: 'var(--color-text-secondary)' }} title={connectionStringMasked}>
                {connectionStringMasked}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isConnected && (
              <button
                type="button"
                onClick={() => handleTestConnection(localhostUri)}
                disabled={testing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 cursor-pointer shadow"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {testing ? t('statusTesting', 'Testing...') : t('retryConnectionBtn', 'Retry Connection')}
              </button>
            )}
          </div>
        </div>

        {/* Live Coordinates Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs font-mono">
          <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="text-[10px] font-sans font-bold uppercase opacity-60">{t('dialectLabel', 'Dialect / Protocol')}</div>
            <div className="text-sm font-black mt-1" style={{ color: 'var(--color-primary)' }}>
              {dialect.toUpperCase()}
            </div>
          </div>

          <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="text-[10px] font-sans font-bold uppercase opacity-60">{t('hostPortLabel', 'Host & Port')}</div>
            <div className="text-sm font-black mt-1 truncate" style={{ color: 'var(--color-text)' }}>
              {activeHost}:{activePort}
            </div>
          </div>

          <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="text-[10px] font-sans font-bold uppercase opacity-60">{t('catalogLabel', 'Database Catalog')}</div>
            <div className="text-sm font-black mt-1 truncate" style={{ color: 'var(--color-text)' }}>
              {activeCatalog}
            </div>
          </div>

          <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="text-[10px] font-sans font-bold uppercase opacity-60">{t('telemetryLatency', 'Ping Latency')}</div>
            <div className="text-sm font-black mt-1 flex items-center gap-1.5" style={{ color: isConnected ? 'var(--color-emerald)' : '#ef4444' }}>
              <Zap className="h-3.5 w-3.5" />
              <span>{isConnected ? `${latency} ms` : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Offline Diagnostic Alert */}
        {!isConnected && errorMessage && (
          <div 
            className="mt-4 p-3.5 rounded-2xl border text-xs space-y-1"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
          >
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t('testFailedToast', 'Connection failed:')} {errorCode ? `[${errorCode}]` : ''} {errorMessage}</span>
            </div>
            <div className="text-[11px] opacity-90 pl-5">
              {t('socketAdviceContent', 'Ensure your database server is running, the port is open and not blocked by firewall, and authentication credentials match your environment.')}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN REGION CONTAINER & 5-TAB NAVIGATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div 
        role="region"
        data-lpignore="true"
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Navigation Tabs Bar */}
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200 overflow-x-auto"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          {[
            { id: 'choose', label: t('tabChooseDb', 'Choose Database'), icon: Radio },
            { id: 'localhost', label: t('tabLocalhost', 'Localhost Database'), icon: Server },
            { id: 'supabase', label: t('tabSupabase', 'Supabase Cloud'), icon: Cloud },
            { id: 'migration', label: t('tabMigration', 'Data Migration & Sync'), icon: ArrowRightLeft },
            { id: 'telemetry', label: t('tabTelemetry', 'Live Telemetry & Status'), icon: Activity }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`tab-${tab.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setToast(null);
                }}
                className="flex-1 min-w-[125px] py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                style={isActive ? {
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  borderWidth: '1px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                } : {
                  color: 'var(--color-text-secondary)'
                }}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 1: CHOOSE DATABASE (VISUAL SWITCHER WITH ACTIVE BADGES) */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'choose' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Radio className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {t('tabChooseDb', 'Choose Database')}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('chooseDbSubtitle', 'Select target database engine and switch active connection profile instantly.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD 1: LOCALHOST POSTGRESQL */}
              <div 
                className="p-5 rounded-2xl border flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: activeProfile === 'localhost_postgres' ? 'var(--color-primary)' : 'var(--color-border)',
                  borderWidth: activeProfile === 'localhost_postgres' ? '2px' : '1px'
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Server className="h-5 w-5" />
                    </div>
                    {activeProfile === 'localhost_postgres' && (
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border"
                        style={{
                          backgroundColor: 'rgba(224, 86, 56, 0.15)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {t('currentActiveBadge', 'CURRENT ACTIVE')}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      {t('profilePostgresTitle', 'Localhost PostgreSQL')}
                    </h4>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('profilePostgresDesc', 'Standard local PostgreSQL daemon listening on default TCP port 5432.')}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg border bg-black/10 truncate" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    localhost:5432 / zecratary
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {activeProfile === 'localhost_postgres' ? (
                    <div className="w-full py-2 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" /> {t('currentActiveBadge', 'CURRENT ACTIVE')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={switching !== null}
                      onClick={() => handleSwitchDatabase('localhost_postgres', 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public', 'Localhost PostgreSQL')}
                      className="w-full py-2 rounded-xl text-xs font-bold border transition hover:opacity-85 cursor-pointer shadow-xs disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {switching === 'localhost_postgres' ? t('switchingStatus', 'Switching...') : t('switchAndConnectBtn', 'Switch & Connect')}
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 2: SUPABASE CLOUD POOLER */}
              <div 
                className="p-5 rounded-2xl border flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: activeProfile === 'supabase_cloud' ? 'var(--color-primary)' : 'var(--color-border)',
                  borderWidth: activeProfile === 'supabase_cloud' ? '2px' : '1px'
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Cloud className="h-5 w-5" />
                    </div>
                    {activeProfile === 'supabase_cloud' && (
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border"
                        style={{
                          backgroundColor: 'rgba(224, 86, 56, 0.15)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {t('currentActiveBadge', 'CURRENT ACTIVE')}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      {t('profileSupabaseTitle', 'Supabase Cloud Pooler')}
                    </h4>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('profileSupabaseDesc', 'Hosted serverless PostgreSQL cluster via Supabase Transaction Pooler (Port 6543).')}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg border bg-black/10 truncate" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    aws-0-*.pooler.supabase.com:6543
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {activeProfile === 'supabase_cloud' ? (
                    <div className="w-full py-2 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" /> {t('currentActiveBadge', 'CURRENT ACTIVE')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={switching !== null || !supabasePoolerUri}
                      onClick={() => handleSwitchDatabase('supabase_cloud', supabasePoolerUri, 'Supabase Cloud')}
                      className="w-full py-2 rounded-xl text-xs font-bold border transition hover:opacity-85 cursor-pointer shadow-xs disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {switching === 'supabase_cloud' ? t('switchingStatus', 'Switching...') : t('switchAndConnectBtn', 'Switch & Connect')}
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 3: LOCALHOST MYSQL */}
              <div 
                className="p-5 rounded-2xl border flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: activeProfile === 'localhost_mysql' ? 'var(--color-primary)' : 'var(--color-border)',
                  borderWidth: activeProfile === 'localhost_mysql' ? '2px' : '1px'
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Database className="h-5 w-5" />
                    </div>
                    {activeProfile === 'localhost_mysql' && (
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border"
                        style={{
                          backgroundColor: 'rgba(224, 86, 56, 0.15)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {t('currentActiveBadge', 'CURRENT ACTIVE')}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      {t('profileMysqlTitle', 'Localhost MySQL')}
                    </h4>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('profileMysqlDesc', 'Standard local MySQL daemon listening on TCP port 3306.')}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg border bg-black/10 truncate" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    127.0.0.1:3306 / zecratary
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {activeProfile === 'localhost_mysql' ? (
                    <div className="w-full py-2 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" /> {t('currentActiveBadge', 'CURRENT ACTIVE')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={switching !== null}
                      onClick={() => handleSwitchDatabase('localhost_mysql', 'mysql://root:@127.0.0.1:3306/zecratary', 'Localhost MySQL')}
                      className="w-full py-2 rounded-xl text-xs font-bold border transition hover:opacity-85 cursor-pointer shadow-xs disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {switching === 'localhost_mysql' ? t('switchingStatus', 'Switching...') : t('switchAndConnectBtn', 'Switch & Connect')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 4: CUSTOM REMOTE URI SWITCHER */}
            <div 
              className="p-5 rounded-2xl border space-y-3"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('customUriCardTitle', 'Custom PostgreSQL / Remote URI')}
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('customUriCardDesc', 'Connect to external PostgreSQL instances (AWS RDS, Neon, Supabase, Google Cloud SQL, etc.).')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="postgresql://username:password@remote-host:5432/database?sslmode=require"
                  value={customUri}
                  onChange={(e) => setCustomUri(e.target.value)}
                  className="w-full flex-1 border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  disabled={switching !== null || !customUri.trim()}
                  onClick={() => handleSwitchDatabase('custom', customUri.trim(), 'Custom Remote Database')}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer disabled:opacity-50 shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {switching === 'custom' ? t('switchingStatus', 'Switching...') : t('switchAndConnectBtn', 'Switch & Connect')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 2: LOCALHOST DATABASE */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'localhost' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('tabLocalhost', 'Localhost Database')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Quick-fill presets for local PostgreSQL and MySQL daemon instances.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectPostgresPreset}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer"
                  style={{
                    backgroundColor: localhostType === 'postgresql' ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                    borderColor: localhostType === 'postgresql' ? 'var(--color-primary)' : 'var(--color-border)',
                    color: localhostType === 'postgresql' ? '#ffffff' : 'var(--color-text)'
                  }}
                >
                  PostgreSQL (5432)
                </button>
                <button
                  type="button"
                  onClick={handleSelectMysqlPreset}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer"
                  style={{
                    backgroundColor: localhostType === 'mysql' ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                    borderColor: localhostType === 'mysql' ? 'var(--color-primary)' : 'var(--color-border)',
                    color: localhostType === 'mysql' ? '#ffffff' : 'var(--color-text)'
                  }}
                >
                  MySQL (3306)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                {t('connectionUriLabel', 'Connection URI / Connection String')}
              </label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                value={localhostUri}
                onChange={(e) => setLocalhostUri(e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 text-xs font-mono font-bold outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('connectionUriHelp', 'Sensitive URI format. Passwords are never saved in browser localStorage.')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('hostLabel', 'Host / Server Address')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('portLabel', 'Port')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('databaseNameLabel', 'Database Name')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('usernameLabel', 'Username')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('passwordLabel', 'Password')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => handleTestConnection(localhostUri)}
                disabled={testing}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {testing ? t('statusTesting', 'Testing...') : t('testConnectionBtn', 'Test Socket Handshake')}
              </button>

              <button
                type="button"
                onClick={() => handleSaveConnection('localhost_postgres', localhostUri)}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? t('statusSaving', 'Saving...') : t('saveConnectBtn', 'Save & Activate Profile')}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 3: SUPABASE CLOUD */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'supabase' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Cloud className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {t('tabSupabase', 'Supabase Cloud')}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                Configure hosted PostgreSQL cloud instance, transaction pooler URI (Port 6543), and API keys.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('supabaseUrlLabel', 'Supabase Project URL')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('supabaseAnonKeyLabel', 'Supabase Anon / Publishable Key')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('supabaseServiceKeyLabel', 'Supabase Service Role Key (Secret)')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="Service role secret token..."
                  value={supabaseServiceKey}
                  onChange={(e) => setSupabaseServiceKey(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('supabasePoolerUriLabel', 'Supabase Transaction Pooler URI (Port 6543)')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
                  value={supabasePoolerUri}
                  onChange={(e) => setSupabasePoolerUri(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => handleTestConnection(supabasePoolerUri)}
                disabled={testing}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {testing ? t('statusTesting', 'Testing...') : t('testConnectionBtn', 'Test Socket Handshake')}
              </button>

              <button
                type="button"
                onClick={() => handleSaveConnection('supabase_cloud', supabasePoolerUri)}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? t('statusSaving', 'Saving...') : t('saveConnectBtn', 'Save & Activate Profile')}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 4: DATA MIGRATION & SYNC */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'migration' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <ArrowRightLeft className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {t('tabMigration', 'Data Migration & Sync')}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                Replicate schemas, migrate operational tables, and vacuum database catalogs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="p-5 rounded-2xl border space-y-3 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('cloneLocalToSupabaseBtn', 'Clone Localhost Database into Supabase')}
                  </h4>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('cloneLocalToSupabaseDesc', 'Replicates schemas and tables (admin_settings, users, subscription_plans, payment_transactions, etc.) from localhost PostgreSQL to Supabase Cloud.')}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCloneLocalToSupabase}
                    disabled={cloning}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Layers className={`h-4 w-4 ${cloning ? 'animate-spin' : ''}`} />
                    <span>{cloning ? t('cloningNotice', 'Cloning in progress... Please do not close this window.') : t('cloneLocalToSupabaseBtn', 'Clone Localhost Database into Supabase')}</span>
                  </button>
                </div>
              </div>

              <div 
                className="p-5 rounded-2xl border space-y-3 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('optimizeTablesBtn', 'Optimize & Analyze Tables')}
                  </h4>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Analyzes planner meals, grocery items, user profiles, and updates query planner selectivity heuristics.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOptimizeTables}
                    className="w-full py-2.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Wrench className="h-4 w-4" />
                    <span>{t('optimizeTablesBtn', 'Optimize & Analyze Tables')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 5: LIVE TELEMETRY & STATUS */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Activity className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {t('tabTelemetry', 'Live Telemetry & Status')}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                Real-time runtime statistics from database system catalogs.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: t('telemetryLatency', 'Ping Latency'), val: `${latency} ms`, icon: Zap },
                { label: t('telemetryActiveConns', 'Active Pool Connections'), val: telemetry.activeConnections, icon: Server },
                { label: t('telemetryDbSize', 'Database Disk Footprint'), val: telemetry.databaseSize, icon: HardDrive },
                { label: t('telemetryCacheHit', 'Cache Hit Efficiency'), val: telemetry.cacheHitRatio, icon: Activity },
                { label: t('telemetryUptime', 'Database Uptime'), val: telemetry.uptime, icon: Cpu },
                { label: t('telemetrySsl', 'SSL Encryption'), val: telemetry.ssl ? t('enabledBadge', 'Enabled') : t('disabledBadge', 'Disabled'), icon: Lock }
              ].map((card, idx) => (
                <div 
                  key={`telemetry-card-${idx}`}
                  className="p-3.5 rounded-2xl border flex flex-col justify-between h-24"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{card.label}</span>
                    <card.icon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="text-sm font-black font-mono" style={{ color: 'var(--color-text)' }}>
                    {card.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                {t('telemetryTables', 'Core Tables Tracked')}
              </h4>

              <div 
                className="rounded-2xl border overflow-hidden shadow-sm"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                        <th className="py-2.5 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colTableName', 'Table Name')}</th>
                        <th className="py-2.5 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colRowCount', 'Estimated Rows')}</th>
                        <th className="py-2.5 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colTableSize', 'Size on Disk')}</th>
                        <th className="py-2.5 px-4 font-bold text-right" style={{ color: 'var(--color-text)' }}>{t('colTableStatus', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {tables.map((tbl) => (
                        <tr key={`tbl-row-${tbl.name}`} className="transition hover:opacity-90">
                          <td className="py-2 px-4 font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                            {tbl.name}
                          </td>
                          <td className="py-2 px-4 font-mono" style={{ color: 'var(--color-text)' }}>
                            {tbl.rowCount}
                          </td>
                          <td className="py-2 px-4 font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {tbl.size}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <span 
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                              style={{ 
                                backgroundColor: 'rgba(16, 185, 129, 0.12)', 
                                borderColor: 'var(--color-emerald)', 
                                color: 'var(--color-emerald)' 
                              }}
                            >
                              {t('healthyStatus', 'Healthy')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Notification Toast Banner */}
        {toast && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: toast.type === 'success' ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
              color: toast.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
