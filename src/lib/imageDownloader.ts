import fs from 'fs';
import path from 'path';
import { getCanonicalWebPublicDir } from '@/lib/storageService';

export async function downloadAndSaveImage(
  imageUrl: string,
  prefix: string = 'scraped'
): Promise<string> {
  const fallbackPath = '/recipes/images/default.jpg';
  if (!imageUrl || typeof imageUrl !== 'string') return fallbackPath;

  const cleanUrl = imageUrl.trim();
  if (cleanUrl.startsWith('/recipes/images/')) return cleanUrl;
  if (cleanUrl.startsWith('/uploads/recipes/')) {
    return cleanUrl.replace('/uploads/recipes/', '/recipes/images/');
  }
  if (!/^https?:\/\//i.test(cleanUrl)) return fallbackPath;

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

    if (!response.ok) return fallbackPath;

    const contentType = response.headers.get('content-type') || '';
    let ext = 'jpg';
    if (contentType.includes('webp') || cleanUrl.includes('.webp')) ext = 'webp';
    else if (contentType.includes('png') || cleanUrl.includes('.png')) ext = 'png';
    else if (contentType.includes('jpeg') || cleanUrl.includes('.jpeg')) ext = 'jpg';

    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const buffer = Buffer.from(await response.arrayBuffer());

    const targetDir = path.join(getCanonicalWebPublicDir(), 'recipes', 'images');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    fs.writeFileSync(path.join(targetDir, filename), buffer);

    // Sync to secondary path if different working directory
    const secondaryDir = path.join(process.cwd(), 'apps', 'web', 'public', 'recipes', 'images');
    if (path.resolve(secondaryDir) !== path.resolve(targetDir)) {
      try {
        if (!fs.existsSync(secondaryDir)) fs.mkdirSync(secondaryDir, { recursive: true });
        fs.writeFileSync(path.join(secondaryDir, filename), buffer);
      } catch (_) {}
    }

    return `/recipes/images/${filename}`;
  } catch (err) {
    console.warn('[ImageDownloader] Error downloading image:', err);
  }

  return fallbackPath;
}

// Backward-compatible named export alias & default export
export const downloadAndSaveScrapedImage = downloadAndSaveImage;
export default downloadAndSaveImage;
