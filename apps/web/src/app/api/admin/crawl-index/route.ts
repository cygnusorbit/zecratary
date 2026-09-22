import { NextRequest, NextResponse } from 'next/server';
import { discoverRecipeLinksFromIndex, scrapeRecipeFromUrl, isIndexOrCollectionUrl } from '@/lib/recipeScraper';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'crawl';
    const targetUrl = (body.url || '').trim();
    const recipeUrl = (body.recipeUrl || '').trim();

    if (action === 'pull') {
      const urlToScrape = recipeUrl || targetUrl;
      if (!urlToScrape || !/^https?:\/\//i.test(urlToScrape)) {
        return NextResponse.json({ success: false, error: 'A valid recipe URL is required to pull.' }, { status: 400 });
      }

      const recipe = await scrapeRecipeFromUrl(urlToScrape);
      if (!recipe) {
        return NextResponse.json({ success: false, error: 'Could not extract recipe contents from target slug.' }, { status: 422 });
      }

      return NextResponse.json({ success: true, recipe });
    }

    // Default action: Crawl index links & discover recipe slugs
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return NextResponse.json({ success: false, error: 'A valid HTTP/HTTPS URL is required.' }, { status: 400 });
    }

    const isIndex = isIndexOrCollectionUrl(targetUrl);
    const discovered = await discoverRecipeLinksFromIndex(targetUrl);

    // Save discovered cache to PostgreSQL admin_settings
    if (discovered.length > 0) {
      try {
        const rows = await query('SELECT chef_ai_settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
        let currentSettings: any = {};
        if (rows.length > 0 && rows[0].chef_ai_settings) {
          currentSettings = typeof rows[0].chef_ai_settings === 'string'
            ? JSON.parse(rows[0].chef_ai_settings)
            : rows[0].chef_ai_settings;
        }

        const cache = currentSettings.discoveredRecipesCache || {};
        cache[targetUrl] = {
          count: discovered.length,
          discovered: discovered.slice(0, 40),
          crawledAt: new Date().toISOString()
        };
        currentSettings.discoveredRecipesCache = cache;

        await query(
          'UPDATE admin_settings SET chef_ai_settings = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(currentSettings), 'primary_settings']
        );
      } catch (dbErr) {
        console.warn('[crawl-index] Cache persistence notice:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      indexUrl: targetUrl,
      isIndex,
      count: discovered.length,
      discovered
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error executing index crawl.' }, { status: 500 });
  }
}
