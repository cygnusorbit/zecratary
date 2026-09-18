'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
}

const defaultTranslations: Record<string, Record<string, string>> = {
  en: {
    billing: 'Billing',
    billingAndSubscriptionTitle: 'Billing & Subscriptions',
    billingPageSubtitle: 'Manage your payment history, payment methods, and subscription tiers.',
    refreshBtn: 'Refresh',
    tabBillingHistory: 'Billing History',
    tabPaymentMethod: 'Payment Method',
    tabSubscriptions: 'Subscriptions',
    searchBillingPlaceholder: 'Search by plan, gateway, or transaction ID...',
    filterAllStatus: 'All Statuses',
    filterSucceeded: 'Succeeded',
    filterCanceled: 'Canceled',
    filterRefunded: 'Refunded',
    filterFailed: 'Failed',
    colDate: 'Date',
    colPlan: 'Plan',
    colAmount: 'Amount',
    colGateway: 'Gateway',
    colStatus: 'Status',
    colExpiry: 'Billing Expiry',
    selectPaymentMethodTitle: 'Choose Preferred Payment Method',
    paymentMethodAdminNotice: 'Available options are dynamically provisioned according to system administrative settings.',
    savePaymentMethodBtn: 'Save Payment Method',
    activePlanBadge: 'Current Active Plan',
    autoRenewEnabledBadge: 'Auto-Renew ON',
    renewalCancelledBadge: 'Renewal Canceled (Active Until Expiry)',
    cancelPlanRenewalBtn: 'Cancel Renewal',
    upgradeOrDowngradeBtn: 'Change Plan Tier',
    availablePlansTableTitle: 'Subscription Packages Catalog',
    availablePlansTableSubtitle: 'Compare tiers and smoothly upgrade or downgrade your active subscription.',
    searchPlansPlaceholder: 'Search packages...',
    colPackage: 'Package',
    colDescription: 'Features / Overview',
    colMonthlyPricing: 'Monthly',
    colAnnualPricing: 'Annual',
    colActions: 'Actions',
    monthlyActive: 'Monthly Active',
    annualActive: 'Annual Active',
    chooseMonthlyBtn: 'Monthly',
    chooseAnnualBtn: 'Annual',
    activeLabel: 'Active',
    freePrice: 'Free'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('zecratary_lang') : null;
      if (stored) setLanguage(stored);
    } catch (_) {}
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_lang', lang);
      }
    } catch (_) {}
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = defaultTranslations[language] || defaultTranslations['en'] || {};
    return langDict[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: string, fallback?: string) => fallback || key,
    };
  }
  return ctx;
}

export default LanguageContext;
