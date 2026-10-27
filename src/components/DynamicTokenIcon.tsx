// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';

export interface DynamicTokenIconProps {
  icon?: string;
  symbol?: string;
  size?: number;
  className?: string;
}

export function DynamicTokenIcon({ icon, symbol, size = 18, className = '' }: DynamicTokenIconProps) {
  const [activeSymbol, setActiveSymbol] = useState<string>(symbol || '🪙');

  useEffect(() => {
    if (symbol) {
      setActiveSymbol(symbol);
      return;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zecratary_token_symbol');
      if (stored) setActiveSymbol(stored);

      const handleSettingsUpdate = (e: any) => {
        const sym = e?.detail?.tokenSymbol || localStorage.getItem('zecratary_token_symbol');
        if (sym) setActiveSymbol(sym);
      };

      window.addEventListener('zecratary_token_settings_updated', handleSettingsUpdate);
      window.addEventListener('zecratary_tokens_updated', handleSettingsUpdate);

      return () => {
        window.removeEventListener('zecratary_token_settings_updated', handleSettingsUpdate);
        window.removeEventListener('zecratary_tokens_updated', handleSettingsUpdate);
      };
    }
  }, [symbol]);

  // If icon is a URL (HTTP, HTTPS, or root path)
  if (icon && (icon.startsWith('http') || icon.startsWith('/'))) {
    return (
      <img 
        src={icon} 
        alt="Token" 
        style={{ width: `${size}px`, height: `${size}px` }} 
        className={`inline-block object-contain ${className}`} 
      />
    );
  }

  // Display custom unicode emoji/glyph
  if (activeSymbol && activeSymbol !== 'Coins') {
    return (
      <span 
        style={{ fontSize: `${size}px`, lineHeight: 1 }} 
        className={`inline-flex items-center justify-center select-none ${className}`}
      >
        {activeSymbol}
      </span>
    );
  }

  // Fallback to themed Coins icon
  return <Coins style={{ width: `${size}px`, height: `${size}px` }} className={className} />;
}

export default DynamicTokenIcon;
