// @ts-nocheck
'use client';
import AiQuotaBar from '@/components/AiQuotaBar';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, Send, SlidersHorizontal, Edit3, Clock, Flame, Users, RefreshCw, 
  Calendar, CalendarPlus, X, ArrowLeftRight, Utensils, Loader2, User as UserIcon, 
  Check, Sparkles, Bookmark, RotateCcw, Package, Plus, Trash2, ChevronDown, 
  ChevronLeft, ChevronRight, Search, Heart, Copy, ShoppingCart, Dices, 
  CheckCircle2, Layers, HelpCircle, Coins, Cpu, ShieldAlert, Mic, MicOff,
  Volume2, VolumeX, Square, BookOpen, BookA, Zap, Award
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';

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

interface RecommendedRecipeData {
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  calories?: number;
  mealType?: string;
  ingredients: string[];
  instructions: string[];
  chefTip?: string;
  image?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  plan?: MealPlanData;
  recipe?: any;
  recommendedRecipe?: RecommendedRecipeData;
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

  // Synced from /admin/ai-settings (PostgreSQL backed)
  const [questionnaireSections, setQuestionnaireSections] = useState<any[]>(DEFAULT_SECTIONS);
  const [activeTopicTitle, setActiveTopicTitle] = useState<string>('Standard Wizard');
  const [wizardQuestionsList, setWizardQuestionsList] = useState<string[]>([]);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'compact' | 'detailed'>('card');
  const [activeAiModel, setActiveAiModel] = useState<string>('gemini-2.5-flash');
  const [strictDietEnforcement, setStrictDietEnforcement] = useState<boolean>(false);
  const [filterWordsList, setFilterWordsList] = useState<string[]>([]);
  const [customVocabularyList, setCustomVocabularyList] = useState<string[]>([]);
  const [knowledgeBaseList, setKnowledgeBaseList] = useState<string[]>([]);
  const [enablePantryContext, setEnablePantryContext] = useState<boolean>(true);
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [maxPlanDays, setMaxPlanDays] = useState<number>(7);

  // Voice Interaction State (Synced from /admin/ai-settings)
  const [enableVoiceInteraction, setEnableVoiceInteraction] = useState<boolean>(true);
  const [voiceEngine, setVoiceEngine] = useState<'version1' | 'version2'>('version2');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voiceAutoPlay, setVoiceAutoPlay] = useState<boolean>(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('en-US-Neural2-F');
  
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);

  // Token System Telemetry Synced with /admin/token-setting
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenName, setTokenName] = useState<string>('Foodie Token');
  const [chefCost, setChefCost] = useState<number>(1);
  const [tokenPackages, setTokenPackages] = useState<any[]>([]);
  const [isTokenPurchaseOpen, setIsTokenPurchaseOpen] = useState(false);

  // User Dietary Preferences State
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [servings, setServings] = useState<number>(2);
  const [country, setCountry] = useState<string>('Singapore');
  const [selectedDiets, setSelectedDiets] = useState<string[]>(['Vegetarian']);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(['Peanuts']);
  const [ingredientsToAvoid, setIngredientsToAvoid] = useState<string[]>(['Oily']);
  const [newAvoidInput, setNewAvoidInput] = useState<string>('');
  const [tastesList, setTastesList] = useState<string[]>(['Less Spicy']);
  const [newTasteInput, setNewTasteInput] = useState<string>('');

  // Wizard Questionnaire Flow State
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [wizardAnswers, setWizardAnswers] = useState<Record<number, string>>({});

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
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ------------------------------------------------------------------
  // Voice Synthesis Engine
  // ------------------------------------------------------------------
  const cleanSpeechText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*_~`]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/•|\*|-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  };

  const speakText = (textToSpeak: string, msgId?: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking && speakingMsgId === msgId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    const clean = cleanSpeechText(textToSpeak);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = Math.max(0.7, Math.min(1.8, voiceSpeed || 1.0));

    if (selectedVoiceName.includes('F') || selectedVoiceName.includes('Aria') || selectedVoiceName.includes('Matilda')) {
      utterance.pitch = 1.05;
    } else if (selectedVoiceName.includes('D') || selectedVoiceName.includes('Marcus')) {
      utterance.pitch = 0.88;
    } else {
      utterance.pitch = 1.0;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let matchedVoice = null;
      if (selectedVoiceName.includes('GB')) {
        matchedVoice = voices.find(v => v.lang.includes('en-GB'));
      } else if (selectedVoiceName.includes('AU')) {
        matchedVoice = voices.find(v => v.lang.includes('en-AU'));
      } else {
        matchedVoice = voices.find(v => v.lang.includes('en-US') || v.lang.startsWith('en'));
      }
      if (matchedVoice) utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMsgId(msgId || 'general');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast("🎙️ Listening... Speak your request");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // ------------------------------------------------------------------
  // Dietary Preferences Handlers (Local & PostgreSQL Sync)
  // ------------------------------------------------------------------
  const getUserKey = useCallback((user: User | null) => {
    if (!user) return 'guest';
    return user.id || (user.email ? user.email.toLowerCase().trim() : 'guest');
  }, []);

  const loadUserPreferences = useCallback(async (user: User | null) => {
    const userKey = getUserKey(user);

    // 1. Try PostgreSQL Endpoint
    try {
      const res = await fetch(`/api/user/preferences?userId=${encodeURIComponent(userKey)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.preferences) {
        const p = data.preferences;
        if (typeof p.servings === 'number') setServings(p.servings);
        if (p.country) setCountry(p.country);
        if (Array.isArray(p.diets)) setSelectedDiets(p.diets);
        if (Array.isArray(p.allergies)) setSelectedAllergies(p.allergies);
        if (Array.isArray(p.avoid)) setIngredientsToAvoid(p.avoid);
        if (Array.isArray(p.tastes)) setTastesList(p.tastes);
        return;
      }
    } catch (_) {}

    // 2. Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`zecratary_recipe_preferences_${userKey}`) || localStorage.getItem('zecratary_recipe_preferences');
        if (saved) {
          const p = JSON.parse(saved);
          if (typeof p.servings === 'number') setServings(p.servings);
          if (p.country) setCountry(p.country);
          if (Array.isArray(p.diets)) setSelectedDiets(p.diets);
          if (Array.isArray(p.allergies)) setSelectedAllergies(p.allergies);
          if (Array.isArray(p.avoid)) setIngredientsToAvoid(p.avoid);
          if (Array.isArray(p.tastes)) setTastesList(p.tastes);
        }
      } catch (_) {}
    }
  }, [getUserKey]);

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

  const handleSavePreferences = async () => {
    const prefs = {
      servings,
      country,
      diets: selectedDiets,
      allergies: selectedAllergies,
      avoid: ingredientsToAvoid,
      tastes: tastesList
    };

    const active = currentUserRef.current || getCurrentUser();
    const userKey = getUserKey(active);

    // Save to local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`zecratary_recipe_preferences_${userKey}`, JSON.stringify(prefs));
      localStorage.setItem('zecratary_recipe_preferences', JSON.stringify(prefs));
    }

    // Persist to PostgreSQL
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userKey, ...prefs })
      });
    } catch (err) {
      console.warn('PostgreSQL preference save notice:', err);
    }

    setShowPreferences(false);
    showToast("Preferences saved and synchronized!");
  };

  const handleClearAllPreferences = async () => {
    setServings(2);
    setCountry('Singapore');
    setSelectedDiets([]);
    setSelectedAllergies([]);
    setIngredientsToAvoid([]);
    setTastesList([]);

    const active = currentUserRef.current || getCurrentUser();
    const userKey = getUserKey(active);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(`zecratary_recipe_preferences_${userKey}`);
      localStorage.removeItem('zecratary_recipe_preferences');
    }

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userKey,
          servings: 2,
          country: 'Singapore',
          diets: [],
          allergies: [],
          avoid: [],
          tastes: []
        })
      });
    } catch (_) {}

    showToast("Preferences cleared!");
  };

  // ------------------------------------------------------------------
  // Telemetry & Settings Synchronization from PostgreSQL admin_settings
  // ------------------------------------------------------------------
  const fetchTokenAndAiTelemetry = useCallback(async () => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const queryParam = active?.id ? `?userId=${active.id}` : active?.email ? `?email=${encodeURIComponent(active.email)}` : '';
      
      const res = await fetch(`/api/tokens${queryParam}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        setTokenBalance(Number(data.balance ?? 0));
        setTokenSymbol(data.tokenSymbol || '🪙');
        setTokenName(data.tokenName || 'Foodie Token');
        setChefCost(Number(data.costs?.chef ?? 1));
        if (Array.isArray(data.packages)) {
          setTokenPackages(data.packages);
        }
      }

      try {
        const sRes = await fetch('/api/admin/settings', { cache: 'no-store' });
        const sData = await sRes.json();
        const chefCfg = sData?.chefAiSettings || sData?.settings?.chefAiSettings || sData;
        if (chefCfg) {
          if (chefCfg.model || sData.aiModel) setActiveAiModel(chefCfg.model || sData.aiModel);
          if (chefCfg.strictDietEnforcement !== undefined) setStrictDietEnforcement(Boolean(chefCfg.strictDietEnforcement));
          if (Array.isArray(chefCfg.filterWordsList)) setFilterWordsList(chefCfg.filterWordsList.filter(Boolean));
          if (Array.isArray(chefCfg.customVocabularyList)) setCustomVocabularyList(chefCfg.customVocabularyList.filter(Boolean));
          if (Array.isArray(chefCfg.knowledgeBaseList)) setKnowledgeBaseList(chefCfg.knowledgeBaseList.filter(Boolean));
          if (chefCfg.enableWebSearch !== undefined) setEnableWebSearch(Boolean(chefCfg.enableWebSearch));
          if (chefCfg.enablePantryContext !== undefined) setEnablePantryContext(Boolean(chefCfg.enablePantryContext));
          if (chefCfg.maxPlanDays !== undefined) setMaxPlanDays(Number(chefCfg.maxPlanDays) || 7);
          if (chefCfg.resultDisplayMode) setResultDisplayMode(chefCfg.resultDisplayMode);

          if (chefCfg.enableVoiceInteraction !== undefined) setEnableVoiceInteraction(Boolean(chefCfg.enableVoiceInteraction));
          if (chefCfg.voiceEngine) setVoiceEngine(chefCfg.voiceEngine);
          if (chefCfg.voiceSpeed !== undefined) setVoiceSpeed(Number(chefCfg.voiceSpeed));
          if (chefCfg.voiceAutoPlay !== undefined) setVoiceAutoPlay(Boolean(chefCfg.voiceAutoPlay));
          if (chefCfg.selectedVoiceName) setSelectedVoiceName(chefCfg.selectedVoiceName);

          if (Array.isArray(chefCfg.sections) && chefCfg.sections.length > 0) {
            const activeSecs = chefCfg.sections.filter((s: any) => s.enabled !== false);
            const toUse = activeSecs.length > 0 ? activeSecs : chefCfg.sections;
            setQuestionnaireSections(toUse);
            const allQs = toUse.flatMap((s: any) => s.questions || []);
            setWizardQuestionsList(allQs.length > 0 ? allQs : DEFAULT_SECTIONS.flatMap(s => s.questions));
          }
        }
      } catch (_) {}

    } catch (err) {
      console.warn('Failed to fetch /chef telemetry:', err);
    }
  }, []);

  const applySavedTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    fetchTokenAndAiTelemetry();

    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('zecratary_admin_settings_updated', fetchTokenAndAiTelemetry);
    window.addEventListener('zecratary_engine_config_updated', fetchTokenAndAiTelemetry);
    window.addEventListener('zecratary_chef_ai_settings_updated', fetchTokenAndAiTelemetry);
    window.addEventListener('storage', fetchTokenAndAiTelemetry);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_admin_settings_updated', fetchTokenAndAiTelemetry);
      window.removeEventListener('zecratary_engine_config_updated', fetchTokenAndAiTelemetry);
      window.removeEventListener('zecratary_chef_ai_settings_updated', fetchTokenAndAiTelemetry);
      window.removeEventListener('storage', fetchTokenAndAiTelemetry);
    };
  }, [applySavedTheme, fetchTokenAndAiTelemetry]);

  const loadScopedData = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;

    try {
      const allRecipesRaw = localStorage.getItem('zecratary_recipes') || '[]';
      const adminRecipesRaw = localStorage.getItem('zecratary_admin_recipes') || '[]';
      const savedRecipesRaw = localStorage.getItem('zecratary_saved_recipes') || '[]';

      const combinedCatalog = [...JSON.parse(allRecipesRaw), ...JSON.parse(adminRecipesRaw), ...JSON.parse(savedRecipesRaw)];

      const currentUserId = user?.id;
      const currentUserEmail = user?.email?.toLowerCase().trim();

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

      const otherList: any[] = [];
      const otherSeen = new Set<string>();

      for (const item of combinedCatalog) {
        const itemUserId = item.userId;
        const itemCreatedBy = item.createdBy ? item.createdBy.toLowerCase().trim() : '';
        const isMine = (currentUserId && itemUserId === currentUserId) || (currentUserEmail && itemCreatedBy === currentUserEmail);

        if (!isMine) {
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
        const itemUserId = item.userId;
        const itemCreatedBy = item.createdBy ? item.createdBy.toLowerCase().trim() : '';
        const isMine = (currentUserId && itemUserId === currentUserId) || (currentUserEmail && itemCreatedBy === currentUserEmail);

        if (isMine) {
          const normalized = normalizeRecipe(item);
          const key = normalized.title.toLowerCase().trim();
          if (key && !userSavedMap.has(key)) {
            userSavedMap.set(key, normalized);
          }
        }
      }
      setUserSavedRecipes(Array.from(userSavedMap.values()));

      const rawPantry = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry') || '[]';
      const parsedPantry = JSON.parse(rawPantry);
      if (Array.isArray(parsedPantry) && user) {
        const userPantry = parsedPantry.filter((item: any) => {
          return (currentUserId && item.userId === currentUserId) || (currentUserEmail && item.createdBy === currentUserEmail);
        });
        setPantryIngredientsList(userPantry.map((p: any) => (p.name || '').toLowerCase().trim()).filter(Boolean));
      } else {
        setPantryIngredientsList([]);
      }

    } catch (_) {
      setOtherUsersRecipes([]);
      setUserSavedRecipes([]);
      setPantryIngredientsList([]);
    }
  }, []);

  const loadUserChatState = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;
    const userKey = getUserKey(user);
    try {
      const savedMessages = localStorage.getItem(`zecratary_chef_chat_messages_${userKey}`);
      setMessages(savedMessages ? JSON.parse(savedMessages) : []);
      const savedStep = localStorage.getItem(`zecratary_chef_wizard_step_${userKey}`);
      setWizardStep(savedStep !== null ? JSON.parse(savedStep) : null);
    } catch (_) {
      setMessages([]);
    }
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
      fetchTokenAndAiTelemetry();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_pantry_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
    };
  }, [loadScopedData, loadUserChatState, loadUserPreferences, fetchTokenAndAiTelemetry, t]);

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
        if (updated.length > 0) {
          localStorage.setItem(`zecratary_chef_chat_messages_${userKey}`, JSON.stringify(updated));
        } else {
          localStorage.removeItem(`zecratary_chef_chat_messages_${userKey}`);
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
      if (step !== null) {
        localStorage.setItem(`zecratary_chef_wizard_step_${userKey}`, JSON.stringify(step));
      } else {
        localStorage.removeItem(`zecratary_chef_wizard_step_${userKey}`);
      }
    } catch (_) {}
  };

  const resetChat = () => {
    stopSpeaking();
    setMessages([]);
    setWizardStep(null);
    setWizardAnswers({});
    setActiveTopicTitle('Standard Wizard');
    try {
      if (typeof window === 'undefined') return;
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      localStorage.removeItem(`zecratary_chef_chat_messages_${userKey}`);
      localStorage.removeItem(`zecratary_chef_wizard_step_${userKey}`);
    } catch (_) {}
    showToast("Chat reset.");
  };

  // ------------------------------------------------------------------
  // Dynamic Multi-Topic Questionnaire with Preset Options
  // ------------------------------------------------------------------
  const handleStartTopicWizard = (sec: any) => {
    const qList = Array.isArray(sec.questions) && sec.questions.length > 0
      ? sec.questions
      : ["How many days would you like to plan for (up to 7 days)?"];

    setActiveTopicTitle(sec.topicTitle);
    setWizardQuestionsList(qList);
    setWizardStep(0);
    setWizardAnswers({});

    const initialMsg: ChatMessage = { 
      id: 'ast_' + Date.now(), 
      role: 'assistant', 
      content: `📋 **${sec.topicTitle}**\n${sec.description || 'Intake questionnaire for your customized meal plan.'}\n\n**Question 1 of ${qList.length}:**\n${qList[0]}` 
    };

    updateMessages(prev => [
      ...prev,
      { id: 'usr_' + Date.now(), role: 'user', content: `Start Questionnaire: ${sec.topicTitle}` },
      initialMsg
    ]);

    if (enableVoiceInteraction && voiceAutoPlay) {
      setTimeout(() => speakText(initialMsg.content || '', initialMsg.id), 200);
    }
  };

  const handleStartFullWizard = () => {
    const activeSections = questionnaireSections.filter((s: any) => s.enabled !== false);
    const allQuestions = activeSections.flatMap((s: any) => s.questions || []);
    const qList = allQuestions.length > 0 ? allQuestions : wizardQuestionsList;

    setActiveTopicTitle('Complete Intake Wizard');
    setWizardQuestionsList(qList);
    setWizardStep(0);
    setWizardAnswers({});

    const initialMsg: ChatMessage = { 
      id: 'ast_' + Date.now(), 
      role: 'assistant', 
      content: `Starting complete meal plan intake wizard (**Question 1 of ${qList.length}**):\n\n${qList[0]}` 
    };

    updateMessages(prev => [
      ...prev,
      { id: 'usr_' + Date.now(), role: 'user', content: 'Start Complete Meal Plan Intake Wizard' },
      initialMsg
    ]);

    if (enableVoiceInteraction && voiceAutoPlay) {
      setTimeout(() => speakText(initialMsg.content || '', initialMsg.id), 200);
    }
  };

  const currentPresetOptions = useMemo(() => {
    if (wizardStep === null || !wizardQuestionsList[wizardStep]) return [];
    const q = wizardQuestionsList[wizardStep].toLowerCase();

    if (q.includes('day') || q.includes('how many')) {
      const days = [];
      if (maxPlanDays >= 3) days.push('3 Days');
      if (maxPlanDays >= 5) days.push('5 Days');
      days.push(`${maxPlanDays} Days`);
      return Array.from(new Set(days));
    }
    if (q.includes('meal type') || q.includes('types')) {
      return ['Dinner only', 'Lunch & Dinner', 'All Meals (Breakfast, Lunch, Dinner)'];
    }
    if (q.includes('start') || q.includes('date') || q.includes('when')) {
      return ['Start Today', 'Start Tomorrow', 'Next Monday'];
    }
    if (q.includes('theme') || q.includes('preference')) {
      return ['High-Protein Wholesome', 'Keto / Low-Carb', 'Quick & Easy (Under 25 mins)', 'Mediterranean Fresh', 'Comfort Food'];
    }
    if (q.includes('budget')) {
      return ['Under $5 per serving', '$5 - $8 per serving', '$10 - $15 per serving', 'Flexible target'];
    }

    return ['Yes, strictly apply', 'Standard recommended', 'Prioritize in-stock pantry items'];
  }, [wizardStep, wizardQuestionsList, maxPlanDays]);

  // ------------------------------------------------------------------
  // Chat Execution with LLM & Final Recommended Recipe Generation
  // ------------------------------------------------------------------
  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : prompt).trim();
    if (!textToSend || loading) return;

    if (strictDietEnforcement && filterWordsList.length > 0) {
      const lower = textToSend.toLowerCase();
      const matchedFilter = filterWordsList.find(word => {
        const clean = word.trim().toLowerCase();
        return clean.length > 1 && lower.includes(clean);
      });
      if (matchedFilter) {
        showToast(`⚠️ Dietary restriction: "${matchedFilter}" is prohibited by AI Settings.`);
        return;
      }
    }

    if (tokenBalance < chefCost) {
      showToast(`Insufficient ${tokenName}. Required: ${chefCost} ${tokenSymbol}, Balance: ${tokenBalance} ${tokenSymbol}`);
      setIsTokenPurchaseOpen(true);
      return;
    }

    const userMsg: ChatMessage = { id: 'usr_' + Date.now(), role: 'user', content: textToSend };
    updateMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    const lower = textToSend.toLowerCase();

    if (wizardStep !== null) {
      const currentIdx = wizardStep;
      const updatedAnswers = { ...wizardAnswers, [currentIdx]: textToSend };
      setWizardAnswers(updatedAnswers);

      const nextIdx = currentIdx + 1;
      if (nextIdx < wizardQuestionsList.length) {
        updateWizardStep(nextIdx);
        setTimeout(() => {
          const nextQuestionMsg: ChatMessage = {
            id: 'ast_' + Date.now(),
            role: 'assistant',
            content: `**Question ${nextIdx + 1} of ${wizardQuestionsList.length}:**\n${wizardQuestionsList[nextIdx]}`
          };
          updateMessages(prev => [...prev, nextQuestionMsg]);
          setLoading(false);
          if (enableVoiceInteraction && voiceAutoPlay) {
            speakText(nextQuestionMsg.content || '', nextQuestionMsg.id);
          }
        }, 300);
        return;
      } else {
        updateWizardStep(null);
        try {
          const activeAuth = currentUserRef.current || currentUser || getCurrentUser();
          const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isQuestionnaireComplete: true,
              topicTitle: activeTopicTitle,
              questionnaireAnswers: updatedAnswers,
              userId: activeAuth?.id,
              userEmail: activeAuth?.email,
              preferences: { servings, country, diet: selectedDiets, allergy: selectedAllergies, avoid: ingredientsToAvoid, tastes: tastesList },
              pantry: enablePantryContext ? pantryIngredientsList : []
            })
          });

          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to synthesize questionnaire results.');

          if (typeof data.remainingBalance === 'number') setTokenBalance(data.remainingBalance);
          else setTokenBalance(prev => Math.max(0, prev - (data.consumedSystemTokens || chefCost)));

          const planMsg: ChatMessage = {
            id: 'ast_plan_' + Date.now(),
            role: 'assistant',
            content: data.reply || `I have formulated your meal plan and signature recommended recipe based on your ${activeTopicTitle} questionnaire!`,
            plan: data.plan,
            recommendedRecipe: data.recommendedRecipe || data.recipe
          };

          updateMessages(prev => [...prev, planMsg]);
          if (enableVoiceInteraction && voiceAutoPlay) {
            speakText(planMsg.content || '', planMsg.id);
          }
        } catch (err: any) {
          updateMessages(prev => [...prev, { id: 'ast_' + Date.now(), role: 'assistant', content: `⚠️ ${err.message}` }]);
        } finally {
          setLoading(false);
          setActiveTopicTitle('Standard Wizard');
        }
        return;
      }
    }

    try {
      const activeAuth = currentUserRef.current || currentUser || getCurrentUser();
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          userId: activeAuth?.id,
          userEmail: activeAuth?.email,
          source: 'chef',
          preferences: { servings, country, diet: selectedDiets, allergy: selectedAllergies, avoid: ingredientsToAvoid, tastes: tastesList },
          pantry: enablePantryContext ? pantryIngredientsList : []
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) setIsTokenPurchaseOpen(true);
        throw new Error(data.error || 'Chef Foodie could not process your query.');
      }

      if (typeof data.remainingBalance === 'number') setTokenBalance(data.remainingBalance);
      else setTokenBalance(prev => Math.max(0, prev - (data.consumedSystemTokens || chefCost)));

      const astMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        role: 'assistant',
        content: data.reply || data.response || "Here are personalized culinary recommendations based on your preferences.",
        recommendedRecipe: data.recommendedRecipe || data.recipe
      };

      updateMessages(prev => [...prev, astMsg]);
      if (enableVoiceInteraction && voiceAutoPlay) {
        speakText(astMsg.content || '', astMsg.id);
      }
    } catch (err: any) {
      updateMessages(prev => [...prev, { id: 'ast_' + Date.now(), role: 'assistant', content: `⚠️ ${err.message || 'Error communicating with AI engine.'}` }]);
    } finally {
      setLoading(false);
    }
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
        servings: recipe.servings || servings,
        recipeType: recipe.mealType || 'Main Dish',
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

  const handleAddRecipeIngredientsToGrocery = (recipe: any) => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const rawGrocery = localStorage.getItem('zecratary_grocery_list') || '[]';
      const groceryItems = JSON.parse(rawGrocery);
      const items = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

      const newEntries = items.map((item: string) => ({
        id: 'groc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: active?.id,
        name: item,
        item,
        checked: false,
        category: 'Chef Recommended Ingredients',
        fromPlan: recipe.title
      }));

      const updated = [...groceryItems, ...newEntries];
      localStorage.setItem('zecratary_grocery_list', JSON.stringify(updated));
      localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
      window.dispatchEvent(new Event('zecratary_grocery_updated'));
      showToast(`Added ${newEntries.length} ingredients to your Grocery List!`);
    } catch (_) {
      showToast("Could not add to grocery list.");
    }
  };

  const activeQuestionnaireSections = useMemo(() => {
    return questionnaireSections.filter((s: any) => s.enabled !== false);
  }, [questionnaireSections]);

  return (
    <div 
      className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-5.5rem)] justify-between space-y-3 pb-2 font-sans relative transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      <AiQuotaBar />

      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-text)'
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER WITH TELEMETRY, VOICE INDICATOR & DIETARY PREFERENCES */}
      <div 
        className="space-y-3 border-b pb-3 shrink-0 transition-colors duration-200"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                {t('foodieChatHeading', 'Foodie Chat')}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('foodieChatSubtitle', 'Ask recipes, cooking questions, or launch multi-topic meal plan wizards')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold animate-pulse shadow-sm"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)'
                }}
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Speaking...</span>
                <button 
                  type="button" 
                  onClick={stopSpeaking}
                  className="hover:underline text-[10px] ml-1 font-extrabold cursor-pointer"
                >
                  [Stop]
                </button>
              </div>
            )}

            {enableVoiceInteraction && (
              <div 
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-emerald)'
                }}
                title={`Voice Mode Active (${selectedVoiceName} • ${voiceSpeed}x)`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] truncate max-w-[90px]">{selectedVoiceName.split('-')[0] || 'Voice'}</span>
              </div>
            )}

            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Active Model configured in /admin/ai-settings"
            >
              <Cpu className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              <span className="font-mono">{activeAiModel}</span>
            </div>

            {strictDietEnforcement && (
              <div 
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                title={`Strict dietary filters active with ${filterWordsList.length} avoided terms.`}
              >
                <ShieldAlert className="h-3 w-3" />
                <span>Strict Filters</span>
              </div>
            )}

            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <div className="text-xs font-mono font-black" style={{ color: 'var(--color-text)' }}>
                {tokenBalance} <span className="text-amber-500">{tokenSymbol}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTokenPurchaseOpen(true)}
                className="ml-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg text-white transition hover:opacity-90 cursor-pointer shadow-xs"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Top Up
              </button>
            </div>

            {/* PREFERENCES SLIDERS BUTTON */}
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="p-2 rounded-xl border transition cursor-pointer shadow-sm hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title={t('preferencesTooltip', 'Recipe Preferences')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={resetChat}
              className="p-2 rounded-xl border transition cursor-pointer shadow-sm hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title="New Chat"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RESTORED: USER DIETARY PREFERENCES PILLS HEADER */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1 animate-in fade-in">
          <span 
            className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-emerald)',
              color: 'var(--color-emerald)'
            }}
          >
            {t('servingsLabelPref', 'Servings:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{(t('peopleSuffix', '{count} people')).replace('{count}', String(servings))}</strong>
          </span>

          <span 
            className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-emerald)',
              color: 'var(--color-emerald)'
            }}
          >
            {t('countryLabelPref', 'Country:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{country}</strong>
          </span>

          {selectedDiets.map((d) => (
            <span 
              key={`diet-${d}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-emerald)',
                color: 'var(--color-emerald)'
              }}
            >
              {t('dietLabelPref', 'Diet:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{d}</strong>
            </span>
          ))}

          {selectedAllergies.map((a) => (
            <span 
              key={`allergy-${a}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
            >
              {t('allergyLabelPref', 'Allergy:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{a}</strong>
            </span>
          ))}

          {ingredientsToAvoid.map((av) => (
            <span 
              key={`avoid-${av}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
            >
              {t('avoidLabelPref', 'Avoid:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{av}</strong>
            </span>
          ))}

          {tastesList.map((itemTaste) => (
            <span 
              key={`taste-${itemTaste}`}
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
            >
              {t('tasteLabelPref', 'Taste:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{itemTaste}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* MAIN CONVERSATION STREAM */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center my-auto py-10 space-y-6">
            <div 
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border shadow-lg"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
                {t('heyImChef', "Hey, I'm Chef Foodie!")}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Select a questionnaire topic below or speak into the microphone to plan meals
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 max-w-xl mx-auto">
              <button
                type="button"
                onClick={handleStartFullWizard}
                className="border text-xs font-bold px-5 py-3 rounded-2xl transition shadow-md hover:scale-[1.02] cursor-pointer flex items-center gap-2 text-white"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)'
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
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <Layers className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  <span>{sec.topicTitle}</span>
                  <span className="text-[10px] opacity-75 font-mono">({(sec.questions || []).length} questions)</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            const hasAudioActive = isSpeaking && speakingMsgId === m.id;

            return (
              <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div 
                    className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <ChefHat className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-xl sm:max-w-2xl space-y-3.5 ${isUser ? '' : 'w-full'}`}>
                  {m.content && (
                    <div 
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${isUser ? 'ml-auto max-w-md shadow-md font-medium text-white' : 'border shadow-xs'}`}
                      style={isUser ? {
                        backgroundColor: 'var(--color-primary)'
                      } : {
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <p className="whitespace-pre-line flex-1">{m.content}</p>
                        {!isUser && enableVoiceInteraction && (
                          <button
                            type="button"
                            onClick={() => speakText(m.content || '', m.id)}
                            className="p-1 rounded-lg transition shrink-0 cursor-pointer hover:opacity-80"
                            style={{ color: hasAudioActive ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                            title={hasAudioActive ? "Stop speech" : "Read aloud"}
                          >
                            {hasAudioActive ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FINAL RECOMMENDED RECIPE SHOWCASE CARD */}
                  {m.recommendedRecipe && (
                    <div 
                      className="border rounded-3xl p-5 space-y-4 shadow-md transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-primary)'
                      }}
                    >
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--color-primary)' }}>
                              Final Recommended Recipe
                            </span>
                            <h3 className="font-extrabold text-base" style={{ color: 'var(--color-text)' }}>
                              {m.recommendedRecipe.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {enableVoiceInteraction && (
                            <button
                              type="button"
                              onClick={() => speakText(`${m.recommendedRecipe.title}. ${m.recommendedRecipe.description}. Instructions: ${m.recommendedRecipe.instructions.join('. ')}`, `rec_${m.id}`)}
                              className="p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs hover:opacity-80"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: isSpeaking && speakingMsgId === `rec_${m.id}` ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                              }}
                              title="Listen to recipe instructions"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveRecipeToBook(m.recommendedRecipe)}
                            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-80"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-emerald)',
                              color: 'var(--color-emerald)'
                            }}
                          >
                            <Bookmark className="h-3.5 w-3.5" /> Save Recipe
                          </button>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {m.recommendedRecipe.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} /> Prep: {m.recommendedRecipe.prepMinutes || 15}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> Cook: {m.recommendedRecipe.cookMinutes || 20}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Serves: {m.recommendedRecipe.servings || servings}
                        </span>
                        {m.recommendedRecipe.calories && (
                          <span className="font-mono text-emerald-500 font-bold">
                            {m.recommendedRecipe.calories} kcal
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="space-y-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--color-primary)' }}>
                            <span>Ingredients ({m.recommendedRecipe.ingredients?.length || 0})</span>
                            <button
                              type="button"
                              onClick={() => handleAddRecipeIngredientsToGrocery(m.recommendedRecipe)}
                              className="text-[10px] font-extrabold flex items-center gap-1 text-emerald-500 hover:underline cursor-pointer"
                            >
                              <ShoppingCart className="h-3 w-3" /> + Add to Cart
                            </button>
                          </h4>
                          <ul className="space-y-1 text-xs">
                            {(m.recommendedRecipe.ingredients || []).map((ing: string, i: number) => {
                              const inPantry = pantryIngredientsList.some(p => ing.toLowerCase().includes(p) || p.includes(ing.toLowerCase()));
                              return (
                                <li key={i} className="flex items-center justify-between p-1.5 rounded-lg border text-[11px]" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                                  <span style={{ color: 'var(--color-text)' }}>• {ing}</span>
                                  {inPantry && (
                                    <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                      Pantry ✓
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                            Step-by-Step Directions
                          </h4>
                          <ol className="space-y-1.5 text-xs">
                            {(m.recommendedRecipe.instructions || []).map((step: string, sIdx: number) => (
                              <li key={sIdx} className="flex items-start gap-2 text-[11px] leading-snug">
                                <span className="font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 border mt-0.5" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                                  {sIdx + 1}
                                </span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      {m.recommendedRecipe.chefTip && (
                        <div 
                          className="p-3 rounded-2xl border flex items-start gap-2.5 text-xs"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <Zap className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                          <div className="space-y-0.5">
                            <strong className="block text-[11px]" style={{ color: 'var(--color-primary)' }}>Chef Foodie Pro Tip:</strong>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                              {m.recommendedRecipe.chefTip}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MULTI-DAY PLAN PRESENTATION */}
                  {m.plan && (
                    <div 
                      className="border rounded-3xl p-5 space-y-4 shadow-sm transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                          <h3 className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                            {m.plan.title} ({m.plan.totalDays} Days • {resultDisplayMode.toUpperCase()} VIEW)
                          </h3>
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                          Budget: {m.plan.budgetPerServing || '$4.00'}/serv
                        </span>
                      </div>

                      {resultDisplayMode === 'compact' ? (
                        <div className="space-y-2">
                          {m.plan.meals.map((meal) => (
                            <div 
                              key={meal.id} 
                              className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold shrink-0" style={{ color: 'var(--color-primary)' }}>{meal.dayLabel}:</span>
                                <span className="truncate font-medium" style={{ color: 'var(--color-text)' }}>{meal.title}</span>
                              </div>
                              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{meal.prepMinutes + meal.cookMinutes}m</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {m.plan.meals.map((meal) => (
                            <div 
                              key={meal.id}
                              className="border rounded-2xl p-3.5 space-y-2"
                              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                            >
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span style={{ color: 'var(--color-primary)' }}>{meal.dayLabel} ({meal.dateStr})</span>
                                <span className="uppercase text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{meal.mealType}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <img src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'} alt={meal.title} className="w-14 h-14 rounded-xl object-cover border shrink-0" style={{ borderColor: 'var(--color-border)' }} />
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <h4 className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{meal.title}</h4>
                                  <p className="text-[11px] line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{meal.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {isUser && (
                  <div 
                    className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
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
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-primary)' }} /> 
            {t('chefThinking', 'Chef Foodie is formulating your recipes...')}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* PRESET QUESTIONS (ACTIVE DURING QUESTIONNAIRE) */}
      {wizardStep !== null && currentPresetOptions.length > 0 && (
        <div 
          className="p-3 rounded-2xl border space-y-2 animate-in fade-in transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
              <Sparkles className="h-3.5 w-3.5" /> Preset Answers (Step {wizardStep + 1} of {wizardQuestionsList.length}):
            </span>
            <button
              type="button"
              onClick={() => { updateWizardStep(null); showToast("Exited wizard"); }}
              className="text-[10px] hover:underline cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cancel Wizard
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {currentPresetOptions.map((opt, oIdx) => (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleSend(opt)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition shadow-xs cursor-pointer hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOPIC LAUNCHER CHIPS */}
      {wizardStep === null && activeQuestionnaireSections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 custom-scrollbar shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <Sparkles className="h-3 w-3" style={{ color: 'var(--color-primary)' }} /> Questionnaires:
          </span>
          {activeQuestionnaireSections.map((sec) => (
            <button
              key={`chip-${sec.id}`}
              type="button"
              onClick={() => handleStartTopicWizard(sec)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <Layers className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              <span>{sec.topicTitle}</span>
            </button>
          ))}
        </div>
      )}

      {/* PROMPT INPUT BAR */}
      <div 
        className="border rounded-2xl p-1.5 flex items-center gap-2 shrink-0 shadow-xl transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {enableVoiceInteraction && (
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${isListening ? 'animate-pulse' : 'hover:opacity-80'}`}
            style={{
              backgroundColor: isListening ? 'var(--color-primary)' : 'var(--color-inner-dark)',
              borderColor: isListening ? 'var(--color-primary)' : 'var(--color-border)',
              color: isListening ? '#ffffff' : 'var(--color-text-secondary)'
            }}
            title={isListening ? "Listening... click to stop" : "Speak your message via microphone"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? "Listening to your voice..." : `${t('askPromptPlaceholder', 'Ask recipes, cooking tips, or meal plan requests...')} (${chefCost} ${tokenSymbol})`}
          className="bg-transparent border-none text-sm px-2 flex-1 outline-none font-normal"
          style={{ color: 'var(--color-text)' }}
        />
        
        <div className="flex items-center gap-1.5 pr-1">
          <span 
            className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg border hidden sm:inline-block"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
            title={`Each prompt costs ${chefCost} ${tokenName}`}
          >
            {chefCost} {tokenSymbol}
          </span>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !prompt.trim()}
            className="disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
            title={`Send message (${chefCost} ${tokenSymbol})`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* RESTORED: RECIPE PREFERENCES MODAL */}
      {showPreferences && (
        <div 
          onClick={() => setShowPreferences(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-5 cursor-default animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 
                  className="text-xl font-black tracking-tight"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('recipePreferencesTitle', 'Recipe Preferences')}
                </h2>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('recipePreferencesSub', 'Personalise your cooking experience')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="p-2 rounded-xl border transition cursor-pointer shadow-sm hover:opacity-80"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
              {/* Servings */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('servingsTitle', 'Servings')}
                </label>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-sm hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    -
                  </button>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                    {(t('peopleSuffix', '{count} people')).replace('{count}', String(servings))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings(servings + 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-sm hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('countryTitle', 'Country')}
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer appearance-none shadow-sm font-medium"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: 'var(--color-primary)' }} />
                </div>
              </div>

              {/* Dietary Preferences */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('dietaryPreferencesTitle', 'Dietary Preferences')}
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
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('allergiesTitle', 'Allergies')}
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
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ingredients to Avoid */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('ingredientsToAvoidTitle', 'Ingredients to Avoid')}
                </label>
                <form onSubmit={handleAddAvoid} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('typeIngredientPlaceholder', 'Type an ingredient...')}
                    value={newAvoidInput}
                    onChange={(e) => setNewAvoidInput(e.target.value)}
                    className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 text-white rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-md hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div 
                  className="p-3 rounded-2xl border min-h-[50px] flex flex-wrap gap-2 items-center"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {ingredientsToAvoid.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('noIngredientsAvoid', 'No ingredients added to avoid list')}
                    </span>
                  ) : (
                    ingredientsToAvoid.map((item) => (
                      <span 
                        key={item}
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-emerald)',
                          color: 'var(--color-emerald)'
                        }}
                      >
                        {item}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAvoid(item)} 
                          className="hover:opacity-80 cursor-pointer ml-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Tastes */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('tastesTitle', 'Tastes')}
                </label>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tastesDesc', "Anything else about how you like to eat. We'll factor these into your recipes.")}
                </p>

                <form onSubmit={handleAddTaste} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('tastesPlaceholder', 'e.g. prefers larger portions, loves umami...')}
                    value={newTasteInput}
                    onChange={(e) => setNewTasteInput(e.target.value)}
                    className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 text-white rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-md hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div 
                  className="p-3 rounded-2xl border min-h-[50px] flex flex-wrap gap-2 items-center"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {tastesList.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('noTastesSpecified', 'No taste preferences specified')}
                    </span>
                  ) : (
                    tastesList.map((item) => (
                      <span 
                        key={item}
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-emerald)',
                          color: 'var(--color-emerald)'
                        }}
                      >
                        {item}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTaste(item)} 
                          className="hover:opacity-80 cursor-pointer ml-0.5"
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
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="px-5 py-2.5 border rounded-xl font-bold text-xs transition cursor-pointer shadow-sm hover:opacity-80"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('cancel', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleClearAllPreferences}
                className="px-4 py-2.5 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('clearAllBtn', 'Clear All')}
              </button>

              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-6 py-2.5 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('saveBtn', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOKEN PURCHASE MODAL */}
      <TokenPurchaseModal
        isOpen={isTokenPurchaseOpen}
        onClose={() => setIsTokenPurchaseOpen(false)}
        userId={currentUserRef.current?.id || currentUser?.id}
        userEmail={currentUserRef.current?.email || currentUser?.email}
        tokenSymbol={tokenSymbol}
        packages={tokenPackages}
        onPurchased={(newBal) => {
          setTokenBalance(newBal);
          showToast(`Tokens added! New balance: ${newBal} ${tokenSymbol}`);
        }}
      />
    </div>
  );
}
