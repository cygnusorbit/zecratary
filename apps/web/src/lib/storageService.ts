// Centralized Media Storage Engine (Canonical apps/web/public/recipes)
// GitHub: cygnusorbit/zecratary (Constraints 8, 9, 10)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from '@/lib/db';

export interface StorageConfig {
  provider: 'localhost' | 'supabase';
  localhost: {
    uploadDir: string;
    publicPrefix: string;
    recipesJsonDir: string;
    maxSizeMb: number;
    allowedTypes?: string;
  };
  supabase: {
    enabled: boolean;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  };
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  provider: 'localhost',
  localhost: {
    uploadDir: 'apps/web/public/recipes/images',
    publicPrefix: '/recipes/images',
    recipesJsonDir: 'apps/web/public/recipes',
    maxSizeMb: 10,
    allowedTypes: 'image/jpeg, image/png, image/webp, image/gif, image/avif',
  },
  supabase: {
    enabled: true,
    endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
    region: 'us-west-1',
    accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
    secretAccessKey: '',
    bucket: 'recipes',
    publicUrl: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
  },
};

let memoryStorageConfig: StorageConfig = { ...DEFAULT_STORAGE_CONFIG };

export function getCanonicalWebPublicDir(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'public')) && (fs.existsSync(path.join(cwd, 'src', 'app')) || fs.existsSync(path.join(cwd, 'app')))) {
    return path.join(cwd, 'public');
  }
  if (fs.existsSync(path.join(cwd, 'apps', 'web', 'public'))) {
    return path.join(cwd, 'apps', 'web', 'public');
  }
  if (fs.existsSync(path.join(cwd, 'public'))) {
    return path.join(cwd, 'public');
  }
  return path.join(cwd, 'apps', 'web', 'public');
}

export async function getStorageSettings(): Promise<StorageConfig> {
  try {
    const res: any = await query('SELECT storage_settings FROM admin_settings WHERE id = $1;', ['primary_settings']);
    const row = Array.isArray(res) ? res[0] : res?.rows?.[0];
    if (row && row.storage_settings) {
      const parsed = typeof row.storage_settings === 'string'
        ? JSON.parse(row.storage_settings)
        : row.storage_settings;
      memoryStorageConfig = {
        ...DEFAULT_STORAGE_CONFIG,
        ...parsed,
        localhost: { ...DEFAULT_STORAGE_CONFIG.localhost, ...(parsed.localhost || {}) },
        supabase: { ...DEFAULT_STORAGE_CONFIG.supabase, ...(parsed.supabase || {}) },
      };
      return memoryStorageConfig;
    }
  } catch (_) {}

  // Fallback to local server JSON store
  try {
    const jsonPaths = [
      path.join(process.cwd(), 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    ];
    for (const jp of jsonPaths) {
      if (fs.existsSync(jp)) {
        const fileData = JSON.parse(fs.readFileSync(jp, 'utf8'));
        if (fileData.storage_settings) {
          memoryStorageConfig = {
            ...DEFAULT_STORAGE_CONFIG,
            ...fileData.storage_settings,
            localhost: { ...DEFAULT_STORAGE_CONFIG.localhost, ...(fileData.storage_settings.localhost || {}) },
            supabase: { ...DEFAULT_STORAGE_CONFIG.supabase, ...(fileData.storage_settings.supabase || {}) },
          };
          return memoryStorageConfig;
        }
      }
    }
  } catch (_) {}

  return memoryStorageConfig;
}

export async function saveStorageSettings(config: Partial<StorageConfig>): Promise<StorageConfig> {
  const current = await getStorageSettings();
  const merged: StorageConfig = {
    ...current,
    ...config,
    localhost: { ...current.localhost, ...(config.localhost || {}) },
    supabase: { ...current.supabase, ...(config.supabase || {}) },
  };

  memoryStorageConfig = merged;

  // 1. Commit to PostgreSQL & MySQL
  try {
    await query(`
      INSERT INTO admin_settings (id, storage_settings, updated_at)
      VALUES ('primary_settings', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        storage_settings = EXCLUDED.storage_settings,
        updated_at = NOW();
    `, [JSON.stringify(merged)]);
  } catch (err: any) {
    console.warn('[StorageService] PostgreSQL commit notice:', err.message);
  }

  // 2. Mirror to Server JSON stores
  const jsonPaths = [
    path.join(process.cwd(), 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
  ];

  for (const jp of jsonPaths) {
    try {
      const dir = path.dirname(jp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let existing = {};
      if (fs.existsSync(jp)) {
        try { existing = JSON.parse(fs.readFileSync(jp, 'utf8')); } catch (_) {}
      }
      (existing as any).storage_settings = merged;
      fs.writeFileSync(jp, JSON.stringify(existing, null, 2), 'utf8');
    } catch (_) {}
  }

  return merged;
}

// Native AWS S3 SigV4 Upload Implementation for Supabase S3 Gateway
export async function uploadToSupabaseS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
  config: StorageConfig['supabase']
): Promise<string> {
  const endpoint = config.endpoint.replace(/\/+$/, '');
  const bucket = config.bucket.trim();
  const region = config.region.trim() || 'us-west-1';
  const accessKey = config.accessKeyId.trim();
  const secretKey = config.secretAccessKey.trim();

  if (!accessKey || !secretKey) {
    throw new Error('Supabase S3 Access Key ID or Secret Access Key is missing');
  }

  const endpointUrl = new URL(endpoint);
  const host = endpointUrl.host;
  const canonicalUri = `${endpointUrl.pathname}/${bucket}/${encodeURIComponent(filename)}`.replace(/\/+/g, '/');

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

  function getSignatureKey(key: string, date: string, reg: string, service: string) {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(reg).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  }

  const signingKey = getSignatureKey(secretKey, dateStamp, region, 's3');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const uploadTargetUrl = `${endpointUrl.protocol}//${host}${canonicalUri}`;

  const res = await fetch(uploadTargetUrl, {
    method: 'PUT',
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase S3 upload failed (HTTP ${res.status}): ${errorText}`);
  }

  if (config.publicUrl) {
    const base = config.publicUrl.replace(/\/+$/, '');
    return `${base}/${filename}`;
  }

  return uploadTargetUrl;
}

export async function uploadMediaFile(
  buffer: Buffer,
  originalFilename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const settings = await getStorageSettings();
  const ext = path.extname(originalFilename) || '.jpg';
  const cleanName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;

  if (settings.provider === 'supabase' && settings.supabase.enabled && settings.supabase.secretAccessKey) {
    try {
      return await uploadToSupabaseS3(buffer, cleanName, contentType, settings.supabase);
    } catch (err: any) {
      console.warn('[Storage] Supabase S3 failed, falling back to apps/web/public/recipes/images:', err.message);
    }
  }

  const targetDir = path.join(getCanonicalWebPublicDir(), 'recipes', 'images');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, cleanName), buffer);

  const prefix = settings.localhost.publicPrefix || '/recipes/images';
  return `${prefix}/${cleanName}`;
}

export function cleanOrphanRecipeImages(): { removedCount: number; remainingCount: number; recipesCount: number } {
  const publicDir = getCanonicalWebPublicDir();
  const recipesDir = path.join(publicDir, 'recipes');
  const imagesDir = path.join(recipesDir, 'images');

  if (!fs.existsSync(imagesDir) || !fs.existsSync(recipesDir)) {
    return { removedCount: 0, remainingCount: 0, recipesCount: 0 };
  }

  const jsonFiles = fs.readdirSync(recipesDir).filter(f => f.endsWith('.json') && !f.includes('index.json') && !f.startsWith('package'));
  const activeImageFilenames = new Set<string>();

  jsonFiles.forEach(jf => {
    try {
      const raw = fs.readFileSync(path.join(recipesDir, jf), 'utf-8');
      const data = JSON.parse(raw);
      const imgUrl = data.imageUrl || data.image || data.image_url;
      if (imgUrl && typeof imgUrl === 'string') {
        const basename = path.basename(imgUrl.split('?')[0]);
        if (basename) activeImageFilenames.add(basename);
      }
    } catch (_) {}
  });

  const diskImages = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(f));
  let removedCount = 0;

  diskImages.forEach(img => {
    if (!activeImageFilenames.has(img)) {
      try {
        fs.unlinkSync(path.join(imagesDir, img));
        removedCount++;
      } catch (_) {}
    }
  });

  const remainingCount = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(f)).length;
  return { removedCount, remainingCount, recipesCount: jsonFiles.length };
}

export function getUniversalDiskDiagnostics() {
  const publicDir = getCanonicalWebPublicDir();
  const recipesDir = path.join(publicDir, 'recipes');
  const imagesDir = path.join(recipesDir, 'images');

  let recipesCount = 0;
  let imagesCount = 0;
  let jsonDirWritable = false;
  let imagesDirWritable = false;

  try {
    if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });
    recipesCount = fs.readdirSync(recipesDir).filter(f => f.endsWith('.json') && !f.startsWith('package')).length;
    fs.accessSync(recipesDir, fs.constants.W_OK);
    jsonDirWritable = true;
  } catch (_) {}

  try {
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    imagesCount = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(f)).length;
    fs.accessSync(imagesDir, fs.constants.W_OK);
    imagesDirWritable = true;
  } catch (_) {}

  return {
    recipesCount,
    imagesCount,
    jsonDirWritable,
    imagesDirWritable,
    jsonDirPath: 'apps/web/public/recipes',
    imagesDirPath: 'apps/web/public/recipes/images',
  };
}
