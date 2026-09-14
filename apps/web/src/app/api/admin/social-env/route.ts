import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getEnvFilePath() {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, 'apps/web/.env.local'),
    path.join(cwd, 'apps/web/.env')
  ];
  return paths.find(p => fs.existsSync(p)) || path.join(cwd, '.env.local');
}

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const clean = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIdx = clean.indexOf('=');
    if (eqIdx > 0) {
      const key = clean.slice(0, eqIdx).trim();
      let val = clean.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

export async function GET() {
  const filePath = getEnvFilePath();
  let fileEnv: Record<string, string> = {};
  if (fs.existsSync(filePath)) {
    fileEnv = parseEnv(fs.readFileSync(filePath, 'utf-8'));
  }

  const config = {
    googleEnabled: fileEnv['NEXT_PUBLIC_GOOGLE_ENABLED'] !== 'false',
    googleClientId: fileEnv['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    googleClientSecret: fileEnv['GOOGLE_CLIENT_SECRET'] || process.env.GOOGLE_CLIENT_SECRET || '',

    facebookEnabled: fileEnv['NEXT_PUBLIC_FACEBOOK_ENABLED'] === 'true',
    facebookClientId: fileEnv['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || '',
    facebookClientSecret: fileEnv['FACEBOOK_CLIENT_SECRET'] || process.env.FACEBOOK_CLIENT_SECRET || '',

    appleEnabled: fileEnv['NEXT_PUBLIC_APPLE_ENABLED'] === 'true',
    appleClientId: fileEnv['NEXT_PUBLIC_APPLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
    appleTeamId: fileEnv['APPLE_TEAM_ID'] || process.env.APPLE_TEAM_ID || '',
    appleKeyId: fileEnv['APPLE_KEY_ID'] || process.env.APPLE_KEY_ID || '',
  };

  return new NextResponse(JSON.stringify({ success: true, config, envPath: filePath }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const filePath = getEnvFilePath();
    let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

    const updates: Record<string, string> = {
      'NEXT_PUBLIC_GOOGLE_ENABLED': String(Boolean(data.googleEnabled)),
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID': data.googleClientId || '',
      'GOOGLE_CLIENT_SECRET': data.googleClientSecret || '',

      'NEXT_PUBLIC_FACEBOOK_ENABLED': String(Boolean(data.facebookEnabled)),
      'NEXT_PUBLIC_FACEBOOK_CLIENT_ID': data.facebookClientId || '',
      'FACEBOOK_CLIENT_SECRET': data.facebookClientSecret || '',

      'NEXT_PUBLIC_APPLE_ENABLED': String(Boolean(data.appleEnabled)),
      'NEXT_PUBLIC_APPLE_CLIENT_ID': data.appleClientId || '',
      'APPLE_TEAM_ID': data.appleTeamId || '',
      'APPLE_KEY_ID': data.appleKeyId || '',
    };

    const lines = content ? content.split(/\r?\n/) : [];
    const keysFound = new Set<string>();

    const updatedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        if (key in updates) {
          keysFound.add(key);
          return `${key}="${updates[key]}"`;
        }
      }
      return line;
    });

    const appended: string[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (!keysFound.has(k)) appended.push(`${k}="${v}"`);
    }

    if (appended.length > 0) {
      if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1].trim() !== '') {
        updatedLines.push('');
      }
      updatedLines.push('# --- Social OAuth & Identity Credentials ---');
      updatedLines.push(...appended);
    }

    fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
    return NextResponse.json({ success: true, message: 'Settings saved to ' + path.basename(filePath) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
