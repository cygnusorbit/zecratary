import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json({ success: false, error: 'Malformed request body' }, { status: 400 });
    }

    const { provider, apiKey, model } = body;
    const cleanKey = (apiKey || '').trim();

    if (!cleanKey || cleanKey.includes('sample') || cleanKey.includes('YourKeyHere') || cleanKey.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid, non-sample API key.'
      }, { status: 400 });
    }

    if (provider === 'gemini') {
      const candidateModels = [model, 'gemini-3.6-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8', 'gemini-3.1-pro', 'gemini-1.5-flash'].filter(Boolean);
      let lastErrorMessage = '';

      for (const targetModel of Array.from(new Set(candidateModels))) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Ping test' }] }],
              generationConfig: { maxOutputTokens: 5 }
            }),
            signal: AbortSignal.timeout(10000)
          });

          if (res.ok) {
            return NextResponse.json({
              success: true,
              message: `Successfully connected to Google Gemini (${targetModel})!`
            });
          }

          const rawText = await res.text();
          try {
            const errJson = JSON.parse(rawText);
            lastErrorMessage = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          } catch (_) {
            lastErrorMessage = rawText || `HTTP ${res.status}: ${res.statusText}`;
          }
        } catch (callErr: any) {
          lastErrorMessage = callErr.message || 'Connection failed';
        }
      }

      return NextResponse.json({ success: false, error: lastErrorMessage }, { status: 400 });
    }

    if (provider === 'openai') {
      const targetModel = model || 'gpt-4o';
      const endpoint = 'https://api.openai.com/v1/chat/completions';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        const rawText = await res.text();
        let errMsg = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errJson = JSON.parse(rawText);
          errMsg = errJson?.error?.message || errMsg;
        } catch (_) {}
        return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully connected to OpenAI (${targetModel})!`
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported provider selected.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.name === 'TimeoutError' ? 'Connection timed out after 10s.' : (err.message || 'Verification endpoint error.')
    }, { status: 500 });
  }
}
