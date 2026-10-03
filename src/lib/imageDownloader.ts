import fs from 'fs';
import path from 'path';

export async function downloadAndSaveImage(imageUrl: string, prefix = 'recipe'): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/images/')) return imageUrl;
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) return null;

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null;

    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    
    const targetDirs = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'recipes'),
      path.join(process.cwd(), 'public', 'uploads', 'recipes')
    ];

    let savedPath = '';
    for (const dir of targetDirs) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        savedPath = `/uploads/recipes/${filename}`;
      } catch (_) {}
    }

    return savedPath || `/uploads/recipes/${filename}`;
  } catch (err) {
    console.warn('[imageDownloader] Error downloading image:', err);
    return null;
  }
}

export const downloadAndSaveScrapedImage = downloadAndSaveImage;
export default downloadAndSaveImage;
