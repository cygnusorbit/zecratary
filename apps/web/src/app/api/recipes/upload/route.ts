import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getUploadDir(): string {
  const possibleDirs = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
    path.join(process.cwd(), 'public', 'uploads', 'recipes'),
  ];
  for (const d of possibleDirs) {
    const parentPublic = path.dirname(path.dirname(d));
    if (fs.existsSync(parentPublic)) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
      return d;
    }
  }
  const defaultDir = path.join(process.cwd(), 'public', 'uploads', 'recipes');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const base64Data = formData.get('base64') as string | null;

    const uploadDir = getUploadDir();

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || '.jpg';
      const fileName = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(filePath, buffer);
      return NextResponse.json({ success: true, url: `/uploads/recipes/${fileName}` });
    }

    if (base64Data) {
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: 'Invalid base64 image data' }, { status: 400 });
      }

      const mimeType = matches[1];
      const dataBuffer = Buffer.from(matches[2], 'base64');
      let ext = '.jpg';
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';

      const fileName = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(filePath, dataBuffer);
      return NextResponse.json({ success: true, url: `/uploads/recipes/${fileName}` });
    }

    return NextResponse.json({ error: 'No image file or base64 provided' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
