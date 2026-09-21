import { NextRequest, NextResponse } from 'next/server';
import { scrapeRecipeFromUrl } from '@/lib/recipeScraper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body.url || '').trim();

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return NextResponse.json({ success: false, error: 'A valid HTTP/HTTPS URL is required.' }, { status: 400 });
    }

    const scraped = await scrapeRecipeFromUrl(url);

    return NextResponse.json({
      success: true,
      scraped
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to scrape recipe from website.'
    }, { status: 422 });
  }
}
