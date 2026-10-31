import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function cleanImageUrl(raw?: any): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.includes('#primaryimage') || trimmed.endsWith('#')) return null;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) return null;
  return trimmed;
}

async function downloadAndSaveImageLocally(remoteUrl: string): Promise<string | null> {
  try {
    const cleanUrl = cleanImageUrl(remoteUrl);
    if (!cleanUrl || !cleanUrl.startsWith('http')) return cleanUrl;

    const parsed = new URL(cleanUrl);
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${parsed.protocol}//${parsed.hostname}/`
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 100) return null;

    let ext = '.jpg';
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('png')) ext = '.png';

    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
    const filename = `scraped_${Date.now()}_${hash}${ext}`;
    const localServingPath = `/recipes/images/${filename}`;

    // Write to all public directory targets in workspace
    const candidateDirs = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'recipes', 'images'),
      path.join(process.cwd(), 'public', 'recipes', 'images'),
      path.join(process.cwd(), 'recipes', 'images')
    ];

    for (const dir of candidateDirs) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
      } catch (_) {}
    }

    return localServingPath;
  } catch (err) {
    console.warn('[scrape] Failed to download remote image:', err);
    return null;
  }
}

async function scrapeMetadataFromPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow'
    });

    if (!response.ok) return null;
    const html = await response.text();

    let scrapedImg: string | null = null;
    let title: string | null = null;
    let description: string | null = null;
    const ingredients: string[] = [];
    const instructions: string[] = [];

    // 1. JSON-LD Schema.org parsing
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
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
            if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return node;
            if (node['@graph']) return findRecipe(node['@graph']);
          }
          return null;
        };

        const rNode = findRecipe(parsed);
        if (rNode) {
          title = rNode.name || rNode.headline || null;
          description = rNode.description || null;

          if (typeof rNode.image === 'string') scrapedImg = cleanImageUrl(rNode.image);
          else if (Array.isArray(rNode.image) && rNode.image[0]) {
            scrapedImg = cleanImageUrl(typeof rNode.image[0] === 'string' ? rNode.image[0] : rNode.image[0]?.url);
          } else if (rNode.image?.url) {
            scrapedImg = cleanImageUrl(rNode.image.url);
          }

          const rawIngs = rNode.recipeIngredient || rNode.ingredients || [];
          if (Array.isArray(rawIngs)) {
            ingredients.push(...rawIngs.map((i: any) => String(i).trim()).filter(Boolean));
          }

          const rawSteps = rNode.recipeInstructions || rNode.instructions || [];
          if (Array.isArray(rawSteps)) {
            for (const step of rawSteps) {
              if (typeof step === 'string') instructions.push(step.trim());
              else if (step?.text) instructions.push(step.text.trim());
              else if (Array.isArray(step?.itemListElement)) {
                for (const sub of step.itemListElement) {
                  if (sub?.text) instructions.push(sub.text.trim());
                }
              }
            }
          }
          break;
        }
      } catch (_) {}
    }

    // 2. OpenGraph Fallback
    if (!scrapedImg) {
      const ogImgMatch = html.match(/<meta[^>]*property=["'](?:og:image|og:image:secure_url)["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:image|og:image:secure_url)["']/i);
      if (ogImgMatch) scrapedImg = cleanImageUrl(ogImgMatch[1]);
    }

    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["'](?:og:title)["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<title>([^<]+)<\/title>/i);
      if (ogTitleMatch) title = ogTitleMatch[1].replace(/ - [^-]+$/, '').trim();
    }

    return { title, description, scrapedImg, ingredients, instructions };
  } catch (_) {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      url,
      title: inputTitle,
      description: inputDesc,
      mealType = 'Dinner',
      servings = 2,
      ingredients: inputIngs = [],
      instructions: inputInst = [],
      image: inputImage,
      userId = 'usr_guest',
      userEmail,
      recommendedRecipeUrls = []
    } = body;

    let targetUrl = (url || '').trim();
    if (!targetUrl && Array.isArray(recommendedRecipeUrls) && recommendedRecipeUrls.length > 0) {
      targetUrl = recommendedRecipeUrls[0];
    }

    let finalTitle = inputTitle || 'Chef Recommended Dish';
    let finalDesc = inputDesc || 'Wholesome culinary recipe prepared with fresh ingredients.';
    let finalIngredients = Array.isArray(inputIngs) && inputIngs.length > 0 ? inputIngs : ['Fresh Produce & Proteins', 'Seasonings & Olive Oil'];
    let finalInstructions = Array.isArray(inputInst) && inputInst.length > 0 ? inputInst : ['Prepare ingredients carefully.', 'Cook over medium heat until tender.', 'Season and serve warm.'];
    let candidateImage = cleanImageUrl(inputImage);

    // If source URL is available, attempt full extraction
    if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
      const pageData = await scrapeMetadataFromPage(targetUrl);
      if (pageData) {
        if (pageData.title && !inputTitle) finalTitle = pageData.title;
        if (pageData.description && !inputDesc) finalDesc = pageData.description;
        if (pageData.ingredients.length > 0 && finalIngredients.length <= 2) finalIngredients = pageData.ingredients;
        if (pageData.instructions.length > 0 && finalInstructions.length <= 3) finalInstructions = pageData.instructions;
        if (pageData.scrapedImg) candidateImage = pageData.scrapedImg;
      }
    }

    // Download remote image to localhost storage to prevent 403 hotlink blocks
    let finalLocalImage = '/recipes/images/default.jpg';
    if (candidateImage && candidateImage.startsWith('http')) {
      const downloaded = await downloadAndSaveImageLocally(candidateImage);
      if (downloaded) finalLocalImage = downloaded;
      else finalLocalImage = candidateImage;
    } else if (candidateImage && candidateImage.startsWith('/')) {
      finalLocalImage = candidateImage;
    }

    const recipeId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const hostName = targetUrl && /^https?:\/\//i.test(targetUrl) ? new URL(targetUrl).hostname.replace(/^www\./i, '') : 'Chef Foodie';

    const finalRecipe = {
      id: recipeId,
      title: finalTitle,
      description: finalDesc,
      prepMinutes: body.prepMinutes || 15,
      cookMinutes: body.cookMinutes || 20,
      servings: Number(servings) || 2,
      calories: body.calories || 480,
      mealType: mealType || 'Dinner',
      recipeType: mealType || 'Dinner',
      ingredients: finalIngredients,
      instructions: finalInstructions,
      directions: finalInstructions,
      image: finalLocalImage,
      imageUrl: finalLocalImage,
      image_url: finalLocalImage,
      sourceUrl: targetUrl || '',
      sourceName: hostName,
      userId,
      userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Write individual JSON file to public/recipes/<id>.json
    const jsonDirs = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'recipes'),
      path.join(process.cwd(), 'public', 'recipes'),
      path.join(process.cwd(), 'recipes')
    ];

    for (const jDir of jsonDirs) {
      try {
        fs.mkdirSync(jDir, { recursive: true });
        fs.writeFileSync(path.join(jDir, `${recipeId}.json`), JSON.stringify(finalRecipe, null, 2), 'utf-8');
      } catch (_) {}
    }

    // 2. Persist to PostgreSQL and MySQL if db helper exists
    try {
      const dbModule = await import('@/lib/db').catch(() => null);
      if (dbModule && typeof dbModule.query === 'function') {
        await dbModule.query(
          `INSERT INTO saved_recipes 
           (id, user_id, title, description, meal_type, servings, prep_time, cook_time, calories, ingredients, directions, image, image_url, source_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET 
             image = EXCLUDED.image,
             image_url = EXCLUDED.image_url,
             updated_at = NOW();`,
          [
            recipeId,
            userId,
            finalTitle,
            finalDesc,
            mealType,
            finalRecipe.servings,
            finalRecipe.prepMinutes,
            finalRecipe.cookMinutes,
            finalRecipe.calories,
            JSON.stringify(finalIngredients),
            JSON.stringify(finalInstructions),
            finalLocalImage,
            finalLocalImage,
            targetUrl || ''
          ]
        );
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      recipe: finalRecipe
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
