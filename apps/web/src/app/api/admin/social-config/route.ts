import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getEnvPath() {
  const rootDir = process.cwd();
  const localEnv = path.join(rootDir, '.env.local');
  if (fs.existsSync(localEnv)) return localEnv;
  return path.join(rootDir, '.env');
}

export async function GET() {
  try {
    const envFile = getEnvPath();
    let content = '';
    if (fs.existsSync(envFile)) {
      content = fs.readFileSync(envFile, 'utf8');
    }

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

    const googleEnabled = envMap['NEXT_PUBLIC_GOOGLE_ENABLED'] !== 'false';
    const facebookEnabled = envMap['NEXT_PUBLIC_FACEBOOK_ENABLED'] !== 'false';
    const appleEnabled = envMap['NEXT_PUBLIC_APPLE_ENABLED'] === 'true' || Boolean(envMap['NEXT_PUBLIC_APPLE_CLIENT_ID']);
    const githubEnabled = envMap['NEXT_PUBLIC_GITHUB_ENABLED'] !== 'false';

    const config = {
      // Flat properties for compatibility with older settings format
      googleEnabled,
      googleClientId: envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '',
      facebookEnabled,
      facebookClientId: envMap['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || '',
      appleEnabled,
      appleClientId: envMap['NEXT_PUBLIC_APPLE_CLIENT_ID'] || '',
      githubEnabled,
      githubClientId: envMap['NEXT_PUBLIC_GITHUB_CLIENT_ID'] || '',

      // Nested structure for modular authentication handlers
      google: {
        enabled: googleEnabled,
        clientId: envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '',
        clientSecret: envMap['GOOGLE_CLIENT_SECRET'] || '',
      },
      facebook: {
        enabled: facebookEnabled,
        clientId: envMap['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || '',
        clientSecret: envMap['FACEBOOK_CLIENT_SECRET'] || '',
      },
      apple: {
        enabled: appleEnabled,
        clientId: envMap['NEXT_PUBLIC_APPLE_CLIENT_ID'] || '',
      },
      github: {
        enabled: githubEnabled,
        clientId: envMap['NEXT_PUBLIC_GITHUB_CLIENT_ID'] || '',
        clientSecret: envMap['GITHUB_CLIENT_SECRET'] || '',
      }
    };

    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
