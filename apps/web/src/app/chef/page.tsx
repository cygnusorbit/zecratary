// @ts-nocheck
'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, Globe, ExternalLink, Send, SlidersHorizontal, Edit3, Clock, Flame, Users, RefreshCw, 
  Calendar, CalendarPlus, X, ArrowLeftRight, Utensils, Loader2, User as UserIcon, 
  Check, Sparkles, Bookmark, RotateCcw, Package, Plus, Trash2, ChevronDown, 
  ChevronLeft, ChevronRight, Search, Heart, Copy, ShoppingCart, Dices, 
  CheckCircle2, Layers, HelpCircle, Coins, Cpu, ShieldAlert, Mic, MicOff,
  Volume2, VolumeX, Square, BookOpen, BookA, Zap, Award, History, Folder,
  FolderPlus, MessageSquare, Tag
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

interface SystemRecommendation {
  label: string;
  route: string;
  description?: string;
}

interface ChatMessage {
  systemRecommendations?: SystemRecommendation[];
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  plan?: MealPlanData;
  recipe?: any;
  recommendedRecipe?: RecommendedRecipeData;
}

interface ChatCategory {
  id: string;
  name: string;
  created_at?: string;
}

interface ChatSessionItem {
  id: string;
  title: string;
  category_id?: string | null;
  category_name?: string | null;
  message_count?: number;
  created_at: string;
  updated_at: string;
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat History & Categories State (PostgreSQL backed)
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => 'sess_' + Date.now());
  const currentSessionIdRef = useRef<string>(currentSessionId);
  currentSessionIdRef.current = currentSessionId;

  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [historySessions, setHistorySessions] = useState<ChatSessionItem[]>([]);
  const [historyCategories, setHistoryCategories] = useState<ChatCategory[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotalCount, setHistoryTotalCount] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // AI & Voice telemetry settings
  const [questionnaireSections, setQuestionnaireSections] = useState<any[]>(DEFAULT_SECTIONS);
  const [activeTopicTitle, setActiveTopicTitle] = useState<string>('Standard Wizard');
  const [wizardQuestionsList, setWizardQuestionsList] = useState<string[]>([]);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'compact' | 'detailed'>('card');
  const [activeAiModel, setActiveAiModel] = useState<string>('gemini-2.0-flash');
  const [strictDietEnforcement, setStrictDietEnforcement] = useState<boolean>(false);
  const [filterWordsList, setFilterWordsList] = useState<string[]>([]);
  const [enablePantryContext, setEnablePantryContext] = useState<boolean>(true);
  const [maxPlanDays, setMaxPlanDays] = useState<number>(7);
  const [recommendedRecipeUrls, setRecommendedRecipeUrls] = useState<string[]>([]);

  // Voice Interaction State
  const [enableVoiceInteraction, setEnableVoiceInteraction] = useState<boolean>(true);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voiceAutoPlay, setVoiceAutoPlay] = useState<boolean>(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('en-US-Neural2-F');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);

  // Token Telemetry
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenName, setTokenName] = useState<string>('Foodie Token');
  const [chefCost, setChefCost] = useState<number>(1);
  const [tokenPackages, setTokenPackages] = useState<any[]>([]);
  const [isTokenPurchaseOpen, setIsTokenPurchaseOpen] = useState(false);

  // Dietary Preferences State
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

  // Recipe Modals
  const [selectedRecipeForModal, setSelectedRecipeForModal] = useState<RecommendedRecipeData | null>(null);
  const [showRecipeDetailsModal, setShowRecipeDetailsModal] = useState<boolean>(false);
  const [pantryIngredientsList, setPantryIngredientsList] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getUserKey = useCallback((user: User | null) => {
    if (!user) return 'guest';
    return user.id || (user.email ? user.email.toLowerCase().trim() : 'guest');
  }, []);

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

  // ------------------------------------------------------------------
  // Chat History & Category PostgreSQL Operations
  // ------------------------------------------------------------------
  const fetchChatHistory = useCallback(async (pageToLoad = historyPage, categoryFilter = selectedCategoryFilter) => {
    setLoadingHistory(true);
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      const res = await fetch(
        `/api/chef/history?userId=${encodeURIComponent(userKey)}&categoryId=${encodeURIComponent(categoryFilter)}&page=${pageToLoad}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.success) {
        setHistorySessions(data.sessions || []);
        setHistoryCategories(data.categories || []);
        setHistoryPage(data.page || 1);
        setHistoryTotalPages(data.totalPages || 1);
        setHistoryTotalCount(data.total || 0);
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [getUserKey, historyPage, selectedCategoryFilter]);

  const saveCurrentSessionToDb = useCallback(async (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return;
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      const firstUserMsg = msgs.find(m => m.role === 'user');
      const title = firstUserMsg?.content 
        ? firstUserMsg.content.slice(0, 45) + (firstUserMsg.content.length > 45 ? '...' : '')
        : 'Chef Conversation';

      await fetch('/api/chef/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_session',
          userId: userKey,
          id: currentSessionIdRef.current,
          title,
          messages: msgs
        })
      });
    } catch (_) {}
  }, [getUserKey]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      const res = await fetch('/api/chef/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_category',
          userId: userKey,
          name: clean
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName('');
        showToast(`Category "${clean}" created!`);
        fetchChatHistory(1, selectedCategoryFilter);
      }
    } catch (_) {
      showToast("Could not create category.");
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Delete category "${categoryName}"? Existing chats will be kept.`)) return;
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      await fetch(
        `/api/chef/history?action=delete_category&categoryId=${encodeURIComponent(categoryId)}&userId=${encodeURIComponent(userKey)}`,
        { method: 'DELETE' }
      );
      showToast(`Category "${categoryName}" deleted.`);
      if (selectedCategoryFilter === categoryId) setSelectedCategoryFilter('all');
      fetchChatHistory(1, 'all');
    } catch (_) {
      showToast("Could not delete category.");
    }
  };

  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      await fetch(
        `/api/chef/history?action=delete_session&sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userKey)}`,
        { method: 'DELETE' }
      );

      if (currentSessionIdRef.current === sessionId) {
        startNewChat();
      }
      showToast("Chat deleted.");
      fetchChatHistory(historyPage, selectedCategoryFilter);
    } catch (_) {
      showToast("Could not delete chat.");
    }
  };

  const handleSelectSession = async (sessionItem: ChatSessionItem) => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      const sRes = await fetch(`/api/chef/session?id=${sessionItem.id}`, { cache: 'no-store' }).catch(() => null);
      let sessionMsgs: ChatMessage[] = [];
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        sessionMsgs = sData.messages || [];
      } else {
        const local = localStorage.getItem(`zecratary_chef_sess_${sessionItem.id}`);
        if (local) sessionMsgs = JSON.parse(local);
      }

      currentSessionIdRef.current = sessionItem.id;
      setCurrentSessionId(sessionItem.id);
      setMessages(sessionMsgs);
      updateWizardStep(null);
      setShowHistoryDrawer(false);
      showToast(`Loaded: ${sessionItem.title}`);
    } catch (_) {
      showToast("Failed to load chat.");
    }
  };

  const startNewChat = () => {
    stopSpeaking();
    const newId = 'sess_' + Date.now();
    currentSessionIdRef.current = newId;
    setCurrentSessionId(newId);
    setMessages([]);
    updateWizardStep(null);
    setWizardAnswers({});
    setActiveTopicTitle('Standard Wizard');
    setShowHistoryDrawer(false);
    showToast("Started a new chat session.");
  };

  const handleAssignCategory = async (sessionId: string, categoryId: string) => {
    try {
      const active = currentUserRef.current || getCurrentUser();
      const userKey = getUserKey(active);
      await fetch('/api/chef/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_session_category',
          userId: userKey,
          sessionId,
          categoryId: categoryId === 'none' ? null : categoryId
        })
      });
      fetchChatHistory(historyPage, selectedCategoryFilter);
      showToast("Category updated.");
    } catch (_) {}
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

    if (selectedVoiceName.includes('F') || selectedVoiceName.includes('Aria')) {
      utterance.pitch = 1.05;
    } else if (selectedVoiceName.includes('D') || selectedVoiceName.includes('Marcus')) {
      utterance.pitch = 0.88;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const matchedVoice = voices.find(v => v.lang.startsWith('en'));
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

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  // ------------------------------------------------------------------
  // Dietary Preferences Handlers (PostgreSQL Sync)
  // ------------------------------------------------------------------
  const loadUserPreferences = useCallback(async (user: User | null) => {
    const userKey = getUserKey(user);
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
      }
    } catch (_) {}
  }, [getUserKey]);

  const handleToggleDiet = (item: string) => {
    setSelectedDiets(prev => prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item]);
  };

  const handleToggleAllergy = (item: string) => {
    setSelectedAllergies(prev => prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]);
  };

  const handleAddAvoid = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newAvoidInput.trim();
    if (!clean) return;
    if (!ingredientsToAvoid.includes(clean)) setIngredientsToAvoid([...ingredientsToAvoid, clean]);
    setNewAvoidInput('');
  };

  const handleRemoveAvoid = (item: string) => {
    setIngredientsToAvoid(ingredientsToAvoid.filter(a => a !== item));
  };

  const handleAddTaste = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newTasteInput.trim();
    if (!clean) return;
    if (!tastesList.includes(clean)) setTastesList([...tastesList, clean]);
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

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userKey, ...prefs })
      });
    } catch (_) {}

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
  // Telemetry & Settings Synchronization
  // ------------------------------------------------------------------
  const fetchTelemetry = useCallback(async () => {
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
        if (Array.isArray(data.packages)) setTokenPackages(data.packages);
      }

      const sRes = await fetch('/api/admin/settings', { cache: 'no-store' });
      const sData = await sRes.json();
      const chefCfg = sData?.chefAiSettings || sData?.settings?.chefAiSettings || sData;
      if (chefCfg) {
        if (sData.aiModel || chefCfg.model) {
          setActiveAiModel((sData.aiModel || chefCfg.model).replace(/^models\//, ''));
        }
        if (chefCfg.strictDietEnforcement !== undefined) setStrictDietEnforcement(Boolean(chefCfg.strictDietEnforcement));
        if (Array.isArray(chefCfg.filterWordsList)) setFilterWordsList(chefCfg.filterWordsList.filter(Boolean));
        if (chefCfg.enablePantryContext !== undefined) setEnablePantryContext(Boolean(chefCfg.enablePantryContext));
        if (chefCfg.maxPlanDays !== undefined) setMaxPlanDays(Number(chefCfg.maxPlanDays) || 7);
        if (Array.isArray(chefCfg.recommendedRecipeUrls)) {
          setRecommendedRecipeUrls(chefCfg.recommendedRecipeUrls.filter(Boolean));
        } else if (Array.isArray(sData.recommendedRecipeUrls)) {
          setRecommendedRecipeUrls(sData.recommendedRecipeUrls.filter(Boolean));
        }
        if (chefCfg.resultDisplayMode) setResultDisplayMode(chefCfg.resultDisplayMode);
        if (chefCfg.enableVoiceInteraction !== undefined) setEnableVoiceInteraction(Boolean(chefCfg.enableVoiceInteraction));
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
  }, []);

  const applySavedTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    document.title = `${t('foodieChatHeading', 'Foodie Chat')} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    currentUserRef.current = user;

    applySavedTheme();
    loadUserPreferences(user);
    fetchTelemetry();
    fetchChatHistory(1, 'all');

    const handleSync = () => {
      const active = getCurrentUser();
      setCurrentUser(active);
      currentUserRef.current = active;
      loadUserPreferences(active);
      fetchTelemetry();
      fetchChatHistory(1, selectedCategoryFilter);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('zecratary_admin_settings_updated', fetchTelemetry);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_admin_settings_updated', fetchTelemetry);
    };
  }, [applySavedTheme, fetchTelemetry, loadUserPreferences, fetchChatHistory, selectedCategoryFilter, t]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const updateMessages = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessages(prev => {
      const updated = typeof newMessages === 'function' ? newMessages(prev) : newMessages;
      saveCurrentSessionToDb(updated);
      try {
        localStorage.setItem(`zecratary_chef_sess_${currentSessionIdRef.current}`, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // ------------------------------------------------------------------
  // Questionnaire Flow
  // ------------------------------------------------------------------
  const handleStartTopicWizard = (sec: any) => {
    const qList = Array.isArray(sec.questions) && sec.questions.length > 0
      ? sec.questions
      : ["How many days would you like to plan for (up to 7 days)?"];

    setActiveTopicTitle(sec.topicTitle);
    setWizardQuestionsList(qList);
    updateWizardStep(0);
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
    const qList = allQuestions.length > 0 ? allQuestions : DEFAULT_SECTIONS.flatMap(s => s.questions);

    setActiveTopicTitle('Complete Intake Wizard');
    setWizardQuestionsList(qList);
    updateWizardStep(0);
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

  // ------------------------------------------------------------------
  // High-Precision Contextual Preset Options Matcher
  // ------------------------------------------------------------------
  const currentPresetOptions = useMemo(() => {
    if (wizardStep === null || !wizardQuestionsList || !wizardQuestionsList[wizardStep]) return [];
    const q = wizardQuestionsList[wizardStep].toLowerCase().trim();

    // 1. MEAL TYPES (Evaluated BEFORE duration so "each day" won't trigger day counts)
    if (/\b(meal type|meal types|which meal|types of meal|breakfast|lunch|dinner|snack|meals to include)\b/i.test(q)) {
      return [
        'Dinner only',
        'Lunch & Dinner',
        'All Meals (Breakfast, Lunch, Dinner)',
        'Breakfast & Lunch',
        'Breakfast & Dinner',
        'All Meals + Snack'
      ];
    }

    // 2. START DATE / SCHEDULE (Evaluated BEFORE duration so "today" won't trigger day counts)
    if (/\b(when|start date|starting|start|commence|begin|schedule date)\b/i.test(q) && !/\b(how many days|number of days)\b/i.test(q)) {
      return [
        'Start Today',
        'Start Tomorrow',
        'Next Monday (Fresh Week)',
        'This Coming Weekend (Saturday)',
        'Flexible / Any Day'
      ];
    }

    // 3. DURATION / NUMBER OF DAYS
    if (/\b(how many days|number of days|duration|days to plan|how long|days would you like)\b/i.test(q) || (/\bdays?\b/i.test(q) && /\b(how many|plan for|total)\b/i.test(q))) {
      const days = [];
      days.push('3 Days (Quick Prep)');
      days.push('5 Days (Workweek)');
      if (maxPlanDays >= 7) days.push('7 Days (Full Week)');
      else days.push(`${maxPlanDays} Days`);
      days.push('Weekend Plan (2 Days)');
      days.push('Single Day Focus');
      return Array.from(new Set(days));
    }

    // 4. BUDGET & FINANCIAL TARGET
    if (/\b(budget|cost|spend|price|financial|per serving|per meal)\b/i.test(q)) {
      return [
        'Under $5 per serving (Economy)',
        '$5 - $8 per serving (Balanced)',
        '$8 - $12 per serving (Generous)',
        '$12+ per serving (Premium)',
        'Flexible target'
      ];
    }

    // 5. THEMES, PREFERENCES, FLAVORS & CUISINES
    if (/\b(theme|themes|preference|preferences|flavor|flavors|cuisine|cuisines|comfort food|high-protein)\b/i.test(q)) {
      return [
        'High-Protein Wholesome',
        'Quick & Easy (Under 25 mins)',
        'Mediterranean Fresh & Olive Oil',
        'Keto / Low-Carb Wholesome',
        'Budget-Friendly Comfort Food',
        'Plant-Based / Balanced Veggie',
        'Hearty Family Classics'
      ];
    }

    // 6. SERVINGS & HOUSEHOLD SIZE
    if (/\b(serving|servings|people|person|household|family|portion|portions)\b/i.test(q)) {
      return [
        '1 Person (Solo Dining)',
        '2 People (Couple / Pair)',
        '3-4 People (Family Size)',
        '5+ People (Large Batch)'
      ];
    }

    // 7. DIETARY RESTRICTIONS
    if (/\b(diet|diets|dietary|vegetarian|vegan|pescatarian|halal|kosher|keto|paleo)\b/i.test(q)) {
      return [
        'Vegetarian (No Meat/Fish)',
        'Vegan (100% Plant-Based)',
        'High-Protein Balanced',
        'Pescatarian (Fish & Veggies)',
        'Halal Certified Style',
        'Standard / No Restrictions'
      ];
    }

    // 8. ALLERGIES & PROHIBITED INGREDIENTS
    if (/\b(allerg|allergy|allergies|avoid|avoiding|intoleran|dislike|exclude)\b/i.test(q)) {
      return [
        'No Allergies (Standard)',
        'Nut-Free (No Peanuts/Tree Nuts)',
        'Dairy-Free / Lactose-Free',
        'Gluten-Free Only',
        'Avoid Heavy Oil / Deep Fried',
        'Shellfish-Free'
      ];
    }

    // 9. PANTRY & IN-STOCK INGREDIENTS
    if (/\b(pantry|fridge|in-stock|on hand|stock|inventory|existing ingredients)\b/i.test(q)) {
      return [
        'Prioritize in-stock pantry items',
        'Mix pantry items with fresh groceries',
        'Start fresh with new grocery items'
      ];
    }

    // 10. COOKING TIME & PREP EQUIPMENT
    if (/\b(cook time|prep time|cooking time|minutes|speed|quick|equipment|air fryer|one-pot|slow cook)\b/i.test(q)) {
      return [
        'Speedy (Under 15 mins)',
        'Moderate (20 - 30 mins)',
        'One-Pot / Sheet Pan Only',
        'Air Fryer Friendly',
        'Weekend Leisure Cooking'
      ];
    }

    // 11. BATCH COOKING & LEFTOVERS
    if (/\b(batch|leftover|leftovers|cook once|bulk)\b/i.test(q)) {
      return [
        'Include batch cooking & leftovers',
        'Fresh cooked meal every day',
        'Cook once, eat twice (Smart Leftovers)'
      ];
    }

    // 12. CONTEXT-AWARE INTELLIGENT FALLBACK
    return [
      'Yes, strictly apply',
      'Standard recommended',
      'Surprise me with chef selections',
      'Flexible / No preference'
    ];
  }, [wizardStep, wizardQuestionsList, maxPlanDays]);

  // ------------------------------------------------------------------
  // Chat Prompt Execution with PostgreSQL Persistence
  // ------------------------------------------------------------------
  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : prompt).trim();
    if (!textToSend || loading) return;

    const lower = textToSend.toLowerCase();

    // Trigger full intake wizard if requested directly via prompt
    if (wizardStep === null && (
      lower.includes('complete meal plan intake') || 
      lower.includes('meal plan intake wizard') ||
      lower === 'start complete meal plan intake wizard' ||
      /^(?:start|create|make|build)\s+(?:a\s+)?meal\s+plan(?:\s+intake)?(?:\s+wizard)?$/i.test(lower)
    )) {
      handleStartFullWizard();
      setPrompt('');
      return;
    }

    if (strictDietEnforcement && filterWordsList.length > 0) {
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
            recommendedRecipe: data.recommendedRecipe || data.recipe,
            systemRecommendations: data.systemRecommendations || []
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

  const activeQuestionnaireSections = useMemo(() => {
    return questionnaireSections.filter((s: any) => s.enabled !== false);
  }, [questionnaireSections]);

  return (
    <div 
      className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-5.5rem)] justify-between space-y-3 pb-2 font-sans relative transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
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

      {/* TOP HEADER WITH HISTORY & CHAT CONTROLS */}
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

            {/* CHAT HISTORY DRAWER BUTTON */}
            <button
              type="button"
              onClick={() => {
                setShowHistoryDrawer(true);
                fetchChatHistory(1, selectedCategoryFilter);
              }}
              className="p-2 rounded-xl border transition cursor-pointer shadow-sm hover:opacity-80 flex items-center gap-1.5 text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
              title="View Chat History & Categories"
            >
              <History className="h-4 w-4" />
              <span className="hidden md:inline">History</span>
            </button>

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

            {/* NEW CHAT BUTTON */}
            <button
              type="button"
              onClick={startNewChat}
              className="p-2 rounded-xl border transition cursor-pointer shadow-sm hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title="Start New Chat"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* USER DIETARY PREFERENCES PILLS */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1 animate-in fade-in">
          {/* PRIMARY SOURCES TELEMETRY PILL */}
          {recommendedRecipeUrls.length > 0 && (
            <span 
              className="border px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm transition hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
              title={`Primary Recipe Sources: ${recommendedRecipeUrls.join(', ')}`}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
              <span>Primary Sources:</span>
              <strong className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>
                {recommendedRecipeUrls.length} URLs
              </strong>
            </span>
          )}
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
                <Sparkles className="h-4 w-4" /> Start Complete Meal Plan Intake Wizard
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

                  {/* RECOMMENDATION RECIPE CARD PREVIEW */}
                  {m.recommendedRecipe && (
                    <div 
                      className="border rounded-2xl p-3.5 space-y-3 shadow-sm transition-all duration-200 hover:shadow-md"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div 
                          onClick={() => {
                            setSelectedRecipeForModal(m.recommendedRecipe);
                            setShowRecipeDetailsModal(true);
                          }}
                          className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer group"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={m.recommendedRecipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                              alt={m.recommendedRecipe.title}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border transition group-hover:scale-105"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                            <span 
                              className="absolute -top-1.5 -left-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md text-white shadow-xs"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              Recommended
                            </span>
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <h4 className="font-black text-sm leading-snug group-hover:underline truncate" style={{ color: 'var(--color-text)' }}>
                              {m.recommendedRecipe.title}
                            </h4>
                            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                              {m.recommendedRecipe.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-bold pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" style={{ color: 'var(--color-emerald)' }} /> {m.recommendedRecipe.prepMinutes + m.recommendedRecipe.cookMinutes}m
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {m.recommendedRecipe.servings || servings} serv
                              </span>
                              {m.recommendedRecipe.calories && (
                                <span className="font-mono text-emerald-500">{m.recommendedRecipe.calories} kcal</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MULTI-DAY PLAN PRESENTATION (SUPPORTS CARD, COMPACT, DETAILED MODES) */}
                  {m.plan && (
                    <div 
                      className="border rounded-3xl p-5 space-y-4 shadow-sm transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                          <h3 className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                            {m.plan.title} ({m.plan.totalDays} Days)
                          </h3>
                        </div>

                        {/* In-Chat View Mode Switcher Pills */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <span className="text-[10px] font-bold mr-1 hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
                            {m.plan.budgetPerServing ? `Budget: ${m.plan.budgetPerServing}` : '$5.00/serv'}
                          </span>
                          <div className="border p-0.5 rounded-xl flex items-center gap-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                            {(['card', 'compact', 'detailed'] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setResultDisplayMode(mode)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer capitalize"
                                style={resultDisplayMode === mode ? {
                                  backgroundColor: 'var(--color-primary)',
                                  color: '#ffffff'
                                } : {
                                  color: 'var(--color-text-secondary)'
                                }}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 1. STANDARD CARDS VIEW */}
                      {resultDisplayMode === 'card' && (
                        <div className="space-y-3">
                          {m.plan.meals.map((meal) => (
                            <div 
                              key={meal.id}
                              onClick={() => {
                                setSelectedRecipeForModal({
                                  title: meal.title,
                                  description: meal.description,
                                  prepMinutes: meal.prepMinutes || 15,
                                  cookMinutes: meal.cookMinutes || 20,
                                  servings: meal.servings || servings,
                                  calories: meal.calories || 480,
                                  mealType: meal.mealType,
                                  ingredients: Array.isArray(meal.ingredients) && meal.ingredients.length > 0 ? meal.ingredients : ['Fresh produce & proteins', 'Aromatics & seasonings', 'Cold-pressed olive oil'],
                                  instructions: ['Prepare and rinse all ingredients cleanly.', 'Sauté aromatics over medium heat until fragrant.', 'Cook protein and vegetables thoroughly.', 'Garnish with fresh herbs and serve warm.'],
                                  chefTip: meal.isBatchCook ? 'Double the quantity to save time for subsequent days.' : 'Serve immediately while hot for optimal flavor infusion.',
                                  image: meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                                });
                                setShowRecipeDetailsModal(true);
                              }}
                              className="border rounded-2xl p-3.5 space-y-2.5 transition cursor-pointer hover:scale-[1.01] shadow-xs"
                              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                            >
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span style={{ color: 'var(--color-primary)' }}>{meal.dayLabel} ({meal.dateStr})</span>
                                <div className="flex items-center gap-1.5">
                                  {meal.isBatchCook && (
                                    <span 
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border"
                                      style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderColor: 'var(--color-emerald)',
                                        color: 'var(--color-emerald)'
                                      }}
                                    >
                                      Batch Cook
                                    </span>
                                  )}
                                  <span 
                                    className="uppercase text-[9px] font-extrabold px-1.5 py-0.5 rounded border"
                                    style={{
                                      backgroundColor: 'var(--color-card)',
                                      borderColor: 'var(--color-border)',
                                      color: 'var(--color-text-secondary)'
                                    }}
                                  >
                                    {meal.mealType}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <img 
                                  src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'} 
                                  alt={meal.title} 
                                  className="w-16 h-16 rounded-xl object-cover border shrink-0" 
                                  style={{ borderColor: 'var(--color-border)' }} 
                                />
                                <div className="space-y-1 flex-1 min-w-0">
                                  <h4 className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>{meal.title}</h4>
                                  <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{meal.description}</p>
                                  <div className="flex items-center gap-3 text-[10px] font-semibold pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" style={{ color: 'var(--color-emerald)' }} /> {(meal.prepMinutes || 15) + (meal.cookMinutes || 20)}m
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" /> {meal.servings || servings} serv
                                    </span>
                                    {meal.calories && (
                                      <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{meal.calories} kcal</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. COMPACT TABLE VIEW */}
                      {resultDisplayMode === 'compact' && (
                        <div className="border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                          <div 
                            className="grid grid-cols-12 gap-2 p-2.5 font-extrabold text-[10px] uppercase border-b"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            <span className="col-span-3">Day / Schedule</span>
                            <span className="col-span-2">Meal Type</span>
                            <span className="col-span-5">Recipe Title</span>
                            <span className="col-span-2 text-right">Time & Cals</span>
                          </div>

                          {m.plan.meals.map((meal, rIdx) => (
                            <div 
                              key={meal.id || rIdx}
                              onClick={() => {
                                setSelectedRecipeForModal({
                                  title: meal.title,
                                  description: meal.description,
                                  prepMinutes: meal.prepMinutes || 15,
                                  cookMinutes: meal.cookMinutes || 20,
                                  servings: meal.servings || servings,
                                  calories: meal.calories || 480,
                                  mealType: meal.mealType,
                                  ingredients: Array.isArray(meal.ingredients) && meal.ingredients.length > 0 ? meal.ingredients : ['Fresh produce & proteins', 'Seasonings'],
                                  instructions: ['Follow standard chef cooking guidelines for this dish.'],
                                  image: meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                                });
                                setShowRecipeDetailsModal(true);
                              }}
                              className="grid grid-cols-12 gap-2 p-2.5 text-xs items-center border-b last:border-none transition cursor-pointer hover:opacity-80"
                              style={{
                                backgroundColor: rIdx % 2 === 0 ? 'var(--color-card)' : 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)'
                              }}
                            >
                              <span className="col-span-3 font-bold truncate" style={{ color: 'var(--color-primary)' }}>
                                {meal.dayLabel}
                              </span>
                              <span className="col-span-2">
                                <span 
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text-secondary)'
                                  }}
                                >
                                  {meal.mealType}
                                </span>
                              </span>
                              <span className="col-span-5 font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                {meal.title}
                              </span>
                              <span className="col-span-2 text-right font-mono text-[11px]" style={{ color: 'var(--color-emerald)' }}>
                                {(meal.prepMinutes || 15) + (meal.cookMinutes || 20)}m
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 3. DETAILED MASTER VIEW */}
                      {resultDisplayMode === 'detailed' && (
                        <div className="space-y-3">
                          {m.plan.meals.map((meal) => (
                            <div 
                              key={meal.id}
                              onClick={() => {
                                setSelectedRecipeForModal({
                                  title: meal.title,
                                  description: meal.description,
                                  prepMinutes: meal.prepMinutes || 15,
                                  cookMinutes: meal.cookMinutes || 20,
                                  servings: meal.servings || servings,
                                  calories: meal.calories || 480,
                                  mealType: meal.mealType,
                                  ingredients: Array.isArray(meal.ingredients) && meal.ingredients.length > 0 ? meal.ingredients : ['Quality produce', 'Seasonings'],
                                  instructions: ['Follow standard chef cooking guidelines for this dish.'],
                                  image: meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                                });
                                setShowRecipeDetailsModal(true);
                              }}
                              className="border rounded-2xl p-4 space-y-3 transition cursor-pointer hover:scale-[1.01] shadow-xs"
                              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                            >
                              <div className="flex justify-between items-center text-xs font-bold border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="flex items-center gap-2">
                                  <span style={{ color: 'var(--color-primary)' }}>{meal.dayLabel} ({meal.dateStr})</span>
                                  <span 
                                    className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border"
                                    style={{
                                      backgroundColor: 'var(--color-card)',
                                      borderColor: 'var(--color-emerald)',
                                      color: 'var(--color-emerald)'
                                    }}
                                  >
                                    {meal.mealType}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                                  {(meal.prepMinutes || 15) + (meal.cookMinutes || 20)}m • {meal.servings || servings} serv
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h4 className="font-extrabold text-xs" style={{ color: 'var(--color-text)' }}>{meal.title}</h4>
                                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{meal.description}</p>
                              </div>

                              {/* Inline Ingredients Pills Breakdown */}
                              {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider block" style={{ color: 'var(--color-primary)' }}>
                                    Ingredients Breakdown:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {meal.ingredients.map((ing, iIdx) => (
                                      <span 
                                        key={iIdx}
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg border shadow-2xs"
                                        style={{
                                          backgroundColor: 'var(--color-card)',
                                          borderColor: 'var(--color-border)',
                                          color: 'var(--color-text)'
                                        }}
                                      >
                                        • {ing}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
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

      {/* DYNAMIC CONTEXTUAL PRESET ANSWERS */}
      {wizardStep !== null && currentPresetOptions.length > 0 && (
        <div 
          className="p-3.5 rounded-2xl border space-y-2.5 animate-in fade-in transition-colors duration-200"
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
                className="text-xs font-semibold px-3.5 py-2 rounded-xl border transition shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95"
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
          <button
            type="button"
            onClick={handleStartFullWizard}
            className="text-xs font-bold px-3.5 py-1.5 rounded-full border shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] text-white"
            style={{
              backgroundColor: 'var(--color-primary)',
              borderColor: 'var(--color-primary)'
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Complete Intake Wizard</span>
          </button>
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
            title={isListening ? "Listening... click to stop" : "Speak via microphone"}
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
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CHAT HISTORY & CATEGORIES SIDE DRAWER (POSTGRESQL BACKED) */}
      {showHistoryDrawer && (
        <div 
          onClick={() => setShowHistoryDrawer(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full flex flex-col justify-between border-l p-5 space-y-4 shadow-2xl relative cursor-default animate-in slide-in-from-right duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                      Chat History ({historyTotalCount})
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      Up to 10 chats per page • Filtered by category
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="px-2.5 py-1 rounded-xl text-white text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer shadow-sm hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    title="New Chat"
                  >
                    <Plus className="h-3.5 w-3.5" /> New
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistoryDrawer(false)}
                    className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* CATEGORIES SECTION */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                    <Folder className="h-3.5 w-3.5" /> Chat Categories:
                  </span>
                </div>

                <form onSubmit={handleCreateCategory} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New category name (e.g. Keto Prep, Dinners)..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 border rounded-xl px-3 py-1.5 text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newCategoryName.trim()}
                    className="px-3 py-1.5 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-xs hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-emerald)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </form>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('all');
                      fetchChatHistory(1, 'all');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 shadow-xs"
                    style={{
                      backgroundColor: selectedCategoryFilter === 'all' ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                      borderColor: selectedCategoryFilter === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
                      color: selectedCategoryFilter === 'all' ? '#ffffff' : 'var(--color-text-secondary)'
                    }}
                  >
                    All Chats
                  </button>

                  {historyCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 shadow-xs group"
                      style={{
                        backgroundColor: selectedCategoryFilter === cat.id ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                        borderColor: selectedCategoryFilter === cat.id ? 'var(--color-primary)' : 'var(--color-border)',
                        color: selectedCategoryFilter === cat.id ? '#ffffff' : 'var(--color-text-secondary)'
                      }}
                      onClick={() => {
                        setSelectedCategoryFilter(cat.id);
                        fetchChatHistory(1, cat.id);
                      }}
                    >
                      <span>{cat.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id, cat.name);
                        }}
                        className="opacity-70 hover:opacity-100 hover:text-red-400 ml-1 cursor-pointer"
                        title={`Delete category ${cat.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10 SESSIONS LIST */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingHistory ? (
                  <div className="py-12 text-center text-xs flex items-center justify-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading chat sessions...
                  </div>
                ) : historySessions.length === 0 ? (
                  <div className="py-12 text-center text-xs space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                    <p>No chat history found under this category.</p>
                  </div>
                ) : (
                  historySessions.map((sess) => {
                    const isCurrentActive = sess.id === currentSessionId;
                    const dateFormatted = new Date(sess.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={sess.id}
                        onClick={() => handleSelectSession(sess)}
                        className="p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:scale-[1.01]"
                        style={{
                          backgroundColor: isCurrentActive ? 'var(--color-inner-dark)' : 'var(--color-card)',
                          borderColor: isCurrentActive ? 'var(--color-primary)' : 'var(--color-border)'
                        }}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {sess.category_name ? (
                              <span 
                                className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border flex items-center gap-1"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-emerald)'
                                }}
                              >
                                <Tag className="h-2.5 w-2.5" /> {sess.category_name}
                              </span>
                            ) : null}
                            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              {dateFormatted}
                            </span>
                          </div>

                          <h4 
                            className="font-bold text-xs truncate leading-snug"
                            style={{ color: isCurrentActive ? 'var(--color-primary)' : 'var(--color-text)' }}
                          >
                            {sess.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={sess.category_id || 'none'}
                            onChange={(e) => handleAssignCategory(sess.id, e.target.value)}
                            className="text-[10px] border rounded-lg px-2 py-1 outline-none font-medium appearance-none cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                            title="Assign to Category"
                          >
                            <option value="none">No Category</option>
                            {historyCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            className="p-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)'
                            }}
                            title="Delete this chat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PAGINATION */}
              {historyTotalPages > 1 && (
                <div 
                  className="pt-3 border-t flex items-center justify-between text-xs font-bold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <span>Page {historyPage} of {historyTotalPages}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => fetchChatHistory(historyPage - 1, selectedCategoryFilter)}
                      className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer shadow-xs"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => fetchChatHistory(num, selectedCategoryFilter)}
                        className="w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-xs"
                        style={historyPage === num ? {
                          backgroundColor: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)',
                          color: '#ffffff'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => fetchChatHistory(historyPage + 1, selectedCategoryFilter)}
                      className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer shadow-xs"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECIPE PREFERENCES MODAL */}
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
                <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
                  {t('recipePreferencesTitle', 'Recipe Preferences')}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
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
                          borderColor: 'var(--color-border)',
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

              <div className="space-y-2">
                <label className="block font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {t('tastesTitle', 'Tastes')}
                </label>
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

      {/* RECIPE DETAILS MODAL */}
      {showRecipeDetailsModal && selectedRecipeForModal && (
        <div 
          onClick={() => setShowRecipeDetailsModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-4 cursor-default animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-white shadow-xs"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Recommended
                  </span>
                  {selectedRecipeForModal.sourceUrl && (
                    <span 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-emerald)',
                        color: 'var(--color-emerald)'
                      }}
                    >
                      <Globe className="h-2.5 w-2.5" /> Primary Source
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black tracking-tight mt-1" style={{ color: 'var(--color-text)' }}>
                  {selectedRecipeForModal.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRecipeDetailsModal(false)}
                className="p-1.5 rounded-xl border transition cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs custom-scrollbar">
              {selectedRecipeForModal.image && (
                <img
                  src={selectedRecipeForModal.image}
                  alt={selectedRecipeForModal.title}
                  className="w-full h-44 rounded-2xl object-cover border shadow-xs"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              )}

              <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedRecipeForModal.description}
              </p>

              <div 
                className="flex items-center gap-4 p-3 rounded-2xl border font-bold text-xs"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-emerald)' }}>
                  <Clock className="h-3.5 w-3.5" /> {(selectedRecipeForModal.prepMinutes || 0) + (selectedRecipeForModal.cookMinutes || 0)} mins total
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {selectedRecipeForModal.servings || servings} servings
                </span>
                {selectedRecipeForModal.calories && (
                  <span className="font-mono text-emerald-500">{selectedRecipeForModal.calories} kcal</span>
                )}
              </div>

              {/* Ingredients List */}
              {Array.isArray(selectedRecipeForModal.ingredients) && selectedRecipeForModal.ingredients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    Ingredients ({selectedRecipeForModal.ingredients.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {selectedRecipeForModal.ingredients.map((ing: string, i: number) => (
                      <div 
                        key={i}
                        className="p-2 rounded-xl border text-[11px] font-medium flex items-center gap-2"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                        <span className="truncate">{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {Array.isArray(selectedRecipeForModal.instructions) && selectedRecipeForModal.instructions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    Instructions
                  </h4>
                  <div className="space-y-2">
                    {selectedRecipeForModal.instructions.map((step: string, sIdx: number) => (
                      <div 
                        key={sIdx}
                        className="p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <span 
                          className="w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-primary)',
                            color: 'var(--color-primary)'
                          }}
                        >
                          {sIdx + 1}
                        </span>
                        <p className="flex-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chef Tip */}
              {selectedRecipeForModal.chefTip && (
                <div 
                  className="p-3 rounded-2xl border text-xs leading-relaxed flex items-start gap-2"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-emerald)',
                    color: 'var(--color-emerald)'
                  }}
                >
                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                  <span><strong>Chef Tip:</strong> {selectedRecipeForModal.chefTip}</span>
                </div>
              )}
            </div>

            {/* Outbound Link & Close */}
            <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                {selectedRecipeForModal.sourceUrl && (
                  <a
                    href={selectedRecipeForModal.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View Source Recipe ↗</span>
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowRecipeDetailsModal(false)}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Close
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
