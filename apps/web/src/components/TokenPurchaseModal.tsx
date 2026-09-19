'use client';

import { useState } from 'react';
import { Coins, CheckCircle2, AlertCircle, X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
}

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  userEmail?: string | null;
  tokenSymbol?: string;
  packages: TokenPackage[];
  onPurchased?: (newBalance: number) => void;
}

export default function TokenPurchaseModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  tokenSymbol = '🪙',
  packages,
  onPurchased
}: TokenPurchaseModalProps) {
  const { t } = useTranslation();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleBuy = async (pkg: TokenPackage) => {
    setBuyingId(pkg.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          packageId: pkg.id,
          userId,
          userEmail
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to purchase tokens.');
      }

      setSuccessMsg(data.message || `Added ${pkg.tokens} tokens!`);
      if (onPurchased && typeof data.newBalance === 'number') {
        onPurchased(data.newBalance);
      }
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Purchase error');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl border p-6 space-y-5 shadow-2xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--color-text)' }}>
                {t('purchaseTokensModalTitle', 'Top Up Token Balance')}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('purchaseTokensModalSubtitle', 'Choose a package to consume recipes & chef generation seamlessly.')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:opacity-75 transition cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 border rounded-xl text-xs font-semibold flex items-center gap-2 text-red-500 bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 border rounded-xl text-xs font-semibold flex items-center gap-2 text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-3">
          {packages.map((pkg) => (
            <div 
              key={pkg.id}
              className="flex items-center justify-between p-4 rounded-2xl border transition hover:border-amber-500/50"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black" style={{ color: 'var(--color-text)' }}>{pkg.name}</span>
                  {pkg.badge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-500">
                      {pkg.badge}
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1">
                  <span>+{pkg.tokens}</span>
                  <span>{tokenSymbol}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(buyingId)}
                onClick={() => handleBuy(pkg)}
                className="px-4 py-2 rounded-xl text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {buyingId === pkg.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>${pkg.price.toFixed(2)}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
