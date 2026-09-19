import { NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getDbPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (connectionString) {
      pool = new Pool({ connectionString });
    }
  }
  return pool;
}

async function initTranslationsTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_translations (
      lang_code VARCHAR(10) PRIMARY KEY,
      lang_name VARCHAR(100) NOT NULL,
      dictionary JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// GET: Retrieve custom phrases for a language (or all)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const db = getDbPool();

    if (db) {
      const client = await db.connect();
      try {
        await initTranslationsTable(client);
        if (code) {
          const res = await client.query('SELECT dictionary FROM app_translations WHERE lang_code = $1', [code.toLowerCase().trim()]);
          const dictionary = res.rows[0]?.dictionary || {};
          return NextResponse.json({ success: true, code, dictionary });
        } else {
          const res = await client.query('SELECT lang_code, lang_name, dictionary FROM app_translations');
          const records: Record<string, any> = {};
          res.rows.forEach(r => { records[r.lang_code] = r.dictionary; });
          return NextResponse.json({ success: true, translations: records });
        }
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, translations: {}, fallback: true });
  } catch (error: any) {
    console.error('[API /api/admin/languages GET error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Upsert custom words into PostgreSQL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, dictionary } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Language code is required' }, { status: 400 });
    }

    const cleanCode = code.toLowerCase().trim();
    const cleanName = (name || cleanCode).trim();
    const dictObj = dictionary || {};

    const db = getDbPool();
    if (db) {
      const client = await db.connect();
      try {
        await initTranslationsTable(client);
        await client.query(`
          INSERT INTO app_translations (lang_code, lang_name, dictionary, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (lang_code) 
          DO UPDATE SET 
            lang_name = EXCLUDED.lang_name,
            dictionary = EXCLUDED.dictionary,
            updated_at = CURRENT_TIMESTAMP;
        `, [cleanCode, cleanName, JSON.stringify(dictObj)]);
        
        return NextResponse.json({ success: true, message: `Translations for ${cleanCode} stored in PostgreSQL` });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, message: 'Processed without PostgreSQL connection' });
  } catch (error: any) {
    console.error('[API /api/admin/languages POST error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
