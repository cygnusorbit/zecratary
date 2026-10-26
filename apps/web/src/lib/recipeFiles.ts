import fs from 'fs';
import path from 'path';
import { getStorageSettings, uploadToSupabaseS3 } from '@/lib/storageService';

export interface RecipeOwner {
  id: string;
  name: string;
  email: string;
}

export interface StoredRecipe {
  id: string;
  ownership: {
    userId: string;
    createdBy: string;
    creatorName: string;
    creatorEmail: string;
  };
  owner: RecipeOwner;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  userId: string;
  createdBy: string;
  creatorName: string;
  creatorEmail: string;
  isPublic: boolean;
  visibility: 'public' | 'private';
  title: string;
  description?: string;
  recipeType?: string;
  category?: string;
  cuisine?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  ingredients: any[];
  instructions: any[];
  directions?: any[];
  nutrition?: any;
  imageUrl?: string;
  image?: string;
  sourceUrl?: string;
  isFavorite?: boolean;
  isCooked?: boolean;
  rating?: number;
  note?: string;
  bookId?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Resolves canonical apps/web/public directory across monorepo layouts
export function getCanonicalWebPublicDir(): string {
  const cwd = process.cwd();
  // If running inside apps/web
  if (fs.existsSync(path.join(cwd, 'public')) && (fs.existsSync(path.join(cwd, 'src', 'app')) || fs.existsSync(path.join(cwd, 'app')))) {
    return path.join(cwd, 'public');
  }
  // If running from workspace root
  if (fs.existsSync(path.join(cwd, 'apps', 'web', 'public'))) {
    return path.join(cwd, 'apps', 'web', 'public');
  }
  if (fs.existsSync(path.join(cwd, 'public'))) {
    return path.join(cwd, 'public');
  }
  return path.join(cwd, 'apps', 'web', 'public');
}

export function getRecipeJsonDir(): string {
  const dir = path.join(getCanonicalWebPublicDir(), 'recipes');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getRecipeImageDir(): string {
  const dir = path.join(getRecipeJsonDir(), 'images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function saveRecipeImageLocally(recipeId: string, imageInput?: string): Promise<string> {
  if (!imageInput || typeof imageInput !== 'string') return '/recipes/images/default.jpg';
  if (imageInput.includes('.supabase.co/storage/v1/object/public/')) return imageInput;
  if (imageInput.startsWith('/recipes/images/')) return imageInput;

  const safeId = recipeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const settings = await getStorageSettings();

  // 1. Supabase S3 Storage Provider
  if (settings.provider === 'supabase' && settings.supabase.enabled && settings.supabase.secretAccessKey) {
    try {
      let buffer: Buffer | null = null;
      let contentType = 'image/jpeg';
      let ext = 'jpg';

      if (imageInput.startsWith('data:image/')) {
        const match = imageInput.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (match) {
          ext = match[1] === 'jpeg' ? 'jpg' : match[1];
          contentType = `image/${ext}`;
          buffer = Buffer.from(match[2], 'base64');
        }
      } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        const res = await fetch(imageInput, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
          }
        });
        if (res.ok) {
          contentType = res.headers.get('content-type') || 'image/jpeg';
          if (contentType.includes('png')) ext = 'png';
          else if (contentType.includes('webp')) ext = 'webp';
          buffer = Buffer.from(await res.arrayBuffer());
        }
      }

      if (buffer) {
        const cloudFilename = `${safeId}_${Date.now()}.${ext}`;
        const cloudUrl = await uploadToSupabaseS3(buffer, cloudFilename, contentType, settings.supabase);
        return cloudUrl;
      }
    } catch (err: any) {
      console.warn('[recipeFiles] Supabase upload failed, falling back to disk:', err.message);
    }
  }

  // 2. Canonical Local Disk Storage: Save directly to apps/web/public/recipes/images
  const targetDir = getRecipeImageDir();

  if (imageInput.startsWith('data:image/')) {
    try {
      const match = imageInput.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const filename = `${safeId}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(targetDir, filename), Buffer.from(match[2], 'base64'));
        return `/recipes/images/${filename}`;
      }
    } catch (_) {}
  }

  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    try {
      const res = await fetch(imageInput, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';

        const filename = `${safeId}_${Date.now()}.${ext}`;
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(path.join(targetDir, filename), buffer);
        return `/recipes/images/${filename}`;
      }
    } catch (_) {}
  }

  return imageInput;
}

export function saveRecipeJsonFile(recipe: any, ownerInfo?: any): StoredRecipe {
  const id = recipe.id || `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');

  const userId = recipe.userId || recipe.user_id || recipe.ownerId || ownerInfo?.userId || 'usr_admin_1';
  const createdBy = recipe.createdBy || recipe.created_by || recipe.ownerEmail || ownerInfo?.createdBy || `${userId}@zecratary.local`;
  const creatorName = recipe.creatorName || recipe.creator_name || recipe.ownerName || ownerInfo?.creatorName || 'Chef';
  const creatorEmail = recipe.creatorEmail || recipe.creator_email || ownerInfo?.creatorEmail || createdBy;
  const isPublic = Boolean(recipe.isPublic ?? recipe.is_public ?? false);

  let rawIngredients = recipe.ingredients;
  if (typeof rawIngredients === 'string') {
    try { rawIngredients = JSON.parse(rawIngredients); } catch (_) { rawIngredients = [rawIngredients]; }
  }
  if (!Array.isArray(rawIngredients)) rawIngredients = [];

  let rawInstructions = recipe.instructions || recipe.directions || recipe.steps;
  if (typeof rawInstructions === 'string') {
    try { rawInstructions = JSON.parse(rawInstructions); } catch (_) { rawInstructions = [rawInstructions]; }
  }
  if (!Array.isArray(rawInstructions)) rawInstructions = [];

  const record: StoredRecipe = {
    id,
    ownership: { userId, createdBy, creatorName, creatorEmail },
    owner: { id: userId, name: creatorName, email: creatorEmail },
    ownerId: userId,
    ownerName: creatorName,
    ownerEmail: creatorEmail,
    userId,
    createdBy,
    creatorName,
    creatorEmail,
    isPublic,
    visibility: isPublic ? 'public' : 'private',
    title: recipe.title || recipe.name || 'Untitled Recipe',
    description: recipe.description || '',
    recipeType: recipe.recipeType || recipe.category || 'Main Dish',
    category: recipe.category || recipe.recipeType || 'Main Dish',
    cuisine: recipe.cuisine || '',
    servings: Number(recipe.servings) || 4,
    prepTimeMinutes: Number(recipe.prepTimeMinutes || recipe.prepMinutes || recipe.prep_time) || 15,
    cookTimeMinutes: Number(recipe.cookTimeMinutes || recipe.cookMinutes || recipe.cook_time) || 25,
    ingredients: rawIngredients,
    instructions: rawInstructions,
    directions: rawInstructions,
    nutrition: recipe.nutrition || {},
    imageUrl: recipe.imageUrl || recipe.image || recipe.image_url || '/recipes/images/default.jpg',
    image: recipe.image || recipe.imageUrl || recipe.image_url || '/recipes/images/default.jpg',
    sourceUrl: recipe.sourceUrl || recipe.source_url || '',
    isFavorite: Boolean(recipe.isFavorite ?? recipe.is_favorite),
    isCooked: Boolean(recipe.isCooked ?? recipe.is_cooked),
    rating: Number(recipe.rating) || 5,
    note: recipe.note || '',
    bookId: recipe.bookId || recipe.book_id || null,
    tags: Array.isArray(recipe.tags) ? recipe.tags : [recipe.recipeType || 'Main Dish'],
    createdAt: recipe.createdAt || recipe.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save to canonical apps/web/public/recipes/<id>.json
  const targetDir = getRecipeJsonDir();
  const filePath = path.join(targetDir, `${safeId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');

  return record;
}

export function loadAllRecipeJsonFiles(): StoredRecipe[] {
  const map = new Map<string, StoredRecipe>();
  const primaryDir = getRecipeJsonDir();
  const searchDirs = [primaryDir];

  // Also read from legacy directory if files still exist
  const root = process.cwd();
  const legacyDir = path.join(root, 'public', 'recipes');
  if (fs.existsSync(legacyDir) && path.resolve(legacyDir) !== path.resolve(primaryDir)) {
    searchDirs.push(legacyDir);
  }

  searchDirs.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.includes('index.json') && !f.startsWith('package'));
        files.forEach(f => {
          try {
            const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
            const data = JSON.parse(raw);
            if (data && (data.id || data.title)) {
              const id = data.id || f.replace('.json', '');
              if (!map.has(id)) {
                map.set(id, { ...data, id });
              }
            }
          } catch (_) {}
        });
      }
    } catch (_) {}
  });

  return Array.from(map.values());
}

export function updateRecipePublicVisibility(id: string, isPublic: boolean): boolean {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDir = getRecipeJsonDir();
  const filePath = path.join(targetDir, `${safeId}.json`);
  let updated = false;

  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data.isPublic = isPublic;
      data.visibility = isPublic ? 'public' : 'private';
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      updated = true;
    }
  } catch (_) {}

  return updated;
}

export function deleteRecipeJsonFile(id: string): void {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDir = getRecipeJsonDir();
  const filePath = path.join(targetDir, `${safeId}.json`);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}
