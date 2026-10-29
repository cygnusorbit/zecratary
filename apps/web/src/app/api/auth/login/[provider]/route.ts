import { NextRequest, NextResponse } from 'next/server';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const params = (await Promise.resolve(context?.params || context)) as { provider: string };
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
