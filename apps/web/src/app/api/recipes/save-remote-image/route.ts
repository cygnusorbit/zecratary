import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveScrapedImage } from '@/lib/imageDownloader';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageUrl = body.imageUrl || body.url || '';
    const prefix = body.prefix || 'scraped';

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'No image URL provided' }, { status: 400 });
    }

    if (imageUrl.startsWith('/uploads/')) {
      return NextResponse.json({ success: true, localPath: imageUrl });
    }

    const localPath = await downloadAndSaveScrapedImage(imageUrl, prefix);
    if (!localPath) {
      return NextResponse.json({ success: false, error: 'Could not download image' }, { status: 422 });
    }

    return NextResponse.json({ success: true, localPath });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
