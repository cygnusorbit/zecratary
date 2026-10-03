import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordTokenUsage } from '@/lib/tokenUsage';
import { getTokenSettings, deductUserTokens } from '@/lib/tokenService';
import { scrapeRecipeFromUrl } from '@/lib/recipeScraper';
import { downloadAndSaveImage, downloadAndSaveScrapedImage } from '@/lib/imageDownloader';

export const dynamic = 'force-dynamic';

async function getAdminApiKeyAndModel(requestedModel?: string) {
  let activeModel = requestedModel || 'gemini-2.5-flash';
  let geminiApiKey = '';
  let enableWebSearch = true;
  let strictDietEnforcement = false;
  let filterWordsList: string[] = [];

  try {
    const sRows = await query('SELECT * FROM admin_settings ORDER BY updated_at DESC LIMIT 1;');
    if (sRows && sRows.length > 0) {
      const row = sRows[0];
      const chef = row.chef_ai_settings || {};
      if (!requestedModel && (row.ai_model || chef.model)) {
        activeModel = row.ai_model || chef.model;
      }
      geminiApiKey = row.gemini_api_key || chef.apiKey || '';
      if (chef.enableWebSearch !== undefined) enableWebSearch = Boolean(chef.enableWebSearch);
      if (chef.strictDietEnforcement !== undefined) strictDietEnforcement = Boolean(chef.strictDietEnforcement);
      if (Array.isArray(chef.filterWordsList)) filterWordsList = chef.filterWordsList.filter(Boolean);
    }
  } catch (_) {}

  if (!geminiApiKey) {
    try {
      const kRes = await query("SELECT key_value FROM admin_api_keys WHERE env_key IN ('GEMINI_API_KEY', 'GOOGLE_API_KEY') LIMIT 1;");
      if (kRes && kRes.length > 0 && kRes[0].key_value) {
        geminiApiKey = kRes[0].key_value;
      }
    } catch (_) {}
  }

  if (!geminiApiKey) {
    geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  }

  activeModel = activeModel.replace(/^models\//, '');
  return { activeModel, geminiApiKey, enableWebSearch, strictDietEnforcement, filterWordsList };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type || 'url';
    const inputContent = (body.url || body.text || body.image || body.base64 || '').trim();
    const recipeTitleInput = (body.title || '').trim();
    const selectedCategory = body.category || 'Main Dish';

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

    if (!inputContent) {
      return NextResponse.json({ success: false, error: 'Import content is required.' }, { status: 400 });
    }

    const { activeModel, geminiApiKey, enableWebSearch, strictDietEnforcement, filterWordsList } = 
      await getAdminApiKeyAndModel(body.model);

    if (type === 'url' && !enableWebSearch) {
      return NextResponse.json({
        success: false,
        error: 'Web URL recipe importing is disabled by the administrator in AI Settings.',
        restrictionType: 'web_search_disabled'
      }, { status: 403 });
    }

    let parsedTitle = recipeTitleInput;
    let parsedDescription = '';
    let ingredientsList: string[] = [];
    let directionsList: string[] = [];
    let parsedImageUrl = '/uploads/recipes/default.jpg';
    let prepTime = '15 mins';
    let cookTime = '25 mins';
    let servings = 4;
    let cuisine = 'International';
    let nutrition: any = {};
    let promptTokens = 150;
    let completionTokens = 200;

    // 1. URL IMPORT
    if (type === 'url') {
      try {
        const scraped = await scrapeRecipeFromUrl(inputContent);
        parsedTitle = scraped?.title || recipeTitleInput || 'Imported Recipe';
        parsedDescription = scraped?.description || `Imported from ${inputContent}`;
        ingredientsList = Array.isArray(scraped?.ingredients) ? scraped.ingredients : [];
        directionsList = Array.isArray(scraped?.directions) && scraped.directions.length > 0
          ? scraped.directions
          : (Array.isArray(scraped?.instructions) ? scraped.instructions : []);
        parsedImageUrl = scraped?.imageUrl || scraped?.image || '/uploads/recipes/default.jpg';
        prepTime = scraped?.prepTime || prepTime;
        cookTime = scraped?.cookTime || cookTime;
        servings = Number(scraped?.servings) || 4;
        cuisine = scraped?.cuisine || cuisine;
        nutrition = scraped?.nutrition || nutrition;

        promptTokens = Math.max(140, Math.ceil((inputContent.length + 800) / 4));
        completionTokens = Math.max(180, Math.ceil(directionsList.join(' ').length / 4));
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to scrape recipe: ${err.message || 'Target website blocked scraper or contains no recipe markup.'}`
        }, { status: 422 });
      }
    } 
    // 2. IMAGE / PHOTO OCR IMPORT (AI VISION)
    else if (type === 'photo' || type === 'image') {
      parsedTitle = recipeTitleInput || 'Scanned Recipe';
      let visionSucceeded = false;

      if (geminiApiKey) {
        try {
          const rawBase64 = body.base64 || (inputContent.startsWith('data:image/') ? inputContent : '');
          let mimeType = 'image/jpeg';
          let cleanBase64 = '';

          if (rawBase64.startsWith('data:')) {
            const m = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (m) {
              mimeType = m[1];
              cleanBase64 = m[2];
            }
          }

          if (cleanBase64) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${geminiApiKey}`;
            const visionRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [
                    {
                      text: `You are an expert culinary OCR assistant. Extract the full recipe from this image.
Return ONLY valid JSON matching this schema:
{
  "title": "Dish Title",
  "description": "Short appetizing description",
  "ingredients": ["1 cup flour", "2 eggs"],
  "instructions": ["1. Mix ingredients", "2. Bake at 180°C"],
  "prepTime": "15 mins",
  "cookTime": "25 mins",
  "servings": 4,
  "category": "${selectedCategory}",
  "cuisine": "International"
}`
                    },
                    {
                      inlineData: {
                        mimeType,
                        data: cleanBase64
                      }
                    }
                  ]
                }],
                generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
              })
            });

            if (visionRes.ok) {
              const vData = await visionRes.json();
              const textOutput = vData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textOutput) {
                const parsed = JSON.parse(textOutput);
                if (parsed.title) parsedTitle = parsed.title;
                if (parsed.description) parsedDescription = parsed.description;
                if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) ingredientsList = parsed.ingredients;
                if (Array.isArray(parsed.instructions) && parsed.instructions.length > 0) directionsList = parsed.instructions;
                else if (Array.isArray(parsed.directions) && parsed.directions.length > 0) directionsList = parsed.directions;
                if (parsed.prepTime) prepTime = parsed.prepTime;
                if (parsed.cookTime) cookTime = parsed.cookTime;
                if (parsed.servings) servings = Number(parsed.servings) || 4;
                if (parsed.cuisine) cuisine = parsed.cuisine;
                visionSucceeded = true;
              }
            }
          }
        } catch (visionErr) {
          console.warn('[AI Vision Import] OCR error:', visionErr);
        }
      }

      if (!visionSucceeded) {
        parsedDescription = 'Imported recipe from visual photo upload.';
        ingredientsList = [
          'Fresh Seasonal Produce (assorted)',
          'Extra Virgin Olive Oil & Sea Salt',
          'Aromatics (Garlic, Fresh Herbs & Pepper)'
        ];
        directionsList = [
          'Wash, prepare, and chop all ingredients evenly.',
          'Cook over medium heat until tender and aromatic.',
          'Season to taste and serve hot.'
        ];
      }

      parsedImageUrl = inputContent.startsWith('/uploads/') ? inputContent : '/uploads/recipes/default.jpg';
    } 
    // 3. RAW TEXT RECIPE IMPORT (AI PARSER)
    else {
      let aiParsed = false;
      if (geminiApiKey) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${geminiApiKey}`;
          const gRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{
                  text: `You are an expert culinary AI parser. Extract and structure this recipe text into structured JSON:
"${inputContent}"

Title hint: "${recipeTitleInput || 'Homemade Recipe'}"
Category: "${selectedCategory}"

Return ONLY valid JSON matching this schema:
{
  "title": "Dish Title",
  "description": "Appetizing summary",
  "ingredients": ["1 cup flour", "2 tsp olive oil"],
  "instructions": ["1. Step one", "2. Step two"],
  "prepTime": "15 mins",
  "cookTime": "25 mins",
  "servings": 4,
  "category": "${selectedCategory}",
  "cuisine": "International"
}`
                }]
              }],
              generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
            })
          });

          if (gRes.ok) {
            const gData = await gRes.json();
            const textOutput = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textOutput) {
              const parsed = JSON.parse(textOutput);
              if (parsed.title) parsedTitle = parsed.title;
              if (parsed.description) parsedDescription = parsed.description;
              if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) ingredientsList = parsed.ingredients;
              if (Array.isArray(parsed.instructions) && parsed.instructions.length > 0) directionsList = parsed.instructions;
              else if (Array.isArray(parsed.directions) && parsed.directions.length > 0) directionsList = parsed.directions;
              if (parsed.prepTime) prepTime = parsed.prepTime;
              if (parsed.cookTime) cookTime = parsed.cookTime;
              if (parsed.servings) servings = Number(parsed.servings) || 4;
              if (parsed.cuisine) cuisine = parsed.cuisine;
              aiParsed = true;
            }
          }
        } catch (e) {
          console.warn('[AI Text Import] Gemini text parsing error:', e);
        }
      }

      if (!aiParsed) {
        const lines = inputContent.split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (!parsedTitle) {
          parsedTitle = lines[0]?.slice(0, 45).replace(/^[#*-\s]+/, '') || 'Handcrafted Recipe';
        }
        parsedDescription = inputContent.slice(0, 140);
        const customIngs = lines.filter((l: string) => /^[-*•]/.test(l) || /\d+\s*(g|oz|cup|tbsp|tsp|pinch|clove|slice)/i.test(l));
        const customSteps = lines.filter((l: string) => /^(\d+\.|step)/i.test(l) || l.length > 70);

        ingredientsList = customIngs.length > 0 ? customIngs.map((i: string) => i.replace(/^[-*•\d.)\s]+/, '')) : [inputContent.slice(0, 50)];
        directionsList = customSteps.length > 0 ? customSteps.map((s: string) => s.replace(/^(\d+\.|step\s*\d+[:.-]?|[-*•])\s*/i, '')) : ['Follow cooking instructions.'];
      }
    }

    if (parsedImageUrl && /^https?:\/\//i.test(parsedImageUrl)) {
      try {
        const localImg = await downloadAndSaveImage(parsedImageUrl, 'scraped');
        if (localImg) parsedImageUrl = localImg;
      } catch (_) {}
    }

    if (strictDietEnforcement && filterWordsList.length > 0) {
      const combined = `${parsedTitle} ${parsedDescription} ${ingredientsList.join(' ')}`.toLowerCase();
      const matched = filterWordsList.find(w => w.trim().length > 1 && combined.includes(w.trim().toLowerCase()));
      if (matched) {
        return NextResponse.json({
          success: false,
          error: `Import blocked: Recipe contains restricted ingredient "${matched}" under AI Strict Dietary Policy.`,
          restrictionType: 'filter_word_violation'
        }, { status: 422 });
      }
    }

    const tokenSettings = await getTokenSettings();
    let importCost = tokenSettings.importUrlCost;
    if (type === 'text') importCost = tokenSettings.importTextCost;
    if (type === 'photo' || type === 'image') importCost = tokenSettings.importPhotoCost;

    let deduction: any = { success: true, deducted: 0, currentBalance: 0 };
    if (tokenSettings.isEnabled && importCost > 0) {
      deduction = await deductUserTokens({
        userId,
        userEmail,
        cost: importCost,
        feature: `import_${type}`,
        description: `Import recipe: "${parsedTitle}" via ${type.toUpperCase()}`
      });

      if (!deduction.success) {
        return NextResponse.json({
          success: false,
          error: deduction.error,
          insufficientTokens: true,
          required: importCost,
          currentBalance: deduction.currentBalance,
          tokenSymbol: tokenSettings.tokenSymbol
        }, { status: 402 });
      }
    }

    const recipeId = 'rcp_imp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const parsedRecipe = {
      id: recipeId,
      userId: userId || null,
      user_id: userId || null,
      createdBy: userEmail || 'user',
      created_by: userEmail || 'user',
      creatorName: body.userName || 'You',
      creator_name: body.userName || 'You',
      title: parsedTitle,
      name: parsedTitle,
      description: parsedDescription,
      recipeType: selectedCategory,
      recipe_type: selectedCategory,
      category: selectedCategory,
      cuisine,
      prepTime,
      cookTime,
      servings: Number(servings) || 4,
      difficulty: 'Easy',
      ingredients: ingredientsList,
      instructions: directionsList,
      directions: directionsList,
      steps: directionsList,
      nutrition,
      tags: [selectedCategory, 'Imported', type.toUpperCase()],
      imageUrl: parsedImageUrl,
      image: parsedImageUrl,
      image_url: parsedImageUrl,
      sourceUrl: type === 'url' ? inputContent : '',
      source_url: type === 'url' ? inputContent : '',
      isFavorite: false,
      rating: 0
    };

    try {
      await query(`
        INSERT INTO saved_recipes (
          id, user_id, created_by, creator_name, creator_email, title, description,
          recipe_type, cuisine, prep_time, cook_time, servings, difficulty,
          ingredients, directions, nutrition, tags, image_url, source_url, is_public, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18, $19, $20, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `, [
        recipeId, userId || null, userEmail || 'user', body.userName || 'You', userEmail || 'user',
        parsedRecipe.title, parsedRecipe.description, parsedRecipe.recipeType, parsedRecipe.cuisine,
        parsedRecipe.prepTime, parsedRecipe.cookTime, String(parsedRecipe.servings), parsedRecipe.difficulty,
        JSON.stringify(parsedRecipe.ingredients), JSON.stringify(parsedRecipe.directions),
        JSON.stringify(parsedRecipe.nutrition), JSON.stringify(parsedRecipe.tags),
        parsedRecipe.imageUrl, parsedRecipe.sourceUrl, false
      ]);
    } catch (dbErr) {
      console.error('[AI Import] PostgreSQL persistence notice:', dbErr);
    }

    try {
      await recordTokenUsage({
        userId,
        userEmail,
        promptTokens,
        completionTokens,
        model: activeModel,
        source: `import-${type}`
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      recipe: parsedRecipe,
      consumedSystemTokens: importCost,
      tokenSymbol: tokenSettings.tokenSymbol,
      remainingBalance: deduction.currentBalance,
      activeModel,
      message: `Successfully imported "${parsedRecipe.title}".`
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
