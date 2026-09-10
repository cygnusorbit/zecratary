import os
import glob

# 1. Locate active App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate active App Router directory.")
    exit(1)

api_path = os.path.join(app_dir, 'api', 'social-config', 'route.ts')

if not os.path.exists(api_path):
    print(f"❌ Error: Could not find {api_path}. Please ensure Step 4 was completed.")
    exit(1)

prisma_api_code = """import { NextResponse } from 'next/server';
// Note: Adjust the import below based on your Turborepo setup
// e.g., import { prisma } from 'database'; OR import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const config = await prisma.socialConfig.findFirst();
    if (config) {
      return NextResponse.json(config);
    }
  } catch (e) {
    console.error('Database connection failed, returning default config.', e);
  }
  return NextResponse.json(DEFAULT_CONFIG);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const existing = await prisma.socialConfig.findFirst();
    
    // Clean payload for Prisma
    const dataPayload = {
      googleEnabled: body.googleEnabled,
      googleClientId: body.googleClientId,
      googleClientSecret: body.googleClientSecret,
      facebookEnabled: body.facebookEnabled,
      facebookClientId: body.facebookClientId,
      facebookClientSecret: body.facebookClientSecret,
      appleEnabled: body.appleEnabled,
      appleClientId: body.appleClientId,
      appleTeamId: body.appleTeamId,
      appleKeyId: body.appleKeyId,
      redirectUri: body.redirectUri,
    };

    if (existing) {
      await prisma.socialConfig.update({
        where: { id: existing.id },
        data: dataPayload
      });
    } else {
      await prisma.socialConfig.create({
        data: dataPayload
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to save configuration to database', e);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
"""

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(prisma_api_code)

print(f"✓ Upgraded {api_path} to use direct Prisma database persistence.")
