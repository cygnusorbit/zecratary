import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveImage } from '@/lib/imageDownloader';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageUrl = body.imageUrl || body.url || body.image;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid imageUrl required' }, { status: 400 });
    }

    const localUrl = await downloadAndSaveImage(imageUrl, 'scraped');
    return NextResponse.json({ success: true, localUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
