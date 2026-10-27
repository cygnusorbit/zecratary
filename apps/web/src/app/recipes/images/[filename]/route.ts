import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRecipeImageDir } from '@/lib/recipeFiles';

export const dynamic = 'force-dynamic';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.webp': return 'image/webp';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.avif': return 'image/avif';
    default: return 'image/jpeg';
  }
}

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);
    const primaryPath = path.join(getRecipeImageDir(), safeName);

    let foundPath = fs.existsSync(primaryPath) ? primaryPath : null;

    if (!foundPath) {
      const candidates = [
        path.join(process.cwd(), 'apps', 'web', 'public', 'recipes', 'images', safeName),
        path.join(process.cwd(), 'public', 'recipes', 'images', safeName),
        path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes', safeName),
        path.join(process.cwd(), 'public', 'uploads', 'recipes', safeName)
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          foundPath = c;
          break;
        }
      }
    }

    if (foundPath) {
      const buffer = fs.readFileSync(foundPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': getMimeType(foundPath),
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
        }
      });
    }

    // Default fallback
    const defaultFallback = path.join(getRecipeImageDir(), 'default.jpg');
    if (fs.existsSync(defaultFallback)) {
      const buffer = fs.readFileSync(defaultFallback);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
