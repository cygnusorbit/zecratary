import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSettingsPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'system_settings.json');
}

export async function GET() {
  try {
    const sPath = getSettingsPath();
    let settings: any = {};
    if (fs.existsSync(sPath)) {
      const raw = fs.readFileSync(sPath, 'utf-8');
      if (raw.trim()) settings = JSON.parse(raw);
    }
    return new NextResponse(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sPath = getSettingsPath();
    let current: any = {};
    if (fs.existsSync(sPath)) {
      try {
        const raw = fs.readFileSync(sPath, 'utf-8');
        if (raw.trim()) current = JSON.parse(raw);
      } catch (_) {}
    }
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    fs.writeFileSync(sPath, JSON.stringify(updated, null, 2), 'utf-8');
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
