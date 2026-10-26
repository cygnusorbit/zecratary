'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, X, Sun, Moon, Check, ArrowRight, Sparkles, ChefHat, 
  Clock, Users, Heart, Layers, ShieldCheck, ChevronRight, Globe
} from 'lucide-react';
import { getCurrentUser, User } from '@/lib/auth';
import { getSiteName, getSiteIcon, DEFAULT_SITE_NAME, DEFAULT_SITE_ICON } from '@/lib/siteConfig';
import { useTranslation } from '@/components/LanguageProvider';

const LANGUAGE_FLAG_MAP: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  th: '🇹🇭',
  de: '🇩🇪',
  it: '🇮🇹',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
  pt: '🇵🇹',
  ru: '🇷🇺',
  ar: '🇸🇦',
  nl: '🇳🇱',
  hi: '🇮🇳',
  vi: '🇻🇳',
  id: '🇮🇩',
  tr: '🇹🇷'
};

const getLanguageFlag = (code: string): string => {
  if (!code) return '🌐';
  return LANGUAGE_FLAG_MAP[code.toLowerCase().trim()] || '🌐';
};

const isImageIcon = (icon?: unknown): icon is string =>
  typeof icon === 'string' && (
    icon.startsWith('/') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('data:image')
  );

export default function DynamicHomePage() {
  const pathname = usePathname();
  const langContext = useTranslation();
  const t = langContext?.t || ((k: string, fb?: string) => fb || k);
  const currentLanguage = (langContext as any)?.currentLanguage || (langContext as any)?.locale || (langContext as any)?.language || 'en';
  const changeLanguage = (langContext as any)?.changeLanguage || (langContext as any)?.setLocale || (langContext as any)?.setLanguage || (() => {});

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [siteIcon, setSiteIcon] = useState<string>(DEFAULT_SITE_ICON);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [navPages, setNavPages] = useState<any[]>([]);
  const [activePage, setActivePage] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize body class for zero-offset full width
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('is-homepage-view');
      return () => {
        document.body.classList.remove('is-homepage-view');
      };
    }
  }, []);

  const syncSettings = useCallback(() => {
    try {
      setCurrentUser(getCurrentUser());
      if (typeof getSiteName === 'function') setSiteName(getSiteName());
      if (typeof getSiteIcon === 'function') setSiteIcon(getSiteIcon());

      if (typeof window !== 'undefined') {
        const theme = localStorage.getItem('zecratary_theme_mode') || 'dark';
        setIsDarkMode(theme === 'dark');
      }
    } catch (_) {}
  }, []);

  const fetchFrontendSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/frontend?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pages)) {
          // Filter published pages for top navigation
          const published = data.pages.filter((p: any) => p.status === 'published' && p.show_in_nav !== false);
          setNavPages(published);

          // Find default homepage
          const home = data.pages.find((p: any) => p.is_default || p.slug === 'home') || data.pages[0];
          setActivePage(home);
        }
      }

      // Fetch featured community recipes
      const rRes = await fetch(`/api/admin/frontend?all_recipes=true&t=${Date.now()}`, { cache: 'no-store' });
      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData.success && Array.isArray(rData.recipes)) {
          setRecipes(rData.recipes.slice(0, 6));
        }
      }
    } catch (err) {
      console.warn('Failed loading homepage frontend settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncSettings();
    fetchFrontendSettings();

    const handleSync = () => syncSettings();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('zecratary_site_settings_changed', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('zecratary_site_settings_changed', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
    };
  }, [syncSettings, fetchFrontendSettings]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (typeof window !== 'undefined') {
      const modeStr = nextMode ? 'dark' : 'light';
      localStorage.setItem('zecratary_theme_mode', modeStr);
      if (nextMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      window.dispatchEvent(new CustomEvent('zecratary_theme_mode_changed', { detail: { mode: modeStr } }));
    }
  };

  const elements = activePage?.elements || [];
  const footer = activePage?.footer || {};

  return (
    <div
      id="zecratary-homepage-root"
      className="min-h-screen w-full transition-colors duration-200 flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--color-bg, #0b0f19)',
        color: 'var(--color-text, #ffffff)'
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* GLOBAL CSS RESET: Neutralize Application Sidebar Clearance   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        body.is-homepage-view,
        body:has(#zecratary-homepage-root) {
          margin: 0 !important;
          padding: 0 !important;
        }
        body.is-homepage-view main,
        body.is-homepage-view [role="main"],
        body.is-homepage-view #zecratary-main-content,
        body.is-homepage-view .main-content,
        body:has(#zecratary-homepage-root) main,
        body:has(#zecratary-homepage-root) [role="main"],
        body:has(#zecratary-homepage-root) #zecratary-main-content,
        body:has(#zecratary-homepage-root) .main-content {
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        body.is-homepage-view aside,
        body.is-homepage-view #zecratary-desktop-topbar,
        body.is-homepage-view .zecratary-mobile-topbar,
        body:has(#zecratary-homepage-root) aside,
        body:has(#zecratary-homepage-root) #zecratary-desktop-topbar,
        body:has(#zecratary-homepage-root) .zecratary-mobile-topbar {
          display: none !important;
        }
      ` }} />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DYNAMIC TOP NAVIGATION MENU (Driven by /admin/frontend)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card, rgba(15, 23, 42, 0.85))',
          borderColor: 'var(--color-border, rgba(255, 255, 255, 0.1))',
          color: 'var(--color-text, #ffffff)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* BRAND IDENTITY */}
          <Link href="/" className="flex items-center gap-2.5 font-black text-lg tracking-tight">
            {isImageIcon(siteIcon) ? (
              <img src={siteIcon} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <span className="text-2xl">{siteIcon || '🍳'}</span>
            )}
            <span style={{ color: 'var(--color-primary, #10b981)' }}>{siteName || 'Zecratary'}</span>
          </Link>

          {/* DYNAMIC NAVIGATION LINKS FROM /admin/frontend */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
            {navPages.map((page: any) => {
              const pageSlug = page.is_default || page.slug === 'home' ? '/' : `/${page.slug}`;
              const active = pathname === pageSlug;
              return (
                <Link
                  key={page.id || page.slug}
                  href={pageSlug}
                  className="transition hover:opacity-100"
                  style={{
                    color: active ? 'var(--color-primary, #10b981)' : 'var(--color-text-secondary, #94a3b8)'
                  }}
                >
                  {page.title}
                </Link>
              );
            })}
          </nav>

          {/* TOP CONTROLS & AUTH CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* LANGUAGE SELECTOR */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #111726)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
              >
                <span>{getLanguageFlag(currentLanguage || 'en')}</span>
                <span className="uppercase">{currentLanguage || 'EN'}</span>
              </button>

              {langMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 border rounded-2xl p-1.5 shadow-xl z-50 space-y-1 text-xs"
                  style={{
                    backgroundColor: 'var(--color-card, #0f172a)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                >
                  {Object.keys(LANGUAGE_FLAG_MAP).slice(0, 6).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        if (typeof changeLanguage === 'function') changeLanguage(code);
                        setLangMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-800/40 font-semibold cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span>{LANGUAGE_FLAG_MAP[code]}</span>
                        <span className="uppercase">{code}</span>
                      </span>
                      {currentLanguage === code && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* THEME TOGGLE */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark, #111726)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
              title={isDarkMode ? 'Day Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
            </button>

            {/* DYNAMIC AUTHENTICATION CTA */}
            {currentUser ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90 flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--color-primary, #10b981)' }}
              >
                <span>{t('dashboard', 'Dashboard')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-slate-800/20"
                  style={{
                    borderColor: 'var(--color-border, #1e293b)',
                    backgroundColor: 'var(--color-inner-dark, #111726)'
                  }}
                >
                  {t('signIn', 'Sign In')}
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary, #10b981)' }}
                >
                  {t('getStarted', 'Get Started')}
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE HAMBURGER BUTTON */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-b px-4 py-4 space-y-3"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="space-y-1">
              {navPages.map((page: any) => {
                const pageSlug = page.is_default || page.slug === 'home' ? '/' : `/${page.slug}`;
                return (
                  <Link
                    key={page.id || page.slug}
                    href={pageSlug}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-bold"
                  >
                    {page.title}
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
              {currentUser ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-xl text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('dashboard', 'Go to Dashboard')}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 text-center rounded-xl border text-xs font-bold"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {t('signIn', 'Sign In')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 text-center rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {t('getStarted', 'Get Started')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN HOMEPAGE CONTENT (Dynamic Elements from /admin/frontend) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {elements.length === 0 ? (
          /* DEFAULT HERO BLOCK */
          <section className="text-center py-16 md:py-24 space-y-6 max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('autonomousTelemetry', 'Autonomous Culinary Intelligence')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              {activePage?.title || 'Autonomous Culinary Planning & Intelligence'}
            </h1>
            <p className="text-base md:text-lg leading-relaxed opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
              {activePage?.description || 'Plan gourmet meals, track pantry macros, scale recipes, and command Chef AI with production-grade telemetry.'}
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                href={currentUser ? '/dashboard' : '/register'}
                className="px-6 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition hover:opacity-90 flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span>{currentUser ? t('goToDashboard', 'Open Dashboard') : t('startCookingFree', 'Start Cooking Free')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chef"
                className="px-6 py-3 rounded-2xl border text-sm font-bold transition hover:bg-slate-800/20"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {t('exploreAiChef', 'Explore Chef AI')}
              </Link>
            </div>
          </section>
        ) : (
          elements.map((elem: any) => {
            if (elem.type === 'title') {
              return (
                <section key={elem.id} className="text-center py-12 md:py-16 space-y-4 max-w-3xl mx-auto">
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight">
                    {elem.title || 'Welcome to Zecratary'}
                  </h1>
                  {elem.subtitle && (
                    <p className="text-base md:text-lg opacity-80 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {elem.subtitle}
                    </p>
                  )}
                  <div className="pt-4 flex justify-center">
                    <Link
                      href={currentUser ? '/dashboard' : '/register'}
                      className="px-6 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {currentUser ? t('openWorkspace', 'Open Workspace') : t('getStartedNow', 'Get Started Now')}
                    </Link>
                  </div>
                </section>
              );
            }

            if (elem.type === 'recipe') {
              return (
                <section key={elem.id} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black">{elem.title || 'Featured Culinary Dishes'}</h2>
                      {elem.subtitle && (
                        <p className="text-xs opacity-70" style={{ color: 'var(--color-text-secondary)' }}>{elem.subtitle}</p>
                      )}
                    </div>
                    <Link href="/saved" className="text-xs font-bold flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                      <span>{t('viewAllRecipes', 'View All')}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipes.length > 0 ? (
                      recipes.map((r: any) => (
                        <div
                          key={r.id}
                          className="rounded-2xl border overflow-hidden transition hover:shadow-lg flex flex-col justify-between"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                        >
                          {r.image && (
                            <img src={r.image} alt={r.title} className="w-full h-44 object-cover" />
                          )}
                          <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-sm line-clamp-1">{r.title}</h3>
                              {r.description && (
                                <p className="text-xs opacity-70 line-clamp-2 mt-1">{r.description}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t text-[11px] opacity-70" style={{ borderColor: 'var(--color-border)' }}>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.prep_time || '20m'}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.servings || 4} serv</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center border rounded-2xl border-dashed opacity-60 text-xs">
                        {t('recipesComingSoon', 'Community recipes will be showcased here.')}
                      </div>
                    )}
                  </div>
                </section>
              );
            }

            if (elem.type === 'subscription') {
              return (
                <section key={elem.id} className="text-center space-y-8 py-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black">{elem.title || 'Subscription Tiers & AI Quotas'}</h2>
                    {elem.subtitle && (
                      <p className="text-xs opacity-75 mt-1" style={{ color: 'var(--color-text-secondary)' }}>{elem.subtitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                      { name: 'Starter Cook', price: '$0', tokens: '50 Free Tokens', features: ['AI Recipe Assistant', 'Standard Pantry', 'Manual Entry'] },
                      { name: 'Pro Chef', price: '$9.99/mo', tokens: '1,000 Tokens/mo', popular: true, features: ['Unlimited AI Generation', 'Meal Blueprints', 'Pantry Expiry Tracking', 'Recipe Web Scraping'] },
                      { name: 'Commercial Kitchen', price: '$29.99/mo', tokens: '5,000 Tokens/mo', features: ['Multi-User Access', 'Priority Gemini Models', 'Automated Nutrition Telemetry', 'VIP Support'] },
                    ].map((plan) => (
                      <div
                        key={plan.name}
                        className={`rounded-2xl border p-6 text-left space-y-4 relative flex flex-col justify-between ${plan.popular ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                      >
                        {plan.popular && (
                          <span
                            className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            Most Popular
                          </span>
                        )}
                        <div className="space-y-2">
                          <h3 className="font-extrabold text-base">{plan.name}</h3>
                          <div className="text-2xl font-black">{plan.price}</div>
                          <div className="text-xs font-bold text-amber-400">{plan.tokens}</div>
                          <ul className="space-y-1.5 pt-3 text-xs opacity-80">
                            {plan.features.map((f) => (
                              <li key={f} className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Link
                          href="/subscriptions"
                          className="w-full py-2.5 text-center rounded-xl text-xs font-bold transition block shadow-xs"
                          style={{
                            backgroundColor: plan.popular ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                            color: plan.popular ? '#ffffff' : 'var(--color-text)',
                            border: plan.popular ? 'none' : '1px solid var(--color-border)'
                          }}
                        >
                          {t('choosePlan', 'Choose Tier')}
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            return null;
          })
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DYNAMIC FOOTER (Configured in /admin/frontend)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer
        className="w-full border-t py-12 transition-colors duration-200 mt-20"
        style={{
          backgroundColor: 'var(--color-card, #0f172a)',
          borderColor: 'var(--color-border, #1e293b)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 font-black text-base text-[var(--color-primary)]">
                {isImageIcon(siteIcon) ? (
                  <img src={siteIcon} alt="Logo" className="w-6 h-6 rounded-md object-contain" />
                ) : (
                  <span className="text-xl">{siteIcon || '🍳'}</span>
                )}
                <span>{siteName || 'Zecratary'}</span>
              </div>
              <p className="text-xs leading-relaxed opacity-70 max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {footer.aboutText || 'Autonomous culinary intelligence platform designed for intelligent recipe management, meal planning, and nutrition telemetry.'}
              </p>
            </div>

            {(footer.columns || [
              {
                title: 'Platform',
                links: [
                  { label: 'AI Assistant', url: '/chef' },
                  { label: 'Saved Recipes', url: '/saved' },
                  { label: 'Meal Planner', url: '/planner' },
                ]
              },
              {
                title: 'Finance & Hub',
                links: [
                  { label: 'Token Portal', url: '/token' },
                  { label: 'Store Wallet', url: '/wallet' },
                  { label: 'Subscriptions', url: '/subscriptions' },
                ]
              }
            ]).map((col: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{col.title}</h4>
                <ul className="space-y-1.5 text-xs opacity-80">
                  {col.links?.map((lnk: any, lIdx: number) => (
                    <li key={lIdx}>
                      <Link href={lnk.url || '#'} className="hover:underline transition">
                        {lnk.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs opacity-60 gap-4" style={{ borderColor: 'var(--color-border)' }}>
            <div>{footer.copyrightText || '© 2026 Zecratary Inc. All rights reserved.'}</div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              <Link href="/terms" className="hover:underline">Terms of Service</Link>
              <Link href="/contacts" className="hover:underline">Contact Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
