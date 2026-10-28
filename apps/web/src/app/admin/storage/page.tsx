// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Server, Cloud, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Check, Eye, EyeOff, Sliders, ShieldCheck, 
  AlertTriangle, Activity, Database, Layers, ChevronDown, FileJson, 
  FolderCheck, Image as ImageIcon, FolderArchive, ArrowUpRight
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export interface LocalhostStorageConfig {
  recipesJsonDir: string;
  uploadDir: string;
  uploadPath?: string;
  publicPrefix: string;
  publicServingUrl?: string;
  maxFileSizeMb: number;
}

export interface SupabaseStorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  bucket?: string;
  publicUrlPrefix: string;
  publicUrl?: string;
  maxFileSizeMb: number;
  enabled?: boolean;
}

export interface StorageSettings {
  provider: 'localhost' | 'supabase';
  localhost: LocalhostStorageConfig;
  supabase: SupabaseStorageConfig;
  allowedFormats: string[];
  isConnected?: boolean;
}

export interface DiskDiagnostics {
  recipesJson: {
    configuredPath: string;
    resolvedPath: string;
    exists: boolean;
    writable: boolean;
    fileCount: number;
  };
  recipeImages: {
    configuredPath: string;
    resolvedPath: string;
    exists: boolean;
    writable: boolean;
    fileCount: number;
  };
  status: 'healthy' | 'degraded';
}

const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  provider: 'localhost',
  localhost: {
    recipesJsonDir: 'apps/web/public/recipes',
    uploadDir: 'apps/web/public/recipes/images',
    uploadPath: 'apps/web/public/recipes/images',
    publicPrefix: '/recipes/images',
    publicServingUrl: '/recipes/images',
    maxFileSizeMb: 10
  },
  supabase: {
    endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
    region: 'us-west-1',
    accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
    secretAccessKey: '',
    bucketName: 'recipes',
    bucket: 'recipes',
    publicUrlPrefix: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
    publicUrl: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
    maxFileSizeMb: 25,
    enabled: false
  },
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  isConnected: false
};

const STANDARD_REGIONS = [
  { id: 'us-west-1', label: 'us-west-1 (N. California / Supabase Default)' },
  { id: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
  { id: 'us-east-2', label: 'us-east-2 (Ohio)' },
  { id: 'eu-central-1', label: 'eu-central-1 (Frankfurt)' },
  { id: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
  { id: 'eu-west-2', label: 'eu-west-2 (London)' },
  { id: 'eu-west-3', label: 'eu-west-3 (Paris)' },
  { id: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' },
  { id: 'ap-southeast-2', label: 'ap-southeast-2 (Sydney)' },
  { id: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
  { id: 'ap-northeast-2', label: 'ap-northeast-2 (Seoul)' },
  { id: 'sa-east-1', label: 'sa-east-1 (São Paulo)' },
  { id: 'custom', label: 'Custom / Other Region...' }
];

export default function AdminStoragePage() {
  const { t } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [settings, setSettings] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [diagnostics, setDiagnostics] = useState<DiskDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [isCustomRegion, setIsCustomRegion] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4500);
  };

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
            localhost: {
              ...prev.localhost,
              ...(loaded.localhost || {}),
              recipesJsonDir: loaded.localhost?.recipesJsonDir || prev.localhost.recipesJsonDir,
              uploadDir: loaded.localhost?.uploadDir || loaded.localhost?.uploadPath || prev.localhost.uploadDir,
              publicPrefix: loaded.localhost?.publicPrefix || loaded.localhost?.publicServingUrl || prev.localhost.publicPrefix
            },
            supabase: { ...prev.supabase, ...(loaded.supabase || {}) },
            allowedFormats: Array.isArray(loaded.allowedFormats) ? loaded.allowedFormats : prev.allowedFormats
          }));
          const reg = loaded.supabase?.region || 'us-west-1';
          setIsCustomRegion(!STANDARD_REGIONS.some(r => r.id === reg));
        }
        if (data.diagnostics) {
          setDiagnostics(data.diagnostics);
        }
      }
    } catch (err) {
      console.warn('[Storage Settings] Fallback to client state:', err);
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
    window.addEventListener('zecratary_theme_mode_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_storage_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
    };
  }, [loadStorageSettings, tr]);

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
        if (data.diagnostics) setDiagnostics(data.diagnostics);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_storage_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          try {
            localStorage.setItem('zecratary_storage_updated_at', Date.now().toString());
          } catch (_) {}
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
          msg: tr('storageTestSuccess', 'Successfully connected to Supabase S3! Bucket "{bucket}" is reachable and ready.').replace('{bucket}', settings.supabase.bucketName || 'recipes')
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

  const handleApplyRecommendedLocalhost = () => {
    setSettings(prev => ({
      ...prev,
      provider: 'localhost',
      localhost: {
        recipesJsonDir: 'apps/web/public/recipes',
        uploadDir: 'apps/web/public/recipes/images',
        uploadPath: 'apps/web/public/recipes/images',
        publicPrefix: '/recipes/images',
        publicServingUrl: '/recipes/images',
        maxFileSizeMb: 10
      }
    }));
    showToast('success', tr('storagePresetLocalhost', 'Applied Localhost recommended settings.'));
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
        bucket: 'recipes',
        publicUrlPrefix: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
        publicUrl: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
        maxFileSizeMb: 25,
        enabled: true
      }
    }));
    setIsCustomRegion(false);
    showToast('success', tr('storagePresetRecommended', 'Applied Supabase recommended settings.'));
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_STORAGE_SETTINGS);
    setIsCustomRegion(false);
    setTestResult(null);
    showToast('success', 'Reset storage parameters to initial defaults.');
  };

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 pt-2 font-sans transition-colors duration-200"
      style={{ boxSizing: 'border-box', color: 'var(--color-text)' }}
      role="region"
      aria-label={tr('storageTitle', 'Media & Asset Storage Configuration')}
      data-lpignore="true"
    >
      {/* 1. Top Header & Action Controls */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <HardDrive className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            {tr('storageTitle', 'Media & Asset Storage Configuration')}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('storageSubtitle', 'Configure storage destinations for recipe scrapers, user uploads, AI generated dishes, and branding assets.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-xs select-none"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-xs disabled:opacity-50"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-xs"
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
            className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition hover:opacity-90 cursor-pointer disabled:opacity-50"
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

      {/* 2. Storage Engine Monitor & Universal Disk Diagnostics Bar */}
      <div 
        className="p-4 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
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

          <div className="flex items-center gap-5 font-semibold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
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

        {/* RESTORED: Universal Disk Diagnostics & Server Filesystem Health Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
              <FolderCheck className="h-4 w-4" />
              {tr('storageDiskDiagnosticsHeading', 'Universal Disk Diagnostics & Filesystem Health')}
            </span>
            <span className="text-[11px] opacity-75 font-mono">
              {diagnostics?.status === 'healthy' ? '🟢 Health: OK' : '🟡 Health: Inspect Paths'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Card 1: Recipes JSON Directory */}
            <div 
              className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {tr('storageJsonDirLabel', 'Recipe JSON Storage Directory')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: diagnostics?.recipesJson.exists ? 'color-mix(in srgb, var(--color-emerald, #10b981) 15%, transparent)' : 'rgba(239, 68, 68, 0.15)',
                      borderColor: diagnostics?.recipesJson.exists ? 'var(--color-emerald, #10b981)' : '#ef4444',
                      color: diagnostics?.recipesJson.exists ? 'var(--color-emerald, #10b981)' : '#ef4444'
                    }}
                  >
                    {diagnostics?.recipesJson.exists ? tr('storageDirExists', 'Directory Exists') : tr('storageDirMissing', 'Not Found')}
                  </span>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: diagnostics?.recipesJson.writable ? 'color-mix(in srgb, var(--color-emerald, #10b981) 15%, transparent)' : 'rgba(245, 158, 11, 0.15)',
                      borderColor: diagnostics?.recipesJson.writable ? 'var(--color-emerald, #10b981)' : '#f59e0b',
                      color: diagnostics?.recipesJson.writable ? 'var(--color-emerald, #10b981)' : '#fbbf24'
                    }}
                  >
                    {diagnostics?.recipesJson.writable ? tr('storageDirWritable', 'Writable') : tr('storageDirReadOnly', 'Read-Only')}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono break-all opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                {diagnostics?.recipesJson.resolvedPath || settings.localhost.recipesJsonDir}
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold" style={{ borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{tr('storageJsonFilesCountLabel', 'Stored Recipe JSONs')}:</span>
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                  {diagnostics?.recipesJson.fileCount ?? 0} files
                </span>
              </div>
            </div>

            {/* Card 2: Recipes Images Directory */}
            <div 
              className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {tr('storageLocalhostImagesPathLabel', 'Images Storage Directory Path')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: diagnostics?.recipeImages.exists ? 'color-mix(in srgb, var(--color-emerald, #10b981) 15%, transparent)' : 'rgba(239, 68, 68, 0.15)',
                      borderColor: diagnostics?.recipeImages.exists ? 'var(--color-emerald, #10b981)' : '#ef4444',
                      color: diagnostics?.recipeImages.exists ? 'var(--color-emerald, #10b981)' : '#ef4444'
                    }}
                  >
                    {diagnostics?.recipeImages.exists ? tr('storageDirExists', 'Directory Exists') : tr('storageDirMissing', 'Not Found')}
                  </span>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: diagnostics?.recipeImages.writable ? 'color-mix(in srgb, var(--color-emerald, #10b981) 15%, transparent)' : 'rgba(245, 158, 11, 0.15)',
                      borderColor: diagnostics?.recipeImages.writable ? 'var(--color-emerald, #10b981)' : '#f59e0b',
                      color: diagnostics?.recipeImages.writable ? 'var(--color-emerald, #10b981)' : '#fbbf24'
                    }}
                  >
                    {diagnostics?.recipeImages.writable ? tr('storageDirWritable', 'Writable') : tr('storageDirReadOnly', 'Read-Only')}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono break-all opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                {diagnostics?.recipeImages.resolvedPath || settings.localhost.uploadDir}
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold" style={{ borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{tr('storageImagesCountLabel', 'Stored Recipe Images')}:</span>
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-emerald, #10b981)' }}>
                  {diagnostics?.recipeImages.fileCount ?? 0} files
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Provider Selector Section */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Sliders className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            {tr('storageProviderLabel', 'Active Storage Provider')}
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[200px]">
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as 'localhost' | 'supabase' })}
                aria-label={tr('storageProviderSelect', 'Select Active Provider')}
                className="w-full appearance-none pl-3.5 pr-9 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition focus:border-[var(--color-primary)] shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="localhost" className="bg-[var(--color-card)] text-[var(--color-text)]">
                  Localhost (Server Disk)
                </option>
                <option value="supabase" className="bg-[var(--color-card)] text-[var(--color-text)]">
                  Supabase Storage (S3 Protocol)
                </option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 opacity-60" />
            </div>

            <button
              type="button"
              onClick={handleApplyRecommendedLocalhost}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Localhost Preset
            </button>
            <button
              type="button"
              onClick={handleApplyRecommendedSupabase}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
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
              settings.provider === 'localhost' ? 'shadow-md ring-1 ring-[var(--color-primary)]' : 'opacity-70 hover:opacity-100'
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
                {tr('providerLocalhostDesc', 'Store uploaded and scraped images directly on the server filesystem (apps/web/public/recipes/images).')}
              </p>
            </div>
            <div className="pt-3 border-t mt-3 text-[11px] font-mono flex items-center justify-between opacity-75" style={{ borderColor: 'var(--color-border)' }}>
              <span>apps/web/public/recipes/</span>
              <span>10 MB Max</span>
            </div>
          </div>

          {/* Supabase S3 Cloud Storage Card */}
          <div
            onClick={() => setSettings({ ...settings, provider: 'supabase' })}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
              settings.provider === 'supabase' ? 'shadow-md ring-1 ring-[var(--color-primary)]' : 'opacity-70 hover:opacity-100'
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
              <span>recipes bucket ({settings.supabase.region || 'us-west-1'})</span>
              <span>25 MB Max</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Configuration Form Panels with Autofill Guardrails */}
      <div 
        role="region"
        aria-label="Storage Provider Form Configurations"
        data-lpignore="true"
        className="space-y-6"
      >
        {/* Localhost Configuration Section with RESTORED JSON Directory Field */}
        {settings.provider === 'localhost' && (
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <Server className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              <h2 className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                {tr('storageLocalhostSettingsHeading', 'Localhost Storage Settings')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              {/* RESTORED: Recipe JSON Storage Directory */}
              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageJsonDirLabel', 'Recipe JSON Storage Directory')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.localhost.recipesJsonDir}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { 
                      ...settings.localhost, 
                      recipesJsonDir: e.target.value 
                    }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-[10px] block mt-1 font-sans" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('storageJsonDirDesc', 'Filesystem folder where atomic recipe JSON files (.json) are created and persisted.')}
                </span>
              </div>

              {/* RESTORED: Images Storage Directory Path */}
              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageLocalhostImagesPathLabel', 'Images Storage Directory Path')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.localhost.uploadDir}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { 
                      ...settings.localhost, 
                      uploadDir: e.target.value,
                      uploadPath: e.target.value 
                    }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-[10px] block mt-1 font-sans" style={{ color: 'var(--color-text-secondary)' }}>
                  Destination for local dish photography, user uploads, and scraper downloads.
                </span>
              </div>

              {/* Public Images Serving URL Prefix */}
              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageLocalhostServingUrlLabel', 'Images Public Serving URL Prefix')} *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.localhost.publicPrefix}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { 
                      ...settings.localhost, 
                      publicPrefix: e.target.value,
                      publicServingUrl: e.target.value 
                    }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Max Upload File Size */}
              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageLocalhostMaxFileSizeLabel', 'Max Upload File Size (MB)')} *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={settings.localhost.maxFileSizeMb}
                  onChange={(e) => setSettings({
                    ...settings,
                    localhost: { ...settings.localhost, maxFileSizeMb: parseInt(e.target.value, 10) || 10 }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Supabase S3 Configuration Section */}
        {settings.provider === 'supabase' && (
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-5 transition-colors duration-200"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <ShieldCheck className={`h-4 w-4 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? tr('storageTestingConnection', 'Testing S3 Connection...') : tr('storageTestConnectionBtn', 'Test S3 Connection')}</span>
                </button>
              </div>
            </div>

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
                  spellCheck={false}
                  value={settings.supabase.endpoint}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, endpoint: e.target.value }
                  })}
                  placeholder="https://<project-ref>.storage.supabase.co/storage/v1/s3"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Cloud Region */}
              <div>
                <label className="block font-bold mb-1 font-sans" style={{ color: 'var(--color-text)' }}>
                  {tr('storageSupabaseRegionLabel', 'Region')} *
                </label>
                <div className="relative">
                  <select
                    value={isCustomRegion ? 'custom' : settings.supabase.region}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomRegion(true);
                      } else {
                        setIsCustomRegion(false);
                        setSettings({
                          ...settings,
                          supabase: { ...settings.supabase, region: e.target.value }
                        });
                      }
                    }}
                    aria-label={tr('storageRegionSelect', 'Select Cloud Region')}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border outline-none font-bold cursor-pointer transition focus:border-[var(--color-primary)] shadow-xs"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {STANDARD_REGIONS.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[var(--color-card)] text-[var(--color-text)]">
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-60" />
                </div>

                {isCustomRegion && (
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    placeholder="Enter custom region code (e.g. eu-north-1)"
                    value={settings.supabase.region}
                    onChange={(e) => setSettings({
                      ...settings,
                      supabase: { ...settings.supabase, region: e.target.value }
                    })}
                    className="w-full mt-2 px-3.5 py-2 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                )}
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
                  spellCheck={false}
                  value={settings.supabase.bucketName}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { 
                      ...settings.supabase, 
                      bucketName: e.target.value,
                      bucket: e.target.value 
                    }
                  })}
                  placeholder="recipes"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
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
                  spellCheck={false}
                  value={settings.supabase.accessKeyId}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { ...settings.supabase, accessKeyId: e.target.value }
                  })}
                  placeholder="f3e0affef5c74972a535153349eb24cc"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
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
                    spellCheck={false}
                    value={settings.supabase.secretAccessKey}
                    onChange={(e) => setSettings({
                      ...settings,
                      supabase: { ...settings.supabase, secretAccessKey: e.target.value }
                    })}
                    placeholder="Enter Secret Key from Supabase Dashboard..."
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold pr-10 transition focus:border-[var(--color-primary)]"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-2.5 opacity-60 hover:opacity-100 transition cursor-pointer"
                    aria-label={showSecretKey ? 'Hide Secret Key' : 'Show Secret Key'}
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
                  spellCheck={false}
                  value={settings.supabase.publicUrlPrefix}
                  onChange={(e) => setSettings({
                    ...settings,
                    supabase: { 
                      ...settings.supabase, 
                      publicUrlPrefix: e.target.value,
                      publicUrl: e.target.value 
                    }
                  })}
                  placeholder="https://<project-ref>.supabase.co/storage/v1/object/public/recipes"
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold transition focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Allowed Formats Tag Selector */}
        <div 
          className="p-6 rounded-3xl border shadow-sm space-y-3 transition-colors duration-200"
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
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold font-mono uppercase transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
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
            className="px-4 py-2.5 border font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-80"
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
            className="px-7 py-2.5 text-white font-bold rounded-xl transition text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-90"
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
