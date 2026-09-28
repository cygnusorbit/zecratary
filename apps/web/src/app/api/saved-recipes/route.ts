import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTableColumns(): Promise<Set<string>> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS saved_recipes (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        title TEXT NOT NULL,
        description TEXT,
        recipe_type VARCHAR(100),
        category VARCHAR(100),
        cuisine VARCHAR(100),
        prep_time VARCHAR(50),
        cook_time VARCHAR(50),
        prep_time_minutes INTEGER DEFAULT 15,
        cook_time_minutes INTEGER DEFAULT 10,
        servings VARCHAR(50) DEFAULT '4',
        difficulty VARCHAR(50),
        ingredients JSONB DEFAULT '[]'::jsonb,
        directions JSONB DEFAULT '[]'::jsonb,
        instructions JSONB DEFAULT '[]'::jsonb,
        nutrition JSONB DEFAULT '{}'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        image TEXT,
        image_url TEXT,
        is_favorite BOOLEAN DEFAULT FALSE,
        is_cooked BOOLEAN DEFAULT FALSE,
        rating INTEGER DEFAULT 0,
        note TEXT DEFAULT '',
        book_id VARCHAR(255),
        source_url TEXT DEFAULT '',
        created_by VARCHAR(255),
        creator_name VARCHAR(255),
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const migrations = [
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS instructions JSONB DEFAULT \'[]\'::jsonb;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS directions JSONB DEFAULT \'[]\'::jsonb;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT \'[]\'::jsonb;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS nutrition JSONB DEFAULT \'{}\'::jsonb;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT \'[]\'::jsonb;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS image TEXT;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS image_url TEXT;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_cooked BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS note TEXT DEFAULT \'\';',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_id VARCHAR(255);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT \'\';',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS creator_name VARCHAR(255);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 15;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER DEFAULT 10;',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS category VARCHAR(100);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS recipe_type VARCHAR(100);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS cuisine VARCHAR(100);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS servings VARCHAR(50) DEFAULT \'4\';',
      'ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;'
    ];

    for (const sql of migrations) {
      try {
        await query(sql);
      } catch (_) {}
    }

    try {
      await query(`
        UPDATE saved_recipes 
        SET image = image_url 
        WHERE (image IS NULL OR image = '') AND (image_url IS NOT NULL AND image_url != '');

        UPDATE saved_recipes 
        SET image_url = image 
        WHERE (image_url IS NULL OR image_url = '') AND (image IS NOT NULL AND image != '');
      `);
    } catch (_) {}

    try {
      await query(`
        INSERT INTO users (id, email, name, updated_at)
        VALUES ('usr_admin_1', 'admin@zecratary.local', 'Admin', NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch (_) {}
  } catch (e) {
    console.warn('[saved_recipes:ensureTableColumns] Warning:', e);
  }

  try {
    const colRows = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'saved_recipes'
    `);
    return new Set(colRows.map((r: any) => String(r.column_name).toLowerCase()));
  } catch (_) {
    return new Set();
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTableColumns();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let rows: any[];
    if (userId) {
      rows = await query(`
        SELECT * FROM saved_recipes 
        WHERE user_id = $1 OR is_public = TRUE 
        ORDER BY created_at DESC
      `, [userId]);
    } else {
      rows = await query(`
        SELECT * FROM saved_recipes 
        ORDER BY created_at DESC
      `);
    }

    const mapped = (rows || []).map((r: any) => {
      const img = r.image || r.image_url || r.imageUrl || '';
      const rawSteps = r.instructions || r.directions || [];
      const safeSteps = Array.isArray(rawSteps)
        ? rawSteps
        : (typeof rawSteps === 'string' ? (() => { try { return JSON.parse(rawSteps); } catch { return [rawSteps]; } })() : []);
      const rawIng = r.ingredients || [];
      const safeIng = Array.isArray(rawIng)
        ? rawIng
        : (typeof rawIng === 'string' ? (() => { try { return JSON.parse(rawIng); } catch { return [rawIng]; } })() : []);

      return {
        ...r,
        image: img,
        image_url: img,
        imageUrl: img,
        instructions: safeSteps,
        directions: safeSteps,
        ingredients: safeIng
      };
    });

    return NextResponse.json(
      { success: true, recipes: mapped },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const existingCols = await ensureTableColumns();
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.recipes || [body.recipe || body]);

    for (const item of items) {
      if (!item || !item.id) continue;
      const id = item.id;

      let validUserId = 'usr_admin_1';
      const candidateUserId = String(item.userId || item.user_id || '').trim();
      if (candidateUserId) {
        try {
          const userCheck = await query('SELECT id FROM users WHERE id = $1', [candidateUserId]);
          if (userCheck && userCheck.length > 0) {
            validUserId = candidateUserId;
          } else {
            await query(
              'INSERT INTO users (id, email, name, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (id) DO NOTHING',
              [candidateUserId, item.createdBy || item.email || candidateUserId, item.creatorName || 'User']
            );
            validUserId = candidateUserId;
          }
        } catch (_) {
          validUserId = 'usr_admin_1';
        }
      }

      const safeIngredients = Array.isArray(item.ingredients)
        ? item.ingredients
        : (typeof item.ingredients === 'string' ? (() => { try { return JSON.parse(item.ingredients); } catch { return [item.ingredients]; } })() : []);

      const safeInstructions = Array.isArray(item.instructions)
        ? item.instructions
        : (Array.isArray(item.directions) ? item.directions : (typeof item.instructions === 'string' ? [item.instructions] : []));

      const safeTags = Array.isArray(item.tags) ? item.tags : [];
      const safeNutrition = (item.nutrition && typeof item.nutrition === 'object') ? item.nutrition : {};

      const prepMinutes = Number(item.prepTimeMinutes || item.prep_time_minutes) || (parseInt(item.prepTime) || 15);
      const cookMinutes = Number(item.cookTimeMinutes || item.cook_time_minutes) || (parseInt(item.cookTime) || 10);
      const recipeType = item.recipeType || item.category || 'Main Dish';
      const resolvedImg = item.imageUrl || item.image || item.image_url || '';

      const columnData: { col: string; val: any; isJson?: boolean }[] = [
        { col: 'id', val: id },
        { col: 'user_id', val: validUserId },
        { col: 'title', val: item.title || item.name || 'Untitled Recipe' },
        { col: 'description', val: item.description || '' },
        { col: 'recipe_type', val: recipeType },
        { col: 'category', val: recipeType },
        { col: 'cuisine', val: item.cuisine || '' },
        { col: 'prep_time', val: String(prepMinutes) + 'm' },
        { col: 'cook_time', val: String(cookMinutes) + 'm' },
        { col: 'prep_time_minutes', val: prepMinutes },
        { col: 'cook_time_minutes', val: cookMinutes },
        { col: 'servings', val: String(item.servings || '4') },
        { col: 'difficulty', val: item.difficulty || '' },
        { col: 'ingredients', val: JSON.stringify(safeIngredients), isJson: true },
        { col: 'directions', val: JSON.stringify(safeInstructions), isJson: true },
        { col: 'instructions', val: JSON.stringify(safeInstructions), isJson: true },
        { col: 'nutrition', val: JSON.stringify(safeNutrition), isJson: true },
        { col: 'tags', val: JSON.stringify(safeTags), isJson: true },
        { col: 'image', val: resolvedImg },
        { col: 'image_url', val: resolvedImg },
        { col: 'is_favorite', val: Boolean(item.isFavorite ?? item.is_favorite) },
        { col: 'is_cooked', val: Boolean(item.isCooked ?? item.is_cooked) },
        { col: 'rating', val: Number(item.rating) || 0 },
        { col: 'note', val: item.note || '' },
        { col: 'book_id', val: item.bookId || item.book_id || null },
        { col: 'source_url', val: item.sourceUrl || item.source_url || '' },
        { col: 'created_by', val: item.createdBy || item.created_by || validUserId },
        { col: 'creator_name', val: item.creatorName || item.creator_name || 'You' },
        { col: 'is_public', val: Boolean(item.isPublic ?? item.is_public) }
      ];

      // Dynamically filter only columns that physically exist in the PostgreSQL table
      const validEntries = columnData.filter(entry => existingCols.size === 0 || existingCols.has(entry.col));

      const colNames: string[] = [];
      const placeholders: string[] = [];
      const values: any[] = [];
      const updateClauses: string[] = [];

      validEntries.forEach((entry) => {
        colNames.push(entry.col);
        values.push(entry.val);
        const idx = values.length;
        placeholders.push(entry.isJson ? `$${idx}::jsonb` : `$${idx}`);

        if (entry.col !== 'id') {
          if (entry.col === 'image') {
            updateClauses.push(`image = COALESCE(NULLIF(EXCLUDED.image, ''), saved_recipes.image, EXCLUDED.image_url)`);
          } else if (entry.col === 'image_url') {
            updateClauses.push(`image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), saved_recipes.image_url, EXCLUDED.image)`);
          } else if (entry.isJson) {
            updateClauses.push(`${entry.col} = CASE WHEN EXCLUDED.${entry.col} IS NOT NULL AND EXCLUDED.${entry.col} != '[]'::jsonb AND EXCLUDED.${entry.col} != '{}'::jsonb THEN EXCLUDED.${entry.col} ELSE saved_recipes.${entry.col} END`);
          } else if (['title', 'description', 'recipe_type', 'category', 'cuisine', 'servings', 'difficulty', 'source_url', 'created_by', 'creator_name'].includes(entry.col)) {
            updateClauses.push(`${entry.col} = COALESCE(NULLIF(EXCLUDED.${entry.col}, ''), saved_recipes.${entry.col})`);
          } else {
            updateClauses.push(`${entry.col} = EXCLUDED.${entry.col}`);
          }
        }
      });

      if (existingCols.size === 0 || existingCols.has('updated_at')) {
        colNames.push('updated_at');
        placeholders.push('NOW()');
        updateClauses.push('updated_at = NOW()');
      }

      const sql = `
        INSERT INTO saved_recipes (${colNames.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT (id) DO UPDATE SET
          ${updateClauses.join(',\n          ')};
      `;

      await query(sql, values);
    }

    return NextResponse.json({ success: true, message: 'Recipe(s) persisted to PostgreSQL.' });
  } catch (err: any) {
    console.error('[saved_recipes:POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTableColumns();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 });
    }

    await query('DELETE FROM saved_recipes WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Recipe removed from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
