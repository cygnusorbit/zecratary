import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getTargetFiles(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'apps/web/data/saved_recipes.json'),
    path.join(cwd, 'data/saved_recipes.json')
  ];
}

function readAllRecipes(): any[] {
  const files = getTargetFiles();
  for (const file of files) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (parsed && Array.isArray(parsed.recipes) && parsed.recipes.length > 0) return parsed.recipes;
      } catch (err) {
        console.error('[API saved-recipes] Read error:', file, err);
      }
    }
  }
  return [];
}

function writeAllRecipes(recipes: any[]): boolean {
  const files = getTargetFiles();
  let wroteAny = false;
  for (const file of files) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(recipes, null, 2), 'utf-8');
      wroteAny = true;
    } catch (err) {
      console.error('[API saved-recipes] Write error:', file, err);
    }
  }
  return wroteAny;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || 'usr_admin_1').trim();

    const allRecipes = readAllRecipes();

    // Deduplicate and filter recipes
    const userRecipes = allRecipes.filter((r: any) => {
      if (!userId || userId === 'usr_admin_1') return true;
      if (r.userId && r.userId === userId) return true;
      if (r.creatorId && r.creatorId === userId) return true;
      if (r.createdBy && (r.createdBy === userId || (userId.includes('admin') && String(r.createdBy).includes('admin')))) return true;
      return false;
    });

    return NextResponse.json(userRecipes, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = (body.userId || 'usr_admin_1').trim();
    const incoming = Array.isArray(body.recipes) ? body.recipes : (Array.isArray(body) ? body : []);

    const existingAll = readAllRecipes();

    // Build key-indexed lookup to safely merge without data wipeout
    const mergedMap = new Map<string, any>();

    // 1. Ingest existing recipes
    for (const item of existingAll) {
      if (!item) continue;
      const key = String(item.id || item.title || item.name || '').trim().toLowerCase();
      if (key) mergedMap.set(key, item);
    }

    // 2. Overlay incoming recipes
    for (const item of incoming) {
      if (!item) continue;
      const key = String(item.id || item.title || item.name || '').trim().toLowerCase();
      if (key) {
        const existing = mergedMap.get(key) || {};
        mergedMap.set(key, { ...existing, ...item, userId: userId });
      }
    }

    const finalMerged = Array.from(mergedMap.values());
    writeAllRecipes(finalMerged);

    return NextResponse.json({
      success: true,
      count: finalMerged.length,
      recipes: finalMerged
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
