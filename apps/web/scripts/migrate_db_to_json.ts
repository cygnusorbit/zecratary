import fs from 'fs';
import path from 'path';
import { query } from '../src/lib/db';
import { saveRecipeJsonFile, saveRecipeImageLocally } from '../src/lib/recipeFiles';

async function runMigration() {
  console.log('🔄 Checking database for existing recipes to convert to JSON files...');
  
  let dbRows: any[] = [];
  try {
    const res = await query('SELECT * FROM saved_recipes ORDER BY created_at ASC;');
    dbRows = Array.isArray(res) ? res : (res?.rows || []);
  } catch (err: any) {
    console.warn('⚠️ Notice querying saved_recipes:', err.message);
  }

  let standardRows: any[] = [];
  try {
    const res2 = await query('SELECT * FROM recipes ORDER BY created_at ASC;');
    standardRows = Array.isArray(res2) ? res2 : (res2?.rows || []);
  } catch (_) {}

  const allRows = [...dbRows, ...standardRows];
  console.log(`📊 Found ${allRows.length} recipe rows in database.`);

  if (allRows.length > 0) {
    // 1. Create a safe backup in data/recipes_db_backup.json
    const backupPath = path.join(process.cwd(), 'data', 'recipes_db_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(allRows, null, 2), 'utf-8');
    console.log(`💾 Backed up ${allRows.length} database recipes to ${backupPath}`);

    // 2. Convert each database recipe to a standalone JSON file in /recipes
    for (const r of allRows) {
      const id = r.id || `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let ingredients = r.ingredients;
      if (typeof ingredients === 'string') {
        try { ingredients = JSON.parse(ingredients); } catch (_) { ingredients = [ingredients]; }
      }
      if (!Array.isArray(ingredients)) ingredients = [];

      let instructions = r.directions || r.instructions;
      if (typeof instructions === 'string') {
        try { instructions = JSON.parse(instructions); } catch (_) { instructions = [instructions]; }
      }
      if (!Array.isArray(instructions)) instructions = [];

      const rawImage = r.image_url || r.imageUrl || r.image || '/recipes/images/default.jpg';
      let localImage = rawImage;
      try {
        localImage = await saveRecipeImageLocally(id, rawImage);
      } catch (_) {}

      const userId = r.user_id || r.userId || 'usr_admin_1';
      const createdBy = r.created_by || r.createdBy || `${userId}@zecratary.local`;
      const creatorName = r.creator_name || r.creatorName || 'Chef';
      const creatorEmail = r.creator_email || r.creatorEmail || createdBy;

      const fullRecord = {
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
        title: r.title || r.name || 'Untitled Recipe',
        description: r.description || '',
        recipeType: r.recipe_type || r.recipeType || r.category || 'Main Dish',
        category: r.category || r.recipe_type || r.recipeType || 'Main Dish',
        cuisine: r.cuisine || '',
        servings: Number(r.servings) || 4,
        prepTimeMinutes: Number(r.prep_time || r.prepMinutes || r.prepTimeMinutes) || 15,
        cookTimeMinutes: Number(r.cook_time || r.cookMinutes || r.cookTimeMinutes) || 25,
        ingredients,
        instructions,
        directions: instructions,
        imageUrl: localImage,
        image: localImage,
        image_url: localImage,
        sourceUrl: r.source_url || r.sourceUrl || '',
        isPublic: Boolean(r.is_public ?? r.isPublic ?? false),
        isFavorite: Boolean(r.is_favorite ?? r.isFavorite ?? false),
        isCooked: Boolean(r.is_cooked ?? r.isCooked ?? false),
        rating: Number(r.rating) || 5,
        note: r.note || '',
        bookId: r.book_id || r.bookId || null,
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveRecipeJsonFile(fullRecord);
      console.log(`✓ Converted recipe to JSON: ${id} ("${fullRecord.title}")`);
    }

    // 3. Remove/delete recipes from database tables so JSON files are the single source of truth
    try {
      await query('DELETE FROM saved_recipes;');
      console.log('🗑️ Successfully removed converted recipes from saved_recipes table.');
    } catch (err: any) {
      console.warn('Notice removing from saved_recipes:', err.message);
    }

    try {
      await query('DELETE FROM recipes;');
      console.log('🗑️ Successfully removed converted recipes from recipes table.');
    } catch (_) {}
  } else {
    console.log('ℹ️ No database rows needed conversion. JSON filesystem is already authoritative.');
  }

  console.log('✨ Migration to dedicated JSON files complete!');
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(0);
});
