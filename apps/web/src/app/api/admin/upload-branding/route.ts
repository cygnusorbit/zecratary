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
    fs.makedirsSync ? fs.makedirsSync(targetDir) : fs.mkdirSync(targetDir, { recursive: true });

    const ext = path.extname(file.name) || '.png';
    const filename = `${type}-logo-${Date.now()}${ext}`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${filename}`;

    // Update PostgreSQL admin_settings table directly
    if (type === 'titlebar') {
      await query(`
        UPDATE admin_settings SET
          titlebar_image = $1,
          updated_at = NOW()
        WHERE id = 'primary_settings'
      `, [publicUrl]);
    } else if (type === 'favicon') {
      await query(`
        UPDATE admin_settings SET
          favicon_image = $1,
          updated_at = NOW()
        WHERE id = 'primary_settings'
      `, [publicUrl]);
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: `${type} branding image updated in PostgreSQL.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
