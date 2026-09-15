import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getStorePaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];
}

function readServerSettings(): Record<string, any> {
  const filePaths = getStorePaths();
  for (const fp of filePaths) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (err) {
        console.error('[API admin/settings] Read error:', fp, err);
      }
    }
  }
  return {};
}

function writeServerSettings(data: Record<string, any>): boolean {
  const filePaths = getStorePaths();
  let wrote = false;
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  for (const fp of filePaths) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf-8');
      wrote = true;
    } catch (err) {
      console.error('[API admin/settings] Write error:', fp, err);
    }
  }
  return wrote;
}

export async function GET() {
  try {
    const settings = readServerSettings();
    return NextResponse.json(
      { success: true, settings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readServerSettings();
    const merged = {
      ...current,
      ...body,
      socialLogin: {
        ...(current.socialLogin || {}),
        ...(body.socialLogin || {})
      },
      subscriptionPlans: body.subscriptionPlans || current.subscriptionPlans || []
    };

    const success = writeServerSettings(merged);
    if (!success) {
      return NextResponse.json({ error: 'Failed to write settings to storage' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, settings: merged },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to persist settings' }, { status: 500 });
  }
}
