import os

code = """import * as cheerio from 'cheerio';

export interface ScrapedRecipeResult {
  title: string;
  description: string;
  imageUrl: string;
  rawIngredients: string[];
  rawInstructions: string[];
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  calories: number;
  sourceUrl: string;
}

export async function parseRecipeFromUrl(url: string): Promise<ScrapedRecipeResult> {
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com/',
  };

  let html = '';

  // Attempt 1: Direct fetch with browser headers
  try {
    const res = await fetch(url, { headers: browserHeaders, redirect: 'follow' });
    if (res.ok) {
      html = await res.text();
    }
  } catch (err) {
    console.warn('Direct fetch failed, trying proxy reader:', err);
  }

  // Attempt 2: Cascade to resilient reader proxy if 403 or blocked
  if (!html) {
    try {
      const proxyUrl = `https://r.jina.ai/${url}`;
      const proxyRes = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': browserHeaders['User-Agent'],
        },
      });
      if (proxyRes.ok) {
        html = await proxyRes.text();
      }
    } catch (proxyErr) {
      console.error('Reader fallback failed:', proxyErr);
    }
  }

  if (!html) {
    throw new Error('Unable to access recipe URL due to anti-bot protection. Please use manual entry or another URL.');
  }

  const $ = cheerio.load(html);

  let title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Imported Recipe';
  let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  let imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
  let rawIngredients: string[] = [];
  let rawInstructions: string[] = [];
  let servings = 4;
  let prepTime = 15;
  let cookTime = 30;
  let calories = 450;

  // 1. Traverse Schema.org JSON-LD blocks
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const data = JSON.parse(content);

      const findRecipe = (obj: any): any => {
        if (!obj) return null;
        if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) return obj;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = findRecipe(item);
            if (found) return found;
          }
        }
        if (Array.isArray(obj['@graph'])) {
          for (const item of obj['@graph']) {
            const found = findRecipe(item);
            if (found) return found;
          }
        }
        return null;
      };

      const recipe = findRecipe(data);
      if (recipe) {
        if (recipe.name) title = recipe.name;
        if (recipe.description) description = recipe.description;

        if (typeof recipe.image === 'string') {
          imageUrl = recipe.image;
        } else if (Array.isArray(recipe.image) && recipe.image.length > 0) {
          imageUrl = typeof recipe.image[0] === 'string' ? recipe.image[0] : recipe.image[0]?.url || imageUrl;
        } else if (recipe.image?.url) {
          imageUrl = recipe.image.url;
        }

        if (Array.isArray(recipe.recipeIngredient)) {
          rawIngredients = recipe.recipeIngredient.map((i: any) => String(i).trim());
        }

        if (Array.isArray(recipe.recipeInstructions)) {
          rawInstructions = recipe.recipeInstructions
            .map((step: any) => {
              if (typeof step === 'string') return step.trim();
              if (step?.text) return step.text.trim();
              if (Array.isArray(step?.itemListElement)) {
                return step.itemListElement.map((sub: any) => sub.text || sub.name || '').join(' ');
              }
              return '';
            })
            .filter(Boolean);
        }

        if (recipe.recipeYield) {
          const parsedYield = parseInt(String(recipe.recipeYield));
          if (!isNaN(parsedYield)) servings = parsedYield;
        }

        if (recipe.nutrition?.calories) {
          const parsedCal = parseInt(String(recipe.nutrition.calories));
          if (!isNaN(parsedCal)) calories = parsedCal;
        }
      }
    } catch (e) {}
  });

  // 2. DOM fallback
  if (rawIngredients.length === 0) {
    $('.wprm-recipe-ingredient, .ingredient, [class*="ingredient"]').each((_, el) => {
      const text = $(el).text().replace(/\\s+/g, ' ').trim();
      if (text && text.length < 120 && !rawIngredients.includes(text)) {
        rawIngredients.push(text);
      }
    });
  }

  if (rawInstructions.length === 0) {
    $('.wprm-recipe-instruction, .instruction, [class*="instruction"], .recipe-directions li').each((_, el) => {
      const text = $(el).text().replace(/\\s+/g, ' ').trim();
      if (text && text.length > 10 && !rawInstructions.includes(text)) {
        rawInstructions.push(text);
      }
    });
  }

  // 3. Fallback for text from proxy if JSON-LD/DOM missing
  if (rawIngredients.length === 0 && html.includes('Ingredients')) {
    const lines = html.split('\\n').map(l => l.trim()).filter(Boolean);
    let isIng = false;
    let isInst = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('ingredients')) { isIng = true; isInst = false; continue; }
      if (line.toLowerCase().includes('instructions') || line.toLowerCase().includes('directions')) { isIng = false; isInst = true; continue; }
      if (isIng && line.startsWith('-') || line.startsWith('*')) {
        rawIngredients.push(line.replace(/^[-*]\\s*/, ''));
      } else if (isInst && (line.match(/^\\d+\\./) || line.startsWith('-'))) {
        rawInstructions.push(line.replace(/^\\d+\\.\\s*/, ''));
      }
    }
  }

  if (!imageUrl) {
    imageUrl = $('article img, .recipe-image img, main img').first().attr('src') || 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80';
  }

  return {
    title: title.replace(/\\s*[-|]\\s*Roti & Rice.*/i, '').trim(),
    description,
    imageUrl,
    rawIngredients,
    rawInstructions,
    servings,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    calories,
    sourceUrl: url,
  };
}
"""

with open("packages/scrapers/src/index.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("⚡ Scraper updated with 403 anti-bot bypass & proxy cascade!")
