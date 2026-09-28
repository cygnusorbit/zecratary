import { NextRequest, NextResponse } from 'next/server';

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
