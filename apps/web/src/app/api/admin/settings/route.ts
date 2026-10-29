import { NextRequest, NextResponse } from 'next/server';
import { 
  getPersistedSocialSettings, 
  savePersistedSocialSettings, 
  readSettingsFromFile, 
  writeSettingsToFile 
} from '@/lib/databaseSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const fileSettings = readSettingsFromFile();
    const social = await getPersistedSocialSettings();
    return NextResponse.json({
      settings: {
        ...fileSettings,
        socialLogin: social
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readSettingsFromFile();

    if (body.socialLogin) {
      await savePersistedSocialSettings(body.socialLogin);
      current.socialLogin = body.socialLogin;
    } else {
      writeSettingsToFile({ ...current, ...body });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated and synchronized across PostgreSQL & MySQL.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
