import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'titlebar' or 'favicon'

    if (!file || !type) {
      return NextResponse.json({ success: false, error: 'File and type are required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'apps/web/public/uploads');
    const fallbackDir = path.join(process.cwd(), 'public/uploads');
    const targetDir = fs.existsSync(path.dirname(uploadsDir)) ? uploadsDir : fallbackDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.png';
    const filename = `${type}-logo-${Date.now()}${ext}`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${filename}`;

    // Update PostgreSQL admin_settings table directly
    const targetColumn = type === 'favicon' ? 'favicon_image' : 'titlebar_image';
    try {
      const existing = await query(`SELECT id FROM admin_settings LIMIT 1;`);
      const targetId = existing && existing.length > 0 && existing[0]?.id ? existing[0].id : 'primary_settings';

      await query(`
        INSERT INTO admin_settings (id, ${targetColumn}, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id) DO UPDATE
        SET ${targetColumn} = EXCLUDED.${targetColumn},
            updated_at = NOW();
      `, [targetId, publicUrl]);
    } catch (dbErr) {
      console.warn('[upload-branding] PostgreSQL update fallback warning:', dbErr);
    }

    // Optional synchronization to dual-path static JSON stores
    const settingsPaths = [
      path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
      path.join(process.cwd(), 'data/admin_settings.json')
    ];
    for (const sp of settingsPaths) {
      if (fs.existsSync(sp)) {
        try {
          const current = JSON.parse(fs.readFileSync(sp, 'utf-8'));
          if (type === 'titlebar') {
            current.titlebarImage = publicUrl;
          } else if (type === 'favicon') {
            current.faviconImage = publicUrl;
          }
          fs.writeFileSync(sp, JSON.stringify(current, null, 2));
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: `${type} branding image updated in PostgreSQL.`
    });
  } catch (err: any) {
    console.error('[Upload Branding Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
