import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows: any = await query('SELECT * FROM saved_recipes ORDER BY created_at DESC LIMIT 50;');
    const list = Array.isArray(rows) ? rows : (rows?.rows || []);
    return NextResponse.json({ success: true, recipes: list });
  } catch (_) {
    return NextResponse.json({ success: true, recipes: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, recipe: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
