import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getLangDirectory() {
  const possiblePaths = [
    path.join(process.cwd(), 'apps/web/src/lib/lang'),
    path.join(process.cwd(), 'src/lib/lang'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

function syncIndexFile(langDir: string) {
  const indexPath = path.join(langDir, 'index.ts');
  const files = fs.readdirSync(langDir).filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.d.ts')
  );
  const codes = files.map((f) => f.replace(/\.ts$/, '')).sort();

  const exportsStr = codes.map((c) => `export { ${c} } from './${c}';`).join('\n');
  const importsStr = codes.map((c) => `import { ${c} } from './${c}';`).join('\n');
  const dictEntries = codes.map((c) => `  ${c},`).join('\n');

  const content = `${exportsStr}\n\n${importsStr}\n\nexport const DEFAULT_DICTIONARIES: Record<string, Record<string, string>> = {\n${dictEntries}\n};\n\nexport const dictionaries = DEFAULT_DICTIONARIES;\nexport default DEFAULT_DICTIONARIES;\n`;

  fs.writeFileSync(indexPath, content, 'utf8');
}

export async function POST(req: NextRequest) {
  try {
    const { code, name, dictionary } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Language code is required.' }, { status: 400 });
    }

    const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const langDir = getLangDirectory();
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    const filePath = path.join(langDir, `${cleanCode}.ts`);
    const dict = dictionary && typeof dictionary === 'object' ? dictionary : {};

    const formattedLines = Object.keys(dict).map((key) => {
      return `  ${JSON.stringify(key)}: ${JSON.stringify(String(dict[key]))},`;
    });

    const fileContent = `// ${name || cleanCode.toUpperCase()} Language Dictionary\n` +
      `export const ${cleanCode}: Record<string, string> = {\n` +
      formattedLines.join('\n') +
      `\n};\n\nexport default ${cleanCode};\n`;

    fs.writeFileSync(filePath, fileContent, 'utf8');

    // Fully regenerate index.ts to ensure syntax validity with trailing commas
    syncIndexFile(langDir);

    return NextResponse.json({ success: true, file: `${cleanCode}.ts` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create language file' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Language code is required.' }, { status: 400 });
    }

    const cleanCode = code.trim().toLowerCase();
    if (cleanCode === 'en') {
      return NextResponse.json({ error: 'English language file cannot be deleted.' }, { status: 400 });
    }

    const langDir = getLangDirectory();
    const filePath = path.join(langDir, `${cleanCode}.ts`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Fully regenerate index.ts without deleted code
    syncIndexFile(langDir);

    return NextResponse.json({ success: true, removed: `${cleanCode}.ts` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete language file' }, { status: 500 });
  }
}
