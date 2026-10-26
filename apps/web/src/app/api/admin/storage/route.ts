import { NextRequest, NextResponse } from 'next/server';
import { getStorageSettings, saveStorageSettings, getUniversalDiskDiagnostics, DEFAULT_STORAGE_CONFIG } from '@/lib/storageService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getStorageSettings();
    const diskStats = getUniversalDiskDiagnostics();
    return NextResponse.json(
      { success: true, settings, diskStats },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      settings: DEFAULT_STORAGE_CONFIG,
      diskStats: getUniversalDiskDiagnostics()
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await saveStorageSettings(body);
    const diskStats = getUniversalDiskDiagnostics();
    return NextResponse.json({
      success: true,
      settings: updated,
      diskStats,
      message: 'Universal storage settings saved successfully'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
