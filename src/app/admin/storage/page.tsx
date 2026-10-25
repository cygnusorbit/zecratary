'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Server, Cloud, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Check, Eye, EyeOff, Globe, Zap, Sliders, ShieldCheck, 
  Terminal, ExternalLink, Code2, AlertTriangle, Activity, 
  FolderCheck, Sparkles, Database, Layers, ArrowRight
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export interface LocalhostStorageConfig {
  uploadPath: string;
  publicServingUrl: string;
  maxFileSizeMb: number;
}

export interface SupabaseStorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrlPrefix: string;
  maxFileSizeMb: number;
}

export interface StorageSettings {
  provider: 'localhost' | 'supabase';
  localhost: LocalhostStorageConfig;
  supabase: SupabaseStorageConfig;
  allowedFormats: string[];
  isConnected?: boolean;
}

const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  provider: 'localhost',
  localhost: {
    uploadPath: 'public/uploads/recipes',
    publicServingUrl: '/uploads/recipes',
    maxFileSizeMb: 10
  },
  supabase: {
    endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
    region: 'us-west-1',
    accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
    secretAccessKey: '',
    bucketName: 'recipes',
    publicUrlPrefix: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
    maxFileSizeMb: 25
  },
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  isConnected: false
};

export default function AdminStoragePage() {
  const { t, locale } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [settings, setSettings] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Load Storage Configurations from API / Database
  const loadStorageSettings = useCallback(async () => {
    if (isFetchingRef.current || isSavingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/storage?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.storageSettings || data.settings) {
          const loaded = data.storageSettings || data.settings;
          setSettings(prev => ({
            ...prev,
            ...loaded,
            localhost: { ...prev.localhost, ...(loaded.localhost || {}) },
            supabase: { ...prev.supabase, ...(loaded.supabase || {}) },
            allowedFormats: Array.isArray(loaded.allowedFormats) ? loaded.allowedFormats : prev.allowedFormats
          }));
        }
      }
    } catch (err) {
      console.warn('[Storage Settings] Using local configuration defaults:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    document.title = `${tr('storageTitle', 'Media & Asset Storage Configuration')} - Admin`;
    loadStorageSettings();

    const handleSync = () => loadStorageSettings();
    window.addEventListener('zecratary_storage_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_storage_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadStorageSettings, tr]);

  // Save Settings to PostgreSQL & JSON store
  const handleSaveSettings = async () => {
    if (saving || isSavingRef.current) return;
    setSaving(true);
    isSavingRef.current = true;
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageSettings: settings })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_storage_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          localStorage.setItem('zecratary_storage_updated_at', Date.now().toString());
        }
        showToast('success', tr('storageSaveSuccess', 'Storage settings saved and synchronized with PostgreSQL & MySQL!'));
      } else {
        throw new Error(data.error || 'Failed to save storage settings.');
      }
    } catch (err: any) {
      showToast('error', err.message || tr('storageSaveError', 'Failed to save storage settings. Please try again.'));
    } finally {
      setSaving(false);
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  // Test S3 Connection to Supabase Bucket
  const handleTestS3Connection = async () => {
    if (testingConnection) return;
    const secretKey = settings.supabase.secretAccessKey?.trim();

    if (!secretKey) {
      setTestResult({
        success: false,
        msg: tr('storageEnterSecretKeyToTest', 'Please enter your Secret Access Key before testing the connection.')
      });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.supabase)
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          msg: tr('storageTestSuccess', 'Successfully connected to Supabase S3! Bucket "{bucket}" is reachable and ready.').replace('{bucket}', settings.supabase.bucketName)
        });
        setSettings(prev => ({ ...prev, isConnected: true }));
      } else {
        setTestResult({
          success: false,
          msg: tr('storageTestFailed', 'Connection failed: {error}').replace('{error}', data.error || 'Could not verify S3 bucket.')
        });
        setSettings(prev => ({ ...prev, isConnected: false }));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: tr('storageTestFailed', 'Connection failed: {error}').replace('{error}', err.message || 'Network timeout.')
      });
      setSettings(prev => ({ ...prev, isConnected: false }));
    } finally {
      setTestingConnection(false);
    }
  };

  const handleApplyRecommendedSupabase = () => {
    setSettings(prev => ({
      ...prev,
      provider: 'supabase',
      supabase: {
        ...prev.supabase,
        endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
        region: 'us-west-1',
        accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
        bucketName: 'recipes',
        publicUrlPrefix: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
        maxFileSizeMb: 25
      }
    }));
    showToast('success', tr('storagePresetRecommended', 'Applied Supabase recommended settings.'));
  };

  const handleApplyRecommendedLocalhost = () => {
    setSettings(prev => ({
      ...prev,
      provider: 'localhost',
      localhost: {
        uploadPath: 'public/uploads/recipes',
        publicServingUrl: '/uploads/recipes',
        maxFileSizeMb: 10
      }
    }));
    showToast('success', tr('storagePresetLocalhost', 'Applied Localhost recommended settings.'));
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_STORAGE_SETTINGS);
    setTestResult(null);
    showToast('success', 'Reset storage parameters to initial defaults.');
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. Header & Quick Actions */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <HardDrive className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            {tr('storageTitle', 'Media & Asset Storage Configuration')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('storageSubtitle', 'Configure storage destinations for recipe scrapers, user uploads, AI generated dishes, and branding assets.')}
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
            <span>{tr('storageSyncBadge', 'Synced with PostgreSQL & MySQL')}</span>
          </div>

          <button
            type="button"
            onClick={loadStorageSettings}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{tr('storageReloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span>{tr('storageResetBtn', 'Reset Defaults')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? tr('storageSavingBtn', 'Saving...') : tr('storageSaveBtn', 'Save Storage Settings')}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
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

      {/* 2. Storage Engine Monitor Summary Bar */}
      <div 
        className="p-3.5 px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text)' }}>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            {tr('storageTelemetryHeading', 'Storage Engine Monitor')}
          </span>
          <span 
            className="font-extrabold uppercase px-2.5 py-0.5 rounded text-[11px] border"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            {settings.provider === 'localhost' ? 'Localhost Disk' : 'Supabase S3 Cloud'}
          </span>
          <span 
            className="font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: settings.provider === 'localhost' ? 'var(--color-emerald, #10b981)' : (settings.isConnected ? 'var(--color-emerald, #10b981)' : '#f59e0b'),
              color: settings.provider === 'localhost' ? 'var(--color-emerald, #10b981)' : (settings.isConnected ? 'var(--color-emerald, #10b981)' : '#fbbf24')
            }}
          >
            {settings.provider === 'localhost' ? 'Filesystem Ready' : (settings.isConnected ? tr('storageStatusConnected', 'S3 Connected') : tr('storageStatusDisconnected', 'Not Connected'))}
          </span>
        </div>

        <div className="flex items-center gap-4 font-semibold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          <div>
            {tr('storageMaxFileSizeLabel', 'Max Upload Limit:')}{' '}
            <span className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>
              {settings.provider === 'localhost' ? settings.localhost.maxFileSizeMb : settings.supabase.maxFileSizeMb} MB
            </span>
          </div>
          <div>
            <span>Formats: </span>
            <span className="font-bold font-mono uppercase" style={{ color: 'var(--color-text)' }}>
              {settings.allowedFormats.join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Provider Selector Cards */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Sliders className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            {tr('storageProviderLabel', 'Active Storage Provider')}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyRecommendedLocalhost}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Localhost Preset
            </button>
            <button
              type="button"
              onClick={handleApplyRecommendedSupabase}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            >
              Supabase Preset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Localhost Card */}
          <div
            onClick={() => setSettings({ ...settings, provider: 'localhost' })}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
              settings.provider === 'localhost' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: settings.provider === 'localhost' ? 'var(--color-primary)' : 'var(--color-border)'
            }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Server className="h-4 w-4 text-emerald-400" />
                  {tr('providerLocalhostTitle', 'Localhost (Server Disk)')}
                </span>
                {settings.provider === 'localhost' && (
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('providerLocalhostDesc', 'Store uploaded and scraped images directly on the server filesystem (public/uploads/recipes).')}
              </p>
            </div>
            <div className="pt-3 border-t mt-3 text-[11px] font-mono flex items-center justify-between opacity-75" style={{ borderColor: 'var(--color-border)' }}>
              <span>public/uploads/recipes/</span>
              <span>10 MB Max</span>
            </div>
          </div>

          {/* Supabase S3 Cloud Storage Card */}
          <div
            onClick={() => setSettings({ ...settings, provider: 'supabase' })}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
              settings.provider === 'supabase' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: settings.provider === 'supabase' ? 'var(--color-primary)' : 'var(--color-border)'
            }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Cloud className="h-4 w-4 text-emerald-400" />
                  {tr('providerSupabaseTitle', 'Supabase Storage (S3 Protocol)')}
                </span>
                {settings.provider === 'supabase' && (
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('providerSupabaseDesc', 'Upload images directly to Supabase S3-compatible cloud bucket with public CDN delivery.')}
              </p>
            </div>
            <div className="pt-3 border-t mt-3 text-[11px] font-mono flex items-center justify-between opacity-75" style={{ borderColor: 'var(--color-border)' }}>
              <span>recipes bucket (us-west-1)</span>
              <span>25 MB Max</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Configuration Form Cards (Autofill Safe Guardrails - Constraint 9) */}
      <div 
        role="region"
        data-lpignore="true"
        className="space-y-6"
      >
        {/* Localhost Configuration Section */}
        {settings.provider === 'localhost' && (
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <Server className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              <h2 className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                {tr('storageLocalhostSettingsHeading', 'Localhost Storage Settings')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageLocalhostPathLabel', 'Upload Directory Path')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.localhost.uploadPath}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { ...settings.localhost, uploadPath: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageLocalhostServingUrlLabel', 'Public Web Serving URL Prefix')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.localhost.publicServingUrl}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { ...settings.localhost, publicServingUrl: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageLocalhostMaxFileSizeLabel', 'Max Upload File Size (MB)')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  autoComplete="off"
                  data-lpignore="true"
                  value={settings.localhost.maxFileSizeMb}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { ...settings.localhost, maxFileSizeMb: parseInt(e.target.value, 10) || 10 }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Supabase S3 Configuration Section */}
        {settings.provider === 'supabase' && (
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-5 transition-colors"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <h2 className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseSettingsHeading', 'Supabase S3 Cloud Storage Settings')}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestS3Connection}
                  disabled={testingConnection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <ShieldCheck className={`h-4 w-4 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? tr('storageTestingConnection', 'Testing S3 Connection...') : tr('storageTestConnectionBtn', 'Test S3 Connection')}</span>
                </button>
              </div>
            </div>

            {/* S3 Test Diagnostic Result Banner */}
            {testResult && (
              <div 
                className="p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2 shadow-sm animate-in fade-in"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: testResult.success ? 'var(--color-emerald, #10b981)' : '#ef4444',
                  color: testResult.success ? 'var(--color-emerald, #10b981)' : '#ef4444'
                }}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                )}
                <span>{testResult.msg}</span>
              </div>
            )}

            <div className="p-3 rounded-2xl border text-xs flex items-start gap-2 leading-relaxed" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{tr('storageSupabaseHelpNotice', 'Ensure your Supabase storage bucket is set to "Public" in the Supabase Dashboard so images can be viewed without authentication tokens.')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseEndpointLabel', 'S3 Endpoint URL')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.supabase.endpoint}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, endpoint: e.target.value }
                  })}
                  placeholder="https://<project-ref>.storage.supabase.co/storage/v1/s3"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseRegionLabel', 'Region')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.supabase.region}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, region: e.target.value }
                  })}
                  placeholder="us-west-1"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseBucketLabel', 'Bucket Name')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.supabase.bucketName}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, bucketName: e.target.value }
                  })}
                  placeholder="recipes"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseAccessKeyLabel', 'Access Key ID')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.supabase.accessKeyId}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, accessKeyId: e.target.value }
                  })}
                  placeholder="f3e0affef5c74972a535153349eb24cc"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseSecretKeyLabel', 'Secret Access Key')} *
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={settings.supabase.secretAccessKey}
                    onChange={(e) => setSettings({
                      ...settings,
                      supabase: { ...settings.supabase, secretAccessKey: e.target.value }
                    })}
                    placeholder="Enter Secret Key from Supabase Access Keys..."
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold pr-10"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-2.5 opacity-60 hover:opacity-100 transition cursor-pointer"
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabasePublicUrlLabel', 'Public CDN URL Prefix')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.supabase.publicUrlPrefix}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, publicUrlPrefix: e.target.value }
                  })}
                  placeholder="https://<project-ref>.supabase.co/storage/v1/object/public/recipes"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Allowed Formats Multi-Tag Selector */}
        <div 
          className="p-6 rounded-3xl border shadow-sm space-y-3 transition-colors"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <Layers className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            <h2 className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
              {tr('storageAllowedFormatsLabel', 'Allowed Image Formats')}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].map((fmt) => {
              const isSelected = settings.allowedFormats.includes(fmt);
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? settings.allowedFormats.filter(f => f !== fmt)
                      : [...settings.allowedFormats, fmt];
                    setSettings({ ...settings, allowedFormats: next });
                  }}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold font-mono uppercase transition cursor-pointer flex items-center gap-1.5"
                  style={isSelected ? {
                    backgroundColor: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    color: '#ffffff'
                  } : {
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <span>{fmt}</span>
                  {isSelected && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Persistent Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={loadStorageSettings}
            className="px-4 py-2.5 border font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <RefreshCw className="h-4 w-4" />
            <span>{tr('storageReloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-7 py-2.5 text-white font-bold rounded-xl transition text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? tr('storageSavingBtn', 'Saving...') : tr('storageSaveBtn', 'Save Storage Settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
