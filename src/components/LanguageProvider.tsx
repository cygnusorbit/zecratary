'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface SupportedLanguage {
  id?: string;
  code: string;
  name: string;
  native?: string;
  flag?: string;
  direction?: 'ltr' | 'rtl';
  status?: string;
  is_default?: boolean;
  isDefault?: boolean;
  file?: string;
}

export interface LanguageContextType {
  locale: string;
  currentLanguage?: string;
  language?: string;
  setLocale: (locale: string) => void;
  setLanguage?: (lang: string) => void;
  changeLanguage?: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  version: number;
  availableLanguages: SupportedLanguage[];
  languages: SupportedLanguage[];
  direction: 'ltr' | 'rtl';
  [key: string]: any;
}

export const DEFAULT_SYSTEM_LANGUAGES: SupportedLanguage[] = [
  { id: 'lang_en', code: 'en', name: 'English', native: 'English', flag: '🇺🇸', direction: 'ltr', status: 'active', is_default: true, file: 'en.ts' },
  { id: 'lang_es', code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', direction: 'ltr', status: 'active', is_default: false, file: 'es.ts' },
  { id: 'lang_fr', code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', direction: 'ltr', status: 'active', is_default: false, file: 'fr.ts' },
  { id: 'lang_th', code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', direction: 'ltr', status: 'active', is_default: false, file: 'th.ts' },
];

export const BUILTIN_DICTIONARIES: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    cookbooks: 'Cookbooks',
    savedRecipes: 'Saved Recipes',
    aiChef: 'AI Assistant',
    manualEntry: 'Add Recipe',
    importRecipe: 'Import Recipe',
    pantryInventory: 'Pantry Inventory',
    mealPlanner: 'Meal Planner',
    templates: 'Meal Blueprints',
    shoppingList: 'Shopping List',
    tokenPortal: 'Token Portal',
    walletPortal: 'Store Wallet',
    subscriptions: 'Subscriptions',
    billing: 'Billing History',
    adminAccess: 'Admin Access',
    adminOverview: 'Overview',
    pageBuilder: 'Page Builder',
    users: 'User Accounts',
    plans: 'Subscription Plans',
    payments: 'Payment Gateway',
    storage: 'Storage Settings',
    tokens: 'Token Pricing',
    wallet: 'Wallet Settings',
    notifications: 'Notifications',
    languages: 'Languages',
    languageSettings: 'Language Settings',
    aiModels: 'AI Engine',
    recipeTypes: 'Recipe Types',
    categories: 'Categories',
    socialLogin: 'Social Login',
    database: 'Database',
    switchToDayMode: 'Day Mode',
    switchToDarkMode: 'Dark Mode',
    profile: 'User Profile',
    logOut: 'Log Out',
    signIn: 'Sign In',
    availableLanguages: 'Languages',
    manageLanguages: 'Configure Languages',
    selectLanguage: 'Select Language',
    tokenAndWallet: 'Token & Wallet Balance',
    availableTokens: 'Available Tokens',
    walletCredits: 'Wallet Credits',
    manageWallet: 'Top Up & Wallet Portal',
    manageTokens: 'Token Bundles & Quotas',
    noNotifications: 'No unread notifications',
    settings: 'Settings',
    createSection: 'Create',
    manageSection: 'Manage',
    planSection: 'Plan',
    financeSection: 'Finance & Hub'
  },
  th: {
    dashboard: 'แดชบอร์ด',
    cookbooks: 'ตำราอาหาร',
    savedRecipes: 'สูตรอาหารที่บันทึกไว้',
    aiChef: 'ผู้ช่วยเชฟ AI',
    manualEntry: 'เพิ่มสูตรอาหาร',
    importRecipe: 'นำเข้าสูตรอาหาร',
    pantryInventory: 'คลังวัตถุดิบ',
    mealPlanner: 'วางแผนมื้ออาหาร',
    templates: 'แบบแปลนมื้ออาหาร',
    shoppingList: 'รายการซื้อของ',
    tokenPortal: 'พอร์ทัลโทเค็น',
    walletPortal: 'กระเป๋าเงินระบบ',
    subscriptions: 'แผนการสมัครสมาชิก',
    billing: 'ประวัติการชำระเงิน',
    adminAccess: 'การจัดการระบบ',
    adminOverview: 'ภาพรวมระบบ',
    pageBuilder: 'สร้างหน้าเว็บ',
    users: 'บัญชีผู้ใช้งาน',
    plans: 'แผนแพ็กเกจ',
    payments: 'ช่องทางชำระเงิน',
    storage: 'การตั้งค่าพื้นที่จัดเก็บ',
    tokens: 'กำหนดราคาโทเค็น',
    wallet: 'ตั้งค่ากระเป๋าเงิน',
    notifications: 'การแจ้งเตือน',
    languages: 'ภาษา',
    languageSettings: 'การตั้งค่าภาษา',
    aiModels: 'ระบบโมเดล AI',
    recipeTypes: 'ประเภทสูตรอาหาร',
    categories: 'หมวดหมู่วัตถุดิบ',
    socialLogin: 'เข้าสู่ระบบด้วยโซเชียล',
    database: 'ฐานข้อมูล',
    switchToDayMode: 'เปลี่ยนเป็นโหมดกลางวัน',
    switchToDarkMode: 'เปลี่ยนเป็นโหมดกลางคืน',
    profile: 'โปรไฟล์ผู้ใช้',
    logOut: 'ออกจากระบบ',
    signIn: 'เข้าสู่ระบบ',
    availableLanguages: 'ภาษาที่รองรับ',
    manageLanguages: 'จัดการภาษา',
    selectLanguage: 'เลือกภาษา',
    tokenAndWallet: 'ยอดโทเค็นและกระเป๋าเงิน',
    availableTokens: 'โทเค็นคงเหลือ',
    walletCredits: 'ยอดเงินในกระเป๋า',
    manageWallet: 'เติมเงินและจัดการกระเป๋า',
    manageTokens: 'แพ็กเกจโทเค็น',
    noNotifications: 'ไม่มีการแจ้งเตือนใหม่',
    settings: 'ตั้งค่า',
    createSection: 'สร้างสรรค์',
    manageSection: 'จัดการ',
    planSection: 'วางแผน',
    financeSection: 'การเงินและพอร์ทัล'
  },
  es: {
    dashboard: 'Panel de Control',
    cookbooks: 'Recetarios',
    savedRecipes: 'Recetas Guardadas',
    aiChef: 'Asistente IA',
    manualEntry: 'Añadir Receta',
    importRecipe: 'Importar Receta',
    pantryInventory: 'Despensa',
    mealPlanner: 'Planificador de Comidas',
    templates: 'Plantillas de Menú',
    shoppingList: 'Lista de Compras',
    tokenPortal: 'Portal de Tokens',
    walletPortal: 'Billetera',
    subscriptions: 'Suscripciones',
    billing: 'Historial de Facturación',
    adminAccess: 'Acceso de Administrador',
    adminOverview: 'Resumen',
    pageBuilder: 'Creador de Páginas',
    users: 'Cuentas de Usuario',
    plans: 'Planes de Suscripción',
    payments: 'Pasarela de Pago',
    storage: 'Configuración de Almacenamiento',
    tokens: 'Precios de Tokens',
    wallet: 'Ajustes de Billetera',
    notifications: 'Notificaciones',
    languages: 'Idiomas',
    languageSettings: 'Ajustes de Idioma',
    aiModels: 'Motor de IA',
    recipeTypes: 'Tipos de Receta',
    categories: 'Categorías',
    socialLogin: 'Inicio Social',
    database: 'Base de Datos',
    switchToDayMode: 'Modo Día',
    switchToDarkMode: 'Modo Oscuro',
    profile: 'Perfil de Usuario',
    logOut: 'Cerrar Sesión',
    signIn: 'Iniciar Sesión',
    availableLanguages: 'Idiomas Disponibles',
    manageLanguages: 'Configurar Idiomas',
    selectLanguage: 'Seleccionar Idioma',
    tokenAndWallet: 'Balance de Tokens y Billetera',
    availableTokens: 'Tokens Disponibles',
    walletCredits: 'Crédito de Billetera',
    manageWallet: 'Recargar Billetera',
    manageTokens: 'Paquetes de Tokens',
    noNotifications: 'Sin notificaciones pendientes',
    settings: 'Ajustes',
    createSection: 'Crear',
    manageSection: 'Gestionar',
    planSection: 'Planificar',
    financeSection: 'Finanzas'
  },
  fr: {
    dashboard: 'Tableau de bord',
    cookbooks: 'Livres de Cuisine',
    savedRecipes: 'Recettes Enregistrées',
    aiChef: 'Assistant IA',
    manualEntry: 'Ajouter une Recette',
    importRecipe: 'Importer une Recette',
    pantryInventory: 'Garde-manger',
    mealPlanner: 'Planificateur de repas',
    templates: 'Modèles de repas',
    shoppingList: 'Liste de courses',
    tokenPortal: 'Portail de Jetons',
    walletPortal: 'Portefeuille',
    subscriptions: 'Abonnements',
    billing: 'Facturation',
    adminAccess: 'Accès Administrateur',
    adminOverview: 'Aperçu',
    pageBuilder: 'Créateur de pages',
    users: 'Comptes utilisateurs',
    plans: 'Plans d’abonnement',
    payments: 'Passerelle de paiement',
    storage: 'Paramètres de stockage',
    tokens: 'Tarification des jetons',
    wallet: 'Paramètres du portefeuille',
    notifications: 'Notifications',
    languages: 'Langues',
    languageSettings: 'Gestion des langues',
    aiModels: 'Moteur IA',
    recipeTypes: 'Types de recettes',
    categories: 'Catégories',
    socialLogin: 'Connexion sociale',
    database: 'Base de données',
    switchToDayMode: 'Mode Jour',
    switchToDarkMode: 'Mode Sombre',
    profile: 'Profil Utilisateur',
    logOut: 'Déconnexion',
    signIn: 'Connexion',
    availableLanguages: 'Langues disponibles',
    manageLanguages: 'Configurer les langues',
    selectLanguage: 'Choisir la langue',
    tokenAndWallet: 'Solde Jetons & Portefeuille',
    availableTokens: 'Jetons disponibles',
    walletCredits: 'Crédits portefeuille',
    manageWallet: 'Recharger le portefeuille',
    manageTokens: 'Forfaits de jetons',
    noNotifications: 'Aucune notification',
    settings: 'Paramètres',
    createSection: 'Créer',
    manageSection: 'Gérer',
    planSection: 'Planifier',
    financeSection: 'Finance'
  }
};

export const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  currentLanguage: 'en',
  language: 'en',
  setLocale: () => {},
  setLanguage: () => {},
  changeLanguage: () => {},
  t: (key, fallback) => fallback || key,
  version: 1,
  availableLanguages: DEFAULT_SYSTEM_LANGUAGES,
  languages: DEFAULT_SYSTEM_LANGUAGES,
  direction: 'ltr',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [languagesList, setLanguagesList] = useState<SupportedLanguage[]>(DEFAULT_SYSTEM_LANGUAGES);
  const [customTranslations, setCustomTranslations] = useState<Record<string, Record<string, string>>>({});
  const [version, setVersion] = useState<number>(1);

  const fetchLanguagesAndPhrases = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/languages?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.languages) && data.languages.length > 0) {
          setLanguagesList(data.languages);
        }
        if (data.translations && typeof data.translations === 'object') {
          setCustomTranslations(data.translations);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    let saved = 'en';
    if (typeof window !== 'undefined') {
      try {
        saved = localStorage.getItem('zecratary_locale') || 'en';
      } catch (_) {}
    }
    const cleanLocale = saved.toLowerCase().trim();
    setCurrentLocale(cleanLocale);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = cleanLocale;
    }

    fetchLanguagesAndPhrases();

    const handleSync = () => fetchLanguagesAndPhrases();
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [fetchLanguagesAndPhrases]);

  const handleSetLocale = useCallback((newLocale: string) => {
    if (!newLocale) return;
    const clean = newLocale.toLowerCase().trim();
    setCurrentLocale(clean);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_locale', clean);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = clean;
          const matched = languagesList.find(l => (l.code || '').toLowerCase() === clean);
          const dir = matched?.direction || (clean === 'ar' || clean === 'he' ? 'rtl' : 'ltr');
          document.documentElement.dir = dir;
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('zecratary_locale_changed', { detail: { locale: clean } }));
      window.dispatchEvent(new Event('zecratary_languages_updated'));
    }
    setVersion(v => v + 1);
  }, [languagesList]);

  const t = useCallback((key: string, fallback?: string): string => {
    if (!key) return fallback || '';
    const lang = currentLocale.toLowerCase().trim();

    if (customTranslations[lang] && customTranslations[lang][key]) {
      return customTranslations[lang][key];
    }
    if (BUILTIN_DICTIONARIES[lang] && BUILTIN_DICTIONARIES[lang][key]) {
      return BUILTIN_DICTIONARIES[lang][key];
    }
    if (BUILTIN_DICTIONARIES['en'] && BUILTIN_DICTIONARIES['en'][key]) {
      return BUILTIN_DICTIONARIES['en'][key];
    }
    return fallback !== undefined ? fallback : key;
  }, [currentLocale, customTranslations]);

  const activeDirection: 'ltr' | 'rtl' = useMemo(() => {
    const matched = languagesList.find(l => (l.code || '').toLowerCase() === currentLocale);
    return (matched?.direction === 'rtl' || currentLocale === 'ar' || currentLocale === 'he') ? 'rtl' : 'ltr';
  }, [languagesList, currentLocale]);

  return (
    <LanguageContext.Provider value={{
      locale: currentLocale,
      currentLanguage: currentLocale,
      language: currentLocale,
      setLocale: handleSetLocale,
      setLanguage: handleSetLocale,
      changeLanguage: handleSetLocale,
      t,
      version,
      availableLanguages: languagesList,
      languages: languagesList,
      direction: activeDirection,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export default LanguageProvider;
