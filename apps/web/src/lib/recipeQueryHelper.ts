// Universal Multi-Dialect Recipe Query Layer (PostgreSQL & MySQL)
// Resolves Column Inconsistencies (prep_minutes vs prep_time_minutes)
import { query, getDatabaseDialect } from '@/lib/db';

export interface NormalizedRecipe {
  id: string;
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  imageUrl: string;
  category?: string;
  sourceUrl?: string;
}

export async function fetchNormalizedSavedRecipes(limit: number = 50): Promise<NormalizedRecipe[]> {
  try {
    const dialect = getDatabaseDialect();
    
    const checkSql = dialect === 'postgres'
      ? "SELECT to_regclass('public.saved_recipes') AS tbl_exists"
      : "SHOW TABLES LIKE 'saved_recipes'";
    const checkRes = await query(checkSql);
    if (!checkRes || checkRes.length === 0 || (dialect === 'postgres' && !checkRes[0].tbl_exists)) {
      return [];
    }

    const sql = `
      SELECT 
        id, 
        COALESCE(title, 'Untitled Recipe') AS title, 
        COALESCE(description, '') AS description,
        COALESCE(prep_minutes, prep_time_minutes, 15) AS prep_minutes,
        COALESCE(cook_minutes, cook_time_minutes, 20) AS cook_minutes,
        COALESCE(servings, 2) AS servings,
        ingredients,
        instructions,
        COALESCE(image_url, '') AS image_url
      FROM saved_recipes 
      ORDER BY id DESC 
      LIMIT $1
    `;
    
    const rows = await query(sql, [limit]);
    if (!Array.isArray(rows)) return [];

    return rows.map((r: any) => {
      let parsedIngredients: string[] = [];
      let parsedInstructions: string[] = [];

      try {
        parsedIngredients = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || []);
      } catch (_) {
        parsedIngredients = Array.isArray(r.ingredients) ? r.ingredients : [];
      }

      try {
        parsedInstructions = typeof r.instructions === 'string' ? JSON.parse(r.instructions) : (r.instructions || []);
      } catch (_) {
        parsedInstructions = Array.isArray(r.instructions) ? r.instructions : [];
      }

      return {
        id: String(r.id),
        title: r.title || 'Untitled Recipe',
        description: r.description || '',
        prepMinutes: Number(r.prep_minutes) || 15,
        cookMinutes: Number(r.cook_minutes) || 20,
        servings: Number(r.servings) || 2,
        ingredients: parsedIngredients,
        instructions: parsedInstructions,
        imageUrl: r.image_url || ''
      };
    });
  } catch (err) {
    console.warn('[recipeQueryHelper] Fallback: Could not query saved_recipes table safely', err);
    return [];
  }
}
