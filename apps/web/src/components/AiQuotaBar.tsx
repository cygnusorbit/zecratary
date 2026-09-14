'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, Zap, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function AiQuotaBar() {
  const [quotaInfo, setQuotaInfo] = useState<{ plan: string; isUnlimited: boolean; monthlyRecipeLimit: number } | null>(null);
  const [usedCount, setUsedCount] = useState(0);
  const [isDayMode, setIsDayMode] = useState(false);

  const syncState = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');

      // Count recipes generated this calendar month
      const rawRecipes = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      if (rawRecipes) {
        const list = JSON.parse(rawRecipes);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthAiCount = list.filter((r: any) => {
          const d = r.createdAt ? new Date(r.createdAt) : new Date();
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (r.isAiGenerated || r.generatedWithAi);
        }).length;
        setUsedCount(monthAiCount);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncState();
    fetch('/api/ai/quota')
      .then(res => res.json())
      .then(data => setQuotaInfo(data))
      .catch(() => {});

    window.addEventListener('zecratary_theme_mode_changed', syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncState);
      window.removeEventListener('storage', syncState);
    };
  }, [syncState]);

  if (!quotaInfo) return null;

  const isUnlimited = quotaInfo.isUnlimited;
  const limit = quotaInfo.monthlyRecipeLimit;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((usedCount / limit) * 100));
  const isLimitReached = !isUnlimited && usedCount >= limit;

  return (
    <div 
      className="p-3.5 rounded-2xl border mb-4 shadow-sm text-xs transition-colors duration-200"
      style={{
        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
        borderColor: isLimitReached 
          ? (isDayMode ? '#fca5a5' : '#7f1d1d') 
          : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {isUnlimited ? (
            <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : isLimitReached ? (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 text-orange-400 shrink-0" />
          )}

          <div>
            <span className="font-extrabold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {isUnlimited ? 'Unlimited AI Recipes' : `Monthly Quota: ${usedCount} / ${limit} Recipes Used`}
            </span>
            <span className="ml-2 font-mono text-[10px] uppercase font-bold text-slate-500">
              ({quotaInfo.plan})
            </span>
          </div>
        </div>

        {!isUnlimited && (
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 font-bold text-[11px] hover:underline"
            style={{ color: 'var(--color-primary, #E05638)' }}
          >
            Upgrade for Unlimited <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {!isUnlimited && (
        <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor: isLimitReached ? '#ef4444' : 'var(--color-primary, #E05638)'
            }}
          />
        </div>
      )}
    </div>
  );
}
