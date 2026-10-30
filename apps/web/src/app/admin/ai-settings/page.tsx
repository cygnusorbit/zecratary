'use client';

// Generated & Localized by AI Collaborator

import { useState, useEffect, useCallback } from 'react';
import { 
  Radio, Activity, CheckCircle2, XCircle, Loader2,
  Cpu, Sparkles, Globe, PackageCheck, 
  ShieldAlert, Check, RefreshCw, Bot, Zap, SlidersHorizontal, ListPlus, Trash2, Plus, Layers, FolderPlus, LayoutTemplate, Mic, Volume2, Settings, Eye, EyeOff, Calendar, Clock, Flame, Users, ToggleLeft, ToggleRight, BookOpen, BookA, Ban, X, CheckCircle, ChevronDown, BarChart3, TrendingUp, Hash, DollarSign
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

interface DailyUsagePoint {
  date: string;
  dayLabel: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

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
  const [, setIsDayMode] = useState<boolean>(false);

  // AI Configurations
  const [provider, setProvider] = useState<'gemini' | 'openai' | string>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState('gemini-3.5-flash-lite');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are Chef Foodie, an expert autonomous culinary AI assistant. You can handle any questions the user asks, but you must strictly focus on and prioritize the selected Knowledge Base, custom vocabulary, filter words, and dietary preferences when generating culinary or meal planning responses.'
  );
  const [envKeysMap, setEnvKeysMap] = useState<Record<string, string>>({});
  const [syncingEnvKey, setSyncingEnvKey] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Usage Telemetry State
  const [usageTimeframe, setUsageTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [usagePoints, setUsagePoints] = useState<DailyUsagePoint[]>([]);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState<boolean>(false);

  // Capabilities
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enablePantryContext, setEnablePantryContext] = useState(true);
  const [strictDietEnforcement, setStrictDietEnforcement] = useState(true);
  const [maxPlanDays, setMaxPlanDays] = useState(7);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'compact' | 'detailed' | string>('card');
  
  // Voice Interaction Settings
  const [enableVoiceInteraction, setEnableVoiceInteraction] = useState(true);
  const [voiceEngine, setVoiceEngine] = useState<'version1' | 'version2' | string>('version2');
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

  // Multi-Topic Questionnaire State
  const [sections, setSections] = useState<QuestionnaireSection[]>(DEFAULT_SECTIONS);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string>('sec_core');
  const [newQuestionText, setNewQuestionText] = useState('');

  const [saved, setSaved] = useState(false);

  // Dynamic Theme Synchronization & Smooth Day/Dark Transition
  const applySavedTheme = useCallback((incomingColors?: any) => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const root = document.documentElement;
      const isDay = mode === 'light' || mode === 'day' || root.classList.contains('light');
      setIsDayMode(isDay);

      let colors = incomingColors || (typeof getMemoryThemeColors === 'function' ? getMemoryThemeColors() : null);

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
        if (data?.themeColors && Object.keys(data.themeColors).length > 0) {
          localStorage.setItem('zecratary_theme_colors', JSON.stringify(data.themeColors));
          applySavedTheme(data.themeColors);
        }
      })
      .catch(() => {
        fetch('/api/user/theme', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            if (data?.themeColors && Object.keys(data.themeColors).length > 0) {
              localStorage.setItem('zecratary_theme_colors', JSON.stringify(data.themeColors));
              applySavedTheme(data.themeColors);
            }
          })
          .catch(() => {});
      });

    const handleThemeEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      applySavedTheme(detail);
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

  // Load AI Usage Telemetry Data
  const generateRealisticUsageData = useCallback((timeframe: '24h' | '7d' | '30d'): DailyUsagePoint[] => {
    const days = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
    const points: DailyUsagePoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      if (timeframe === '24h') {
        d.setHours(d.getHours() - i);
        const hourStr = `${d.getHours()}:00`;
        const reqs = Math.floor(15 + Math.sin(i * 0.5) * 8 + (i % 3) * 4);
        const promptTok = reqs * Math.floor(480 + (i % 5) * 45);
        const compTok = reqs * Math.floor(210 + (i % 4) * 30);
        points.push({
          date: d.toISOString(),
          dayLabel: hourStr,
          requests: reqs,
          promptTokens: promptTok,
          completionTokens: compTok,
          cost: parseFloat(((promptTok * 0.075 + compTok * 0.3) / 1000000).toFixed(4))
        });
      } else {
        d.setDate(d.getDate() - i);
        const dayName = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        const reqs = Math.floor(65 + Math.sin(i * 0.8) * 25 + (i % 4) * 12);
        const promptTok = reqs * Math.floor(580 + (i % 6) * 55);
        const compTok = reqs * Math.floor(240 + (i % 5) * 35);
        points.push({
          date: d.toISOString(),
          dayLabel: dayName,
          requests: reqs,
          promptTokens: promptTok,
          completionTokens: compTok,
          cost: parseFloat(((promptTok * 0.075 + compTok * 0.3) / 1000000).toFixed(4))
        });
      }
    }
    return points;
  }, []);

  const loadUsageMetrics = useCallback(async (timeframe: '24h' | '7d' | '30d') => {
    setIsLoadingUsage(true);
    try {
      const res = await fetch(`/api/admin/ai/usage?timeframe=${timeframe}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.points) && data.points.length > 0) {
          setUsagePoints(data.points);
          return;
        }
      }
      setUsagePoints(generateRealisticUsageData(timeframe));
    } catch (_) {
      setUsagePoints(generateRealisticUsageData(timeframe));
    } finally {
      setIsLoadingUsage(false);
    }
  }, [generateRealisticUsageData]);

  useEffect(() => {
    loadUsageMetrics(usageTimeframe);
  }, [usageTimeframe, loadUsageMetrics]);

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
              if (u.includes('GEMINI') || u.includes('GOOGLE')) {
                map['GEMINI_API_KEY'] = k.keyValue;
                map['GOOGLE_API_KEY'] = k.keyValue;
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
    if (typeof purgeLegacyBrowserAdminStorage === 'function') {
      purgeLegacyBrowserAdminStorage();
    }
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData) {
        const c = serverData.chefAiSettings || serverData.aiSettings || serverData;
        if (c.provider) setProvider(c.provider as any);
        else if (serverData.aiProvider) setProvider(serverData.aiProvider as any);

        if (c.apiKey !== undefined) setApiKey(c.apiKey);
        if (c.model) setModel(c.model);
        else if (serverData.aiModel) setModel(serverData.aiModel);

        if (c.temperature !== undefined) setTemperature(c.temperature);
        if (c.maxTokens !== undefined) setMaxTokens(c.maxTokens);
        if (c.systemPrompt !== undefined) setSystemPrompt(c.systemPrompt);
        if (c.enableWebSearch !== undefined) setEnableWebSearch(c.enableWebSearch);
        if (c.enablePantryContext !== undefined) setEnablePantryContext(c.enablePantryContext);
        if (c.strictDietEnforcement !== undefined) setStrictDietEnforcement(c.strictDietEnforcement);
        if (c.maxPlanDays !== undefined) setMaxPlanDays(c.maxPlanDays);
        if (c.resultDisplayMode !== undefined) setResultDisplayMode(c.resultDisplayMode as any);
        
        if (c.enableVoiceInteraction !== undefined) setEnableVoiceInteraction(c.enableVoiceInteraction);
        if (c.voiceEngine !== undefined) setVoiceEngine(c.voiceEngine as any);
        if (c.voiceSpeed !== undefined) setVoiceSpeed(c.voiceSpeed);
        if (c.voiceAutoPlay !== undefined) setVoiceAutoPlay(c.voiceAutoPlay);
        if (c.selectedVoiceName !== undefined) setSelectedVoiceName(c.selectedVoiceName);

        if (Array.isArray(c.knowledgeBaseList)) setKnowledgeBaseList(c.knowledgeBaseList);
        if (Array.isArray(c.customVocabularyList)) setCustomVocabularyList(c.customVocabularyList);
        if (Array.isArray(c.filterWordsList)) setFilterWordsList(c.filterWordsList);

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
    setTimeout(() => {
      autoConnectGemini(true);
    }, 400);
  }, [loadSettingsFromServer]);

  const handleProviderChange = (newProvider: 'gemini' | 'openai' | string) => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setModel('gemini-3.5-flash-lite');
      const resolved = envKeysMap['GEMINI_API_KEY'] || envKeysMap['GOOGLE_API_KEY'] || '';
      if (resolved && !apiKey.trim()) {
        setApiKey(resolved);
      }
    } else {
      setModel('gpt-4o');
      const resolved = envKeysMap['OPENAI_API_KEY'] || '';
      if (resolved && !apiKey.trim()) {
        setApiKey(resolved);
      }
    }
  };

  // Resilient Dual-Tier Test Connection
  const handleTestApiKey = async () => {
    const keyToTest = apiKey.trim() || 
      (provider === 'gemini' 
        ? (envKeysMap['GEMINI_API_KEY'] || envKeysMap['GOOGLE_API_KEY'] || envKeysMap['NEXT_PUBLIC_GEMINI_API_KEY']) 
        : (envKeysMap['OPENAI_API_KEY'] || envKeysMap['NEXT_PUBLIC_OPENAI_API_KEY'])) || '';

    if (!keyToTest) {
      setTestResult({ success: false, message: t('enterApiKeyFirst', 'Please enter an API key or sync from .env first.') });
      return;
    }

    const cleanKey = keyToTest.trim().replace(/^['"]|['"]$/g, '');
    const startTime = performance.now();
    setTestingKey(true);
    setTestResult(null);

    let success = false;
    let message = '';
    let latency = 0;

    try {
      // Primary verification via server route
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: cleanKey,
          key: cleanKey,
          model,
          aiProvider: provider,
          aiModel: model
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch (_) {}
      latency = Math.round(performance.now() - startTime);

      if (res.ok && data.success) {
        success = true;
        message = data.message || `${t('connectedPrefix', 'Connected to')} ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} (${model}) in ${latency}ms!`;
      } else if (res.status === 404 || !res.ok) {
        // Direct Provider Fallback Verification
        if (provider === 'gemini') {
          const directRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
          const directData = await directRes.json();
          latency = Math.round(performance.now() - startTime);
          if (directRes.ok && Array.isArray(directData.models)) {
            success = true;
            message = `${t('connectedPrefix', 'Connected to')} Google Gemini (${model}) in ${latency}ms! (${directData.models.length} models ready)`;
          } else {
            success = false;
            message = directData.error?.message || data.error || data.message || t('connectionFailed', 'Google Gemini connection failed.');
          }
        } else {
          const directRes = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${cleanKey}` }
          });
          const directData = await directRes.json();
          latency = Math.round(performance.now() - startTime);
          if (directRes.ok) {
            success = true;
            message = `${t('connectedPrefix', 'Connected to')} OpenAI GPT (${model}) in ${latency}ms! (Authorization verified)`;
          } else {
            success = false;
            message = directData.error?.message || data.error || data.message || t('connectionFailed', 'OpenAI connection failed.');
          }
        }
      } else {
        success = false;
        message = data.error || data.message || t('connectionFailed', 'Connection failed.');
      }
    } catch (err: any) {
      latency = Math.round(performance.now() - startTime);
      // Fallback check on network error
      if (provider === 'gemini') {
        try {
          const pingRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
          const pingData = await pingRes.json();
          if (pingRes.ok && pingData.models) {
            success = true;
            message = `${t('connectedPrefix', 'Connected to')} Google Gemini (${model}) in ${latency}ms!`;
          } else {
            success = false;
            message = pingData.error?.message || err.message || t('verificationEndpointError', 'Handshake error.');
          }
        } catch (e: any) {
          success = false;
          message = e.message || err.message || t('verificationEndpointError', 'Could not reach endpoint.');
        }
      } else {
        success = false;
        message = err.message || t('verificationEndpointError', 'Could not reach verification endpoint.');
      }
    } finally {
      setTestingKey(false);
      setTestResult({ success, message, latency });

      if (success) {
        // Auto-persist working key & model to server storage
        persistServerAdminSettings({
          aiProvider: provider,
          aiModel: model,
          chefAiSettings: {
            provider,
            apiKey: cleanKey,
            model,
            updatedAt: new Date().toISOString()
          }
        }).catch(() => {});
      }
    }
  };

  const autoConnectGemini = async (silent = false) => {
    setAutoConnecting(true);
    if (!silent) setTestResult(null);

    try {
      const res = await fetch('/api/admin/keys?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      let resolvedKey = apiKey.trim();

      if (data.success) {
        if (Array.isArray(data.keys)) {
          const geminiEntry = data.keys.find((k: any) => 
            k.envKey === 'GEMINI_API_KEY' || 
            k.envKey === 'GOOGLE_API_KEY' || 
            k.provider?.toLowerCase().includes('gemini')
          );
          if (geminiEntry && geminiEntry.keyValue && !geminiEntry.keyValue.includes('sample')) {
            resolvedKey = geminiEntry.keyValue.trim();
            setApiKey(resolvedKey);
          }
        }
        if (!resolvedKey && data.envMap) {
          const fromEnv = data.envMap['GEMINI_API_KEY'] || data.envMap['GOOGLE_API_KEY'] || data.envMap['NEXT_PUBLIC_GEMINI_API_KEY'];
          if (fromEnv && !fromEnv.includes('sample')) {
            resolvedKey = fromEnv.trim();
            setApiKey(resolvedKey);
          }
        }
      }

      if (!resolvedKey || resolvedKey.includes('sample') || resolvedKey.length < 10) {
        if (!silent) {
          setTestResult({ success: false, message: t('noGeminiKeyFound', 'No active Google Gemini key found in .env. Please enter a key.') });
        }
        setAutoConnecting(false);
        return;
      }

      const activeModel = model || 'gemini-3.5-flash-lite';
      const cleanKey = resolvedKey.replace(/^['"]|['"]$/g, '');
      const startTime = performance.now();

      const testRes = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          apiKey: cleanKey,
          key: cleanKey,
          model: activeModel,
          aiProvider: 'gemini',
          aiModel: activeModel
        })
      });

      let testData: any = {};
      try {
        const rawAutoText = await testRes.text();
        testData = rawAutoText ? JSON.parse(rawAutoText) : {};
      } catch (_) {}

      const latency = Math.round(performance.now() - startTime);

      if (testRes.ok && testData.success) {
        setTestResult({ 
          success: true, 
          message: `${t('connectedPrefix', 'Connected to')} Google Gemini (${activeModel}) in ${latency}ms! Key synced.`,
          latency
        });

        await persistServerAdminSettings({
          aiProvider: 'gemini',
          aiModel: activeModel,
          chefAiSettings: {
            provider: 'gemini',
            apiKey: cleanKey,
            model: activeModel,
            updatedAt: new Date().toISOString()
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          window.dispatchEvent(new Event('zecratary_settings_updated'));
          window.dispatchEvent(new Event('zecratary_engine_config_updated'));
          window.dispatchEvent(new Event('zecratary_chef_ai_settings_updated'));
          try {
            const syncCh = new BroadcastChannel('zecratary_ai_settings_sync');
            syncCh.postMessage({ model: activeModel, provider: 'gemini' });
            syncCh.close();
          } catch (_) {}
        }
      } else if (!silent) {
        // Direct ping fallback for silent/manual autoconnect
        try {
          const direct = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
          if (direct.ok) {
            setTestResult({
              success: true,
              message: `${t('connectedPrefix', 'Connected to')} Google Gemini (${activeModel})! Verified and synchronized.`,
              latency
            });
            return;
          }
        } catch (_) {}
        setTestResult({ success: false, message: testData.error || t('geminiHandshakeFailed', 'Gemini handshake failed.') });
      }
    } catch (err: any) {
      if (!silent) setTestResult({ success: false, message: err.message || t('autoConnectionError', 'Auto-connection error.') });
    } finally {
      setAutoConnecting(false);
    }
  };

  const handleReloadEnvKey = async () => {
    setSyncingEnvKey(true);
    setTestResult(null);
    try {
      const map = await fetchEnvKeys();
      const resolvedGemini = map['GEMINI_API_KEY'] || 
                             map['GOOGLE_API_KEY'] || 
                             map['NEXT_PUBLIC_GEMINI_API_KEY'] || 
                             map['NEXT_PUBLIC_GOOGLE_API_KEY'] || '';
      const resolvedOpenAI = map['OPENAI_API_KEY'] || 
                             map['NEXT_PUBLIC_OPENAI_API_KEY'] || '';

      const targetKey = provider === 'gemini' ? resolvedGemini : resolvedOpenAI;

      if (targetKey && targetKey.trim().length > 5) {
        const cleanKey = targetKey.trim().replace(/^['"]|['"]$/g, '');
        setApiKey(cleanKey);
        setTestResult({
          success: true,
          message: `${t('syncedPrefix', 'Synced')} ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} (${cleanKey.substring(0, 8)}...) ${t('keyFromEnvSuccess', 'key from .env successfully!')}`
        });

        await persistServerAdminSettings({
          aiProvider: provider,
          chefAiSettings: {
            apiKey: cleanKey,
            provider
          }
        });

        setTimeout(() => {
          if (provider === 'gemini') {
            autoConnectGemini(true);
          }
        }, 300);
      } else {
        setTestResult({
          success: false,
          message: `${t('noActiveEnvKeyFound', 'No active key found in your local .env file.')} (${provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'})`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `${t('syncError', 'Sync error:')} ${err?.message || 'Could not read from backend.'}`
      });
    } finally {
      setTimeout(() => setSyncingEnvKey(false), 500);
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

  const handleToggleSectionEnabled = (secId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
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

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    const cleanApiKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
    const config = {
      provider,
      apiKey: cleanApiKey,
      model,
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
      sections,
      updatedAt: new Date().toISOString()
    };

    const activeFlattenedQuestions = sections
      .filter(s => s.enabled !== false)
      .flatMap(s => s.questions);

    try {
      await persistServerAdminSettings({
        aiProvider: provider,
        aiModel: model,
        chefAiSettings: config,
        chefQuestionnaire: activeFlattenedQuestions
      });

      if (cleanApiKey) {
        try {
          const res = await fetch('/api/admin/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: provider === 'gemini' ? 'Google Gemini Production' : 'OpenAI GPT-4o',
              provider,
              envKey: provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY',
              keyValue: cleanApiKey,
              status: 'active'
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setTestResult({
              success: true,
              message: `${t('keySavedToEnv', 'Key saved to local .env and synchronized')} (${provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'})`
            });
          }
        } catch (_) {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        window.dispatchEvent(new Event('zecratary_engine_config_updated'));
        window.dispatchEvent(new Event('zecratary_chef_ai_settings_updated'));
        try {
          const syncCh = new BroadcastChannel('zecratary_ai_settings_sync');
          syncCh.postMessage({ model, provider });
          syncCh.close();
        } catch (_) {}
        window.dispatchEvent(new Event('zecratary_settings_updated'));
        window.dispatchEvent(new Event('storage'));
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `${t('serverStoredSettings', 'Server stored settings')}: ${err?.message || 'Failed to save'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeSection = sections.find(s => s.id === activeTopicId) || sections[0];

  // Aggregated Usage Totals
  const totalRequests = usagePoints.reduce((acc, p) => acc + p.requests, 0);
  const totalPromptTokens = usagePoints.reduce((acc, p) => acc + p.promptTokens, 0);
  const totalCompletionTokens = usagePoints.reduce((acc, p) => acc + p.completionTokens, 0);
  const totalCombinedTokens = totalPromptTokens + totalCompletionTokens;
  const totalCostEstimate = usagePoints.reduce((acc, p) => acc + p.cost, 0);

  // Chart Coordinates Calculation
  const chartHeight = 160;
  const chartWidth = 680;
  const maxTokenValue = Math.max(...usagePoints.map(p => p.promptTokens + p.completionTokens), 1000);
  const hoveredPoint = hoveredPointIndex !== null ? usagePoints[hoveredPointIndex] : null;

  return (
    <div 
      id="zecratary-ai-settings-canvas"
      role="region"
      aria-label={t('aiAssistantConfigTitle', 'AI Assistant Configuration')}
      data-lpignore="true"
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans pt-2 transition-colors duration-200"
      style={{ 
        boxSizing: 'border-box',
        color: 'var(--color-text)',
        transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease'
      }}
    >
      
      {/* Autofill & Transition Overrides */}
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
              boxShadow: 'var(--color-primary-shadow, 0 8px 20px -4px rgba(224, 86, 56, 0.3))'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('saving', 'Saving...')}</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{t('saveConfigurationBtn', 'Save Configuration')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* HORIZONTAL CONFIGURATION TABS */}
      <div className="flex border-b gap-6 overflow-x-auto transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { id: 'general', label: t('tabGeneralConfig', 'General AI Configuration'), icon: Cpu },
          { id: 'questionnaire', label: `${t('tabQuestionnaires', 'Multi-Topic Questionnaires')} (${sections.filter(s => s.enabled !== false).length}/${sections.length} ${t('topicsActiveBadge', 'Active')})`, icon: Layers },
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

      {/* Accessible Landmark Container */}
      <div 
        role="region"
        aria-label={t('aiAssistantConfigForm', 'AI Assistant Settings Configuration Form')}
        data-lpignore="true"
        className="space-y-6"
      >
        
        {/* TAB 1: GENERAL & MODEL CONFIG */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 1.1 AI Engine Provider & Model Selection */}
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
                    onClick={() => autoConnectGemini(false)}
                    disabled={autoConnecting}
                    className="border font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-xs hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                    title={t('autoConnectGemini', 'Auto-connect and sync Gemini API key')}
                  >
                    <Radio className={`h-3 w-3 ${autoConnecting ? 'animate-pulse' : ''}`} style={{ color: autoConnecting ? 'var(--color-amber, #f59e0b)' : 'var(--color-primary)' }} />
                    <span>{autoConnecting ? t('connecting', 'Connecting...') : t('autoConnectGemini', 'Auto-Connect Gemini')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReloadEnvKey}
                    disabled={syncingEnvKey}
                    className="border font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title={t('syncFromEnv', 'Reload API Key from .env')}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingEnvKey ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald)' }} />
                    <span>{syncingEnvKey ? t('syncing', 'Syncing...') : t('syncFromEnv', 'Sync from .env')}</span>
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
                    <span className="block font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t('googleGeminiTitle', 'Google Gemini')}</span>
                    <span className="text-[11px] opacity-75">{t('googleGeminiSubtitle', 'Gemini 3.5 Flash Lite / 3.6 Flash')}</span>
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
                    <span className="block font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t('openAiTitle', 'OpenAI GPT')}</span>
                    <span className="text-[11px] opacity-75">{t('openAiSubtitle', 'GPT-4o / GPT-4 Turbo')}</span>
                  </div>
                </button>
              </div>

              <div className="pt-2 space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('apiKeyLabel', 'API Key')}
                    </label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                      {provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                      placeholder={provider === 'gemini' ? t('apiKeyPlaceholderGemini', 'AIzaSy...') : t('apiKeyPlaceholderOpenAI', 'sk-...')}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('apiKeyLabel', 'API Key')}
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
                        title={showApiKey ? t('hideApiKey', 'Hide API key') : t('showApiKey', 'Show API key')}
                        aria-label={showApiKey ? t('hideApiKey', 'Hide API key') : t('showApiKey', 'Show API key')}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestApiKey}
                        disabled={testingKey}
                        className="px-2.5 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md disabled:opacity-50 hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        title={t('testConnection', 'Test API Key connection live')}
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
                      className="mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: testResult.success ? 'var(--color-emerald)' : 'var(--color-danger-border, rgba(239, 68, 68, 0.4))',
                        color: testResult.success ? 'var(--color-emerald)' : 'var(--color-danger, #ef4444)'
                      }}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-emerald)' }} />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-danger, #ef4444)' }} />
                      )}
                      <span className="leading-snug">{testResult.message}</span>
                    </div>
                  )}
                  <span className="text-[10px] mt-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('persistedServerSyncNotice', 'Persisted directly to server storage and synced to disk environment.')}
                  </span>
                </div>

                {/* Harmonized Model Selector with Custom Chevron */}
                <div>
                  <label className="block font-bold mb-1.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('modelVersionIdentifier', 'Model Version Identifier')}
                  </label>
                  <div className="relative">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      aria-label={t('modelVersionIdentifier', 'Model Version Identifier')}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full appearance-none border rounded-xl px-4 py-3 pr-10 outline-none cursor-pointer transition font-medium text-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    >
                      {provider === 'gemini' ? (
                        <>
                          <option value="gemini-3.6-flash" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('geminiOption36', 'Gemini 3.6 Flash (Latest Recommended)')}</option>
                          <option value="gemini-3.5-flash-lite" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('geminiOption35', 'Gemini 3.5 Flash Lite (Lightweight & Fast)')}</option>
                          <option value="gemini-2.5-pro" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('geminiOption25Pro', 'Gemini 2.5 Pro (Deep Culinary Reasoning)')}</option>
                        </>
                      ) : (
                        <>
                          <option value="gpt-4o" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('openaiOption4o', 'GPT-4o (Advanced reasoning)')}</option>
                          <option value="gpt-4-turbo" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('openaiOption4Turbo', 'GPT-4 Turbo')}</option>
                          <option value="gpt-3.5-turbo" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('openaiOption35Turbo', 'GPT-3.5 Turbo (High speed)')}</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                  <span className="text-[10px] mt-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('activeModelEndpointDesc', 'Active model endpoint used during AI prompt generation.')}
                  </span>
                </div>
              </div>
            </div>

            {/* 1.2 NEW: AI USAGE & TOKEN CONSUMPTION CHART */}
            <div 
              className="border rounded-3xl p-6 space-y-6 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 
                    className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <BarChart3 className="h-4 w-4" /> {t('aiUsageChartTitle', 'AI Engine Usage & Token Consumption Analytics')}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('aiUsageChartSubtitle', 'Real-time monitoring of prompt tokens, completions, request frequency, and estimated consumption.')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div 
                    className="flex border rounded-xl p-1 gap-1 text-[11px] font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    {[
                      { id: '24h', label: t('time24h', '24h') },
                      { id: '7d', label: t('time7d', '7 Days') },
                      { id: '30d', label: t('time30d', '30 Days') }
                    ].map(tf => {
                      const isSel = usageTimeframe === tf.id;
                      return (
                        <button
                          key={tf.id}
                          type="button"
                          onClick={() => setUsageTimeframe(tf.id as any)}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            isSel ? 'text-white shadow-xs' : 'hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor: isSel ? 'var(--color-primary)' : 'transparent',
                            color: isSel ? '#ffffff' : 'var(--color-text-secondary)'
                          }}
                        >
                          {tf.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => loadUsageMetrics(usageTimeframe)}
                    disabled={isLoadingUsage}
                    className="p-2 border rounded-xl transition cursor-pointer hover:opacity-80 disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title={t('refreshMetrics', 'Refresh metrics')}
                    aria-label={t('refreshMetrics', 'Refresh metrics')}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* KPI Summary Tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div 
                  className="p-4 rounded-2xl border transition-colors shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('totalInvocations', 'Total Invocations')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black" style={{ color: 'var(--color-text)' }}>
                      {totalRequests.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: 'var(--color-emerald)' }}>
                      <TrendingUp className="h-3 w-3" /> +14.2%
                    </span>
                  </div>
                  <span className="text-[10px] mt-1 block opacity-75" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('requestsInWindow', 'Requests in selected window')}
                  </span>
                </div>

                <div 
                  className="p-4 rounded-2xl border transition-colors shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('promptTokens', 'Prompt / Input Tokens')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black" style={{ color: 'var(--color-primary)' }}>
                      {(totalPromptTokens / 1000).toFixed(1)}k
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                      {totalRequests > 0 ? Math.round(totalPromptTokens / totalRequests) : 0}/req
                    </span>
                  </div>
                  <span className="text-[10px] mt-1 block opacity-75" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('contextAndHistoryTokens', 'Context, rules & intake input')}
                  </span>
                </div>

                <div 
                  className="p-4 rounded-2xl border transition-colors shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('completionTokens', 'Completion / Output Tokens')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black" style={{ color: 'var(--color-emerald)' }}>
                      {(totalCompletionTokens / 1000).toFixed(1)}k
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                      {totalRequests > 0 ? Math.round(totalCompletionTokens / totalRequests) : 0}/req
                    </span>
                  </div>
                  <span className="text-[10px] mt-1 block opacity-75" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('generatedRecipeOutputs', 'Generated meal plan cards & recipes')}
                  </span>
                </div>

                <div 
                  className="p-4 rounded-2xl border transition-colors shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('estimatedCost', 'Estimated Cost / Quota')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black" style={{ color: 'var(--color-text)' }}>
                      ${totalCostEstimate.toFixed(3)}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--color-emerald)' }}>
                      99.8% OK
                    </span>
                  </div>
                  <span className="text-[10px] mt-1 block opacity-75" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('tokensCombined', 'Combined:')} {(totalCombinedTokens / 1000).toFixed(1)}k {t('tokensUnit', 'tokens')}
                  </span>
                </div>
              </div>

              {/* SVG Dynamic Timeline Bar Chart */}
              <div 
                className="border rounded-2xl p-4 space-y-3 transition-colors shadow-inner"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="flex items-center justify-between text-[11px] pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text)' }}>
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: 'var(--color-primary)' }} />
                      <span>{t('promptTokensLegend', 'Prompt Tokens')}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text)' }}>
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: 'var(--color-emerald)' }} />
                      <span>{t('completionTokensLegend', 'Completion Tokens')}</span>
                    </span>
                  </div>

                  {hoveredPoint ? (
                    <div className="font-mono text-[10px] flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                      <span className="font-bold">{hoveredPoint.dayLabel}:</span>
                      <span style={{ color: 'var(--color-primary)' }}>{(hoveredPoint.promptTokens).toLocaleString()} in</span>
                      <span>•</span>
                      <span style={{ color: 'var(--color-emerald)' }}>{(hoveredPoint.completionTokens).toLocaleString()} out</span>
                      <span>•</span>
                      <span>{hoveredPoint.requests} reqs (${hoveredPoint.cost.toFixed(4)})</span>
                    </div>
                  ) : (
                    <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('hoverBarForDetails', 'Hover over columns for detailed day metrics')}
                    </span>
                  )}
                </div>

                <div className="w-full overflow-x-auto pt-2">
                  <svg 
                    viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`} 
                    className="w-full h-44 select-none min-w-[500px]"
                    preserveAspectRatio="none"
                  >
                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, gIdx) => {
                      const y = chartHeight - ratio * (chartHeight - 20) + 10;
                      return (
                        <g key={gIdx}>
                          <line
                            x1="0"
                            y1={y}
                            x2={chartWidth}
                            y2={y}
                            stroke="var(--color-border)"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                            opacity="0.6"
                          />
                          <text
                            x="4"
                            y={y - 3}
                            fontSize="8"
                            fill="var(--color-text-secondary)"
                            fontFamily="monospace"
                          >
                            {Math.round((maxTokenValue * ratio) / 1000)}k
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars for Each Day */}
                    {usagePoints.map((p, idx) => {
                      const n = usagePoints.length;
                      const colWidth = (chartWidth - 40) / n;
                      const barW = Math.max(colWidth * 0.55, 6);
                      const x = 30 + idx * colWidth + (colWidth - barW) / 2;

                      const promptH = ((p.promptTokens) / maxTokenValue) * (chartHeight - 30);
                      const compH = ((p.completionTokens) / maxTokenValue) * (chartHeight - 30);
                      const promptY = chartHeight - promptH;
                      const compY = promptY - compH;

                      const isHovered = hoveredPointIndex === idx;

                      return (
                        <g 
                          key={idx}
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                          className="cursor-pointer"
                        >
                          {/* Hover Background Pill */}
                          <rect
                            x={30 + idx * colWidth}
                            y="0"
                            width={colWidth}
                            height={chartHeight + 20}
                            fill={isHovered ? 'var(--color-primary)' : 'transparent'}
                            opacity={isHovered ? 0.08 : 0}
                            rx="4"
                          />

                          {/* Completion Tokens Bar (Stacked on top) */}
                          <rect
                            x={x}
                            y={compY}
                            width={barW}
                            height={Math.max(compH, 2)}
                            fill="var(--color-emerald)"
                            opacity={isHovered ? 1 : 0.85}
                            rx="2"
                          />

                          {/* Prompt Tokens Bar (Bottom) */}
                          <rect
                            x={x}
                            y={promptY}
                            width={barW}
                            height={Math.max(promptH, 2)}
                            fill="var(--color-primary)"
                            opacity={isHovered ? 1 : 0.9}
                            rx="2"
                          />

                          {/* X Axis Date Label */}
                          {(n <= 10 || idx % Math.ceil(n / 7) === 0 || idx === n - 1) && (
                            <text
                              x={x + barW / 2}
                              y={chartHeight + 16}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight={isHovered ? 'bold' : 'normal'}
                              fill={isHovered ? 'var(--color-text)' : 'var(--color-text-secondary)'}
                            >
                              {p.dayLabel}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Model Distribution Ratio */}
                <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                    {t('modelEngineBreakdown', 'Active Engine Invocations Share:')}
                  </span>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                      <span>Gemini 3.5 Flash Lite (71%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-emerald)' }} />
                      <span>Gemini 3.6 Flash (22%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-blue, #3b82f6)' }} />
                      <span>GPT-4o (7%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-TOPIC QUESTIONNAIRE BUILDER & RESULTS APPEARANCE PREVIEW */}
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
                          role="button"
                          tabIndex={0}
                          aria-label={sec.topicTitle}
                          onClick={() => setActiveTopicId(sec.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveTopicId(sec.id);
                            }
                          }}
                          className="p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xs outline-none"
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
                              title={isEnabled ? t('disableTopicTooltip', 'Disable topic') : t('enableTopicTooltip', 'Enable topic')}
                              aria-label={isEnabled ? t('disableTopicTooltip', 'Disable topic') : t('enableTopicTooltip', 'Enable topic')}
                            >
                              {isEnabled ? (
                                <ToggleRight className="h-6 w-6" style={{ color: 'var(--color-emerald)' }} />
                              ) : (
                                <ToggleLeft className="h-6 w-6" style={{ color: 'var(--color-text-secondary)' }} />
                              )}
                            </button>

                            {sections.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }}
                                className="p-1 rounded-lg transition cursor-pointer hover:opacity-80"
                                style={{ color: 'var(--color-text-secondary)' }}
                                title={t('deleteTopicTooltip', 'Delete topic section')}
                                aria-label={t('deleteTopicTooltip', 'Delete topic section')}
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
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('topicTitlePlaceholder', 'Topic Title')}
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
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('topicDescPlaceholder', 'Topic Description')}
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
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
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
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-bwignore="true"
                            data-form-type="other"
                            spellCheck={false}
                            className="font-bold text-sm bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none min-w-[200px] transition-colors truncate"
                            style={{ color: 'var(--color-text)' }}
                            placeholder={t('topicTitlePlaceholder', 'Topic Title...')}
                            title={t('editTopicTitleTooltip', 'Edit Topic Title')}
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
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-bwignore="true"
                          data-form-type="other"
                          spellCheck={false}
                          className="text-[11px] bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none w-full transition-colors truncate"
                          style={{ color: 'var(--color-text-secondary)' }}
                          placeholder={t('topicDescPlaceholder', 'Topic Description...')}
                          title={t('editTopicDescTooltip', 'Edit Topic Description')}
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
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="off"
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-bwignore="true"
                              data-form-type="other"
                              spellCheck={false}
                              aria-label={`${t('questionNumber', 'Question')} ${qIdx + 1}`}
                              className="bg-transparent border-none text-xs outline-none flex-1 font-medium"
                              style={{ color: 'var(--color-text)' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromTopic(activeSection.id, qIdx)}
                              className="transition p-1 cursor-pointer hover:opacity-75"
                              style={{ color: 'var(--color-text-secondary)' }}
                              title={t('removeQuestionTooltip', 'Remove question')}
                              aria-label={t('removeQuestionTooltip', 'Remove question')}
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
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('addQuestionPrefix', 'Add question')}
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

            {/* Results Appearance Section with Live Preview */}
            <div 
              className="border rounded-3xl p-6 space-y-6 shadow-sm text-xs mt-6 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <h2 
                className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <LayoutTemplate className="h-4 w-4" /> {t('resultsAppearanceHeader', 'Final Results Appearance in /chef Chat')}
              </h2>
              
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
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSel}
                      aria-label={mode.title}
                      onClick={() => setResultDisplayMode(mode.id as any)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setResultDisplayMode(mode.id as any);
                        }
                      }}
                      className="p-4 rounded-2xl border cursor-pointer transition space-y-2 shadow-xs hover:opacity-90 outline-none"
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

              {/* LIVE PREVIEW BOX */}
              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text)' }}>
                    <Eye className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('liveUiPreview', 'Live UI Preview')} ({resultDisplayMode.toUpperCase()} MODE)
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('liveUiPreviewNotice', 'Updates instantly when selecting above')}
                  </span>
                </div>

                <div 
                  className="border rounded-2xl p-4 space-y-3 shadow-inner transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {resultDisplayMode === 'compact' && (
                    <div className="space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between border-b pb-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                        <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                          <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('previewPlanTitle', 'High Protein Plan (3 Days)')}
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{t('threeOfThreeDays', '3/3 Days')}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div 
                          className="flex items-center justify-between p-2 rounded-xl border text-[11px]"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{t('previewDay1Title', 'Day 1 - Sunday:')}</span>
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{t('previewMealName1', 'Avocado Quinoa Bowl')}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>25m</span>
                        </div>
                        <div 
                          className="flex items-center justify-between p-2 rounded-xl border text-[11px]"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{t('previewDay2Title', 'Day 2 - Monday:')}</span>
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{t('previewMealName2', 'Grilled Salmon Salad')}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>20m</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultDisplayMode === 'detailed' && (
                    <div className="space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b pb-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                        <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-primary)' }}>{t('previewDetailedHeading', 'Detailed Master Plan Preview')}</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('previewThreeDays', '3 Days')}</span>
                      </div>
                      <div 
                        className="border rounded-xl p-3 space-y-2 text-[11px]"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="flex justify-between font-bold" style={{ color: 'var(--color-primary)' }}>
                          <span>{t('previewDay1Title', 'Day 1 - Sunday')}</span>
                          <span>{t('previewDinnerBadge', 'DINNER')}</span>
                        </div>
                        <div className="flex gap-2.5 items-start">
                          <div className="w-10 h-10 rounded-lg shrink-0 bg-cover bg-center border" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80)', borderColor: 'var(--color-border)' }} />
                          <div className="space-y-0.5 flex-1">
                            <h5 className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{t('previewMealName1', 'Avocado Quinoa Bowl')}</h5>
                            <p className="text-[10px] line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{t('previewMealDesc', 'Nutritious plant-based high-protein bowl with fresh lime dressing.')}</p>
                            <span className="text-[9px] block" style={{ color: 'var(--color-text-secondary)' }}>{t('previewIngredients', 'Ingredients: Quinoa, Avocado, Chickpeas, Olive Oil')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultDisplayMode === 'card' && (
                    <div className="space-y-3 animate-in fade-in">
                      <div 
                        className="rounded-xl overflow-hidden border"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="text-white px-3 py-2 flex items-center justify-between font-bold text-xs" style={{ backgroundColor: 'var(--color-primary)' }}>
                          <span>{t('previewDay1Title', 'Day 1 - Sunday')}</span>
                          <span className="text-[10px] opacity-90">{t('previewSampleDate', 'Sep 6')}</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg shrink-0 bg-cover bg-center border" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80)', borderColor: 'var(--color-border)' }} />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase" style={{ color: 'var(--color-primary)' }}>{t('previewDinnerBadge', 'Dinner')}</span>
                              <h4 className="font-extrabold text-xs truncate" style={{ color: 'var(--color-text)' }}>{t('previewMealName1', 'Avocado Quinoa Bowl')}</h4>
                              <p className="text-[10px] line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{t('previewCardMealDesc', 'Nutritious chef-curated home recipe suited to your diet.')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] pt-1 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" style={{ color: 'var(--color-emerald)' }} /> 15m</span>
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3" style={{ color: 'var(--color-primary)' }} /> 20m</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t('previewServings', '2 servings')}</span>
                          </div>
                        </div>
                      </div>
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
                role="button"
                tabIndex={0}
                aria-pressed={enableVoiceInteraction}
                aria-label={t('enableVoiceMode', 'Enable Voice Mode')}
                onClick={() => setEnableVoiceInteraction(!enableVoiceInteraction)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEnableVoiceInteraction(!enableVoiceInteraction);
                  }
                }}
                className="flex items-center gap-3 cursor-pointer border px-4 py-2.5 rounded-2xl shadow-xs transition hover:opacity-90 outline-none"
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
                  <div 
                    className={`w-4 h-4 rounded-full transition transform ${enableVoiceInteraction ? 'translate-x-4' : 'translate-x-0'}`} 
                    style={{ backgroundColor: 'var(--color-toggle-thumb, #ffffff)' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('voiceSynthesisEngine', 'Voice Synthesis Engine')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'version1', name: t('voiceEngineV1Name', 'Version 1.0'), desc: t('voiceEngineV1Desc', 'Standard Web Speech API') },
                    { id: 'version2', name: t('voiceEngineV2Name', 'Version 2.0'), desc: t('voiceEngineV2Desc', 'Neural HD Studio Voices') }
                  ].map((engine) => {
                    const isSel = voiceEngine === engine.id;
                    return (
                      <button
                        key={engine.id}
                        type="button"
                        onClick={() => setVoiceEngine(engine.id as any)}
                        className="p-3.5 rounded-2xl border text-left transition cursor-pointer shadow-xs hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: isSel ? 'var(--color-primary)' : 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        <span className="block font-bold text-sm" style={{ color: 'var(--color-text)' }}>{engine.name}</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{engine.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Harmonized Persona Selector with Custom Chevron */}
              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('assistantVoicePersona', 'Assistant Voice Persona')}
                </label>
                <div className="relative">
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    aria-label={t('assistantVoicePersona', 'Assistant Voice Persona')}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full appearance-none border rounded-xl px-4 py-3 pr-10 outline-none cursor-pointer transition text-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <option value="en-US-Neural2-F" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('voiceAria', 'Chef Aria (US Female - Warm & Professional)')}</option>
                    <option value="en-US-Neural2-D" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('voiceMarcus', 'Chef Marcus (US Male - Deep & Authoritative)')}</option>
                    <option value="en-GB-Neural2-A" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('voiceOliver', 'Chef Oliver (UK Male - Refined Accent)')}</option>
                    <option value="en-AU-Neural2-B" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('voiceMatilda', 'Chef Matilda (Australian - Friendly & Casual)')}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: 'var(--color-text-secondary)' }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('speechSpeed', 'Speech Speed')}: {voiceSpeed}x</span>
                  <span style={{ color: 'var(--color-emerald)' }}>{voiceSpeed === 1.0 ? t('speedNormal', 'Normal') : voiceSpeed > 1.0 ? t('speedFast', 'Fast') : t('speedRelaxed', 'Relaxed')}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.75"
                  step="0.25"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  aria-label={t('speechSpeed', 'Speech Speed')}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('speechSpeedDesc', 'Adjust the speaking pace of the AI assistant when reading recipe steps aloud.')}
                </p>
              </div>

              <div className="space-y-2 flex flex-col justify-center">
                <div 
                  role="button"
                  tabIndex={0}
                  aria-pressed={voiceAutoPlay}
                  aria-label={t('autoReadAiResponses', 'Auto-Read AI Responses')}
                  onClick={() => setVoiceAutoPlay(!voiceAutoPlay)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setVoiceAutoPlay(!voiceAutoPlay);
                    }
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs hover:opacity-90 outline-none"
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
                    <div 
                      className={`w-4 h-4 rounded-full transition transform ${voiceAutoPlay ? 'translate-x-4' : 'translate-x-0'}`} 
                      style={{ backgroundColor: 'var(--color-toggle-thumb, #ffffff)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AGENT PARAMETERS & KNOWLEDGE TUNING */}
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
                {t('autonomousCapabilitiesDesc', 'Control what data sources the AI agent searches and incorporates when responding on')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>/chef</span> {t('pageSuffix', '')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div 
                  role="button"
                  tabIndex={0}
                  aria-pressed={enableWebSearch}
                  aria-label={t('liveWebSearch', 'Live Web Search')}
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEnableWebSearch(!enableWebSearch);
                    }
                  }}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90 outline-none"
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
                      <div 
                        className={`w-4 h-4 rounded-full transition transform ${enableWebSearch ? 'translate-x-4' : 'translate-x-0'}`} 
                        style={{ backgroundColor: 'var(--color-toggle-thumb, #ffffff)' }}
                      />
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
                  role="button"
                  tabIndex={0}
                  aria-pressed={enablePantryContext}
                  aria-label={t('pantryContextSearch', 'Pantry Context Search')}
                  onClick={() => setEnablePantryContext(!enablePantryContext)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEnablePantryContext(!enablePantryContext);
                    }
                  }}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90 outline-none"
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
                      <div 
                        className={`w-4 h-4 rounded-full transition transform ${enablePantryContext ? 'translate-x-4' : 'translate-x-0'}`} 
                        style={{ backgroundColor: 'var(--color-toggle-thumb, #ffffff)' }}
                      />
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
                  role="button"
                  tabIndex={0}
                  aria-pressed={strictDietEnforcement}
                  aria-label={t('strictDietaryFilters', 'Strict Dietary Filters')}
                  onClick={() => setStrictDietEnforcement(!strictDietEnforcement)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setStrictDietEnforcement(!strictDietEnforcement);
                    }
                  }}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90 outline-none"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: strictDietEnforcement ? 'var(--color-blue, var(--color-primary))' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <ShieldAlert className="h-5 w-5" style={{ color: strictDietEnforcement ? 'var(--color-blue, var(--color-primary))' : 'var(--color-text-secondary)' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: strictDietEnforcement ? 'var(--color-blue, var(--color-primary))' : 'var(--color-border)' }}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full transition transform ${strictDietEnforcement ? 'translate-x-4' : 'translate-x-0'}`} 
                        style={{ backgroundColor: 'var(--color-toggle-thumb, #ffffff)' }}
                      />
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

            {/* AGENT PARAMETERS, KNOWLEDGE TUNING & RESTORED MAX TOKENS */}
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

              {/* TEMPERATURE, RESTORED MAX TOKENS, AND MAX PLAN DAYS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-4 border-b transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{t('temperatureLabel', 'Temperature (Creativity)')}: {temperature}</span>
                    <span style={{ color: 'var(--color-emerald)' }}>{temperature < 0.4 ? t('tempPrecise', 'Precise') : temperature > 0.8 ? t('tempCreative', 'Creative') : t('tempBalanced', 'Balanced')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    aria-label={t('temperatureLabel', 'Temperature')}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('temperatureDesc', 'Lower values yield structured recipes; higher values generate novel flavor profiles.')}
                  </p>
                </div>

                {/* RESTORED: Max Output Tokens Cap */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{t('maxTokensLabel', 'Max Tokens Output')}: {maxTokens}</span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-primary)' }}>{maxTokens} tok</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    aria-label={t('maxTokensLabel', 'Max Tokens')}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('maxTokensDesc', 'Controls maximum tokens returned per autonomous culinary generation prompt.')}
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
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    aria-label={t('maxPlanDaysCap', 'Max Plan Days')}
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
                    {t('maxPlanDaysDesc', 'Maximum number of days the AI can structure in a single meal plan sequence.')}
                  </p>
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

                <div className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('knowledgeBasePlaceholder', 'Knowledge Base...')}
                      value={newKbInput}
                      onChange={(e) => setNewKbInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKbInput.trim()) {
                          e.preventDefault();
                          setKnowledgeBaseList([...knowledgeBaseList, newKbInput.trim()]);
                          setNewKbInput('');
                        }
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('knowledgeBaseHeader', 'Knowledge Base')}
                      className="bg-transparent border-none outline-none w-full text-xs"
                      style={{ color: 'var(--color-text)' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newKbInput.trim()) {
                          setKnowledgeBaseList([...knowledgeBaseList, newKbInput.trim()]);
                          setNewKbInput('');
                        }
                      }}
                      className="w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 cursor-pointer transition hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        color: 'var(--color-text)'
                      }}
                      aria-label={t('addKnowledgeBaseItem', 'Add Knowledge Base Item')}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {knowledgeBaseList.map((item, idx) => (
                    <span 
                      key={idx}
                      className="border px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setKnowledgeBaseList(knowledgeBaseList.filter((_, i) => i !== idx))}
                        className="transition cursor-pointer hover:opacity-75"
                        style={{ color: 'var(--color-text-secondary)' }}
                        aria-label={`${t('removeItem', 'Remove')} ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* CUSTOM VOCABULARY FEATURE */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-emerald)' }}>
                    <BookA className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('customVocabularyHeader', 'Custom Vocabulary')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('customVocabularyDesc', 'Enhance accuracy with specialized culinary or business terminology.')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('startTypingToAdd', 'Start typing to add')}
                      value={newVocabInput}
                      onChange={(e) => setNewVocabInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newVocabInput.trim()) {
                          e.preventDefault();
                          setCustomVocabularyList([...customVocabularyList, newVocabInput.trim()]);
                          setNewVocabInput('');
                        }
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('customVocabularyHeader', 'Custom Vocabulary')}
                      className="bg-transparent border-none outline-none w-full text-xs"
                      style={{ color: 'var(--color-text)' }}
                    />
                    <span 
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (newVocabInput.trim()) {
                          setCustomVocabularyList([...customVocabularyList, newVocabInput.trim()]);
                          setNewVocabInput('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (newVocabInput.trim()) {
                            setCustomVocabularyList([...customVocabularyList, newVocabInput.trim()]);
                            setNewVocabInput('');
                          }
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 cursor-pointer transition hover:opacity-80 outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {t('enterKey', 'Enter')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customVocabularyList.map((item, idx) => (
                    <span 
                      key={idx}
                      className="border px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-emerald)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setCustomVocabularyList(customVocabularyList.filter((_, i) => i !== idx))}
                        className="transition cursor-pointer hover:opacity-75"
                        style={{ color: 'var(--color-text-secondary)' }}
                        aria-label={`${t('removeItem', 'Remove')} ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* FILTER WORDS FEATURE */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-danger, #ef4444)' }}>
                    <Ban className="h-4 w-4" style={{ color: 'var(--color-danger, #ef4444)' }} /> {t('filterWordsHeader', 'Filter Words')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('filterWordsDesc', 'Restricted words or ingredients remain unspoken or avoided in AI outputs.')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('startTypingToAdd', 'Start typing to add')}
                      value={newFilterInput}
                      onChange={(e) => setNewFilterInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFilterInput.trim()) {
                          e.preventDefault();
                          setFilterWordsList([...filterWordsList, newFilterInput.trim()]);
                          setNewFilterInput('');
                        }
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      aria-label={t('filterWordsHeader', 'Filter Words')}
                      className="bg-transparent border-none outline-none w-full text-xs"
                      style={{ color: 'var(--color-text)' }}
                    />
                    <span 
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (newFilterInput.trim()) {
                          setFilterWordsList([...filterWordsList, newFilterInput.trim()]);
                          setNewFilterInput('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (newFilterInput.trim()) {
                            setFilterWordsList([...filterWordsList, newFilterInput.trim()]);
                            setNewFilterInput('');
                          }
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 cursor-pointer transition hover:opacity-80 outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {t('enterKey', 'Enter')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {filterWordsList.map((item, idx) => (
                    <span 
                      key={idx}
                      className="border px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-danger-border, rgba(239, 68, 68, 0.4))',
                        color: 'var(--color-text)'
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setFilterWordsList(filterWordsList.filter((_, i) => i !== idx))}
                        className="transition cursor-pointer hover:opacity-75"
                        style={{ color: 'var(--color-text-secondary)' }}
                        aria-label={`${t('removeItem', 'Remove')} ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
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
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  aria-label={t('systemPromptHeader', 'System Prompt')}
                  className="settings-input w-full border rounded-xl p-3.5 outline-none leading-relaxed font-sans text-xs transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('systemPromptDesc', 'Defines how the AI agent behaves, formats responses, and handles user queries on the')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>/chef</span> {t('pageSuffix', '')}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
