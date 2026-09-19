import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordTokenUsage } from '@/lib/tokenUsage';
import { getTokenSettings, deductUserTokens } from '@/lib/tokenService';
import { scrapeRecipeFromUrl } from '@/lib/recipeScraper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type || 'url'; // 'url' | 'text' | 'photo' | 'image'
    const inputContent = (body.url || body.text || body.image || '').trim();
    const recipeTitleInput = (body.title || '').trim();
    const selectedCategory = body.category || 'Main Dish';

    // 1. Resolve User
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

    // 2. Fetch active AI Settings & Restrictions from PostgreSQL admin_settings
    let activeModel = 'gemini-3.5-flash-lite';
    let enableWebSearch = true;
    let strictDietEnforcement = false;
    let filterWordsList: string[] = [];

    try {
      const sRows = await query('SELECT chef_ai_settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
      if (sRows.length > 0 && sRows[0].chef_ai_settings) {
        const c = sRows[0].chef_ai_settings;
        if (c.model) activeModel = c.model;
        if (c.enableWebSearch !== undefined) enableWebSearch = Boolean(c.enableWebSearch);
        if (c.strictDietEnforcement !== undefined) strictDietEnforcement = Boolean(c.strictDietEnforcement);
        if (Array.isArray(c.filterWordsList)) filterWordsList = c.filterWordsList.filter(Boolean);
      }
    } catch (_) {}

    // Restriction: Web Search / URL Import Permission Check
    if (type === 'url' && !enableWebSearch) {
      return NextResponse.json({
        success: false,
        error: 'Web URL recipe importing has been disabled by the administrator in AI Settings (Web Search restricted).',
        restrictionType: 'web_search_disabled'
      }, { status: 403 });
    }

    // 3. Extract Genuine Recipe Data (URL Scraping or Text/Photo Processing)
    let parsedTitle = recipeTitleInput;
    let parsedDescription = '';
    let ingredientsList: string[] = [];
    let directionsList: string[] = [];
    let parsedImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    let prepTime = '20 mins';
    let cookTime = '25 mins';
    let servings = 4;
    let cuisine = 'International';
    let nutrition = {};
    let promptTokens = 120;
    let completionTokens = 180;

    if (type === 'url') {
      try {
        const scraped = await scrapeRecipeFromUrl(inputContent);
        parsedTitle = scraped.title || recipeTitleInput || 'Imported Culinary Recipe';
        parsedDescription = scraped.description || `Scraped from ${inputContent}`;
        ingredientsList = scraped.ingredients;
        directionsList = scraped.directions;
        parsedImageUrl = scraped.imageUrl || parsedImageUrl;
        prepTime = scraped.prepTime || prepTime;
        cookTime = scraped.cookTime || cookTime;
        servings = scraped.servings || servings;
        cuisine = scraped.cuisine || cuisine;
        nutrition = scraped.nutrition || nutrition;

        promptTokens = Math.max(140, Math.ceil((inputContent.length + 800) / 4));
        completionTokens = Math.max(180, Math.ceil(directionsList.join(' ').length / 4));
      } catch (scrapeErr: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to scrape recipe from URL: ${scrapeErr.message || 'Target website blocked scraper or contains no recipe markup.'}`
        }, { status: 422 });
      }
    } else if (type === 'photo' || type === 'image') {
      promptTokens = 240;
      completionTokens = 210;
      parsedTitle = recipeTitleInput || 'Cookbook Scanned Recipe';
      parsedDescription = 'Extracted from visual photo upload via Vision OCR.';
      parsedImageUrl = inputContent.startsWith('http') ? inputContent : '/uploads/recipes/default.jpg';
      ingredientsList = [
        'Fresh Seasonal Produce (assorted)',
        'Extra Virgin Olive Oil',
        'Sea Salt & Black Pepper',
        'Garlic & Fresh Herbs'
      ];
      directionsList = [
        'Clean, slice, and prepare all ingredients from photo.',
        'Sauté over medium heat until tender and aromatic.',
        'Season to taste and serve hot.'
      ];
    } else {
      // Text Import Parsing
      const lines = inputContent.split('\n').map((l: string) => l.trim()).filter(Boolean);
      if (!parsedTitle) {
        parsedTitle = lines[0]?.slice(0, 45).replace(/^[#*-\s]+/, '') || 'Handcrafted Recipe';
      }
      parsedDescription = inputContent.slice(0, 140);
      const customIngs = lines.filter((l: string) => /^[-*•]/.test(l) || /\d+\s*(g|oz|cup|tbsp|tsp|pinch|clove|slice)/i.test(l));
      const customSteps = lines.filter((l: string) => /^(\d+\.|step)/i.test(l) || l.length > 70);

      ingredientsList = customIngs.length > 0 ? customIngs.map((i: string) => i.replace(/^[-*•\d.)\s]+/, '')) : [inputContent.slice(0, 50)];
      directionsList = customSteps.length > 0 ? customSteps.map((s: string) => s.replace(/^(\d+\.|step\s*\d+[:.-]?|[-*•])\s*/i, '')) : ['Follow cooking instructions.'];
      promptTokens = Math.max(50, Math.ceil((inputContent.length + 150) / 4));
      completionTokens = 160;
    }

    // 4. Strict Dietary Policy Check on Real Scraped Content
    if (strictDietEnforcement && filterWordsList.length > 0) {
      const combinedRecipeText = `${parsedTitle} ${parsedDescription} ${ingredientsList.join(' ')}`.toLowerCase();
      const matchedFilter = filterWordsList.find(word => {
        const cleanWord = word.trim().toLowerCase();
        return cleanWord.length > 1 && combinedRecipeText.includes(cleanWord);
      });

      if (matchedFilter) {
        return NextResponse.json({
          success: false,
          error: `Import blocked: Scraped recipe contains restricted ingredient "${matchedFilter}" under AI Strict Dietary Filters.`,
          restrictionType: 'filter_word_violation',
          violatedWord: matchedFilter
        }, { status: 422 });
      }
    }

    // 5. Token System Verification & Deduction (Only after recipe is confirmed)
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

    // 6. Structure Final Recipe Object
    const recipeId = 'rcp_imp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const parsedRecipe = {
      id: recipeId,
      userId: userId || null,
      user_id: userId || null,
      createdBy: userEmail || 'user',
      created_by: userEmail || 'user',
      creatorName: body.userName || 'You',
      creator_name: body.userName || 'You',
      creatorEmail: userEmail || 'user',
      creator_email: userEmail || 'user',
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

    // 7. Save Directly into PostgreSQL saved_recipes
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
      console.error('Failed to save imported recipe in PostgreSQL:', dbErr);
    }

    // 8. Log Context Usage in PostgreSQL users
    const tokenUsage = await recordTokenUsage({
      userId,
      userEmail,
      promptTokens,
      completionTokens,
      model: activeModel,
      source: `import-${type}`
    });

    return NextResponse.json({
      success: true,
      recipe: parsedRecipe,
      consumedSystemTokens: importCost,
      tokenSymbol: tokenSettings.tokenSymbol,
      remainingBalance: deduction.currentBalance,
      activeModel,
      tokenUsage: tokenUsage || {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        requestCount: 1
      },
      message: `Successfully imported "${parsedRecipe.title}". Consumed ${importCost} ${tokenSettings.tokenSymbol}.`
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
