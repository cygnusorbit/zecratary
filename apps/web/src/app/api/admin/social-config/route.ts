import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getEnvPath() {
  const rootDir = process.cwd();
  const localEnv = path.join(rootDir, '.env.local');
  if (fs.existsSync(localEnv)) return localEnv;
  return path.join(rootDir, '.env');
}

function parseEnv(): Record<string, string> {
  const envFile = getEnvPath();
  if (!fs.existsSync(envFile)) return {};
  const content = fs.readFileSync(envFile, 'utf8');
  const envMap: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        envMap[key] = val;
      }
    }
  });
  return envMap;
}

export async function GET() {
  try {
    const envMap = parseEnv();

    const googleClientId = envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '';
    const googleClientSecret = envMap['GOOGLE_CLIENT_SECRET'] || '';
    const facebookClientId = envMap['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || '';
    const facebookClientSecret = envMap['FACEBOOK_CLIENT_SECRET'] || '';
    const appleClientId = envMap['NEXT_PUBLIC_APPLE_CLIENT_ID'] || '';
    const appleClientSecret = envMap['APPLE_CLIENT_SECRET'] || '';

    const payload = {
      success: true,
      // Flat properties for admin panel compatibility
      googleEnabled: Boolean(googleClientId || true),
      googleClientId,
      googleClientSecret,
      facebookEnabled: Boolean(facebookClientId || true),
      facebookClientId,
      facebookClientSecret,
      appleEnabled: Boolean(appleClientId || true),
      appleClientId,
      appleClientSecret,
      // Nested structure for client authentication components
      config: {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          enabled: Boolean(googleClientId || true)
        },
        facebook: {
          clientId: facebookClientId,
          clientSecret: facebookClientSecret,
          enabled: Boolean(facebookClientId || true)
        },
        apple: {
          clientId: appleClientId,
          clientSecret: appleClientSecret,
          enabled: Boolean(appleClientId || true)
        }
      }
    };

    return new NextResponse(JSON.stringify(payload), {
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
    const envFile = getEnvPath();
    let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';

    const updates: Record<string, string> = {};

    if (body.googleClientId !== undefined) updates['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = body.googleClientId;
    if (body.googleClientSecret !== undefined) updates['GOOGLE_CLIENT_SECRET'] = body.googleClientSecret;
    if (body.facebookClientId !== undefined) updates['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] = body.facebookClientId;
    if (body.facebookClientSecret !== undefined) updates['FACEBOOK_CLIENT_SECRET'] = body.facebookClientSecret;
    if (body.appleClientId !== undefined) updates['NEXT_PUBLIC_APPLE_CLIENT_ID'] = body.appleClientId;
    if (body.appleClientSecret !== undefined) updates['APPLE_CLIENT_SECRET'] = body.appleClientSecret;

    if (body.google) {
      if (body.google.clientId !== undefined) updates['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = body.google.clientId;
      if (body.google.clientSecret !== undefined) updates['GOOGLE_CLIENT_SECRET'] = body.google.clientSecret;
    }
    if (body.facebook) {
      if (body.facebook.clientId !== undefined) updates['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] = body.facebook.clientId;
      if (body.facebook.clientSecret !== undefined) updates['FACEBOOK_CLIENT_SECRET'] = body.facebook.clientSecret;
    }
    if (body.apple) {
      if (body.apple.clientId !== undefined) updates['NEXT_PUBLIC_APPLE_CLIENT_ID'] = body.apple.clientId;
      if (body.apple.clientSecret !== undefined) updates['APPLE_CLIENT_SECRET'] = body.apple.clientSecret;
    }

    const lines = content.split('\n');
    const updatedKeys = new Set<string>();
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        if (key in updates) {
          updatedKeys.add(key);
          return `${key}="${updates[key]}"`;
        }
      }
      return line;
    });

    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}="${val}"`);
      }
    }

    fs.writeFileSync(envFile, newLines.join('\n'), 'utf8');
    return NextResponse.json({ success: true, message: 'Configuration synchronized to environment file' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
