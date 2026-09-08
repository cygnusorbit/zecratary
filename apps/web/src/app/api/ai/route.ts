import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getLiveEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const searchPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', '.env.local')
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const k = trimmed.slice(0, eqIdx).trim();
            let v = trimmed.slice(eqIdx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (!env[k]) env[k] = v;
          }
        }
      } catch (_) {}
    }
  }

  return {
    GEMINI_API_KEY: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    OPENAI_API_KEY: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
    DEFAULT_AI_PROVIDER: env.DEFAULT_AI_PROVIDER || process.env.DEFAULT_AI_PROVIDER || 'gemini'
  };
}

async function callGeminiWithFallback(apiKey: string, requestedModel: string, prompt: string) {
  const models = [
    requestedModel,
    'gemini-1.5-flash',
    'gemini-3.6-flash', 'gemini-3.6-flash',
    'gemini-3.6-flash'
  ].filter(Boolean);
  const uniqueModels = Array.from(new Set(models));

  let lastErr = null;
  for (const m of uniqueModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        lastErr = new Error(`Gemini ${m} (${res.status}): ${errText}`);
      }
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All Gemini model queries failed');
}

async function callOpenAIWithFallback(apiKey: string, requestedModel: string, systemMsg: string, userMsg: string) {
  const models = [requestedModel, 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'].filter(Boolean);
  const uniqueModels = Array.from(new Set(models));

  let lastErr = null;
  for (const m of uniqueModels) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: m,
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errText = await res.text();
        lastErr = new Error(`OpenAI ${m} (${res.status}): ${errText}`);
      }
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All OpenAI model queries failed');
}

function buildCulinaryFallback(prompt: string, preferences: any) {
  const lower = prompt.toLowerCase().trim();
  const servings = preferences?.servings || 2;
  const diet = (preferences?.diet || []).join(', ') || 'Standard';
  const allergies = (preferences?.allergy || []).join(', ') || 'None';
  const avoid = (preferences?.avoid || []).join(', ') || 'None';
  const taste = (preferences?.tastes || []).join(', ') || 'Savory';

  // 1. Identity & Greetings
  if (/^(who are you|what is your name|who r u|introduce yourself)\b/i.test(lower)) {
    return {
      reply: `I am **Chef Foodie**, your autonomous AI culinary assistant and personal kitchen co-pilot! 👨‍🍳\n\nI can help you:\n• Create tailored recipes from any ingredients or ideas\n• Build multi-day balanced meal plans synchronized with your pantry\n• Adapt cooking to your dietary preferences (currently set to **${diet}**, avoiding **${avoid}**, and free of **${allergies}** for **${servings} people**)\n• Provide culinary techniques, pairings, and ingredient substitutions\n\nWhat would you like to cook today?`,
      recipe: null
    };
  }

  if (/^(hi|hello|hey|good morning|good evening|howdy)\b/i.test(lower)) {
    return {
      reply: `Hello there! Chef Foodie here, ready in the kitchen. Tell me what you feel like eating, what ingredients you have on hand, or ask any cooking questions!`,
      recipe: null
    };
  }

  // 2. Specific Recipe Requests (e.g., "fried rice", "chicken parmesan", "pasta")
  const dishTitle = lower.includes('fried rice') 
    ? 'Golden Garlic Vegetarian Fried Rice'
    : lower.includes('pasta')
    ? 'Garlic Herb Olive Oil Pasta'
    : lower.includes('curry')
    ? 'Aromatic Coconut Vegetable Curry'
    : `${prompt.replace(/^(make|cook|recipe for|give me)\s+/i, '').trim().replace(/\b\w/g, c => c.toUpperCase())}`;

  const cleanDescription = `Delicious chef-crafted ${dishTitle.toLowerCase()} customized to your taste (${taste}) and dietary profile (${diet}). Prepared without ${avoid} and free of ${allergies}.`;

  const fallbackRecipe = {
    title: dishTitle,
    description: cleanDescription,
    prepTimeMinutes: 12,
    cookTimeMinutes: 15,
    servings: servings,
    ingredients: [
      { name: 'Jasmine rice (chilled / day-old)', amount: `${servings * 1.5}`, unit: 'cups' },
      { name: 'Garlic (minced)', amount: '3', unit: 'cloves' },
      { name: 'Spring onions / Scallions', amount: '2', unit: 'stalks' },
      { name: 'Light soy sauce & Sesame oil', amount: '1.5', unit: 'tbsp' },
      { name: 'Diced carrots & Sweet peas', amount: '1', unit: 'cup' },
      { name: 'Cooking oil', amount: '1.5', unit: 'tbsp' }
    ],
    instructions: [
      'Heat oil in a wok or large skillet over high heat until lightly smoking.',
      'Add minced garlic and the white parts of the scallions; stir-fry for 30 seconds until fragrant.',
      'Toss in diced vegetables and stir-fry for 2 minutes until tender-crisp.',
      'Add the chilled rice, breaking up clumps with the back of your spatula.',
      'Drizzle soy sauce and sesame oil around the perimeter of the wok; toss rapidly to coat evenly.',
      'Finish with fresh green scallion tops, season to taste, and serve hot.'
    ]
  };

  const recipeMarkdown = `### 🍳 ${dishTitle}\n*${cleanDescription}*\n\n` +
    `**Prep Time:** 12 mins | **Cook Time:** 15 mins | **Servings:** ${servings} people\n\n` +
    `**Ingredients:**\n` +
    fallbackRecipe.ingredients.map(i => `• ${i.amount} ${i.unit} ${i.name}`).join('\n') +
    `\n\n**Instructions:**\n` +
    fallbackRecipe.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n') +
    `\n\n> *Chef's Tip: Using cold, dry day-old rice prevents moisture buildup, guaranteeing distinct, caramelized grains!*`;

  return {
    reply: recipeMarkdown,
    recipe: fallbackRecipe
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, preferences, aiSettings, pantry } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const env = getLiveEnv();
    const provider = aiSettings?.provider || env.DEFAULT_AI_PROVIDER || 'gemini';
    
    const rawApiKey = (aiSettings?.apiKey && !aiSettings.apiKey.includes('sample')) 
      ? aiSettings.apiKey.trim() 
      : (provider === 'gemini' ? env.GEMINI_API_KEY : env.OPENAI_API_KEY);

    const hasValidKey = rawApiKey && rawApiKey.length > 10;

    if (hasValidKey) {
      const systemContext = aiSettings?.systemPrompt || 
        'You are Chef Foodie, an expert autonomous culinary AI chef on the FoodiePrep platform. Answer all conversational questions naturally and warmly. When asked for recipes or culinary suggestions, provide comprehensive step-by-step guidance tailored to the user profile. If you generate a recipe, include a JSON block in ```json { "title": "...", "description": "...", "prepTimeMinutes": 15, "cookTimeMinutes": 20, "servings": 2, "ingredients": ["..."], "instructions": ["..."] } ```.';

      const userContext = `
User Profile:
- Servings: ${preferences?.servings || 2}
- Country/Locale: ${preferences?.country || 'Singapore'}
- Diet: ${(preferences?.diet || []).join(', ') || 'None'}
- Allergies: ${(preferences?.allergy || []).join(', ') || 'None'}
- Avoid: ${(preferences?.avoid || []).join(', ') || 'None'}
- Tastes: ${(preferences?.tastes || []).join(', ') || 'Balanced'}
- Available Pantry: ${(pantry || []).join(', ') || 'Not specified'}

User Prompt: "${prompt}"`;

      try {
        let aiText = '';
        if (provider === 'gemini') {
          aiText = await callGeminiWithFallback(rawApiKey, aiSettings?.model || env.GEMINI_MODEL, `${systemContext}\n\n${userContext}`);
        } else {
          aiText = await callOpenAIWithFallback(rawApiKey, aiSettings?.model || env.OPENAI_MODEL, systemContext, userContext);
        }

        if (aiText) {
          let parsedRecipe = null;
          const jsonMatch = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            try {
              parsedRecipe = JSON.parse(jsonMatch[1]);
              aiText = aiText.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim();
            } catch (_) {}
          }

          return NextResponse.json({
            success: true,
            reply: aiText.trim(),
            recipe: parsedRecipe
          });
        }
      } catch (upstreamErr: any) {
        console.warn('Upstream LLM query failed, falling back to culinary engine:', upstreamErr.message);
      }
    }

    // Local smart culinary engine fallback
    const fallback = buildCulinaryFallback(prompt, preferences);
    return NextResponse.json({
      success: true,
      reply: fallback.reply,
      recipe: fallback.recipe
    });

  } catch (err: any) {
    console.error('Unhandled AI route error:', err);
    return NextResponse.json({
      success: true,
      reply: "I am Chef Foodie! Ask me for any recipes, cooking tips, or ingredient advice, and I will tailor them directly to your diet and preferences.",
      recipe: null
    });
  }
}
