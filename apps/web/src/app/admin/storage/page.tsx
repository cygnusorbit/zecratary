'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Cloud, Server, Check, AlertCircle, Save, 
  Wifi, Copy, Eye, EyeOff, ShieldCheck, Zap, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface StorageSettingsState {
  provider: 'localhost' | 'supabase';
  localhost: {
    uploadDir: string;
    publicPrefix: string;
    maxSizeMb: number;
    allowedTypes?: string;
  };
  supabase: {
    enabled: boolean;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  };
}

const SUPABASE_RECOMMENDED = {
  endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
  region: 'us-west-1',
  accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
  bucket: 'recipes',
  publicUrl: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
};

const LOCALHOST_RECOMMENDED = {
  uploadDir: 'public/uploads/recipes',
  publicPrefix: '/uploads/recipes',
  maxSizeMb: 10,
  allowedTypes: 'image/jpeg, image/png, image/webp, image/gif',
};

export default function AdminStorageSettingsPage() {
  const { t } = useTranslation();

  const [mounted, setMounted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);

  // Status Alerts
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string>('');

  const [settings, setSettings] = useState<StorageSettingsState>({
    provider: 'localhost',
    localhost: LOCALHOST_RECOMMENDED,
    supabase: {
      enabled: true,
      ...SUPABASE_RECOMMENDED,
      secretAccessKey: '',
    },
  });

  useEffect(() => {
    setMounted(true);
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/storage', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings(prev => ({
              ...prev,
              ...data.settings,
              localhost: { ...prev.localhost, ...(data.settings.localhost || {}) },
              supabase: { ...prev.supabase, ...(data.settings.supabase || {}) },
            }));
          }
        }
      } catch (_) {} finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleLoadRecommendedSupabase = () => {
    setSettings(prev => ({
      ...prev,
      supabase: {
        ...prev.supabase,
        endpoint: SUPABASE_RECOMMENDED.endpoint,
        region: SUPABASE_RECOMMENDED.region,
        accessKeyId: SUPABASE_RECOMMENDED.accessKeyId,
        bucket: SUPABASE_RECOMMENDED.bucket,
        publicUrl: SUPABASE_RECOMMENDED.publicUrl,
      },
    }));
  };

  const handleLoadRecommendedLocalhost = () => {
    setSettings(prev => ({
      ...prev,
      localhost: { ...LOCALHOST_RECOMMENDED },
    }));
  };

  // Test Supabase Connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSaveError('');

    try {
      const res = await fetch('/api/admin/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.supabase),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error testing connection' });
    } finally {
      setTesting(false);
    }
  };

  // Save Settings to PostgreSQL
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(t('storageSettingsSaved', 'Storage settings saved successfully to PostgreSQL.'));
        setTimeout(() => setSaveSuccess(''), 4000);
      } else {
        setSaveError(data.error || 'Failed to save storage settings');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Server error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-t-transparent mx-auto" style={{ borderColor: 'var(--color-primary)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Loading storage settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full min-w-0" style={{ color: 'var(--color-text)' }}>
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>{t('adminDashboard', 'Admin')}</span>
            </Link>
            <span>/</span>
            <span>{t('storage', 'Storage')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight pt-1 flex items-center gap-2.5">
            <HardDrive className="h-7 w-7 text-[var(--color-primary)]" />
            <span>{t('storageSettingsTitle', 'Storage & Media Configuration')}</span>
          </h1>
          <p className="text-xs sm:text-sm pt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('storageSubtitle', 'Select where all images (scraped recipes, photo uploads, AI generated dishes, and branding logos) are stored.')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition cursor-pointer self-start sm:self-auto"
          style={{ backgroundColor: 'var(--color-primary)', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? t('saving', 'Saving...') : t('saveStorageSettings', 'Save to PostgreSQL')}</span>
        </button>
      </div>

      {/* FEEDBACK ALERTS */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl border flex items-center gap-2.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-xs">
          <Check className="h-4 w-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-4 rounded-2xl border flex items-center gap-2.5 text-xs font-bold text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 2. STORAGE PROVIDER SELECTOR CARDS */}
      <div className="space-y-3">
        <label className="block text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
          {t('selectStorageProvider', 'Active Storage Location')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* LOCALHOST OPTION */}
          <div
            onClick={() => setSettings(prev => ({ ...prev, provider: 'localhost' }))}
            className={`p-6 rounded-3xl border cursor-pointer transition flex flex-col justify-between space-y-4 ${
              settings.provider === 'localhost' ? 'ring-2 ring-[var(--color-primary)] shadow-md' : 'hover:border-slate-700'
            }`}
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: settings.provider === 'localhost' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-[var(--color-inner-dark)] text-[var(--color-primary)]">
                <Server className="h-6 w-6" />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                settings.provider === 'localhost' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.provider === 'localhost' ? 'Active' : 'Offline'}
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-base">Localhost (Server Disk)</h3>
              <p className="text-xs pt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Stores images directly inside <code className="px-1.5 py-0.5 rounded bg-black/40">public/uploads/recipes</code> on your server filesystem.
              </p>
            </div>
          </div>

          {/* SUPABASE S3 OPTION */}
          <div
            onClick={() => setSettings(prev => ({ ...prev, provider: 'supabase' }))}
            className={`p-6 rounded-3xl border cursor-pointer transition flex flex-col justify-between space-y-4 ${
              settings.provider === 'supabase' ? 'ring-2 ring-[var(--color-primary)] shadow-md' : 'hover:border-slate-700'
            }`}
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: settings.provider === 'supabase' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-[var(--color-inner-dark)] text-[var(--color-primary)]">
                <Cloud className="h-6 w-6" />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                settings.provider === 'supabase' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.provider === 'supabase' ? 'Active' : 'Cloud S3'}
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-base">Supabase Storage (S3 Protocol)</h3>
              <p className="text-xs pt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Offloads images to your Supabase S3 bucket. Ideal for Hostinger and cloud deployments to keep server disk lightweight.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PROVIDER SETTINGS DETAIL VIEW */}
      {settings.provider === 'supabase' ? (
        /* SUPABASE S3 CONFIGURATION */
        <div
          className="p-6 sm:p-8 rounded-3xl border space-y-6 shadow-xs"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Cloud className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Supabase S3 Configuration</span>
              </h2>
              <p className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Connect to your bucket using Supabase Storage via the S3 protocol.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLoadRecommendedSupabase}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-slate-800/40 transition cursor-pointer self-start sm:self-auto"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
            >
              Load Recommended Values
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* S3 ENDPOINT */}
            <div>
              <label className="block font-bold mb-1">Endpoint (S3 Gateway)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.supabase.endpoint}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, endpoint: e.target.value } }))}
                  placeholder="https://<project-ref>.storage.supabase.co/storage/v1/s3"
                  className="flex-1 px-3 py-2.5 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(settings.supabase.endpoint, 'endpoint')}
                  className="p-2.5 rounded-xl border hover:bg-slate-800/40 cursor-pointer transition"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
                  title="Copy Endpoint"
                >
                  {copiedField === 'endpoint' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* REGION & BUCKET */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Region</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.supabase.region}
                    onChange={(e) => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, region: e.target.value } }))}
                    placeholder="us-west-1"
                    className="flex-1 px-3 py-2.5 rounded-xl border outline-hidden"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(settings.supabase.region, 'region')}
                    className="p-2.5 rounded-xl border hover:bg-slate-800/40 cursor-pointer transition"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
                    title="Copy Region"
                  >
                    {copiedField === 'region' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Bucket Name</label>
                <input
                  type="text"
                  value={settings.supabase.bucket}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, bucket: e.target.value } }))}
                  placeholder="recipes"
                  className="w-full px-3 py-2.5 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            {/* ACCESS KEY ID & SECRET KEY */}
            <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <label className="block font-bold mb-1">Access Key ID</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.supabase.accessKeyId}
                    onChange={(e) => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, accessKeyId: e.target.value } }))}
                    placeholder="f3e0affef5c74972a535153349eb24cc"
                    className="flex-1 px-3 py-2.5 rounded-xl border outline-hidden font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(settings.supabase.accessKeyId, 'accessKey')}
                    className="p-2.5 rounded-xl border hover:bg-slate-800/40 cursor-pointer transition"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
                    title="Copy Key ID"
                  >
                    {copiedField === 'accessKey' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Secret Access Key</label>
                <div className="relative flex items-center">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={settings.supabase.secretAccessKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, secretAccessKey: e.target.value } }))}
                    placeholder="Enter Secret Key generated from Supabase S3 Access Keys"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border outline-hidden font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-white"
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* PUBLIC CDN URL PREFIX */}
              <div>
                <label className="block font-bold mb-1">Public CDN / URL Prefix</label>
                <input
                  type="text"
                  value={settings.supabase.publicUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, publicUrl: e.target.value } }))}
                  placeholder="https://<project-ref>.supabase.co/storage/v1/object/public/recipes"
                  className="w-full px-3 py-2.5 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <p className="text-[11px] pt-1 opacity-70">
                  Ensure the bucket is configured as <strong>Public</strong> in Supabase Dashboard $\rightarrow$ Storage to allow direct browser image loading.
                </p>
              </div>
            </div>

            {/* 4. TEST CONNECTION SECTION */}
            <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                    <Wifi className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>Connection Diagnostic</span>
                  </h3>
                  <p className="text-[11px] pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Verify that your Key ID and Secret Key can authenticate and upload to the Supabase S3 bucket.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !settings.supabase.secretAccessKey}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer self-start sm:self-auto shadow-xs"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-inner-dark)',
                    opacity: (testing || !settings.supabase.secretAccessKey) ? 0.6 : 1,
                  }}
                >
                  {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" /> : <Zap className="h-3.5 w-3.5 text-amber-400" />}
                  <span>{testing ? 'Testing Connection...' : 'Test S3 Connection'}</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                  testResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {testResult.success ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* LOCALHOST CONFIGURATION */
        <div
          className="p-6 sm:p-8 rounded-3xl border space-y-6 shadow-xs"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Server className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Localhost Server Disk Configuration</span>
              </h2>
              <p className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Store uploaded and scraped images directly inside your server public directory.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLoadRecommendedLocalhost}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-slate-800/40 transition cursor-pointer self-start sm:self-auto"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
            >
              Reset to Defaults
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1">Upload Directory Path</label>
              <input
                type="text"
                value={settings.localhost.uploadDir}
                onChange={(e) => setSettings(prev => ({ ...prev, localhost: { ...prev.localhost, uploadDir: e.target.value } }))}
                placeholder="public/uploads/recipes"
                className="w-full px-3 py-2.5 rounded-xl border outline-hidden"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <p className="text-[11px] pt-1 opacity-70">Relative path to your Next.js application workspace root.</p>
            </div>

            <div>
              <label className="block font-bold mb-1">Serving URL Route Prefix</label>
              <input
                type="text"
                value={settings.localhost.publicPrefix}
                onChange={(e) => setSettings(prev => ({ ...prev, localhost: { ...prev.localhost, publicPrefix: e.target.value } }))}
                placeholder="/uploads/recipes"
                className="w-full px-3 py-2.5 rounded-xl border outline-hidden"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Maximum File Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.localhost.maxSizeMb}
                  onChange={(e) => setSettings(prev => ({ ...prev, localhost: { ...prev.localhost, maxSizeMb: Number(e.target.value) || 10 } }))}
                  className="w-full px-3 py-2.5 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Allowed Image Formats</label>
                <input
                  type="text"
                  value={settings.localhost.allowedTypes}
                  onChange={(e) => setSettings(prev => ({ ...prev, localhost: { ...prev.localhost, allowedTypes: e.target.value } }))}
                  className="w-full px-3 py-2.5 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
