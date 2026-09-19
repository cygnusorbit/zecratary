export interface ScrapedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  directions: string[];
  instructions: string[];
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  recipeType: string;
  cuisine: string;
  nutrition: Record<string, any>;
  sourceUrl: string;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&#0*8211;/g, '–')
    .replace(/&#0*8212;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#0*8216;/g, "'")
    .replace(/&#0*8217;/g, "'")
    .replace(/&#0*8220;/g, '"')
    .replace(/&#0*8221;/g, '"')
    .replace(/&#0*160;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCharCode(parseInt(dec, 10)); } catch { return _; }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch { return _; }
    });
}

function parseIsoDuration(duration: string): string {
  if (!duration || typeof duration !== 'string') return '';
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return duration.replace(/^PT/i, '');
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const totalMinutes = days * 1440 + hours * 60 + minutes;
  if (totalMinutes > 0) {
    if (hours > 0 && minutes > 0 && days === 0) {
      return `${hours} hr ${minutes} mins`;
    }
    if (hours > 0 && minutes === 0 && days === 0) {
      return `${hours} hr`;
    }
    return `${totalMinutes} mins`;
  }
  return duration;
}

function findRecipeInObject(obj: any): any | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeInObject(item);
      if (found) return found;
    }
    return null;
  }
  const type = obj['@type'];
  const isRecipe = (typeof type === 'string' && type.toLowerCase().includes('recipe')) ||
    (Array.isArray(type) && type.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('recipe')));
  
  if (isRecipe) return obj;

  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findRecipeInObject(item);
      if (found) return found;
    }
  }
  return null;
}

function extractJsonLd(html: string): any | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    const rawContent = match[1].trim();
    if (!rawContent) continue;
    try {
      const parsed = JSON.parse(rawContent);
      const recipe = findRecipeInObject(parsed);
      if (recipe) return recipe;
    } catch (_) {
      try {
        const cleaned = rawContent
          .replace(/[\u0000-\u001F]+/g, ' ')
          .replace(/,\s*([\]}])/g, '$1');
        const parsed = JSON.parse(cleaned);
        const recipe = findRecipeInObject(parsed);
        if (recipe) return recipe;
      } catch (_) {}
    }
  }
  return null;
}

function extractInstructions(instructions: any): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') {
    return instructions
      .split(/\r?\n+/)
      .map(s => decodeHtmlEntities(s).replace(/^(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim())
      .filter(s => s.length > 3);
  }
  if (Array.isArray(instructions)) {
    const steps: string[] = [];
    for (const item of instructions) {
      if (typeof item === 'string') {
        const cleaned = decodeHtmlEntities(item).replace(/^(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim();
        if (cleaned.length > 2) steps.push(cleaned);
      } else if (item && typeof item === 'object') {
        if (item.itemListElement && Array.isArray(item.itemListElement)) {
          steps.push(...extractInstructions(item.itemListElement));
        } else {
          const stepText = item.text || item.description || item.name || '';
          const cleaned = decodeHtmlEntities(stepText).replace(/^(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim();
          if (cleaned.length > 2) steps.push(cleaned);
        }
      }
    }
    return steps;
  }
  return [];
}

function extractImageUrl(image: any): string {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    for (const item of image) {
      const url = extractImageUrl(item);
      if (url) return url;
    }
  }
  if (typeof image === 'object') {
    if (typeof image.url === 'string') return image.url;
    if (typeof image.contentUrl === 'string') return image.contentUrl;
  }
  return '';
}

function extractMeta(html: string, propertyOrName: string): string {
  const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${propertyOrName}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  if (match && match[1]) return decodeHtmlEntities(match[1].trim());
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${propertyOrName}["']`, 'i');
  const match2 = html.match(regex2);
  if (match2 && match2[1]) return decodeHtmlEntities(match2[1].trim());
  return '';
}

export async function scrapeRecipeFromUrl(rawUrl: string): Promise<ScrapedRecipe> {
  let targetUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  const cleanDomain = targetUrl.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '');

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recipe URL: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // 1. Primary Extraction: Schema.org JSON-LD (Used by 95% of food blogs)
  const jsonLd = extractJsonLd(html);
  if (jsonLd) {
    const title = decodeHtmlEntities(jsonLd.name || jsonLd.headline || '').trim();
    const description = decodeHtmlEntities(jsonLd.description || '').trim();

    let ingredients: string[] = [];
    const rawIngredients = jsonLd.recipeIngredient || jsonLd.ingredients;
    if (Array.isArray(rawIngredients)) {
      ingredients = rawIngredients
        .map((i: any) => decodeHtmlEntities(String(i)).trim())
        .filter((i: string) => i.length > 1);
    }

    const directions = extractInstructions(jsonLd.recipeInstructions);
    const imageUrl = extractImageUrl(jsonLd.image) || extractMeta(html, 'og:image') || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    let servings = 4;
    const rawYield = jsonLd.recipeYield || jsonLd.yield;
    if (rawYield) {
      const match = String(rawYield).match(/\d+/);
      if (match) servings = parseInt(match[0], 10);
    }

    const prepTime = parseIsoDuration(jsonLd.prepTime) || '15 mins';
    const cookTime = parseIsoDuration(jsonLd.cookTime) || '25 mins';
    const category = decodeHtmlEntities(Array.isArray(jsonLd.recipeCategory) ? jsonLd.recipeCategory[0] : jsonLd.recipeCategory || 'Main Dish');
    const cuisine = decodeHtmlEntities(Array.isArray(jsonLd.recipeCuisine) ? jsonLd.recipeCuisine[0] : jsonLd.recipeCuisine || 'International');

    if (title && (ingredients.length > 0 || directions.length > 0)) {
      return {
        title,
        description: description || `Imported from ${cleanDomain}`,
        ingredients: ingredients.length > 0 ? ingredients : ['Seasonal Fresh Ingredients'],
        directions: directions.length > 0 ? directions : ['Follow preparation steps on source page.'],
        instructions: directions.length > 0 ? directions : ['Follow preparation steps on source page.'],
        imageUrl,
        prepTime,
        cookTime,
        servings,
        recipeType: category,
        cuisine,
        nutrition: jsonLd.nutrition || {},
        sourceUrl: targetUrl
      };
    }
  }

  // 2. Fallback: OpenGraph Meta Tags & HTML Content Scanning
  const ogTitle = extractMeta(html, 'og:title') || '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = ogTitle || (titleMatch ? titleMatch[1] : `Recipe from ${cleanDomain}`);
  const title = decodeHtmlEntities(rawTitle.replace(/(\s*[-|–—]\s*[^-\|–—]+)$/, '')).trim();

  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || `Recipe imported from ${targetUrl}`;
  const imageUrl = extractMeta(html, 'og:image') || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

  // Extract list items inside common recipe containers
  const ingredients: string[] = [];
  const directions: string[] = [];

  const ingMatches = html.matchAll(/<li[^>]*class=["'][^"']*(?:ingredient|recipe-ingredient|wprm-recipe-ingredient)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi);
  for (const m of ingMatches) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '')).trim();
    if (text.length > 2) ingredients.push(text);
  }

  const stepMatches = html.matchAll(/<li[^>]*class=["'][^"']*(?:instruction|direction|step|recipe-instruction)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi);
  for (const m of stepMatches) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '')).trim();
    if (text.length > 3) directions.push(text);
  }

  return {
    title: title || `Delicious Dish from ${cleanDomain}`,
    description,
    ingredients: ingredients.length > 0 ? ingredients : [
      'Fresh Seasonal Produce',
      'Extra Virgin Olive Oil & Seasonings',
      'Aromatics (Garlic, Onion, Herbs)'
    ],
    directions: directions.length > 0 ? directions : [
      'Prepare and assemble all fresh ingredients as indicated.',
      'Cook over medium heat until golden and aromatic.',
      'Garnish and serve immediately.'
    ],
    instructions: directions.length > 0 ? directions : [
      'Prepare and assemble all fresh ingredients as indicated.',
      'Cook over medium heat until golden and aromatic.',
      'Garnish and serve immediately.'
    ],
    imageUrl,
    prepTime: '20 mins',
    cookTime: '25 mins',
    servings: 4,
    recipeType: 'Main Dish',
    cuisine: 'International',
    nutrition: {},
    sourceUrl: targetUrl
  };
}
