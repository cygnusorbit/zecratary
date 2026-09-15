import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAllSavedFiles(): string[] {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'data', 'saved_recipes.json'),
    path.join(root, 'apps', 'web', 'data', 'saved_recipes.json'),
    path.resolve(root, '..', 'data', 'saved_recipes.json'),
    path.resolve(root, '..', 'apps', 'web', 'data', 'saved_recipes.json')
  ];
  return Array.from(new Set(candidates));
}

function readSavedStore(): Record<string, any[]> {
  for (const f of getAllSavedFiles()) {
    if (fs.existsSync(f)) {
      try {
        const raw = fs.readFileSync(f, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      } catch (_) {}
    }
  }
  return {};
}

function writeSavedStore(store: Record<string, any[]>) {
  const files = getAllSavedFiles();
  const serialized = JSON.stringify(store, null, 2);
  for (const f of files) {
    try {
      const dir = path.dirname(f);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(f, serialized, 'utf-8');
    } catch (err) {
      console.warn('Could not write to', f, err);
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'User identifier is required' }, { status: 400 });
    }

    const store = readSavedStore();
    const cleanId = userId.toLowerCase();
    
    // Look up by email, ID, or normalized keys
    let recipes = store[cleanId] || (email ? store[email] : null) || store[userId] || [];

    if (!recipes || recipes.length === 0) {
      // Search case-insensitively across store keys
      for (const [k, list] of Object.entries(store)) {
        const lowerK = k.toLowerCase();
        if (lowerK === cleanId || (email && lowerK === email)) {
          recipes = list;
          break;
        }
      }
    }

    return new NextResponse(JSON.stringify({ success: true, recipes: recipes || [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, recipe, recipes, recipeId, action } = body;

    const key = (email || userId || '').trim().toLowerCase();
    if (!key) {
      return NextResponse.json({ success: false, error: 'User key is required' }, { status: 400 });
    }

    const store = readSavedStore();
    let current = store[key] || (userId ? store[userId.toLowerCase()] : []) || [];

    if (action === 'sync' && Array.isArray(recipes)) {
      const map = new Map<string, any>();
      current.forEach((r: any) => {
        if (r) {
          const rk = (r.id || r.title || r.name || JSON.stringify(r)).toString().trim().toLowerCase();
          map.set(rk, r);
        }
      });
      recipes.forEach((r: any) => {
        if (r) {
          const rk = (r.id || r.title || r.name || JSON.stringify(r)).toString().trim().toLowerCase();
          map.set(rk, r);
        }
      });
      current = Array.from(map.values());
    } else if (action === 'remove') {
      const target = (recipeId || (recipe && (recipe.id || recipe.title || recipe.name)) || '').toString().trim().toLowerCase();
      current = current.filter((r: any) => {
        const rk = (r.id || r.title || r.name || '').toString().trim().toLowerCase();
        return rk !== target;
      });
    } else {
      if (recipe) {
        const rk = (recipe.id || recipe.title || recipe.name || '').toString().trim().toLowerCase();
        const exists = current.some((r: any) => {
          const existingKey = (r.id || r.title || r.name || '').toString().trim().toLowerCase();
          return existingKey === rk;
        });
        if (!exists) {
          current.unshift({ ...recipe, savedAt: recipe.savedAt || new Date().toISOString() });
        }
      }
    }

    store[key] = current;
    if (userId && userId.toLowerCase() !== key) {
      store[userId.toLowerCase()] = current;
    }
    if (email && email.toLowerCase() !== key) {
      store[email.toLowerCase()] = current;
    }

    writeSavedStore(store);

    return NextResponse.json({ success: true, recipes: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
