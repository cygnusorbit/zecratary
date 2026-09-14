import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getPlansPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'subscription_configs.json');
}

export async function GET() {
  try {
    const filePath = getPlansPath();
    let configs: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) configs = JSON.parse(raw);
      } catch (_) {}
    }
    return new NextResponse(JSON.stringify({ success: true, configs, plans: configs }), {
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
    const filePath = getPlansPath();
    const configs = Array.isArray(body) ? body : (body.configs || body.plans || [body]);
    fs.writeFileSync(filePath, JSON.stringify(configs, null, 2), 'utf-8');

    // Sync into system_settings.json
    try {
      const sPath = path.join(path.dirname(filePath), 'system_settings.json');
      let sys: any = {};
      if (fs.existsSync(sPath)) {
        sys = JSON.parse(fs.readFileSync(sPath, 'utf-8') || '{}');
      }
      sys.plans = configs;
      sys.subscriptionConfigs = configs;
      fs.writeFileSync(sPath, JSON.stringify(sys, null, 2), 'utf-8');
    } catch (_) {}

    return NextResponse.json({ success: true, configs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
