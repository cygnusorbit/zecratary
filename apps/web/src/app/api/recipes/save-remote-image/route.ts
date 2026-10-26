import { NextRequest, NextResponse } from 'next/server';
import { saveRecipeImageLocally } from '@/lib/recipeFiles';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, recipeId } = body;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
    }

    const targetId = recipeId || `img_${Date.now()}`;
    // Downloads and uploads to Supabase S3 or saves to /recipes/images based on /admin/storage
    const resolvedUrl = await saveRecipeImageLocally(targetId, imageUrl);

    return NextResponse.json({
      success: true,
      url: resolvedUrl,
      localUrl: resolvedUrl,
      imageUrl: resolvedUrl
    });
  } catch (err: any) {
    console.error('[Save Remote Image API] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
