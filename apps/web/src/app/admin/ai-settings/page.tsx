// Generated / Updated by AI Collaborator
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Radio, Compass, ExternalLink, ChevronDown, ChevronUp, FileText, Search, Activity, CheckCircle2, XCircle, Loader2,
  Cpu, Key, Sliders, Sparkles, Globe, PackageCheck, 
  ShieldAlert, Check, RefreshCw, Bot, Zap, SlidersHorizontal, ListPlus, Trash2, Plus, Layers, FolderPlus, LayoutTemplate, Mic, Volume2, Settings, SlidersVertical, Eye, EyeOff, Calendar, Clock, Flame, Users, Copy, ToggleLeft, ToggleRight, BookOpen, BookA, Ban, X, CheckCircle
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';
import { applyThemeToDocument, fetchAndApplyServerTheme, getMemoryThemeColors, setMemoryThemeColors } from '@/lib/themeConfig';

interface QuestionnaireSection {
  id: string;
  topicTitle: string;
  description: string;
  enabled?: boolean;
  questions: string[];
}

export interface AiModelOption {
  id: string;
  name: string;
  label?: string;
  description?: string;
}

const DEFAULT_GEMINI_MODELS: AiModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash (Fast & Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', label: 'Gemini 2.5 Pro (Deep Reasoning)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', label: 'Gemini 3.6 Flash (Latest Standard)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', label: 'Gemini 1.5 Flash (Versatile & Stable)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', label: 'Gemini 1.5 Pro (Multimodal Long-Context)' }
];

const DEFAULT_OPENAI_MODELS: AiModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', label: 'GPT-4o (Omni High Intelligence)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', label: 'GPT-4o Mini (Fast & Cost-Efficient)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', label: 'GPT-4 Turbo (High Capacity)' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', label: 'GPT-3.5 Turbo (High Speed)' }
];

const DEFAULT_SECTIONS: QuestionnaireSection[] = [
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

export default function ChefAISettingsPage() {
  let t = (key: string, fallback?: string) => fallback || key;
  try {
    const langContext = useTranslation();
    if (langContext && typeof langContext.t === 'function') {
      t = langContext.t;
    }
  } catch (_) {}

  const [activeTab, setActiveTab] = useState<'general' | 'questionnaire' | 'voice' | 'advanced'>('general');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // AI Configurations & Dynamic Models
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [geminiModelsList, setGeminiModelsList] = useState<AiModelOption[]>(DEFAULT_GEMINI_MODELS);
  const [openaiModelsList, setOpenaiModelsList] = useState<AiModelOption[]>(DEFAULT_OPENAI_MODELS);
  const [syncingModels, setSyncingModels] = useState(false);

  const modelRef = useRef(model);
  modelRef.current = model;

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are Chef Foodie, an expert autonomous culinary AI assistant. You can handle any questions the user asks, but you must strictly focus on and prioritize the selected Knowledge Base, custom vocabulary, filter words, and dietary preferences when generating culinary or meal planning responses.'
  );
  const [envKeysMap, setEnvKeysMap] = useState<Record<string, string>>({});
  const [syncingEnvKey, setSyncingEnvKey] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Capabilities
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enablePantryContext, setEnablePantryContext] = useState(true);
  const [strictDietEnforcement, setStrictDietEnforcement] = useState(true);
  const [maxPlanDays, setMaxPlanDays] = useState(7);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'compact' | 'detailed'>('card');
  
  // Voice Interaction Settings
  const [enableVoiceInteraction, setEnableVoiceInteraction] = useState(true);
  const [voiceEngine, setVoiceEngine] = useState<'version1' | 'version2'>('version2');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceAutoPlay, setVoiceAutoPlay] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState('en-US-Neural2-F');

  // Agent Parameters: Knowledge Base, Custom Vocabulary, Filter Words
  const [knowledgeBaseList, setKnowledgeBaseList] = useState<string[]>(['Culinary Masterclass DB v2', 'Nutritional Guidelines 2026']);
  const [newKbInput, setNewKbInput] = useState('');

  const [customVocabularyList, setCustomVocabularyList] = useState<string[]>(['Umami', 'Sous-vide', 'Macronutrients', 'Batch-cooking']);
  const [newVocabInput, setNewVocabInput] = useState('');

  const [filterWordsList, setFilterWordsList] = useState<string[]>(['Oily', 'Artificial preservatives', 'Unhealthy trans fats']);
  const [newFilterInput, setNewFilterInput] = useState('');

  // Recommended Recipes Url (Primary source for /chef)
  const [recommendedRecipeUrls, setRecommendedRecipeUrls] = useState<string[]>([]);
  const [newRecipeUrlInput, setNewRecipeUrlInput] = useState('');

  // Index Link Crawler & Slug Discovery State
  const [crawlingUrl, setCrawlingUrl] = useState<string | null>(null);
  const [crawlResults, setCrawlResults] = useState<Record<string, {
    count: number;
    discovered: { url: string; slug: string; title: string }[];
    crawledAt: string;
  }>>({});
  const [expandedIndexUrl, setExpandedIndexUrl] = useState<string | null>(null);
  const [previewRecipeData, setPreviewRecipeData] = useState<any | null>(null);
  const [isPullingRecipe, setIsPullingRecipe] = useState(false);
  const [selectedSlugUrl, setSelectedSlugUrl] = useState<string | null>(null);

  // Multi-Topic Questionnaire State
  const [sections, setSections] = useState<QuestionnaireSection[]>(DEFAULT_SECTIONS);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string>('sec_core');
  const [newQuestionText, setNewQuestionText] = useState('');

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dynamic Theme Synchronization
  const applySavedTheme = useCallback((incomingColors?: any) => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const root = document.documentElement;
      const isDay = mode === 'light' || mode === 'day' || root.classList.contains('light');
      setIsDayMode(isDay);

      let colors = incomingColors || (typeof getMemoryThemeColors === 'function' ? getMemoryThemeColors() : null);
      if (!colors && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
          if (stored) colors = JSON.parse(stored);
        } catch (_) {}
      }

      if (colors && Object.keys(colors).length > 0) {
        if (typeof setMemoryThemeColors === 'function') setMemoryThemeColors(colors);
        if (typeof applyThemeToDocument === 'function') applyThemeToDocument(colors);
      } else if (typeof fetchAndApplyServerTheme === 'function') {
        fetchAndApplyServerTheme();
      }

      if (isDay) {
        root.classList.remove('dark');
        root.classList.add('light');
        if (document.body) {
          document.body.style.backgroundColor = 'var(--color-bg)';
          document.body.style.color = 'var(--color-text)';
        }
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        const bg = colors?.backgroundColor || colors?.backgroundDark || 'var(--color-bg)';
        if (document.body) {
          document.body.style.backgroundColor = bg;
          document.body.style.color = colors?.textColor || 'var(--color-text)';
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    applySavedTheme();

    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const theme = data?.themeColors || data?.settings?.themeColors || data?.theme_colors;
        if (theme && Object.keys(theme).length > 0) {
          localStorage.setItem('zecratary_theme_colors', JSON.stringify(theme));
          applySavedTheme(theme);
        }
      })
      .catch(() => {});

    const handleThemeEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail === 'object' && Object.keys(detail).length > 0) {
        applySavedTheme(detail);
      } else {
        const activeMemory = typeof getMemoryThemeColors === 'function' ? getMemoryThemeColors() : null;
        if (activeMemory) {
          applySavedTheme(activeMemory);
        } else {
          applySavedTheme();
        }
      }
    };

    window.addEventListener('zecratary_theme_updated', handleThemeEvent);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeEvent);
    window.addEventListener('zecratary_theme_changed', handleThemeEvent);
    window.addEventListener('zecratary_admin_settings_updated', handleThemeEvent);
    window.addEventListener('storage', handleThemeEvent);

    return () => {
      window.removeEventListener('zecratary_theme_updated', handleThemeEvent);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeEvent);
      window.removeEventListener('zecratary_theme_changed', handleThemeEvent);
      window.removeEventListener('zecratary_admin_settings_updated', handleThemeEvent);
      window.removeEventListener('storage', handleThemeEvent);
    };
  }, [applySavedTheme]);

  // Fetch API Keys from .env / PostgreSQL
  const fetchEnvKeys = async () => {
    try {
      const res = await fetch('/api/admin/keys?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const map: Record<string, string> = { ...(data.envMap || {}) };
        if (Array.isArray(data.keys)) {
          data.keys.forEach((k: any) => {
            if (k.envKey && k.keyValue) {
              map[k.envKey] = k.keyValue;
              const u = k.envKey.toUpperCase();
              if (u.includes('GEMINI')) {
                map['GEMINI_API_KEY'] = k.keyValue;
              }
              if (u.includes('OPENAI')) {
                map['OPENAI_API_KEY'] = k.keyValue;
              }
            }
          });
        }
        setEnvKeysMap(map);
        return map;
      }
    } catch (e) {
      console.error('Failed to load .env keys:', e);
    }
    return {};
  };

  // Load Settings Exclusively from Server Storage
  const loadSettingsFromServer = useCallback(async () => {
    purgeLegacyBrowserAdminStorage();
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData) {
        const c = serverData.chefAiSettings || serverData.aiSettings || serverData;
        if (c.provider) setProvider(c.provider);
        else if (serverData.aiProvider) setProvider(serverData.aiProvider);

        if (c.apiKey !== undefined && c.apiKey) setApiKey(c.apiKey);

        if (Array.isArray(c.availableGeminiModels) && c.availableGeminiModels.length > 0) {
          setGeminiModelsList(c.availableGeminiModels);
        }
        if (Array.isArray(c.availableOpenAiModels) && c.availableOpenAiModels.length > 0) {
          setOpenaiModelsList(c.availableOpenAiModels);
        }

        const resolvedSavedModel = c.model || serverData.aiModel || serverData.model;
        if (resolvedSavedModel) {
          setModel(resolvedSavedModel);
          modelRef.current = resolvedSavedModel;
        }

        if (c.temperature !== undefined) setTemperature(c.temperature);
        if (c.maxTokens !== undefined) setMaxTokens(c.maxTokens);
        if (c.systemPrompt !== undefined) setSystemPrompt(c.systemPrompt);
        if (c.enableWebSearch !== undefined) setEnableWebSearch(c.enableWebSearch);
        if (c.enablePantryContext !== undefined) setEnablePantryContext(c.enablePantryContext);
        if (c.strictDietEnforcement !== undefined) setStrictDietEnforcement(c.strictDietEnforcement);
        if (c.maxPlanDays !== undefined) setMaxPlanDays(c.maxPlanDays);
        if (c.resultDisplayMode !== undefined) setResultDisplayMode(c.resultDisplayMode);
        
        if (c.enableVoiceInteraction !== undefined) setEnableVoiceInteraction(c.enableVoiceInteraction);
        if (c.voiceEngine !== undefined) setVoiceEngine(c.voiceEngine);
        if (c.voiceSpeed !== undefined) setVoiceSpeed(c.voiceSpeed);
        if (c.voiceAutoPlay !== undefined) setVoiceAutoPlay(c.voiceAutoPlay);
        if (c.selectedVoiceName !== undefined) setSelectedVoiceName(c.selectedVoiceName);

        if (Array.isArray(c.knowledgeBaseList)) setKnowledgeBaseList(c.knowledgeBaseList);
        if (Array.isArray(c.customVocabularyList)) setCustomVocabularyList(c.customVocabularyList);
        if (Array.isArray(c.filterWordsList)) setFilterWordsList(c.filterWordsList);
        if (c.discoveredRecipesCache && typeof c.discoveredRecipesCache === 'object') setCrawlResults(c.discoveredRecipesCache);

        if (Array.isArray(c.recommendedRecipeUrls)) {
          setRecommendedRecipeUrls(c.recommendedRecipeUrls.filter(Boolean));
        } else if (Array.isArray(c.recommendedRecipesUrls)) {
          setRecommendedRecipeUrls(c.recommendedRecipesUrls.filter(Boolean));
        } else if (Array.isArray(serverData.recommendedRecipeUrls)) {
          setRecommendedRecipeUrls(serverData.recommendedRecipeUrls.filter(Boolean));
        }

        if (Array.isArray(c.sections) && c.sections.length > 0) {
          setSections(c.sections.map((s: any) => ({ ...s, enabled: s.enabled !== false })));
        }
      }
    } catch (err) {
      console.error('[ChefAISettings] Failed to load server settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchEnvKeys();
    loadSettingsFromServer();
  }, [loadSettingsFromServer]);

  const handleProviderChange = (newProvider: 'gemini' | 'openai') => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      const activeGemini = geminiModelsList.length > 0 ? geminiModelsList[0].id : 'gemini-2.5-flash';
      setModel(activeGemini);
      modelRef.current = activeGemini;
      if (envKeysMap['GEMINI_API_KEY'] && !apiKey.trim()) {
        setApiKey(envKeysMap['GEMINI_API_KEY']);
      }
    } else {
      const activeOpenAI = openaiModelsList.length > 0 ? openaiModelsList[0].id : 'gpt-4o';
      setModel(activeOpenAI);
      modelRef.current = activeOpenAI;
      if (envKeysMap['OPENAI_API_KEY'] && !apiKey.trim()) {
        setApiKey(envKeysMap['OPENAI_API_KEY']);
      }
    }
  };

  const handleSyncModels = async () => {
    const keyToQuery = apiKey.trim() || envKeysMap[provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'] || '';
    setSyncingModels(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: keyToQuery })
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.models) && data.models.length > 0) {
        let currentActive = modelRef.current || model;
        if (provider === 'gemini') {
          setGeminiModelsList(data.models);
          if (!data.models.some((m: any) => m.id === currentActive)) {
            currentActive = data.models[0].id;
            setModel(currentActive);
            modelRef.current = currentActive;
          }
        } else {
          setOpenaiModelsList(data.models);
          if (!data.models.some((m: any) => m.id === currentActive)) {
            currentActive = data.models[0].id;
            setModel(currentActive);
            modelRef.current = currentActive;
          }
        }
        setTestResult({
          success: true,
          message: `${t('modelsSyncedNotice', 'Synced latest models dynamically')}: ${data.models.length} ${t('modelsFound', 'models discovered')}.`
        });

        await persistServerAdminSettings({
          aiProvider: provider,
          aiModel: currentActive,
          chefAiSettings: {
            provider,
            model: currentActive,
            apiKey: keyToQuery,
            availableGeminiModels: provider === 'gemini' ? data.models : geminiModelsList,
            availableOpenAiModels: provider === 'openai' ? data.models : openaiModelsList,
            updatedAt: new Date().toISOString()
          }
        });
      } else {
        setTestResult({ success: false, message: data.error || t('failedToRetrieveModels', 'Failed to retrieve models from provider API.') });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || t('modelSyncError', 'Error connecting to model registry.') });
    } finally {
      setSyncingModels(false);
    }
  };

  const handleTestApiKey = async () => {
    const keyToTest = apiKey.trim() || envKeysMap[provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'] || '';
    setTestingKey(true);
    setTestResult(null);

    try {
      const activeModelToTest = modelRef.current || model;
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest,
          model: activeModelToTest
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
        if (Array.isArray(data.models) && data.models.length > 0) {
          if (provider === 'gemini') {
            setGeminiModelsList(data.models);
          } else {
            setOpenaiModelsList(data.models);
          }
        }
      } else {
        setTestResult({ success: false, message: data.error || t('connectionFailed', 'Connection test failed.') });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || t('verificationEndpointError', 'Could not reach verification endpoint.') });
    } finally {
      setTestingKey(false);
    }
  };

  const autoConnectGemini = async () => {
    setAutoConnecting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/keys?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      let resolvedKey = apiKey.trim();

      if (data.success && Array.isArray(data.keys)) {
        const geminiEntry = data.keys.find((k: any) => k.envKey === 'GEMINI_API_KEY' || k.provider?.includes('Gemini'));
        if (geminiEntry && geminiEntry.keyValue && !geminiEntry.keyValue.includes('sample')) {
          resolvedKey = geminiEntry.keyValue.trim();
          setApiKey(resolvedKey);
        }
      }

      const activeModelToPreserve = modelRef.current || model || 'gemini-2.5-flash';
      const testRes = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          apiKey: resolvedKey,
          model: activeModelToPreserve
        })
      });

      const testData = await testRes.json().catch(() => ({}));

      if (testRes.ok && testData.success) {
        if (Array.isArray(testData.models) && testData.models.length > 0) {
          setGeminiModelsList(testData.models);
        }

        setTestResult({ success: true, message: testData.message || `Connected to Google Gemini & dynamic models synced!` });

        await persistServerAdminSettings({
          aiProvider: 'gemini',
          aiModel: activeModelToPreserve,
          chefAiSettings: {
            provider: 'gemini',
            apiKey: resolvedKey,
            model: activeModelToPreserve,
            availableGeminiModels: testData.models || geminiModelsList,
            updatedAt: new Date().toISOString()
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          window.dispatchEvent(new Event('zecratary_settings_updated'));
        }
      } else {
        setTestResult({ success: false, message: testData.error || t('geminiHandshakeFailed', 'Gemini handshake failed.') });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || t('autoConnectionError', 'Auto-connection error.') });
    } finally {
      setAutoConnecting(false);
    }
  };

  const handleReloadEnvKey = async () => {
    setSyncingEnvKey(true);
    setTestResult(null);
    try {
      const map = await fetchEnvKeys();
      const resolvedGemini = map['GEMINI_API_KEY'] || map['GOOGLE_AI_KEY'] || map['GOOGLE_API_KEY'] || '';
      const resolvedOpenAI = map['OPENAI_API_KEY'] || '';
      const targetKey = provider === 'gemini' ? resolvedGemini : resolvedOpenAI;

      if (targetKey && targetKey.trim().length > 5) {
        const cleanKey = targetKey.trim();
        const activeModel = modelRef.current || model;
        setApiKey(cleanKey);
        setTestResult({
          success: true,
          message: `Synced ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} key (${cleanKey.substring(0, 8)}...) from .env successfully!`
        });

        await persistServerAdminSettings({
          aiProvider: provider,
          aiModel: activeModel,
          chefAiSettings: {
            apiKey: cleanKey,
            provider,
            model: activeModel
          }
        });
      } else {
        setTestResult({
          success: false,
          message: `No active ${provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} found in your local .env file.`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Sync error: ' + (err?.message || 'Could not read from backend.')
      });
    } finally {
      setTimeout(() => setSyncingEnvKey(false), 500);
    }
  };

  // Agent Parameter Handlers
  const handleAddKnowledgeBase = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newKbInput.trim();
    if (!clean) return;
    if (!knowledgeBaseList.includes(clean)) {
      setKnowledgeBaseList([...knowledgeBaseList, clean]);
    }
    setNewKbInput('');
  };

  const handleRemoveKnowledgeBase = (idx: number) => {
    setKnowledgeBaseList(knowledgeBaseList.filter((_, i) => i !== idx));
  };

  const handleAddCustomVocabulary = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newVocabInput.trim();
    if (!clean) return;
    if (!customVocabularyList.includes(clean)) {
      setCustomVocabularyList([...customVocabularyList, clean]);
    }
    setNewVocabInput('');
  };

  const handleRemoveCustomVocabulary = (idx: number) => {
    setCustomVocabularyList(customVocabularyList.filter((_, i) => i !== idx));
  };

  const handleAddFilterWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newFilterInput.trim();
    if (!clean) return;
    if (!filterWordsList.includes(clean)) {
      setFilterWordsList([...filterWordsList, clean]);
    }
    setNewFilterInput('');
  };

  const handleRemoveFilterWord = (idx: number) => {
    setFilterWordsList(filterWordsList.filter((_, i) => i !== idx));
  };

  // Recommended Recipes Url Handlers
  const handleAddRecommendedUrls = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = newRecipeUrlInput.trim();
    if (!raw) return;

    const entries = raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const cleanedUrls: string[] = [];
    for (let entry of entries) {
      if (!/^https?:\/\//i.test(entry)) {
        entry = 'https://' + entry;
      }
      try {
        new URL(entry);
        if (!recommendedRecipeUrls.includes(entry) && !cleanedUrls.includes(entry)) {
          cleanedUrls.push(entry);
        }
      } catch (_) {}
    }

    if (cleanedUrls.length > 0) {
      setRecommendedRecipeUrls([...recommendedRecipeUrls, ...cleanedUrls]);
      setNewRecipeUrlInput('');
    }
  };

  const handleRemoveRecommendedUrl = (idx: number) => {
    setRecommendedRecipeUrls(recommendedRecipeUrls.filter((_, i) => i !== idx));
  };

  // Crawl Index Links & Discover Slugs Handler
  const handleCrawlIndexUrl = async (targetUrl: string) => {
    setCrawlingUrl(targetUrl);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/crawl-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crawl', url: targetUrl })
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.discovered)) {
        const updated = {
          ...crawlResults,
          [targetUrl]: {
            count: data.count || data.discovered.length,
            discovered: data.discovered,
            crawledAt: new Date().toISOString()
          }
        };
        setCrawlResults(updated);
        setExpandedIndexUrl(targetUrl);
        setTestResult({
          success: true,
          message: `${t('crawlSuccessNotice', 'Crawled index successfully')}: ${data.discovered.length} ${t('recipeSlugsDiscovered', 'recipe slugs discovered from')} ${new URL(targetUrl).hostname}!`
        });

        await persistServerAdminSettings({
          chefAiSettings: {
            discoveredRecipesCache: updated
          }
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || t('crawlFailedNotice', 'Failed to discover recipe links from index URL.')
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || t('crawlErrorNotice', 'Error connecting to index crawler.')
      });
    } finally {
      setCrawlingUrl(null);
    }
  };

  const handlePullIndividualRecipe = async (recipeUrl: string) => {
    setIsPullingRecipe(true);
    setSelectedSlugUrl(recipeUrl);
    setPreviewRecipeData(null);
    try {
      const res = await fetch('/api/admin/crawl-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', recipeUrl })
      });
      const data = await res.json();
      if (res.ok && data.success && data.recipe) {
        setPreviewRecipeData(data.recipe);
      } else {
        alert(data.error || t('pullRecipeFailed', 'Failed to pull recipe details from slug.'));
      }
    } catch (err: any) {
      alert(err.message || t('pullRecipeError', 'Error pulling individual recipe.'));
    } finally {
      setIsPullingRecipe(false);
    }
  };

  const handleAddDiscoveredAsDirectUrl = (recipeUrl: string) => {
    if (!recommendedRecipeUrls.includes(recipeUrl)) {
      setRecommendedRecipeUrls([...recommendedRecipeUrls, recipeUrl]);
      alert(t('addedDirectUrlSuccess', 'Recipe URL added to Recommended Recipes as a primary source!'));
    } else {
      alert(t('alreadyInListNotice', 'This recipe URL is already in your recommended list.'));
    }
  };

  const handleClearAllRecommendedUrls = () => {
    if (confirm(t('confirmClearAllUrls', 'Clear all recommended recipe URLs?'))) {
      setRecommendedRecipeUrls([]);
    }
  };

  const handleAddTopicSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    const newSec: QuestionnaireSection = {
      id: 'sec_' + Date.now(),
      topicTitle: newTopicTitle.trim(),
      description: newTopicDesc.trim() || 'Custom questionnaire topic section.',
      enabled: true,
      questions: []
    };
    setSections([...sections, newSec]);
    setActiveTopicId(newSec.id);
    setNewTopicTitle('');
    setNewTopicDesc('');
  };

  const handleDeleteSection = (secId: string) => {
    if (sections.length <= 1) {
      alert(t('retainOneTopicWarning', 'You must retain at least one questionnaire topic.'));
      return;
    }
    const updated = sections.filter(s => s.id !== secId);
    setSections(updated);
    if (activeTopicId === secId && updated.length > 0) {
      setActiveTopicId(updated[0].id);
    }
  };

  const handleToggleSectionEnabled = (secId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(sections.map(sec => {
      if (sec.id === secId) {
        return { ...sec, enabled: sec.enabled === false ? true : false };
      }
      return sec;
    }));
  };

  const handleAddQuestionToTopic = (secId: string) => {
    if (!newQuestionText.trim()) return;
    setSections(sections.map(sec => {
      if (sec.id === secId) {
        return { ...sec, questions: [...sec.questions, newQuestionText.trim()] };
      }
      return sec;
    }));
    setNewQuestionText('');
  };

  const handleRemoveQuestionFromTopic = (secId: string, qIndex: number) => {
    setSections(sections.map(sec => {
      if (sec.id === secId) {
        return { ...sec, questions: sec.questions.filter((_, i) => i !== qIndex) };
      }
      return sec;
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const cleanApiKey = apiKey.trim();
    const activeModel = modelRef.current || model;

    // Preserve active theme configuration during AI settings persistence
    let currentTheme = typeof getMemoryThemeColors === 'function' ? getMemoryThemeColors() : null;
    if (!currentTheme && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
        if (stored) currentTheme = JSON.parse(stored);
      } catch (_) {}
    }

    const config = {
      provider,
      apiKey: cleanApiKey,
      model: activeModel,
      availableGeminiModels: geminiModelsList,
      availableOpenAiModels: openaiModelsList,
      temperature,
      maxTokens,
      systemPrompt,
      enableWebSearch,
      enablePantryContext,
      strictDietEnforcement,
      maxPlanDays,
      resultDisplayMode,
      enableVoiceInteraction,
      voiceEngine,
      voiceSpeed,
      voiceAutoPlay,
      selectedVoiceName,
      knowledgeBaseList,
      customVocabularyList,
      filterWordsList,
      recommendedRecipeUrls,
      discoveredRecipesCache: crawlResults,
      sections,
      updatedAt: new Date().toISOString()
    };

    const activeFlattenedQuestions = sections
      .filter(s => s.enabled !== false)
      .flatMap(s => s.questions);

    try {
      await persistServerAdminSettings({
        aiProvider: provider,
        aiModel: activeModel,
        chefAiSettings: config,
        recommendedRecipeUrls,
        chefQuestionnaire: activeFlattenedQuestions,
        themeColors: currentTheme
      });

      if (cleanApiKey) {
        try {
          await fetch('/api/admin/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: provider === 'gemini' ? 'Google Gemini Production' : 'OpenAI GPT-4o',
              provider,
              envKey: provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY',
              keyValue: cleanApiKey,
              model: activeModel,
              status: 'active'
            })
          });
        } catch (_) {}
      }

      setSaved(true);
      setTestResult({
        success: true,
        message: `${t('settingsSavedSuccess', 'Configuration saved & synchronized successfully!')} (${provider === 'gemini' ? 'Gemini' : 'OpenAI'} • ${activeModel})`
      });

      if (typeof window !== 'undefined') {
        if (currentTheme) {
          setMemoryThemeColors(currentTheme);
          applyThemeToDocument(currentTheme);
          window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: currentTheme }));
        }
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        window.dispatchEvent(new Event('zecratary_engine_config_updated'));
        window.dispatchEvent(new Event('zecratary_chef_ai_settings_updated'));
        window.dispatchEvent(new Event('zecratary_settings_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSection = sections.find(s => s.id === activeTopicId) || sections[0];
  const activeModelsList = provider === 'gemini' ? geminiModelsList : openaiModelsList;
  const currentModelInList = activeModelsList.some(m => m.id === model);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 font-sans px-2 sm:px-4 pt-2 transition-colors duration-200"
      style={{ 
        color: 'var(--color-text)',
        transition: 'background-color 200ms ease, color 200ms ease'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .settings-input:-webkit-autofill,
        .settings-input:-webkit-autofill:hover,
        .settings-input:-webkit-autofill:focus,
        .settings-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          -webkit-text-fill-color: var(--color-text) !important;
          caret-color: var(--color-text) !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
      `}} />

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Settings className="h-6 w-6" style={{ color: 'var(--color-primary)' }} /> {t('aiAssistantConfigTitle', 'AI Assistant Configuration')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('aiAssistantConfigSubtitle', 'Update settings and functional AI provider models for the')} <span className="font-mono font-bold" style={{ color: 'var(--color-primary)' }}>/chef</span> {t('agentSuffix', 'agent')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && (
            <span 
              className="border px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              <Loader2 className="h-4 w-4 animate-spin" /> {t('saving', 'Saving...')}
            </span>
          )}
          {saveError && (
            <span 
              className="border px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in shadow-xs border-red-500/50 text-red-500"
              style={{ backgroundColor: 'var(--color-inner-dark)' }}
            >
              <XCircle className="h-4 w-4" /> {saveError}
            </span>
          )}
          {saved && (
            <span 
              className="border px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-emerald)',
                color: 'var(--color-emerald)'
              }}
            >
              <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('settingsAppliedSynced', 'Settings Applied & Synced')}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-primary)',
              boxShadow: '0 8px 20px -4px rgba(224, 86, 56, 0.3)'
            }}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>{isSaving ? t('savingBtn', 'Saving...') : t('saveConfigurationBtn', 'Save Configuration')}</span>
          </button>
        </div>
      </div>

      {/* HORIZONTAL CONFIGURATION TABS */}
      <div className="flex border-b gap-6 overflow-x-auto transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { id: 'general', label: t('tabGeneralConfig', 'General AI Configuration'), icon: Cpu },
          { id: 'questionnaire', label: `${t('tabQuestionnaires', 'Multi-Topic Questionnaires')} (${sections.filter(s => s.enabled !== false).length}/${sections.length} Active)`, icon: Layers },
          { id: 'voice', label: t('tabVoiceInteraction', 'Voice Interaction'), icon: Mic },
          { id: 'advanced', label: t('tabAgentParameters', 'Agent Parameters'), icon: SlidersHorizontal },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
                isActive ? '' : 'border-transparent hover:opacity-80'
              }`}
              style={{
                borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        
        {/* TAB 1: GENERAL & MODEL CONFIG */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in">
            <div 
              className="border rounded-3xl p-6 space-y-5 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 
                    className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <Sparkles className="h-4 w-4" /> {t('aiEngineProviderTitle', 'AI Engine Provider & Model Selection')}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('aiEngineProviderDesc', 'Select your active AI provider and model version. This choice controls which model processes prompts in')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>/api/ai</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={autoConnectGemini}
                    disabled={autoConnecting}
                    className="border font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-xs hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                    title="Auto-connect and sync Gemini API key and models"
                  >
                    <Radio className={`h-3 w-3 ${autoConnecting ? 'animate-pulse' : ''}`} style={{ color: autoConnecting ? '#f59e0b' : 'var(--color-primary)' }} />
                    <span>{autoConnecting ? t('connecting', 'Connecting...') : t('autoConnectGemini', 'Auto-Connect Gemini')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReloadEnvKey}
                    className="border font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title="Reload API Key from .env"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingEnvKey ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald)' }} />
                    <span>{t('syncFromEnv', 'Sync from .env')}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => handleProviderChange('gemini')}
                  className="p-4 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3.5 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: provider === 'gemini' ? 'var(--color-primary)' : 'var(--color-border)',
                    color: provider === 'gemini' ? 'var(--color-text)' : 'var(--color-text-secondary)'
                  }}
                >
                  <Bot className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <span className="block font-bold text-sm" style={{ color: 'var(--color-text)' }}>Google Gemini</span>
                    <span className="text-[11px] opacity-75">Gemini 2.5 Pro / Flash / 3.6 / 1.5</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderChange('openai')}
                  className="p-4 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3.5 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: provider === 'openai' ? 'var(--color-emerald)' : 'var(--color-border)',
                    color: provider === 'openai' ? 'var(--color-text)' : 'var(--color-text-secondary)'
                  }}
                >
                  <Zap className="h-5 w-5 shrink-0" style={{ color: 'var(--color-emerald)' }} />
                  <div>
                    <span className="block font-bold text-sm" style={{ color: 'var(--color-text)' }}>OpenAI GPT</span>
                    <span className="text-[11px] opacity-75">GPT-4o / GPT-4 Turbo / o1</span>
                  </div>
                </button>
              </div>

              <div className="pt-2 space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('apiKeyLabel', 'API Key')}</label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                      {provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                      placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                      className="settings-input w-full border rounded-xl px-4 py-3 pr-36 font-mono text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 transition cursor-pointer"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestApiKey}
                        disabled={testingKey}
                        className="px-2.5 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md disabled:opacity-50 hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        title="Test API Key connection live and sync models"
                      >
                        {testingKey ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{t('testing', 'Testing...')}</span>
                          </>
                        ) : (
                          <>
                            <Activity className="h-3 w-3" />
                            <span>{t('testConnection', 'Test Connection')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div 
                      className="mt-2 p-3 rounded-xl border text-xs font-semibold flex items-start gap-2.5 animate-in fade-in shadow-xs transition-colors duration-200"
                      style={{
                        borderColor: testResult.success ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
                        color: testResult.success ? 'var(--color-emerald)' : '#ef4444',
                        backgroundColor: 'var(--color-inner-dark)'
                      }}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-emerald)' }} />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{testResult.message}</span>
                    </div>
                  )}
                  <span className="text-[10px] mt-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('persistedServerSyncNotice', 'Persisted directly to server storage and synced to disk environment.')}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('modelVersionIdentifier', 'Model Version Identifier')}
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncModels}
                      disabled={syncingModels}
                      className="border font-bold text-[10px] px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)'
                      }}
                      title="Query live Gemini API catalog and update dropdown"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncingModels ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
                      <span>{syncingModels ? t('syncingModels', 'Syncing Models...') : t('syncModelsFromApi', 'Sync Models from API')}</span>
                    </button>
                  </div>

                  <select
                    value={model}
                    onChange={(e) => {
                      const sel = e.target.value;
                      setModel(sel);
                      modelRef.current = sel;
                    }}
                    className="w-full border rounded-xl px-4 py-3 outline-none cursor-pointer transition font-medium"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {!currentModelInList && model && (
                      <option value={model} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {model} ({t('currentlyConfigured', 'Current Configured')})
                      </option>
                    )}
                    {activeModelsList.map((m) => (
                      <option key={m.id} value={m.id} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {m.label || m.name || m.id}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{t('activeModelEndpointDesc', 'Active model endpoint used during AI prompt generation.')}</span>
                    <span className="font-semibold" style={{ color: 'var(--color-emerald)' }}>
                      {activeModelsList.length} {t('modelsAvailableDynamically', 'models available dynamically')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-TOPIC QUESTIONNAIRE BUILDER */}
        {activeTab === 'questionnaire' && (
          <div className="space-y-6 animate-in fade-in">
            <div 
              className="border rounded-3xl p-6 space-y-5 shadow-sm text-xs transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 
                    className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <Layers className="h-4 w-4" /> {t('questionnaireManagerTitle', 'Multi-Topic Questionnaire & Wizard Manager')}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('questionnaireManagerDesc', 'Organize intake questions into categorized topics. Use the enable/disable toggle on each topic to include or exclude it from the')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>/chef</span> {t('intakeWizard', 'intake wizard.')}
                  </p>
                </div>
                <span 
                  className="border px-3 py-1 rounded-full font-bold text-xs shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {sections.filter(s => s.enabled !== false).length}/{sections.length} {t('topicsActiveBadge', 'Topics Active')}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                <div className="lg:col-span-5 space-y-3">
                  <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('questionnaireTopicsHeader', 'Questionnaire Topics')}
                  </label>
                  
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {sections.map((sec) => {
                      const isActive = sec.id === activeTopicId;
                      const isEnabled = sec.enabled !== false;
                      return (
                        <div
                          key={sec.id}
                          onClick={() => setActiveTopicId(sec.id)}
                          className="p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                            opacity: isEnabled ? 1 : 0.65
                          }}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2 flex-1">
                            <div className="font-bold text-xs truncate flex items-center justify-between" style={{ color: 'var(--color-text)' }}>
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isEnabled ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                                <span className="truncate">{sec.topicTitle}</span>
                              </span>
                              <span 
                                className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 border"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: isEnabled ? 'var(--color-emerald)' : 'var(--color-border)',
                                  color: isEnabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
                                }}
                              >
                                {isEnabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                              </span>
                            </div>
                            <p className="text-[10px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{sec.description}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-2 border-l" style={{ borderColor: 'var(--color-border)' }}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleSectionEnabled(sec.id, e)}
                              className="p-1 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              title={isEnabled ? 'Disable topic' : 'Enable topic'}
                            >
                              {isEnabled ? (
                                <ToggleRight className="h-6 w-6" style={{ color: 'var(--color-emerald)' }} />
                              ) : (
                                <ToggleLeft className="h-6 w-6 text-slate-400" />
                              )}
                            </button>

                            {sections.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }}
                                className="p-1 rounded-lg hover:text-red-500 transition cursor-pointer"
                                style={{ color: 'var(--color-text-secondary)' }}
                                title="Delete topic section"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div 
                    className="p-4 rounded-2xl border space-y-3 mt-4 transition-colors duration-200"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                      <FolderPlus className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('addNewTopicHeader', 'Add New Questionnaire Topic')}
                    </span>
                    <input
                      type="text"
                      placeholder={t('topicTitlePlaceholder', 'Topic Title (e.g. Fitness & Macros)...')}
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      className="settings-input w-full border rounded-xl px-3 py-2 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                    <input
                      type="text"
                      placeholder={t('topicDescPlaceholder', 'Topic Description...')}
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                      className="settings-input w-full border rounded-xl px-3 py-2 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                    <button
                      type="button"
                      onClick={handleAddTopicSection}
                      disabled={!newTopicTitle.trim()}
                      className="w-full text-white font-bold py-2 rounded-xl transition text-xs disabled:opacity-40 cursor-pointer shadow-md"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {t('createTopicBtn', 'Create Topic Category')}
                    </button>
                  </div>
                </div>

                <div 
                  className="lg:col-span-7 border rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    opacity: activeSection?.enabled !== false ? 1 : 0.7
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <ListPlus className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} /> 
                          <input
                            type="text"
                            value={activeSection?.topicTitle || ''}
                            onChange={(e) => {
                              const newTitle = e.target.value;
                              setSections(sections.map(s => s.id === activeSection?.id ? { ...s, topicTitle: newTitle } : s));
                            }}
                            className="font-bold text-sm bg-transparent border-b border-transparent hover:border-slate-400 focus:border-[var(--color-primary)] outline-none min-w-[200px] transition-colors truncate"
                            style={{ color: 'var(--color-text)' }}
                            placeholder="Topic Title..."
                            title="Edit Topic Title"
                          />
                          <span 
                            className="text-[9px] px-2 py-0.5 rounded font-extrabold uppercase shrink-0 border"
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: activeSection?.enabled !== false ? 'var(--color-emerald)' : 'var(--color-border)',
                              color: activeSection?.enabled !== false ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
                            }}
                          >
                            {activeSection?.enabled !== false ? t('statusActive', 'Status: Active') : t('statusDisabled', 'Status: Disabled')}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={activeSection?.description || ''}
                          onChange={(e) => {
                            const newDesc = e.target.value;
                            setSections(sections.map(s => s.id === activeSection?.id ? { ...s, description: newDesc } : s));
                          }}
                          className="text-[11px] bg-transparent border-b border-transparent hover:border-slate-400 focus:border-[var(--color-primary)] outline-none w-full transition-colors truncate"
                          style={{ color: 'var(--color-text-secondary)' }}
                          placeholder="Topic Description..."
                          title="Edit Topic Description"
                        />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        {activeSection?.questions.length || 0} {t('questionsCount', 'Questions')}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {activeSection?.questions.length === 0 ? (
                        <div className="text-center py-8 text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
                          {t('noQuestionsYet', 'No questions in this topic yet. Add one below.')}
                        </div>
                      ) : (
                        activeSection?.questions.map((qText, qIdx) => (
                          <div 
                            key={qIdx} 
                            className="flex items-center gap-2.5 border rounded-xl p-3 shadow-xs"
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            <span 
                              className="w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-primary)',
                                color: 'var(--color-primary)'
                              }}
                            >
                              {qIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={qText}
                              onChange={(e) => {
                                const updatedQ = e.target.value;
                                setSections(sections.map(s => {
                                  if (s.id === activeSection.id) {
                                    const qs = [...s.questions];
                                    qs[qIdx] = updatedQ;
                                    return { ...s, questions: qs };
                                  }
                                  return s;
                                }));
                              }}
                              className="bg-transparent border-none text-xs outline-none flex-1 font-medium"
                              style={{ color: 'var(--color-text)' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromTopic(activeSection.id, qIdx)}
                              className="hover:text-red-500 transition p-1 cursor-pointer"
                              style={{ color: 'var(--color-text-secondary)' }}
                              title="Remove question"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <input
                      type="text"
                      placeholder={`${t('addQuestionPrefix', 'Add question to')} "${activeSection?.topicTitle}"...`}
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddQuestionToTopic(activeSection.id))}
                      className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddQuestionToTopic(activeSection.id)}
                      className="text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md hover:opacity-90"
                      style={{ backgroundColor: 'var(--color-emerald)' }}
                    >
                      <Plus className="h-4 w-4" /> {t('addBtn', 'Add')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Appearance Section with Live UI Preview */}
            <div 
              className="border rounded-3xl p-6 space-y-6 shadow-sm text-xs mt-6 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 
                    className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <LayoutTemplate className="h-4 w-4" /> {t('resultsAppearanceHeader', 'Final Results Appearance in /chef Chat')}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('resultsAppearanceDesc', 'Select and preview how multi-day meal plans and recipes render to users inside the /chef chat stream.')}
                  </p>
                </div>
                <span 
                  className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase shrink-0"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {resultDisplayMode === 'card' ? t('modeCardTitle', 'Standard Cards View') : resultDisplayMode === 'compact' ? t('modeCompactTitle', 'Compact Table View') : t('modeDetailedTitle', 'Detailed Master View')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'card', title: t('modeCardTitle', 'Standard Cards View'), desc: t('modeCardDesc', 'Full interactive meal cards with images and batch cooking options.') },
                  { id: 'compact', title: t('modeCompactTitle', 'Compact Table View'), desc: t('modeCompactDesc', 'Condensed list view optimized for quick overview and rapid swapping.') },
                  { id: 'detailed', title: t('modeDetailedTitle', 'Detailed Master View'), desc: t('modeDetailedDesc', 'Expanded view displaying full ingredient breakdowns inline.') }
                ].map((mode) => {
                  const isSel = resultDisplayMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setResultDisplayMode(mode.id as any)}
                      className="p-4 rounded-2xl border cursor-pointer transition space-y-2 shadow-xs hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: isSel ? 'var(--color-primary)' : 'var(--color-border)',
                        color: isSel ? 'var(--color-text)' : 'var(--color-text-secondary)'
                      }}
                    >
                      <div className="flex items-center justify-between font-bold" style={{ color: 'var(--color-text)' }}>
                        <span>{mode.title}</span>
                        {isSel && <Check className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />}
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{mode.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* RESTORED LIVE UI PREVIEW IN /chef CHAT */}
              <div 
                className="p-5 rounded-2xl border space-y-4 shadow-inner transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    <span className="font-extrabold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                      {t('liveUiPreviewHeader', 'Live UI Preview in /chef Chat')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('previewSimulationNotice', 'Interactive simulation based on active theme & selected mode')}
                  </span>
                </div>

                {/* SIMULATED PLAN CONTAINER */}
                <div 
                  className="border rounded-2xl p-4 space-y-4 shadow-sm transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                      <h3 className="font-black text-xs" style={{ color: 'var(--color-text)' }}>
                        5-Day High-Protein Wholesome Plan
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        Budget: $6.50/serv
                      </span>
                      <span 
                        className="text-[9px] px-2 py-0.5 rounded font-black uppercase border"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        5 Days
                      </span>
                    </div>
                  </div>

                  {/* 1. STANDARD CARDS VIEW PREVIEW */}
                  {resultDisplayMode === 'card' && (
                    <div className="space-y-3">
                      {[
                        {
                          id: 'prev_1',
                          day: 'Day 1 • Monday',
                          type: 'Dinner',
                          title: 'Avocado Quinoa Power Bowl',
                          desc: 'Fluffy tri-color quinoa tossed with crisp edamame, Hass avocado, cherry tomatoes, and lemon tahini drizzle.',
                          time: '25m',
                          servings: 2,
                          calories: 480,
                          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
                          batch: true
                        },
                        {
                          id: 'prev_2',
                          day: 'Day 2 • Tuesday',
                          type: 'Dinner',
                          title: 'Pan-Seared Salmon with Asparagus',
                          desc: 'Crispy skin Atlantic salmon filet served with garlic-roasted tender asparagus and fresh dill sauce.',
                          time: '20m',
                          servings: 2,
                          calories: 540,
                          image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
                          batch: false
                        }
                      ].map((item) => (
                        <div 
                          key={item.id}
                          className="border rounded-2xl p-3.5 space-y-2.5 transition shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span style={{ color: 'var(--color-primary)' }}>{item.day}</span>
                            <div className="flex items-center gap-1.5">
                              {item.batch && (
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
                                className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)'
                                }}
                              >
                                {item.type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-16 h-16 rounded-xl object-cover border shrink-0" 
                              style={{ borderColor: 'var(--color-border)' }} 
                            />
                            <div className="space-y-1 flex-1 min-w-0">
                              <h4 className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                                {item.title}
                              </h4>
                              <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                {item.desc}
                              </p>
                              <div className="flex items-center gap-3 text-[10px] font-semibold pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" style={{ color: 'var(--color-emerald)' }} /> {item.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {item.servings} serv
                                </span>
                                <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                                  {item.calories} kcal
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. COMPACT TABLE VIEW PREVIEW */}
                  {resultDisplayMode === 'compact' && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
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
                      {[
                        { day: 'Day 1 (Mon)', type: 'Dinner', title: 'Avocado Quinoa Power Bowl', time: '25m', cals: '480 kcal' },
                        { day: 'Day 2 (Tue)', type: 'Dinner', title: 'Pan-Seared Salmon with Asparagus', time: '20m', cals: '540 kcal' },
                        { day: 'Day 3 (Wed)', type: 'Lunch', title: 'Mediterranean Lentil Salad', time: '15m', cals: '410 kcal' }
                      ].map((row, rIdx) => (
                        <div 
                          key={rIdx}
                          className="grid grid-cols-12 gap-2 p-2.5 text-xs items-center border-b last:border-none transition hover:opacity-90"
                          style={{
                            backgroundColor: rIdx % 2 === 0 ? 'var(--color-card)' : 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <span className="col-span-3 font-bold" style={{ color: 'var(--color-primary)' }}>{row.day}</span>
                          <span className="col-span-2">
                            <span 
                              className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border"
                              style={{
                                backgroundColor: 'var(--color-card)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-secondary)'
                              }}
                            >
                              {row.type}
                            </span>
                          </span>
                          <span className="col-span-5 font-semibold truncate" style={{ color: 'var(--color-text)' }}>{row.title}</span>
                          <span className="col-span-2 text-right font-mono text-[11px]" style={{ color: 'var(--color-emerald)' }}>{row.time} • {row.cals}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. DETAILED MASTER VIEW PREVIEW */}
                  {resultDisplayMode === 'detailed' && (
                    <div className="space-y-3">
                      {[
                        {
                          id: 'det_1',
                          day: 'Day 1 • Monday',
                          type: 'Dinner',
                          title: 'Avocado Quinoa Power Bowl',
                          desc: 'Balanced high-protein bowl with citrus tahini infusion.',
                          time: '25 mins total',
                          servings: 2,
                          cals: 480,
                          ingredients: ['Tri-color Quinoa', 'Hass Avocado', 'Edamame', 'Cherry Tomatoes', 'Lemon Tahini', 'Extra Virgin Olive Oil']
                        },
                        {
                          id: 'det_2',
                          day: 'Day 2 • Tuesday',
                          type: 'Dinner',
                          title: 'Pan-Seared Salmon with Asparagus',
                          desc: 'Crisp Atlantic salmon accompanied by garlic butter asparagus.',
                          time: '20 mins total',
                          servings: 2,
                          cals: 540,
                          ingredients: ['Fresh Salmon Filet', 'Asparagus Spears', 'Minced Garlic', 'Fresh Dill', 'Lemon Wedges', 'Sea Salt']
                        }
                      ].map((item) => (
                        <div 
                          key={item.id}
                          className="border rounded-2xl p-4 space-y-3 transition shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <div className="flex justify-between items-center text-xs font-bold border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--color-primary)' }}>{item.day}</span>
                              <span 
                                className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-emerald)',
                                  color: 'var(--color-emerald)'
                                }}
                              >
                                {item.type}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                              {item.time} • {item.servings} servings • {item.cals} kcal
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-extrabold text-xs" style={{ color: 'var(--color-text)' }}>{item.title}</h4>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                          </div>

                          {/* Inline Ingredient Breakdown Tags */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block" style={{ color: 'var(--color-primary)' }}>
                              Inline Ingredients Breakdown:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.ingredients.map((ing, iIdx) => (
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
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VOICE INTERACTION SETTINGS */}
        {activeTab === 'voice' && (
          <div 
            className="border rounded-3xl p-6 space-y-6 shadow-sm text-xs animate-in fade-in transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 
                  className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <Mic className="h-4 w-4" /> {t('voiceInteractionHeader', 'Voice Interaction & Speech Configuration')}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('voiceInteractionDesc', 'Configure text-to-speech engine, voice models, playback speed, and auto-read behavior.')}
                </p>
              </div>

              <div 
                onClick={() => setEnableVoiceInteraction(!enableVoiceInteraction)}
                className="flex items-center gap-3 cursor-pointer border px-4 py-2.5 rounded-2xl shadow-xs transition hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <span className="font-bold" style={{ color: 'var(--color-text)' }}>{t('enableVoiceMode', 'Enable Voice Mode')}</span>
                <div 
                  className="w-9 h-5 rounded-full p-0.5 transition"
                  style={{ backgroundColor: enableVoiceInteraction ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition transform ${enableVoiceInteraction ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('voiceSynthesisEngine', 'Voice Synthesis Engine')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['version1', 'version2'].map((ver) => {
                    const isSel = voiceEngine === ver;
                    return (
                      <button
                        key={ver}
                        type="button"
                        onClick={() => setVoiceEngine(ver as any)}
                        className="p-3.5 rounded-2xl border text-left transition cursor-pointer shadow-xs hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: isSel ? 'var(--color-primary)' : 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        <span className="block font-bold text-sm" style={{ color: 'var(--color-text)' }}>Version {ver === 'version1' ? '1.0' : '2.0'}</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{ver === 'version1' ? 'Standard Web Speech API' : 'Neural HD Studio Voices'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('assistantVoicePersona', 'Assistant Voice Persona')}
                </label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="en-US-Neural2-F" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Chef Aria (US Female - Warm & Professional)</option>
                  <option value="en-US-Neural2-D" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Chef Marcus (US Male - Deep & Authoritative)</option>
                  <option value="en-GB-Neural2-A" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Chef Oliver (UK Male - Refined Accent)</option>
                  <option value="en-AU-Neural2-B" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Chef Matilda (Australian - Friendly & Casual)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('speechSpeed', 'Speech Speed')}: {voiceSpeed}x</span>
                  <span style={{ color: 'var(--color-emerald)' }}>{voiceSpeed === 1.0 ? 'Normal' : voiceSpeed > 1.0 ? 'Fast' : 'Relaxed'}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.75"
                  step="0.25"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
              </div>

              <div className="space-y-2 flex flex-col justify-center">
                <div 
                  onClick={() => setVoiceAutoPlay(!voiceAutoPlay)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <span className="font-bold text-xs block" style={{ color: 'var(--color-text)' }}>{t('autoReadAiResponses', 'Auto-Read AI Responses')}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('autoReadAiResponsesDesc', 'Automatically speak answers aloud upon generation.')}</span>
                    </div>
                  </div>
                  <div 
                    className="w-9 h-5 rounded-full p-0.5 transition"
                    style={{ backgroundColor: voiceAutoPlay ? 'var(--color-primary)' : 'var(--color-border)' }}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition transform ${voiceAutoPlay ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AGENT PARAMETERS & RECOMMENDED RECIPES URL */}
        {activeTab === 'advanced' && (
          <div className="space-y-6 animate-in fade-in">
            {/* AUTONOMOUS CAPABILITIES & SEARCH SCOPE CONTROL */}
            <div 
              className="border rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <h2 
                className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <Globe className="h-4 w-4" /> {t('autonomousCapabilitiesHeader', 'Autonomous Capabilities & Search Scope Control')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('autonomousCapabilitiesDesc', 'Control what data sources the AI agent searches and incorporates when responding on')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>/chef</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div 
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: enableWebSearch ? 'var(--color-primary)' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <Globe className="h-5 w-5" style={{ color: enableWebSearch ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: enableWebSearch ? 'var(--color-primary)' : 'var(--color-border)' }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${enableWebSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-xs block" style={{ color: 'var(--color-text)' }}>{t('liveWebSearch', 'Live Web Search')}</span>
                    <span className="text-[10px] leading-tight block mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('liveWebSearchDesc', 'Allows AI to search external culinary web data, trends, and ingredient substitutes.')}
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setEnablePantryContext(!enablePantryContext)}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: enablePantryContext ? 'var(--color-emerald)' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <PackageCheck className="h-5 w-5" style={{ color: enablePantryContext ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: enablePantryContext ? 'var(--color-emerald)' : 'var(--color-border)' }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${enablePantryContext ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-xs block" style={{ color: 'var(--color-text)' }}>{t('pantryContextSearch', 'Pantry Context Search')}</span>
                    <span className="text-[10px] leading-tight block mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('pantryContextSearchDesc', 'Automatically scans user pantry inventory to build recipes matching in-stock ingredients.')}
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setStrictDietEnforcement(!strictDietEnforcement)}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: strictDietEnforcement ? 'var(--color-primary)' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <ShieldAlert className="h-5 w-5" style={{ color: strictDietEnforcement ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: strictDietEnforcement ? 'var(--color-primary)' : 'var(--color-border)' }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${strictDietEnforcement ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-xs block" style={{ color: 'var(--color-text)' }}>{t('strictDietaryFilters', 'Strict Dietary Filters')}</span>
                    <span className="text-[10px] leading-tight block mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('strictDietaryFiltersDesc', 'Enforces strict filtering against user allergies, avoid lists, and religious dietary rules.')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TUNING PARAMETERS, KNOWLEDGE BASE, CUSTOM VOCABULARY & FILTER WORDS */}
            <div 
              className="border rounded-3xl p-6 space-y-6 shadow-sm text-xs animate-in fade-in transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <h2 
                className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <SlidersHorizontal className="h-4 w-4" /> {t('agentParametersHeader', 'Agent Parameters & Knowledge Tuning')}
              </h2>

              {/* CREATIVITY & MAX PLAN DAYS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4 border-b transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{t('temperatureLabel', 'Temperature (Creativity)')}: {temperature}</span>
                    <span style={{ color: 'var(--color-emerald)' }}>{temperature < 0.4 ? 'Precise & Structured' : temperature > 0.8 ? 'Creative & Experimental' : 'Balanced'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('temperatureDesc', 'Lower values yield deterministic recipe structures; higher values generate novel flavor combinations.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('maxPlanDaysCap', 'Max Plan Days Limit (Wizard Cap)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={maxPlanDays}
                    onChange={(e) => setMaxPlanDays(parseInt(e.target.value) || 7)}
                    className="settings-input w-full border rounded-xl px-4 py-2.5 outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('maxPlanDaysDesc', 'Maximum number of days the AI can structure in a single meal plan wizard sequence.')}
                  </p>
                </div>
              </div>

              {/* RECOMMENDED RECIPES URL WITH CRAWLER & SLUG DISCOVERY */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                      <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('recommendedRecipesUrlHeader', 'Recommended Recipes Url')}
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('recommendedRecipesUrlDesc', 'Configure primary source URLs for recipe recommendations. When users ask for recipes on /chef, AI will search and prioritize these URLs as the primary source.')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border shrink-0"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: recommendedRecipeUrls.length > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                        color: recommendedRecipeUrls.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                      }}
                    >
                      {recommendedRecipeUrls.length} {t('urlsActiveBadge', 'Active URLs (Primary)')}
                    </span>
                    {recommendedRecipeUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={handleClearAllRecommendedUrls}
                        className="text-[10px] text-red-400 hover:text-red-500 font-bold transition cursor-pointer"
                      >
                        {t('clearAll', 'Clear All')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div 
                      className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <input
                        type="text"
                        placeholder={t('recommendedRecipeUrlPlaceholder', 'Add recipe URL (paste single or multiple separated by commas or newlines)...')}
                        value={newRecipeUrlInput}
                        onChange={(e) => setNewRecipeUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRecommendedUrls();
                          }
                        }}
                        className="bg-transparent border-none outline-none w-full text-xs font-medium"
                        style={{ color: 'var(--color-text)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddRecommendedUrls()}
                      disabled={!newRecipeUrlInput.trim()}
                      className="px-4 py-2.5 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-40 hover:opacity-90 shrink-0"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <Plus className="h-4 w-4" /> {t('addUrlBtn', 'Add URL')}
                    </button>
                  </div>
                  <span className="text-[10px] block" style={{ color: 'var(--color-text-secondary)' }}>
                    💡 {t('multiUrlHint', 'Tip: You can paste multiple URLs at once separated by commas or newlines. Chef AI will prioritize these as primary culinary references.')}
                  </span>
                </div>

                {/* URL List with Index Crawler and Discovered Slugs Drawer */}
                <div className="space-y-2 pt-1">
                  {recommendedRecipeUrls.length === 0 ? (
                    <div 
                      className="p-4 text-center border border-dashed rounded-2xl text-xs space-y-0.5"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      <span className="font-semibold block">{t('noRecommendedUrlsTitle', 'No Recommended Recipe URLs configured.')}</span>
                      <span className="text-[11px] block">{t('noRecommendedUrlsDesc', 'Add your preferred food blog or recipe URLs above to make /chef recommend recipes from them first.')}</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {recommendedRecipeUrls.map((urlStr, idx) => {
                        let domain = 'Website';
                        try {
                          domain = new URL(urlStr).hostname.replace(/^www\./, '');
                        } catch (_) {}

                        const isIndex = /recipes|\/category\/|\/categories\/|\/collection\/|\/tag\/|\/archive\/|\/all/i.test(urlStr) || urlStr.endsWith('/recipes/');
                        const cache = crawlResults[urlStr];
                        const isCrawlingThis = crawlingUrl === urlStr;
                        const isExpanded = expandedIndexUrl === urlStr;

                        return (
                          <div 
                            key={idx}
                            className="rounded-2xl border transition shadow-xs overflow-hidden"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: isExpanded ? 'var(--color-primary)' : 'var(--color-border)'
                            }}
                          >
                            <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span 
                                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded border truncate"
                                    style={{
                                      backgroundColor: 'var(--color-card)',
                                      borderColor: 'var(--color-border)',
                                      color: 'var(--color-primary)'
                                    }}
                                  >
                                    {domain}
                                  </span>
                                  <span 
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                                    style={{
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      color: 'var(--color-emerald)'
                                    }}
                                  >
                                    {t('primaryTag', 'Primary')}
                                  </span>
                                  {isIndex && (
                                    <span 
                                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border"
                                      style={{
                                        backgroundColor: 'var(--color-card)',
                                        borderColor: 'var(--color-primary)',
                                        color: 'var(--color-primary)'
                                      }}
                                    >
                                      {t('indexCollectionTag', 'Index / Collection')}
                                    </span>
                                  )}
                                  {cache && (
                                    <span 
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border"
                                      style={{
                                        backgroundColor: 'var(--color-card)',
                                        borderColor: 'var(--color-emerald)',
                                        color: 'var(--color-emerald)'
                                      }}
                                    >
                                      {cache.count} {t('slugsDiscoveredBadge', 'Slugs Discovered')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-mono truncate" style={{ color: 'var(--color-text)' }} title={urlStr}>
                                  {urlStr}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleCrawlIndexUrl(urlStr)}
                                  disabled={isCrawlingThis}
                                  className="px-2.5 py-1.5 rounded-lg border font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-primary)',
                                    color: 'var(--color-primary)'
                                  }}
                                  title="Crawl index page and discover matching recipe slugs"
                                >
                                  {isCrawlingThis ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>{t('crawling', 'Crawling...')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Compass className="h-3 w-3" />
                                      <span>{t('crawlIndexBtn', 'Crawl & Discover Slugs')}</span>
                                    </>
                                  )}
                                </button>

                                {cache && cache.discovered?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedIndexUrl(isExpanded ? null : urlStr)}
                                    className="p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer hover:opacity-80"
                                    style={{
                                      backgroundColor: 'var(--color-card)',
                                      borderColor: 'var(--color-border)',
                                      color: 'var(--color-text)'
                                    }}
                                    title="Expand or collapse discovered recipe slugs"
                                  >
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                )}

                                <a
                                  href={urlStr}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border transition cursor-pointer hover:opacity-80"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-primary)'
                                  }}
                                  title={t('openUrlTooltip', 'Open in new tab')}
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecommendedUrl(idx)}
                                  className="p-1.5 rounded-lg border hover:text-red-500 transition cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text-secondary)'
                                  }}
                                  title={t('removeUrlTooltip', 'Remove URL')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Collapsible Discovered Slugs Drawer */}
                            {isExpanded && cache && (
                              <div 
                                className="border-t p-3.5 space-y-2.5 transition-colors duration-200"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)'
                                }}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                                    <Layers className="h-3.5 w-3.5" /> {t('discoveredSlugsTitle', 'Discovered Recipe Slugs')} ({cache.discovered.length})
                                  </span>
                                  <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('crawledAtNotice', 'Crawled')}: {new Date(cache.crawledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                                  {cache.discovered.map((item, dIdx) => (
                                    <div
                                      key={dIdx}
                                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-xs transition"
                                      style={{
                                        backgroundColor: 'var(--color-inner-dark)',
                                        borderColor: 'var(--color-border)'
                                      }}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                                          {item.title}
                                        </p>
                                        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                          /{item.slug}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handlePullIndividualRecipe(item.url)}
                                          disabled={isPullingRecipe && selectedSlugUrl === item.url}
                                          className="px-2 py-1 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 cursor-pointer hover:opacity-90 shadow-xs"
                                          style={{
                                            backgroundColor: 'var(--color-card)',
                                            borderColor: 'var(--color-emerald)',
                                            color: 'var(--color-emerald)'
                                          }}
                                          title="Pull individual recipe details and preview image/ingredients"
                                        >
                                          {isPullingRecipe && selectedSlugUrl === item.url ? (
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                          ) : (
                                            <Sparkles className="h-2.5 w-2.5" />
                                          )}
                                          <span>{t('pullBtn', 'Pull')}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleAddDiscoveredAsDirectUrl(item.url)}
                                          className="p-1 rounded-lg border transition cursor-pointer hover:opacity-80"
                                          style={{
                                            backgroundColor: 'var(--color-card)',
                                            borderColor: 'var(--color-border)',
                                            color: 'var(--color-primary)'
                                          }}
                                          title={t('addDirectTooltip', 'Add as direct source')}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>

                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded-lg border transition cursor-pointer hover:opacity-80"
                                          style={{
                                            backgroundColor: 'var(--color-card)',
                                            borderColor: 'var(--color-border)',
                                            color: 'var(--color-text-secondary)'
                                          }}
                                          title="Open recipe link"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* KNOWLEDGE BASE FEATURE */}
              <div className="space-y-3 pt-1">
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                    <BookOpen className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('knowledgeBaseHeader', 'Knowledge Base')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('knowledgeBaseDesc', 'Fine-tune the assistant to your needs by adding reference source documents or databases.')}
                  </p>
                </div>

                <form onSubmit={handleAddKnowledgeBase} className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('knowledgeBasePlaceholder', 'Knowledge Base reference (e.g. Culinary Masterclass DB, Keto Guidelines)...')}
                      value={newKbInput}
                      onChange={(e) => setNewKbInput(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs font-medium"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-white rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-md hover:opacity-90 shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-4 w-4" /> {t('addBtn', 'Add')}
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {knowledgeBaseList.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('noKnowledgeBaseEntries', 'No knowledge base references added yet.')}
                    </span>
                  ) : (
                    knowledgeBaseList.map((item, idx) => (
                      <span 
                        key={idx}
                        className="border px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveKnowledgeBase(idx)}
                          className="hover:opacity-75 cursor-pointer ml-0.5"
                          title="Remove reference"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* CUSTOM VOCABULARY FEATURE */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                    <BookA className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('customVocabularyHeader', 'Custom Vocabulary')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('customVocabularyDesc', 'Enhance accuracy with specialized culinary or business terminology.')}
                  </p>
                </div>

                <form onSubmit={handleAddCustomVocabulary} className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('startTypingToAddVocab', 'Add custom culinary terminology (e.g. Umami, Sous-vide, Chiffonade)...')}
                      value={newVocabInput}
                      onChange={(e) => setNewVocabInput(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs font-medium"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-white rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-md hover:opacity-90 shrink-0"
                    style={{ backgroundColor: 'var(--color-emerald)' }}
                  >
                    <Plus className="h-4 w-4" /> {t('addBtn', 'Add')}
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customVocabularyList.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('noCustomVocabularyEntries', 'No custom vocabulary terms added yet.')}
                    </span>
                  ) : (
                    customVocabularyList.map((item, idx) => (
                      <span 
                        key={idx}
                        className="border px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-emerald)',
                          color: 'var(--color-emerald)'
                        }}
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomVocabulary(idx)}
                          className="hover:opacity-75 cursor-pointer ml-0.5"
                          title="Remove term"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* FILTER WORDS FEATURE */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                    <Ban className="h-4 w-4 text-red-500" /> {t('filterWordsHeader', 'Filter Words')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('filterWordsDesc', 'Restricted words or ingredients remain unspoken or avoided in AI outputs.')}
                  </p>
                </div>

                <form onSubmit={handleAddFilterWord} className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('startTypingToAddFilter', 'Add restricted word or prohibited ingredient (e.g. Trans fats, MSG)...')}
                      value={newFilterInput}
                      onChange={(e) => setNewFilterInput(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs font-medium"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-white rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-md hover:opacity-90 shrink-0"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    <Plus className="h-4 w-4" /> {t('addBtn', 'Add')}
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {filterWordsList.length === 0 ? (
                    <span className="text-[11px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('noFilterWordsEntries', 'No filter words configured.')}
                    </span>
                  ) : (
                    filterWordsList.map((item, idx) => (
                      <span 
                        key={idx}
                        className="border px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'rgba(239, 68, 68, 0.5)',
                          color: '#ef4444'
                        }}
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilterWord(idx)}
                          className="hover:opacity-75 cursor-pointer ml-0.5"
                          title="Remove filter word"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* SYSTEM PROMPT / PERSONA */}
              <div className="space-y-2 pt-3 border-t transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('systemPromptHeader', 'System Prompt / Autonomous Persona')}
                </label>
                <textarea
                  rows={5}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="settings-input w-full border rounded-xl p-3.5 outline-none leading-relaxed font-sans text-xs transition font-medium"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('systemPromptDesc', 'Defines how the AI agent behaves, formats responses, and handles user queries on the')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>/chef</span> {t('pageSuffix', 'page.')}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* INDIVIDUAL RECIPE PULL & INSPECT MODAL */}
      {previewRecipeData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewRecipeData(null)}
        >
          <div 
            className="border rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span 
                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block mb-1"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {previewRecipeData.sourceName || 'Individual Recipe Pulled'}
                </span>
                <h3 className="font-extrabold text-base" style={{ color: 'var(--color-text)' }}>
                  {previewRecipeData.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreviewRecipeData(null)}
                className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {previewRecipeData.image && (
              <div className="w-full h-44 rounded-2xl overflow-hidden relative border" style={{ borderColor: 'var(--color-border)' }}>
                <img 
                  src={previewRecipeData.image} 
                  alt={previewRecipeData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {previewRecipeData.description && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {previewRecipeData.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-1">
              <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <span className="block text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Prep Time</span>
                <span style={{ color: 'var(--color-primary)' }}>{previewRecipeData.prepMinutes}m</span>
              </div>
              <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <span className="block text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Cook Time</span>
                <span style={{ color: 'var(--color-emerald)' }}>{previewRecipeData.cookMinutes}m</span>
              </div>
              <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <span className="block text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Servings</span>
                <span style={{ color: 'var(--color-text)' }}>{previewRecipeData.servings}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="font-bold text-xs block" style={{ color: 'var(--color-text)' }}>
                {t('ingredientsCount', 'Ingredients')} ({previewRecipeData.ingredients?.length || 0})
              </span>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto pl-2 border-l-2" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-text-secondary)' }}>
                {(previewRecipeData.ingredients || []).map((ing: string, iIdx: number) => (
                  <li key={iIdx}>• {ing}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <a
                href={previewRecipeData.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold flex items-center gap-1 hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                <Globe className="h-3.5 w-3.5" /> {t('visitOriginalPage', 'Visit Source Recipe ↗')}
              </a>

              <button
                type="button"
                onClick={() => {
                  handleAddDiscoveredAsDirectUrl(previewRecipeData.sourceUrl);
                  setPreviewRecipeData(null);
                }}
                className="px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('addAsDirectSourceBtn', 'Add to Primary URLs')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
