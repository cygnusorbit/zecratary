import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);
    const searchDirs = [
      path.join(process.cwd(), 'recipes', safeName),
      path.join(process.cwd(), 'public', 'recipes', safeName),
      path.join(process.cwd(), 'apps', 'web', 'recipes', safeName),
      path.join(process.cwd(), 'apps', 'web', 'public', 'recipes', safeName)
    ];

    for (const filePath of searchDirs) {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return new NextResponse(data, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'
          }
        });
      }
    }
    return NextResponse.json({ error: 'Recipe JSON not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
