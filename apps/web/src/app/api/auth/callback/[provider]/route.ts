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
  const url = new URL(req.url);
  const target = new URL(`${url.origin}/api/auth/callback`);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  if (!target.searchParams.get('state')) {
    target.searchParams.set('state', params.provider);
  }
  return NextResponse.redirect(target.toString());
}

export async function POST(req: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const params = (await Promise.resolve(context?.params || context)) as { provider: string };
  const url = new URL(req.url);
  const form = await req.formData();
  const target = new URL(`${url.origin}/api/auth/callback`);
  form.forEach((value, key) => target.searchParams.set(key, value.toString()));
  if (!target.searchParams.get('state')) {
    target.searchParams.set('state', params.provider);
  }
  return NextResponse.redirect(target.toString());
}
