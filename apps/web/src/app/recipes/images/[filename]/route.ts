import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRecipeImageDir } from '@/lib/recipeFiles';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeName = path.basename(filename);
    const primaryPath = path.join(getRecipeImageDir(), safeName);

    let foundPath = fs.existsSync(primaryPath) ? primaryPath : null;

    if (!foundPath) {
      const fallback = path.join(process.cwd(), 'public', 'recipes', 'images', safeName);
      if (fs.existsSync(fallback)) foundPath = fallback;
    }

    if (foundPath) {
      const buffer = fs.readFileSync(foundPath);
      let contentType = 'image/jpeg';
      if (safeName.endsWith('.png')) contentType = 'image/png';
      else if (safeName.endsWith('.webp')) contentType = 'image/webp';
      else if (safeName.endsWith('.svg')) contentType = 'image/svg+xml';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
        }
      });
    }

    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
