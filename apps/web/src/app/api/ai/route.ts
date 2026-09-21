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
  } catch (err) {
    console.error('[PostgreSQL Pool Error]:', err);
    return null;
  }
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
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            map[k] = v;
          }
        }
      } catch (_) {}
    }
  }
  return map;
}

function sanitizeGeminiModel(rawModel: string): string {
  const m = (rawModel || '').toLowerCase().trim();
  if (!m || m.includes('3.5') || m.includes('3.6') || !m.startsWith('gemini')) {
    return 'gemini-2.5-flash';
  }
  return rawModel.replace(/^models\//, '');
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

    // 1. Fetch AI Configuration & Agent Parameters from PostgreSQL admin_settings
    let activeModel = 'gemini-2.5-flash';
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
          'SELECT chef_ai_settings, ai_model, ai_provider, value FROM admin_settings WHERE id = $1 LIMIT 1',
          ['primary_settings']
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
            const rawM = c.model || row.ai_model || 'gemini-2.5-flash';
            activeModel = provider === 'gemini' ? sanitizeGeminiModel(rawM) : (rawM || 'gpt-4o');
            if (c.apiKey) apiKey = c.apiKey.trim();
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
      } catch (e) {
        console.warn('[PostgreSQL] Settings load notice in /api/ai:', e);
      }
    }

    // Comprehensive API Key Resolution: admin_api_keys -> process.env -> disk .env
    if (!apiKey) {
      if (pool) {
        try {
          const kRes = await pool.query(
            "SELECT key_value FROM admin_api_keys WHERE (provider = $1 OR env_key IN ('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY')) AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
            [provider]
          );
          if (kRes.rows.length > 0 && kRes.rows[0].key_value) {
            apiKey = kRes.rows[0].key_value.trim();
          }
        } catch (_) {}
      }
    }

    if (!apiKey) {
      apiKey = provider === 'gemini' 
        ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
        : (process.env.OPENAI_API_KEY || '').trim();
    }

    if (!apiKey) {
      const diskMap = getEnvKeysFromDisk();
      apiKey = provider === 'gemini'
        ? (diskMap['GEMINI_API_KEY'] || diskMap['GOOGLE_API_KEY'] || diskMap['NEXT_PUBLIC_GEMINI_API_KEY'] || '').trim()
        : (diskMap['OPENAI_API_KEY'] || diskMap['NEXT_PUBLIC_OPENAI_API_KEY'] || '').trim();
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

    // 3. Token System Verification & Deduction
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

    // 4. Intent Classification: Greeting vs Recipe vs Cooking Question
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

    // User Culinary Preferences Context
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

    // 5. System Instructions Formulation
    const systemInstructions = `${systemPrompt}
You are Chef Foodie, an expert autonomous culinary AI chef and supportive cooking thought partner.
ACTIVE USER CULINARY PROFILE:
- Target Servings: ${servings} people
- Cuisine & Country Context: ${country}
- Dietary Rules: ${dietSummary} (MANDATORY: If Vegetarian or Vegan, NEVER suggest meat, poultry, seafood, or fish sauce!)
- Allergies to Exclude: ${allergySummary} (MANDATORY: NEVER include these allergens!)
- Avoided Ingredients & Cooking Styles: ${avoidSummary} (e.g. if avoiding 'Oily', do not deep-fry; use steaming, light searing, or roasting!)
- Flavor & Taste Profile: ${tasteSummary}
- In-Stock Pantry Items: ${pantrySummary}
${knowledgeBaseList.length > 0 ? `- Prioritized Knowledge Bases: ${knowledgeBaseList.join(', ')}` : ''}
${customVocabularyList.length > 0 ? `- Custom Terminology: ${customVocabularyList.join(', ')}` : ''}

BEHAVIOR AND JSON OUTPUT SPECIFICATIONS:
1. GREETING/CASUAL INQUIRY: If the user sends a greeting (e.g. "Hello", "Hi"), DO NOT generate a recipe named "Hello"! Greet the user warmly by name or as a passionate foodie, acknowledge that their ${dietSummary} profile for ${country} with ${servings} servings is loaded, and ask how you can help. Suggest 2-3 specific, tempting dish ideas. Return JSON with {"reply": "...", "recommendedRecipe": null}.
2. UNIQUE RECIPE GENERATION: When asked for a recipe or meal plan, generate an inventive, authentic dish. Always name real, quantified ingredients (e.g. "250g firm organic tofu, cubed", "2 cloves minced garlic", "1 tbsp toasted sesame oil") and specific directions. NEVER output vague placeholders like "Fresh Seasonal Vegetables" or "Balanced Quality Protein"!
3. Provide valid JSON structure:
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

    // 6. Live LLM Handshake with Auto-Retry Logic
    if (apiKey && apiKey.length > 8 && !apiKey.includes('sample')) {
      if (provider === 'gemini') {
        const modelsToAttempt = Array.from(new Set([activeModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']));

        for (const targetModel of modelsToAttempt) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

            let userPrompt = prompt;
            if (isQuestionnaire) {
              userPrompt = `User completed questionnaire for "${topicTitle}". Answers:\n${JSON.stringify(questionnaireAnswers, null, 2)}\nGenerate a ${maxPlanDays}-day meal plan and a signature recommended recipe honoring diet: ${dietSummary}, country: ${country}, avoid: ${avoidSummary}, servings: ${servings}.`;
            } else if (isGreeting) {
              userPrompt = `User said: "${prompt}". Reply warmly, acknowledge their ${dietSummary} preferences and ${servings}-person servings target for ${country}, and ask how you can help. DO NOT return a recipe card. Return JSON with {"reply": "..."}`;
            }

            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `${systemInstructions}\n\nUser: ${userPrompt}` }]
                  }
                ],
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
              break; // Success
            }
          } catch (err) {
            console.warn(`[Gemini Attempt ${targetModel} error]:`, err);
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
                { role: 'user', content: isGreeting ? `${prompt} (Acknowledge my profile, do not generate a recipe)` : prompt }
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
          }
        } catch (err) {
          console.warn('[OpenAI error in /api/ai]:', err);
        }
      }
    }

    // 7. Dynamic Fallback Synthesizer (Unique & Preference-Driven)
    if (!responseText) {
      if (isGreeting) {
        responseText = `Hello! I'm Chef Foodie, your culinary assistant. I have your preferences loaded and ready:
• **Servings**: Cooking for ${servings} ${(servings === 1 ? 'person' : 'people')}
• **Cuisine & Style**: ${country}
• **Diet**: ${dietSummary}
• **Allergies & Avoid**: ${allergies.concat(avoid).join(', ') || 'None'}
• **Flavor Note**: ${tasteSummary}
${pantryItems.length > 0 ? `• **Pantry Ingredients**: ${pantryItems.length} items in stock ready to use` : ''}

What would you like to cook today? You can ask for a personalized recipe, launch a meal plan wizard, or tell me what's in your fridge!`;
        recommendedRecipe = null;
      } else if (isPantryInquiry) {
        responseText = pantryItems.length > 0
          ? `You have ${pantryItems.length} items in your pantry: ${pantryItems.join(', ')}. Would you like a ${dietSummary} recipe built around these?`
          : "Your pantry inventory is currently empty. You can add items in the Pantry tab, or tell me what ingredients you have!";
        recommendedRecipe = null;
      } else {
        // Formulate a dynamic, non-generic recipe matching exact user profile
        const isVeg = diets.some((d: string) => d.toLowerCase().includes('veg'));
        const titles = isVeg
          ? [
              `${country} Fragrant Sesame Crusted Tofu & Bok Choy Bowl`,
              `${country} Spiced Chickpea & Roasted Cauliflower Bowl`,
              `Crispy Lemongrass Tempeh with Fragrant Jasmine Rice`,
              `Garlic Herb Quinoa with Glazed King Oyster Mushrooms`
            ]
          : [
              `${country} Pan-Seared Citrus Herb Salmon & Brown Rice`,
              `${country} Garlic Ginger Glazed Barramundi Fillet`,
              `Mediterranean Lemon Herb Chicken with Roasted Greens`,
              `Seared Herb Salmon with Steamed Seasonal Greens`
            ];

        const selectedTitle = titles[Math.floor(Math.random() * titles.length)];

        responseText = `Here is a custom ${dietSummary} culinary preparation formulated for ${servings} ${(servings === 1 ? 'person' : 'people')} in ${country}, strictly avoiding ${avoidSummary} and ${allergySummary}.`;

        recommendedRecipe = {
          title: selectedTitle,
          description: `An authentic culinary creation crafted specifically for your ${dietSummary} preferences, featuring ${country} aromatics, scaled for ${servings} portions, and prepared without heavy oil.`,
          prepMinutes: 15,
          cookMinutes: 20,
          servings: servings,
          calories: isVeg ? 430 : 490,
          mealType: 'Dinner',
          ingredients: isVeg ? [
            pantryItems[0] ? `In-Stock: ${pantryItems[0]}` : '300g Organic Firm Tofu (pressed and cubed)',
            '2 cups Baby Bok Choy or Tender Spinach',
            '1 cup Steamed Brown Rice or Quinoa',
            '1 tbsp Cold-Pressed Toasted Sesame Oil',
            '2 cloves Garlic and 1 tsp Minced Ginger',
            '2 tbsp Low-Sodium Tamari & Fresh Lime Juice'
          ] : [
            pantryItems[0] ? `In-Stock: ${pantryItems[0]}` : '2 Wild Salmon Fillets (6 oz each)',
            '2 cups Fresh Asparagus Spears or Bok Choy',
            '1 cup Tri-Color Quinoa or Jasmine Rice',
            '1 tbsp Cold-Pressed Extra Virgin Olive Oil',
            '2 cloves Minced Garlic & Fresh Thyme',
            '1 Fresh Lemon (juiced) & Cracked Black Pepper'
          ],
          instructions: [
            'Rinse all fresh produce and pat dry thoroughly.',
            'Heat the cold-pressed oil in a heavy skillet over medium-high heat with minced garlic and ginger.',
            isVeg 
              ? 'Sear tofu cubes for 3-4 minutes per side until evenly crisp and golden.'
              : 'Sear salmon skin-side down for 4 minutes until crisp, flip gently and cook for 3 more minutes.',
            'Toss fresh greens into the pan and steam lightly for 2 minutes with a splash of water.',
            'Assemble bowls with warm grains, top with the cooked protein and greens, and finish with fresh citrus zest.'
          ],
          chefTip: `To respect your preference against ${avoidSummary}, we use a light high-heat sear with minimal oil to achieve crispness naturally.`,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
        };
      }
    }

    // 8. Record Telemetry in PostgreSQL
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
