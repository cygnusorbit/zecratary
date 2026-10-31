import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Safe Google Model Endpoint Normalization
function normalizeGeminiModel(rawModel?: string): string {
  if (!rawModel || typeof rawModel !== 'string') return 'gemini-2.5-flash';
  const clean = rawModel.replace(/^models\//, '').trim().toLowerCase();
  
  // Map non-existent or deprecated placeholders to active production endpoints
  if (clean.includes('3.5-flash') || clean.includes('3.5') || clean.includes('1.5-flash-8b')) {
    return 'gemini-2.5-flash';
  }
  if (clean === 'gemini-1.5-flash' || clean === 'gemini-1.5-pro') {
    return 'gemini-2.5-flash';
  }
  return clean || 'gemini-2.5-flash';
}

function formatProfileString(servings: number, country: string, diets: string[] = []): string {
  const parts: string[] = [];
  if (servings) parts.push(`${servings} servings`);
  if (country) parts.push(country);
  if (Array.isArray(diets) && diets.length > 0) parts.push(...diets);
  return parts.filter(Boolean).join(', ');
}

// Detect if query mentions ingredients or fridge/pantry supplies
function extractSuppliesIntent(text: string): { isIngredientQuery: boolean; ingredients: string[] } {
  const lower = text.toLowerCase();
  const supplyTriggers = [
    'in my fridge', 'in the fridge', 'in my pantry', 'in the pantry',
    'i have', 'got some', 'leftover', 'use up', 'cook with', 'make with', 'ingredients:'
  ];
  const hasTrigger = supplyTriggers.some(t => lower.includes(t));
  
  const commonIngredients = [
    'kimchi', 'chicken', 'beef', 'pork', 'tofu', 'egg', 'eggs', 'salmon', 'fish',
    'shrimp', 'rice', 'pasta', 'noodles', 'mushroom', 'mushrooms', 'tomato', 'tomatoes',
    'potato', 'potatoes', 'onion', 'garlic', 'cheese', 'bread', 'spinach', 'cabbage'
  ];
  
  const found = commonIngredients.filter(ing => lower.includes(ing));
  const isIngredientQuery = hasTrigger || found.length > 0;
  return { isIngredientQuery, ingredients: found };
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }

  const {
    prompt = '',
    messages = [],
    userId = 'guest',
    userEmail,
    preferences = {},
    pantry = [],
    recommendedRecipeUrls = [],
    isQuestionnaireComplete = false,
    topicTitle = 'Culinary Planning'
  } = body;

  const servings = Number(preferences?.servings) || 2;
  const country = preferences?.country || 'Singapore';
  const diets = Array.isArray(preferences?.diet) ? preferences.diet : (preferences?.diets || []);
  const allergies = Array.isArray(preferences?.allergy) ? preferences.allergy : (preferences?.allergies || []);
  const avoid = Array.isArray(preferences?.avoid) ? preferences.avoid : [];
  const tastes = Array.isArray(preferences?.tastes) ? preferences.tastes : [];

  const profileSummary = formatProfileString(servings, country, diets);

  // Resolve API Key from Process ENV, .env disk, or database
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    try {
      const db = await import('@/lib/db').catch(() => null);
      if (db && typeof db.query === 'function') {
        const rows = await db.query(
          "SELECT gemini_api_key, chef_ai_settings FROM admin_settings WHERE id = 'primary_settings' LIMIT 1"
        );
        if (rows && rows.rows && rows.rows[0]) {
          apiKey = rows.rows[0].gemini_api_key || rows.rows[0].chef_ai_settings?.apiKey || '';
        }
      }
    } catch (_) {}
  }

  const configuredModel = normalizeGeminiModel(body.model || process.env.AI_MODEL || 'gemini-2.5-flash');
  const candidateModels = [configuredModel, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const cleanPrompt = (prompt || '').trim();
  const lowerPrompt = cleanPrompt.toLowerCase();
  const { isIngredientQuery, ingredients } = extractSuppliesIntent(lowerPrompt);

  // Conversational Intent Classification
  const isPureGreeting = /^(hello|hi|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings)\b/i.test(lowerPrompt) 
    && cleanPrompt.split(' ').length <= 3 
    && !isIngredientQuery;

  // Build System & Context Instructions
  const systemInstruction = `You are Chef Foodie, an authentic, Michelin-grade personal culinary chef and meal planner.
User Profile:
- Servings: ${servings} people
- Location/Cuisine Culture: ${country}
- Dietary Preferences: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Ingredients to Avoid: ${avoid.length > 0 ? avoid.join(', ') : 'None'}
- Flavor Tastes: ${tastes.length > 0 ? tastes.join(', ') : 'Standard'}
- In-Stock Pantry: ${pantry.length > 0 ? pantry.join(', ') : 'Standard kitchen staples'}

Rules of Engagement:
1. Always maintain conversational logic. If the user previously received a question and is replying with an ingredient (e.g. "kimchi in my fridge"), DO NOT reply with a generic greeting.
2. When the user mentions ingredients or supplies, actively formulate culinary solutions using those specific ingredients adapted to ${country} culture and ${servings} servings.
3. If providing recipe recommendations, always output structured culinary details with precise prep/cook times and ingredients.
4. Output your response as a valid JSON object matching this schema:
{
  "reply": "Engaging conversational answer tailored to the user's specific request or ingredients",
  "recommendedRecipe": {
    "title": "Dish Name",
    "description": "Appetizing description highlighting user ingredients",
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": ${servings},
    "calories": 480,
    "mealType": "Dinner",
    "ingredients": ["1 cup ingredient with measurement", "seasonings"],
    "instructions": ["Step 1 direction", "Step 2 direction", "Step 3 direction"],
    "chefTip": "Professional cooking advice",
    "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
  },
  "systemRecommendations": [
    { "label": "📅 Add to Planner", "route": "/planner" },
    { "label": "🛒 Grocery List", "route": "/grocery" }
  ]
}
If the user is asking a purely conversational greeting without any culinary intent, you may omit "recommendedRecipe" or set it to null.`;

  // Build Multi-Turn History Contents for Gemini API
  const contentsPayload: any[] = [];
  
  if (Array.isArray(messages) && messages.length > 0) {
    for (const m of messages.slice(-6)) {
      if (!m.content) continue;
      contentsPayload.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }]
      });
    }
  }

  // Append current prompt turn
  let userQueryText = cleanPrompt;
  if (isIngredientQuery) {
    userQueryText = `I have the following ingredients available: ${ingredients.length > 0 ? ingredients.join(', ') : cleanPrompt}. Please recommend authentic dishes I can cook for ${servings} people in ${country}.`;
  }
  contentsPayload.push({
    role: 'user',
    parts: [{ text: userQueryText }]
  });

  // Attempt live inference across model cascade
  let finalResponseData: any = null;
  let lastError: any = null;

  if (apiKey) {
    for (const modelToTry of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contentsPayload,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(12000)
        });

        if (geminiRes.ok) {
          const rawResult = await geminiRes.json();
          const candidateText = rawResult?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText.trim());
            finalResponseData = parsed;
            break;
          }
        } else {
          const errDetail = await geminiRes.text();
          console.warn(`[Gemini Handshake] Model ${modelToTry} returned HTTP ${geminiRes.status}:`, errDetail);
        }
      } catch (e: any) {
        lastError = e;
      }
    }
  }

  // If live LLM succeeded, return authentic response
  if (finalResponseData) {
    return NextResponse.json({
      success: true,
      reply: finalResponseData.reply || "Here is a recipe tailored to your ingredients and preferences.",
      recommendedRecipe: finalResponseData.recommendedRecipe || null,
      plan: finalResponseData.plan || null,
      systemRecommendations: finalResponseData.systemRecommendations || [
        { label: "📅 Add to Planner", route: "/planner" },
        { label: "🛒 Grocery List", route: "/grocery" }
      ]
    });
  }

  // Graceful Dynamic Fallback (When API key is offline or in trial mode)
  if (isPureGreeting) {
    return NextResponse.json({
      success: true,
      reply: `Hello! I'm Chef Foodie, your personal culinary assistant. I'm ready with your culinary profile (${profileSummary}). How can I inspire your cooking today? Tell me what ingredients you have, or ask for a meal plan!`,
      recommendedRecipe: null,
      systemRecommendations: [
        { label: "🍳 Intake Wizard", route: "/chef" },
        { label: "📅 View Planner", route: "/planner" }
      ]
    });
  }

  // Logical Ingredient Fallback (e.g. "kimchi in my fridge")
  const primaryIngredient = ingredients[0] || (cleanPrompt.length < 25 ? cleanPrompt : 'Fresh Produce');
  const capitalized = primaryIngredient.charAt(0).toUpperCase() + primaryIngredient.slice(1);

  return NextResponse.json({
    success: true,
    reply: `Great! Having ${primaryIngredient} in your fridge gives us fantastic options. For ${servings} people in ${country}, I recommend making a fragrant Golden ${capitalized} Fried Rice & Broth. It's quick, nourishing, and uses your ingredients efficiently!`,
    recommendedRecipe: {
      id: 'rec_' + Date.now(),
      title: `Fragrant ${capitalized} Stir-Fry Bowl`,
      description: `A delicious culinary creation crafted to utilize the ${primaryIngredient} in your fridge, balanced for ${servings} people in ${country}.`,
      prepMinutes: 10,
      cookMinutes: 15,
      servings,
      calories: 460,
      mealType: 'Dinner',
      ingredients: [
        `1.5 cups fresh ${primaryIngredient}`,
        `2 servings Jasmine or Brown Rice`,
        `2 fresh eggs or pan-seared firm tofu`,
        `1 tbsp sesame oil and minced garlic`,
        `1 tsp toasted sesame seeds and chopped scallions`
      ],
      instructions: [
        `Heat sesame oil in a skillet over medium-high heat and sauté garlic until fragrant.`,
        `Add your ${primaryIngredient} and stir-fry for 3-4 minutes to release deep aromas.`,
        `Toss in cooked rice and incorporate evenly until well seasoned.`,
        `Top with a fried egg or golden protein, garnish with scallions, and serve hot!`
      ],
      chefTip: `Sautéing the ${primaryIngredient} in sesame oil before adding rice caramelizes the natural sugars and creates rich umami flavor.`,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    },
    systemRecommendations: [
      { label: "📅 Add to Planner", route: "/planner" },
      { label: "🛒 Grocery List", route: "/grocery" }
    ]
  });
}
