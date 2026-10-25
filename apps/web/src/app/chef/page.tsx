import DynamicTokenIcon from '@/components/DynamicTokenIcon';
// @ts-nocheck
'use client';
import AiQuotaBar from '@/components/AiQuotaBar';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ChefHat, Send, SlidersHorizontal, Edit3, Clock, Flame, Users, RefreshCw, 
  Calendar, CalendarPlus, X, Utensils, Loader2, User as UserIcon, 
  Check, Sparkles, Bookmark, RotateCcw, Package, Plus, Trash2, ChevronDown, 
  Coins, Cpu, ShieldAlert, Mic, MicOff, Volume2, Square, Award, ExternalLink,
  Layers, CheckCircle2, CheckCircle, Zap, Globe, Table, LayoutGrid
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';

interface MealItem {
  id: string;
  dayIndex: number;
  dayLabel: string;
  dateStr?: string;
  mealType: string;
  title: string;
  description?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  calories?: number;
  isBatchCook?: boolean;
  isLeftover?: boolean;
  leftoverFrom?: string;
  ingredients?: string[];
}

interface MealPlanData {
  title?: string;
  totalDays: number;
  theme?: string;
  budgetPerServing?: string;
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
  sourceUrl?: string;
  sourceName?: string;
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
  'Canada', 'Malaysia', 'Japan', 'Germany', 'France', 'India', 'Thailand'
];

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
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserRef = useRef<User | null>(null);

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings telemetry synced from /admin/ai-settings (PostgreSQL backed)
  const [questionnaireSections, setQuestionnaireSections] = useState<any[]>(DEFAULT_SECTIONS);
  const [activeTopicTitle, setActiveTopicTitle] = useState<string>('Standard Wizard');
  const [wizardQuestionsList, setWizardQuestionsList] = useState<string[]>([]);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'compact' | 'detailed'>('card');
  const [activeAiModel, setActiveAiModel] = useState<string>('gemini-2.5-flash');
  const [strictDietEnforcement, setStrictDietEnforcement] = useState<boolean>(false);
  const [filterWordsList, setFilterWordsList] = useState<string[]>([]);
  const [enablePantryContext, setEnablePantryContext] = useState<boolean>(true);
  const [maxPlanDays, setMaxPlanDays] = useState<number>(7);
  const [recommendedRecipeUrls, setRecommendedRecipeUrls] = useState<string[]>([]);

  // Real-Time In-Stock Pantry Items (Loaded dynamically from /api/pantry)
  const [pantryIngredientsList, setPantryIngredientsList] = useState<string[]>([]);

  // Voice Interaction State
  const [enableVoiceInteraction, setEnableVoiceInteraction] = useState<boolean>(true);
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
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
    const clean = (textToSpeak || '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*_~`]/g, '')
      .replace(/•|\*|-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = Math.max(0.7, Math.min(1.8, voiceSpeed || 1.0));

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
      showToast(t('speechNotSupported', 'Speech recognition is not supported in this browser.'));
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

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) setPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  const getUserKey = useCallback((user: User | null) => {
    if (!user) return 'usr_admin_1';
    return user.id || (user.email ? user.email.toLowerCase().trim() : 'usr_admin_1');
  }, []);

  // 1. Load Pantry Inventory from PostgreSQL / MySQL via /api/pantry
  const loadPantryItems = useCallback(async (user: User | null) => {
    try {
      const userKey = getUserKey(user);
      const res = await fetch(`/api/pantry?userId=${encodeURIComponent(userKey)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.items || data?.pantry || []);
        if (Array.isArray(items)) {
          const names = items
            .filter((it: any) => it && (it.quantity > 0 || it.in_stock !== false))
            .map((it: any) => String(it.name || it.item || it.title || '').trim())
            .filter(Boolean);
          setPantryIngredientsList(Array.from(new Set(names)));
        }
      }
    } catch (_) {}
  }, [getUserKey]);

  // 2. Load User Preferences from PostgreSQL
  const loadUserPreferences = useCallback(async (user: User | null) => {
    const userKey = getUserKey(user);

    try {
      const res = await fetch(`/api/user/preferences?userId=${encodeURIComponent(userKey)}`, { cache: 'no-store' });
      if (res.ok) {
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
      }
    } catch (_) {}

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
    setSelectedDiets(prev => prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item]);
  };

  const handleToggleAllergy = (item: string) => {
    setSelectedAllergies(prev => prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]);
  };

  const handleAddAvoid = () => {
    const clean = newAvoidInput.trim();
    if (!clean) return;
    if (!ingredientsToAvoid.includes(clean)) {
      setIngredientsToAvoid(prev => [...prev, clean]);
    }
    setNewAvoidInput('');
  };

  const handleRemoveAvoid = (item: string) => {
    setIngredientsToAvoid(prev => prev.filter(a => a !== item));
  };

  const handleAddTaste = () => {
    const clean = newTasteInput.trim();
    if (!clean) return;
    if (!tastesList.includes(clean)) {
      setTastesList(prev => [...prev, clean]);
    }
    setNewTasteInput('');
  };

  const handleRemoveTaste = (item: string) => {
    setTastesList(prev => prev.filter(t => t !== item));
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

    if (typeof window !== 'undefined') {
      localStorage.setItem(`zecratary_recipe_preferences_${userKey}`, JSON.stringify(prefs));
      localStorage.setItem('zecratary_recipe_preferences', JSON.stringify(prefs));
    }

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userKey, ...prefs })
      });
    } catch (_) {}

    setShowPreferences(false);
    showToast(t('prefsSavedToast', 'Preferences saved and synchronized!'));
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
        body: JSON.stringify({ userId: userKey, servings: 2, country: 'Singapore', diets: [], allergies: [], avoid: [], tastes: [] })
      });
    } catch (_) {}

    showToast(t('prefsClearedToast', 'Preferences cleared!'));
  };

  // 3. Load Telemetry, AI Model, and Token Costs
  const fetchTokenAndAiTelemetry = useCallback(async () => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const queryParam = active?.id ? `?userId=${active.id}` : '?userId=usr_admin_1';
      
      const res = await fetch(`/api/tokens${queryParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTokenBalance(Number(data.balance ?? 0));
          setTokenSymbol(data.tokenSymbol || '🪙');
          setTokenName(data.tokenName || 'Foodie Token');
          setChefCost(Number(data.costs?.chef ?? 1));
          if (Array.isArray(data.packages)) setTokenPackages(data.packages);
        }
      }

      try {
        const sRes = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (sRes.ok) {
          const sData = await sRes.json();
          const chefCfg = sData?.chefAiSettings || sData?.settings?.chefAiSettings || sData;
          if (chefCfg) {
            if (chefCfg.model || sData.aiModel) setActiveAiModel(chefCfg.model || sData.aiModel);
            if (chefCfg.strictDietEnforcement !== undefined) setStrictDietEnforcement(Boolean(chefCfg.strictDietEnforcement));
            if (Array.isArray(chefCfg.filterWordsList)) setFilterWordsList(chefCfg.filterWordsList.filter(Boolean));
            if (chefCfg.enablePantryContext !== undefined) setEnablePantryContext(Boolean(chefCfg.enablePantryContext));
            if (chefCfg.maxPlanDays !== undefined) setMaxPlanDays(Number(chefCfg.maxPlanDays) || 7);
            if (chefCfg.resultDisplayMode) setResultDisplayMode(chefCfg.resultDisplayMode);
            if (chefCfg.enableVoiceInteraction !== undefined) setEnableVoiceInteraction(Boolean(chefCfg.enableVoiceInteraction));
            if (chefCfg.voiceSpeed !== undefined) setVoiceSpeed(Number(chefCfg.voiceSpeed));
            if (chefCfg.voiceAutoPlay !== undefined) setVoiceAutoPlay(Boolean(chefCfg.voiceAutoPlay));
            if (chefCfg.selectedVoiceName) setSelectedVoiceName(chefCfg.selectedVoiceName);
            if (Array.isArray(chefCfg.recommendedRecipeUrls)) setRecommendedRecipeUrls(chefCfg.recommendedRecipeUrls.filter(Boolean));

            if (Array.isArray(chefCfg.sections) && chefCfg.sections.length > 0) {
              const activeSecs = chefCfg.sections.filter((s: any) => s.enabled !== false);
              const toUse = activeSecs.length > 0 ? activeSecs : chefCfg.sections;
              setQuestionnaireSections(toUse);
              const allQs = toUse.flatMap((s: any) => s.questions || []);
              setWizardQuestionsList(allQs.length > 0 ? allQs : DEFAULT_SECTIONS.flatMap(s => s.questions));
            }
          }
        }
      } catch (_) {}

    } catch (err) {
      console.warn('Failed to fetch /chef telemetry:', err);
    }
  }, []);

  useEffect(() => {
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    currentUserRef.current = user;

    loadUserPreferences(user);
    loadPantryItems(user);
    fetchTokenAndAiTelemetry();

    const handleSync = () => {
      const active = getCurrentUser();
      setCurrentUser(active);
      currentUserRef.current = active;
      loadUserPreferences(active);
      loadPantryItems(active);
      fetchTokenAndAiTelemetry();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);
    window.addEventListener('zecratary_tokens_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);
    window.addEventListener('zecratary_pantry_updated', handleSync);
    window.addEventListener('zecratary_chef_ai_settings_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
      window.removeEventListener('zecratary_tokens_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_chef_ai_settings_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
    };
  }, [loadUserPreferences, loadPantryItems, fetchTokenAndAiTelemetry]);

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
    showToast(t('chatResetToast', 'Started new chef conversation'));
  };

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
      { id: 'usr_' + Date.now(), role: 'user', content: `${t('startCompleteIntake', 'Start Questionnaire')}: ${sec.topicTitle}` },
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
      { id: 'usr_' + Date.now(), role: 'user', content: t('startCompleteIntake', 'Start Complete Meal Plan Intake') },
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

  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : prompt).trim();
    if (!textToSend || loading) return;

    if (tokenBalance < chefCost) {
      showToast((t('insufficientTokens', 'Insufficient {tokenName}. Required: {cost} {symbol}'))
        .replace('{tokenName}', tokenName)
        .replace('{cost}', String(chefCost))
        .replace('{symbol}', tokenSymbol));
      setIsTokenPurchaseOpen(true);
      return;
    }

    const userMsg: ChatMessage = { id: 'usr_' + Date.now(), role: 'user', content: textToSend };
    updateMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

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
              prompt: `Synthesize a comprehensive ${activeTopicTitle} meal plan and signature recommended recipe based on the completed questionnaire.`,
              isQuestionnaireComplete: true,
              topicTitle: activeTopicTitle,
              questionnaireAnswers: updatedAnswers,
              userId: activeAuth?.id || 'usr_admin_1',
              userEmail: activeAuth?.email || 'admin@zecratary.com',
              preferences: { servings, country, diet: selectedDiets, allergy: selectedAllergies, avoid: ingredientsToAvoid, tastes: tastesList },
              pantry: enablePantryContext ? pantryIngredientsList : [],
              recommendedRecipeUrls
            })
          });

          const data = await res.json();
          if (typeof data.remainingBalance === 'number') setTokenBalance(data.remainingBalance);
          else setTokenBalance(prev => Math.max(0, prev - chefCost));

          const planMsg: ChatMessage = {
            id: 'ast_plan_' + Date.now(),
            role: 'assistant',
            content: data.reply || `I have formulated your meal plan and signature recommended recipe based on your ${activeTopicTitle} questionnaire!`,
            plan: data.plan,
            recommendedRecipe: data.recommendedRecipe || data.recipe
          };

          updateMessages(prev => [...prev, planMsg]);
          if (enableVoiceInteraction && voiceAutoPlay) speakText(planMsg.content || '', planMsg.id);
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
          userId: activeAuth?.id || 'usr_admin_1',
          userEmail: activeAuth?.email || 'admin@zecratary.com',
          source: 'chef',
          preferences: { servings, country, diet: selectedDiets, allergy: selectedAllergies, avoid: ingredientsToAvoid, tastes: tastesList },
          pantry: enablePantryContext ? pantryIngredientsList : [],
          recommendedRecipeUrls
        })
      });

      const data = await res.json();
      if (typeof data.remainingBalance === 'number') setTokenBalance(data.remainingBalance);
      else setTokenBalance(prev => Math.max(0, prev - chefCost));

      const astMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        role: 'assistant',
        content: data.reply || data.response || "Here are personalized culinary recommendations based on your preferences.",
        plan: data.plan,
        recommendedRecipe: data.recommendedRecipe || data.recipe
      };

      updateMessages(prev => [...prev, astMsg]);
      if (enableVoiceInteraction && voiceAutoPlay) speakText(astMsg.content || '', astMsg.id);
    } catch (err: any) {
      updateMessages(prev => [...prev, { id: 'ast_' + Date.now(), role: 'assistant', content: `⚠️ ${err.message || t('errorCommunicatingAi', 'Error communicating with AI culinary engine.')}` }]);
    } finally {
      setLoading(false);
    }
  };

  // 4. Save Recipe to PostgreSQL Database and Local Cache
  const handleSaveRecipeToBook = async (recipe: any) => {
    try {
      const recId = 'saved_ai_' + Date.now();
      const activeAuth = currentUserRef.current || currentUser || getCurrentUser();
      const newRec = {
        id: recId,
        userId: activeAuth?.id || 'usr_admin_1',
        title: recipe.title,
        name: recipe.title,
        description: recipe.description,
        prepTimeMinutes: recipe.prepMinutes || 15,
        cookTimeMinutes: recipe.cookMinutes || 20,
        servings: recipe.servings || servings,
        recipeType: recipe.mealType || 'Main Dish',
        isFavorite: true,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || []
      };

      try {
        await fetch('/api/saved-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRec)
        });
      } catch (_) {}

      const raw = localStorage.getItem('zecratary_saved_recipes') || '[]';
      const existing = JSON.parse(raw);
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify([newRec, ...existing]));
      setSavedRecipeIds(prev => [...prev, recId]);

      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      showToast(t('savedToRecipesToast', 'Saved to your recipe library!'));
    } catch (_) {
      showToast("Could not save recipe.");
    }
  };

  // 5. Add Generated Meal Plan to Weekly Planner
  const handleScheduleMealPlan = async (plan: MealPlanData) => {
    try {
      const activeAuth = currentUserRef.current || currentUser || getCurrentUser();
      const mealsToSchedule = (plan.meals || []).map((m, idx) => ({
        id: 'plan_meal_' + Date.now() + '_' + idx,
        userId: activeAuth?.id || 'usr_admin_1',
        title: m.title,
        mealType: m.mealType || 'Dinner',
        dayLabel: m.dayLabel || `Day ${idx + 1}`,
        prepMinutes: m.prepMinutes || 15,
        cookMinutes: m.cookMinutes || 20,
        servings: m.servings || servings,
        date: m.dateStr || new Date(Date.now() + idx * 86400000).toISOString().split('T')[0]
      }));

      try {
        await fetch('/api/planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import_plan', meals: mealsToSchedule })
        });
      } catch (_) {}

      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('mealPlanAddedToast', 'Meal plan added to weekly planner!'));
    } catch (_) {
      showToast("Could not schedule meal plan.");
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

      {/* TOP HEADER */}
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
                {t('foodieChatHeading', 'AI Chef Assistant')}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('foodieChatSubtitle', 'Ask recipes, cooking questions, or launch multi-topic meal plan wizards')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold animate-pulse shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)'
                }}
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>{t('speaking', 'Speaking...')}</span>
                <button 
                  type="button" 
                  onClick={stopSpeaking}
                  className="hover:underline text-[10px] ml-1 font-extrabold cursor-pointer"
                >
                  [{t('stop', 'Stop')}]
                </button>
              </div>
            )}

            {pantryIngredientsList.length > 0 && (
              <div 
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-emerald)',
                  color: 'var(--color-emerald)'
                }}
                title="Active In-Stock Pantry Context"
              >
                <Package className="h-3.5 w-3.5" />
                <span>{(t('pantryInStockBadge', 'Pantry: {count} in-stock')).replace('{count}', String(pantryIngredientsList.length))}</span>
              </div>
            )}

            {recommendedRecipeUrls.length > 0 && (
              <div 
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
                title="Curated Recipe Sources"
              >
                <Globe className="h-3.5 w-3.5 text-sky-400" />
                <span>{(t('primarySourcesBadge', 'Sources: {count} active')).replace('{count}', String(recommendedRecipeUrls.length))}</span>
              </div>
            )}

            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-xs"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <Cpu className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              <span className="font-mono">{activeAiModel}</span>
            </div>

            {strictDietEnforcement && (
              <div 
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
              >
                <ShieldAlert className="h-3 w-3" />
                <span>{t('strictFilters', 'Strict Filters')}</span>
              </div>
            )}

            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-xs"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <DynamicTokenIcon size={15} className="w-3.5 h-3.5 inline-block" />
              <div className="text-xs font-mono font-black" style={{ color: 'var(--color-text)' }}>
                {tokenBalance} <span className="text-amber-500">{tokenSymbol}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTokenPurchaseOpen(true)}
                className="ml-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg text-white transition hover:opacity-90 cursor-pointer shadow-xs"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('topUp', 'Top Up')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="p-2 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-80"
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
              className="p-2 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title={t('newChat', 'New Chat')}
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* DIETARY PREFERENCES PILLS HEADER */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1 animate-in fade-in">
          <span 
            className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-emerald)',
              color: 'var(--color-emerald)'
            }}
          >
            {t('servingsLabelPref', 'Servings:')} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{(t('peopleSuffix', '{count} people')).replace('{count}', String(servings))}</strong>
          </span>

          <span 
            className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs"
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
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs"
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
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs"
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
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs"
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
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs"
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
                {t('chefHeroSub', 'Select a questionnaire topic below or speak into the microphone to plan meals')}
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
                <Sparkles className="h-4 w-4" /> {t('startCompleteIntake', 'Start Complete Meal Plan Intake')}
              </button>

              {recommendedRecipeUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSend(t('primarySourcesPrompt', 'Recommend a signature chef recipe inspired by the primary source URLs configured in admin settings.'))}
                  className="border text-xs font-semibold px-4 py-2.5 rounded-full transition shadow-xs hover:scale-[1.02] cursor-pointer flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <Globe className="h-3.5 w-3.5 text-sky-400" />
                  <span>{(t('primarySourcesChip', '🌐 Primary Sources ({count})')).replace('{count}', String(recommendedRecipeUrls.length))}</span>
                </button>
              )}

              {activeQuestionnaireSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleStartTopicWizard(sec)}
                  className="border text-xs font-semibold px-4 py-2.5 rounded-full transition shadow-xs hover:scale-[1.02] cursor-pointer flex items-center gap-2"
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
                  <span className="text-[10px] opacity-75 font-mono">({(sec.questions || []).length} {t('questionsWord', 'questions')})</span>
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
                    className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 shadow-xs"
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
                            title={hasAudioActive ? t('stop', 'Stop') : t('listenRecipe', 'Listen')}
                          >
                            {hasAudioActive ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MULTI-DAY MEAL PLAN PRESENTATION (RESPECTS RESULT DISPLAY MODE) */}
                  {m.plan && Array.isArray(m.plan.meals) && m.plan.meals.length > 0 && (
                    <div 
                      className="border rounded-3xl p-5 space-y-4 shadow-md transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                            <h3 className="font-extrabold text-base" style={{ color: 'var(--color-text)' }}>
                              {(t('daysPlan', '{days}-Day Meal Plan')).replace('{days}', String(m.plan.totalDays || m.plan.meals.length))}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs opacity-75 mt-0.5">
                            {m.plan.theme && <span>{t('themeLabel', 'Theme:')} <strong>{m.plan.theme}</strong></span>}
                            {m.plan.budgetPerServing && <span>{t('budgetLabel', 'Budget:')} <strong>{m.plan.budgetPerServing}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* In-Chat Mode Switcher */}
                          <div className="flex items-center border rounded-xl p-0.5 shadow-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                            <button
                              type="button"
                              onClick={() => setResultDisplayMode('card')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${resultDisplayMode === 'card' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'opacity-60'}`}
                            >
                              {t('viewModeCard', 'Card')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setResultDisplayMode('compact')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${resultDisplayMode === 'compact' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'opacity-60'}`}
                            >
                              {t('viewModeCompact', 'Compact')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setResultDisplayMode('detailed')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${resultDisplayMode === 'detailed' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'opacity-60'}`}
                            >
                              {t('viewModeDetailed', 'Detailed')}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleScheduleMealPlan(m.plan!)}
                            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-90 text-white"
                            style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            <span>{t('addToMealPlanner', 'Add to Meal Planner')}</span>
                          </button>
                        </div>
                      </div>

                      {/* COMPACT TABLE VIEW */}
                      {resultDisplayMode === 'compact' ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b text-[10px] uppercase font-bold opacity-70" style={{ borderColor: 'var(--color-border)' }}>
                                <th className="py-2 px-3">{t('tableColDay', 'Day & Date')}</th>
                                <th className="py-2 px-3">{t('tableColMeal', 'Meal Slot')}</th>
                                <th className="py-2 px-3">{t('tableColDish', 'Recipe / Dish')}</th>
                                <th className="py-2 px-3">{t('tableColTime', 'Time')}</th>
                                <th className="py-2 px-3 text-right">{t('tableColServings', 'Servings')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                              {m.plan.meals.map((meal, mIdx) => (
                                <tr key={meal.id || mIdx} className="hover:bg-slate-800/20 transition">
                                  <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--color-primary)' }}>{meal.dayLabel}</td>
                                  <td className="py-2.5 px-3 uppercase text-[10px] font-extrabold opacity-75">{meal.mealType}</td>
                                  <td className="py-2.5 px-3 font-semibold">{meal.title}</td>
                                  <td className="py-2.5 px-3 text-[11px] opacity-75 font-mono">{(meal.prepMinutes || 15) + (meal.cookMinutes || 20)}m</td>
                                  <td className="py-2.5 px-3 text-right font-bold">{meal.servings || servings}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* CARD OR DETAILED GRID VIEW */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {m.plan.meals.map((meal, mIdx) => (
                            <div 
                              key={meal.id || mIdx}
                              className="p-3.5 rounded-2xl border space-y-2 relative flex flex-col justify-between shadow-xs transition"
                              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                    {meal.dayLabel}
                                  </span>
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border opacity-75" style={{ borderColor: 'var(--color-border)' }}>
                                    {meal.mealType}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
                                  {meal.title}
                                </h4>
                                {meal.description && (
                                  <p className="text-[11px] leading-relaxed opacity-75 line-clamp-2">
                                    {meal.description}
                                  </p>
                                )}

                                {resultDisplayMode === 'detailed' && Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                  <div className="pt-1.5 space-y-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Key Ingredients:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {meal.ingredients.slice(0, 4).map((ing, iIdx) => (
                                        <span key={iIdx} className="text-[9px] px-1.5 py-0.5 rounded border opacity-75" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                                          • {ing}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t flex items-center justify-between text-[10px] font-semibold opacity-75" style={{ borderColor: 'var(--color-border)' }}>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                                  {(meal.prepMinutes || 15) + (meal.cookMinutes || 20)}m
                                </span>
                                {meal.isBatchCook && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    {t('batchCookingBadge', 'Batch Cook')}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                              {t('finalRecommendedRecipe', 'Final Recommended Recipe')}
                            </span>
                            <h3 className="font-extrabold text-base" style={{ color: 'var(--color-text)' }}>
                              {m.recommendedRecipe.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                            <Bookmark className="h-3.5 w-3.5" />
                            <span>{t('saveRecipe', 'Save Recipe')}</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {m.recommendedRecipe.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-400" /> {t('prep', 'Prep:')} {m.recommendedRecipe.prepMinutes || 15}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('cook', 'Cook:')} {m.recommendedRecipe.cookMinutes || 20}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {t('serves', 'Serves:')} {m.recommendedRecipe.servings || servings}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="space-y-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--color-primary)' }}>
                            <span>{(t('ingredientsCount', 'Ingredients ({count})')).replace('{count}', String(m.recommendedRecipe.ingredients?.length || 0))}</span>
                          </h4>
                          <ul className="space-y-1 text-xs">
                            {(m.recommendedRecipe.ingredients || []).map((ing: string, i: number) => {
                              const inPantry = pantryIngredientsList.some(p => ing.toLowerCase().includes(p.toLowerCase()));
                              return (
                                <li key={i} className="flex items-center justify-between p-1.5 rounded-lg border text-[11px]" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                                  <span style={{ color: 'var(--color-text)' }}>• {ing}</span>
                                  {inPantry && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      {t('pantryBadge', 'Pantry ✓')}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                            {t('stepDirections', 'Step-by-Step Directions')}
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
                            <strong className="block text-[11px]" style={{ color: 'var(--color-primary)' }}>{t('chefProTip', 'Chef Foodie Pro Tip:')}</strong>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                              {m.recommendedRecipe.chefTip}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div 
                    className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 shadow-xs"
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
            className="flex items-center gap-3 p-3.5 border rounded-2xl max-w-xs text-xs shadow-xs"
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

      {/* PRESET ANSWERS */}
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
              <Sparkles className="h-3.5 w-3.5" /> {(t('presetAnswersTitle', 'Preset Answers (Step {step} of {total}):')).replace('{step}', String(wizardStep + 1)).replace('{total}', String(wizardQuestionsList.length))}
            </span>
            <button
              type="button"
              onClick={() => { updateWizardStep(null); showToast(t('exitedWizardToast', 'Exited wizard questionnaire')); }}
              className="text-[10px] hover:underline cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('cancelWizard', 'Cancel Wizard')}
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
            <Sparkles className="h-3 w-3" style={{ color: 'var(--color-primary)' }} /> {t('questionnaires', 'Questionnaires:')}
          </span>
          {activeQuestionnaireSections.map((sec) => (
            <button
              key={`chip-${sec.id}`}
              type="button"
              onClick={() => handleStartTopicWizard(sec)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02]"
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
            title={isListening ? t('listeningToVoice', 'Listening...') : t('listenRecipe', 'Speak')}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

        <input
          type="text"
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? t('listeningToVoice', 'Listening to your voice...') : `${t('askPromptPlaceholder', 'Ask recipes, cooking tips, or meal plan requests...')} (${chefCost} ${tokenSymbol})`}
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
          >
            {chefCost} {tokenSymbol}
          </span>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !prompt.trim()}
            className="disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ACCESSIBLE DIETARY PREFERENCES MODAL (AUTOFILL-SAFE FORM-FREE DIVS) */}
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
                className="p-2 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-80"
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
                    className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-xs hover:opacity-80"
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
                    className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-xs hover:opacity-80"
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
                    className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer appearance-none shadow-xs font-medium"
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
                        className="px-4 py-1.5 rounded-full font-bold text-xs border transition cursor-pointer shadow-xs"
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
                        className="px-4 py-1.5 rounded-full font-bold text-xs border transition cursor-pointer shadow-xs"
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

              {/* Ingredients to Avoid (Accessible Container, No Form) */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('ingredientsToAvoidTitle', 'Ingredients to Avoid')}
                </label>
                <div 
                  role="region"
                  data-lpignore="true"
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder={t('typeIngredientPlaceholder', 'Type an ingredient...')}
                    value={newAvoidInput}
                    onChange={(e) => setNewAvoidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAvoid();
                      }
                    }}
                    className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddAvoid}
                    className="px-3.5 py-2.5 text-white rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-md hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

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
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-xs"
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

              {/* Tastes (Accessible Container, No Form) */}
              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('tastesTitle', 'Tastes & Cooking Styles')}
                </label>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tastesDesc', "Anything else about how you like to eat. We'll factor these into your recipes.")}
                </p>

                <div 
                  role="region"
                  data-lpignore="true"
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder={t('tastesPlaceholder', 'e.g. prefers larger portions, loves umami, extra garlic...')}
                    value={newTasteInput}
                    onChange={(e) => setNewTasteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTaste();
                      }
                    }}
                    className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTaste}
                    className="px-3.5 py-2.5 text-white rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-md hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

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
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-xs"
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
                className="px-5 py-2.5 border rounded-xl font-bold text-xs transition cursor-pointer shadow-xs hover:opacity-80"
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
