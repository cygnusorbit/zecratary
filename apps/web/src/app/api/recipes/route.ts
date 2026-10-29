import { NextRequest, NextResponse } from 'next/server';
import {
  saveRecipeJsonFile,
  loadAllRecipeJsonFiles,
  deleteRecipeJsonFile
} from '@/lib/recipeFiles';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();
    const email = searchParams.get('email')?.trim();
    const tab = searchParams.get('tab')?.trim();
    const isMarketplace = tab === 'marketplace' || searchParams.get('marketplace') === 'true';

    // Single source of truth: Load all recipes directly from dedicated JSON files
    const diskRecipes = loadAllRecipeJsonFiles();

    let filtered = diskRecipes;

    if (isMarketplace) {
      // Marketplace Tab: Show all recipes enabled for public
      filtered = diskRecipes.filter(r => Boolean(r.isPublic || (r as any).is_public));
    } else if (userId || email) {
      // Personal Recipes Tab: Show recipes owned by the current user
      filtered = diskRecipes.filter(r => {
        const rUid = r.userId || (r as any).user_id || r.ownerId || r.ownership?.userId;
        const rEmail = r.createdBy || (r as any).created_by || r.creatorEmail || r.ownerEmail || r.ownership?.creatorEmail;
        return (
          rUid === userId ||
          rEmail === userId ||
          (email && (rEmail === email || rUid === email))
        );
      });
    }

    return NextResponse.json({
      success: true,
      recipes: filtered
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.recipes || [body.recipe || body]);

    for (const item of items) {
      if (!item) continue;
      const targetUserId = (item.userId || item.user_id || body.userId || 'usr_admin_1').trim();
      const createdBy = (item.createdBy || item.created_by || item.ownerEmail || targetUserId).trim();
      const creatorName = (item.creatorName || item.creator_name || item.ownerName || 'Chef').trim();
      const creatorEmail = (item.creatorEmail || item.creator_email || item.ownerEmail || '').trim();
      const id = item.id || `rcp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      const recipeRecord = {
        ...item,
        id,
        userId: targetUserId,
        user_id: targetUserId,
        createdBy,
        created_by: createdBy,
        creatorName,
        creator_name: creatorName,
        creatorEmail,
        creator_email: creatorEmail,
        isPublic: Boolean(item.isPublic ?? item.is_public ?? false)
      };

      // Save to dedicated JSON file
      saveRecipeJsonFile(recipeRecord, { userId: targetUserId, createdBy, creatorName, creatorEmail });
    }

    return NextResponse.json({ success: true, message: 'Saved to dedicated recipe JSON files.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isPublic, is_public, isFavorite, is_favorite, isCooked, is_cooked, rating, note, bookId, book_id } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 });

    const targetPublic = isPublic !== undefined ? isPublic : is_public;

    // Load from dedicated JSON files
    const diskRecipes = loadAllRecipeJsonFiles();
    const target = diskRecipes.find(r => r.id === id);

    if (target) {
      if (targetPublic !== undefined) {
        target.isPublic = Boolean(targetPublic);
        target.visibility = targetPublic ? 'public' : 'private';
      }
      if (isFavorite !== undefined || is_favorite !== undefined) {
        target.isFavorite = Boolean(isFavorite !== undefined ? isFavorite : is_favorite);
      }
      if (isCooked !== undefined || is_cooked !== undefined) {
        target.isCooked = Boolean(isCooked !== undefined ? isCooked : is_cooked);
      }
      if (rating !== undefined) {
        target.rating = Number(rating);
      }
      if (note !== undefined) {
        target.note = String(note);
      }
      if (bookId !== undefined || book_id !== undefined) {
        target.bookId = bookId !== undefined ? bookId : book_id;
      }
      target.updatedAt = new Date().toISOString();
      saveRecipeJsonFile(target);
    }

    return NextResponse.json({ success: true, message: 'Updated in dedicated JSON file.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Recipe ID required' }, { status: 400 });

    // Delete dedicated JSON file from disk
    deleteRecipeJsonFile(id.trim());

    return NextResponse.json({ success: true, message: 'Deleted from dedicated JSON files.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
