import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordTokenUsage } from '@/lib/tokenUsage';
import { getTokenSettings, deductUserTokens } from '@/lib/tokenService';
import { resolveAndScrapeBestRecipe, extractImageFromUrl } from '@/lib/recipeScraper';

export const dynamic = 'force-dynamic';

function cleanJsonString(raw: string): string {
  if (!raw) return '';
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
  return match ? (match[1] || match[0]).trim() : raw.trim();
}

export async function POST(req: NextRequest) {
  try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

    let body: any = {};
    try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

      body = await req.json();
    } catch (_) {
      return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
    }

    const prompt = (body.prompt || '').trim();
    const isQuestionnaire = Boolean(body.isQuestionnaireComplete);
    const topicTitle = body.topicTitle || 'Custom Meal Plan';
    const qaList = Array.isArray(body.questionnaireSummary) ? body.questionnaireSummary : [];
    const answersMap = body.questionnaireAnswers || {};
    const prefs = body.preferences || {};
    const pantryItems = Array.isArray(body.pantry) ? body.pantry : [];
    let referenceUrls: string[] = Array.isArray(body.recommendedRecipeUrls) 
      ? body.recommendedRecipeUrls.filter(Boolean) 
      : [];

    let userId = body.userId;
    let userEmail = body.userEmail || body.email;

    if (!userId || !userEmail) {
      const cookieHeader = req.cookies.get('zecratary_session')?.value;
      if (cookieHeader) {
        try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

          const parsed = JSON.parse(decodeURIComponent(cookieHeader));
          userId = userId || parsed.id;
          userEmail = userEmail || parsed.email;
        } catch (_) {}
      }
    }

    if (!prompt && !isQuestionnaire) {
      return NextResponse.json({ success: false, error: 'Prompt or questionnaire completion is required' }, { status: 400 });
    }

    // 1. Fetch AI Configurations from PostgreSQL
    let activeModel = 'gemini-2.5-flash';
    let provider = 'gemini';
    let apiKey = '';
    let temperature = 0.7;
    let maxTokens = 4096;
    let systemPrompt = 'You are Chef Foodie, an expert executive culinary AI assistant.';
    let strictDietEnforcement = false;
    let filterWordsList: string[] = [];
    let customVocabularyList: string[] = [];
    let maxPlanDays = 7;

    try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

      const sRows = await query('SELECT chef_ai_settings, ai_model, ai_provider, value FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
      if (sRows.length > 0) {
        const row = sRows[0];
        let c = row.chef_ai_settings;
        if (typeof c === 'string') {
          try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }
 c = JSON.parse(c); } catch (_) { c = {}; }
        } else if (!c && row.value) {
          c = typeof row.value === 'string' ? JSON.parse(row.value).chefAiSettings || {} : row.value.chefAiSettings || {};
        }

        if (c) {
          if (c.model || row.ai_model) activeModel = (c.model || row.ai_model).replace(/^models\//, '');
          if (c.provider || row.ai_provider) provider = c.provider || row.ai_provider;
          if (c.apiKey) apiKey = c.apiKey;
          if (c.temperature !== undefined) temperature = Number(c.temperature);
          if (c.maxTokens !== undefined) maxTokens = Number(c.maxTokens);
          if (c.systemPrompt) systemPrompt = c.systemPrompt;
          if (c.strictDietEnforcement !== undefined) strictDietEnforcement = Boolean(c.strictDietEnforcement);
    let enableSavedRecipeSearch = true;
    if (c.enableSavedRecipeSearch !== undefined) enableSavedRecipeSearch = Boolean(c.enableSavedRecipeSearch);
    if (body.enableSavedRecipeSearch !== undefined) enableSavedRecipeSearch = Boolean(body.enableSavedRecipeSearch);
          if (Array.isArray(c.filterWordsList)) filterWordsList = c.filterWordsList.filter(Boolean);
          if (Array.isArray(c.customVocabularyList)) customVocabularyList = c.customVocabularyList.filter(Boolean);
          if (c.maxPlanDays !== undefined) maxPlanDays = Number(c.maxPlanDays) || 7;
          if (referenceUrls.length === 0 && Array.isArray(c.recommendedRecipeUrls)) {
            referenceUrls = c.recommendedRecipeUrls.filter(Boolean);
          }
        }
      }
    } catch (e) {
      console.warn('[PostgreSQL] Settings load notice:', e);
    }

    if (!apiKey) {
      try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

        const kRows = await query(
          "SELECT key_value FROM admin_api_keys WHERE (provider = $1 OR env_key IN ('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY')) AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
          [provider]
        );
        if (kRows.length > 0 && kRows[0].key_value) {
          apiKey = kRows[0].key_value;
        }
      } catch (_) {}
    }
    if (!apiKey) {
      apiKey = provider === 'gemini' 
        ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
        : (process.env.OPENAI_API_KEY || '');
    }

    // 2. Strict Dietary Filter Verification
    if (strictDietEnforcement && filterWordsList.length > 0) {
      const combinedCheck = `${prompt} ${JSON.stringify(answersMap)}`.toLowerCase();
      const matched = filterWordsList.find(w => {
        const clean = w.trim().toLowerCase();
        return clean.length > 1 && combinedCheck.includes(clean);
      });
      if (matched) {
        return NextResponse.json({
          success: false,
          error: `Request blocked: Restricted ingredient or keyword "${matched}" detected under AI Strict Dietary Filters.`,
          restrictionType: 'filter_word_violation'
        }, { status: 422 });
      }
    }

    // 3. Token Deduction Telemetry
    const tokenSettings = await getTokenSettings();
    const chefCost = tokenSettings.chefCost ?? 1;
    let deduction: any = { success: true, deducted: 0, currentBalance: 0 };

    if (tokenSettings.isEnabled && chefCost > 0) {
      deduction = await deductUserTokens({
        userId,
        userEmail,
        cost: chefCost,
        feature: 'chef',
        description: isQuestionnaire ? `Intake plan: ${topicTitle}` : `Chef prompt: ${prompt.slice(0, 35)}...`
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

    // 4. Parse Intake Questionnaire Variables
    let parsedDays = body.requestedDays || 3;
    let parsedMealTypes = body.requestedMealTypes || ['Dinner'];
    let parsedStartDate = body.startDate || 'Today';
    let parsedTheme = body.requestedTheme || (customVocabularyList[0] || 'High-Protein Wholesome');
    let parsedBudget = body.requestedBudget || '$5 - $8 per serving';

    for (const item of qaList) {
      const q = (item.question || '').toLowerCase();
      const a = (item.answer || '').trim();
      if (/\b(how many days|duration|number of days)\b/i.test(q)) {
        const m = a.match(/\d+/);
        if (m) parsedDays = Math.min(14, Math.max(1, parseInt(m[0], 10)));
      } else if (/\b(meal type|which meal|meals to include)\b/i.test(q)) {
        if (/all meals \+ snack/i.test(a)) parsedMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
        else if (/all meals/i.test(a)) parsedMealTypes = ['Breakfast', 'Lunch', 'Dinner'];
        else if (/breakfast & lunch/i.test(a)) parsedMealTypes = ['Breakfast', 'Lunch'];
        else if (/breakfast & dinner/i.test(a)) parsedMealTypes = ['Breakfast', 'Dinner'];
        else if (/lunch & dinner/i.test(a)) parsedMealTypes = ['Lunch', 'Dinner'];
        else if (/dinner only/i.test(a)) parsedMealTypes = ['Dinner'];
        else if (/lunch only/i.test(a)) parsedMealTypes = ['Lunch'];
        else parsedMealTypes = [a];
      } else if (/\b(when|start date|starting)\b/i.test(q)) {
        parsedStartDate = a;
      } else if (/\b(budget|cost|spend|price)\b/i.test(q)) {
        parsedBudget = a;
      } else if (/\b(theme|preference|flavor|cuisine)\b/i.test(q)) {
        parsedTheme = a;
      }
    }

    const servings = Number(prefs.servings || 2);
    const country = prefs.country || 'Singapore';
    const diets = Array.isArray(prefs.diet) ? prefs.diet : ['Vegetarian'];
    const allergies = Array.isArray(prefs.allergy) ? prefs.allergy : ['Peanuts'];
    const avoid = Array.isArray(prefs.avoid) ? prefs.avoid : ['Oily'];

    // 5. Intelligent Index Link Crawling & Slug Discovery
    let scrapedGrounding: any = null;
    if (referenceUrls.length > 0) {
      try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

        scrapedGrounding = await resolveAndScrapeBestRecipe(prompt || parsedTheme, referenceUrls);
      } catch (scrapeErr) {
        console.warn('[AI Route] Web scraper notice:', scrapeErr);
      }
    }

    let responseText = '';
    let generatedPlan: any = null;
    let recommendedRecipe: any = null;

    // 6. Query Generative AI with Scraped Source Grounding
    if (apiKey && apiKey.length > 10 && !apiKey.includes('sample')) {
      const modelsToTry = [activeModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      const uniqueModels = Array.from(new Set(modelsToTry));

      const intakeContext = qaList.length > 0 
        ? qaList.map(pair => `Q: ${pair.question}\nA: ${pair.answer}`).join('\n')
        : Object.entries(answersMap).map(([k, v]) => `Step ${k}: ${v}`).join('\n');

      const scrapedGroundingPrompt = scrapedGrounding ? `
PRIMARY SOURCE RECIPE (CRAWLED & EXTRACTED FROM ADMIN RECOMMENDED URL):
- Title: ${scrapedGrounding.title}
- Source URL: ${scrapedGrounding.sourceUrl}
- Domain: ${scrapedGrounding.sourceName}
- Ingredients: ${scrapedGrounding.ingredients.join(', ')}
- Instructions: ${scrapedGrounding.instructions.join(' ')}
- Prep: ${scrapedGrounding.prepMinutes}m | Cook: ${scrapedGrounding.cookMinutes}m
MANDATORY: Adapt and recommend this authentic dish as the signature Recommended Recipe, citing the source URL.` : '';

      const fullPrompt = isQuestionnaire
        ? `${systemPrompt}
${savedRecipesContext}
You are Chef Foodie. Formulate an accurate ${parsedDays}-day meal plan and a signature Recommended Recipe.
LOGISTICS & DIET:
- Total Days: ${parsedDays}
- Meal Types: ${parsedMealTypes.join(', ')}
- Theme: ${parsedTheme}
- Budget: ${parsedBudget}
- Servings: ${servings} people (${country})
- Diets: ${diets.join(', ')}
- Strictly Avoid / Allergies: ${allergies.concat(avoid).join(', ') || 'None'}
- Pantry In-Stock: ${pantryItems.length > 0 ? pantryItems.join(', ') : 'Standard kitchen staples'}
${referenceUrls.length > 0 ? `- Primary Sources: ${referenceUrls.join(', ')}` : ''}
${scrapedGroundingPrompt}

USER INTAKE RESPONSES:
${intakeContext}

Return ONLY valid JSON matching this schema:
{
  "reply": "Warm culinary message detailing the plan",
  "plan": {
    "title": "${parsedDays}-Day ${parsedTheme} Plan",
    "totalDays": ${parsedDays},
    "theme": "${parsedTheme}",
    "budgetPerServing": "${parsedBudget}",
    "meals": [
      {
        "id": "meal_1",
        "dayIndex": 1,
        "dayLabel": "Day 1",
        "dateStr": "${parsedStartDate}",
        "mealType": "${parsedMealTypes[0] || 'Dinner'}",
        "title": "Dish Name",
        "description": "Short culinary summary",
        "prepMinutes": 15,
        "cookMinutes": 20,
        "servings": ${servings},
        "ingredients": ["item 1", "item 2"]
      }
    ]
  },
  "recommendedRecipe": {
    "title": "${scrapedGrounding?.title || 'Signature Recipe Name'}",
    "description": "${scrapedGrounding?.description || 'Detailed chef description'}",
    "sourceUrl": "${scrapedGrounding?.sourceUrl || referenceUrls[0] || ''}",
    "sourceName": "${scrapedGrounding?.sourceName || ''}",
    "prepMinutes": ${scrapedGrounding?.prepMinutes || 15},
    "cookMinutes": ${scrapedGrounding?.cookMinutes || 20},
    "servings": ${servings},
    "calories": 480,
    "mealType": "${parsedMealTypes[0] || 'Dinner'}",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "chefTip": "Technique secret"
  }
}`
        : `${systemPrompt}
${savedRecipesContext}
User Query: "${prompt}"
Context: Cooking for ${servings} people in ${country}. Diet: ${diets.join(', ')}. Avoid: ${allergies.concat(avoid).join(', ')}. Pantry items: ${pantryItems.join(', ')}.
${referenceUrls.length > 0 ? `Primary References: ${referenceUrls.join(', ')}` : ''}
${scrapedGroundingPrompt}

Respond with valid JSON containing "reply" and optionally "recommendedRecipe".`;

      for (const mName of uniqueModels) {
        try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${apiKey}`;
          const gRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature, maxOutputTokens: maxTokens }
            })
          });

          if (gRes.ok) {
            const gData = await gRes.json();
            const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = cleanJsonString(rawText);
            if (cleaned) {
              try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

                const parsed = JSON.parse(cleaned);
                responseText = parsed.reply || rawText;
                if (parsed.plan) generatedPlan = parsed.plan;
                if (parsed.recommendedRecipe) recommendedRecipe = parsed.recommendedRecipe;
                else if (parsed.recipe) recommendedRecipe = parsed.recipe;
                break;
              } catch (_) {
                responseText = rawText;
              }
            } else {
              responseText = rawText;
            }
            break;
          }
        } catch (_) {}
      }
    }

    // 7. Synthetic Fallback if LLM was unavailable
    if (!responseText) {
      if (scrapedGrounding) {
        recommendedRecipe = {
          title: scrapedGrounding.title,
          description: scrapedGrounding.description,
          sourceUrl: scrapedGrounding.sourceUrl,
          sourceName: scrapedGrounding.sourceName,
          prepMinutes: scrapedGrounding.prepMinutes,
          cookMinutes: scrapedGrounding.cookMinutes,
          servings: servings,
          calories: scrapedGrounding.calories || 490,
          mealType: parsedMealTypes[0] || 'Dinner',
          ingredients: scrapedGrounding.ingredients,
          instructions: scrapedGrounding.instructions,
          chefTip: 'Rest for 2 minutes before serving so aromas infuse completely.',
          image: scrapedGrounding.image
        };
        responseText = `Here is a curated recipe recommendation derived directly from your primary source (${scrapedGrounding.sourceName || 'web source'}).`;
      } else if (isQuestionnaire) {
        const meals: any[] = [];
        for (let dIdx = 0; dIdx < parsedDays; dIdx++) {
          for (const mType of parsedMealTypes) {
            meals.push({
              id: `meal_${Date.now()}_${dIdx}_${mType}`,
              dayIndex: dIdx + 1,
              dayLabel: `Day ${dIdx + 1}`,
              dateStr: `Schedule ${dIdx + 1}`,
              mealType: mType,
              title: `${country} Wholesome ${mType}`,
              description: `Nutritious, chef-curated ${parsedTheme.toLowerCase()} selection.`,
              prepMinutes: 15,
              cookMinutes: 20,
              servings,
              ingredients: ['Olive Oil', 'Aromatics', 'Fresh Vegetables', 'Plant or Lean Protein'],
              image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
            });
          }
        }

        generatedPlan = {
          title: `${parsedDays}-Day ${parsedTheme} Plan`,
          totalDays: parsedDays,
          theme: parsedTheme,
          budgetPerServing: parsedBudget,
          meals
        };

        recommendedRecipe = {
          title: `${country} Signature ${parsedTheme} Medley`,
          description: `Formulated based on your ${topicTitle} answers. Balanced and avoids ${allergies.concat(avoid).join(', ') || 'unhealthy additives'}.`,
          prepMinutes: 15,
          cookMinutes: 25,
          servings,
          calories: 490,
          mealType: parsedMealTypes[0] || 'Dinner',
          ingredients: [
            pantryItems[0] ? `In-Stock Pantry: ${pantryItems[0]}` : 'Crisp Tofu or Fresh Salmon Fillet',
            '2 cups Fresh Leafy Greens (Spinach & Bok Choy)',
            '1 cup Steamed Tri-Color Quinoa or Brown Rice',
            '1 tbsp Cold-Pressed Sesame or Olive Oil',
            'Fresh Ginger, Minced Garlic, and Low-Sodium Tamari'
          ],
          instructions: [
            'Rinse and prep fresh produce and protein cleanly.',
            'Warm oil in a skillet and gently sauté aromatics over medium heat.',
            'Cook protein evenly until golden and crisp, then fold in greens.',
            'Serve warm over fluffy grains with a citrus dressing.'
          ],
          chefTip: 'Rest the dish for 2 minutes before serving so flavors infuse completely.',
          sourceUrl: referenceUrls[0] || '',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
        };

        responseText = `I have formulated your ${parsedDays}-day meal plan and signature recommended recipe based on your ${topicTitle} questionnaire!`;
      } else {
        responseText = `Hello! I'm Chef Foodie. I'm ready with your culinary profile (${servings} servings, ${country}, ${diets.join(', ')}). How can I inspire your cooking today?`;
      }
    }

    // 8. Attach Scraped Image & Outbound Citation
    if (recommendedRecipe) {
      if (scrapedGrounding?.image && !recommendedRecipe.image) {
        recommendedRecipe.image = scrapedGrounding.image;
      }
      if (scrapedGrounding?.sourceUrl && !recommendedRecipe.sourceUrl) {
        recommendedRecipe.sourceUrl = scrapedGrounding.sourceUrl;
        recommendedRecipe.sourceName = scrapedGrounding.sourceName;
      }

      const targetRecipeUrl = recommendedRecipe.sourceUrl || (referenceUrls.length > 0 ? referenceUrls[0] : null);
      if (targetRecipeUrl && !recommendedRecipe.image) {
        try {

    // All Saved Recipe Search: Grounding AI in PostgreSQL Saved Recipes
    let savedRecipesContext = '';
    if (enableSavedRecipeSearch) {
      try {
        const userId = body.userId || 'guest';
        const savedRows = await query(
          `SELECT title, description, meal_type, ingredients, instructions, prep_minutes, cook_minutes, source_url 
           FROM saved_recipes 
           ORDER BY updated_at DESC LIMIT 20`
        ).catch(() => []);
        
        const rows = Array.isArray(savedRows) ? savedRows : ((savedRows as any)?.rows || []);
        if (rows.length > 0) {
          savedRecipesContext = `
ALL SAVED RECIPES DATABASE & SEARCH GROUNDING:
The "All Saved Recipe Search" capability is ENABLED. The following recipes are saved in the user's PostgreSQL recipe library:
${rows.map((r: any, idx: number) => {
  const ings = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 10).join(', ') : String(r.ingredients || '').slice(0, 150);
  const insts = Array.isArray(r.instructions) ? r.instructions.slice(0, 3).join('; ') : String(r.instructions || '').slice(0, 150);
  return `[Saved Recipe ${idx + 1}: "${r.title}"]
- Meal Type: ${r.meal_type || 'General'}
- Ingredients: ${ings}
- Instructions: ${insts}
- Source: ${r.source_url || 'Personal Saved Collection'}`;
}).join('\n\n')}

MANDATORY DIRECTIVE FOR SAVED RECIPES:
Whenever the user's request aligns with or can be satisfied by their saved favorites above, you are encouraged to reference, adapt, or recommend these saved dishes.
`;
        }
      } catch (err) {
        console.warn('[AI API] Could not retrieve saved recipes:', err);
      }
    }

          const scrapedImg = await extractImageFromUrl(targetRecipeUrl);
          if (scrapedImg) recommendedRecipe.image = scrapedImg;
        } catch (_) {}
      }
    }

    // 9. Record Usage Telemetry
    const promptTokens = Math.max(25, Math.ceil((prompt.length + 150) / 4));
    const completionTokens = Math.max(40, Math.ceil(responseText.length / 4) + (recommendedRecipe ? 100 : 0));

    recordTokenUsage({
      userId,
      userEmail,
      promptTokens,
      completionTokens,
      model: activeModel,
      source: 'chef'
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      reply: responseText,
      plan: generatedPlan,
      recommendedRecipe,
      recipe: recommendedRecipe,
      model: activeModel,
      consumedSystemTokens: chefCost,
      tokenSymbol: tokenSettings.tokenSymbol,
      remainingBalance: deduction.currentBalance
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (err: any) {
    console.error('[API /api/ai Error]:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Chef AI encountered an internal error. Please retry.'
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
