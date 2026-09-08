import * as cheerio from 'cheerio';

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
    });
}

export function extractAllSteps(recipeInstructions: any): string[] {
  if (!recipeInstructions) return [];

  const cleanStep = (t: any): string => {
    if (!t) return '';
    const raw = typeof t === 'string' ? t : t.text || t.name || '';
    return decodeHtmlEntities(String(raw).replace(/<[^>]+>/g, ''))
      .replace(/^\s*(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '')
      .trim();
  };

  const sections: { name: string; steps: string[] }[] = [];
  const directSteps: string[] = [];

  if (Array.isArray(recipeInstructions)) {
    for (const item of recipeInstructions) {
      if (!item) continue;
      if (typeof item === 'string') {
        const cleaned = cleanStep(item);
        if (cleaned) directSteps.push(cleaned);
        continue;
      }
      if (item['@type'] === 'HowToSection' || Array.isArray(item.itemListElement)) {
        const secName = String(item.name || 'Instructions').trim();
        const secSteps: string[] = [];
        if (Array.isArray(item.itemListElement)) {
          for (const sub of item.itemListElement) {
            const cleaned = cleanStep(sub);
            if (cleaned) secSteps.push(cleaned);
          }
        } else if (item.text) {
          const cleaned = cleanStep(item.text);
          if (cleaned) secSteps.push(cleaned);
        }
        if (secSteps.length > 0) sections.push({ name: secName, steps: secSteps });
        continue;
      }
      const cleaned = cleanStep(item);
      if (cleaned) directSteps.push(cleaned);
    }
  }

  if (sections.length > 0) {
    const detailedSections = sections.filter(
      s => !/quick\s*overview|summary|brief/i.test(s.name) && s.steps.length > 0
    );
    const activeSections = detailedSections.length > 0 ? detailedSections : sections;
    const flattened: string[] = [];
    for (const sec of activeSections) flattened.push(...sec.steps);
    if (flattened.length > 0) return flattened;
  }

  return directSteps;
}

export async function parseRecipeFromUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) throw new Error(`Failed to fetch webpage (HTTP ${response.status})`);

  const html = await response.text();
  const $ = cheerio.load(html);

  let title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Imported Recipe';
  let description = $('meta[property="og:description"]').attr('content') || '';
  let imageUrl = $('meta[property="og:image"]').attr('content') || '';
  let rawIngredients: string[] = [];
  let rawInstructions: string[] = [];
  let servings = 4;

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
        if (recipe.name) title = decodeHtmlEntities(recipe.name);
        if (recipe.description) description = decodeHtmlEntities(recipe.description);
        if (typeof recipe.image === 'string') imageUrl = recipe.image;
        else if (Array.isArray(recipe.image) && recipe.image.length > 0) imageUrl = typeof recipe.image[0] === 'string' ? recipe.image[0] : recipe.image[0]?.url || imageUrl;
        if (Array.isArray(recipe.recipeIngredient)) rawIngredients = recipe.recipeIngredient.map((i: any) => decodeHtmlEntities(String(i)).trim());
        if (recipe.recipeInstructions) rawInstructions = extractAllSteps(recipe.recipeInstructions);
        if (recipe.recipeYield) servings = parseInt(String(recipe.recipeYield)) || servings;
      }
    } catch (_) {}
  });

  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description),
    imageUrl,
    rawIngredients,
    rawInstructions,
    servings,
    prepTimeMinutes: 20,
    cookTimeMinutes: 25,
    calories: 450,
    sourceUrl: url,
  };
}
