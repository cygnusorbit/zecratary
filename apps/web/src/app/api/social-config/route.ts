import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Using a local JSON file to mock database persistence across browser sessions
const CONFIG_FILE = path.join(process.cwd(), 'social_config.json');

const DEFAULT_CONFIG = {
  googleEnabled: true,
  googleClientId: '',
  googleClientSecret: '',
  facebookEnabled: true,
  facebookClientId: '',
  facebookClientSecret: '',
  appleEnabled: true,
  appleClientId: '',
  appleTeamId: '',
  appleKeyId: '',
  redirectUri: 'http://localhost:3000/api/auth/callback',
};

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
  } catch (e) {
    console.error('Failed to read social config', e);
  }
  return NextResponse.json(DEFAULT_CONFIG);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
