import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ provider: string }> | { provider: string } }
) {
  const params = await Promise.resolve(context.params);
  const provider = (params?.provider || '').toLowerCase();
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/profile';

  if (provider === 'google') {
    const dest = new URL('/api/auth/login/google', req.url);
    dest.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(dest);
  }

  const fallback = new URL('/login', req.url);
  fallback.searchParams.set('error', `unsupported_provider_${provider}`);
  return NextResponse.redirect(fallback);
}
