import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);
    const searchDirs = [
      path.join(process.cwd(), 'recipes', 'images', safeName),
      path.join(process.cwd(), 'public', 'recipes', 'images', safeName),
      path.join(process.cwd(), 'apps', 'web', 'recipes', 'images', safeName),
      path.join(process.cwd(), 'apps', 'web', 'public', 'recipes', 'images', safeName)
    ];

    for (const filePath of searchDirs) {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
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
    }
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
