import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await Promise.resolve(context.params);
  const filename = resolvedParams?.filename;

  if (!filename) {
    return new NextResponse('File not found', { status: 404 });
  }

  const safeFilename = path.basename(filename);
  const candidateDirs = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
    path.join(process.cwd(), 'public', 'uploads', 'recipes')
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, safeFilename);
    if (fs.existsSync(fullPath)) {
      try {
        const buffer = fs.readFileSync(fullPath);
        const ext = path.extname(safeFilename).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.avif') contentType = 'image/avif';

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      } catch (_) {}
    }
  }

  for (const dir of candidateDirs) {
    const defaultPath = path.join(dir, 'default.jpg');
    if (fs.existsSync(defaultPath)) {
      const buffer = fs.readFileSync(defaultPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
  }

  return new NextResponse('Not found', { status: 404 });
}
