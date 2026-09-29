import fs from 'fs';
import path from 'path';

export async function downloadAndSaveScrapedImage(
  imageUrl: string,
  prefix: string = 'scraped'
): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const cleanUrl = imageUrl.trim();

  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('/images/')) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith('data:image/')) {
    try {
      const match = cleanUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        let ext = match[1].toLowerCase().replace('jpeg', 'jpg');
        if (ext.includes('svg')) ext = 'svg';
        const buffer = Buffer.from(match[2], 'base64');
        const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        return saveBufferToLocalUploads(buffer, filename);
      }
    } catch (_) {}
    return null;
  }

  if (cleanUrl.includes('#') && !cleanUrl.startsWith('http')) return null;
  const sanitizedUrl = cleanUrl.split('#')[0];

  if (!/^https?:\/\//i.test(sanitizedUrl)) return null;

  try {
    const origin = new URL(sanitizedUrl).origin;
    const response = await fetch(sanitizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': origin,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(9000),
      redirect: 'follow'
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('gif')) ext = 'gif';
    else if (contentType.includes('avif')) ext = 'avif';
    else {
      try {
        const uPath = new URL(sanitizedUrl).pathname;
        const potentialExt = uPath.split('.').pop()?.toLowerCase();
        if (potentialExt && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(potentialExt)) {
          ext = potentialExt === 'jpeg' ? 'jpg' : potentialExt;
        }
      } catch (_) {}
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length < 100) return null;

    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    return saveBufferToLocalUploads(buffer, filename);
  } catch (err) {
    console.warn('[ImageDownloader] Could not save scraped image to localhost:', sanitizedUrl, err);
    return null;
  }
}

export function saveBufferToLocalUploads(buffer: Buffer, filename: string): string {
  const candidateDirs = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
    path.join(process.cwd(), 'public', 'uploads', 'recipes')
  ];

  let relativePath = `/uploads/recipes/${filename}`;
  let wroteSuccessfully = false;

  for (const dir of candidateDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), buffer);
      wroteSuccessfully = true;
    } catch (_) {}
  }

  if (!wroteSuccessfully) {
    const fallbackDir = candidateDirs[0];
    fs.mkdirSync(fallbackDir, { recursive: true });
    fs.writeFileSync(path.join(fallbackDir, filename), buffer);
  }

  return relativePath;
}
