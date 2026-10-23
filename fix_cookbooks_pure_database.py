import os
import sys
import json
import shutil
import subprocess

print("==================================================================")
print("🚀 ZECRATARY: Restoring Cookbooks (100% Pure PostgreSQL Storage)")
print("   Repository: cygnusorbit/zecratary (GitHub)")
print("==================================================================\n")

# ----------------------------------------------------------------------
# 1. Direct PostgreSQL DDL & Cookbook Seeding (No LocalStorage)
# ----------------------------------------------------------------------
db_seed_script = r'''const path = require('path');
const fs = require('fs');

['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'].forEach(f => {
  const full = path.join(process.cwd(), f);
  if (fs.existsSync(full)) {
    fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
});

const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Cannot run migration: DATABASE_URL is missing or contains placeholder password.');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const cleanConnStr = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: cleanConnStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const DEFAULT_COOKBOOKS = [
  {
    id: 'book_gourmet_dinners',
    user_id: 'usr_admin_1',
    created_by: 'admin@zecratary.com',
    creator_name: 'Executive Chef',
    title: 'Gourmet Weeknight Dinners',
    description: 'Elevated dinner entrees and chef-curated culinary staples crafted for sophisticated evening dining.',
    cover_color: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600',
    recipe_ids: ['rec_pasta_truffle', 'rec_crispy_chicken_thighs']
  },
  {
    id: 'book_healthy_prep',
    user_id: 'usr_admin_1',
    created_by: 'admin@zecratary.com',
    creator_name: 'Nutrition Specialist',
    title: 'Healthy Meal Prep & Bowls',
    description: 'High-protein, micronutrient-dense grain bowls, lean proteins, and macro-balanced meal prep staples.',
    cover_color: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600',
    recipe_ids: ['rec_citrus_salmon', 'rec_med_quinoa_bowl']
  },
  {
    id: 'book_weekend_baking',
    user_id: 'usr_admin_1',
    created_by: 'admin@zecratary.com',
    creator_name: 'Pastry Chef',
    title: 'Artisanal Baking & Desserts',
    description: 'Rustic sourdough breads, laminated French pastries, handcrafted tarts, and decadent confectionery.',
    cover_color: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
    recipe_ids: []
  },
  {
    id: 'book_quick_bites',
    user_id: 'usr_admin_1',
    created_by: 'admin@zecratary.com',
    creator_name: 'Sous Chef',
    title: 'Fast & Easy 15-Minute Meals',
    description: 'Speedy, high-flavor lunches and flash-seared dinners designed for busy culinary schedules.',
    cover_color: 'bg-gradient-to-r from-pink-600 via-rose-500 to-red-600',
    recipe_ids: []
  }
];

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('🐘 Connected to Supabase PostgreSQL. Verifying recipe_books & saved_recipes schema...');

    // 1. Ensure table schema and indexes
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipe_books (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT 'usr_admin_1',
        created_by VARCHAR(255) DEFAULT 'admin@zecratary.com',
        creator_name VARCHAR(255) DEFAULT 'Chef',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_color VARCHAR(255) DEFAULT 'bg-gradient-to-r from-emerald-600 to-teal-600',
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_recipe_books_user_id ON recipe_books(user_id);

      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_id VARCHAR(128);
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS directions JSONB DEFAULT '[]'::jsonb;
    `);

    // 2. Seed Default Cookbooks into PostgreSQL
    for (const b of DEFAULT_COOKBOOKS) {
      await client.query(`
        INSERT INTO recipe_books (id, user_id, created_by, creator_name, title, description, cover_color, recipe_ids, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_color = EXCLUDED.cover_color,
          updated_at = NOW();
      `, [b.id, b.user_id, b.created_by, b.creator_name, b.title, b.description, b.cover_color, JSON.stringify(b.recipe_ids)]);
    }
    console.log('  ✅ Seeded 4 permanent cookbooks into recipe_books table in PostgreSQL.');

    // 3. Backfill book_id onto existing saved_recipes
    await client.query(`
      UPDATE saved_recipes SET book_id = 'book_gourmet_dinners' WHERE id IN ('rec_pasta_truffle', 'rec_crispy_chicken_thighs');
      UPDATE saved_recipes SET book_id = 'book_healthy_prep' WHERE id IN ('rec_citrus_salmon', 'rec_med_quinoa_bowl');
    `);
    console.log('  ✅ Associated existing saved_recipes with book_id in PostgreSQL.');

    // 4. Verify count
    const countRes = await client.query('SELECT COUNT(*) as count FROM recipe_books;');
    console.log(`\n🎉 Verification: ${countRes.rows[0].count} cookbooks are permanently stored in PostgreSQL.`);

  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch(err => {
  console.error('❌ Database seed error:', err.message);
  process.exit(1);
});
'''

tmp_seed = os.path.join(os.getcwd(), 'scripts', 'temp_seed_cookbooks.js')
os.makedirs(os.path.dirname(tmp_seed), exist_ok=True)
with open(tmp_seed, 'w', encoding='utf-8') as f:
    f.write(db_seed_script)

seed_res = subprocess.run(['node', tmp_seed])
if os.path.exists(tmp_seed):
    os.remove(tmp_seed)

if seed_res.returncode != 0:
    print("❌ Database seeding failed.")
    sys.exit(1)

# ----------------------------------------------------------------------
# 2. Update /api/books/route.ts and /api/recipe-books/route.ts
# ----------------------------------------------------------------------
api_books_code = r'''import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureBooksTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS recipe_books (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT 'usr_admin_1',
        created_by VARCHAR(255) DEFAULT 'admin@zecratary.com',
        creator_name VARCHAR(255) DEFAULT 'Chef',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_color VARCHAR(255) DEFAULT 'bg-gradient-to-r from-emerald-600 to-teal-600',
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_id VARCHAR(128);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureBooksTable();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');

    let sql = 'SELECT * FROM recipe_books';
    const params: any[] = [];

    // Return user-owned cookbooks plus default/admin cookbooks
    if (userId && userId !== 'all') {
      sql += ' WHERE user_id = $1 OR created_by = $1 OR user_id = \'usr_admin_1\' OR user_id IS NULL OR user_id = \'\'';
      params.push(userId);
    }
    sql += ' ORDER BY created_at ASC;';

    const books = await query(sql, params);

    // Compute live recipe counts directly from PostgreSQL saved_recipes
    const countMap: Record<string, number> = {};
    try {
      const countRows = await query(`
        SELECT book_id, COUNT(*) as count 
        FROM saved_recipes 
        WHERE book_id IS NOT NULL AND book_id != ''
        GROUP BY book_id;
      `);
      countRows.forEach((r: any) => {
        countMap[r.book_id] = Number(r.count) || 0;
      });
    } catch (_) {}

    const formatted = books.map((b: any) => {
      const recipeIdsArray = Array.isArray(b.recipe_ids)
        ? b.recipe_ids
        : (typeof b.recipe_ids === 'string' ? JSON.parse(b.recipe_ids || '[]') : []);

      const actualCount = countMap[b.id] !== undefined ? countMap[b.id] : recipeIdsArray.length;

      return {
        id: b.id,
        userId: b.user_id || 'usr_admin_1',
        user_id: b.user_id || 'usr_admin_1',
        createdBy: b.created_by || '',
        creatorName: b.creator_name || 'Chef',
        title: b.title || 'Untitled Cookbook',
        description: b.description || '',
        coverColor: b.cover_color || 'bg-gradient-to-r from-emerald-600 to-teal-600',
        cover_color: b.cover_color || 'bg-gradient-to-r from-emerald-600 to-teal-600',
        recipeIds: recipeIdsArray,
        recipe_ids: recipeIdsArray,
        recipeCount: actualCount,
        created_at: b.created_at,
        updated_at: b.updated_at,
      };
    });

    return NextResponse.json(
      { success: true, books: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Error in GET /api/books:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureBooksTable();
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.books || [body.book || body]);

    for (const b of items) {
      if (!b || !b.id || !b.title) continue;
      const targetUserId = b.userId || b.user_id || 'usr_admin_1';
      const title = b.title.trim();
      const desc = b.description || '';
      const color = b.coverColor || b.cover_color || 'bg-gradient-to-r from-emerald-600 to-teal-600';
      const recipeIds = JSON.stringify(Array.isArray(b.recipeIds) ? b.recipeIds : (Array.isArray(b.recipe_ids) ? b.recipe_ids : []));

      await query(`
        INSERT INTO recipe_books (
          id, user_id, created_by, creator_name, title, description, cover_color, recipe_ids, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_color = EXCLUDED.cover_color,
          recipe_ids = EXCLUDED.recipe_ids,
          updated_at = NOW();
      `, [
        b.id,
        targetUserId,
        b.createdBy || b.created_by || 'admin@zecratary.com',
        b.creatorName || b.creator_name || 'Chef',
        title,
        desc,
        color,
        recipeIds
      ]);
    }

    return NextResponse.json({ success: true, message: 'Cookbook saved in PostgreSQL' });
  } catch (err: any) {
    console.error('Error in POST /api/books:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureBooksTable();
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Book ID is required' }, { status: 400 });
    }

    const cleanId = id.trim();
    await query('DELETE FROM recipe_books WHERE id = $1;', [cleanId]);
    await query('UPDATE saved_recipes SET book_id = NULL WHERE book_id = $1;', [cleanId]);

    return NextResponse.json({ success: true, message: 'Cookbook deleted from PostgreSQL' });
  } catch (err: any) {
    console.error('Error in DELETE /api/books:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
'''

for rel_p in [
    'apps/web/src/app/api/books/route.ts',
    'src/app/api/books/route.ts',
    'apps/web/src/app/api/recipe-books/route.ts',
    'src/app/api/recipe-books/route.ts'
]:
    target = os.path.join(os.getcwd(), rel_p)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, 'w', encoding='utf-8') as f:
        f.write(api_books_code)
    print(f"✓ Provisioned pure PostgreSQL books API: {rel_p}")

# ----------------------------------------------------------------------
# 3. Update /api/recipes/saved/route.ts with book_id Support
# ----------------------------------------------------------------------
api_saved_code = r'''import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || url.searchParams.get('user_id');

  try {
    let sql = `
      SELECT * FROM saved_recipes 
      ORDER BY created_at DESC;
    `;
    let params: any[] = [];

    if (userId && userId !== 'all') {
      sql = `
        SELECT * FROM saved_recipes 
        WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL OR user_id = ''
        ORDER BY created_at DESC;
      `;
      params = [userId];
    }

    const rows: any = await query(sql, params);
    const list = Array.isArray(rows) ? rows : (rows?.rows || []);

    const sanitized = list.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      user_id: r.user_id,
      bookId: r.book_id || null,
      book_id: r.book_id || null,
      title: r.title,
      description: r.description || '',
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : (typeof r.ingredients === 'string' ? JSON.parse(r.ingredients || '[]') : []),
      instructions: Array.isArray(r.directions) ? r.directions : (Array.isArray(r.instructions) ? r.instructions : (typeof r.instructions === 'string' ? JSON.parse(r.instructions || '[]') : [])),
      directions: Array.isArray(r.directions) ? r.directions : (Array.isArray(r.instructions) ? r.instructions : []),
      prep_time: r.prep_time || '15m',
      cook_time: r.cook_time || '20m',
      servings: r.servings || '4',
      image: r.image || r.image_url || '',
      imageUrl: r.image || r.image_url || '',
      is_favorite: Boolean(r.is_favorite),
      isFavorite: Boolean(r.is_favorite),
      is_cooked: Boolean(r.is_cooked),
      isCooked: Boolean(r.is_cooked),
      tags: Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : []),
      source_url: r.source_url || '',
      sourceUrl: r.source_url || '',
      created_at: r.created_at,
    }));

    return NextResponse.json(
      { success: true, recipes: sanitized },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Error in GET /api/recipes/saved:', err.message);
    return NextResponse.json(
      { success: true, recipes: [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    for (const r of items) {
      const recId = r.id || ('rec_' + Date.now().toString(36));
      const userId = r.userId || r.user_id || 'usr_admin_1';
      const bookId = r.bookId || r.book_id || null;
      const title = r.title || 'Untitled Recipe';
      const desc = r.description || '';
      const ingredients = JSON.stringify(Array.isArray(r.ingredients) ? r.ingredients : []);
      const directions = JSON.stringify(Array.isArray(r.directions) ? r.directions : (Array.isArray(r.instructions) ? r.instructions : []));
      const prepTime = r.prep_time || r.prepTime || '15m';
      const cookTime = r.cook_time || r.cookTime || '20m';
      const servings = String(r.servings || '4');
      const img = r.image || r.imageUrl || r.image_url || '';
      const isFav = Boolean(r.is_favorite ?? r.isFavorite);
      const isCooked = Boolean(r.is_cooked ?? r.isCooked);
      const tags = JSON.stringify(Array.isArray(r.tags) ? r.tags : []);
      const sourceUrl = r.source_url || r.sourceUrl || '';

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, book_id, title, description, ingredients, instructions, directions,
          prep_time, cook_time, servings, image, image_url, is_favorite, is_cooked,
          tags, source_url, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, NOW())
        ON CONFLICT (id) DO UPDATE SET
          book_id = EXCLUDED.book_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          instructions = EXCLUDED.instructions,
          directions = EXCLUDED.directions,
          prep_time = EXCLUDED.prep_time,
          cook_time = EXCLUDED.cook_time,
          servings = EXCLUDED.servings,
          image = EXCLUDED.image,
          image_url = EXCLUDED.image_url,
          is_favorite = EXCLUDED.is_favorite,
          is_cooked = EXCLUDED.is_cooked,
          tags = EXCLUDED.tags,
          updated_at = NOW();
      `, [
        recId, userId, bookId, title, desc, ingredients, directions, directions,
        prepTime, cookTime, servings, img, img, isFav, isCooked, tags, sourceUrl
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in POST /api/recipes/saved:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
'''

for rel_api in [
    'apps/web/src/app/api/recipes/saved/route.ts',
    'src/app/api/recipes/saved/route.ts',
    'apps/web/src/app/api/saved-recipes/route.ts',
    'src/app/api/saved-recipes/route.ts'
]:
    target = os.path.join(os.getcwd(), rel_api)
    if os.path.exists(os.path.dirname(target)):
        with open(target, 'w', encoding='utf-8') as f:
            f.write(api_saved_code)
        print(f"✓ Updated recipe API route with book_id: {rel_api}")

# ----------------------------------------------------------------------
# 4. Pure Database apps/web/src/app/books/page.tsx (NO LocalStorage)
# ----------------------------------------------------------------------
books_page_code = r''''use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Book, Plus, Trash2, Edit3, Search, Clock, Users, Star, 
  ExternalLink, ArrowLeft, ChevronRight, X, Sparkles, BookOpen, 
  LayoutGrid, Grid3X3, Rows3, Check 
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser, User } from '@/lib/auth';

interface RecipeBook {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  description: string;
  coverColor?: string;
  cover_color?: string;
  recipeCount?: number;
  recipeIds?: string[];
  recipe_ids?: string[];
  created_at?: string;
}

const COLOR_PRESETS = [
  { label: 'Emerald Teal', value: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600' },
  { label: 'Sapphire Indigo', value: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600' },
  { label: 'Sunset Amber', value: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500' },
  { label: 'Ruby Crimson', value: 'bg-gradient-to-r from-pink-600 via-rose-500 to-red-600' },
  { label: 'Royal Amethyst', value: 'bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600' },
  { label: 'Charcoal Slate', value: 'bg-gradient-to-r from-slate-700 via-gray-800 to-zinc-900' },
];

export const isRecipeInBook = (rec: any, bookId: string, book?: any): boolean => {
  if (!rec || !bookId) return false;
  if (rec.bookId === bookId || rec.book_id === bookId) return true;
  if (book) {
    const ids = book.recipe_ids || book.recipeIds;
    if (Array.isArray(ids) && ids.includes(rec.id)) return true;
  }
  return false;
};

export default function BooksPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [mounted, setMounted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<RecipeBook[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<RecipeBook | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalDescription, setModalDescription] = useState<string>('');
  const [modalColor, setModalColor] = useState<string>(COLOR_PRESETS[0].value);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Pure Database Hydration: Queries PostgreSQL Directly (NO LocalStorage)
  const loadData = useCallback(async (user?: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';

    try {
      // 1. Fetch live recipes directly from PostgreSQL
      const recRes = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(targetUserId)}`, { cache: 'no-store' });
      let loadedRecipes: any[] = [];
      if (recRes.ok) {
        const recData = await recRes.json();
        if (Array.isArray(recData.recipes)) {
          loadedRecipes = recData.recipes;
          setRecipes(loadedRecipes);
        }
      }

      // 2. Fetch live cookbooks directly from PostgreSQL
      const bRes = await fetch(`/api/books?userId=${encodeURIComponent(targetUserId)}`, { cache: 'no-store' });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData.books)) {
          // Compute live recipe counts dynamically from loadedRecipes
          const syncedBooks = bData.books.map((b: RecipeBook) => ({
            ...b,
            recipeCount: loadedRecipes.filter((r: any) => isRecipeInBook(r, b.id, b)).length,
          }));
          setBooks(syncedBooks);

          // Update active modal selected book if open
          if (selectedBook) {
            const refreshed = syncedBooks.find((sb: RecipeBook) => sb.id === selectedBook.id);
            if (refreshed) setSelectedBook(refreshed);
          }
        }
      }
    } catch (err) {
      console.error('[Books] Live database fetch error:', err);
    }
  }, [selectedBook]);

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    setCurrentUser(u);
    loadData(u);

    const handleSync = () => loadData(getCurrentUser());
    window.addEventListener('zecratary_recipe_books_updated', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('zecratary_recipe_books_updated', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [loadData]);

  // 2. Save / Update Cookbook directly in PostgreSQL
  const handleSaveBook = async () => {
    if (!modalTitle.trim()) return;
    setIsSubmitting(true);

    const targetUserId = currentUser?.id || 'usr_admin_1';
    const bookId = editingBookId || ('book_' + Date.now().toString(36));

    const payload = {
      id: bookId,
      userId: targetUserId,
      user_id: targetUserId,
      title: modalTitle.trim(),
      description: modalDescription.trim(),
      coverColor: modalColor,
      cover_color: modalColor,
      createdBy: currentUser?.email || 'admin@zecratary.com',
      creatorName: currentUser?.name || 'Chef',
    };

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setEditingBookId(null);
        setModalTitle('');
        setModalDescription('');
        await loadData(currentUser);
        window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
      }
    } catch (err) {
      console.error('Failed to save cookbook to PostgreSQL:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Cookbook directly from PostgreSQL
  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteBook', 'Are you sure you want to delete this cookbook? Assigned recipes will remain in your saved library.'))) {
      return;
    }

    try {
      const res = await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedBook?.id === id) setSelectedBook(null);
        await loadData(currentUser);
        window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
        window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      }
    } catch (err) {
      console.error('Error deleting cookbook from PostgreSQL:', err);
    }
  };

  // 4. Remove recipe from cookbook directly in PostgreSQL
  const handleRemoveRecipeFromBook = async (recipe: any) => {
    if (!selectedBook) return;
    try {
      const updatedRecipe = {
        ...recipe,
        book_id: null,
        bookId: null,
      };

      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecipe),
      });

      await loadData(currentUser);
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
    } catch (err) {
      console.error('Error removing recipe from cookbook in PostgreSQL:', err);
    }
  };

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [books, searchQuery]);

  const currentBookRecipes = useMemo(() => {
    if (!selectedBook) return [];
    return recipes.filter((r) => isRecipeInBook(r, selectedBook.id, selectedBook));
  }, [recipes, selectedBook]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            <Book className="h-4 w-4" />
            <span>{t('culinaryCollections', 'Culinary Collections')}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight pt-1" style={{ color: 'var(--color-text)' }}>
            {t('cookbooks', 'Cookbooks')}
          </h1>
          <p className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('cookbooksSubtitle', 'Curate, organize, and categorize your saved recipes into dedicated digital books permanently stored in PostgreSQL.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchCookbooks', 'Search books...')}
              className="pl-9 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-hidden"
              style={{
                backgroundColor: 'var(--colorIn the **Zecratary** Next.js 16 monorepo on GitHub (`cygnusorbit/zecratary`), cookbook data appeared missing or vanished across sessions because previous implementations fell back to browser storage (`localStorage`), the PostgreSQL database tables (`cookbooks` and `recipe_books`) lacked unified JSONB relationship columns (`recipe_ids`), and user ID query filters hid admin-seeded collections from guest or alternate user sessions.

---

### Issue, Solution & Architectural Suggestions

#### 1. What is the Issue?
* **Origin-Isolated Browser Storage Reliance (`localStorage`)**:
  * The cookbook views previously attempted to persist and read data from browser keys (e.g. `zecratary_cookbooks` or `custom_cookbooks`).
  * Because `localStorage` is strictly isolated per browser, per port, and per device, any cookbook created on `localhost:3000` never transferred to `https://zecratary.com`. Furthermore, opening an incognito tab or clearing site data purged all collections immediately.
* **Database Schema Absence & Disjointed API Routes (`cookbooks` vs `recipe_books`)**:
  * The codebase maintained two separate route directories: `/api/books` and `/api/recipe-books`.
  * When one endpoint queried the `cookbooks` table while another queried `recipe_books`, or when the table was missing from the PostgreSQL public schema, queries failed silently and returned empty arrays (`[]`), leaving the UI blank.
  * The database table lacked structured JSONB array columns (`recipe_ids JSONB DEFAULT '[]'::jsonb`) to link cookbooks to `saved_recipes` entries.
* **Overly Restrictive Ownership Scoping**:
  * Queries containing strict `WHERE user_id = $1` filters hid all platform-wide starter cookbooks and admin-seeded collections (`usr_admin_1`) when browsing as a guest or alternate authenticated user.

---

#### 2. What is the Solution?
* **100% Direct Database Persistence in PostgreSQL & MySQL (Constraint 8)**:
  * Remove all `localStorage` reads, writes, and fallbacks from the cookbook management views and API routes. All reads, creations, updates, recipe assignments, and deletions interact directly with PostgreSQL via `@/lib/db`.
* **Unified, Self-Healing Schema (`cookbooks` & `recipe_books`)**:
  * Execute non-blocking DDL to ensure both `cookbooks` and `recipe_books` tables exist with complete schemas:
    ```sql
    CREATE TABLE IF NOT EXISTS cookbooks (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) DEFAULT 'usr_admin_1',
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      cover_image TEXT,
      recipe_ids JSONB DEFAULT '[]'::jsonb,
      is_favorite BOOLEAN DEFAULT false,
      category VARCHAR(100) DEFAULT 'General',
      tags JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  * Mirror and synchronize existing rows between `recipe_books` and `cookbooks` so both `/api/books` and `/api/recipe-books` read the exact same data.
  * Seed starter culinary collections (e.g., "Family Favorites & Classics", "Mediterranean & Seafood", "Gourmet Weeknight Dinners") pre-linked to verified IDs from `saved_recipes`.
* **Broadened User Ownership & Inclusive Resolution**:
  * Allow `/api/books` and `/api/recipe-books` to return user-owned cookbooks alongside platform/admin-seeded collections (`WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL`).
* **Formless Accessible UI & Dynamic Theming (Constraints 4, 5, 6, 9)**:
  * Replace native `<form>` tags in `/books` and `/cookbooks` with accessible `<div>` containers and explicit keyboard listeners (`onKeyDown`) to prevent password manager autofill popups.
  * Bind all surfaces to CSS custom properties (`var(--color-bg)`, `var(--color-card)`, `var(--color-border)`, `var(--color-text)`, `var(--color-inner-dark)`) with smooth 200ms Day/Dark mode transitions.
  * Connect all interface labels to `useTranslation()`.

---

#### 3. Architectural Suggestions
* **Denormalized JSONB Recipe Arrays for Fast Ordering**: Storing recipe IDs within a JSONB array (`recipe_ids: ["rec_1", "rec_2"]`) allows instant reordering and batch assignment without expensive multi-table join overhead on high-traffic queries.
* **Use Cache-Busting API Fetches**: In `apps/web/src/app/books/page.tsx`, fetch using `cache: 'no-store'` and attach dynamic timestamps (`?t=${Date.now()}`) so mutations reflect immediately across all tabs without browser HTTP caching lag.

---

### Python Production Remediation Patch

Run this self-contained Python patch from your project root (`/Users/eddielee/Desktop/zecratary` on GitHub repository `cygnusorbit/zecratary`). It establishes the PostgreSQL schema, seeds starter cookbooks pre-linked to existing recipes, updates `/api/books`, `/api/recipe-books`, `/books`, and `/cookbooks` without any `localStorage` dependencies, verifies the local production build, and pushes the clean commit to GitHub `main`:

```bash
cat << 'EOF' > fix_cookbooks_database_persistence.py
import os
import sys
import json
import subprocess

print("==================================================================")
print("🚀 ZECRATARY: Restoring Cookbooks to Direct PostgreSQL Database")
print("   Repository: cygnusorbit/zecratary (GitHub)")
print("==================================================================\n")

# ----------------------------------------------------------------------
# 1. Direct PostgreSQL Migration & Seeding for Cookbooks (Constraint 8)
# ----------------------------------------------------------------------
db_sync_script = r'''const path = require('path');
const fs = require('fs');

['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'].forEach(f => {
  const full = path.join(process.cwd(), f);
  if (fs.existsSync(full)) {
    fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
});

const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Cannot run migration: DATABASE_URL is missing or contains placeholder password.');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const cleanConnStr = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: cleanConnStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🐘 Connected to Supabase PostgreSQL. Verifying cookbooks schema...');

    // 1. Create cookbooks and recipe_books tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS cookbooks (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'usr_admin_1',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_image TEXT,
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        is_favorite BOOLEAN DEFAULT false,
        category VARCHAR(100) DEFAULT 'General',
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recipe_books (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'usr_admin_1',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_image TEXT,
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        is_favorite BOOLEAN DEFAULT false,
        category VARCHAR(100) DEFAULT 'General',
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS recipe_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS cover_image TEXT;
      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) DEFAULT 'usr_admin_1';

      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS recipe_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS cover_image TEXT;
      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) DEFAULT 'usr_admin_1';
    `);

    // 2. Fetch existing saved recipe IDs to link with cookbooks
    const recRes = await client.query('SELECT id FROM saved_recipes ORDER BY created_at DESC LIMIT 10;');
    const recIds = recRes.rows.map(r => r.id);

    const defaultCookbooks = [
      {
        id: 'book_family_classics',
        user_id: 'usr_admin_1',
        title: 'Family Favorites & Classics',
        description: 'Time-honored gourmet dishes, slow-simmered comfort meals, and everyday family staples.',
        cover_image: '[https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80)',
        recipe_ids: recIds.slice(0, 3),
        is_favorite: true,
        category: 'Comfort Food',
        tags: ['Dinner', 'Family', 'Classics']
      },
      {
        id: 'book_med_seafood',
        user_id: 'usr_admin_1',
        title: 'Mediterranean & Coastal Seafood',
        description: 'Fresh grilled salmon, citrus marinades, vibrant grain bowls, and crisp garden salads.',
        cover_image: '[https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80)',
        recipe_ids: recIds.slice(1, 4),
        is_favorite: true,
        category: 'Healthy',
        tags: ['Seafood', 'Keto', 'Mediterranean']
      },
      {
        id: 'book_weeknight_quick',
        user_id: 'usr_admin_1',
        title: 'Gourmet Weeknight Dinners',
        description: 'Chef-quality recipes designed to prep in under 15 minutes with high nutritional macros.',
        cover_image: '[https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80)',
        recipe_ids: recIds.slice(0, 2),
        is_favorite: false,
        category: 'Quick & Easy',
        tags: ['Quick', 'High Protein', 'Weeknight']
      }
    ];

    // 3. Upsert default cookbooks into both tables
    for (const b of defaultCookbooks) {
      const recJson = JSON.stringify(b.recipe_ids);
      const tagsJson = JSON.stringify(b.tags);

      await client.query(`
        INSERT INTO cookbooks (id, user_id, title, description, cover_image, recipe_ids, is_favorite, category, tags, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_image = EXCLUDED.cover_image,
          recipe_ids = CASE WHEN cookbooks.recipe_ids IS NULL OR cookbooks.recipe_ids = '[]'::jsonb THEN EXCLUDED.recipe_ids ELSE cookbooks.recipe_ids END,
          is_favorite = EXCLUDED.is_favorite,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          updated_at = NOW();

        INSERT INTO recipe_books (id, user_id, title, description, cover_image, recipe_ids, is_favorite, category, tags, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_image = EXCLUDED.cover_image,
          recipe_ids = CASE WHEN recipe_books.recipe_ids IS NULL OR recipe_books.recipe_ids = '[]'::jsonb THEN EXCLUDED.recipe_ids ELSE recipe_books.recipe_ids END,
          is_favorite = EXCLUDED.is_favorite,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          updated_at = NOW();
      `, [b.id, b.user_id, b.title, b.description, b.cover_image, recJson, b.is_favorite, b.category, tagsJson]);
    }

    const countRes = await client.query('SELECT COUNT(*) AS count FROM cookbooks;');
    console.log(`✅ Cookbooks schema updated! Total active cookbooks in PostgreSQL: ${countRes.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
'''

tmp_mig = os.path.join(os.getcwd(), 'scripts', 'temp_heal_cookbooks.js')
os.makedirs(os.path.dirname(tmp_mig), exist_ok=True)
with open(tmp_mig, 'w', encoding='utf-8') as f:
    f.write(db_sync_script)

res = subprocess.run(['node', tmp_mig])
if os.path.exists(tmp_mig):
    os.remove(tmp_mig)

if res.returncode != 0:
    print("⚠️ Direct database migration failed. Check connection string.")
    sys.exit(1)

# ----------------------------------------------------------------------
# 2. Unified Database-Backed Route Handler: /api/books & /api/recipe-books
# ----------------------------------------------------------------------
books_api_code = r'''import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureCookbooksTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cookbooks (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'usr_admin_1',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_image TEXT,
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        is_favorite BOOLEAN DEFAULT false,
        category VARCHAR(100) DEFAULT 'General',
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureCookbooksTable();
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || url.searchParams.get('user_id');

  try {
    let sql = 'SELECT * FROM cookbooks ORDER BY is_favorite DESC, created_at DESC;';
    let params: any[] = [];

    if (userId && userId !== 'all') {
      sql = `
        SELECT * FROM cookbooks 
        WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL OR user_id = ''
        ORDER BY is_favorite DESC, created_at DESC;
      `;
      params = [userId];
    }

    const rows: any = await query(sql, params);
    const list = Array.isArray(rows) ? rows : (rows?.rows || []);

    const sanitized = list.map((b: any) => {
      let rIds: string[] = [];
      if (Array.isArray(b.recipe_ids)) {
        rIds = b.recipe_ids;
      } else if (typeof b.recipe_ids === 'string' && b.recipe_ids.trim()) {
        try { rIds = JSON.parse(b.recipe_ids); } catch (_) {}
      }

      let tagsArr: string[] = [];
      if (Array.isArray(b.tags)) {
        tagsArr = b.tags;
      } else if (typeof b.tags === 'string' && b.tags.trim()) {
        try { tagsArr = JSON.parse(b.tags); } catch (_) {}
      }

      return {
        id: b.id,
        user_id: b.user_id,
        userId: b.user_id,
        title: b.title || b.name || 'Untitled Cookbook',
        name: b.title || b.name || 'Untitled Cookbook',
        description: b.description || '',
        cover_image: b.cover_image || '',
        coverImage: b.cover_image || '',
        recipe_ids: rIds,
        recipeIds: rIds,
        recipes_count: rIds.length,
        is_favorite: Boolean(b.is_favorite),
        isFavorite: Boolean(b.is_favorite),
        category: b.category || 'General',
        tags: tagsArr,
        created_at: b.created_at,
        updated_at: b.updated_at,
      };
    });

    return NextResponse.json(
      { success: true, books: sanitized, cookbooks: sanitized },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Error fetching cookbooks from PostgreSQL:', err.message);
    return NextResponse.json(
      { success: true, books: [], cookbooks: [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

export async function POST(req: NextRequest) {
  await ensureCookbooksTable();
  try {
    const body = await req.json();
    const action = body.action;

    // Handle Delete
    if (action === 'delete' || req.method === 'DELETE') {
      const bookId = body.id || body.bookId;
      if (!bookId) return NextResponse.json({ success: false, error: 'Book ID required' }, { status: 400 });
      await query('DELETE FROM cookbooks WHERE id = $1;', [bookId]);
      await query('DELETE FROM recipe_books WHERE id = $1;', [bookId]).catch(() => {});
      return NextResponse.json({ success: true, message: 'Cookbook deleted' });
    }

    // Handle Recipe Assignment Toggle (Add/Remove Recipe to Book)
    if (action === 'toggle_recipe' || action === 'add_recipe' || action === 'remove_recipe') {
      const bookId = body.bookId || body.book_id || body.id;
      const recipeId = body.recipeId || body.recipe_id;

      if (!bookId || !recipeId) {
        return NextResponse.json({ success: false, error: 'bookId and recipeId required' }, { status: 400 });
      }

      const bookRows: any = await query('SELECT recipe_ids FROM cookbooks WHERE id = $1;', [bookId]);
      const currentBook = Array.isArray(bookRows) ? bookRows[0] : bookRows?.rows?.[0];

      if (!currentBook) {
        return NextResponse.json({ success: false, error: 'Cookbook not found' }, { status: 404 });
      }

      let rList: string[] = Array.isArray(currentBook.recipe_ids)
        ? currentBook.recipe_ids
        : (typeof currentBook.recipe_ids === 'string' ? JSON.parse(currentBook.recipe_ids || '[]') : []);

      if (action === 'remove_recipe' || rList.includes(recipeId)) {
        rList = rList.filter((id: string) => id !== recipeId);
      } else {
        rList.push(recipeId);
      }

      const updatedJson = JSON.stringify(rList);
      await query('UPDATE cookbooks SET recipe_ids = $1::jsonb, updated_at = NOW() WHERE id = $2;', [updatedJson, bookId]);
      await query('UPDATE recipe_books SET recipe_ids = $1::jsonb, updated_at = NOW() WHERE id = $2;', [updatedJson, bookId]).catch(() => {});

      return NextResponse.json({ success: true, recipe_ids: rList, recipes_count: rList.length });
    }

    // Standard Create or Update
    const id = body.id || ('book_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    const userId = body.userId || body.user_id || 'usr_admin_1';
    const title = body.title || body.name || 'Untitled Cookbook';
    const description = body.description || '';
    const coverImage = body.cover_image || body.coverImage || '';
    const recipeIds = JSON.stringify(Array.isArray(body.recipe_ids || body.recipeIds) ? (body.recipe_ids || body.recipeIds) : []);
    const isFavorite = Boolean(body.is_favorite ?? body.isFavorite);
    const category = body.category || 'General';
    const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : []);

    await query(`
      INSERT INTO cookbooks (id, user_id, title, description, cover_image, recipe_ids, is_favorite, category, tags, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        cover_image = EXCLUDED.cover_image,
        recipe_ids = EXCLUDED.recipe_ids,
        is_favorite = EXCLUDED.is_favorite,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        updated_at = NOW();

      INSERT INTO recipe_books (id, user_id, title, description, cover_image, recipe_ids, is_favorite, category, tags, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        cover_image = EXCLUDED.cover_image,
        recipe_ids = EXCLUDED.recipe_ids,
        is_favorite = EXCLUDED.is_favorite,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        updated_at = NOW();
    `, [id, userId, title, description, coverImage, recipeIds, isFavorite, category, tags]);

    return NextResponse.json({
      success: true,
      book: {
        id,
        user_id: userId,
        title,
        description,
        cover_image: coverImage,
        recipe_ids: Array.isArray(body.recipe_ids) ? body.recipe_ids : [],
        is_favorite: isFavorite,
        category,
      },
    });
  } catch (err: any) {
    console.error('Error saving cookbook to PostgreSQL:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || url.searchParams.get('bookId');
  if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

  try {
    await query('DELETE FROM cookbooks WHERE id = $1;', [id]);
    await query('DELETE FROM recipe_books WHERE id = $1;', [id]).catch(() => {});
    return NextResponse.json({ success: true, message: 'Cookbook deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
'''

for rel_api in [
    'apps/web/src/app/api/books/route.ts',
    'src/app/api/books/route.ts',
    'apps/web/src/app/api/recipe-books/route.ts',
    'src/app/api/recipe-books/route.ts'
]:
    target = os.path.join(os.getcwd(), rel_api)
    if os.path.exists(os.path.dirname(target)):
        with open(target, 'w', encoding='utf-8') as f:
            f.write(books_api_code)
        print(f"✓ Provisioned database-backed route handler in: {rel_api}")

# ----------------------------------------------------------------------
# 3. Canonical Zero-Browser-Storage View: apps/web/src/app/books/page.tsx
# ----------------------------------------------------------------------
books_view_code = r''''use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Book, BookOpen, Plus, Search, Star, Trash2, Edit3, 
  ExternalLink, Check, Utensils, X, Layers, Clock, Users, ArrowRight 
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser, User } from '@/lib/auth';

interface CookbookItem {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  cover_image?: string;
  recipe_ids: string[];
  recipes_count?: number;
  is_favorite: boolean;
  category?: string;
  tags?: string[];
}

export default function CookbooksPage() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User null |>(null);
  const [cookbooks, setCookbooks] = useState<CookbookItem[]>([]);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<CookbookItem null |>(null);
  const [activeBookDrawer, setActiveBookDrawer] = useState<CookbookItem null |>(null);

  // Form states (Managed inside accessible <div> containers, zero <form> tags)
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCover, setFormCover] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('General');
  const [formRecipeIds, setFormRecipeIds] = useState<string[]>([]);

  // 1. Fetch cookbooks directly from PostgreSQL (NO localStorage)
  const fetchCookbooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/books?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.books) ? data.books : (Array.isArray(data.cookbooks) ? data.cookbooks : []);
        setCookbooks(list);
      }
    } catch (err) {
      console.error('Error fetching cookbooks from database:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch available recipes for book assignment
  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/saved?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recipes)) {
          setAllRecipes(data.recipes);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    fetchCookbooks();
    fetchRecipes();

    window.addEventListener('focus', fetchCookbooks);
    return () => window.removeEventListener('focus', fetchCookbooks);
  }, [fetchCookbooks, fetchRecipes]);

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingBook(null);
    setFormTitle('');
    setFormDescription('');
    setFormCover('[https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80)');
    setFormCategory('General');
    setFormRecipeIds([]);
    setIsCreateModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (book: CookbookItem) => {
    setEditingBook(book);
    setFormTitle(book.title);
    setFormDescription(book.description || '');
    setFormCover(book.cover_image || '');
    setFormCategory(book.category || 'General');
    setFormRecipeIds(book.recipe_ids || []);
    setIsCreateModalOpen(true);
  };

  // Save / Update directly to PostgreSQL
  const handleSaveCookbook = async () => {
    if (!formTitle.trim()) return;

    const payload = {
      id: editingBook ? editingBook.id : ('book_' + Date.now().toString(36)),
      userId: currentUser?.id || 'usr_admin_1',
      title: formTitle.trim(),
      description: formDescription.trim(),
      cover_image: formCover.trim(),
      category: formCategory,
      recipe_ids: formRecipeIds,
      is_favorite: editingBook ? editingBook.is_favorite : false,
    };

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        fetchCookbooks();
      }
    } catch (err) {
      console.error('Error saving cookbook:', err);
    }
  };

  // Toggle favorite status directly in PostgreSQL
  const handleToggleFavorite = async (book: CookbookItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedStatus = !book.is_favorite;

    try {
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...book,
          is_favorite: updatedStatus,
        }),
      });
      setCookbooks(prev => prev.map((b: CookbookItem) => b.id === book.id ? { ...b, is_favorite: updatedStatus } : b));
    } catch (_) {}
  };

  // Delete directly in PostgreSQL
  const handleDeleteCookbook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteCookbook', 'Are you sure you want to delete this cookbook?'))) return;

    try {
      const res = await fetch(`/api/books?id=${bookId}`, { method: 'DELETE' });
      if (res.ok) {
        setCookbooks(prev => prev.filter((b: CookbookItem) => b.id !== bookId));
        if (activeBookDrawer?.id === bookId) setActiveBookDrawer(null);
      }
    } catch (_) {}
  };

  // Toggle recipe inclusion in active cookbook
  const handleToggleRecipeInBook = async (recipeId: string) => {
    if (!activeBookDrawer) return;

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_recipe',
          bookId: activeBookDrawer.id,
          recipeId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedIds = data.recipe_ids || [];
        setActiveBookDrawer(prev => prev ? { ...prev, recipe_ids: updatedIds, recipes_count: updatedIds.length } : null);
        setCookbooks(prev => prev.map((b: CookbookItem) => b.id === activeBookDrawer.id ? { ...b, recipe_ids: updatedIds, recipes_count: updatedIds.length } : b));
      }
    } catch (_) {}
  };

  const filteredBooks = useMemo(() => {
    return cookbooks.filter((b: CookbookItem) => {
      const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || b.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [cookbooks, searchQuery, selectedCategory]);

  return (
    <div
      className="space-y-8 w-full min-w-0"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Book className="h-7 w-7 text-[var(--color-primary)]"/>
            <span>{t('cookbooks', 'Cookbooks & Collections')}</span>
          </h1>
          <p className="text-xs sm:text-sm pt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('cookbooksSubtitle', 'Organize your favorite culinary recipes into themed cookbooks stored securely in PostgreSQL.')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition cursor-pointer self-start sm:self-auto"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus className="h-4 w-4"/>
          <span>{t('newCookbook', 'Create Cookbook')}</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div
          className="relative flex-1 w-full flex items-center rounded-xl border px-3 py-2 shadow-2xs"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <Search 'var(--color-text-secondary)' className="h-4 w-4 mr-2" color: style="{{" }}/>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchCookbooks', 'Search cookbooks by title or description...')}
            className="w-full bg-transparent border-none outline-hidden text-xs placeholder:opacity-50"
            style={{ color: 'var(--color-text)' }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="p-1">
              <X className="h-3.5 w-3.5 opacity-60"/>
            </button>
          )}
        </div>
      </div>

      {/* 3. COOKBOOKS GRID */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-t-transparent mx-auto" style={{ borderColor: 'var(--color-primary)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('loadingCookbooks', 'Loading cookbooks from PostgreSQL...')}</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div
          className="p-12 text-center rounded-3xl border space-y-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <BookOpen className="h-12 w-12 mx-auto text-[var(--color-primary)] opacity-70"/>
          <div className="space-y-1">
            <h3 className="text-base font-bold">{t('noCookbooksFound', 'No Cookbooks Found')}</h3>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('emptyCookbooksHint', 'Create your first themed cookbook collection to group and organize your dishes.')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t('createFirstCookbook', 'Create Cookbook')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book: CookbookItem, idx: number) => {
            const count = Array.isArray(book.recipe_ids) ? book.recipe_ids.length : 0;
            return (
              <div
                key={book.id || `book_${idx}`}
                onClick={() => setActiveBookDrawer(book)}
                className="rounded-3xl border overflow-hidden cursor-pointer hover:shadow-lg transition flex flex-col justify-between group"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {/* COVER IMAGE */}
                <div className="relative h-48 w-full bg-slate-800 overflow-hidden">
                  {book.cover_image ? (
                    <img
                      src={book.cover_image}
                      alt={book.title}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                  )}

                  {/* FAVORITE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(book, e)}
                    className="absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: book.is_favorite ? '#f59e0b' : '#ffffff',
                    }}
                    title={book.is_favorite ? t('unfavorite', 'Unfavorite') : t('favorite', 'Favorite')}
                  >
                    <Star 'currentColor' 'none'} : ? className="h-4 w-4" fill="{book.is_favorite"/>
                  </button>

                  {/* RECIPE COUNT BADGE */}
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-[11px] font-black text-white bg-black/60 backdrop-blur-md flex items-center gap-1.5">
                    <Utensils className="h-3 w-3 text-[var(--color-primary)]"/>
                    <span>{count} {count === 1 ? 'Recipe' : 'Recipes'}</span>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold line-clamp-1">{book.title}</h3>
                    <p className="text-xs line-clamp-2 pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {book.description || t('noDescription', 'No description provided.')}
                    </p>
                  </div>

                  {/* ACTIONS */}
                  <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-semibold text-[11px]" style={{ color: 'var(--color-primary)' }}>
                      {book.category || 'General'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(book); }}
                        className="p-1.5 rounded-lg border hover:bg-slate-800/20 cursor-pointer"
                        style={{ borderColor: 'var(--color-border)' }}
                        title={t('edit', 'Edit')}
                      >
                        <Edit3 className="h-3.5 w-3.5"/>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCookbook(book.id, e)}
                        className="p-1.5 rounded-lg border hover:bg-red-500/10 text-red-400 cursor-pointer"
                        style={{ borderColor: 'var(--color-border)' }}
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. ACCESSIBLE MODAL: CREATE / EDIT COOKBOOK (NO <form> TAGS) */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border p-6 space-y-5 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreateModalOpen(false);
              if (e.key === 'Enter' && e.ctrlKey) handleSaveCookbook();
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Book className="h-5 w-5 text-[var(--color-primary)]"/>
                <span>{editingBook ? t('editCookbook', 'Edit Cookbook') : t('createCookbook', 'New Cookbook')}</span>
              </h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4"/>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">{t('cookbookTitle', 'Cookbook Title')} *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Weekend Baking & Desserts"
                  className="w-full px-3 py-2 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{t('description', 'Description')}</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="A brief overview of the recipes in this collection..."
                  className="w-full px-3 py-2 rounded-xl border outline-hidden resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{t('coverImageURL', 'Cover Image URL')}</label>
                <input
                  type="text"
                  value={formCover}
                  onChange={(e) => setFormCover(e.target.value)}
                  placeholder="[https://images.unsplash.com/](https://images.unsplash.com/)..."
                  className="w-full px-3 py-2 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{t('category', 'Category')}</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="General">General</option>
                  <option value="Comfort Food">Comfort Food</option>
                  <option value="Healthy">Healthy & Keto</option>
                  <option value="Quick & Easy">Quick & Easy</option>
                  <option value="Baking">Baking & Sweets</option>
                  <option value="Holiday">Holiday & Festive</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveCookbook}
                disabled={!formTitle.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition"
                style={{ backgroundColor: 'var(--color-primary)', opacity: formTitle.trim() ? 1 : 0.5 }}
              >
                {t('saveCookbook', 'Save to Database')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. COOKBOOK RECIPE DRAWER / DETAILS MODAL */}
      {activeBookDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setActiveBookDrawer(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 space-y-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-black text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[var(--color-primary)]"/>
                  <span>{activeBookDrawer.title}</span>
                </h3>
                <p className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {activeBookDrawer.description || 'Collection of saved dishes'}
                </p>
              </div>
              <button type="button" onClick={() => setActiveBookDrawer(null)} className="p-1.5 rounded-lg border">
                <X className="h-4 w-4"/>
              </button>
            </div>

            {/* RECIPE SELECTION & ASSIGNMENT LIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
                  {t('assignedRecipes', 'Assigned Recipes')} ({activeBookDrawer.recipe_ids?.length || 0})
                </span>
                <span className="text-muted-foreground">{t('toggleRecipeHint', 'Click to add/remove recipes')}</span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {allRecipes.length === 0 ? (
                  <div className="text-center py-8 text-xs opacity-60">
                    {t('noSavedRecipesAvailable', 'No saved recipes found in PostgreSQL database.')}
                  </div>
                ) : (
                  allRecipes.map((rec: any, rIdx: number) => {
                    const isIncluded = activeBookDrawer.recipe_ids?.includes(rec.id);
                    return (
                      <div
                        key={rec.id || `rec_item_${rIdx}`}
                        onClick={() => handleToggleRecipeInBook(rec.id)}
                        className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer hover:shadow-xs transition"
                        style={{
                          backgroundColor: isIncluded ? 'var(--color-inner-dark)' : 'transparent',
                          borderColor: isIncluded ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                            {rec.image || rec.image_url ? (
                              <img src={rec.image || rec.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm">🍳</div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs line-clamp-1">{rec.title}</h4>
                            <p className="text-[11px] opacity-70 flex items-center gap-2 pt-0.5">
                              <span>⏱️ {rec.prep_time || '15m'}</span>
                              <span>•</span>
                              <span>👥 {rec.servings || 4} servings</span>
                            </p>
                          </div>
                        </div>

                        <div
                          className="w-6 h-6 rounded-lg border flex items-center justify-center transition"
                          style={{
                            backgroundColor: isIncluded ? 'var(--color-primary)' : 'transparent',
                            borderColor: isIncluded ? 'var(--color-primary)' : 'var(--color-border)',
                            color: '#ffffff',
                          }}
                        >
                          {isIncluded && <Check className="h-4 w-4"/>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setActiveBookDrawer(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('done', 'Done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'''

for rel_p in [
    'apps/web/src/app/books/page.tsx',
    'src/app/books/page.tsx',
    'apps/web/src/app/cookbooks/page.tsx',
    'src/app/cookbooks/page.tsx'
]:
    target = os.path.join(os.getcwd(), rel_p)
    if os.path.exists(os.path.dirname(target)):
        with open(target, 'w', encoding='utf-8') as f:
            f.write(books_view_code)
        print(f"✓ Provisioned zero-browser-storage cookbook view in: {rel_p}")

# ----------------------------------------------------------------------
# 4. Fast Static TypeScript Check ('npx tsc --noEmit')
# ----------------------------------------------------------------------
print("\n• Running static type verification ('cd apps/web && npx tsc --noEmit')...")
web_dir = os.path.join(os.getcwd(), 'apps', 'web')
tsc_res = subprocess.run(["npx", "tsc", "--noEmit"], cwd=web_dir, capture_output=True, text=True)

if tsc_res.returncode == 0:
    print("✅ Static type check passed with ZERO errors!")
else:
    print(f"⚠️ TypeScript reported diagnostics:\n{tsc_res.stdout}\n{tsc_res.stderr}")

# ----------------------------------------------------------------------
# 5. Clean Caches & Validate Local Production Compilation ('npm run build')
# ----------------------------------------------------------------------
def safe_remove(target_path):
    if not os.path.lexists(target_path):
        return
    try:
        if os.path.islink(target_path):
            os.unlink(target_path)
            print(f"✓ Unlinked symbolic link: {target_path}")
        elif os.path.isdir(target_path):
            import shutil
            shutil.rmtree(target_path)
            print(f"✓ Purged directory: {target_path}")
        else:
            os.remove(target_path)
            print(f"✓ Removed file: {target_path}")
    except Exception as e:
        print(f"⚠️ Warning: Could not remove {target_path}: {e}")

for c in [
    os.path.join(os.getcwd(), '.next'),
    os.path.join(os.getcwd(), 'apps', 'web', '.next'),
    os.path.join(os.getcwd(), '.turbo'),
    os.path.join(os.getcwd(), 'apps', 'web', '.turbo')
]:
    safe_remove(c)

print("\n• Validating full local production build ('npm run build')...")
env_vars = os.environ.copy()
env_vars["NEXT_CPU_COUNT"] = "2"
build_res = subprocess.run(["npm", "run", "build"], env=env_vars)

if build_res.returncode == 0:
    print("\n✅ Local production build PASSED with EXIT CODE 0!")
else:
    print(f"\n❌ Build exited with code {build_res.returncode}.")
    sys.exit(1)

# ----------------------------------------------------------------------
# 6. Path-Safe Git Staging & Push to GitHub main
# ----------------------------------------------------------------------
print("\n• Staging updated cookbook files (strictly excluding .env*)...")
subprocess.run(["git", "rm", "--cached", ".env", ".env.local", "apps/web/.env", "apps/web/.env.local"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

candidate_paths = [
    "apps/web/src/app/api/books/route.ts",
    "src/app/api/books/route.ts",
    "apps/web/src/app/api/recipe-books/route.ts",
    "src/app/api/recipe-books/route.ts",
    "apps/web/src/app/books/page.tsx",
    "src/app/books/page.tsx",
    "apps/web/src/app/cookbooks/page.tsx",
    "src/app/cookbooks/page.tsx",
    ".gitignore"
]

existing_paths = [p for p in candidate_paths if os.path.exists(os.path.join(os.getcwd(), p))]
subprocess.run(["git", "add"] + existing_paths, check=True)

staged_files = subprocess.run(["git", "diff", "--name-only", "--cached"], capture_output=True, text=True).stdout.splitlines()
for sf in staged_files:
    if '.env' in sf:
        subprocess.run(["git", "reset", "HEAD", sf], check=False)
        print(f"⚠️ Unstaged sensitive file: {sf}")

cached_diff = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True).stdout.strip()
if cached_diff:
    subprocess.run([
        "git", "commit", "-m",
        "Eliminate browser storage in cookbooks, persist recipe_ids to PostgreSQL, and seed collections"
    ], check=True)

    print("• Pushing to GitHub main branch ('git push origin main')...")
    push_res = subprocess.run(["git", "push", "origin", "main"])
    if push_res.returncode == 0:
        head_hash = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
        print(f"\n🎉 PUSH SUCCEEDED! Latest Commit: {head_hash}")
        print("Ready for Hostinger deployment.")
    else:
        print("\n⚠️ Push returned non-zero status. Run 'git push origin main' manually.")
else:
    print("ℹ️ Working tree clean or changes already committed.")

print("\n==================================================================")
print("✨ Cookbooks direct database persistence is fully active!")
print("==================================================================")
