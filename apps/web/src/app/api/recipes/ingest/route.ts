import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

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

function getUploadDir(): string {
  const possibleDirs = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
    path.join(process.cwd(), 'public', 'uploads', 'recipes'),
  ];
  for (const d of possibleDirs) {
    const parentPublic = path.dirname(path.dirname(d));
    if (fs.existsSync(parentPublic)) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      return d;
    }
  }
  const defaultDir = path.join(process.cwd(), 'public', 'uploads', 'recipes');
  if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

async function saveImageToLocalDisk(remoteUrl: string): Promise<string> {
  if (!remoteUrl || !remoteUrl.startsWith('http')) {
    return remoteUrl || '/uploads/recipes/default.jpg';
  }

  try {
    const uploadDir = getUploadDir();
    const res = await fetch(remoteUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) return remoteUrl;

    const contentType = res.headers.get('content-type') || '';
    let ext = '.jpg';
    if (contentType.includes('image/png')) ext = '.png';
    else if (contentType.includes('image/webp')) ext = '.webp';
    else if (contentType.includes('image/gif')) ext = '.gif';
    else {
      try {
        const urlExt = path.extname(new URL(remoteUrl).pathname);
        if (urlExt && urlExt.length <= 5) ext = urlExt;
      } catch (_) {}
    }

    const fileName = `import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const arrayBuffer = await res.arrayBuffer();
    await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));

    return `/uploads/recipes/${fileName}`;
  } catch (err) {
    console.warn('Image download error:', err);
    return remoteUrl;
  }
}

export function parseIngredientString(raw: string, index: number) {
  let text = decodeHtmlEntities(raw).replace(/^(\s*[-*•]\s*|\s*\d+[\.\)]\s*|\[\s*\]\s*)/, '').trim();

  const unicodeFractions: Record<string, string> = {
    '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
    '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8'
  };
  for (const [frac, rep] of Object.entries(unicodeFractions)) {
    text = text.replace(new RegExp(frac, 'g'), rep);
  }

  const amountRegex = /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?)\s*/i;
  const amountMatch = text.match(amountRegex);

  let amount = '1';
  let remaining = text;

  if (amountMatch && amountMatch[1]) {
    amount = amountMatch[1].trim();
    remaining = text.slice(amountMatch[0].length).trim();
  }

  const unitsPattern = /^(tablespoons?|tbsp?\.?|teaspoons?|tsp?\.?|cups?|c\.?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|kilograms?|kg\.?|milliliters?|ml\.?|liters?|l\.?|pinches?|pinch|dashes?|dash|cloves?|clove|slices?|slice|pieces?|pcs?\.?|cans?|can|bottles?|bottle|packages?|pkgs?\.?|bunches?|bunch|stalks?|stalk|sprigs?|sprig|handfuls?|handful|heads?|head|portions?|portion|large|medium|small)\b/i;
  const unitMatch = remaining.match(unitsPattern);

  let unit = 'unit';
  let itemName = remaining;

  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1].trim();
    itemName = remaining.slice(unitMatch[0].length).trim().replace(/^of\s+/i, '').trim();
  }

  if (!amountMatch) {
    if (/to taste/i.test(text)) {
      amount = '1';
      unit = 'pinch';
    } else {
      amount = '1';
      unit = 'unit';
    }
    itemName = text;
  }

  if (!itemName) {
    itemName = unit || text;
    unit = 'unit';
  }

  const lName = (itemName || text).toLowerCase();
  let category = 'Produce';

  if (/garlic|onion|shallot|scallion|chive|ginger|tomato|potato|lettuce|basil|chili|pepper|bell pepper|lime|lemon|cilantro|coriander|mushroom|carrot|spinach|herb|cabbage|sprout|bean sprout|avocado|cucumber|zucchini|eggplant|celery|parsley|rosemary|thyme|mint|dill|kale|cauliflower|broccoli|fruit|apple|mango/.test(lName)) {
    category = 'Produce';
  } else if (/beef|chicken|pork|pork rib|shrimp|prawn|fish|steak|salmon|meat|bacon|tofu|egg|eggs|duck|turkey|lamb|crab|squid|clam|sausage|seafood/.test(lName)) {
    category = 'Meat and Seafood';
  } else if (/milk|cheese|butter|cream|yogurt|cheddar|parmesan|mozzarella|ghee|curd/.test(lName)) {
    category = 'Dairy';
  } else if (/rice|noodle|noodles|pasta|spaghetti|macaroni|flour|bread|quinoa|oat|oats|tortilla|cereal|grain/.test(lName)) {
    category = 'Grains and Pasta';
  } else if (/sauce|soy|fish sauce|oyster sauce|vinegar|oil|olive oil|sesame oil|paste|tamarind|mayo|mayonnaise|ketchup|mustard|sriracha|chili oil|dressing/.test(lName)) {
    category = 'Condiments and Sauces';
  } else if (/water|juice|tea|coffee|wine|beer|broth|stock|soda|cider/.test(lName)) {
    category = 'Beverages';
  } else if (/sugar|salt|palm sugar|cumin|paprika|pepper|black pepper|white pepper|cinnamon|star anise|clove|cloves|curry|spice|powder|baking powder|baking soda|yeast|extract|vanilla|honey|maple syrup|peanut|peanuts|cashew|almond|walnut|sesame seed|cornstarch/.test(lName)) {
    category = 'Pantry Staples';
  }

  return {
    id: `ing_${Date.now()}_${index}`,
    amount: amount || '1',
    quantity: amount || '1',
    unit: unit || 'unit',
    item: decodeHtmlEntities(itemName),
    name: decodeHtmlEntities(itemName),
    category
  };
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

  interface SectionGroup {
    name: string;
    steps: string[];
  }

  const sections: SectionGroup[] = [];
  const directSteps: string[] = [];

  const getOrCreateSection = (name: string): SectionGroup => {
    let s = sections.find(sec => sec.name.toLowerCase() === name.toLowerCase());
    if (!s) {
      s = { name, steps: [] };
      sections.push(s);
    }
    return s;
  };

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
        const sec = getOrCreateSection(secName);

        if (Array.isArray(item.itemListElement)) {
          for (const sub of item.itemListElement) {
            const cleaned = cleanStep(sub);
            if (cleaned) sec.steps.push(cleaned);
          }
        } else if (item.text) {
          const cleaned = cleanStep(item.text);
          if (cleaned) sec.steps.push(cleaned);
        }
        continue;
      }

      const cleaned = cleanStep(item);
      if (cleaned) directSteps.push(cleaned);
    }
  } else if (typeof recipeInstructions === 'string') {
    const cleaned = cleanStep(recipeInstructions);
    if (cleaned) directSteps.push(cleaned);
  }

  if (sections.length > 0) {
    const detailedSections = sections.filter(
      s => !/quick\s*overview|summary|brief/i.test(s.name) && s.steps.length > 0
    );
    const activeSections = detailedSections.length > 0 ? detailedSections : sections;

    const flattened: string[] = [];
    for (const sec of activeSections) {
      flattened.push(...sec.steps);
    }
    if (flattened.length > 0) return flattened;
  }

  return directSteps;
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { url, title: customTitle, imageUrl: customImageUrl } = body;

    let title = customTitle || '';
    let description = '';
    let imageUrl = customImageUrl || '';
    let rawIngredients: string[] = [];
    let instructions: string[] = [];
    let servings = 4;
    let prepTimeMinutes = 20;
    let cookTimeMinutes = 25;

    if (url && url.startsWith('http')) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

          title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || title;
          description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
          imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || imageUrl;

          $('script[type="application/ld+json"]').each((_, el) => {
            try {
              const content = $(el).html();
              if (!content) return;
              const data = JSON.parse(content);

              const findRecipe = (obj: any): any => {
                if (!obj) return null;
                if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) return obj;
                if (Array.isArray(obj)) {
                  for (const i of obj) {
                    const found = findRecipe(i);
                    if (found) return found;
                  }
                }
                if (Array.isArray(obj['@graph'])) {
                  for (const i of obj['@graph']) {
                    const found = findRecipe(i);
                    if (found) return found;
                  }
                }
                return null;
              };

              const rec = findRecipe(data);
              if (rec) {
                if (rec.name) title = decodeHtmlEntities(rec.name);
                if (rec.description) description = decodeHtmlEntities(rec.description);
                if (rec.image) {
                  if (typeof rec.image === 'string') imageUrl = rec.image;
                  else if (Array.isArray(rec.image) && rec.image.length > 0) imageUrl = typeof rec.image[0] === 'string' ? rec.image[0] : rec.image[0]?.url || imageUrl;
                  else if (rec.image?.url) imageUrl = rec.image.url;
                }
                if (Array.isArray(rec.recipeIngredient)) {
                  rawIngredients = rec.recipeIngredient.map((i: any) => decodeHtmlEntities(String(i)).trim());
                }
                if (rec.recipeInstructions) {
                  const extracted = extractAllSteps(rec.recipeInstructions);
                  if (extracted.length > 0) {
                    instructions = extracted;
                  }
                }
                if (rec.recipeYield) servings = parseInt(String(rec.recipeYield)) || servings;
              }
            } catch (_) {}
          });

          // Fallback to WPRM DOM elements if JSON-LD missing
          if (rawIngredients.length === 0) {
            $('.wprm-recipe-ingredient, .ingredient, [class*="ingredient"]').each((_, el) => {
              const t = decodeHtmlEntities($(el).text().replace(/\s+/g, ' ')).trim();
              if (t && t.length < 140 && !rawIngredients.includes(t)) rawIngredients.push(t);
            });
          }

          if (instructions.length === 0) {
            const wprmGroups = $('.wprm-recipe-instruction-group');
            if (wprmGroups.length > 0) {
              wprmGroups.each((_, group) => {
                const groupTitle = $(group).find('.wprm-recipe-instruction-group-name').text().trim();
                if (/quick\s*overview|summary/i.test(groupTitle) && wprmGroups.length > 1) {
                  return;
                }
                $(group).find('.wprm-recipe-instruction-text, .wprm-recipe-instruction').each((_, el) => {
                  const t = decodeHtmlEntities($(el).text().replace(/\s+/g, ' ')).replace(/^\s*(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim();
                  if (t && t.length > 5 && !instructions.includes(t)) instructions.push(t);
                });
              });
            }

            if (instructions.length === 0) {
              $('.wprm-recipe-instruction-text, .wprm-recipe-instruction, .instruction, [class*="instruction"], .recipe-directions li').each((_, el) => {
                const t = decodeHtmlEntities($(el).text().replace(/\s+/g, ' ')).replace(/^\s*(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim();
                if (t && t.length > 8 && !instructions.includes(t)) instructions.push(t);
              });
            }
          }
        }
      } catch (err) {
        console.warn('Scraper warning:', err);
      }
    }

    if (!title) {
      title = url ? (url.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'Imported Recipe') : 'Imported Recipe';
    }

    const cleanInstructions = (instructions.length > 0 ? instructions : [
      'Prepare all ingredients thoroughly according to recipe instructions.',
      'Cook ingredients as recommended in the recipe source.',
      'Garnish, serve warm, and enjoy.'
    ]).map((s: string) => decodeHtmlEntities(s).replace(/^(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim()).filter(Boolean);

    const localImageUrl = await saveImageToLocalDisk(imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
    const structuredIngredients = (rawIngredients.length > 0 ? rawIngredients : ['1 portion fresh ingredients']).map((ing, idx) => parseIngredientString(ing, idx));

    const recipeData = {
      title: decodeHtmlEntities(title),
      name: decodeHtmlEntities(title),
      description: decodeHtmlEntities(description) || `Imported recipe from ${url || 'notes'}`,
      imageUrl: localImageUrl,
      image: localImageUrl,
      category: 'Main Dish',
      recipeType: 'Main Dish',
      tags: ['Main Dish', 'Imported'],
      servings,
      prepTimeMinutes,
      cookTimeMinutes,
      ingredients: structuredIngredients,
      instructions: cleanInstructions,
      steps: cleanInstructions,
      sourceUrl: url || '',
      isFavorite: false,
      isCooked: false,
      rating: 0
    };

    return NextResponse.json({
      success: true,
      data: recipeData
    });
  } catch (error: any) {
    
    // Persist ingested recipe to PostgreSQL saved_recipes
    try {
      const targetUserId = body.userId || (typeof userId !== 'undefined' ? userId : 'usr_admin_1');
      const targetId = newRecipe.id || ('import_' + Date.now().toString(36));

      await query(`
        INSERT INTO users (id, name, email, role, subscription_plan)
        VALUES ($1, 'User', $2, 'user', 'taster')
        ON CONFLICT (id) DO NOTHING;
      `, [targetUserId, targetUserId.includes('@') ? targetUserId : `${targetUserId}@zecratary.local`]);

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `, [
        targetId,
        targetUserId,
        newRecipe.title || newRecipe.name || 'Imported Recipe',
        newRecipe.description || '',
        newRecipe.recipeType || newRecipe.category || 'Main Dish',
        newRecipe.cuisine || '',
        String(newRecipe.prepTime || newRecipe.prepTimeMinutes || '15'),
        String(newRecipe.cookTime || newRecipe.cookTimeMinutes || '25'),
        String(newRecipe.servings || '4'),
        newRecipe.difficulty || 'Medium',
        JSON.stringify(newRecipe.ingredients || []),
        JSON.stringify(newRecipe.directions || newRecipe.instructions || newRecipe.steps || []),
        JSON.stringify(newRecipe.nutrition || newRecipe.macros || {}),
        JSON.stringify(newRecipe.tags || ['Imported']),
        newRecipe.imageUrl || newRecipe.image || '',
        false
      ]);
    } catch (dbErr) {
      console.error('[Ingest API] PostgreSQL persistence error:', dbErr);
    }

    
    // Tag imported recipe explicitly with creator identity in PostgreSQL
    try {
      const targetUserId = (body.userId || body.user_id || 'usr_admin_1').trim();
      const createdBy = (body.createdBy || body.created_by || body.email || targetUserId).trim();
      const creatorName = (body.creatorName || body.creator_name || body.name || 'Creator').trim();
      const targetId = newRecipe.id || ('import_' + Date.now().toString(36));

      await query(`
        INSERT INTO users (id, name, email, role, subscription_plan)
        VALUES ($1, $2, $3, 'user', 'taster')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;
      `, [targetUserId, creatorName, createdBy.includes('@') ? createdBy : `${targetUserId}@zecratary.local`]);

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, created_by, creator_name, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          created_by = EXCLUDED.created_by,
          creator_name = EXCLUDED.creator_name,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `, [
        targetId,
        targetUserId,
        createdBy,
        creatorName,
        newRecipe.title || newRecipe.name || 'Imported Recipe',
        newRecipe.description || '',
        newRecipe.recipeType || newRecipe.category || 'Main Dish',
        newRecipe.cuisine || '',
        String(newRecipe.prepTime || newRecipe.prepTimeMinutes || '15'),
        String(newRecipe.cookTime || newRecipe.cookTimeMinutes || '25'),
        String(newRecipe.servings || '4'),
        newRecipe.difficulty || 'Medium',
        JSON.stringify(newRecipe.ingredients || []),
        JSON.stringify(newRecipe.directions || newRecipe.instructions || newRecipe.steps || []),
        JSON.stringify(newRecipe.nutrition || newRecipe.macros || {}),
        JSON.stringify(newRecipe.tags || ['Imported']),
        newRecipe.imageUrl || newRecipe.image || '',
        false
      ]);
    } catch (dbErr) {
      console.error('[Ingest API] PostgreSQL creator persistence error:', dbErr);
    }

    
    // Tag imported recipe with creator identity in PostgreSQL
    try {
      const targetUserId = (body.userId || body.user_id || 'usr_admin_1').trim();
      const createdBy = (body.createdBy || body.created_by || body.email || targetUserId).trim();
      const creatorName = (body.creatorName || body.creator_name || body.name || 'Creator').trim();
      const targetId = newRecipe.id || ('import_' + Date.now().toString(36));

      await query(`
        INSERT INTO users (id, name, email, role, subscription_plan)
        VALUES ($1, $2, $3, 'user', 'taster')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;
      `, [targetUserId, creatorName, createdBy.includes('@') ? createdBy : `${targetUserId}@zecratary.local`]);

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, created_by, creator_name, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          created_by = EXCLUDED.created_by,
          creator_name = EXCLUDED.creator_name,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `, [
        targetId,
        targetUserId,
        createdBy,
        creatorName,
        newRecipe.title || newRecipe.name || 'Imported Recipe',
        newRecipe.description || '',
        newRecipe.recipeType || newRecipe.category || 'Main Dish',
        newRecipe.cuisine || '',
        String(newRecipe.prepTime || newRecipe.prepTimeMinutes || '15'),
        String(newRecipe.cookTime || newRecipe.cookTimeMinutes || '25'),
        String(newRecipe.servings || '4'),
        newRecipe.difficulty || 'Medium',
        JSON.stringify(newRecipe.ingredients || []),
        JSON.stringify(newRecipe.directions || newRecipe.instructions || newRecipe.steps || []),
        JSON.stringify(newRecipe.nutrition || newRecipe.macros || {}),
        JSON.stringify(newRecipe.tags || ['Imported']),
        newRecipe.imageUrl || newRecipe.image || '',
        false
      ]);
    } catch (dbErr) {
      console.error('[Ingest API] PostgreSQL creator persistence error:', dbErr);
    }

    return NextResponse.json({ success: false, error: error.message || 'Ingestion failed' }, { status: 500 });
  }
}
