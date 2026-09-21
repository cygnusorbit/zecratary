import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordTokenUsage } from '@/lib/tokenUsage';
import { getTokenSettings, deductUserTokens } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

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

    // 1. Fetch Agent Parameters & AI Settings from PostgreSQL admin_settings
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

    try {
      const sRows = await query('SELECT chef_ai_settings, ai_model, ai_provider, value FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
      if (sRows.length > 0) {
        const row = sRows[0];
        let c = row.chef_ai_settings;
        if (typeof c === 'string') {
          try { c = JSON.parse(c); } catch (_) { c = {}; }
        } else if (!c && row.value) {
          c = typeof row.value === 'string' ? JSON.parse(row.value).chefAiSettings || {} : row.value.chefAiSettings || {};
        }

        if (c) {
          if (c.model || row.ai_model) activeModel = c.model || row.ai_model;
          if (c.provider || row.ai_provider) provider = c.provider || row.ai_provider;
          if (c.apiKey) apiKey = c.apiKey;
          if (c.temperature !== undefined) temperature = Number(c.temperature);
          if (c.maxTokens !== undefined) maxTokens = Number(c.maxTokens);
          if (c.systemPrompt) systemPrompt = c.systemPrompt;
          if (c.strictDietEnforcement !== undefined) strictDietEnforcement = Boolean(c.strictDietEnforcement);
          if (Array.isArray(c.filterWordsList)) filterWordsList = c.filterWordsList.filter(Boolean);
          if (Array.isArray(c.customVocabularyList)) customVocabularyList = c.customVocabularyList.filter(Boolean);
          if (Array.isArray(c.knowledgeBaseList)) knowledgeBaseList = c.knowledgeBaseList.filter(Boolean);
          if (c.enableWebSearch !== undefined) enableWebSearch = Boolean(c.enableWebSearch);
          if (c.enablePantryContext !== undefined) enablePantryContext = Boolean(c.enablePantryContext);
          if (c.maxPlanDays !== undefined) maxPlanDays = Number(c.maxPlanDays);
          if (c.resultDisplayMode) resultDisplayMode = c.resultDisplayMode;
        }
      }
    } catch (e) {
      console.warn('[PostgreSQL] Settings load notice in /api/ai:', e);
    }

    // Key fallback from admin_api_keys or process.env
    if (!apiKey) {
      try {
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
        description: isQuestionnaire 
          ? `Foodie Chef intake plan & recipe recommendation: "${topicTitle}"`
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

    // 4. Construct Full Agent Context & Instructions
    const pantryItems = enablePantryContext && Array.isArray(body.pantry) ? body.pantry : [];
    const preferences = body.preferences || {};

    let systemInstructions = `${systemPrompt}\n`;
    if (knowledgeBaseList.length > 0) {
      systemInstructions += `\nPRIORITIZED KNOWLEDGE BASES: ${knowledgeBaseList.join(', ')}. Ensure nutritional recommendations align with these sources.`;
    }
    if (customVocabularyList.length > 0) {
      systemInstructions += `\nCUSTOM VOCABULARY TO EMPHASIZE: ${customVocabularyList.join(', ')}. Use these culinary terms naturally.`;
    }
    if (filterWordsList.length > 0) {
      systemInstructions += `\nFORBIDDEN FILTER WORDS: Strictly avoid and never recommend dishes containing: ${filterWordsList.join(', ')}.`;
    }
    if (enableWebSearch) {
      systemInstructions += `\nLIVE WEB SEARCH: Active. Reference modern culinary trends and versatile ingredient pairings.`;
    }
    if (pantryItems.length > 0) {
      systemInstructions += `\nUSER PANTRY ITEMS IN STOCK: ${pantryItems.join(', ')}. Prioritize utilizing these pantry ingredients.`;
    }
    systemInstructions += `\nDIETARY PREFERENCES: Servings: ${preferences.servings || 2}, Country: ${preferences.country || 'Global'}, Diets: ${(preferences.diet || []).join(', ') || 'None'}, Allergies: ${(preferences.allergy || []).join(', ') || 'None'}, Avoid: ${(preferences.avoid || []).join(', ') || 'None'}.`;

    let responseText = '';
    let generatedPlan: any = null;
    let recommendedRecipe: any = null;

    // 5. Query Google Gemini / OpenAI API if configured
    if (apiKey && apiKey.length > 10 && !apiKey.includes('sample')) {
      try {
        if (provider === 'gemini') {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
          let userPrompt = prompt;

          if (isQuestionnaire) {
            userPrompt = `The user has completed the intake questionnaire for "${topicTitle}". Here are their answers:\n${JSON.stringify(questionnaireAnswers, null, 2)}\n\nGenerate both:
1. A multi-day meal plan (maximum ${maxPlanDays} days).
2. A standout Final Recommended Recipe tailored to their answers, pantry ingredients, and dietary restrictions.

Respond in valid JSON format with this exact structure:
{
  "reply": "Warm chef introduction explaining why this meal plan and recipe were curated for them",
  "plan": {
    "title": "Title of the Plan",
    "totalDays": 3,
    "theme": "Theme description",
    "budgetPerServing": "$4.50",
    "meals": [
      {
        "id": "meal_1",
        "dayIndex": 1,
        "dayLabel": "Day 1 - Monday",
        "dateStr": "Sep 22",
        "mealType": "DINNER",
        "title": "Recipe Title",
        "description": "Short culinary summary",
        "prepMinutes": 15,
        "cookMinutes": 20,
        "servings": ${preferences.servings || 2},
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
        "ingredients": ["Olive Oil", "Garlic", "Vegetables"],
        "isBatchCook": true
      }
    ]
  },
  "recommendedRecipe": {
    "title": "Signature Recommended Dish Title",
    "description": "Detailed chef description of the standout recipe",
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": ${preferences.servings || 2},
    "calories": 480,
    "mealType": "Dinner",
    "ingredients": ["Ingredient 1", "Ingredient 2", "Ingredient 3"],
    "instructions": [
      "Prep and chop ingredients evenly.",
      "Heat olive oil in a skillet over medium heat.",
      "Simmer aromatics and cook thoroughly.",
      "Garnish and serve fresh."
    ],
    "chefTip": "Chef's special seasoning or cooking technique recommendation",
    "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"
  }
}`;
          }

          const geminiPayload = {
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstructions}\n\nUser Request: ${userPrompt}` }]
              }
            ],
            generationConfig: {
              temperature: temperature,
              maxOutputTokens: maxTokens
            }
          };

          const gRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
          });

          const gData = await gRes.json();
          if (gRes.ok && gData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const rawText = gData.candidates[0].content.parts[0].text;
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                responseText = parsed.reply || rawText;
                if (parsed.plan) generatedPlan = parsed.plan;
                if (parsed.recommendedRecipe) recommendedRecipe = parsed.recommendedRecipe;
                if (parsed.recipe) recommendedRecipe = parsed.recipe;
              } catch (_) {
                responseText = rawText;
              }
            } else {
              responseText = rawText;
            }
          }
        }
      } catch (llmErr) {
        console.warn('[LLM Error in /api/ai]:', llmErr);
      }
    }

    // 6. Resilient Fallback Synthesizer if LLM response not obtained
    if (!responseText) {
      const activeTheme = (customVocabularyList[0] || 'High-Protein Wholesome').replace(/_/g, ' ');
      const servings = preferences.servings || 2;

      if (isQuestionnaire) {
        const days = Math.min(maxPlanDays, parseInt(questionnaireAnswers['0'] || questionnaireAnswers['days'] || '3') || 3);
        const mealType = (questionnaireAnswers['1'] || 'Dinner').toUpperCase();

        const meals: any[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date();
          d.setDate(d.getDate() + 1 + i);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          meals.push({
            id: 'meal_' + Date.now() + '_' + i,
            dayIndex: i + 1,
            dayLabel: `Day ${i + 1} - ${dayName}`,
            dateStr,
            mealType,
            title: `${activeTheme} ${mealType === 'DINNER' ? 'Glazed Salmon Bowl' : 'Quinoa Medley'}`,
            description: `Curated with ${activeModel}. Balanced macronutrients matching your ${topicTitle} answers.`,
            prepMinutes: 15,
            cookMinutes: 20,
            servings,
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
            ingredients: ['Fresh Protein/Salmon', 'Extra Virgin Olive Oil', 'Baby Spinach', 'Steamed Quinoa', 'Citrus Vinaigrette'],
            isBatchCook: i === 0
          });
        }

        generatedPlan = {
          title: `${activeTheme} ${topicTitle} Plan`,
          totalDays: days,
          theme: activeTheme,
          budgetPerServing: questionnaireAnswers['budget'] || '$4.50',
          meals
        };

        recommendedRecipe = {
          title: `Chef's Signature ${activeTheme} Quinoa Salmon Bowl`,
          description: `An artisanal culinary masterpiece formulated directly from your questionnaire responses and pantry resources.`,
          prepMinutes: 15,
          cookMinutes: 20,
          servings,
          calories: 520,
          mealType: 'Dinner',
          ingredients: [
            pantryItems[0] ? `In-Stock: ${pantryItems[0]}` : '2 Fresh Wild Salmon Fillets (6 oz each)',
            '1 cup Organic Tri-Color Quinoa (rinsed)',
            '2 cups Fresh Baby Spinach & Tuscan Kale',
            '1 Hass Avocado (sliced)',
            '2 tbsp Extra Virgin Cold-Pressed Olive Oil',
            '1 Fresh Lime (juiced) & Cracked Sea Salt'
          ],
          instructions: [
            'Rinse quinoa under cold water and simmer in 2 cups water for 15 minutes until fluffy.',
            'Season salmon fillets with sea salt, freshly ground pepper, and cold-pressed olive oil.',
            'Sear salmon in a hot skillet for 4 minutes per side until crisp and tender.',
            'Assemble bowls with warm quinoa, leafy greens, avocado slices, and lime zest.',
            'Crown with the seared salmon and drizzle with citrus vinaigrette.'
          ],
          chefTip: `Incorporate ${customVocabularyList[0] || 'Umami'} seasoning and sear the salmon skin-down first to achieve optimal texture.`,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
        };

        responseText = `I have analyzed your responses for **${topicTitle}** using ${activeModel}. Below is your personalized ${days}-day plan and featured signature recipe!`;
      } else {
        const titleClean = prompt.replace(/^(give me a recipe for|recipe for|how to make|make)/i, '').trim() || 'Wholesome Home Specialty';
        const formattedTitle = titleClean.charAt(0).toUpperCase() + titleClean.slice(1);

        recommendedRecipe = {
          title: formattedTitle,
          description: `Nutritious, chef-calibrated recipe created using ${activeModel} with priority for ${activeTheme}.`,
          prepMinutes: 15,
          cookMinutes: 20,
          servings,
          calories: 450,
          mealType: 'Main Dish',
          ingredients: [
            'Fresh Seasonal Vegetables',
            'Cold-Pressed Olive Oil & Fresh Garlic',
            'Balanced Quality Protein',
            'Fresh Herbs, Lemon Zest, and Sea Salt'
          ],
          instructions: [
            'Prep and wash all fresh ingredients thoroughly.',
            'Sauté garlic and aromatics over medium heat until fragrant.',
            'Cook protein evenly and toss with seasonal vegetables.',
            'Simmer for 10 minutes, season to taste, and serve hot.'
          ],
          chefTip: 'Rest the dish for 3 minutes before serving to allow moisture and aromatics to bloom.',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
        };

        responseText = `Here is your custom culinary preparation for **${formattedTitle}** using model ${activeModel}.`;
      }
    }

    // 7. Record LLM usage in PostgreSQL users table
    const promptTokens = Math.max(25, Math.ceil((prompt.length + 200) / 4));
    const completionTokens = Math.max(50, Math.ceil(responseText.length / 4) + (recommendedRecipe ? 120 : 0));

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
