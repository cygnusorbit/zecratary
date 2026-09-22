export interface ScrapedRecipeData {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  calories?: number;
  image?: string;
  sourceUrl: string;
  sourceName?: string;
}

export interface DiscoveredSlugItem {
  url: string;
  slug: string;
  title: string;
}

function parseDurationMinutes(durationStr?: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 15;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (match) {
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes || 15;
  }
  const num = parseInt(durationStr, 10);
  return isNaN(num) || num <= 0 ? 15 : num;
}

function cleanText(txt: any): string {
  if (!txt) return '';
  return String(txt)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isIndexOrCollectionUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    const p = parsed.pathname.toLowerCase().replace(/\/+$/, '');
    return (
      p === '' ||
      p === '/recipes' ||
      p.includes('/recipes/') ||
      p.includes('/category/') ||
      p.includes('/categories/') ||
      p.includes('/collection/') ||
      p.includes('/collections/') ||
      p.includes('/tag/') ||
      p.includes('/archive/') ||
      p.endsWith('/recipes') ||
      p.endsWith('/all') ||
      parsed.search.includes('page=') ||
      parsed.search.includes('category=')
    );
  } catch (_) {
    return false;
  }
}

export async function discoverRecipeLinksFromIndex(indexUrl: string): Promise<DiscoveredSlugItem[]> {
  try {
    const targetUrl = (indexUrl || '').trim();
    if (!/^https?:\/\//i.test(targetUrl)) return [];

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow'
    });

    if (!response.ok) return [];
    const html = await response.text();
    const targetHost = new URL(targetUrl).hostname;
    const discoveredMap = new Map<string, DiscoveredSlugItem>();

    // 1. Inspect Schema.org ItemList JSON-LD
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const findItems = (node: any) => {
          if (!node) return;
          if (Array.isArray(node)) {
            node.forEach(findItems);
          } else if (typeof node === 'object') {
            if ((node['@type'] === 'ItemList' || node['@type'] === 'CollectionPage') && Array.isArray(node.itemListElement)) {
              for (const el of node.itemListElement) {
                const itemUrl = el.url || (typeof el.item === 'string' ? el.item : el.item?.url);
                if (itemUrl && typeof itemUrl === 'string' && itemUrl.startsWith('http')) {
                  const p = new URL(itemUrl).pathname;
                  const slug = p.split('/').filter(Boolean).pop() || '';
                  const itemTitle = cleanText(el.name || el.item?.name || slug.replace(/[-_]/g, ' '));
                  if (slug.length > 3) {
                    discoveredMap.set(itemUrl, {
                      url: itemUrl,
                      slug,
                      title: itemTitle.length > 2 ? itemTitle : slug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    });
                  }
                }
              }
            }
            if (node['@graph']) findItems(node['@graph']);
          }
        };
        findItems(parsed);
      } catch (_) {}
    }

    // 2. Scan HTML anchor tags
    const anchorMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
    for (const m of anchorMatches) {
      try {
        const rawHref = m[1].trim();
        const innerText = cleanText(m[2]);
        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;

        const resolved = new URL(rawHref, targetUrl);
        if (resolved.hostname !== targetHost) continue;

        const p = resolved.pathname.toLowerCase();
        if (
          p === '' ||
          p === '/' ||
          p === '/recipes' ||
          p === '/recipes/' ||
          p.includes('/category/') ||
          p.includes('/categories/') ||
          p.includes('/tag/') ||
          p.includes('/page/') ||
          p.includes('/author/') ||
          p.includes('/contact') ||
          p.includes('/about') ||
          p.includes('/privacy') ||
          p.includes('/terms') ||
          p.includes('/shop') ||
          p.includes('/cart') ||
          p.includes('/wp-content') ||
          p.includes('/wp-json') ||
          /\.(jpg|jpeg|png|gif|webp|svg|pdf|css|js)$/i.test(p)
        ) {
          continue;
        }

        const segments = p.split('/').filter(Boolean);
        const slug = segments[segments.length - 1] || '';
        if (slug.length > 3 && !/^\d+$/.test(slug)) {
          const canonicalUrl = resolved.origin + resolved.pathname;
          if (!discoveredMap.has(canonicalUrl)) {
            const rawTitle = innerText && innerText.length > 3 && !innerText.toLowerCase().includes('read more')
              ? innerText
              : slug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            discoveredMap.set(canonicalUrl, {
              url: canonicalUrl,
              slug,
              title: rawTitle
            });
          }
        }
      } catch (_) {}
    }

    return Array.from(discoveredMap.values());
  } catch (_) {
    return [];
  }
}

export function findBestMatchingUrl(queryText: string, urls: string[]): string | null {
  if (!urls || urls.length === 0) return null;
  if (urls.length === 1) return urls[0];

  const cleanQuery = (queryText || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const queryTokens = cleanQuery.split(/\s+/).filter(w => w.length > 2);

  let bestCandidate = urls[0];
  let highestScore = -1;

  for (const candUrl of urls) {
    let score = 0;
    try {
      const urlObj = new URL(candUrl);
      const pathname = urlObj.pathname.toLowerCase().replace(/[-_./]/g, ' ');

      for (const token of queryTokens) {
        if (pathname.includes(token)) {
          score += 4;
        }
      }
    } catch (_) {}

    if (score > highestScore) {
      highestScore = score;
      bestCandidate = candUrl;
    }
  }

  return bestCandidate;
}

export async function scrapeRecipeFromUrl(rawUrl: string): Promise<ScrapedRecipeData | null> {
  try {
    const targetUrl = (rawUrl || '').trim();
    if (!/^https?:\/\//i.test(targetUrl)) return null;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow'
    });

    if (!response.ok) return null;
    const html = await response.text();
    const domain = new URL(targetUrl).hostname.replace(/^www\./, '');

    // Search Schema.org Recipe in JSON-LD
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    let recipeNode: any = null;

    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const findRecipe = (node: any): any => {
          if (!node) return null;
          if (Array.isArray(node)) {
            for (const item of node) {
              const res = findRecipe(item);
              if (res) return res;
            }
          } else if (typeof node === 'object') {
            const type = node['@type'];
            if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
              return node;
            }
            if (node['@graph']) return findRecipe(node['@graph']);
          }
          return null;
        };
        const found = findRecipe(parsed);
        if (found) {
          recipeNode = found;
          break;
        }
      } catch (_) {}
    }

    if (recipeNode) {
      const title = cleanText(recipeNode.name || recipeNode.headline) || `Recipe from ${domain}`;
      const description = cleanText(recipeNode.description) || `Authentic recipe from ${domain}`;

      let ingredients: string[] = [];
      if (Array.isArray(recipeNode.recipeIngredient)) {
        ingredients = recipeNode.recipeIngredient.map(cleanText).filter(Boolean);
      }

      let instructions: string[] = [];
      if (Array.isArray(recipeNode.recipeInstructions)) {
        instructions = recipeNode.recipeInstructions.flatMap((inst: any) => {
          if (typeof inst === 'string') return [cleanText(inst)];
          if (inst && typeof inst === 'object') {
            if (inst.text) return [cleanText(inst.text)];
            if (Array.isArray(inst.itemListElement)) {
              return inst.itemListElement.map((sub: any) => cleanText(sub.text || sub.name)).filter(Boolean);
            }
          }
          return [];
        }).filter(Boolean);
      } else if (typeof recipeNode.recipeInstructions === 'string') {
        instructions = recipeNode.recipeInstructions.split(/\r?\n/).map(cleanText).filter(Boolean);
      }

      let image = '';
      if (typeof recipeNode.image === 'string' && recipeNode.image.startsWith('http')) {
        image = recipeNode.image;
      } else if (Array.isArray(recipeNode.image) && recipeNode.image[0]) {
        const first = recipeNode.image[0];
        image = typeof first === 'string' ? first : first.url || '';
      } else if (recipeNode.image?.url) {
        image = recipeNode.image.url;
      }

      const prepMinutes = parseDurationMinutes(recipeNode.prepTime);
      const cookMinutes = parseDurationMinutes(recipeNode.cookTime || recipeNode.totalTime);
      let servings = 2;
      if (recipeNode.recipeYield) {
        const m = String(recipeNode.recipeYield).match(/\d+/);
        if (m) servings = parseInt(m[0], 10);
      }

      let calories: number | undefined = undefined;
      if (recipeNode.nutrition?.calories) {
        const calMatch = String(recipeNode.nutrition.calories).match(/\d+/);
        if (calMatch) calories = parseInt(calMatch[0], 10);
      }

      return {
        title,
        description,
        ingredients: ingredients.length > 0 ? ingredients : ['Fresh produce & proteins', 'Aromatics & seasonings', 'Olive oil'],
        instructions: instructions.length > 0 ? instructions : ['Prepare ingredients and cook according to recipe guidelines.'],
        prepMinutes,
        cookMinutes,
        servings,
        calories,
        image: image || undefined,
        sourceUrl: targetUrl,
        sourceName: domain
      };
    }

    // Heuristic OpenGraph Fallback
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogImage = html.match(/<meta[^>]*property=["'](?:og:image|og:image:secure_url)["'][^>]*content=["']([^"']+)["']/i);

    return {
      title: ogTitle ? cleanText(ogTitle[1]) : `Curated Dish from ${domain}`,
      description: ogDesc ? cleanText(ogDesc[1]) : `Recipe curated from ${domain}`,
      ingredients: ['Fresh seasonal produce', 'Quality protein & olive oil', 'Herbs & spices'],
      instructions: ['Prepare ingredients and cook according to source recipe guidelines.'],
      prepMinutes: 15,
      cookMinutes: 20,
      servings: 2,
      image: ogImage ? ogImage[1].trim() : undefined,
      sourceUrl: targetUrl,
      sourceName: domain
    };
  } catch (_) {
    return null;
  }
}

export async function resolveAndScrapeBestRecipe(queryText: string, candidateUrls: string[]): Promise<ScrapedRecipeData | null> {
  if (!candidateUrls || candidateUrls.length === 0) return null;

  for (const candUrl of candidateUrls) {
    if (!candUrl || typeof candUrl !== 'string') continue;

    if (isIndexOrCollectionUrl(candUrl)) {
      const discoveredItems = await discoverRecipeLinksFromIndex(candUrl);
      if (discoveredItems.length > 0) {
        const urlsOnly = discoveredItems.map(d => d.url);
        const bestMatchedUrl = findBestMatchingUrl(queryText, urlsOnly) || urlsOnly[0];
        const scraped = await scrapeRecipeFromUrl(bestMatchedUrl);
        if (scraped && scraped.ingredients.length > 0) {
          return scraped;
        }
      }
    } else {
      const direct = await scrapeRecipeFromUrl(candUrl);
      if (direct && direct.ingredients.length > 0) {
        return direct;
      }
    }
  }

  return null;
}

export async function extractImageFromUrl(rawUrl: string): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const data = await scrapeRecipeFromUrl(rawUrl);
  return data?.image || null;
}
