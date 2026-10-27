import { NextRequest, NextResponse } from 'next/server';
import { uploadMediaFile } from '@/lib/storageService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedUrl = await uploadMediaFile(buffer, file.name, file.type || 'image/jpeg');

    return NextResponse.json({
      success: true,
      url: uploadedUrl,
      path: uploadedUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
