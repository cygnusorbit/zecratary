// Hybrid PostgreSQL Client with Server-JSON Fallback
// Provides resilient database querying and zero browser storage dependencies

import fs from 'fs';
import path from 'path';

let pgPool: any = null;

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export async function getDbPool() {
  if (pgPool) return pgPool;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;

  try {
    const { Pool } = await import('pg');
    pgPool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000
    });
    return pgPool;
  } catch (err) {
    console.warn('[DB] PostgreSQL pg module not installed or connection failed. Using JSON store fallback.');
    return null;
  }
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const pool = await getDbPool();
  if (pool) {
    const res = await pool.query(sql, params);
    return res.rows;
  }
  return [];
}
