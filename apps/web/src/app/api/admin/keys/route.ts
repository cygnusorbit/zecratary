import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getEnvPaths(): string[] {
  return [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local')
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = body.provider?.toLowerCase().includes('openai') ? 'openai' : 'gemini';
    const keyVal = (body.apiKey || body.keyValue || '').trim();
    const modelVal = (body.model || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o')).trim();

    const envKey = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
    const modelKey = provider === 'gemini' ? 'GEMINI_MODEL' : 'OPENAI_MODEL';

    for (const p of getEnvPaths()) {
      let content = fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
      let lines = content.split('\n');

      const updateOrAdd = (key: string, val: string) => {
        let found = false;
        lines = lines.map(line => {
          if (line.trim().startsWith(`${key}=`)) {
            found = true;
            return `${key}="${val}"`;
          }
          return line;
        });
        if (!found) lines.push(`${key}="${val}"`);
      };

      if (keyVal) updateOrAdd(envKey, keyVal);
      if (modelVal) updateOrAdd(modelKey, modelVal);
      updateOrAdd('DEFAULT_AI_PROVIDER', provider);

      os.makedirs(path.dirname(p), exist_ok=True)
      fs.writeFileSync(p, lines.filter(Boolean).join('\n') + '\n', 'utf-8');
    }

    return NextResponse.json({ success: true, message: 'Keys synced to environment files.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
