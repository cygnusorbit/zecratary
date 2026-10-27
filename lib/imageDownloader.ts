// Image Downloader & Scraped Asset Pipeline
// GitHub: cygnusorbit/zecratary

import fs from 'fs';
import path from 'path';
import { getCanonicalWebPublicDir, getCanonicalImagesDir, uploadMediaFile } from '@/lib/storageService';

export async function downloadAndSaveImage(imageUrl: string, prefix = 'img'): Promise<string> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return '/recipes/images/default.jpg';
  }

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('/recipes/images/') || trimmed.includes('.supabase.co/storage/v1/object/public/')) {
    return trimmed;
  }

  try {
    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const buffer = Buffer.from(match[2], 'base64');
        return await uploadMediaFile(buffer, `${prefix}_${Date.now()}.${ext}`, `image/${ext}`);
      }
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const res = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('avif')) ext = 'avif';

        const buffer = Buffer.from(await res.arrayBuffer());
        return await uploadMediaFile(buffer, `${prefix}_${Date.now()}.${ext}`, contentType);
      }
    }
  } catch (err: any) {
    console.warn(`[imageDownloader] Failed to download image from ${trimmed}:`, err.message);
  }

  return trimmed;
}

export const downloadAndSaveScrapedImage = downloadAndSaveImage;
export default downloadAndSaveImage;
