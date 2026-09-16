// Strict PostgreSQL Database Client
// 100% Database Persistence - No JSON Fallback

import { Pool, types } from 'pg';

let pgPool: Pool | null = null;

export function getConnectionString(): string {
  const connUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connUrl) {
    throw new Error('[DB FATAL] DATABASE_URL environment variable is missing. A valid PostgreSQL connection is required.');
  }
  return connUrl;
}

export async function getDbPool(): Promise<Pool> {
  if (pgPool) return pgPool;
  const connectionString = getConnectionString();

  pgPool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pgPool;
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const pool = await getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const pool = await getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Parse PostgreSQL NUMERIC (OID 1700) directly into JavaScript numbers
if (typeof types !== 'undefined' && types.setTypeParser) {
  types.setTypeParser(1700, (val: string) => (val === null ? 0 : parseFloat(val)));
}
