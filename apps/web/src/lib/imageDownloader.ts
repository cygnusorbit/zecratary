import fs from 'fs';
import path from 'path';

/**
 * Downloads a remote image binary from an external URL and writes it
 * directly to /uploads/recipes/ on localhost disk storage.
 * Returns the localhost relative URL: '/uploads/recipes/<filename>'.
 */
export async function downloadAndSaveImage(
  imageUrl: string,
  prefix: string = 'scraped'
): Promise<string> {
  const fallbackPath = '/uploads/recipes/default.jpg';
  if (!imageUrl || typeof imageUrl !== 'string') return fallbackPath;

  const cleanUrl = imageUrl.trim();
  if (cleanUrl.startsWith('/uploads/recipes/')) {
    return cleanUrl;
  }
  if (!/^https?:\/\//i.test(cleanUrl)) {
    return fallbackPath;
  }

  try {
    const origin = new URL(cleanUrl).origin;
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': origin,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(9000),
      redirect: 'follow'
    });

    if (!response.ok) {
      console.warn(`[ImageDownloader] Remote image fetch failed: ${response.status} for ${cleanUrl}`);
      return fallbackPath;
    }

    const contentType = response.headers.get('content-type') || '';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg')) ext = 'jpg';
    else if (cleanUrl.includes('.webp')) ext = 'webp';
    else if (cleanUrl.includes('.png')) ext = 'png';

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `${prefix}_${timestamp}_${randomSuffix}.${ext}`;
    const relativeUrl = `/uploads/recipes/${filename}`;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Target multiple candidate public directories across monorepo layouts
    const targetDirs = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
      path.join(process.cwd(), 'public', 'uploads', 'recipes')
    ];

    let written = false;
    for (const dir of targetDirs) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, buffer);
        written = true;
      } catch (_) {}
    }

    if (written) {
      return relativeUrl;
    }
  } catch (err) {
    console.warn('[ImageDownloader] Error downloading image:', err);
  }

  return fallbackPath;
}
