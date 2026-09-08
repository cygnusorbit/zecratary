import os

code = r"""// @ts-nocheck
'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, Send, SlidersHorizontal, Edit3, Clock, Flame, Users, RefreshCw, 
  Calendar, CalendarPlus, X, ArrowLeftRight, Utensils, Loader2, User as UserIcon, 
  Check, Sparkles, Bookmark, RotateCcw, Package, Plus, Trash2, ChevronDown, 
  ChevronLeft, ChevronRight, Search, Heart, Copy, ShoppingCart, Dices, 
  CheckCircle2, Layers, HelpCircle
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface MealItem {
  id: string;
  dayIndex: number;
  dayLabel: string;
  dateStr: string;
  mealType: string;
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  image?: string;
  isBatchCook?: boolean;
  isLeftover?: boolean;
  leftoverFrom?: string;
  ingredients?: string[];
}

interface MealPlanData {
  title: string;
  totalDays: number;
  theme: string;
  budgetPerServing: string;
  meals: MealItem[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  plan?: MealPlanData;
  recipe?: any;
}

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto',
  'Paleo', 'Pescatarian', 'Halal', 'Kosher'
];

const ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Fish',
  'Shellfish', 'Soy', 'Gluten', 'Other'
];

const COUNTRIES = [
  'Singapore', 'United States', 'United Kingdom', 'Australia', 
  'Canada', 'Malaysia', 'Japan', 'Germany', 'France', 'India'
];

const IDEAS_ITEMS_PER_PAGE = 3;
const SAVED_ITEMS_PER_PAGE = 5;

const DEFAULT_SECTIONS = [
  {
    id: 'sec_core',
    topicTitle: 'Core Meal Plan Logistics',
    description: 'Basic duration, meal types, and start dates for the multi-day plan.',
    enabled: true,
    questions: [
      "How many days would you like to plan for (up to 7 days)?",
      "Which meal types would you like to include each day (e.g., breakfast, lunch, dinner, snack)?",
      "When would you like the meal plan to start (today, tomorrow, or a specific date)?"
    ]
  },
  {
    id: 'sec_pref',
    topicTitle: 'Dietary Preferences & Budget',
    description: 'Themes, nutritional restrictions, and financial target per serving.',
    enabled: true,
    questions: [
      "Do you have any specific preferences or themes for these meals (e.g., high-protein, comfort food)?",
      "What is your approximate ingredient budget per serving?"
    ]
  }
];

export default function ChefChatPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserRef = useRef<User | null>(null);

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncToGrocery, setSyncToGrocery] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ideasInputRef = useRef<HTMLInputElement>(null);

  // AI Settings State synchronized with /admin/ai-settings
  const [questionnaireSections, setQuestionnaireSections] = useState<any[]>(DEFAULT_SECTIONS);
  const [activeTopicTitle, setActiveTopicTitle] = useState<string>('Standard Wizard');
  const [wizardQuestionsList, setWizardQuestionsList] = useState<string[]>([]);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'compact' | 'detailed'>('card');

  // Preferences State
  const [showPreferences, setShowPreferences] = useState(false);
  const [servings, setServings] = useState(2);
  const [country, setCountry] = useState('Singapore');
  const [selectedDiets, setSelectedDiets] = useState<string[]>(['Vegetarian']);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(['Peanuts']);
  const [ingredientsToAvoid, setIngredientsToAvoid] = useState<string[]>(['Oily']);
  const [newAvoidInput, setNewAvoidInput] = useState('');
  const [tastesList, setTastesList] = useState<string[]>(['Less Spicy']);
  const [newTasteInput, setNewTasteInput] = useState('');

  // Wizard Flow State
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [wizardAnswers, setWizardAnswers] = useState<Record<number, string>>({});
  const [wizardData, setWizardData] = useState<{
    days: number;
    mealType: string;
    theme: string;
    startDate: string;
    budget: string;
  }>({
    days: 3,
    mealType: 'dinner',
    theme: 'high-protein',
    startDate: 'tomorrow',
    budget: '4'
  });

  // Modals State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeBatchPlanMsgId, setActiveBatchPlanMsgId] = useState<string | null>(null);
  const [activeBatchMeal, setActiveBatchMeal] = useState<MealItem | null>(null);
  const [selectedBatchDays, setSelectedBatchDays] = useState<number[]>([]);

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [activeSwapPlanMsgId, setActiveSwapPlanMsgId] = useState<string | null>(null);
  const [activeSwapMeal, setActiveSwapMeal] = useState<MealItem | null>(null);
  const [activeSwapPlan, setActiveSwapPlan] = useState<MealPlanData | null>(null);
  const [swapTab, setSwapTab] = useState<'ideas' | 'saved' | 'repeat'>('ideas');
  
  const [swapSearchQuery, setSwapSearchQuery] = useState('');
  const [usePantryIngredients, setUsePantryIngredients] = useState(false);
  const [ideasCurrentPage, setIdeasCurrentPage] = useState(1);

  const [otherUsersRecipes, setOtherUsersRecipes] = useState<any[]>([]);
  const [userSavedRecipes, setUserSavedRecipes] = useState<any[]>([]);
  const [userBooks, setUserBooks] = useState<any[]>([]);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [selectedSavedBookFilter, setSelectedSavedBookFilter] = useState('All Books');
  const [selectedSavedTagFilter, setSelectedSavedTagFilter] = useState('All');
  const [showSavedFilterOptions, setShowSavedFilterOptions] = useState(false);
  const [savedCurrentPage, setSavedCurrentPage] = useState(1);
  const [pantryIngredientsList, setPantryIngredientsList] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Synchronize Multi-Topic Questionnaire from /admin/ai-settings
  const loadAdminAiSettings = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zecratary_chef_ai_settings') || localStorage.getItem('zecratary_engine_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          const active = parsed.sections.filter((s: any) => s.enabled !== false);
          const sectionsToUse = active.length > 0 ? active : parsed.sections;
          setQuestionnaireSections(sectionsToUse);
          const allQs = sectionsToUse.flatMap((s: any) => s.questions || []);
          setWizardQuestionsList(allQs.length > 0 ? allQs : DEFAULT_SECTIONS.flatMap(s => s.questions));
        } else {
          setQuestionnaireSections(DEFAULT_SECTIONS);
          setWizardQuestionsList(DEFAULT_SECTIONS.flatMap(s => s.questions));
        }
        if (parsed.resultDisplayMode) {
          setResultDisplayMode(parsed.resultDisplayMode);
        }
      } else {
        setQuestionnaireSections(DEFAULT_SECTIONS);
        setWizardQuestionsList(DEFAULT_SECTIONS.flatMap(s => s.questions));
      }
    } catch (_) {
      setQuestionnaireSections(DEFAULT_SECTIONS);
      setWizardQuestionsList(DEFAULT_SECTIONS.flatMap(s => s.questions));
    }
  }, []);

  // Day / Night Theme Application
  const applySavedTheme = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const isDay = typeof window !== 'undefined' && (
        localStorage.getItem('zecratary_theme_mode') === 'light' || 
        !document.documentElement.classList.contains('dark')
      );

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      const c = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
      } else {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-card', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', c.innerDark || c.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', c.borderColor || c.cardBorder || '#1e293b');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', c.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', c.textSecondary || '#94a3b8');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    loadAdminAiSettings();

    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('zecratary_engine_config_updated', loadAdminAiSettings);
    window.addEventListener('zecratary_chef_ai_settings_updated', loadAdminAiSettings);
    window.addEventListener('storage', applySavedTheme);
    window.addEventListener('storage', loadAdminAiSettings);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_engine_config_updated', loadAdminAiSettings);
      window.removeEventListener('zecratary_chef_ai_settings_updated', loadAdminAiSettings);
      window.removeEventListener('storage', applySavedTheme);
      window.removeEventListener('storage', loadAdminAiSettings);
    };
  }, [applySavedTheme, loadAdminAiSettings]);

  const getUserKey = useCallback((user: User | null) => {
    if (!user) return 'guest';
    return user.id || (user.email ? user.email.toLowerCase().trim() : 'guest');
  }, []);

  const loadScopedData = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;

    try {
      const allRecipesRaw = localStorage.getItem('zecratary_recipes') || '[]';
      const adminRecipesRaw = localStorage.getItem('zecratary_admin_recipes') || '[]';
      const savedRecipesRaw = localStorage.getItem('zecratary_saved_recipes') || '[]';

      const parsedAll = JSON.parse(allRecipesRaw);
      const parsedAdmin = JSON.parse(adminRecipesRaw);
      const parsedSaved = JSON.parse(savedRecipesRaw);

      const combinedCatalog = [...parsedAll, ...parsedAdmin, ...parsedSaved];

      const currentUserId = user?.id;
      const currentUserEmail = user?.email?.toLowerCase().trim();
      const currentUserName = user?.name?.toLowerCase().trim();

      const normalizeRecipe = (r: any) => ({
        id: r.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: r.title || r.name || 'Untitled Recipe',
        description: r.description || 'Nutritious chef-curated home recipe.',
        prep: Number(r.prepTimeMinutes || r.prep || 15),
        cook: Number(r.cookTimeMinutes || r.cook || 20),
        servings: Number(r.servings || 2),
        image: r.imageUrl || r.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        ingredients: Array.isArray(r.ingredients) 
          ? r.ingredients.map((ing: any) => typeof ing === 'string' ? ing : (ing.item || ing.name || ''))
          : [],
        mealType: (r.recipeType || r.mealType || r.category || 'dinner').toLowerCase(),
        userId: r.userId,
        createdBy: r.createdBy || 'Community Chef',
        isFavorite: Boolean(r.isFavorite),
        bookId: r.bookId
      });

      const belongsToCurrentUser = (item: any) => {
        if (!user) return false;
        const itemUserId = item.userId;
        const itemCreatedBy = item.createdBy ? item.createdBy.toLowerCase().trim() : '';
        const itemAuthor = item.author ? item.author.toLowerCase().trim() : '';

        return (
          (currentUserId && itemUserId === currentUserId) ||
          (currentUserEmail && (itemCreatedBy === currentUserEmail || itemAuthor === currentUserEmail)) ||
          (currentUserName && (itemCreatedBy === currentUserName || itemAuthor === currentUserName))
        );
      };

      const otherList: any[] = [];
      const otherSeen = new Set<string>();

      for (const item of combinedCatalog) {
        if (!belongsToCurrentUser(item)) {
          const key = (item.title || item.name || '').toLowerCase().trim();
          if (key && !otherSeen.has(key)) {
            otherSeen.add(key);
            otherList.push(normalizeRecipe(item));
          }
        }
      }
      setOtherUsersRecipes(otherList);

      const userSavedMap = new Map<string, any>();
      for (const item of combinedCatalog) {
        if (belongsToCurrentUser(item)) {
          const normalized = normalizeRecipe(item);
          const key = normalized.title.toLowerCase().trim();
          if (key && !userSavedMap.has(key)) {
            userSavedMap.set(key, normalized);
          }
        }
      }
      setUserSavedRecipes(Array.from(userSavedMap.values()));

      const rawBooks = localStorage.getItem('zecratary_recipe_books') || '[]';
      const parsedBooks = JSON.parse(rawBooks);
      if (Array.isArray(parsedBooks) && user) {
        const myBooks = parsedBooks.filter((b: any) => {
          const bUserId = b.userId;
          const bCreatedBy = b.createdBy ? b.createdBy.toLowerCase().trim() : '';
          return (
            (currentUserId && bUserId === currentUserId) ||
            (currentUserEmail && bCreatedBy === currentUserEmail)
          );
        });
        setUserBooks(myBooks);
      } else {
        setUserBooks([]);
      }

      const rawPantry = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry') || '[]';
      const parsedPantry = JSON.parse(rawPantry);
      if (Array.isArray(parsedPantry) && user) {
        const userPantry = parsedPantry.filter((item: any) => {
          const iUserId = item.userId;
          const iCreatedBy = item.createdBy ? item.createdBy.toLowerCase().trim() : '';
          return (
            (currentUserId && iUserId === currentUserId) ||
            (currentUserEmail && iCreatedBy === currentUserEmail)
          );
        });
        setPantryIngredientsList(userPantry.map((p: any) => (p.name || '').toLowerCase().trim()).filter(Boolean));
      } else {
        setPantryIngredientsList([]);
      }

    } catch (_) {
      setOtherUsersRecipes([]);
      setUserSavedRecipes([]);
      setUserBooks([]);
      setPantryIngredientsList([]);
    }
  }, []);

  const loadUserChatState = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;
    const userKey = getUserKey(user);
    const chatKey = `zecratary_chef_chat_messages_${userKey}`;
    const stepKey = `zecratary_chef_wizard_step_${userKey}`;
    const dataKey = `zecratary_chef_wizard_data_${userKey}`;

    try {
      const savedMessages = localStorage.getItem(chatKey);
      setMessages(savedMessages ? JSON.parse(savedMessages) : []);

      const savedStep = localStorage.getItem(stepKey);
      setWizardStep(savedStep !== null ? JSON.parse(savedStep) : null);

      const savedWizardData = localStorage.getItem(dataKey);
      if (savedWizardData) {
        setWizardData(JSON.parse(savedWizardData));
      }
    } catch (_) {
      setMessages([]);
    }
  }, [getUserKey]);

  const loadUserPreferences = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;
    try {
      const userKey = getUserKey(user);
      const userPrefKey = `zecratary_recipe_preferences_${userKey}`;
      const savedPrefs = localStorage.getItem(userPrefKey) || localStorage.getItem('zecratary_recipe_preferences');
      if (savedPrefs) {
        const p = JSON.parse(savedPrefs);
        if (typeof p.servings === 'number') setServings(p.servings);
        if (p.country) setCountry(p.country);
        if (Array.isArray(p.diets)) setSelectedDiets(p.diets);
        else if (p.diet) setSelectedDiets([p.diet]);
        if (Array.isArray(p.allergies)) setSelectedAllergies(p.allergies);
        else if (p.allergy) setSelectedAllergies([p.allergy]);
        if (Array.isArray(p.avoid)) setIngredientsToAvoid(p.avoid);
        if (Array.isArray(p.tastes)) setTastesList(p.tastes);
      }
    } catch (_) {}
  }, [getUserKey]);

  useEffect(() => {
    document.title = `${t('foodieChatHeading') || 'Foodie Chat'} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    currentUserRef.current = user;

    loadScopedData(user);
    loadUserChatState(user);
    loadUserPreferences(user);

    const handleSync = () => {
      const active = getCurrentUser();
      setCurrentUser(active);
      currentUserRef.current = active;
      loadScopedData(active);
      loadUserChatState(active);
      loadUserPreferences(active);
      loadAdminAiSettings();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_pantry_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('zecratary_login_success', handleSync);
    window.addEventListener('zecratary_engine_config_updated', loadAdminAiSettings);
    window.addEventListener('zecratary_chef_ai_settings_updated', loadAdminAiSettings);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('zecratary_login_success', handleSync);
      window.removeEventListener('zecratary_engine_config_updated', loadAdminAiSettings);
      window.removeEventListener('zecratary_chef_ai_settings_updated', loadAdminAiSettings);
    };
  }, [loadScopedData, loadUserChatState, loadUserPreferences, loadAdminAiSettings, t]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const updateMessages = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessages(prev => {
      const updated = typeof newMessages === 'function' ? newMessages(prev) : newMessages;
      try {
        if (typeof window === 'undefined') return updated;
        const active = currentUserRef.current || getCurrentUser();
        const userKey = getUserKey(active);
        const chatKey = `zecratary_chef_chat_messages_${userKey}`;
        if (updated.length > 0) {
          localStorage.setItem(chatKey, JSON.stringify(updated));
        } else {
          localStorage.removeItem(chatKey);
        }
      } catch (_) {}
      return updated;
    });
  };

  const updateWizardStep = (step: number | null) => {
    setWizardStep(step);
    try {
      if (typeof window === 'undefined') return;
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      const stepKey = `zecratary_chef_wizard_step_${userKey}`;
      if (step !== null) {
        localStorage.setItem(stepKey, JSON.stringify(step));
      } else {
        localStorage.removeItem(stepKey);
      }
    } catch (_) {}
  };

  const resetChat = () => {
    setMessages([]);
    setWizardStep(null);
    setWizardAnswers({});
    setActiveTopicTitle('Standard Wizard');
    setWizardData({
      days: 3,
      mealType: 'dinner',
      theme: 'high-protein',
      startDate: 'tomorrow',
      budget: '4'
    });
    try {
      if (typeof window === 'undefined') return;
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      localStorage.removeItem(`zecratary_chef_chat_messages_${userKey}`);
      localStorage.removeItem(`zecratary_chef_wizard_step_${userKey}`);
      localStorage.removeItem(`zecratary_chef_wizard_data_${userKey}`);
    } catch (_) {}
    showToast("Chat reset.");
  };

  // Start specific topic wizard from synced admin buttons
  const handleStartTopicWizard = (sec: any) => {
    const qList = Array.isArray(sec.questions) && sec.questions.length > 0
      ? sec.questions
      : ["How many days would you like to plan for (up to 7 days)?"];

    setActiveTopicTitle(sec.topicTitle);
    setWizardQuestionsList(qList);
    setWizardStep(0);
    setWizardAnswers({});

    updateMessages(prev => [
      ...prev,
      { id: 'usr_' + Date.now(), role: 'user', content: `Start: ${sec.topicTitle}` },
      { 
        id: 'ast_' + Date.now(), 
        role: 'assistant', 
        content: `📋 **${sec.topicTitle}**\n${sec.description || ''}\n\n**Step 1 of ${qList.length}:**\n${qList[0]}` 
      }
    ]);
  };

  const handleStartFullWizard = () => {
    const activeSections = questionnaireSections.filter((s: any) => s.enabled !== false);
    const allQuestions = activeSections.flatMap((s: any) => s.questions || []);
    const qList = allQuestions.length > 0 ? allQuestions : wizardQuestionsList;

    setActiveTopicTitle('Complete Meal Plan Wizard');
    setWizardQuestionsList(qList);
    setWizardStep(0);
    setWizardAnswers({});

    updateMessages(prev => [
      ...prev,
      { id: 'usr_' + Date.now(), role: 'user', content: 'Start Dynamic Meal Plan Wizard' },
      { 
        id: 'ast_' + Date.now(), 
        role: 'assistant', 
        content: `Starting complete meal plan intake wizard (**Step 1 of ${qList.length}**):\n\n${qList[0]}` 
      }
    ]);
  };

  const handleToggleDiet = (item: string) => {
    if (selectedDiets.includes(item)) {
      setSelectedDiets(selectedDiets.filter(d => d !== item));
    } else {
      setSelectedDiets([...selectedDiets, item]);
    }
  };

  const handleToggleAllergy = (item: string) => {
    if (selectedAllergies.includes(item)) {
      setSelectedAllergies(selectedAllergies.filter(a => a !== item));
    } else {
      setSelectedAllergies([...selectedAllergies, item]);
    }
  };

  const handleAddAvoid = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newAvoidInput.trim();
    if (!clean) return;
    if (!ingredientsToAvoid.includes(clean)) {
      setIngredientsToAvoid([...ingredientsToAvoid, clean]);
    }
    setNewAvoidInput('');
  };

  const handleRemoveAvoid = (item: string) => {
    setIngredientsToAvoid(ingredientsToAvoid.filter(a => a !== item));
  };

  const handleAddTaste = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newTasteInput.trim();
    if (!clean) return;
    if (!tastesList.includes(clean)) {
      setTastesList([...tastesList, clean]);
    }
    setNewTasteInput('');
  };

  const handleRemoveTaste = (item: string) => {
    setTastesList(tastesList.filter(t => t !== item));
  };

  const handleSavePreferences = () => {
    const prefs = {
      servings,
      country,
      diets: selectedDiets,
      allergies: selectedAllergies,
      avoid: ingredientsToAvoid,
      tastes: tastesList
    };
    if (typeof window === 'undefined') return;
    const active = currentUserRef.current || getCurrentUser();
    const userKey = getUserKey(active);
    localStorage.setItem(`zecratary_recipe_preferences_${userKey}`, JSON.stringify(prefs));
    localStorage.setItem('zecratary_recipe_preferences', JSON.stringify(prefs));
    setShowPreferences(false);
    showToast("Preferences saved!");
  };

  const handleClearAllPreferences = () => {
    setServings(2);
    setCountry('Singapore');
    setSelectedDiets([]);
    setSelectedAllergies([]);
    setIngredientsToAvoid([]);
    setTastesList([]);
    if (typeof window === 'undefined') return;
    const active = currentUserRef.current || getCurrentUser();
    const userKey = getUserKey(active);
    localStorage.removeItem(`zecratary_recipe_preferences_${userKey}`);
    localStorage.removeItem('zecratary_recipe_preferences');
    showToast("Preferences cleared!");
  };

  const getDayDetails = (offsetDays: number, startStr: string = 'tomorrow') => {
    const d = new Date();
    const lowerStart = (startStr || '').toLowerCase().trim();
    
    let baseOffset = 1;
    if (lowerStart.includes('today')) {
      baseOffset = 0;
    } else if (lowerStart.includes('tomorrow')) {
      baseOffset = 1;
    }

    d.setDate(d.getDate() + baseOffset + offsetDays);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullISO = d.toISOString().split('T')[0];
    return { dayName, dateStr, fullISO };
  };

  const buildMealPlan = (days: number, theme: string, mealType: string, budget: string, startDateAnswer: string = 'tomorrow') => {
    const normalizedType = mealType.toLowerCase().trim();
    const combinedPool = [...userSavedRecipes, ...otherUsersRecipes].filter(r => 
      !r.mealType || r.mealType.includes(normalizedType) || normalizedType.includes(r.mealType)
    );

    const pool = combinedPool.length > 0 ? combinedPool : (userSavedRecipes.length > 0 ? userSavedRecipes : otherUsersRecipes);

    const meals: MealItem[] = [];
    for (let i = 0; i < days; i++) {
      const { dayName, dateStr } = getDayDetails(i, startDateAnswer);
      const recipe = pool[i % (pool.length || 1)] || {
        title: `${theme.replace(/-/g, ' ')} ${normalizedType} Bowl`,
        description: 'Chef-curated nutritious preparation suited to your diet.',
        prep: 15,
        cook: 20,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        ingredients: ['Olive Oil', 'Seasonings', 'Fresh Vegetables']
      };

      meals.push({
        id: 'meal_' + Date.now() + '_' + i,
        dayIndex: i + 1,
        dayLabel: `Day ${i + 1} - ${dayName}`,
        dateStr: dateStr,
        mealType: normalizedType.toUpperCase(),
        title: recipe.title,
        description: recipe.description,
        prepMinutes: recipe.prep || 15,
        cookMinutes: recipe.cook || 20,
        servings: servings,
        image: recipe.image,
        ingredients: recipe.ingredients || [],
        isBatchCook: i === 0
      });
    }

    const formattedTheme = theme.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const formattedMealType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

    return {
      title: `${formattedTheme} ${formattedMealType} Plan`,
      totalDays: days,
      theme,
      budgetPerServing: budget,
      meals
    };
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : prompt).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = { id: 'usr_' + Date.now(), role: 'user', content: textToSend };
    updateMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    const lower = textToSend.toLowerCase();

    // Natural Pantry check
    if (lower === "what's in my pantry?" || lower.includes("what is in my pantry")) {
      setTimeout(() => {
        const count = pantryIngredientsList.length;
        const listDesc = count > 0 
          ? `You have ${count} ingredients in your pantry: ${pantryIngredientsList.slice(0, 7).join(', ')}${count > 7 ? ` and ${count - 7} more` : ''}. Would you like a meal plan built around them?`
          : "Your pantry is currently empty! Add items on the Pantry page or tell me what you bought today.";

        updateMessages(prev => [...prev, { id: 'ast_' + Date.now(), role: 'assistant', content: listDesc }]);
        setLoading(false);
      }, 350);
      return;
    }

    // Explicit Meal Plan initiation command
    const isExplicitMealPlanCommand = /^(?:create|start|make|build)\s+(?:a\s+)?meal\s+plan/i.test(lower) || lower === 'create a meal plan' || lower === 'meal plan';
    if (isExplicitMealPlanCommand && wizardStep === null) {
      handleStartFullWizard();
      setLoading(false);
      return;
    }

    // Active Wizard Question Sequence
    if (wizardStep !== null) {
      const currentIdx = wizardStep;
      const updatedAnswers = { ...wizardAnswers, [currentIdx]: textToSend };
      setWizardAnswers(updatedAnswers);

      const nextIdx = currentIdx + 1;
      if (nextIdx < wizardQuestionsList.length) {
        updateWizardStep(nextIdx);
        setTimeout(() => {
          updateMessages(prev => [
            ...prev,
            {
              id: 'ast_' + Date.now(),
              role: 'assistant',
              content: `**Step ${nextIdx + 1} of ${wizardQuestionsList.length}:**\n${wizardQuestionsList[nextIdx]}`
            }
          ]);
          setLoading(false);
        }, 350);
        return;
      } else {
        // Complete wizard flow and build meal plan
        updateWizardStep(null);
        setActiveTopicTitle('Standard Wizard');
        const resolvedDays = parseInt(updatedAnswers[0]) || wizardData.days || 3;
        const resolvedMealType = updatedAnswers[1] || wizardData.mealType || 'dinner';
        const resolvedTheme = updatedAnswers[2] || wizardData.theme || 'high-protein';
        const resolvedStart = updatedAnswers[3] || wizardData.startDate || 'tomorrow';
        const resolvedBudget = updatedAnswers[4] || wizardData.budget || '4';

        setTimeout(() => {
          const generatedPlan = buildMealPlan(resolvedDays, resolvedTheme, resolvedMealType, resolvedBudget, resolvedStart);
          const buildingMsg = `I have generated your ${resolvedDays}-day ${resolvedTheme} ${resolvedMealType} plan below based on your questionnaire responses. You can inspect or swap any meal before finalizing!`;

          updateMessages(prev => [
            ...prev,
            {
              id: 'ast_plan_' + Date.now(),
              role: 'assistant',
              content: buildingMsg,
              plan: generatedPlan
            }
          ]);
          setLoading(false);
        }, 450);
        return;
      }
    }

    // General Conversational Query sent to AI
    try {
      let storedAiSettings = {};
      try {
        const raw = localStorage.getItem('zecratary_chef_ai_settings') || localStorage.getItem('zecratary_engine_config');
        if (raw) storedAiSettings = JSON.parse(raw);
      } catch (_) {}

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          preferences: { servings, country, diet: selectedDiets, allergy: selectedAllergies, avoid: ingredientsToAvoid, tastes: tastesList },
          aiSettings: storedAiSettings,
          pantry: pantryIngredientsList
        })
      });

      const data = await res.json();
      if (data.recipe) {
        updateMessages(prev => [...prev, { id: 'ast_' + Date.now(), role: 'assistant', recipe: data.recipe }]);
      } else {
        updateMessages(prev => [...prev, { id: 'ast_' + Date.now(), role: 'assistant', content: data.reply || data.response || "Here are culinary suggestions tailored to your preferences." }]);
      }
    } catch (_) {
      updateMessages(prev => [
        ...prev,
        {
          id: 'ast_' + Date.now(),
          role: 'assistant',
          content: `Noted: "${textToSend}". Let me know if you would like me to build this into a multi-day plan!`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantShuffleMeal = (msgId: string, mealId: string) => {
    updateMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.plan) return m;
      const targetMeal = m.plan.meals.find(x => x.id === mealId);
      const normalizedType = targetMeal?.mealType.toLowerCase() || 'dinner';
      
      const available = otherUsersRecipes.filter(p => 
        p.title.toLowerCase() !== targetMeal?.title.toLowerCase() &&
        (p.mealType.includes(normalizedType) || normalizedType.includes(p.mealType))
      );

      const replacement = available.length > 0 
        ? available[Math.floor(Math.random() * available.length)]
        : otherUsersRecipes[0] || userSavedRecipes[0];

      if (!replacement) return m;

      const updatedMeals = m.plan.meals.map(meal => {
        if (meal.id === mealId) {
          return {
            ...meal,
            title: replacement.title,
            description: replacement.description,
            prepMinutes: replacement.prep,
            cookMinutes: replacement.cook,
            image: replacement.image,
            ingredients: replacement.ingredients || [],
            isLeftover: false
          };
        }
        return meal;
      });

      return { ...m, plan: { ...m.plan, meals: updatedMeals } };
    }));
    showToast("Meal shuffled!");
  };

  const openBatchCook = (msgId: string, meal: MealItem) => {
    setActiveBatchPlanMsgId(msgId);
    setActiveBatchMeal(meal);
    setSelectedBatchDays([]);
    setShowBatchModal(true);
  };

  const handleSaveBatchCook = () => {
    if (!activeBatchPlanMsgId || !activeBatchMeal) return;

    updateMessages(prev => prev.map(m => {
      if (m.id !== activeBatchPlanMsgId || !m.plan) return m;

      const updatedMeals = m.plan.meals.map(meal => {
        if (selectedBatchDays.includes(meal.dayIndex)) {
          return {
            ...meal,
            title: activeBatchMeal.title,
            description: `Leftover portion of ${activeBatchMeal.title}. Simply reheat and serve.`,
            prepMinutes: 0,
            cookMinutes: 5,
            image: activeBatchMeal.image,
            isLeftover: true,
            leftoverFrom: activeBatchMeal.dayLabel
          };
        }
        return meal;
      });

      return {
        ...m,
        plan: {
          ...m.plan,
          meals: updatedMeals
        }
      };
    }));

    setShowBatchModal(false);
    showToast("Batch cooking scheduled!");
  };

  const openSwapMeal = (msgId: string, meal: MealItem, plan: MealPlanData) => {
    initAuthStorage();
    const active = getCurrentUser();
    setCurrentUser(active);
    currentUserRef.current = active;
    loadScopedData(active);

    setActiveSwapPlanMsgId(msgId);
    setActiveSwapMeal(meal);
    setActiveSwapPlan(plan);
    setSwapTab('ideas');
    setIdeasCurrentPage(1);
    setSavedCurrentPage(1);
    setSavedSearchName('');
    setSelectedSavedBookFilter('All Books');
    setSelectedSavedTagFilter('All');
    setShowSavedFilterOptions(false);
    
    const defaultSearch = `${plan.theme.replace(/-/g, ' ')} ${meal.mealType.toLowerCase()}, budget about SGD ${plan.budgetPerServing || '4.00'}`;
    setSwapSearchQuery(defaultSearch);
    setShowSwapModal(true);
  };

  const handleConfirmSwap = (replacementRecipe: { title: string; description: string; prep: number; cook: number; image?: string; ingredients?: string[] }) => {
    if (!activeSwapPlanMsgId || !activeSwapMeal) return;

    updateMessages(prev => prev.map(m => {
      if (m.id !== activeSwapPlanMsgId || !m.plan) return m;

      const updatedMeals = m.plan.meals.map(meal => {
        if (meal.id === activeSwapMeal.id) {
          return {
            ...meal,
            title: replacementRecipe.title,
            description: replacementRecipe.description,
            prepMinutes: replacementRecipe.prep,
            cookMinutes: replacementRecipe.cook,
            image: replacementRecipe.image || meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
            ingredients: replacementRecipe.ingredients || meal.ingredients || [],
            isLeftover: false
          };
        }
        return meal;
      });

      return { ...m, plan: { ...m.plan, meals: updatedMeals } };
    }));

    setShowSwapModal(false);
    showToast("Meal replaced!");
  };

  const handleRemoveMeal = (msgId: string, mealId: string) => {
    updateMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.plan) return m;
      return { ...m, plan: { ...m.plan, meals: m.plan.meals.filter(meal => meal.id !== mealId) } };
    }));
    showToast("Meal removed");
  };

  const handleRefreshAll = (msgId: string) => {
    updateMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.plan) return m;
      const randomized = m.plan.meals.map((meal, i) => {
        const replacement = otherUsersRecipes[i % (otherUsersRecipes.length || 1)] || userSavedRecipes[0] || meal;
        return {
          ...meal,
          title: replacement.title,
          description: replacement.description,
          prepMinutes: replacement.prep,
          cookMinutes: replacement.cook,
          image: replacement.image,
          ingredients: replacement.ingredients || []
        };
      });
      return { ...m, plan: { ...m.plan, meals: randomized } };
    }));
    showToast("All meals refreshed!");
  };

  const handleCopyPlan = (plan: MealPlanData) => {
    const nl = String.fromCharCode(10) + String.fromCharCode(10);
    const summary = `${plan.title} (${plan.totalDays} Days)${nl}` + 
      plan.meals.map(m => `• ${m.dayLabel}: ${m.title} (${m.prepMinutes + m.cookMinutes}m) - ${m.description}`).join(nl);
    navigator.clipboard.writeText(summary);
    showToast("Plan summary copied to clipboard!");
  };

  const handleSaveRecipeToBook = (recipe: any) => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      const raw = localStorage.getItem('zecratary_saved_recipes') || '[]';
      const existing = JSON.parse(raw);
      const newRec = {
        id: 'saved_ai_' + Date.now(),
        userId: active?.id,
        createdBy: active?.email,
        title: recipe.title,
        name: recipe.title,
        description: recipe.description,
        prepTimeMinutes: recipe.prepMinutes || 15,
        cookTimeMinutes: recipe.cookMinutes || 20,
        servings: servings,
        recipeType: 'Main Dish',
        isFavorite: true,
        ingredients: recipe.ingredients || []
      };
      const updated = [newRec, ...existing];
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));
      localStorage.setItem(`zecratary_saved_recipes_${userKey}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      showToast("Saved to your recipes!");
      loadScopedData(active);
    } catch (_) {
      showToast("Could not save recipe.");
    }
  };

  const handleCreatePlan = (plan: MealPlanData) => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);

      const newPlannerItems = plan.meals.map((m, idx) => {
        const { dayName, fullISO, dateStr } = getDayDetails(idx, wizardData.startDate || 'tomorrow');
        const cleanType = m.mealType.toLowerCase().trim();

        return {
          id: 'plan_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6),
          userId: active?.id || 'guest',
          createdBy: active?.email || 'guest',
          day: dayName,
          dayName: dayName,
          dayOfWeek: dayName,
          dayShort: dayName.slice(0, 3),
          dayIndex: idx + 1,
          dayNumber: String(idx + 1),
          dayNum: String(idx + 1),
          dayLabel: m.dayLabel,
          date: fullISO,
          dateStr: dateStr,
          formattedDate: fullISO,
          type: cleanType,
          mealType: cleanType,
          slot: cleanType,
          category: cleanType,
          title: m.title,
          name: m.title,
          recipeTitle: m.title,
          recipeName: m.title,
          description: m.description,
          time: `${m.prepMinutes + m.cookMinutes} min`,
          prepMinutes: m.prepMinutes,
          cookMinutes: m.cookMinutes,
          prepTimeMinutes: m.prepMinutes,
          cookTimeMinutes: m.cookMinutes,
          servings: m.servings,
          image: m.image,
          imageUrl: m.image,
          ingredients: m.ingredients || [],
          isBatchCook: Boolean(m.isBatchCook),
          isLeftover: Boolean(m.isLeftover),
          leftoverFrom: m.leftoverFrom,
          icon: '🍲'
        };
      });

      let existingPlannerMeals: any[] = [];
      try {
        const rawExisting = localStorage.getItem('zecratary_planner_meals') || localStorage.getItem('zecratary_meal_plan') || localStorage.getItem('zecratary_planner') || '[]';
        if (rawExisting) existingPlannerMeals = JSON.parse(rawExisting);
      } catch (_) {}

      const mergedMeals = [...existingPlannerMeals, ...newPlannerItems];

      localStorage.setItem('zecratary_planner_meals', JSON.stringify(mergedMeals));
      localStorage.setItem(`zecratary_planner_meals_${userKey}`, JSON.stringify(mergedMeals));
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(mergedMeals));
      localStorage.setItem(`zecratary_meal_plan_${userKey}`, JSON.stringify(mergedMeals));
      localStorage.setItem('zecratary_planner', JSON.stringify(mergedMeals));
      localStorage.setItem(`zecratary_planner_${userKey}`, JSON.stringify(mergedMeals));
      localStorage.setItem('zecratary_meals', JSON.stringify(mergedMeals));
      localStorage.setItem('zecratary_active_plan_info', JSON.stringify({
        title: plan.title,
        createdAt: new Date().toISOString(),
        totalDays: plan.totalDays,
        theme: plan.theme
      }));

      if (syncToGrocery) {
        try {
          const rawGrocery = localStorage.getItem('zecratary_grocery_list') || localStorage.getItem('zecratary_shopping_list') || '[]';
          const groceryItems = JSON.parse(rawGrocery);
          const allPlanIngredients = plan.meals.flatMap(m => m.ingredients || []);
          const uniqueIngredients = Array.from(new Set(allPlanIngredients));

          const newGroceryEntries = uniqueIngredients.map(item => ({
            id: 'groc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            userId: active?.id,
            name: item,
            item: item,
            checked: false,
            category: 'Produce & Essentials',
            fromPlan: plan.title
          }));

          const updatedGrocery = [...groceryItems, ...newGroceryEntries];
          localStorage.setItem('zecratary_grocery_list', JSON.stringify(updatedGrocery));
          localStorage.setItem('zecratary_shopping_list', JSON.stringify(updatedGrocery));
          window.dispatchEvent(new Event('zecratary_grocery_updated'));
        } catch (_) {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_planner_updated', { detail: newPlannerItems }));
        window.dispatchEvent(new Event('zecratary_meals_updated'));
        window.dispatchEvent(new Event('zecratary_meal_plan_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      showToast("Plan created! Opening Planner...");
      setTimeout(() => {
        router.push('/planner');
      }, 250);

    } catch (err) {
      console.error("Error creating plan:", err);
      router.push('/planner');
    }
  };

  const getOtherDaysForBatch = () => {
    if (!activeBatchPlanMsgId || !activeBatchMeal) return [];
    const msg = messages.find(m => m.id === activeBatchPlanMsgId);
    if (!msg || !msg.plan) return [];
    return msg.plan.meals.filter(m => m.dayIndex > activeBatchMeal.dayIndex);
  };

  const filteredOtherUserIdeas = useMemo(() => {
    const rawQuery = swapSearchQuery.trim().toLowerCase();
    const cleanKeywords = rawQuery
      .replace(/budget about sgd [a-z0-9.]+/gi, '')
      .replace(/per serving/gi, '')
      .replace(/,/g, ' ')
      .trim();

    let list = otherUsersRecipes;

    if (cleanKeywords.length > 0) {
      const terms = cleanKeywords.split(/\s+/).filter(t => t.length > 2 && t !== 'and' && t !== 'for');
      if (terms.length > 0) {
        list = list.filter(item => {
          const targetStr = `${item.title} ${item.description} ${(item.ingredients || []).join(' ')}`.toLowerCase();
          return terms.some(term => targetStr.includes(term));
        });
      }
    }

    if (usePantryIngredients && pantryIngredientsList.length > 0) {
      const pantryMatched = list.filter(item => 
        (item.ingredients || []).some((ing: string) => 
          pantryIngredientsList.some(p => ing.toLowerCase().includes(p) || p.includes(ing.toLowerCase()))
        )
      );
      if (pantryMatched.length > 0) list = pantryMatched;
    }

    return list;
  }, [otherUsersRecipes, swapSearchQuery, usePantryIngredients, pantryIngredientsList]);

  const ideasTotalPages = Math.max(1, Math.ceil(filteredOtherUserIdeas.length / IDEAS_ITEMS_PER_PAGE));
  const ideasStartIndex = (ideasCurrentPage - 1) * IDEAS_ITEMS_PER_PAGE;
  const paginatedSwapIdeas = filteredOtherUserIdeas.slice(ideasStartIndex, ideasStartIndex + IDEAS_ITEMS_PER_PAGE);

  const filteredUserSavedRecipes = useMemo(() => {
    return userSavedRecipes.filter((r: any) => {
      const title = (r.title || r.name || '').toLowerCase();
      const matchesSearch = !savedSearchName.trim() || title.includes(savedSearchName.toLowerCase().trim());
      
      let matchesBook = true;
      if (selectedSavedBookFilter !== 'All Books') {
        matchesBook = r.bookId === selectedSavedBookFilter;
      }

      let matchesTag = true;
      if (selectedSavedTagFilter !== 'All') {
        if (selectedSavedTagFilter === 'Favorites') {
          matchesTag = Boolean(r.isFavorite);
        } else {
          const cat = r.recipeType || r.category || r.tags?.[0];
          matchesTag = cat === selectedSavedTagFilter || (Array.isArray(r.tags) && r.tags.includes(selectedSavedTagFilter));
        }
      }

      return matchesSearch && matchesBook && matchesTag;
    });
  }, [userSavedRecipes, savedSearchName, selectedSavedBookFilter, selectedSavedTagFilter]);

  const savedTotalPages = Math.max(1, Math.ceil(filteredUserSavedRecipes.length / SAVED_ITEMS_PER_PAGE));
  const savedStartIndex = (savedCurrentPage - 1) * SAVED_ITEMS_PER_PAGE;
  const paginatedSavedRecipes = filteredUserSavedRecipes.slice(savedStartIndex, savedStartIndex + SAVED_ITEMS_PER_PAGE);

  const repeatMealsInPlan = useMemo(() => {
    if (!activeSwapPlan) return [];
    return activeSwapPlan.meals.filter(m => !activeSwapMeal || m.id !== activeSwapMeal.id);
  }, [activeSwapPlan, activeSwapMeal]);

  // Active enabled questionnaire sections for topic buttons on /chef
  const activeQuestionnaireSections = useMemo(() => {
    return questionnaireSections.filter((s: any) => s.enabled !== false);
  }, [questionnaireSections]);

  return (
    <div 
      className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-5.5rem)] justify-between space-y-3 pb-2 font-sans relative transition-colors duration-200"
      style={{ color: 'var(--color-text, #0f172a)' }}
    >
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card, #ffffff)',
            borderColor: 'var(--color-primary, #E05638)',
            color: 'var(--color-text, #0f172a)'
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div 
        className="space-y-3 border-b pb-3 shrink-0 transition-colors duration-200"
        style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border"
              style={{
                backgroundColor: 'rgba(224, 86, 56, 0.15)',
                borderColor: 'var(--color-primary, #E05638)',
                color: 'var(--color-primary, #E05638)'
              }}
            >
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-text, #0f172a)' }}
              >
                {t('foodieChatHeading') || 'Foodie Chat'}
              </h1>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary, #64748b)' }}
              >
                {t('foodieChatSubtitle') || 'Ask me anything about recipes and cooking'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="p-2 rounded-xl border transition cursor-pointer shadow-sm"
              style={{
                backgroundColor: 'var(--color-card, #ffffff)',
                borderColor: 'var(--color-border, #e2e8f0)',
                color: 'var(--color-text-secondary, #64748b)'
              }}
              title={t('preferencesTooltip') || 'Preferences'}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetChat}
              className="p-2 rounded-xl border transition cursor-pointer shadow-sm"
              style={{
                backgroundColor: 'var(--color-card, #ffffff)',
                borderColor: 'var(--color-border, #e2e8f0)',
                color: 'var(--color-text-secondary, #64748b)'
              }}
              title={t('newChatTooltip') || 'New Chat'}
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dietary Pills Header */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span 
            className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'var(--color-emerald, #10b981)',
              color: 'var(--color-emerald, #10b981)'
            }}
          >
            {t('servingsLabelPref') || 'Servings:'} <strong className="font-bold" style={{ color: 'var(--color-text, #0f172a)' }}>{(t('peopleSuffix') || '{count} people').replace('{count}', String(servings))}</strong>
          </span>
          <span 
            className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'var(--color-emerald, #10b981)',
              color: 'var(--color-emerald, #10b981)'
            }}
          >
            {t('countryLabelPref') || 'Country:'} <strong className="font-bold" style={{ color: 'var(--color-text, #0f172a)' }}>{country}</strong>
          </span>
          {selectedDiets.map((d) => (
            <span 
              key={`diet-${d}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: 'var(--color-emerald, #10b981)'
              }}
            >
              {t('dietLabelPref') || 'Diet:'} <strong className="font-bold" style={{ color: 'var(--color-text, #0f172a)' }}>{d}</strong>
            </span>
          ))}
          {selectedAllergies.map((a) => (
            <span 
              key={`allergy-${a}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#dc2626'
              }}
            >
              {t('allergyLabelPref') || 'Allergy:'} <strong className="font-bold" style={{ color: 'var(--color-text, #0f172a)' }}>{a}</strong>
            </span>
          ))}
          {ingredientsToAvoid.map((av) => (
            <span 
              key={`avoid-${av}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'rgba(224, 86, 56, 0.15)',
                borderColor: 'var(--color-primary, #E05638)',
                color: 'var(--color-primary, #E05638)'
              }}
            >
              {t('avoidLabelPref') || 'Avoid:'} <strong className="font-bold" style={{ color: 'var(--color-text, #0f172a)' }}>{av}</strong>
            </span>
          ))}
          {tastesList.map((itemTaste) => (
            <span 
              key={`taste-${itemTaste}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                color: '#2563eb'
              }}
            >
              {t('tasteLabelPref') || 'Taste:'} <strong className="font-bold" style={{ color: 'var(--color-text, #0f172a)' }}>{itemTaste}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center my-auto py-12 space-y-6">
            <div 
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border shadow-lg"
              style={{
                backgroundColor: 'rgba(224, 86, 56, 0.15)',
                borderColor: 'var(--color-primary, #E05638)',
                color: 'var(--color-primary, #E05638)'
              }}
            >
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black" style={{ color: 'var(--color-text, #0f172a)' }}>
                {t('heyImChef') || "Hey, I'm Chef Foodie!"}
              </h2>
              <p 
                className="text-sm mt-1"
                style={{ color: 'var(--color-text-secondary, #64748b)' }}
              >
                Choose an intake questionnaire or ask any question to get started
              </p>
            </div>

            {/* SYNCED TOPIC BUTTONS FROM /admin/ai-settings */}
            <div className="flex flex-wrap justify-center gap-2.5 max-w-xl mx-auto">
              <button
                type="button"
                onClick={handleStartFullWizard}
                className="border text-xs font-bold px-5 py-3 rounded-2xl transition shadow-md hover:scale-[1.02] cursor-pointer flex items-center gap-2 text-white"
                style={{
                  backgroundColor: 'var(--color-primary, #E05638)',
                  borderColor: 'var(--color-primary, #E05638)'
                }}
              >
                <Sparkles className="h-4 w-4" /> Start Complete Meal Plan Intake
              </button>

              {activeQuestionnaireSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleStartTopicWizard(sec)}
                  className="border text-xs font-semibold px-4 py-2.5 rounded-full transition shadow-sm hover:scale-[1.02] cursor-pointer flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--color-card, #ffffff)',
                    borderColor: 'var(--color-border, #e2e8f0)',
                    color: 'var(--color-text, #0f172a)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #e2e8f0)')}
                >
                  <Layers className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                  <span>{sec.topicTitle}</span>
                  <span className="text-[10px] opacity-75 font-mono">({(sec.questions || []).length} steps)</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div 
                    className="w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-1 shadow-sm"
                    style={{
                      backgroundColor: 'rgba(224, 86, 56, 0.15)',
                      borderColor: 'var(--color-primary, #E05638)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                  >
                    <ChefHat className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-xl sm:max-w-2xl space-y-3.5 ${isUser ? '' : 'w-full'}`}>
                  {m.content && (
                    <div 
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${isUser ? 'ml-auto max-w-md shadow-md font-medium text-white' : 'border'}`}
                      style={isUser ? {
                        backgroundColor: 'var(--color-primary, #E05638)'
                      } : {
                        backgroundColor: 'var(--color-card, #ffffff)',
                        borderColor: 'var(--color-border, #e2e8f0)',
                        color: 'var(--color-text, #0f172a)'
                      }}
                    >
                      <p className="whitespace-pre-line">{m.content}</p>
                    </div>
                  )}

                  {/* Multi-Day Plan Compact */}
                  {m.plan && resultDisplayMode === 'compact' && (
                    <div 
                      className="space-y-3 pt-1 border rounded-2xl p-4 shadow-sm"
                      style={{
                        backgroundColor: 'var(--color-card, #ffffff)',
                        borderColor: 'var(--color-border, #e2e8f0)'
                      }}
                    >
                      <div 
                        className="flex items-center justify-between border-b pb-2"
                        style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                      >
                        <span className="font-extrabold text-sm flex items-center gap-2" style={{ color: 'var(--color-text, #0f172a)' }}>
                          <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {m.plan.title} (Compact View)
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary, #64748b)' }}>{m.plan.totalDays} Days</span>
                      </div>
                      <div className="space-y-2">
                        {m.plan.meals.map((meal) => (
                          <div 
                            key={meal.id} 
                            className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                            style={{
                              backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                              borderColor: 'var(--color-border, #e2e8f0)'
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold shrink-0" style={{ color: 'var(--color-primary, #E05638)' }}>{meal.dayLabel}:</span>
                              <span className="truncate font-medium" style={{ color: 'var(--color-text, #0f172a)' }}>{meal.title}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                              <span>{meal.prepMinutes + meal.cookMinutes}m</span>
                              <button
                                type="button"
                                onClick={() => openSwapMeal(m.id, meal, m.plan!)}
                                className="text-sky-600 hover:underline font-bold"
                              >
                                Swap
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleCreatePlan(m.plan!)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <CalendarPlus className="h-4 w-4" /> Create Plan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Multi-Day Plan Detailed */}
                  {m.plan && resultDisplayMode === 'detailed' && (
                    <div 
                      className="space-y-4 pt-1 border rounded-3xl p-5 shadow-sm"
                      style={{
                        backgroundColor: 'var(--color-card, #ffffff)',
                        borderColor: 'var(--color-border, #e2e8f0)'
                      }}
                    >
                      <div 
                        className="flex items-center justify-between border-b pb-3"
                        style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                      >
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-wider block" style={{ color: 'var(--color-primary, #E05638)' }}>Detailed Master Plan</span>
                          <h3 className="font-black text-base" style={{ color: 'var(--color-text, #0f172a)' }}>{m.plan.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPlan(m.plan!)}
                          className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy Summary
                        </button>
                      </div>
                      <div className="space-y-4">
                        {m.plan.meals.map((meal) => (
                          <div 
                            key={meal.id} 
                            className="border rounded-2xl p-4 space-y-3"
                            style={{
                              backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                              borderColor: 'var(--color-border, #e2e8f0)'
                            }}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold" style={{ color: 'var(--color-primary, #E05638)' }}>{meal.dayLabel} ({meal.dateStr})</span>
                              <span className="uppercase font-bold" style={{ color: 'var(--color-text-secondary, #64748b)' }}>{meal.mealType}</span>
                            </div>
                            <div className="flex gap-3 items-start">
                              <img src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'} alt={meal.title} className="w-14 h-14 rounded-xl object-cover border shrink-0" style={{ borderColor: 'var(--color-border, #e2e8f0)' }} />
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-bold text-sm" style={{ color: 'var(--color-text, #0f172a)' }}>{meal.title}</h4>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary, #64748b)' }}>{meal.description}</p>
                                {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                  <div className="pt-1 text-[11px]" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                                    <strong style={{ color: 'var(--color-text, #0f172a)' }}>Ingredients:</strong> {meal.ingredients.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div 
                              className="flex justify-end gap-2 pt-2 border-t"
                              style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                            >
                              <button
                                type="button"
                                onClick={() => openSwapMeal(m.id, meal, m.plan!)}
                                className="px-3 py-1.5 rounded-lg border text-sky-700 bg-sky-100 border-sky-300 font-bold text-xs shadow-sm"
                              >
                                Swap Meal
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleCreatePlan(m.plan!)}
                          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                        >
                          <CalendarPlus className="h-4 w-4" /> Create & Sync Plan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Multi-Day Plan Card */}
                  {m.plan && resultDisplayMode === 'card' && (
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                          <span className="font-extrabold text-sm tracking-wide" style={{ color: 'var(--color-text, #0f172a)' }}>{m.plan.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyPlan(m.plan!)}
                            className="p-1.5 rounded-lg border transition cursor-pointer shadow-sm"
                            style={{
                              backgroundColor: 'var(--color-card, #ffffff)',
                              borderColor: 'var(--color-border, #e2e8f0)',
                              color: 'var(--color-text-secondary, #64748b)'
                            }}
                            title="Copy Plan Summary"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <span 
                            className="text-xs font-bold"
                            style={{ color: 'var(--color-text-secondary, #64748b)' }}
                          >
                            {m.plan.meals.length}/{m.plan.totalDays}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        {m.plan.meals.map((meal) => {
                          const matchedPantryCount = (meal.ingredients || []).filter(ing => 
                            pantryIngredientsList.some(p => ing.toLowerCase().includes(p) || p.includes(ing.toLowerCase()))
                          ).length;

                          return (
                            <div 
                              key={meal.id} 
                              className="rounded-2xl overflow-hidden border shadow-sm transition"
                              style={{
                                backgroundColor: 'var(--color-card, #ffffff)',
                                borderColor: 'var(--color-border, #e2e8f0)'
                              }}
                            >
                              <div 
                                className="text-white px-4 py-2.5 flex items-center justify-between font-bold text-sm"
                                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                              >
                                <span>{meal.dayLabel}</span>
                                <span className="text-xs opacity-90">{meal.dateStr}</span>
                              </div>

                              <div className="p-4 space-y-2.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                    <img
                                      src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                                      alt={meal.title}
                                      className="w-16 h-16 rounded-xl object-cover border shrink-0"
                                      style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span 
                                          className="text-[11px] font-black tracking-wider uppercase"
                                          style={{ color: 'var(--color-primary, #E05638)' }}
                                        >
                                          {meal.mealType} {meal.isLeftover && <span style={{ color: 'var(--color-emerald, #10b981)' }} className="lowercase">(leftover)</span>}
                                        </span>
                                        {matchedPantryCount > 0 && (
                                          <span 
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                                            style={{
                                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                              borderColor: 'var(--color-emerald, #10b981)',
                                              color: 'var(--color-emerald, #10b981)'
                                            }}
                                          >
                                            <Package className="h-3 w-3" /> {matchedPantryCount} in pantry
                                          </span>
                                        )}
                                      </div>

                                      <h3 className="font-black text-base mt-0.5 leading-snug truncate" style={{ color: 'var(--color-text, #0f172a)' }}>{meal.title}</h3>
                                      <p 
                                        className="text-xs leading-relaxed font-normal mt-1 line-clamp-2"
                                        style={{ color: 'var(--color-text-secondary, #64748b)' }}
                                      >
                                        {meal.description}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleInstantShuffleMeal(m.id, meal.id)}
                                      className="p-1 transition cursor-pointer hover:scale-110"
                                      style={{ color: 'var(--color-text-secondary, #64748b)' }}
                                      title="Shuffle meal"
                                    >
                                      <Dices className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMeal(m.id, meal.id)}
                                      className="p-1 transition cursor-pointer hover:scale-110"
                                      style={{ color: 'var(--color-text-secondary, #64748b)' }}
                                      title={t('removeMealTooltip') || 'Remove meal'}
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                <div 
                                  className="flex items-center gap-4 text-xs pt-1 font-medium"
                                  style={{ color: 'var(--color-text-secondary, #64748b)' }}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} /> {meal.prepMinutes} mins
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Flame className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {meal.cookMinutes} mins
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" /> {meal.servings} {t('servings') || 'servings'}
                                  </span>
                                </div>
                              </div>

                              <div 
                                className="grid grid-cols-2 border-t text-xs font-bold divide-x"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                                  borderColor: 'var(--color-border, #e2e8f0)'
                                }}
                              >
                                {meal.isBatchCook ? (
                                  <button
                                    type="button"
                                    onClick={() => openBatchCook(m.id, meal)}
                                    className="py-3 flex items-center justify-center gap-2 hover:opacity-80 transition cursor-pointer"
                                    style={{ color: 'var(--color-text, #0f172a)' }}
                                  >
                                    <Utensils className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('batchCookBtn') || 'Batch cook'}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => openSwapMeal(m.id, meal, m.plan!)}
                                  className={`py-3 flex items-center justify-center gap-2 hover:opacity-80 transition cursor-pointer ${!meal.isBatchCook ? 'col-span-2' : ''}`}
                                  style={{ color: 'var(--color-text, #0f172a)' }}
                                >
                                  <ArrowLeftRight className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('swapMealBtn') || 'Swap meal'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Grocery List Sync */}
                      <div 
                        onClick={() => setSyncToGrocery(!syncToGrocery)}
                        className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none"
                        style={{
                          backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                          borderColor: 'var(--color-border, #e2e8f0)'
                        }}
                      >
                        <span className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--color-text, #0f172a)' }}>
                          <ShoppingCart className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
                          Add ingredients to Grocery Shopping List
                        </span>
                        <div 
                          className="w-9 h-5 rounded-full p-0.5 transition"
                          style={{ backgroundColor: syncToGrocery ? 'var(--color-emerald, #22c55e)' : '#94a3b8' }}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition transform ${syncToGrocery ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRefreshAll(m.id)}
                          className="flex-1 py-3 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('refreshAllMealsBtn') || 'Refresh all meals'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreatePlan(m.plan!)}
                          className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg hover:brightness-110"
                          style={{ backgroundColor: 'var(--color-emerald, #22c55e)' }}
                        >
                          <CalendarPlus className="h-4 w-4" /> {t('createPlanBtn') || 'Create plan'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Single AI Recipe Created View */}
                  {m.recipe && (
                    <div 
                      className="p-4 rounded-2xl border space-y-3 shadow-sm"
                      style={{
                        backgroundColor: 'var(--color-card, #ffffff)',
                        borderColor: 'var(--color-border, #e2e8f0)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider block"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          AI Recipe Created
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSaveRecipeToBook(m.recipe)}
                          className="text-xs font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-emerald, #10b981)'
                          }}
                        >
                          <Bookmark className="h-3.5 w-3.5" /> Save to Recipes
                        </button>
                      </div>
                      <h3 className="text-lg font-extrabold" style={{ color: 'var(--color-text, #0f172a)' }}>{m.recipe.title}</h3>
                      <p 
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--color-text-secondary, #64748b)' }}
                      >
                        {m.recipe.description}
                      </p>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div 
                    className="w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-1 shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      color: 'var(--color-text, #0f172a)'
                    }}
                  >
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div 
            className="flex items-center gap-3 p-3.5 border rounded-2xl max-w-xs text-xs shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #ffffff)',
              borderColor: 'var(--color-border, #e2e8f0)',
              color: 'var(--color-text-secondary, #64748b)'
            }}
          >
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('chefThinking') || 'Chef Foodie is thinking...'}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Topic Buttons Bar (Accessible even during ongoing chat) */}
      {wizardStep === null && activeQuestionnaireSections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 custom-scrollbar shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
            <Sparkles className="h-3 w-3" style={{ color: 'var(--color-primary, #E05638)' }} /> Topics:
          </span>
          {activeQuestionnaireSections.map((sec) => (
            <button
              key={`chip-${sec.id}`}
              type="button"
              onClick={() => handleStartTopicWizard(sec)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--color-card, #ffffff)',
                borderColor: 'var(--color-border, #e2e8f0)',
                color: 'var(--color-text, #0f172a)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #e2e8f0)')}
            >
              <Layers className="h-3 w-3" style={{ color: 'var(--color-primary, #E05638)' }} />
              <span>{sec.topicTitle}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Prompt Box */}
      <div 
        className="border rounded-2xl p-1.5 flex items-center gap-2 shrink-0 shadow-xl transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card, #ffffff)',
          borderColor: 'var(--color-border, #e2e8f0)'
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('askPromptPlaceholder') || 'Ask about recipes, cooking tips, ingredients...'}
          className="bg-transparent border-none text-sm px-3.5 flex-1 outline-none font-normal"
          style={{ color: 'var(--color-text, #0f172a)' }}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !prompt.trim()}
          className="disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer shadow-md"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* 1. BATCH COOK MODAL */}
      {showBatchModal && activeBatchMeal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-xs animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-card, #ffffff)',
              borderColor: 'var(--color-border, #e2e8f0)',
              color: 'var(--color-text, #0f172a)'
            }}
          >
            <button 
              onClick={() => setShowBatchModal(false)}
              className="absolute top-4 right-4 p-1 cursor-pointer transition"
              style={{ color: 'var(--color-text-secondary, #64748b)' }}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 pr-6">
              <h2 
                className="text-base font-extrabold tracking-tight"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {t('cookOnceEatAgain') || 'Cook once, eat again'}
              </h2>
              <p 
                className="text-xs leading-relaxed"
                style={{ color: 'var(--color-text-secondary, #64748b)' }}
              >
                {(t('leftoversOfPrefix') || 'Leftovers of {title}.').replace('{title}', activeBatchMeal.title)} {t('leftoverSubText') || "Pick the days you'll eat this as leftovers."}
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {getOtherDaysForBatch().map((d) => {
                const isChecked = selectedBatchDays.includes(d.dayIndex);
                return (
                  <div key={d.dayIndex} className="space-y-1.5">
                    <span 
                      className="text-[11px] font-bold uppercase tracking-wide block"
                      style={{ color: 'var(--color-text-secondary, #64748b)' }}
                    >
                      {d.dayLabel.toUpperCase()}
                    </span>
                    <div 
                      onClick={() => {
                        if (isChecked) {
                          setSelectedBatchDays(prev => prev.filter(idx => idx !== d.dayIndex));
                        } else {
                          setSelectedBatchDays(prev => [...prev, d.dayIndex]);
                        }
                      }}
                      className="p-3 rounded-xl border flex items-center justify-between cursor-pointer transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                        borderColor: isChecked ? 'var(--color-primary, #E05638)' : 'var(--color-border, #e2e8f0)'
                      }}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block capitalize" style={{ color: 'var(--color-text, #0f172a)' }}>{d.mealType.toLowerCase()}</span>
                        <p 
                          className="text-[11px]"
                          style={{ color: 'var(--color-text-secondary, #64748b)' }}
                        >
                          {d.title}
                        </p>
                      </div>
                      <div 
                        className="w-5 h-5 rounded-md border flex items-center justify-center transition"
                        style={{
                          backgroundColor: isChecked ? 'var(--color-primary, #E05638)' : 'transparent',
                          borderColor: 'var(--color-primary, #E05638)'
                        }}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer shadow-sm"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                  borderColor: 'var(--color-border, #e2e8f0)',
                  color: 'var(--color-text, #0f172a)'
                }}
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveBatchCook}
                className="py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                style={{ backgroundColor: 'var(--color-emerald, #22c55e)' }}
              >
                <Check className="h-4 w-4" /> {t('saveBtn') || 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SWAP MEAL MODAL */}
      {showSwapModal && activeSwapMeal && (
        <div 
          onClick={() => setShowSwapModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative text-xs max-h-[92vh] flex flex-col justify-between animate-in fade-in cursor-default"
            style={{
              backgroundColor: 'var(--color-card, #ffffff)',
              borderColor: 'var(--color-border, #e2e8f0)',
              color: 'var(--color-text, #0f172a)'
            }}
          >
            <button 
              onClick={() => setShowSwapModal(false)}
              className="absolute top-4 right-4 p-1 cursor-pointer transition"
              style={{ color: 'var(--color-text-secondary, #64748b)' }}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-3.5 overflow-hidden flex flex-col">
              <div>
                <h2 
                  className="text-lg font-black tracking-tight"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {(t('chooseMealTypeHeading') || 'Choose {mealType}').replace('{mealType}', activeSwapMeal.mealType.charAt(0) + activeSwapMeal.mealType.slice(1).toLowerCase())}
                </h2>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-secondary, #64748b)' }}
                >
                  {activeSwapMeal.dayLabel}
                </p>
              </div>

              {/* Top Tabs */}
              <div 
                className="grid grid-cols-3 gap-1 p-1 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                  borderColor: 'var(--color-border, #e2e8f0)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setSwapTab('ideas')}
                  className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  style={{
                    backgroundColor: swapTab === 'ideas' ? 'var(--color-card, #ffffff)' : 'transparent',
                    color: swapTab === 'ideas' ? 'var(--color-text, #0f172a)' : 'var(--color-text-secondary, #64748b)'
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('newIdeasTab') || 'New Ideas'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwapTab('saved');
                    setSavedCurrentPage(1);
                  }}
                  className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  style={{
                    backgroundColor: swapTab === 'saved' ? 'var(--color-card, #ffffff)' : 'transparent',
                    color: swapTab === 'saved' ? 'var(--color-text, #0f172a)' : 'var(--color-text-secondary, #64748b)'
                  }}
                >
                  <Bookmark className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary, #64748b)' }} /> {t('savedTab') || 'Saved'}
                </button>
                <button
                  type="button"
                  onClick={() => setSwapTab('repeat')}
                  className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  style={{
                    backgroundColor: swapTab === 'repeat' ? 'var(--color-card, #ffffff)' : 'transparent',
                    color: swapTab === 'repeat' ? 'var(--color-text, #0f172a)' : 'var(--color-text-secondary, #64748b)'
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary, #64748b)' }} /> {(t('repeatTab') || 'Repeat ({count})').replace('{count}', String(repeatMealsInPlan.length))}
                </button>
              </div>

              {/* TAB 1: NEW IDEAS */}
              {swapTab === 'ideas' && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label 
                      className="text-[11px] font-bold block"
                      style={{ color: 'var(--color-text-secondary, #64748b)' }}
                    >
                      {t('ideasForLabel') || 'Ideas for'}
                    </label>
                    <div 
                      onClick={() => ideasInputRef.current?.focus()}
                      className="flex items-center gap-2 border rounded-xl px-3 py-2 text-xs cursor-text transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                        borderColor: 'var(--color-border, #e2e8f0)',
                        color: 'var(--color-text, #0f172a)'
                      }}
                    >
                      <Search className="h-4 w-4 shrink-0 pointer-events-none" style={{ color: 'var(--color-text-secondary, #64748b)' }} />
                      <input
                        ref={ideasInputRef}
                        type="text"
                        value={swapSearchQuery}
                        onChange={(e) => {
                          setSwapSearchQuery(e.target.value);
                          setIdeasCurrentPage(1);
                        }}
                        placeholder={t('searchOrDescribeIdeas') || "Search or describe ideas..."}
                        className="bg-transparent flex-1 text-xs outline-none w-full"
                        style={{ color: 'var(--color-text, #0f172a)' }}
                      />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ideasInputRef.current?.focus();
                          ideasInputRef.current?.select();
                        }}
                        className="cursor-pointer p-0.5"
                        style={{ color: 'var(--color-text-secondary, #64748b)' }}
                        title={t('editQueryTooltip') || 'Click to edit query'}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setUsePantryIngredients(!usePantryIngredients);
                      setIdeasCurrentPage(1);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)'
                    }}
                  >
                    <span className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--color-text, #0f172a)' }}>
                      <Package className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} /> {t('useMyPantryIngredients') || 'Use my pantry ingredients'}
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary, #64748b)' }}>({(t('inStockSuffix') || '{count} in stock').replace('{count}', String(pantryIngredientsList.length))})</span>
                    </span>
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: usePantryIngredients ? 'var(--color-emerald, #22c55e)' : '#94a3b8' }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${usePantryIngredients ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {paginatedSwapIdeas.length === 0 ? (
                      <div className="p-8 text-center text-xs" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                        No recipe ideas from other users found.
                      </div>
                    ) : (
                      paginatedSwapIdeas.map((rec, idx) => {
                        const matchedCount = (rec.ingredients || []).filter((ing: string) => 
                          pantryIngredientsList.some(p => ing.toLowerCase().includes(p) || p.includes(ing.toLowerCase()))
                        ).length;

                        return (
                          <div 
                            key={rec.id || idx} 
                            className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm"
                            style={{
                              backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                              borderColor: 'var(--color-border, #e2e8f0)'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span 
                                className="border text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1"
                                style={{
                                  backgroundColor: 'rgba(224, 86, 56, 0.15)',
                                  borderColor: 'rgba(224, 86, 56, 0.3)',
                                  color: 'var(--color-primary, #E05638)'
                                }}
                              >
                                🍽 {activeSwapMeal.mealType}
                              </span>
                              <div className="flex items-center gap-2">
                                {matchedCount > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-600">
                                    ✓ {matchedCount} in pantry
                                  </span>
                                )}
                                <span 
                                  className="text-xs flex items-center gap-1"
                                  style={{ color: 'var(--color-text-secondary, #64748b)' }}
                                >
                                  <Users className="h-3.5 w-3.5" /> {servings}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <img
                                src={rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                                alt={rec.title}
                                className="w-16 h-16 rounded-xl object-cover border shrink-0"
                                style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                              />
                              <div className="space-y-1 min-w-0 flex-1">
                                <h3 className="font-extrabold text-sm leading-snug truncate" style={{ color: 'var(--color-text, #0f172a)' }}>{rec.title}</h3>
                                <p 
                                  className="text-xs leading-relaxed line-clamp-2"
                                  style={{ color: 'var(--color-text-secondary, #64748b)' }}
                                >
                                  {rec.description}
                                </p>
                              </div>
                            </div>

                            <div 
                              className="flex items-center gap-4 text-xs font-medium"
                              style={{ color: 'var(--color-text-secondary, #64748b)' }}
                            >
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" /> {rec.prep} mins
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Flame className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {rec.cook} mins
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleConfirmSwap(rec)}
                              className="w-full py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md mt-1"
                              style={{ backgroundColor: '#29B6F6' }}
                            >
                              {(t('addToMealTypeBtn') || '+ Add to {mealType}').replace('{mealType}', activeSwapMeal.mealType.charAt(0) + activeSwapMeal.mealType.slice(1).toLowerCase())}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {filteredOtherUserIdeas.length > IDEAS_ITEMS_PER_PAGE && (
                    <div 
                      className="pt-2 border-t flex items-center justify-between text-xs"
                      style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                    >
                      <span style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                        {t('showing') || 'Showing'} {ideasStartIndex + 1} - {Math.min(ideasStartIndex + IDEAS_ITEMS_PER_PAGE, filteredOtherUserIdeas.length)} {t('of') || 'of'} {filteredOtherUserIdeas.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={ideasCurrentPage <= 1}
                          onClick={() => setIdeasCurrentPage(p => Math.max(1, p - 1))}
                          className="p-1 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        
                        {Array.from({ length: ideasTotalPages }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setIdeasCurrentPage(num)}
                            className="min-w-[26px] h-6 rounded-md text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-sm"
                            style={ideasCurrentPage === num ? {
                              backgroundColor: 'var(--color-primary, #E05638)',
                              borderColor: 'var(--color-primary, #E05638)',
                              color: '#ffffff'
                            } : {
                              backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                              borderColor: 'var(--color-border, #e2e8f0)',
                              color: 'var(--color-text, #0f172a)'
                            }}
                          >
                            {num}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={ideasCurrentPage >= ideasTotalPages}
                          onClick={() => setIdeasCurrentPage(p => Math.min(ideasTotalPages, p + 1))}
                          className="p-1 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SAVED */}
              {swapTab === 'saved' && (
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary, #64748b)' }} />
                        <input
                          type="text"
                          placeholder={t('searchByNamePlaceholder') || 'Search by name'}
                          value={savedSearchName}
                          onChange={(e) => {
                            setSavedSearchName(e.target.value);
                            setSavedCurrentPage(1);
                          }}
                          className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={selectedSavedBookFilter}
                          onChange={(e) => {
                            setSelectedSavedBookFilter(e.target.value);
                            setSavedCurrentPage(1);
                          }}
                          className="border font-bold text-xs rounded-xl pl-3 pr-7 py-2 outline-none appearance-none cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-emerald, #10b981)',
                            color: 'var(--color-primary, #E05638)'
                          }}
                        >
                          <option value="All Books">{t('allBooksOption') || 'All Books'}</option>
                          {userBooks.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary, #64748b)' }} />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSavedFilterOptions(!showSavedFilterOptions)}
                        className="border font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                          borderColor: 'var(--color-emerald, #10b981)',
                          color: 'var(--color-primary, #E05638)'
                        }}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('filterBtn') || 'Filter'}
                      </button>
                    </div>

                    {showSavedFilterOptions && (
                      <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                        {[
                          { key: 'All', label: t('allTag') || 'All' },
                          { key: 'Favorites', label: t('favoritesTag') || 'Favorites' },
                          { key: 'Main Dish', label: t('mainDishTag') || 'Main Dish' },
                          { key: 'Appetiser', label: 'Appetiser' },
                          { key: 'Dessert', label: 'Dessert' }
                        ].map((tag) => (
                          <button
                            key={tag.key}
                            type="button"
                            onClick={() => {
                              setSelectedSavedTagFilter(tag.key);
                              setSavedCurrentPage(1);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shadow-sm"
                            style={selectedSavedTagFilter === tag.key ? {
                              backgroundColor: 'var(--color-primary, #E05638)',
                              borderColor: 'var(--color-primary, #E05638)',
                              color: '#ffffff'
                            } : {
                              backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                              borderColor: 'var(--color-border, #e2e8f0)',
                              color: 'var(--color-text-secondary, #64748b)'
                            }}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {paginatedSavedRecipes.length === 0 ? (
                      <div className="p-8 text-center text-xs" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                        {t('noSavedRecipesProfile') || 'No saved recipes found for your current profile.'}
                      </div>
                    ) : (
                      paginatedSavedRecipes.map((rec: any, idx: number) => (
                        <div 
                          key={rec.id || idx} 
                          className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)'
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=400&q=80'}
                              alt={rec.title || rec.name}
                              className="w-16 h-16 rounded-xl object-cover border shrink-0"
                              style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                            />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                                >
                                  {rec.recipeType || rec.category || 'Main Dish'}
                                </span>
                                <Heart className="h-3.5 w-3.5 fill-[#E05638] text-[#E05638]" />
                              </div>

                              <h3 className="font-extrabold text-sm leading-snug truncate" style={{ color: 'var(--color-text, #0f172a)' }}>
                                {rec.title || rec.name}
                              </h3>

                              <div className="flex items-center gap-3 text-xs font-medium pt-0.5" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" /> {rec.servings || servings}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> {rec.prep || 15} mins
                                </span>
                                <span className="flex items-center gap-1">
                                  <Flame className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {rec.cook || 10} mins
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleConfirmSwap({
                              title: rec.title || rec.name,
                              description: rec.description || '',
                              prep: rec.prep || 15,
                              cook: rec.cook || 10,
                              image: rec.imageUrl || rec.image,
                              ingredients: rec.ingredients || []
                            })}
                            className="w-full py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                            style={{ backgroundColor: '#29B6F6' }}
                          >
                            {(t('addToMealTypeBtn') || '+ Add to {mealType}').replace('{mealType}', activeSwapMeal.mealType.charAt(0) + activeSwapMeal.mealType.slice(1).toLowerCase())}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {filteredUserSavedRecipes.length > SAVED_ITEMS_PER_PAGE && (
                    <div 
                      className="pt-2 border-t flex items-center justify-between text-xs"
                      style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                    >
                      <span style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                        {t('showing') || 'Showing'} {savedStartIndex + 1} - {Math.min(savedStartIndex + SAVED_ITEMS_PER_PAGE, filteredUserSavedRecipes.length)} {t('of') || 'of'} {filteredUserSavedRecipes.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={savedCurrentPage <= 1}
                          onClick={() => setSavedCurrentPage(p => Math.max(1, p - 1))}
                          className="p-1 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        
                        {Array.from({ length: savedTotalPages }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSavedCurrentPage(num)}
                            className="min-w-[26px] h-6 rounded-md text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-sm"
                            style={savedCurrentPage === num ? {
                              backgroundColor: 'var(--color-primary, #E05638)',
                              borderColor: 'var(--color-primary, #E05638)',
                              color: '#ffffff'
                            } : {
                              backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                              borderColor: 'var(--color-border, #e2e8f0)',
                              color: 'var(--color-text, #0f172a)'
                            }}
                          >
                            {num}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={savedCurrentPage >= savedTotalPages}
                          onClick={() => setSavedCurrentPage(p => Math.min(savedTotalPages, p + 1))}
                          className="p-1 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                          style={{
                            backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                            borderColor: 'var(--color-border, #e2e8f0)',
                            color: 'var(--color-text, #0f172a)'
                          }}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REPEAT */}
              {swapTab === 'repeat' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {repeatMealsInPlan.length === 0 ? (
                    <div className="p-8 text-center text-xs" style={{ color: 'var(--color-text-secondary, #64748b)' }}>
                      {t('noOtherMealsToRepeat') || 'No other meals in this plan available to repeat.'}
                    </div>
                  ) : (
                    repeatMealsInPlan.map((m) => (
                      <div 
                        key={m.id} 
                        className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                          borderColor: 'var(--color-border, #e2e8f0)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span 
                            className="border text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 text-purple-700"
                            style={{
                              backgroundColor: 'rgba(168, 85, 247, 0.15)',
                              borderColor: 'rgba(168, 85, 247, 0.3)'
                            }}
                          >
                            🔄 {m.dayLabel}
                          </span>
                          <span 
                            className="text-xs flex items-center gap-1"
                            style={{ color: 'var(--color-text-secondary, #64748b)' }}
                          >
                            <Clock className="h-3.5 w-3.5" /> {m.prepMinutes + m.cookMinutes} mins
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <img
                            src={m.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                            alt={m.title}
                            className="w-16 h-16 rounded-xl object-cover border shrink-0"
                            style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
                          />
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-extrabold text-sm leading-snug truncate" style={{ color: 'var(--color-text, #0f172a)' }}>{m.title}</h3>
                            <p 
                              className="text-xs leading-relaxed line-clamp-2"
                              style={{ color: 'var(--color-text-secondary, #64748b)' }}
                            >
                              {m.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleConfirmSwap({
                            title: m.title,
                            description: m.description,
                            prep: m.prepMinutes,
                            cook: m.cookMinutes,
                            image: m.image,
                            ingredients: m.ingredients || []
                          })}
                          className="w-full py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md mt-1"
                          style={{ backgroundColor: '#29B6F6' }}
                        >
                          {t('repeatThisMealBtn') || '+ Repeat this meal'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 3. RECIPE PREFERENCES MODAL */}
      {showPreferences && (
        <div 
          onClick={() => setShowPreferences(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-5 cursor-default animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-card, #ffffff)',
              borderColor: 'var(--color-border, #e2e8f0)',
              color: 'var(--color-text, #0f172a)'
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 
                  className="text-xl font-black tracking-tight"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('recipePreferencesTitle') || 'Recipe Preferences'}
                </h2>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-secondary, #64748b)' }}
                >
                  {t('recipePreferencesSub') || 'Personalise your cooking experience'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="p-2 rounded-xl border transition cursor-pointer shadow-sm"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                  borderColor: 'var(--color-border, #e2e8f0)',
                  color: 'var(--color-text, #0f172a)'
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
              <div className="space-y-2">
                <label 
                  className="block font-bold text-xs"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('servingsTitle') || 'Servings'}
                </label>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      color: 'var(--color-text, #0f172a)'
                    }}
                  >
                    -
                  </button>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text, #0f172a)' }}>
                    {(t('peopleSuffix') || '{count} people').replace('{count}', String(servings))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings(servings + 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      color: 'var(--color-text, #0f172a)'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label 
                  className="block font-bold text-xs"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('countryTitle') || 'Country'}
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer appearance-none shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      color: 'var(--color-text, #0f172a)'
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: 'var(--color-primary, #E05638)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <label 
                  className="block font-bold text-xs"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('dietaryPreferencesTitle') || 'Dietary Preferences'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((item) => {
                    const isSelected = selectedDiets.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleDiet(item)}
                        className="px-4 py-1.5 rounded-full font-bold text-xs border transition cursor-pointer shadow-sm"
                        style={isSelected ? {
                          backgroundColor: 'rgba(224, 86, 56, 0.2)',
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        } : {
                          backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                          borderColor: 'var(--color-border, #e2e8f0)',
                          color: 'var(--color-text-secondary, #64748b)'
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label 
                  className="block font-bold text-xs"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('allergiesTitle') || 'Allergies'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map((item) => {
                    const isSelected = selectedAllergies.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleAllergy(item)}
                        className="px-4 py-1.5 rounded-full font-bold text-xs border transition cursor-pointer shadow-sm"
                        style={isSelected ? {
                          backgroundColor: 'rgba(224, 86, 56, 0.2)',
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        } : {
                          backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                          borderColor: 'var(--color-border, #e2e8f0)',
                          color: 'var(--color-text-secondary, #64748b)'
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label 
                  className="block font-bold text-xs"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('ingredientsToAvoidTitle') || 'Ingredients to Avoid'}
                </label>
                <form onSubmit={handleAddAvoid} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('typeIngredientPlaceholder') || 'Type an ingredient...'}
                    value={newAvoidInput}
                    onChange={(e) => setNewAvoidInput(e.target.value)}
                    className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      color: 'var(--color-text, #0f172a)'
                    }}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 text-white rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-md"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div 
                  className="p-3 rounded-2xl border min-h-[50px] flex flex-wrap gap-2 items-center"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                    borderColor: 'var(--color-border, #e2e8f0)'
                  }}
                >
                  {ingredientsToAvoid.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary, #64748b)' }}>{t('noIngredientsAvoid') || 'No ingredients added to avoid list'}</span>
                  ) : (
                    ingredientsToAvoid.map((item) => (
                      <span 
                        key={item}
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-sm"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'var(--color-emerald, #10b981)',
                          color: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        {item}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAvoid(item)} 
                          className="hover:text-red-500 cursor-pointer ml-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label 
                  className="block font-bold text-xs"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('tastesTitle') || 'Tastes'}
                </label>
                <p 
                  className="text-[11px] leading-relaxed"
                  style={{ color: 'var(--color-text-secondary, #64748b)' }}
                >
                  {t('tastesDesc') || "Anything else about how you like to eat. We'll factor these into your recipes."}
                </p>

                <form onSubmit={handleAddTaste} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('tastesPlaceholder') || 'e.g. prefers larger portions, loves umami...'}
                    value={newTasteInput}
                    onChange={(e) => setNewTasteInput(e.target.value)}
                    className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      color: 'var(--color-text, #0f172a)'
                    }}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 text-white rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-md"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div 
                  className="p-3 rounded-2xl border min-h-[50px] flex flex-wrap gap-2 items-center"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                    borderColor: 'var(--color-border, #e2e8f0)'
                  }}
                >
                  {tastesList.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary, #64748b)' }}>{t('noTastesSpecified') || 'No taste preferences specified'}</span>
                  ) : (
                    tastesList.map((item) => (
                      <span 
                        key={item}
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-sm"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'var(--color-emerald, #10b981)',
                          color: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        {item}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTaste(item)} 
                          className="hover:text-red-500 cursor-pointer ml-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div 
              className="pt-4 border-t flex items-center justify-end gap-2.5"
              style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
            >
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="px-5 py-2.5 border rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #f1f5f9)',
                  borderColor: 'var(--color-border, #e2e8f0)',
                  color: 'var(--color-text, #0f172a)'
                }}
              >
                {t('cancel') || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleClearAllPreferences}
                className="px-4 py-2.5 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                style={{ backgroundColor: '#dc2626' }}
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('clearAllBtn') || 'Clear All'}
              </button>

              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-6 py-2.5 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              >
                {t('saveBtn') || 'Save'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
"""

target_paths = [
    "apps/web/src/app/chef/page.tsx",
    "src/app/chef/page.tsx"
]

written = False
for tp in target_paths:
    if os.path.exists(os.path.dirname(tp)):
        with open(tp, "w", encoding="utf-8") as f:
            f.write(code)
        print(f"Updated: {tp}")
        written = True

if not written:
    os.makedirs("apps/web/src/app/chef", exist_ok=True)
    with open("apps/web/src/app/chef/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("Created: apps/web/src/app/chef/page.tsx")
