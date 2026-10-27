import { NextRequest, NextResponse } from 'next/server';
import { saveRecipeImageLocally } from '@/lib/recipeFiles';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, recipeId } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'Image URL required' }, { status: 400 });
    }

    const resolvedUrl = await saveRecipeImageLocally(recipeId || `img_${Date.now()}`, url);
    return NextResponse.json({
      success: true,
      url: resolvedUrl,
      localUrl: resolvedUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
