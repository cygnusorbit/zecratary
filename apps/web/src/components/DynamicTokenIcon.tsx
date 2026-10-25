// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coins, Sparkles, Zap } from 'lucide-react';

export interface DynamicTokenIconProps {
  symbol?: string;
  icon?: string;
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
  fallbackClassName?: string;
}

export default function DynamicTokenIcon({
  symbol: propSymbol,
  icon: propIcon,
  className = 'w-4 h-4',
  size,
  style = {},
  fallbackClassName = 'text-amber-500'
}: DynamicTokenIconProps) {
  const [activeSymbol, setActiveSymbol] = useState<string>(() => {
    if (propSymbol && propSymbol !== '🪙') return propSymbol;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('zecratary_token_symbol');
        if (stored) return stored;
      } catch (_) {}
    }
    return propSymbol || '🪙';
  });

  const [activeIcon, setActiveIcon] = useState<string | undefined>(() => {
    if (propIcon && propIcon.trim() !== '') return propIcon;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('zecratary_token_icon');
        if (stored && stored.trim() !== '') return stored;
      } catch (_) {}
    }
    return propIcon || undefined;
  });

  const fetchAuthoritativeSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/token-setting?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const settings = data?.settings || data?.config || data;
        const sym = settings?.tokenSymbol || settings?.token_symbol;
        const ic = settings?.tokenIcon || settings?.token_icon;

        if (sym && sym !== '🪙') {
          setActiveSymbol(sym);
          try { localStorage.setItem('zecratary_token_symbol', sym); } catch (_) {}
        } else if (sym && !activeSymbol) {
          setActiveSymbol(sym);
        }

        if (ic && ic.trim() !== '') {
          setActiveIcon(ic);
          try { localStorage.setItem('zecratary_token_icon', ic); } catch (_) {}
        }
      }
    } catch (_) {}
  }, [activeSymbol]);

  useEffect(() => {
    if (propSymbol && propSymbol !== '🪙') {
      setActiveSymbol(propSymbol);
      try { localStorage.setItem('zecratary_token_symbol', propSymbol); } catch (_) {}
    } else if (typeof window !== 'undefined') {
      try {
        const storedSym = localStorage.getItem('zecratary_token_symbol');
        if (storedSym) setActiveSymbol(storedSym);
        else fetchAuthoritativeSettings();

        const storedIc = localStorage.getItem('zecratary_token_icon');
        if (storedIc) setActiveIcon(storedIc);
      } catch (_) {
        fetchAuthoritativeSettings();
      }
    }

    if (propIcon && propIcon.trim() !== '') {
      setActiveIcon(propIcon);
      try { localStorage.setItem('zecratary_token_icon', propIcon); } catch (_) {}
    }

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.tokenSymbol && detail.tokenSymbol !== '🪙') {
        setActiveSymbol(detail.tokenSymbol);
        try { localStorage.setItem('zecratary_token_symbol', detail.tokenSymbol); } catch (_) {}
      }
      if (detail?.tokenIcon !== undefined && detail.tokenIcon !== '') {
        setActiveIcon(detail.tokenIcon);
        try { localStorage.setItem('zecratary_token_icon', detail.tokenIcon); } catch (_) {}
      }
      if (!detail) fetchAuthoritativeSettings();
    };

    window.addEventListener('zecratary_token_settings_updated', handleUpdate);
    window.addEventListener('zecratary_tokens_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('zecratary_balance_channel');
        bc.onmessage = (event) => {
          if (event.data?.tokenSymbol && event.data.tokenSymbol !== '🪙') {
            setActiveSymbol(event.data.tokenSymbol);
          }
          if (event.data?.tokenIcon !== undefined && event.data.tokenIcon !== '') {
            setActiveIcon(event.data.tokenIcon);
          }
        };
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('zecratary_token_settings_updated', handleUpdate);
      window.removeEventListener('zecratary_tokens_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (bc) bc.close();
    };
  }, [propSymbol, propIcon, fetchAuthoritativeSettings]);

  useEffect(() => {
    if (propSymbol !== undefined && propSymbol !== '🪙') {
      setActiveSymbol(propSymbol);
    }
  }, [propSymbol]);

  useEffect(() => {
    if (propIcon !== undefined && propIcon.trim() !== '') {
      setActiveIcon(propIcon);
    }
  }, [propIcon]);

  const rawCandidate = (activeIcon && activeIcon.trim() !== '') 
    ? activeIcon 
    : (activeSymbol || '🪙');

  const isImage = typeof rawCandidate === 'string' && (
    rawCandidate.startsWith('http://') ||
    rawCandidate.startsWith('https://') ||
    rawCandidate.startsWith('/') ||
    rawCandidate.startsWith('data:image/')
  );

  const styleOverride: React.CSSProperties = {
    ...style,
    ...(size ? { width: size, height: size, minWidth: size, minHeight: size } : {})
  };

  if (isImage) {
    return (
      <img
        src={rawCandidate}
        alt="Token"
        className={`inline-block object-contain align-middle select-none shrink-0 ${className}`}
        style={styleOverride}
        loading="lazy"
      />
    );
  }

  const trimmed = typeof rawCandidate === 'string' ? rawCandidate.trim() : '';
  const lower = trimmed.toLowerCase();

  if (lower === 'sparkles' || lower === 'sparkle') {
    return <Sparkles className={`inline-block shrink-0 ${className} ${fallbackClassName}`} style={styleOverride} />;
  }
  if (lower === 'zap' || lower === 'lightning' || lower === 'flash') {
    return <Zap className={`inline-block shrink-0 ${className} ${fallbackClassName}`} style={styleOverride} />;
  }
  if (lower === 'coins' || lower === 'coin') {
    return <Coins className={`inline-block shrink-0 ${className} ${fallbackClassName}`} style={styleOverride} />;
  }

  if (trimmed.length > 0 && trimmed !== '🪙') {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center font-normal leading-none select-none shrink-0 ${className}`}
        style={{
          fontSize: typeof size === 'number' ? `${size}px` : (size || '1.05em'),
          display: 'inline-flex',
          ...styleOverride
        }}
      >
        {trimmed}
      </span>
    );
  }

  return (
    <Coins
      className={`inline-block shrink-0 ${className} ${fallbackClassName}`}
      style={styleOverride}
    />
  );
}
