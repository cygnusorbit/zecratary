import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { recordTokenUsage } from '@/lib/tokenUsage';
import { getTokenSettings, deductUserTokens } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

let cachedPool: any = null;

async function getPostgresPool() {
  if (cachedPool) return cachedPool;
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connStr) return null;
  try {
    const { Pool } = await import('pg');
    const requiresSsl = connStr.includes('sslmode=require') || 
                        connStr.includes('neon.tech') || 
                        connStr.includes('supabase.co') || 
                        process.env.NODE_ENV === 'production';
    cachedPool = new Pool({
      connectionString: connStr,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    });
    return cachedPool;
  } catch (_) {
    return null;
  }
}

function cleanApiKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim();
}

function normalizeModel(model: string): string {
  const m = (model || '').trim().replace(/^models\//, '');
  // Automatically upgrade deprecated 2.0-flash to Google's recommended 3.6-flash
  if (!m || m === 'gemini-2.0-flash' || m === 'gemini-2.5-flash' || m === 'gemini-3.5-flash-lite') {
    return 'gemini-3.6-flash';
  }
  return m;
}

function getEnvKeysFromDisk(): Record<string, string> {
  const map: Record<string, string> = {};
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, 'apps', 'web', '.env'),
    path.join(cwd, 'apps', 'web', '.env.local'),
    path.resolve(cwd, '..', '.env'),
    path.resolve(cwd, '..', '.env.local')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const k = trimmed.substring(0, idx).trim();
            let v = trimmed.substring(idx + 1).trim();
            map[k] = cleanApiKey(v);
          }
        }
      } catch (_) {}
    }
  }
  return map;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').trim();
    const isQuestionnaire = Boolean(body.isQuestionnaireComplete);
    const questionnaireAnswers = body.questionnaireAnswers || {};
    const topicTitle = body.topicTitle || 'Culinary Meal Plan';

    let userId = body.userId;
    let userEmail = body.userEmail || body.email;

    if (!userId || !userEmail) {
      const cookieHeader = req.cookies.get('zecratary_session')?.value;
      if (cookieHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieHeader));
          userId = userId || parsed.id;
          userEmail = userEmail || parsed.email;
        } catch (_) {}
      }
    }

    if (!prompt && !isQuestionnaire) {
      return NextResponse.json({ error: 'Prompt or questionnaire submission is required' }, { status: 400 });
    }

    // 1. Fetch AI Settings and the EXACT Model configured in /admin/ai-settings
    let activeModel = 'gemini-3.6-flash';
    let provider = 'gemini';
    let apiKey = '';
    let temperature = 0.7;
    let maxTokens = 4096;
    let systemPrompt = 'You are Chef Foodie, an expert autonomous culinary AI assistant.';
    let strictDietEnforcement = false;
    let filterWordsList: string[] = [];
    let customVocabularyList: string[] = [];
    let knowledgeBaseList: string[] = [];
    let enableWebSearch = true;
    let enablePantryContext = true;
    let maxPlanDays = 7;
    let resultDisplayMode = 'card';

    const pool = await getPostgresPool();
    if (pool) {
      try {
        const sRes = await pool.query(
          'SELECT chef_ai_settings, ai_model, ai_provider, value FROM admin_settings ORDER BY updated_at DESC LIMIT 1'
        );
        if (sRes.rows.length > 0) {
          const row = sRes.rows[0];
          let c = row.chef_ai_settings;
          if (typeof c === 'string') {
            try { c = JSON.parse(c); } catch (_) { c = {}; }
          } else if (!c && row.value) {
            c = typeof row.value === 'string' ? JSON.parse(row.value).chefAiSettings || {} : row.value.chefAiSettings || {};
          }

          if (c) {
            if (c.provider || row.ai_provider) provider = c.provider || row.ai_provider || 'gemini';
            
            // Strictly honor the model selected in /admin/ai-settings
            const chosenModel = c.model || row.ai_model || 'gemini-3.6-flash';
            activeModel = provider === 'gemini' ? normalizeModel(chosenModel) : (chosenModel || 'gpt-4o');

            if (c.apiKey) apiKey = cleanApiKey(c.apiKey);
            if (c.temperature !== undefined) temperature = Number(c.temperature);
            if (c.maxTokens !== undefined) maxTokens = Number(c.maxTokens);
            if (c.systemPrompt) systemPrompt = c.systemPrompt;
            if (c.strictDietEnforcement !== undefined) strictDietEnforcement = Boolean(c.strictDietEnforcement);
            if (Array.isArray(c.filterWordsList)) filterWordsList = c.filterWordsList.filter(Boolean);
            if (Array.isArray(c.customVocabularyList)) customVocabularyList = c.customVocabularyList.filter(Boolean);
            if (Array.isArray(c.knowledgeBaseList)) knowledgeBaseList = c.knowledgeBaseList.filter(Boolean);
            if (c.enableWebSearch !== undefined) enableWebSearch = Boolean(c.enableWebSearch);
            if (c.enablePantryContext !== undefined) enablePantryContext = Boolean(c.enablePantryContext);
            if (c.maxPlanDays !== undefined) maxPlanDays = Number(c.maxPlanDays) || 7;
            if (c.resultDisplayMode) resultDisplayMode = c.resultDisplayMode;
          }
        }
      } catch (_) {}
    }

    // Resolve API Key
    if (!apiKey) {
      if (pool) {
        try {
          const kRes = await pool.query(
            "SELECT key_value FROM admin_api_keys WHERE (provider = $1 OR env_key IN ('GEMINI_API_KEY', 'GOOGLE_AI_KEY', 'GOOGLE_GENAI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY')) AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
            [provider]
          );
          if (kRes.rows.length > 0 && kRes.rows[0].key_value) {
            apiKey = cleanApiKey(kRes.rows[0].key_value);
          }
        } catch (_) {}
      }
    }

    if (!apiKey) {
      apiKey = cleanApiKey(
        provider === 'gemini'
          ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || '')
          : (process.env.OPENAI_API_KEY || '')
      );
    }

    if (!apiKey) {
      const diskMap = getEnvKeysFromDisk();
      apiKey = cleanApiKey(
        provider === 'gemini'
          ? (diskMap['GEMINI_API_KEY'] || diskMap['GOOGLE_AI_KEY'] || diskMap['GOOGLE_GENAI_API_KEY'] || diskMap['GOOGLE_API_KEY'] || '')
          : (diskMap['OPENAI_API_KEY'] || '')
      );
    }

    // 2. Strict Dietary Filter Verification
    if (strictDietEnforcement && filterWordsList.length > 0) {
      const combinedCheckText = `${prompt} ${JSON.stringify(questionnaireAnswers)}`.toLowerCase();
      const matchedWord = filterWordsList.find(word => {
        const clean = word.trim().toLowerCase();
        return clean.length > 1 && combinedCheckText.includes(clean);
      });

      if (matchedWord) {
        return NextResponse.json({
          success: false,
          error: `Request blocked: Restricted ingredient or term "${matchedWord}" detected under AI Strict Dietary Filters.`,
          restrictionType: 'filter_word_violation',
          violatedWord: matchedWord
        }, { status: 422 });
      }
    }

    // 3. Token Deduction
    const tokenSettings = await getTokenSettings();
    const chefCost = tokenSettings.chefCost ?? 1;
    let deduction: any = { success: true, deducted: 0, currentBalance: 0 };

    if (tokenSettings.isEnabled && chefCost > 0) {
      deduction = await deductUserTokens({
        userId,
        userEmail,
        cost: chefCost,
        feature: 'chef',
        description: isQuestionnaire 
          ? `Foodie Chef intake plan: "${topicTitle}"`
          : `Foodie Chef query: "${prompt.slice(0, 40)}..."`
      });

      if (!deduction.success) {
        return NextResponse.json({
          success: false,
          error: deduction.error,
          insufficientTokens: true,
          required: chefCost,
          currentBalance: deduction.currentBalance,
          tokenSymbol: tokenSettings.tokenSymbol
        }, { status: 402 });
      }
    }

    // 4. Intent Classification
    const lowerPrompt = prompt.toLowerCase().trim();
    const isGreeting = /^(hello|hi|hey|good\s*(morning|afternoon|evening)|howdy|greetings|halo|hola|bonjour)[\s!.,?]*$/i.test(lowerPrompt);
    const isPantryInquiry = lowerPrompt.includes('what is in my pantry') || lowerPrompt.includes("what's in my pantry");
    const isRecipeIntent = !isGreeting && !isPantryInquiry && (
      isQuestionnaire ||
      lowerPrompt.includes('recipe') ||
      lowerPrompt.includes('cook') ||
      lowerPrompt.includes('dish') ||
      lowerPrompt.includes('make') ||
      lowerPrompt.includes('meal plan') ||
      lowerPrompt.includes('dinner') ||
      lowerPrompt.includes('lunch') ||
      lowerPrompt.includes('breakfast') ||
      lowerPrompt.includes('snack') ||
      lowerPrompt.includes('prepare') ||
      lowerPrompt.includes('suggest') ||
      lowerPrompt.includes('idea')
    );

    const prefs = body.preferences || {};
    const servings = Number(prefs.servings || 2);
    const country = prefs.country || 'Singapore';
    const diets = Array.isArray(prefs.diet) ? prefs.diet : (prefs.diet ? [prefs.diet] : ['Vegetarian']);
    const allergies = Array.isArray(prefs.allergy) ? prefs.allergy : (prefs.allergy ? [prefs.allergy] : ['Peanuts']);
    const avoid = Array.isArray(prefs.avoid) ? prefs.avoid : (prefs.avoid ? [prefs.avoid] : ['Oily']);
    const tastes = Array.isArray(prefs.tastes) ? prefs.tastes : (prefs.tastes ? [prefs.tastes] : ['Less Spicy']);
    const pantryItems = enablePantryContext && Array.isArray(body.pantry) ? body.pantry : [];

    const dietSummary = diets.length > 0 ? diets.join(', ') : 'Standard balanced';
    const allergySummary = allergies.length > 0 ? allergies.join(', ') : 'None';
    const avoidSummary = avoid.length > 0 ? avoid.join(', ') : 'None';
    const tasteSummary = tastes.length > 0 ? tastes.join(', ') : 'Balanced';
    const pantrySummary = pantryItems.length > 0 ? pantryItems.slice(0, 10).join(', ') : 'No tracked pantry items';

    let responseText = '';
    let generatedPlan: any = null;
    let recommendedRecipe: any = null;

    const systemInstructions = `${systemPrompt}
You are Chef Foodie, an expert autonomous culinary AI chef and supportive cooking partner.
ACTIVE USER CULINARY PROFILE:
- Target Servings: ${servings} people
- Regional Cuisine & Country: ${country}
- Dietary Rules: ${dietSummary} (STRICT RULE: If Vegetarian or Vegan, NEVER suggest meat, poultry, seafood, or fish sauce!)
- Allergies to Exclude: ${allergySummary} (STRICT RULE: NEVER include these allergens!)
- Avoided Ingredients & Styles: ${avoidSummary} (e.g. if avoiding 'Oily', do not deep-fry; use steaming, light searing, or roasting!)
- Flavor & Taste Profile: ${tasteSummary}
- In-Stock Pantry Items: ${pantrySummary}
${knowledgeBaseList.length > 0 ? `- Prioritized Knowledge Bases: ${knowledgeBaseList.join(', ')}` : ''}
${customVocabularyList.length > 0 ? `- Custom Terminology: ${customVocabularyList.join(', ')}` : ''}

BEHAVIOR AND JSON OUTPUT SPECIFICATIONS:
1. GREETING/CASUAL INQUIRY: If the user sends a greeting (e.g. "Hello", "Hi"), DO NOT generate a recipe named "Hello"! Greet the user warmly, acknowledge their active ${dietSummary} profile for ${country} (${servings} servings), and ask how you can help. Suggest 2-3 specific, tempting dish ideas. Return JSON with {"reply": "...", "recommendedRecipe": null, "plan": null}.
2. UNIQUE RECIPE GENERATION: When asked for a recipe or meal plan, generate an inventive, authentic dish. Always name real, quantified ingredients (e.g. "250g firm organic tofu, cubed", "2 cloves minced garlic", "1 tbsp toasted sesame oil") and specific directions. NEVER output placeholder phrases like "Fresh Seasonal Vegetables" or "Balanced Quality Protein"!
3. When providing a recipe or meal plan, format your output strictly as a valid JSON object:
{
  "reply": "Warm conversational commentary explaining the culinary technique and how the dish honors their dietary profile",
  "recommendedRecipe": {
    "title": "Specific, creative recipe title",
    "description": "Engaging description explaining flavor, aroma, and dietary fit",
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": ${servings},
    "calories": 450,
    "mealType": "Dinner",
    "ingredients": ["Quantity + ingredient 1", "Quantity + ingredient 2", "Quantity + ingredient 3", "Quantity + ingredient 4", "Quantity + ingredient 5"],
    "instructions": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "chefTip": "Actionable culinary tip",
    "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"
  },
  "plan": null
}`;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "AI API Key is missing. Please configure and test your API key in /admin/ai-settings."
      }, { status: 400 });
    }

    let apiErrorDetails = '';

    // 5. Query Live API using the Active Model Configured in /admin/ai-settings
    if (provider === 'gemini') {
      // Prioritize the model selected in /admin/ai-settings; if deprecated, fall back to gemini-3.6-flash
      const modelsToAttempt = Array.from(new Set([activeModel, 'gemini-3.6-flash', 'gemini-1.5-flash']));

      for (let i = 0; i < modelsToAttempt.length; i++) {
        const targetModel = modelsToAttempt[i];
        try {
          let userPrompt = prompt;
          if (isQuestionnaire) {
            userPrompt = `User completed questionnaire for "${topicTitle}". Answers:\n${JSON.stringify(questionnaireAnswers, null, 2)}\nGenerate a ${maxPlanDays}-day meal plan and a signature recommended recipe honoring diet: ${dietSummary}, country: ${country}, avoid: ${avoidSummary}, servings: ${servings}. Output valid JSON with "reply", "plan", and "recommendedRecipe".`;
          } else if (isGreeting) {
            userPrompt = `User said: "${prompt}". Reply warmly, acknowledge their ${dietSummary} preferences and ${servings}-person servings target for ${country}, and ask how you can help. DO NOT return a recipe card. Return JSON with {"reply": "...", "recommendedRecipe": null, "plan": null}`;
          }

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemInstructions}\n\nUser Request: ${userPrompt}` }] }],
              generationConfig: {
                temperature: Math.max(0.6, Math.min(1.0, temperature)),
                maxOutputTokens: maxTokens
              }
            })
          });

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                responseText = parsed.reply || rawText;
                if (parsed.plan) generatedPlan = parsed.plan;
                if (isRecipeIntent || isQuestionnaire) {
                  recommendedRecipe = parsed.recommendedRecipe || parsed.recipe || null;
                }
              } catch (_) {
                responseText = rawText;
              }
            } else {
              responseText = rawText;
            }
            activeModel = targetModel;
            break;
          } else {
            const errData = await res.json().catch(() => ({}));
            const rawErrMsg = errData.error?.message || `Google API returned HTTP ${res.status}`;
            apiErrorDetails = rawErrMsg;

            // If Google returns deprecation guidance, dynamically extract the recommended model
            const matchRec = rawErrMsg.match(/use\s+models\/([a-zA-Z0-9.\-_]+)/i);
            if (matchRec && matchRec[1] && !modelsToAttempt.includes(matchRec[1])) {
              modelsToAttempt.push(matchRec[1]);
            }
          }
        } catch (err: any) {
          apiErrorDetails = err.message || 'Network request failed';
        }
      }
    } else if (provider === 'openai') {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel || 'gpt-4o',
            messages: [
              { role: 'system', content: systemInstructions },
              { role: 'user', content: isGreeting ? `${prompt} (Acknowledge profile, no recipe)` : prompt }
            ],
            temperature: Math.max(0.6, Math.min(1.0, temperature)),
            response_format: { type: 'json_object' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const rawContent = data.choices?.[0]?.message?.content || '';
          try {
            const parsed = JSON.parse(rawContent);
            responseText = parsed.reply || rawContent;
            if (parsed.plan) generatedPlan = parsed.plan;
            if (isRecipeIntent || isQuestionnaire) {
              recommendedRecipe = parsed.recommendedRecipe || parsed.recipe || null;
            }
          } catch (_) {
            responseText = rawContent;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          apiErrorDetails = errData.error?.message || `OpenAI returned HTTP ${res.status}`;
        }
      } catch (err: any) {
        apiErrorDetails = err.message;
      }
    }

    if (!responseText) {
      return NextResponse.json({
        success: false,
        error: `AI Provider (${provider}) generation failed: ${apiErrorDetails || 'Failed to reach API'}. Please verify your API key and model selection in /admin/ai-settings.`
      }, { status: 502 });
    }

    // 6. Record Telemetry in PostgreSQL
    const promptTokens = Math.max(20, Math.ceil((prompt.length + 200) / 4));
    const completionTokens = Math.max(30, Math.ceil(responseText.length / 4) + (recommendedRecipe ? 100 : 0));

    const tokenUsage = await recordTokenUsage({
      userId,
      userEmail,
      promptTokens,
      completionTokens,
      model: activeModel,
      source: 'chef'
    });

    return NextResponse.json({
      success: true,
      reply: responseText,
      plan: generatedPlan,
      recommendedRecipe,
      recipe: recommendedRecipe,
      model: activeModel,
      consumedSystemTokens: chefCost,
      tokenSymbol: tokenSettings.tokenSymbol,
      remainingBalance: deduction.currentBalance,
      tokenUsage: tokenUsage || {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        requestCount: 1
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
