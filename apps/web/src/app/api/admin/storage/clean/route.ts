import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCanonicalImagesDir, getCanonicalRecipesDir } from '@/lib/storageService';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const imagesDir = getCanonicalImagesDir();
    const recipesDir = getCanonicalRecipesDir();

    if (!fs.existsSync(imagesDir) || !fs.existsSync(recipesDir)) {
      return NextResponse.json({ success: true, removedCount: 0, message: 'Directories verified.' });
    }

    const recipeFiles = fs.readdirSync(recipesDir).filter(f => f.endsWith('.json'));
    const referencedImages = new Set<string>();
    referencedImages.add('default.jpg');

    for (const rf of recipeFiles) {
      try {
        const raw = fs.readFileSync(path.join(recipesDir, rf), 'utf-8');
        const data = JSON.parse(raw);
        const img = data.imageUrl || data.image || '';
        if (img.startsWith('/recipes/images/')) {
          referencedImages.add(path.basename(img));
        }
      } catch (_) {}
    }

    const allImages = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f));
    let removedCount = 0;

    for (const img of allImages) {
      if (!referencedImages.has(img)) {
        try {
          fs.unlinkSync(path.join(imagesDir, img));
          removedCount++;
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      removedCount,
      remainingCount: allImages.length - removedCount,
      message: `Cleaned ${removedCount} orphan image(s). ${allImages.length - removedCount} active images retained.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
