import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordTokenUsage } from '@/lib/tokenUsage';
import { getTokenSettings, deductUserTokens } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isQuestionnaireComplete = Boolean(body.isQuestionnaireComplete);
    const rawPrompt = (body.prompt || '').trim();

    // 1. Validate request payload
    if (!rawPrompt && !isQuestionnaireComplete) {
      return NextResponse.json({ error: 'Prompt or questionnaire completion answers are required.' }, { status: 400 });
    }

    // 2. Identify active user
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

    // 3. Load dynamic settings from PostgreSQL admin_settings
    let activeModel = 'gemini-1.5-flash';
    let geminiApiKey = '';
    let strictDietEnforcement = false;
    let filterWordsList: string[] = [];
    let customVocabularyList: string[] = [];
    let knowledgeBaseList: string[] = [];
    let enablePantryContext = true;
    let systemPrompt = 'You are Chef Foodie, an autonomous culinary AI assistant and executive chef.';
    let temperature = 0.7;
    let maxTokens = 2500;

    try {
      const rows = await query('SELECT ai_model, gemini_api_key, chef_ai_settings, settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
      if (rows.length > 0) {
        const r = rows[0];
        const c = r.chef_ai_settings || {};
        const s = r.settings || {};
        if (r.ai_model || c.model) activeModel = (r.ai_model || c.model).replace(/^models\//, '').trim();
        geminiApiKey = r.gemini_api_key || c.apiKey || c.geminiApiKey || s.geminiApiKey || s.apiKey || '';
        if (c.strictDietEnforcement !== undefined) strictDietEnforcement = Boolean(c.strictDietEnforcement);
        if (Array.isArray(c.filterWordsList)) filterWordsList = c.filterWordsList.filter(Boolean);
        if (Array.isArray(c.customVocabularyList)) customVocabularyList = c.customVocabularyList.filter(Boolean);
        if (Array.isArray(c.knowledgeBaseList)) knowledgeBaseList = c.knowledgeBaseList.filter(Boolean);
        if (c.enablePantryContext !== undefined) enablePantryContext = Boolean(c.enablePantryContext);
        if (c.systemPrompt) systemPrompt = c.systemPrompt;
        if (c.temperature !== undefined) temperature = Number(c.temperature);
        if (c.maxTokens !== undefined) maxTokens = Number(c.maxTokens);
      }
    } catch (_) {}

    if (!geminiApiKey) {
      geminiApiKey = process.env.GEMINI_API_KEY || 
                     process.env.GOOGLE_AI_API_KEY || 
                     process.env.GOOGLE_API_KEY || 
                     process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
                     process.env.AI_API_KEY || 
                     body.apiKey || '';
    }

    // 4. Strict Dietary Filters check
    if (strictDietEnforcement && filterWordsList.length > 0 && rawPrompt) {
      const lower = rawPrompt.toLowerCase();
      const matched = filterWordsList.find(word => {
        const clean = word.trim().toLowerCase();
        return clean.length > 1 && lower.includes(clean);
      });
      if (matched) {
        return NextResponse.json({
          success: false,
          error: `Request blocked: Your prompt contains restricted term "${matched}" under AI Strict Dietary Filters.`,
          restrictionType: 'filter_word_violation',
          violatedWord: matched
        }, { status: 422 });
      }
    }

    // 5. Token system validation
    let tokenSettings: any = { isEnabled: false, tokenSymbol: '🪙', chefCost: 1 };
    let chefCost = 1;
    let deduction: any = { success: true, deducted: 0, currentBalance: 0 };

    try {
      tokenSettings = await getTokenSettings();
      chefCost = tokenSettings.chefCost ?? 1;
      if (tokenSettings.isEnabled && chefCost > 0) {
        deduction = await deductUserTokens({
          userId,
          userEmail,
          cost: chefCost,
          feature: 'chef',
          description: isQuestionnaireComplete ? `Chef Intake Wizard: ${body.topicTitle || 'Meal Plan'}` : `Chef Foodie: "${rawPrompt.slice(0, 35)}..."`
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
    } catch (_) {}

    // 6. Formulate synthesized prompt context
    const prefs = body.preferences || {};
    const servings = prefs.servings || 2;
    const country = prefs.country || 'Singapore';
    const diets = Array.isArray(prefs.diets) ? prefs.diets.join(', ') : (prefs.diet || 'None');
    const allergies = Array.isArray(prefs.allergies) ? prefs.allergies.join(', ') : (prefs.allergy || 'None');
    const avoid = Array.isArray(prefs.avoid) ? prefs.avoid.join(', ') : 'None';
    const tastes = Array.isArray(prefs.tastes) ? prefs.tastes.join(', ') : 'None';
    const pantry = (enablePantryContext && Array.isArray(body.pantry) && body.pantry.length > 0)
      ? body.pantry.filter(Boolean).join(', ') 
      : 'None';

    let userRequestInstruction = rawPrompt;
    if (isQuestionnaireComplete) {
      const qAnswers = body.questionnaireAnswers || {};
      const answerList = Object.entries(qAnswers).map(([step, ans]) => `Step ${Number(step) + 1}: ${ans}`).join('\n');
      userRequestInstruction = `[INTAKE QUESTIONNAIRE COMPLETED: ${body.topicTitle || 'Custom Meal Plan'}]\nUser Answers:\n${answerList}\n\nPlease formulate a personalized multi-day meal plan and a signature Recommended Recipe card based on these intake criteria.`;
    }

    const fullSystemAndUserPrompt = `${systemPrompt}

USER CULINARY PROFILE:
- Target Servings: ${servings} people
- Regional Country / Cuisine: ${country}
- Dietary Preferences: ${diets}
- Strict Allergies: ${allergies}
- Avoid Ingredients: ${avoid}
- Taste Preferences: ${tastes}
- In-Stock Pantry Ingredients: ${pantry}
${customVocabularyList.length > 0 ? `- Custom Vocabulary: ${customVocabularyList.join(', ')}` : ''}
${knowledgeBaseList.length > 0 ? `- Culinary Knowledge Base: ${knowledgeBaseList.join('; ')}` : ''}

USER PROMPT / TASK:
${userRequestInstruction}

CRITICAL: Return a single valid JSON object strictly matching this schema:
{
  "reply": "Engaging, conversational message from Chef Foodie with cooking advice and highlights.",
  "recommendedRecipe": {
    "title": "Recipe Title",
    "description": "Appetizing description highlighting flavors and health benefits.",
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": ${servings},
    "calories": 480,
    "mealType": "Dinner",
    "ingredients": ["1 cup ingredient with quantity", "2 cloves minced garlic", "1 tbsp olive oil"],
    "instructions": ["1. Prepare all fresh ingredients.", "2. Sauté aromatics in a skillet.", "3. Simmer until tender and serve hot."],
    "chefTip": "Garnish with fresh herbs or a squeeze of lemon juice.",
    "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
  },
  "plan": {
    "title": "Nutritious Home Meal Plan",
    "totalDays": 3,
    "theme": "Balanced Nutrition",
    "budgetPerServing": "$5.00",
    "meals": [
      {
        "id": "meal_1",
        "dayIndex": 1,
        "dayLabel": "Day 1",
        "dateStr": "Tomorrow",
        "mealType": "DINNER",
        "title": "Dish Name",
        "description": "Short culinary summary",
        "prepMinutes": 15,
        "cookMinutes": 20,
        "servings": ${servings},
        "ingredients": ["Key ingredient 1", "Key ingredient 2"]
      }
    ]
  },
  "systemRecommendations": [
    { "label": "Schedule in Meal Planner", "route": "/planner", "description": "Add these meals to your weekly planner calendar." },
    { "label": "Check Pantry Stock", "route": "/pantry", "description": "Review and update in-stock ingredients." },
    { "label": "Generate Grocery List", "route": "/grocery", "description": "Send ingredients directly to your shopping checklist." }
  ]
}`;

    if (!geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Gemini API key is missing. Please configure your API key in /admin/ai-settings or .env.'
      }, { status: 401 });
    }

    // 7. Dynamic model execution with automated production fallback
    const candidateModels = Array.from(new Set([
      activeModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ].filter(Boolean)));

    let responseData: any = null;
    let successfulModel = activeModel;
    let lastError = '';

    for (const modelCandidate of candidateModels) {
      const cleanCandidate = modelCandidate.replace(/^models\//, '').trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanCandidate}:generateContent?key=${geminiApiKey}`;

      try {
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: fullSystemAndUserPrompt }]
              }
            ],
            generationConfig: {
              temperature: Math.max(0.0, Math.min(1.0, temperature)),
              maxOutputTokens: Math.max(512, Math.min(8192, maxTokens))
            }
          })
        });

        const data = await gRes.json();

        if (!gRes.ok) {
          const errMsg = data.error?.message || `HTTP ${gRes.status}`;
          lastError = errMsg;
          if (gRes.status === 404 || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('not supported')) {
            continue; // Fall back to next official model
          }
          if (gRes.status === 400 && errMsg.toLowerCase().includes('api key')) {
            return NextResponse.json({ success: false, error: `Google API Error: ${errMsg}` }, { status: 400 });
          }
          if (gRes.status === 403) {
            return NextResponse.json({ success: false, error: `Google API Error: ${errMsg}` }, { status: 403 });
          }
          continue;
        }

        responseData = data;
        successfulModel = cleanCandidate;
        break;
      } catch (netErr: any) {
        lastError = netErr.message;
      }
    }

    if (!responseData) {
      return NextResponse.json({
        success: false,
        error: `Gemini API execution failed across candidate models. Details: ${lastError || 'Could not establish connection.'}`
      }, { status: 502 });
    }

    // 8. Robust output parsing and response packaging
    const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed: any = null;

    try {
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    const reply = parsed?.reply || rawText || 'Here are personalized culinary recommendations based on your preferences.';
    const recommendedRecipe = parsed?.recommendedRecipe || parsed?.recipe || null;
    const plan = (isQuestionnaireComplete || parsed?.plan?.meals?.length) ? parsed?.plan : null;
    const systemRecommendations = parsed?.systemRecommendations || [
      { label: "Schedule in Meal Planner", route: "/planner", description: "Schedule these meals into your calendar." },
      { label: "Check Pantry Inventory", route: "/pantry", description: "Cross-check what you already have in stock." },
      { label: "Generate Grocery List", route: "/grocery", description: "Add required ingredients directly to your shopping cart." }
    ];

    // 9. Record token telemetry in PostgreSQL
    const promptTokens = Math.max(25, Math.ceil(fullSystemAndUserPrompt.length / 4));
    const completionTokens = Math.max(35, Math.ceil(rawText.length / 4));

    try {
      await recordTokenUsage({
        userId,
        userEmail,
        promptTokens,
        completionTokens,
        model: successfulModel,
        source: 'chef'
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      reply,
      recipe: recommendedRecipe,
      recommendedRecipe,
      plan,
      systemRecommendations,
      model: successfulModel,
      consumedSystemTokens: chefCost,
      tokenSymbol: tokenSettings.tokenSymbol,
      remainingBalance: deduction.currentBalance
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error in Chef AI engine.' }, { status: 500 });
  }
}
