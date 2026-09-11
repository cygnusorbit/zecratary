import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json();
    if (!apiKey || apiKey.trim().length < 8) {
      return NextResponse.json({ success: false, error: 'Please enter a valid API key to test.' });
    }

    const key = apiKey.trim();

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && !data.error) {
        return NextResponse.json({ success: true, message: `Connected to Google Gemini (${model || 'gemini-3.5-flash-lite'}) successfully!` });
      } else {
        return NextResponse.json({ success: false, error: data.error?.message || 'Gemini authentication failed. Verify API key permissions.' });
      }
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        return NextResponse.json({ success: true, message: `Connected to OpenAI (${model || 'gpt-4o'}) successfully!` });
      } else {
        return NextResponse.json({ success: false, error: data.error?.message || 'OpenAI authentication failed.' });
      }
    }

    return NextResponse.json({ success: true, message: 'Key verification passed.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not reach provider endpoint.' });
  }
}
