import { NextRequest, NextResponse } from 'next/server';
import { uploadMediaFile } from '@/lib/storageService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, filename } = await req.json();

    if (!imageUrl || !imageUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Valid image URL is required' }, { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Failed to fetch remote image: HTTP ${response.status}` }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    const savedUrl = await uploadMediaFile(buffer, filename || 'scraped.jpg', contentType);

    return NextResponse.json({ success: true, localUrl: savedUrl, url: savedUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
