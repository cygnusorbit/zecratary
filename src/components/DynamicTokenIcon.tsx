// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Coins, Sparkles, Zap } from 'lucide-react';

export function TokenEmojiLoader({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <span 
      suppressHydrationWarning
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title="Loading token emoji..."
    >
      <span 
        className="rounded-full border-2 border-amber-400 border-t-transparent animate-spin inline-block"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </span>
  );
}

export interface DynamicTokenIconProps {
  icon?: string;
  symbol?: string;
  size?: number;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function DynamicTokenIcon({ 
  icon, 
  symbol, 
  size = 16, 
  loading = false,
  className = '', 
  style = {} 
}: DynamicTokenIconProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [activeSymbol, setActiveSymbol] = useState<string>(() => symbol || '');

  useEffect(() => {
    setMounted(true);

    if (symbol) {
      setActiveSymbol(symbol);
      return;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zecratary_token_symbol');
      if (stored) setActiveSymbol(stored);

      const handleSettingsUpdate = (e: any) => {
        const sym = e?.detail?.tokenSymbol || e?.detail?.settings?.tokenSymbol || localStorage.getItem('zecratary_token_symbol');
        if (sym) setActiveSymbol(sym);
      };

      let balanceBc: BroadcastChannel | null = null;
      try {
        balanceBc = new BroadcastChannel('zecratary_balance_channel');
        balanceBc.onmessage = (event) => {
          if (event?.data?.tokenSymbol || event?.data?.settings?.tokenSymbol) {
            const sym = event.data.tokenSymbol || event.data.settings?.tokenSymbol;
            if (sym) setActiveSymbol(sym);
          }
        };
      } catch (_) {}

      window.addEventListener('zecratary_token_settings_updated', handleSettingsUpdate);
      window.addEventListener('zecratary_tokens_updated', handleSettingsUpdate);

      return () => {
        if (balanceBc) balanceBc.close();
        window.removeEventListener('zecratary_token_settings_updated', handleSettingsUpdate);
        window.removeEventListener('zecratary_tokens_updated', handleSettingsUpdate);
      };
    }
  }, [symbol]);

  const targetSymbol = symbol || (mounted ? activeSymbol : '');

  if (loading || (!targetSymbol && !icon)) {
    return <TokenEmojiLoader size={size} className={className} />;
  }

  const targetImage = (icon && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image'))) 
    ? icon 
    : (targetSymbol && (targetSymbol.startsWith('http') || targetSymbol.startsWith('/') || targetSymbol.startsWith('data:image')) ? targetSymbol : null);

  if (targetImage) {
    return (
      <img 
        src={targetImage} 
        alt="Token" 
        style={{ width: `${size}px`, height: `${size}px`, ...style }} 
        className={`inline-block object-contain shrink-0 ${className}`} 
      />
    );
  }

  const lower = targetSymbol.toLowerCase();
  if (lower === 'coins' || lower === 'coin') {
    return <Coins style={{ width: `${size}px`, height: `${size}px`, ...style }} className={`shrink-0 ${className}`} />;
  }
  if (lower === 'sparkles' || lower === 'sparkle') {
    return <Sparkles style={{ width: `${size}px`, height: `${size}px`, ...style }} className={`shrink-0 ${className}`} />;
  }
  if (lower === 'zap' || lower === 'lightning' || lower === 'flash') {
    return <Zap style={{ width: `${size}px`, height: `${size}px`, ...style }} className={`shrink-0 ${className}`} />;
  }

  return (
    <span 
      suppressHydrationWarning
      style={{ fontSize: `${size}px`, lineHeight: 1, ...style }} 
      className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
    >
      {targetSymbol}
    </span>
  );
}

export default DynamicTokenIcon;
