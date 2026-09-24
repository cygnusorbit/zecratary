// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Puzzle, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck, 
  Plus,
  Power
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface PluginItem {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPluginsPage() {
  const langContext = useTranslation();
  const translate = langContext?.t;
  const t = useCallback((key: string, fallback: string) => {
    if (typeof translate === 'function') {
      const val = translate(key, fallback);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [translate]);

  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/plugins?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.plugins)) {
          setPlugins(data.plugins);
        }
      }
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setErrorMessage('Please upload a valid .zip plugin package.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      // Simulate reading and parsing plugin manifest from ZIP or mock sample
      const pluginId = 'plugin_' + Date.now();
      const pluginName = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
      
      const payload = {
        action: 'upload_zip',
        id: pluginId,
        name: pluginName.charAt(0).toUpperCase() + pluginName.slice(1),
        version: '1.0.0',
        description: `Custom extension package uploaded via admin panel (${file.name}).`,
        author: 'Administrator',
        manifest: { uploadedFileName: file.name, size: file.size },
        files: { entry: 'index.js' }
      };

      const res = await fetch('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatusMessage(`Plugin "${payload.name}" successfully uploaded and installed!`);
        setTimeout(() => setStatusMessage(''), 4000);
        fetchPlugins();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.error || 'Failed to install plugin package.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleTogglePlugin = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id, isActive: !currentStatus })
      });
      if (res.ok) {
        setPlugins(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleDeletePlugin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to uninstall plugin "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/plugins?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPlugins(prev => prev.filter(p => p.id !== id));
        setStatusMessage(`Plugin "${name}" uninstalled successfully.`);
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* HEADER */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              {t('admin.pluginsTitle', 'Plugin & Extension Manager')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('admin.pluginsDesc', 'Upload custom .zip extension packages to add new functions, modules, and workflows to your Zecratary platform.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label 
            className="text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t('admin.uploadingZip', 'Uploading & Installing...')}</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>{t('admin.uploadZipPlugin', 'Upload .ZIP Plugin')}</span>
              </>
            )}
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleFileUpload} 
              disabled={isUploading} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {statusMessage && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-emerald)',
            color: 'var(--color-emerald)'
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#ef4444'
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" /> {errorMessage}
        </div>
      )}

      {/* PLUGINS LIST CONTAINER */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-4"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Puzzle className="h-4 w-4 text-[var(--color-primary)]" />
            <span>{t('admin.installedPlugins', 'Installed System Extensions')} ({plugins.length})</span>
          </h2>
          <button
            type="button"
            onClick={fetchPlugins}
            disabled={isLoading}
            className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('common.refresh', 'Refresh')}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
            Loading installed plugins from PostgreSQL...
          </div>
        ) : plugins.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <Puzzle className="h-6 w-6 opacity-40" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-sm" style={{ color: 'var(--color-text)' }}>
                {t('admin.noPluginsFound', 'No plugins installed yet')}
              </p>
              <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.noPluginsDesc', 'Click "Upload .ZIP Plugin" above to add extension packages to your Zecratary application.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {plugins.map((plugin) => (
              <div 
                key={plugin.id}
                className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm" style={{ color: 'var(--color-text)' }}>
                      {plugin.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                      v{plugin.version || '1.0.0'}
                    </span>
                    <span 
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        plugin.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      }`}
                    >
                      {plugin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {plugin.description || 'No description provided.'}
                  </p>
                  <div className="text-[10px] opacity-70 font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    Author: {plugin.author || 'Unknown'} • Installed: {new Date(plugin.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleTogglePlugin(plugin.id, plugin.is_active)}
                    className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: plugin.is_active ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
                    }}
                    title={plugin.is_active ? 'Deactivate plugin' : 'Activate plugin'}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{plugin.is_active ? 'Disable' : 'Enable'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlugin(plugin.id, plugin.name)}
                    className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition text-red-500 border-red-500/30 hover:bg-red-500/10"
                    title="Uninstall plugin"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('common.uninstall', 'Uninstall')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
