// Generated / Updated by AI Collaborator
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Radio, Activity, CheckCircle2, XCircle, Loader2,
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

  // AI Configurations
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
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

  // Multi-Topic Questionnaire State
  const [sections, setSections] = useState<QuestionnaireSection[]>(DEFAULT_SECTIONS);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string>('sec_core');
  const [newQuestionText, setNewQuestionText] = useState('');

  const [saved, setSaved] = useState(false);

  // Dynamic Theme Synchronization
  const syncTheme = useCallback((incomingColors?: any) => {
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
          document.body.style.backgroundColor = '#f8fafc';
          document.body.style.color = '#0f172a';
        }
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        const bg = colors?.backgroundColor || colors?.backgroundDark || '#070b13';
        if (document.body) {
          document.body.style.backgroundColor = bg;
          document.body.style.color = colors?.textColor || '#ffffff';
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();

    const handleThemeEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      syncTheme(detail);
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
  }, [syncTheme]);

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
        if (serverData.themeColors && Object.keys(serverData.themeColors).length > 0) {
          syncTheme(serverData.themeColors);
        }

        const c = serverData.chefAiSettings || serverData.aiSettings || serverData;
        if (c.provider) setProvider(c.provider);
        else if (serverData.aiProvider) setProvider(serverData.aiProvider);

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
        if (c.resultDisplayMode !== undefined) setResultDisplayMode(c.resultDisplayMode);
        
        if (c.enableVoiceInteraction !== undefined) setEnableVoiceInteraction(c.enableVoiceInteraction);
        if (c.voiceEngine !== undefined) setVoiceEngine(c.voiceEngine);
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
  }, [syncTheme]);

  useEffect(() => {
    fetchEnvKeys();
    loadSettingsFromServer();
    setTimeout(() => {
      autoConnectGemini(true);
    }, 400);
  }, [loadSettingsFromServer]);

  const handleProviderChange = (newProvider: 'gemini' | 'openai') => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setModel('gemini-3.5-flash-lite');
      if (envKeysMap['GEMINI_API_KEY'] && !apiKey.trim()) {
        setApiKey(envKeysMap['GEMINI_API_KEY']);
      }
    } else {
      setModel('gpt-4o');
      if (envKeysMap['OPENAI_API_KEY'] && !apiKey.trim()) {
        setApiKey(envKeysMap['OPENAI_API_KEY']);
      }
    }
  };

  const handleTestApiKey = async () => {
    const keyToTest = apiKey.trim() || envKeysMap[provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'] || '';
    if (!keyToTest) {
      setTestResult({ success: false, message: t('enterApiKeyFirst', 'Please enter an API key or sync from .env first.') });
      return;
    }
    setTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest,
          model
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (_) {
        data = { success: false, error: `Invalid response from server (${res.status}: ${res.statusText})` };
      }
      if (data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || t('connectionFailed', 'Connection failed.') });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || t('verificationEndpointError', 'Could not reach verification endpoint.') });
    } finally {
      setTestingKey(false);
    }
  };

  const autoConnectGemini = async (silent = false) => {
    setAutoConnecting(true);
    if (!silent) setTestResult(null);

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

      if (!resolvedKey || resolvedKey.includes('sample') || resolvedKey.length < 10) {
        if (!silent) {
          setTestResult({ success: false, message: t('noGeminiKeyFound', 'No active Google Gemini key found in .env. Please enter a key.') });
        }
        setAutoConnecting(false);
        return;
      }

      const testRes = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          apiKey: resolvedKey,
          model: model || 'gemini-1.5-flash'
        })
      });

      const rawAutoText = await testRes.text();
      let testData: any = {};
      try {
        testData = rawAutoText ? JSON.parse(rawAutoText) : {};
      } catch (_) {
        testData = { success: false, error: `Invalid server response (${testRes.status})` };
      }
      if (testData.success) {
        setTestResult({ success: true, message: `Connected to Google Gemini (${model || 'gemini-1.5-flash'}) & key synced!` });

        await persistServerAdminSettings({
          aiProvider: 'gemini',
          aiModel: model || 'gemini-1.5-flash',
          chefAiSettings: {
            provider: 'gemini',
            apiKey: resolvedKey,
            model: model || 'gemini-1.5-flash',
            updatedAt: new Date().toISOString()
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          window.dispatchEvent(new Event('zecratary_settings_updated'));
          window.dispatchEvent(new Event('zecratary_engine_config_updated'));
        }
      } else if (!silent) {
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
        const cleanKey = targetKey.trim();
        setApiKey(cleanKey);
        setTestResult({
          success: true,
          message: `Synced ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} key (${cleanKey.substring(0, 8)}...) from .env successfully!`
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
          message: `No active ${provider === 'gemini' ? 'GEMINI_API_KEY or GOOGLE_API_KEY' : 'OPENAI_API_KEY'} found in your local .env file.`
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
    const cleanApiKey = apiKey.trim();

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
            message: `Key saved to local .env and synchronized (${provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'})`
          });
        } else {
          setTestResult({
            success: false,
            message: `Server stored settings, but .env save returned: ${data.error || 'Server rejected key save'}`
          });
        }
      } catch (err: any) {
        setTestResult({
          success: false,
          message: `Server stored settings, but .env save failed: ${err.message || 'Network error'}`
        });
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('zecratary_engine_config_updated'));
      window.dispatchEvent(new Event('zecratary_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  const activeSection = sections.find(s => s.id === activeTopicId) || sections[0];

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 font-sans px-2 sm:px-4 pt-2 transition-colors duration-200"
      style={{ 
        color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)',
        transition: 'background-color 200ms ease, color 200ms ease'
      }}
    >
      
      {/* Autofill & Transition Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .settings-input:-webkit-autofill,
        .settings-input:-webkit-autofill:hover,
        .settings-input:-webkit-autofill:focus,
        .settings-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'} inset !important;
          box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'} inset !important;
          -webkit-text-fill-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          caret-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
      `}} />

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 transition-colors duration-200" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary, #E05638)' }}>
            <Settings className="h-6 w-6" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('aiAssistantConfigTitle', 'AI Assistant Configuration')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('aiAssistantConfigSubtitle', 'Update settings and functional AI provider models for the')} <span className="font-mono font-bold" style={{ color: 'var(--color-primary, #E05638)' }}>/chef</span> {t('agentSuffix', 'agent')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span 
              className="border px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
              }}
            >
              <CheckCircle className="h-4 w-4" style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }} /> {t('settingsAppliedSynced', 'Settings Applied & Synced')}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-90"
            style={{ 
              backgroundColor: 'var(--color-primary, #E05638)',
              boxShadow: '0 8px 20px -4px rgba(224, 86, 56, 0.3)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <Check className="h-4 w-4" /> {t('saveConfigurationBtn', 'Save Configuration')}
          </button>
        </div>
      </div>

      {/* HORIZONTAL CONFIGURATION TABS */}
      <div className="flex border-b gap-6 overflow-x-auto transition-colors duration-200" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
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
                borderColor: isActive ? 'var(--color-primary, #E05638)' : 'transparent',
                color: isActive ? 'var(--color-primary, #E05638)' : (isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)')
              }}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* TAB 1: GENERAL & MODEL CONFIG */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in">
            <div 
              className="border rounded-3xl p-6 space-y-5 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 
                    className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  >
                    <Sparkles className="h-4 w-4" /> {t('aiEngineProviderTitle', 'AI Engine Provider & Model Selection')}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('aiEngineProviderDesc', 'Select your active AI provider and model version. This choice controls which model processes prompts in')} <span className="font-mono font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>/api/ai</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => autoConnectGemini(false)}
                    disabled={autoConnecting}
                    className="border font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-xs hover:opacity-90"
                    style={{
                      backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)',
                      borderColor: 'var(--color-primary, #E05638)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                    title="Auto-connect and sync Gemini API key"
                  >
                    <Radio className={`h-3 w-3 ${autoConnecting ? 'animate-pulse' : ''}`} style={{ color: autoConnecting ? '#f59e0b' : 'var(--color-primary, #E05638)' }} />
                    <span>{autoConnecting ? t('connecting', 'Connecting...') : t('autoConnectGemini', 'Auto-Connect Gemini')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReloadEnvKey}
                    className="border font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs hover:opacity-80"
                    style={{
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#334155' : '#cbd5e1'
                    }}
                    title="Reload API Key from .env"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingEnvKey ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald, #10b981)' }} />
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
                    backgroundColor: provider === 'gemini' 
                      ? (isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)') 
                      : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                    borderColor: provider === 'gemini' ? 'var(--color-primary, #E05638)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                    color: provider === 'gemini' ? (isDayMode ? '#991b1b' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                  }}
                >
                  <Bot className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary, #E05638)' }} />
                  <div>
                    <span className="block font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google Gemini</span>
                    <span className="text-[11px] opacity-75">Gemini 2.5 Pro / Flash / 1.5</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderChange('openai')}
                  className="p-4 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3.5 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: provider === 'openai' 
                      ? (isDayMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.2)') 
                      : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                    borderColor: provider === 'openai' ? 'var(--color-emerald, #10b981)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                    color: provider === 'openai' ? (isDayMode ? '#065f46' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                  }}
                >
                  <Zap className="h-5 w-5 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
                  <div>
                    <span className="block font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>OpenAI GPT</span>
                    <span className="text-[11px] opacity-75">GPT-4o / GPT-4 Turbo</span>
                  </div>
                </button>
              </div>

              <div className="pt-2 space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('apiKeyLabel', 'API Key')}</label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: isDayMode ? '#7e22ce' : '#c084fc' }}>
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
                        backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                        borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)')}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 transition cursor-pointer"
                        style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestApiKey}
                        disabled={testingKey}
                        className="px-2.5 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md disabled:opacity-50 hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                        title="Test API Key connection live"
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
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in shadow-xs ${
                      testResult.success 
                        ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300')
                        : (isDayMode ? 'bg-red-50 border-red-300 text-red-900' : 'bg-red-950/60 border-red-500/50 text-red-300')
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{testResult.message}</span>
                    </div>
                  )}
                  <span className="text-[10px] mt-1 block" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('persistedServerSyncNotice', 'Persisted directly to server storage and synced to disk environment.')}
                  </span>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('modelVersionIdentifier', 'Model Version Identifier')}
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 outline-none cursor-pointer transition font-medium"
                    style={{
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    {provider === 'gemini' ? (
                      <>
                        <option value="gemini-3.6-flash" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>Gemini 3.6 Flash (Latest Recommended)</option>
                        <option value="gemini-3.5-flash-lite" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>Gemini 3.5 Flash Lite (Lightweight & Fast)</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-4o (Advanced reasoning)</option>
                        <option value="gpt-4-turbo" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-3.5 Turbo (High speed)</option>
                      </>
                    )}
                  </select>
                  <span className="text-[10px] mt-1 block" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('activeModelEndpointDesc', 'Active model endpoint used during AI prompt generation.')}
                  </span>
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
                backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                <div>
                  <h2 
                    className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  >
                    <Layers className="h-4 w-4" /> {t('questionnaireManagerTitle', 'Multi-Topic Questionnaire & Wizard Manager')}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('questionnaireManagerDesc', 'Organize intake questions into categorized topics. Use the enable/disable toggle on each topic to include or exclude it from the')} <span className="font-mono font-bold" style={{ color: 'var(--color-primary, #E05638)' }}>/chef</span> {t('intakeWizard', 'intake wizard.')}
                  </p>
                </div>
                <span 
                  className="border px-3 py-1 rounded-full font-bold text-xs shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)',
                    borderColor: 'var(--color-primary, #E05638)',
                    color: 'var(--color-primary, #E05638)'
                  }}
                >
                  {sections.filter(s => s.enabled !== false).length}/{sections.length} {t('topicsActiveBadge', 'Topics Active')}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                <div className="lg:col-span-5 space-y-3">
                  <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
                            backgroundColor: isActive 
                              ? (isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)') 
                              : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                            borderColor: isActive ? 'var(--color-primary, #E05638)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                            opacity: isEnabled ? 1 : 0.65
                          }}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2 flex-1">
                            <div className="font-bold text-xs truncate flex items-center justify-between" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isEnabled ? 'var(--color-primary, #E05638)' : '#64748b' }} />
                                <span className="truncate">{sec.topicTitle}</span>
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                                isEnabled 
                                  ? (isDayMode ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30') 
                                  : (isDayMode ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400')
                              }`}>
                                {isEnabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                              </span>
                            </div>
                            <p className="text-[10px] truncate" style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}>{sec.description}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-2 border-l" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleSectionEnabled(sec.id, e)}
                              className="p-1 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              title={isEnabled ? 'Disable topic' : 'Enable topic'}
                            >
                              {isEnabled ? (
                                <ToggleRight className="h-6 w-6 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-6 w-6 text-slate-400" />
                              )}
                            </button>

                            {sections.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }}
                                className="p-1 rounded-lg hover:text-red-500 transition cursor-pointer"
                                style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}
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
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      <FolderPlus className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('addNewTopicHeader', 'Add New Questionnaire Topic')}
                    </span>
                    <input
                      type="text"
                      placeholder={t('topicTitlePlaceholder', 'Topic Title (e.g. Fitness & Macros)...')}
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      className="settings-input w-full border rounded-xl px-3 py-2 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)')}
                    />
                    <input
                      type="text"
                      placeholder={t('topicDescPlaceholder', 'Topic Description...')}
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                      className="settings-input w-full border rounded-xl px-3 py-2 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={handleAddTopicSection}
                      disabled={!newTopicTitle.trim()}
                      className="w-full text-white font-bold py-2 rounded-xl transition text-xs disabled:opacity-40 cursor-pointer shadow-md hover:opacity-90"
                      style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                    >
                      {t('createTopicBtn', 'Create Topic Category')}
                    </button>
                  </div>
                </div>

                <div 
                  className="lg:col-span-7 border rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-colors duration-200"
                  style={{
                    backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)',
                    opacity: activeSection?.enabled !== false ? 1 : 0.7
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <ListPlus className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary, #E05638)' }} /> 
                          <input
                            type="text"
                            value={activeSection?.topicTitle || ''}
                            onChange={(e) => {
                              const newTitle = e.target.value;
                              setSections(sections.map(s => s.id === activeSection?.id ? { ...s, topicTitle: newTitle } : s));
                            }}
                            className="font-bold text-sm bg-transparent border-b border-transparent hover:border-slate-400 focus:border-[var(--color-primary)] outline-none min-w-[200px] transition-colors truncate"
                            style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                            placeholder="Topic Title..."
                            title="Edit Topic Title"
                          />
                          <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                            activeSection?.enabled !== false 
                              ? (isDayMode ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30') 
                              : (isDayMode ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400')
                          }`}>
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
                          style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}
                          placeholder="Topic Description..."
                          title="Edit Topic Description"
                        />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                        {activeSection?.questions.length || 0} {t('questionsCount', 'Questions')}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {activeSection?.questions.length === 0 ? (
                        <div className="text-center py-8 text-xs italic" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                          {t('noQuestionsYet', 'No questions in this topic yet. Add one below.')}
                        </div>
                      ) : (
                        activeSection?.questions.map((qText, qIdx) => (
                          <div 
                            key={qIdx} 
                            className="flex items-center gap-2.5 border rounded-xl p-3 shadow-xs"
                            style={{
                              backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                              borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
                            }}
                          >
                            <span 
                              className="w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.15)' : 'rgba(224, 86, 56, 0.25)',
                                color: 'var(--color-primary, #E05638)'
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
                              style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromTopic(activeSection.id, qIdx)}
                              className="hover:text-red-500 transition p-1 cursor-pointer"
                              style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}
                              title="Remove question"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                    <input
                      type="text"
                      placeholder={`${t('addQuestionPrefix', 'Add question to')} "${activeSection?.topicTitle}"...`}
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddQuestionToTopic(activeSection.id))}
                      className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddQuestionToTopic(activeSection.id)}
                      className="text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md hover:opacity-90"
                      style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
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
                backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
              }}
            >
              <h2 
                className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
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
                      onClick={() => setResultDisplayMode(mode.id as any)}
                      className="p-4 rounded-2xl border cursor-pointer transition space-y-2 shadow-xs hover:opacity-90"
                      style={{
                        backgroundColor: isSel 
                          ? (isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)') 
                          : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                        borderColor: isSel ? 'var(--color-primary, #E05638)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                        color: isSel ? (isDayMode ? '#0f172a' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                      }}
                    >
                      <div className="flex items-center justify-between font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        <span>{mode.title}</span>
                        {isSel && <Check className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />}
                      </div>
                      <p className="text-[11px]">{mode.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="pt-3 border-t space-y-3" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-xs" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    <Eye className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('liveUiPreview', 'Live UI Preview')} ({resultDisplayMode.toUpperCase()} MODE)
                  </span>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('liveUiPreviewNotice', 'Updates instantly when selecting above')}
                  </span>
                </div>

                <div 
                  className="border rounded-2xl p-4 space-y-3 shadow-inner transition-colors duration-200"
                  style={{
                    backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)'
                  }}
                >
                  {resultDisplayMode === 'compact' && (
                    <div className="space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between border-b pb-2 text-xs" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                        <span className="font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                          <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('previewPlanTitle', 'High Protein Plan (3 Days)')}
                        </span>
                        <span style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>3/3 Days</span>
                      </div>
                      <div className="space-y-1.5">
                        <div 
                          className="flex items-center justify-between p-2 rounded-xl border text-[11px]"
                          style={{
                            backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                            borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
                          }}
                        >
                          <span className="font-bold" style={{ color: 'var(--color-primary, #E05638)' }}>Day 1 - Sunday:</span>
                          <span className="font-medium" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Avocado Quinoa Bowl</span>
                          <span style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>25m</span>
                        </div>
                        <div 
                          className="flex items-center justify-between p-2 rounded-xl border text-[11px]"
                          style={{
                            backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                            borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
                          }}
                        >
                          <span className="font-bold" style={{ color: 'var(--color-primary, #E05638)' }}>Day 2 - Monday:</span>
                          <span className="font-medium" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Grilled Salmon Salad</span>
                          <span style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>20m</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultDisplayMode === 'detailed' && (
                    <div className="space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b pb-2 text-xs" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                        <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-primary, #E05638)' }}>Detailed Master Plan Preview</span>
                        <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>3 Days</span>
                      </div>
                      <div 
                        className="border rounded-xl p-3 space-y-2 text-[11px]"
                        style={{
                          backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                          borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
                        }}
                      >
                        <div className="flex justify-between font-bold" style={{ color: 'var(--color-primary, #E05638)' }}>
                          <span>Day 1 - Sunday</span>
                          <span>DINNER</span>
                        </div>
                        <div className="flex gap-2.5 items-start">
                          <div className="w-10 h-10 rounded-lg shrink-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80)' }} />
                          <div className="space-y-0.5 flex-1">
                            <h5 className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Avocado Quinoa Bowl</h5>
                            <p className="text-[10px] line-clamp-1" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>Nutritious plant-based high-protein bowl with fresh lime dressing.</p>
                            <span className="text-[9px] block" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>Ingredients: Quinoa, Avocado, Chickpeas, Olive Oil</span>
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
                          backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                          borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
                        }}
                      >
                        <div className="text-white px-3 py-2 flex items-center justify-between font-bold text-xs" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                          <span>Day 1 - Sunday</span>
                          <span className="text-[10px] opacity-90">Sep 6</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg shrink-0 bg-cover bg-center border" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80)', borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #334155)' }} />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase" style={{ color: 'var(--color-primary, #E05638)' }}>Dinner</span>
                              <h4 className="font-extrabold text-xs truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Avocado Quinoa Bowl</h4>
                              <p className="text-[10px] line-clamp-1" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>Nutritious chef-curated home recipe suited to your diet.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] pt-1 border-t" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)', color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" style={{ color: 'var(--color-emerald, #10b981)' }} /> 15m</span>
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3" style={{ color: 'var(--color-primary, #E05638)' }} /> 20m</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 2 servings</span>
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
              backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
              <div>
                <h2 
                  className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  <Mic className="h-4 w-4" /> {t('voiceInteractionHeader', 'Voice Interaction & Speech Configuration')}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('voiceInteractionDesc', 'Configure text-to-speech engine, voice models, playback speed, and auto-read behavior.')}
                </p>
              </div>

              <div 
                onClick={() => setEnableVoiceInteraction(!enableVoiceInteraction)}
                className="flex items-center gap-3 cursor-pointer border px-4 py-2.5 rounded-2xl shadow-xs transition hover:opacity-90"
                style={{
                  backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)'
                }}
              >
                <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('enableVoiceMode', 'Enable Voice Mode')}</span>
                <div 
                  className="w-9 h-5 rounded-full p-0.5 transition"
                  style={{ backgroundColor: enableVoiceInteraction ? 'var(--color-primary, #E05638)' : (isDayMode ? '#cbd5e1' : '#334155') }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition transform ${enableVoiceInteraction ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
                          backgroundColor: isSel 
                            ? (isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)') 
                            : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                          borderColor: isSel ? 'var(--color-primary, #E05638)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                          color: isSel ? (isDayMode ? '#0f172a' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                        }}
                      >
                        <span className="block font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Version {ver === 'version1' ? '1.0' : '2.0'}</span>
                        <span className="text-[10px] opacity-75">{ver === 'version1' ? 'Standard Web Speech API' : 'Neural HD Studio Voices'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('assistantVoicePersona', 'Assistant Voice Persona')}
                </label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  <option value="en-US-Neural2-F" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>Chef Aria (US Female - Warm & Professional)</option>
                  <option value="en-US-Neural2-D" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>Chef Marcus (US Male - Deep & Authoritative)</option>
                  <option value="en-GB-Neural2-A" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>Chef Oliver (UK Male - Refined Accent)</option>
                  <option value="en-AU-Neural2-B" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>Chef Matilda (Australian - Friendly & Casual)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <span style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('speechSpeed', 'Speech Speed')}: {voiceSpeed}x</span>
                  <span style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}>{voiceSpeed === 1.0 ? 'Normal' : voiceSpeed > 1.0 ? 'Fast' : 'Relaxed'}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.75"
                  step="0.25"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--color-primary, #E05638)' }}
                />
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('speechSpeedDesc', 'Adjust the speaking pace of the AI assistant when reading recipe steps aloud.')}
                </p>
              </div>

              <div className="space-y-2 flex flex-col justify-center">
                <div 
                  onClick={() => setVoiceAutoPlay(!voiceAutoPlay)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                    <div>
                      <span className="font-bold text-xs block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('autoReadAiResponses', 'Auto-Read AI Responses')}</span>
                      <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>{t('autoReadAiResponsesDesc', 'Automatically speak answers aloud upon generation.')}</span>
                    </div>
                  </div>
                  <div 
                    className="w-9 h-5 rounded-full p-0.5 transition"
                    style={{ backgroundColor: voiceAutoPlay ? 'var(--color-primary, #E05638)' : (isDayMode ? '#cbd5e1' : '#334155') }}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition transform ${voiceAutoPlay ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AGENT PARAMETERS (AUTONOMOUS CAPABILITIES & KNOWLEDGE TUNING) */}
        {activeTab === 'advanced' && (
          <div className="space-y-6 animate-in fade-in">
            {/* AUTONOMOUS CAPABILITIES & SEARCH SCOPE CONTROL */}
            <div 
              className="border rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
              }}
            >
              <h2 
                className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <Globe className="h-4 w-4" /> {t('autonomousCapabilitiesHeader', 'Autonomous Capabilities & Search Scope Control')}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? 'var(--color-text-secondary, #64748b)' : 'var(--color-text-secondary, #94a3b8)' }}>
                {t('autonomousCapabilitiesDesc', 'Control what data sources the AI agent searches and incorporates when responding on')} <span className="font-mono font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>/chef</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div 
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: enableWebSearch 
                      ? (isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)') 
                      : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                    borderColor: enableWebSearch ? 'var(--color-primary, #E05638)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                    color: enableWebSearch ? (isDayMode ? '#0f172a' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <Globe className="h-5 w-5" style={{ color: enableWebSearch ? 'var(--color-primary, #E05638)' : '#64748b' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: enableWebSearch ? 'var(--color-primary, #E05638)' : (isDayMode ? '#cbd5e1' : '#334155') }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${enableWebSearch ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-xs block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('liveWebSearch', 'Live Web Search')}</span>
                    <span className="text-[10px] leading-tight block mt-0.5" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                      {t('liveWebSearchDesc', 'Allows AI to search external culinary web data, trends, and ingredient substitutes.')}
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setEnablePantryContext(!enablePantryContext)}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: enablePantryContext 
                      ? (isDayMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.2)') 
                      : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                    borderColor: enablePantryContext ? 'var(--color-emerald, #10b981)' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                    color: enablePantryContext ? (isDayMode ? '#0f172a' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <PackageCheck className="h-5 w-5" style={{ color: enablePantryContext ? 'var(--color-emerald, #10b981)' : '#64748b' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: enablePantryContext ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#cbd5e1' : '#334155') }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${enablePantryContext ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-xs block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('pantryContextSearch', 'Pantry Context Search')}</span>
                    <span className="text-[10px] leading-tight block mt-0.5" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                      {t('pantryContextSearchDesc', 'Automatically scans user pantry inventory to build recipes matching in-stock ingredients.')}
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setStrictDietEnforcement(!strictDietEnforcement)}
                  className="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 shadow-xs hover:opacity-90"
                  style={{
                    backgroundColor: strictDietEnforcement 
                      ? (isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)') 
                      : (isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)'),
                    borderColor: strictDietEnforcement ? '#3b82f6' : (isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'),
                    color: strictDietEnforcement ? (isDayMode ? '#0f172a' : '#ffffff') : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <ShieldAlert className="h-5 w-5" style={{ color: strictDietEnforcement ? (isDayMode ? '#2563eb' : '#60a5fa') : '#64748b' }} />
                    <div 
                      className="w-9 h-5 rounded-full p-0.5 transition"
                      style={{ backgroundColor: strictDietEnforcement ? '#3b82f6' : (isDayMode ? '#cbd5e1' : '#334155') }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${strictDietEnforcement ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-xs block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('strictDietaryFilters', 'Strict Dietary Filters')}</span>
                    <span className="text-[10px] leading-tight block mt-0.5" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                      {t('strictDietaryFiltersDesc', 'Enforces strict filtering against user allergies, avoid lists, and religious dietary rules.')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AGENT PARAMETERS & KNOWLEDGE TUNING */}
            <div 
              className="border rounded-3xl p-6 space-y-6 shadow-sm text-xs animate-in fade-in transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? 'var(--color-card, #ffffff)' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)'
              }}
            >
              <h2 
                className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <SlidersHorizontal className="h-4 w-4" /> {t('agentParametersHeader', 'Agent Parameters & Knowledge Tuning')}
              </h2>

              {/* CREATIVITY & MAX PLAN DAYS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4 border-b transition-colors duration-200" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <span style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('temperatureLabel', 'Temperature (Creativity)')}: {temperature}</span>
                    <span style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}>{temperature < 0.4 ? 'Precise & Structured' : temperature > 0.8 ? 'Creative & Experimental' : 'Balanced'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--color-primary, #E05638)' }}
                  />
                  <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('temperatureDesc', 'Lower values yield deterministic recipe structures; higher values generate novel flavor combinations.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)')}
                  />
                  <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('maxPlanDaysDesc', 'Maximum number of days the AI can structure in a single meal plan wizard sequence.')}
                  </p>
                </div>
              </div>

              {/* KNOWLEDGE BASE FEATURE */}
              <div className="space-y-3 pt-1">
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    <BookOpen className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('knowledgeBaseHeader', 'Knowledge Base')}
                  </h3>
                  <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('knowledgeBaseDesc', 'Fine-tune the assistant to your needs by adding reference source documents or databases.')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs"
                    style={{
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Knowledge Base..."
                      value={newKbInput}
                      onChange={(e) => setNewKbInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKbInput.trim()) {
                          e.preventDefault();
                          setKnowledgeBaseList([...knowledgeBaseList, newKbInput.trim()]);
                          setNewKbInput('');
                        }
                      }}
                      className="bg-transparent border-none outline-none w-full text-xs"
                      style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
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
                        backgroundColor: isDayMode ? 'var(--color-inner-dark, #e2e8f0)' : 'var(--color-card, #0b0f17)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
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
                        backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.12)' : 'rgba(224, 86, 56, 0.2)',
                        borderColor: 'var(--color-primary, #E05638)',
                        color: isDayMode ? '#991b1b' : '#ffffff'
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setKnowledgeBaseList(knowledgeBaseList.filter((_, i) => i !== idx))}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* CUSTOM VOCABULARY FEATURE */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    <BookA className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} /> {t('customVocabularyHeader', 'Custom Vocabulary')}
                  </h3>
                  <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('customVocabularyDesc', 'Enhance accuracy with specialized culinary or business terminology.')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs"
                    style={{
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
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
                      className="bg-transparent border-none outline-none w-full text-xs"
                      style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                    />
                    <span 
                      onClick={() => {
                        if (newVocabInput.trim()) {
                          setCustomVocabularyList([...customVocabularyList, newVocabInput.trim()]);
                          setNewVocabInput('');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 cursor-pointer transition hover:opacity-80"
                      style={{
                        backgroundColor: isDayMode ? 'var(--color-inner-dark, #e2e8f0)' : 'var(--color-card, #0b0f17)',
                        color: isDayMode ? '#334155' : '#cbd5e1'
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
                        backgroundColor: isDayMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.2)' ,
                        borderColor: 'var(--color-emerald, #10b981)',
                        color: isDayMode ? '#065f46' : '#ffffff'
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setCustomVocabularyList(customVocabularyList.filter((_, i) => i !== idx))}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* FILTER WORDS FEATURE */}
              <div className="space-y-3 pt-3 border-t transition-colors duration-200" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                <div>
                  <h3 className="font-bold text-xs flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    <Ban className="h-4 w-4 text-red-500" /> {t('filterWordsHeader', 'Filter Words')}
                  </h3>
                  <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('filterWordsDesc', 'Restricted words or ingredients remain unspoken or avoided in AI outputs.')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div 
                    className="settings-input flex-1 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between shadow-xs"
                    style={{
                      backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
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
                      className="bg-transparent border-none outline-none w-full text-xs"
                      style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                    />
                    <span 
                      onClick={() => {
                        if (newFilterInput.trim()) {
                          setFilterWordsList([...filterWordsList, newFilterInput.trim()]);
                          setNewFilterInput('');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 cursor-pointer transition hover:opacity-80"
                      style={{
                        backgroundColor: isDayMode ? 'var(--color-inner-dark, #e2e8f0)' : 'var(--color-card, #0b0f17)',
                        color: isDayMode ? '#334155' : '#cbd5e1'
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
                        backgroundColor: isDayMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(127, 29, 29, 0.3)',
                        borderColor: isDayMode ? '#fca5a5' : 'rgba(153, 27, 27, 0.6)',
                        color: isDayMode ? '#991b1b' : '#ffffff'
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setFilterWordsList(filterWordsList.filter((_, i) => i !== idx))}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* SYSTEM PROMPT / PERSONA */}
              <div className="space-y-2 pt-3 border-t transition-colors duration-200" style={{ borderColor: isDayMode ? 'var(--color-border, #e2e8f0)' : 'var(--color-border, #1e293b)' }}>
                <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('systemPromptHeader', 'System Prompt / Autonomous Persona')}
                </label>
                <textarea
                  rows={5}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="settings-input w-full border rounded-xl p-3.5 outline-none leading-relaxed font-sans text-xs transition"
                  style={{
                    backgroundColor: isDayMode ? 'var(--color-inner-dark, #f8fafc)' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? 'var(--color-border, #cbd5e1)' : 'var(--color-border, #1e293b)')}
                />
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('systemPromptDesc', 'Defines how the AI agent behaves, formats responses, and handles user queries on the')} <span className="font-mono font-bold" style={{ color: 'var(--color-primary, #E05638)' }}>/chef</span> {t('pageSuffix', 'page.')}
                </p>
              </div>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
