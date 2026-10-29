// Local Recipe JSON Asset Loader with In-Memory Caching & Runtime Safeguards
import fs from 'fs';
import path from 'path';

let inMemoryRecipeCache: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1-minute TTL

export function getLocalRecipeFiles(): any[] {
  const now = Date.now();
  if (inMemoryRecipeCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return inMemoryRecipeCache;
  }

  const recipes: any[] = [];
  const candidateDirs = [
    path.join(process.cwd(), 'data', 'recipes'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'recipes'),
    path.join(process.cwd(), 'public', 'recipes'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'recipes')
  ];

  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              recipes.push(...parsed);
            } else if (parsed && typeof parsed === 'object') {
              recipes.push(parsed);
            }
          } catch (_) {}
        }
        if (recipes.length > 0) break;
      }
    } catch (_) {}
  }

  inMemoryRecipeCache = recipes;
  lastCacheTime = now;
  return recipes;
}
