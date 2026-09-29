import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    default: return 'image/jpeg';
  }
}

export async function GET(
  request: Request | NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    if (!filename) {
      return new NextResponse('File parameter missing', { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const candidateDirs = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
      path.join(process.cwd(), 'public', 'uploads', 'recipes')
    ];

    for (const dir of candidateDirs) {
      const fullPath = path.join(dir, safeFilename);
      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': getMimeType(fullPath),
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }
    }

    // Fallback to default.jpg if target file does not exist
    for (const dir of candidateDirs) {
      const defaultPath = path.join(dir, 'default.jpg');
      if (fs.existsSync(defaultPath)) {
        const fallbackBuffer = fs.readFileSync(defaultPath);
        return new NextResponse(fallbackBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }

    return new NextResponse('Asset Not Found', { status: 404 });
  } catch (err: any) {
    return new NextResponse(`Error retrieving asset: ${err.message}`, { status: 500 });
  }
}
