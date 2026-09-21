import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json();
    const cleanKey = (apiKey || '').trim();

    if (!cleanKey) {
      return NextResponse.json({ success: false, error: 'API key is required to query models.' }, { status: 400 });
    }

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || data.error) {
        return NextResponse.json({
          success: false,
          error: data.error?.message || `Google API model listing failed (${res.status})`
        }, { status: res.status || 400 });
      }

      const rawModels = Array.isArray(data.models) ? data.models : [];
      const geminiModels = rawModels
        .filter((m: any) => {
          const methods = m.supportedGenerationMethods || [];
          const name = (m.name || '').toLowerCase();
          return methods.includes('generateContent') &&
                 !name.includes('embedding') &&
                 !name.includes('aqa') &&
                 !name.includes('imagen');
        })
        .map((m: any) => {
          const rawId = m.name?.startsWith('models/') ? m.name.replace('models/', '') : m.name;
          const displayName = m.displayName || rawId;
          return {
            id: rawId,
            name: displayName,
            label: `${displayName} (${rawId})`,
            description: m.description || ''
          };
        });

      return NextResponse.json({
        success: true,
        models: geminiModels,
        message: `Discovered ${geminiModels.length} models dynamically from Google Gemini.`
      }, { headers: { 'Cache-Control': 'no-store' } });
    } else {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${cleanKey}` },
        cache: 'no-store'
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        return NextResponse.json({
          success: false,
          error: data.error?.message || `OpenAI model listing failed (${res.status})`
        }, { status: res.status || 400 });
      }

      const openaiModels = (data.data || [])
        .filter((m: any) => {
          const id = (m.id || '').toLowerCase();
          return (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3')) &&
                 !id.includes('realtime') && !id.includes('audio') &&
                 !id.includes('moderation') && !id.includes('embedding') &&
                 !id.includes('instruct') && !id.includes('similarity');
        })
        .sort((a: any, b: any) => (b.created || 0) - (a.created || 0))
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          label: m.id,
          description: `OpenAI ${m.id}`
        }));

      return NextResponse.json({
        success: true,
        models: openaiModels,
        message: `Discovered ${openaiModels.length} models dynamically from OpenAI.`
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
