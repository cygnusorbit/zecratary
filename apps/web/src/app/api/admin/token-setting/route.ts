import { NextResponse } from 'next/server';
import { getTokenSettings } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getTokenSettings();
    return NextResponse.json({ success: true, settings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
