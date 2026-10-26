import { NextRequest, NextResponse } from 'next/server';
import { uploadMediaFile } from '@/lib/storageService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Direct upload respecting /admin/storage settings (Supabase S3 or /recipes/images)
    const fileUrl = await uploadMediaFile(buffer, file.name, file.type || 'image/jpeg');

    return NextResponse.json({
      success: true,
      url: fileUrl,
      localUrl: fileUrl,
      imageUrl: fileUrl,
      filename: file.name
    });
  } catch (err: any) {
    console.error('[Upload API] Error uploading media:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
