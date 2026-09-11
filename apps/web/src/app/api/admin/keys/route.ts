import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getTargetEnvFiles(): string[] {
  const cwd = process.cwd();
  const searchDirs = [
    cwd,
    path.join(cwd, 'apps', 'web'),
    path.resolve(cwd, '..'),
    path.resolve(cwd, '..', '..')
  ];

  const envFilenames = ['.env', '.env.local', '.env.development'];
  const found: string[] = [];

  for (const dir of searchDirs) {
    for (const name of envFilenames) {
      const full = path.resolve(dir, name);
      if (fs.existsSync(full) && !found.includes(full)) {
        found.push(full);
      }
    }
  }

  // If no env file exists anywhere, default to .env in project root
  if (found.length === 0) {
    found.push(path.resolve(cwd, '.env'));
  }
  return found;
}

function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const clean = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIdx = clean.indexOf('=');
    if (eqIdx > 0) {
      const k = clean.slice(0, eqIdx).trim();
      let v = clean.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

export async function GET() {
  try {
    const files = getTargetEnvFiles();
    const diskEnv: Record<string, string> = {};

    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          Object.assign(diskEnv, parseEnv(content));
        } catch (_) {}
      }
    }

    // Add process.env overrides
    for (const [k, v] of Object.entries(process.env)) {
      if (v && typeof v === 'string') {
        const u = k.toUpperCase();
        if (u.includes('GEMINI') || u.includes('OPENAI') || u.includes('GOOGLE')) {
          if (!diskEnv[k]) diskEnv[k] = v;
        }
      }
    }

    const keys: any[] = [];
    for (const [k, v] of Object.entries(diskEnv)) {
      if (!v) continue;
      const u = k.toUpperCase();
      let prov = 'API Key';
      if (u.includes('GEMINI') || u.includes('GOOGLE')) prov = 'Google Gemini';
      else if (u.includes('OPENAI')) prov = 'OpenAI GPT';

      keys.push({ envKey: k, keyValue: v, provider: prov });
    }

    return NextResponse.json({
      success: true,
      keys,
      envMap: diskEnv,
      filesScanned: files
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, keyValue, envKey } = body;

    if (!keyValue || typeof keyValue !== 'string' || keyValue.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'API key value cannot be empty.' }, { status: 400 });
    }

    const cleanValue = keyValue.trim();
    const isGemini = (provider || '').toLowerCase().includes('gemini') || (envKey || '').includes('GEMINI');

    // Keys to update
    const primaryKey = isGemini ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
    const secondaryKeys = isGemini 
      ? ['GOOGLE_API_KEY', 'NEXT_PUBLIC_GEMINI_API_KEY', 'NEXT_PUBLIC_GOOGLE_API_KEY']
      : ['NEXT_PUBLIC_OPENAI_API_KEY'];

    const targetFiles = getTargetEnvFiles();
    const updatedFiles: string[] = [];

    for (const envFile of targetFiles) {
      let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : '';
      let fileModified = false;

      // Update primary key
      const regex = new RegExp(`^(?:export\\s+)?${primaryKey}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${primaryKey}="${cleanValue}"`);
        fileModified = true;
      } else {
        content = content.trim() + `\n${primaryKey}="${cleanValue}"\n`;
        fileModified = true;
      }

      // Also update any matching secondary keys already present in the file
      for (const secKey of secondaryKeys) {
        const secRegex = new RegExp(`^(?:export\\s+)?${secKey}=.*$`, 'm');
        if (secRegex.test(content)) {
          content = content.replace(secRegex, `${secKey}="${cleanValue}"`);
          fileModified = true;
        }
      }

      if (fileModified) {
        fs.writeFileSync(envFile, content.trim() + '\n', 'utf-8');
        updatedFiles.push(envFile);
      }
    }

    // Update in-memory runtime process.env
    process.env[primaryKey] = cleanValue;
    if (isGemini) {
      process.env['GOOGLE_API_KEY'] = cleanValue;
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${primaryKey} to: ${updatedFiles.map(f => path.basename(f)).join(', ')}`,
      updatedFiles
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
