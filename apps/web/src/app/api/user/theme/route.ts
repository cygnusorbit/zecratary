import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getTargetFiles(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'apps/web/data/user_theme.json'),
    path.join(cwd, 'data/user_theme.json')
  ];
}

function readThemeData(): any[] {
  const files = getTargetFiles();
  for (const file of files) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        console.error('[API user-theme] Read error:', file, err);
      }
    }
  }
  return [];
}

function writeThemeData(themes: any[]): boolean {
  const files = getTargetFiles();
  let wroteAny = false;
  for (const file of files) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(themes, null, 2), 'utf-8');
      wroteAny = true;
    } catch (err) {
      console.error('[API user-theme] Write error:', file, err);
    }
  }
  return wroteAny;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || 'usr_admin_1').trim();

    const themes = readThemeData();
    const userTheme = themes.find((t: any) => t.userId === userId) || {
      userId,
      themeMode: 'dark',
      primaryColor: '#E05638',
      accentColor: '#10b981'
    };

    return NextResponse.json(userTheme, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = (body.userId || 'usr_admin_1').trim();

    const themes = readThemeData();
    const others = themes.filter((t: any) => t.userId !== userId);
    
    const updatedTheme = {
      ...body,
      userId
    };

    const merged = [updatedTheme, ...others];
    writeThemeData(merged);

    return NextResponse.json({
      success: true,
      theme: updatedTheme
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
