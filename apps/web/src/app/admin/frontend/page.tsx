'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Layout,
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Shield,
  Star,
  Type,
  FileText,
  Columns,
  Image as ImageIcon,
  Box,
  UtensilsCrossed,
  CreditCard,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export type ElementType = 'title' | 'content' | 'column' | 'picture' | 'box' | 'recipe' | 'subscription';

export interface PageElement {
  id: string;
  type: ElementType;
  title?: string;
  subtitle?: string;
  content?: string;
  level?: 'h1' | 'h2' | 'h3';
  alignment?: 'left' | 'center' | 'right';
  boxStyle?: 'highlight' | 'border' | 'subtle';
  badge?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  altText?: string;
  caption?: string;
  columnsCount?: number;
  columns?: Array<{ id: string; title: string; content: string }>;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  borderColor?: string;
  recipeGridDensity?: number;
  recipeLimit?: number;
  recipeCategoryFilter?: string;
  planSlug?: string;
  planBillingInterval?: 'MONTH' | 'YEAR';
  planShowTokens?: boolean;
  planShowAiModels?: boolean;
  planCtaText?: string;
  planCtaUrl?: string;
}

export interface FrontendPage {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  is_default: boolean;
  is_published: boolean;
  show_in_nav: boolean;
  show_in_footer: boolean;
  order_index: number;
  elements: PageElement[];
  padding: {
    top: string;
    bottom: string;
    left: string;
    right: string;
    maxWidth: 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  };
  footer: {
    enabled: boolean;
    aboutText: string;
    copyrightText: string;
    columns: Array<{ id: string; title: string; links: Array<{ id: string; label: string; url: string }> }>;
    socials: {
      twitter?: string;
      github?: string;
      discord?: string;
      instagram?: string;
      youtube?: string;
    };
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    accentColor?: string;
  };
}

export default function AdminFrontendBuilder() {
  const { t } = useTranslation();
  const [pages, setPages] = useState<FrontendPage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'canvas' | 'padding' | 'footer' | 'settings'>('canvas');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/frontend?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pages)) {
          setPages(data.pages);
          if (!activePageId && data.pages.length > 0) {
            const def = data.pages.find((p: any) => p.is_default) || data.pages[0];
            setActivePageId(def.id);
          }
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to load frontend pages: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [activePageId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0] || null;

  const updateActivePage = (updater: (prev: FrontendPage) => FrontendPage) => {
    if (!activePage) return;
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updater(p) : p)));
  };

  const handleSave = async () => {
    if (!activePage) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_page', page: activePage }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Page and elements saved successfully to database.' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
          localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        }
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save page' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Save failed: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (pageId: string) => {
    try {
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default', id: pageId }),
      });
      const data = await res.json();
      if (data.success) {
        setPages((prev) => prev.map((p) => ({ ...p, is_default: p.id === pageId })));
        setStatusMsg({ type: 'success', text: 'Default homepage updated.' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
          localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to set default: ' + err.message });
    }
  };

  const handleAddElement = (type: ElementType) => {
    if (!activePage) return;
    const newElem: PageElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      title: type === 'title' ? 'New Section Heading' : type === 'recipe' ? 'Community Recipes' : 'New Block Title',
      subtitle: type === 'title' ? 'Add an informative subtitle here.' : undefined,
      level: 'h2',
      alignment: 'center',
      recipeGridDensity: 3,
      recipeLimit: 6,
      recipeCategoryFilter: 'all',
      planBillingInterval: 'MONTH',
      planShowTokens: true,
      planShowAiModels: true,
      columnsCount: 3,
      columns: [
        { id: 'c1', title: 'Feature One', content: 'Detailed feature description.' },
        { id: 'c2', title: 'Feature Two', content: 'Detailed feature description.' },
        { id: 'c3', title: 'Feature Three', content: 'Detailed feature description.' },
      ],
      buttonText: 'Learn More',
      buttonUrl: '/chef',
      accentColor: 'var(--color-primary, #E05638)',
    };
    updateActivePage((prev) => ({
      ...prev,
      elements: [...(prev.elements || []), newElem],
    }));
  };

  const handleRemoveElement = (elemId: string) => {
    updateActivePage((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== elemId),
    }));
  };

  const handleMoveElement = (index: number, direction: 'up' | 'down') => {
    if (!activePage) return;
    const nextIdx = direction === 'up' ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= activePage.elements.length) return;
    const newElements = [...activePage.elements];
    const temp = newElements[index];
    newElements[index] = newElements[nextIdx];
    newElements[nextIdx] = temp;
    updateActivePage((prev) => ({ ...prev, elements: newElements }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg,#070b13)] text-[var(--color-text,#f1f5f9)] p-4 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border,#1e293b)] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary,#E05638)] flex items-center justify-center text-white shadow-md">
            <Layout className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Frontend Page Builder</h1>
            <p className="text-xs opacity-70">Design the public landing page, custom slugs, and layout blocks.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 rounded-xl border border-[var(--color-border,#1e293b)] text-xs font-bold flex items-center gap-1.5 hover:bg-white/5 transition"
          >
            <Eye className="h-4 w-4 opacity-70" />
            <span>View Live Site</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[var(--color-primary,#E05638)] text-white text-xs font-black flex items-center gap-2 shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer transition"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Pages Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--color-border,#1e293b)]">
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePageId(p.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer shrink-0 ${
              activePageId === p.id
                ? 'bg-[var(--color-inner-dark,#0e1422)] border-[var(--color-primary,#E05638)] text-[var(--color-primary,#E05638)]'
                : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white/5'
            }`}
          >
            <span>{p.title}</span>
            <span className="font-mono text-[10px] opacity-60">({p.slug})</span>
            {p.is_default && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Default Home
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Builder Workspace */}
      {activePage && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Sub-navigation & Settings */}
          <div className="space-y-4">
            <div className="p-4 rounded-3xl border border-[var(--color-border,#1e293b)] bg-[var(--color-card,#0b0f17)] space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60 px-2">Config Tabs</span>
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'canvas' ? 'bg-[var(--color-primary,#E05638)] text-white shadow-md' : 'hover:bg-white/5 opacity-80'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Canvas Elements ({activePage.elements?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('padding')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'padding' ? 'bg-[var(--color-primary,#E05638)] text-white shadow-md' : 'hover:bg-white/5 opacity-80'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Page Layout & Padding</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('footer')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'footer' ? 'bg-[var(--color-primary,#E05638)] text-white shadow-md' : 'hover:bg-white/5 opacity-80'
                }`}
              >
                <Layout className="h-4 w-4" />
                <span>Footer & Social Channels</span>
              </button>
            </div>

            <div className="p-4 rounded-3xl border border-[var(--color-border,#1e293b)] bg-[var(--color-card,#0b0f17)] space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Page Properties</span>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold opacity-75">Title</label>
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => updateActivePage((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold opacity-75">URL Slug</label>
                <input
                  type="text"
                  value={activePage.slug}
                  onChange={(e) => updateActivePage((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] text-xs font-mono font-bold"
                />
              </div>
              {!activePage.is_default && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(activePage.id)}
                  className="w-full py-2 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition cursor-pointer"
                >
                  Set as Default Homepage
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Active Tab Content */}
          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'canvas' && (
              <div className="space-y-6">
                {/* Element Type Inserters */}
                <div className="p-5 rounded-3xl border border-[var(--color-border,#1e293b)] bg-[var(--color-card,#0b0f17)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary,#E05638)]">
                      Add Canvas Block
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {[
                      { type: 'title', label: 'Title / H1', icon: Type },
                      { type: 'content', label: 'Content', icon: FileText },
                      { type: 'column', label: 'Features', icon: Columns },
                      { type: 'picture', label: 'Picture', icon: ImageIcon },
                      { type: 'box', label: 'Callout Box', icon: Box },
                      { type: 'recipe', label: 'Recipe Grid', icon: UtensilsCrossed },
                      { type: 'subscription', label: 'Plan Cards', icon: CreditCard },
                    ].map((btn) => (
                      <button
                        key={btn.type}
                        type="button"
                        onClick={() => handleAddElement(btn.type as ElementType)}
                        className="p-3 rounded-2xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] hover:border-[var(--color-primary,#E05638)] flex flex-col items-center gap-1.5 transition cursor-pointer group shadow-xs"
                      >
                        <btn.icon className="h-4 w-4 text-[var(--color-primary,#E05638)] group-hover:scale-110 transition" />
                        <span className="text-[10px] font-bold text-center leading-tight">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Elements List */}
                <div className="space-y-4">
                  {(!activePage.elements || activePage.elements.length === 0) ? (
                    <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--color-border,#1e293b)] space-y-2">
                      <p className="text-xs opacity-60">No elements configured on this page yet.</p>
                      <p className="text-[11px] font-bold text-[var(--color-primary,#E05638)]">Click any button above to insert a block.</p>
                    </div>
                  ) : (
                    activePage.elements.map((elem, idx) => (
                      <div
                        key={elem.id}
                        className="p-5 rounded-3xl border border-[var(--color-border,#1e293b)] bg-[var(--color-card,#0b0f17)] space-y-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border,#1e293b)] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[var(--color-primary,#E05638)] text-white">
                              {elem.type}
                            </span>
                            <span className="text-xs font-bold truncate max-w-xs">{elem.title || 'Untitled Element'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveElement(idx, 'up')}
                              className="p-1.5 rounded-lg border border-[var(--color-border,#1e293b)] hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activePage.elements.length - 1}
                              onClick={() => handleMoveElement(idx, 'down')}
                              className="p-1.5 rounded-lg border border-[var(--color-border,#1e293b)] hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveElement(elem.id)}
                              className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline block controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold opacity-60">Block Title</label>
                            <input
                              type="text"
                              value={elem.title || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateActivePage((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, title: val } : el)),
                                }));
                              }}
                              className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                            />
                          </div>

                          {elem.type === 'title' && (
                            <div>
                              <label className="text-[10px] font-semibold opacity-60">Heading Level</label>
                              <select
                                value={elem.level || 'h1'}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  updateActivePage((prev) => ({
                                    ...prev,
                                    elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, level: val } : el)),
                                  }));
                                }}
                                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                              >
                                <option value="h1">H1 (Hero Heading)</option>
                                <option value="h2">H2 (Standard Heading)</option>
                                <option value="h3">H3 (Sub-heading)</option>
                              </select>
                            </div>
                          )}

                          {elem.type === 'recipe' && (
                            <>
                              <div>
                                <label className="text-[10px] font-semibold opacity-60">Grid Density</label>
                                <select
                                  value={elem.recipeGridDensity || 3}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updateActivePage((prev) => ({
                                      ...prev,
                                      elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, recipeGridDensity: val } : el)),
                                    }));
                                  }}
                                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                                >
                                  <option value={2}>2 Columns</option>
                                  <option value={3}>3 Columns (Recommended)</option>
                                  <option value={4}>4 Columns</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold opacity-60">Recipes Per Page</label>
                                <input
                                  type="number"
                                  value={elem.recipeLimit || 6}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updateActivePage((prev) => ({
                                      ...prev,
                                      elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, recipeLimit: val } : el)),
                                    }));
                                  }}
                                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                                />
                              </div>
                            </>
                          )}

                          {elem.type === 'box' && (
                            <>
                              <div>
                                <label className="text-[10px] font-semibold opacity-60">Badge Text</label>
                                <input
                                  type="text"
                                  value={elem.badge || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateActivePage((prev) => ({
                                      ...prev,
                                      elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, badge: val } : el)),
                                    }));
                                  }}
                                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold opacity-60">Button Text</label>
                                <input
                                  type="text"
                                  value={elem.buttonText || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateActivePage((prev) => ({
                                      ...prev,
                                      elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, buttonText: val } : el)),
                                    }));
                                  }}
                                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'padding' && (
              <div className="p-6 rounded-3xl border border-[var(--color-border,#1e293b)] bg-[var(--color-card,#0b0f17)] space-y-4">
                <h3 className="text-base font-black">Page Padding & Layout Boundaries</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold opacity-70">Top Padding</label>
                    <input
                      type="text"
                      value={activePage.padding?.top || '2.5rem'}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((prev) => ({ ...prev, padding: { ...prev.padding, top: val } }));
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold opacity-70">Bottom Padding</label>
                    <input
                      type="text"
                      value={activePage.padding?.bottom || '4rem'}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((prev) => ({ ...prev, padding: { ...prev.padding, bottom: val } }));
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold opacity-70">Horizontal Margin (Left/Right)</label>
                    <input
                      type="text"
                      value={activePage.padding?.left || '1.5rem'}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((prev) => ({ ...prev, padding: { ...prev.padding, left: val, right: val } }));
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold opacity-70">Max Width</label>
                    <select
                      value={activePage.padding?.maxWidth || 'max-w-7xl'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        updateActivePage((prev) => ({ ...prev, padding: { ...prev.padding, maxWidth: val } }));
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                    >
                      <option value="max-w-5xl">5XL Container (1024px)</option>
                      <option value="max-w-6xl">6XL Container (1152px)</option>
                      <option value="max-w-7xl">7XL Container (1280px - Default)</option>
                      <option value="max-w-full">Full Edge-to-Edge Width</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'footer' && (
              <div className="p-6 rounded-3xl border border-[var(--color-border,#1e293b)] bg-[var(--color-card,#0b0f17)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black">Footer Configuration & Socials</h3>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={activePage.footer?.enabled !== false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        updateActivePage((prev) => ({ ...prev, footer: { ...prev.footer, enabled: val } }));
                      }}
                      className="rounded"
                    />
                    <span>Footer Enabled</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold opacity-70">About Text / Mission</label>
                    <textarea
                      rows={2}
                      value={activePage.footer?.aboutText || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((prev) => ({ ...prev, footer: { ...prev.footer, aboutText: val } }));
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold opacity-70">Copyright Line</label>
                    <input
                      type="text"
                      value={activePage.footer?.copyrightText || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((prev) => ({ ...prev, footer: { ...prev.footer, copyrightText: val } }));
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)]"
                    />
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border,#1e293b)] space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider opacity-70">Social Media Links</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] opacity-60">X / Twitter</label>
                        <input
                          type="text"
                          value={activePage.footer?.socials?.twitter || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActivePage((prev) => ({
                              ...prev,
                              footer: { ...prev.footer, socials: { ...prev.footer?.socials, twitter: val } },
                            }));
                          }}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] opacity-60">GitHub</label>
                        <input
                          type="text"
                          value={activePage.footer?.socials?.github || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActivePage((prev) => ({
                              ...prev,
                              footer: { ...prev.footer, socials: { ...prev.footer?.socials, github: val } },
                            }));
                          }}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] opacity-60">Instagram</label>
                        <input
                          type="text"
                          value={activePage.footer?.socials?.instagram || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActivePage((prev) => ({
                              ...prev,
                              footer: { ...prev.footer, socials: { ...prev.footer?.socials, instagram: val } },
                            }));
                          }}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] opacity-60">YouTube</label>
                        <input
                          type="text"
                          value={activePage.footer?.socials?.youtube || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActivePage((prev) => ({
                              ...prev,
                              footer: { ...prev.footer, socials: { ...prev.footer?.socials, youtube: val } },
                            }));
                          }}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[var(--color-border,#1e293b)] bg-[var(--color-inner-dark,#0e1422)] font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
