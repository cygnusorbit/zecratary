import fs from 'fs';
import path from 'path';

export interface RecipeOwner {
  id: string;
  name: string;
  email: string;
}

export interface StoredRecipe {
  id: string;
  owner: RecipeOwner;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  userId: string;
  userEmail: string;
  createdBy: string;
  creatorName: string;
  isPublic: boolean;
  visibility: 'public' | 'private';
  title: string;
  description?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  calories?: number;
  recipeType?: string;
  mealType?: string;
  cuisine?: string;
  ingredients: any[];
  instructions: any[];
  nutrition?: any;
  tags?: string[];
  image?: string;
  imageUrl?: string;
  sourceUrl?: string;
  isFavorite?: boolean;
  isCooked?: boolean;
  rating?: number;
  bookId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const getStorageDirs = (): string[] => {
  const root = process.cwd();
  return [
    path.join(root, 'recipes'),
    path.join(root, 'apps', 'web', 'recipes'),
    path.join(root, 'public', 'recipes'),
    path.join(root, 'apps', 'web', 'public', 'recipes')
  ];
};

export function saveRecipeToJsonFile(recipe: any, owner?: Partial<RecipeOwner>): StoredRecipe {
  const id = recipe.id || 'rec_' + Date.now();
  const ownerId = recipe.ownerId || recipe.userId || recipe.user_id || owner?.id || 'guest';
  const ownerName = recipe.ownerName || recipe.creatorName || recipe.creator_name || owner?.name || 'Chef';
  const ownerEmail = recipe.ownerEmail || recipe.userEmail || recipe.creator_email || owner?.email || `${ownerId}@zecratary.local`;
  const isPublic = Boolean(recipe.isPublic ?? recipe.is_public ?? false);

  const stored: StoredRecipe = {
    id,
    owner: {
      id: ownerId,
      name: ownerName,
      email: ownerEmail
    },
    ownerId,
    ownerName,
    ownerEmail,
    userId: ownerId,
    userEmail: ownerEmail,
    createdBy: ownerEmail,
    creatorName: ownerName,
    isPublic,
    visibility: isPublic ? 'public' : 'private',
    title: recipe.title || recipe.name || 'Untitled Recipe',
    description: recipe.description || '',
    prepMinutes: Number(recipe.prepMinutes || recipe.prepTimeMinutes || recipe.prep_time) || 15,
    cookMinutes: Number(recipe.cookMinutes || recipe.cookTimeMinutes || recipe.cook_time) || 25,
    servings: Number(recipe.servings) || 4,
    calories: recipe.calories ? Number(recipe.calories) : undefined,
    recipeType: recipe.recipeType || recipe.mealType || recipe.category || 'Main Dish',
    mealType: recipe.mealType || recipe.recipeType || recipe.category || 'Main Dish',
    cuisine: recipe.cuisine || '',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions || recipe.directions || recipe.steps) 
      ? (recipe.instructions || recipe.directions || recipe.steps) : [],
    nutrition: recipe.nutrition || {},
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    image: recipe.image || recipe.imageUrl || recipe.image_url || '/recipes/images/default.jpg',
    imageUrl: recipe.imageUrl || recipe.image || recipe.image_url || '/recipes/images/default.jpg',
    sourceUrl: recipe.sourceUrl || recipe.source_url || '',
    isFavorite: Boolean(recipe.isFavorite ?? recipe.is_favorite),
    isCooked: Boolean(recipe.isCooked ?? recipe.is_cooked),
    rating: Number(recipe.rating) || 0,
    bookId: recipe.bookId || recipe.book_id || null,
    createdAt: recipe.createdAt || recipe.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(stored, null, 2);

  getStorageDirs().forEach(dir => {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${id}.json`), jsonStr, 'utf-8');
    } catch (_) {}
  });

  return stored;
}

export function loadAllRecipeJsonFiles(): StoredRecipe[] {
  const map = new Map<string, StoredRecipe>();
  getStorageDirs().forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        files.forEach(f => {
          try {
            const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
            const data = JSON.parse(raw);
            if (data && data.id) {
              map.set(data.id, data);
            }
          } catch (_) {}
        });
      }
    } catch (_) {}
  });
  return Array.from(map.values());
}

export function updateRecipePublicVisibility(id: string, isPublic: boolean): boolean {
  let updated = false;
  getStorageDirs().forEach(dir => {
    try {
      const filePath = path.join(dir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        data.isPublic = isPublic;
        data.visibility = isPublic ? 'public' : 'private';
        data.updatedAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        updated = true;
      }
    } catch (_) {}
  });
  return updated;
}
