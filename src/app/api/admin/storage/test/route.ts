import { NextRequest, NextResponse } from 'next/server';
import { uploadToSupabaseS3, StorageConfig } from '@/lib/storageService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body: StorageConfig['supabase'] = await req.json();

    if (!body.endpoint || !body.endpoint.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Valid S3 endpoint URL is required.' }, { status: 400 });
    }
    if (!body.accessKeyId || !body.accessKeyId.trim()) {
      return NextResponse.json({ success: false, error: 'Access Key ID is required.' }, { status: 400 });
    }
    if (!body.secretAccessKey || !body.secretAccessKey.trim()) {
      return NextResponse.json({ success: false, error: 'Secret Access Key is required.' }, { status: 400 });
    }
    if (!body.bucket || !body.bucket.trim()) {
      return NextResponse.json({ success: false, error: 'Bucket name is required.' }, { status: 400 });
    }

    // Run S3 probe test by writing and reading a lightweight healthcheck key
    const testBuffer = Buffer.from('Zecratary S3 Connection Verification OK', 'utf-8');
    const testKey = `_connection_test_${Date.now()}.txt`;

    const publicUrl = await uploadToSupabaseS3(testBuffer, testKey, 'text/plain', body);

    return NextResponse.json({
      success: true,
      message: `Successfully connected to Supabase S3! Bucket "${body.bucket}" is accessible.`,
      verifiedUrl: publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Connection test failed. Please verify your S3 Endpoint, Bucket, and Secret Access Key.',
    }, { status: 400 });
  }
}
