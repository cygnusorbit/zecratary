import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseEnv(): Record<string, string> {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, 'apps/web/.env.local'),
    path.join(cwd, 'apps/web/.env')
  ];
  const target = paths.find(p => fs.existsSync(p));
  if (!target) return {};

  const content = fs.readFileSync(target, 'utf-8');
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const clean = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIdx = clean.indexOf('=');
    if (eqIdx > 0) {
      const k = clean.slice(0, eqIdx).trim();
      let v = clean.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      result[k] = v;
    }
  }
  return result;
}

export async function GET() {
  const env = parseEnv();

  // Determine enabled statuses (strictly evaluate boolean strings)
  const googleEnabled = (env['NEXT_PUBLIC_GOOGLE_ENABLED'] ?? process.env.NEXT_PUBLIC_GOOGLE_ENABLED) !== 'false';
  const facebookEnabled = (env['NEXT_PUBLIC_FACEBOOK_ENABLED'] ?? process.env.NEXT_PUBLIC_FACEBOOK_ENABLED) === 'true';
  const appleEnabled = (env['NEXT_PUBLIC_APPLE_ENABLED'] ?? process.env.NEXT_PUBLIC_APPLE_ENABLED) === 'true';

  const config = {
    googleEnabled,
    googleClientId: env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    facebookEnabled,
    facebookClientId: env['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || '',
    appleEnabled,
    appleClientId: env['NEXT_PUBLIC_APPLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
  };

  return new NextResponse(JSON.stringify(config), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
