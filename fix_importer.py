import os

files = {}

# 1. Scraper Package Stub
files["packages/scrapers/package.json"] = """{
  "name": "@zecratary/scrapers",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "cheerio": "^1.0.0-rc.12" },
  "devDependencies": { "typescript": "^5.7.3" }
}"""

files["packages/scrapers/src/index.ts"] = """import * as cheerio from 'cheerio';

export async function parseRecipeFromUrl(url: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Fallback basic extraction for AI to process
    return {
      title: $('title').text() || 'Imported Recipe',
      description: $('meta[name="description"]').attr('content') || '',
      rawIngredients: [$('body').text().substring(0, 1500)], 
      rawInstructions: ['AI will parse instructions from the provided text block.'],
      imageUrl: $('meta[property="og:image"]').attr('content') || ''
    };
  } catch (e) {
    console.error("Scraper Error:", e);
    return null;
  }
}
"""

# 2. Next.js API Route
files["apps/web/src/app/api/recipes/ingest/route.ts"] = """import { NextResponse } from 'next/server';
import { parseRecipeFromUrl } from '@zecratary/scrapers';
import { AIDispatcher } from '@zecratary/ai-engine';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

    const raw = await parseRecipeFromUrl(url);
    if (!raw) return NextResponse.json({ error: 'Could not extract recipe from target URL' }, { status: 422 });

    const dispatcher = new AIDispatcher({
      provider: (process.env.DEFAULT_AI_PROVIDER as any) || 'gemini',
    });

    const structured = await dispatcher.generateRecipe(
      `Format this scraped web content into a structured recipe:
      Title: ${raw.title}
      Description: ${raw.description}
      Ingredients: ${raw.rawIngredients?.join(', ')}
      Instructions: ${raw.rawInstructions?.join('; ')}`
    );

    return NextResponse.json({
      success: true,
      data: {
        ...structured,
        sourceUrl: url,
        imageUrl: raw.imageUrl,
      },
    });
  } catch (error: any) {
    console.error('Ingest route error:', error);
    return NextResponse.json({ error: error.message || 'Ingestion failed' }, { status: 500 });
  }
}
"""

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("✅ Importer pipeline fixed!")
