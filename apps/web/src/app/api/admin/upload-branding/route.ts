import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getUploadDirectories(): string[] {
  const cwd = process.cwd();
  const dirs: string[] = [];

  const candidatePublics = [
    path.join(cwd, 'apps', 'web', 'public'),
    path.join(cwd, 'public'),
    path.resolve(cwd, '..', 'public'),
    path.resolve(cwd, '..', 'apps', 'web', 'public')
  ];

  for (const pub of candidatePublics) {
    if (fs.existsSync(pub)) {
      dirs.push(path.join(pub, 'uploads'));
    }
  }

  if (dirs.length === 0) {
    const fallback = fs.existsSync(path.join(cwd, 'apps', 'web'))
      ? path.join(cwd, 'apps', 'web', 'public', 'uploads')
      : path.join(cwd, 'public', 'uploads');
    dirs.push(fallback);
  }

  return dirs;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetType = (formData.get('type') as string) || 'branding';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const origExt = path.extname(file.name || '').toLowerCase() || '.png';
    const cleanPrefix = targetType === 'favicon' ? 'favicon' : 'titlebar-logo';
    const fileName = `${cleanPrefix}-${Date.now()}${origExt}`;

    const uploadDirs = getUploadDirectories();
    for (const uDir of uploadDirs) {
      if (!fs.existsSync(uDir)) {
        fs.mkdirSync(uDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uDir, fileName), buffer);
    }

    const relativeUrl = `/uploads/${fileName}`;
    return NextResponse.json({
      success: true,
      url: relativeUrl,
      fileName
    });
  } catch (err: any) {
    console.error('Error uploading branding image:', err);
    return NextResponse.json({ success: false, error: err.message || 'Upload failed' }, { status: 500 });
  }
}
