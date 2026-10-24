import { NextRequest, NextResponse } from 'next/server';
import { getStorageSettings, saveStorageSettings, DEFAULT_STORAGE_CONFIG } from '@/lib/storageService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getStorageSettings();
    return NextResponse.json(
      { success: true, settings },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: true, settings: DEFAULT_STORAGE_CONFIG });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await saveStorageSettings(body);
    return NextResponse.json({ success: true, settings: updated, message: 'Storage settings saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
