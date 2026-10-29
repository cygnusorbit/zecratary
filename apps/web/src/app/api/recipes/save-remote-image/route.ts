import { NextRequest, NextResponse } from 'next/server';
import { saveRecipeImageLocally } from '@/lib/recipeFiles';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


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
