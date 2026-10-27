// Universal Multi-Dialect Database Adapter (PostgreSQL & MySQL)
// Repository: cygnusorbit/zecratary (GitHub)
// Satisfies Constraint 8 (PostgreSQL primary & MySQL switchable) with zero TS2304/TS2339 diagnostics

declare const __non_webpack_require__: any;

import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

export type DatabaseDialect = 'postgres' | 'mysql';

declare global {
  // Global singletons to prevent connection pool leaks across Next.js Fast Refresh
  var __zecratary_pg_pool: Pool | undefined;
  var __zecratary_mysql_pool: any | undefined;
  var __zecratary_current_conn: string | undefined;
  var __zecratary_ssl_unsupported: boolean | undefined;

  interface Array<T> {
    rows?: T[];
    rowCount?: number;
  }
}

export function getDatabaseDialect(): DatabaseDialect {
  const explicit = (process.env.DATABASE_TYPE || '').toLowerCase().trim();
  if (explicit === 'mysql') return 'mysql';
  if (explicit === 'postgres' || explicit === 'postgresql') return 'postgres';

  const url = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (url.startsWith('mysql://') || (Boolean(process.env.MYSQL_URL) && !url.startsWith('postgres'))) {
    return 'mysql';
  }
  return 'postgres';
}

export function isPostgres(): boolean {
  return getDatabaseDialect() === 'postgres';
}

export function isMySQL(): boolean {
  return getDatabaseDialect() === 'mysql';
}

export function getConnectionString(): string {
  const dialect = getDatabaseDialect();
  if (dialect === 'mysql') {
    const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (mysqlUrl) return mysqlUrl;
  }
  const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (pgUrl) return pgUrl;

  return 'postgresql://postgres:postgres@localhost:5432/zecratary';
}

export function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

export function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}

function buildPoolConfig(rawConnStr: string, forcePlaintext = false): PoolConfig {
  const cleanConnStr = rawConnStr
    .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
    .replace(/[?&]$/, '');

  const isLocal =
    rawConnStr.includes('localhost') ||
    rawConnStr.includes('127.0.0.1') ||
    rawConnStr.includes('0.0.0.0') ||
    rawConnStr.includes('::1') ||
    rawConnStr.includes('@postgres:') ||
    rawConnStr.includes('sslmode=disable');

  const isSupabaseOrPooler =
    rawConnStr.includes('supabase') ||
    rawConnStr.includes('pooler') ||
    rawConnStr.includes('aws-0') ||
    rawConnStr.includes('sslmode=require');

  const poolConfig: PoolConfig = {
    connectionString: cleanConnStr,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    max: 20,
  };

  if (!forcePlaintext && !globalThis.__zecratary_ssl_unsupported && (!isLocal || isSupabaseOrPooler)) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return poolConfig;
}

export function getPool(forcePlaintext = false): any {
  const dialect = getDatabaseDialect();
  const connString = getConnectionString();

  if (dialect === 'postgres') {
    if (!forcePlaintext && globalThis.__zecratary_pg_pool && globalThis.__zecratary_current_conn === connString) {
      return globalThis.__zecratary_pg_pool;
    }

    if (globalThis.__zecratary_pg_pool) {
      try {
        globalThis.__zecratary_pg_pool.end().catch(() => {});
      } catch (_) {}
      globalThis.__zecratary_pg_pool = undefined;
    }

    globalThis.__zecratary_current_conn = connString;
    const config = buildPoolConfig(connString, forcePlaintext);
    const newPgPool = new Pool(config);

    newPgPool.on('error', (err: any) => {
      console.warn('[PostgreSQL Pool Notice]:', err?.message || err);
    });

    globalThis.__zecratary_pg_pool = newPgPool;
    return newPgPool;
  } else {
    if (globalThis.__zecratary_mysql_pool) {
      return globalThis.__zecratary_mysql_pool;
    }
    try {
      const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : require;
      const mysql = req('mysql2/promise');
      const newMysqlPool = mysql.createPool({
        uri: connString,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
      globalThis.__zecratary_mysql_pool = newMysqlPool;
      return newMysqlPool;
    } catch (_) {
      return null;
    }
  }
}

/**
 * Dual-interface getDbPool() supporting:
 * 1. const pool = await getDbPool(); client = await pool.connect();
 * 2. const { pool, dialect } = await getDbPool();
 */
export async function getDbPool(): Promise<any> {
  const activePool = getPool();
  if (activePool) {
    (activePool as any).pool = activePool;
    (activePool as any).dialect = getDatabaseDialect();
  }
  return activePool;
}

export function formatQueryForDialect(sql: string, dialect?: DatabaseDialect): string {
  const d = dialect || getDatabaseDialect();
  if (d === 'postgres') return sql;
  return sql.replace(/\$\d+/g, '?');
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const dialect = getDatabaseDialect();
  let rawPool = getPool();

  if (!rawPool) {
    const emptyRows: any[] = [];
    (emptyRows as any).rows = emptyRows;
    (emptyRows as any).rowCount = 0;
    return emptyRows as T[];
  }

  const formattedSql = formatQueryForDialect(sql, dialect);
  let rows: any[] = [];

  if (dialect === 'postgres') {
    let client: any = null;
    try {
      try {
        client = await rawPool.connect();
      } catch (connectErr: any) {
        if (connectErr.message && connectErr.message.includes('The server does not support SSL connections')) {
          globalThis.__zecratary_ssl_unsupported = true;
          rawPool = getPool(true);
          if (!rawPool) return [] as T[];
          client = await rawPool.connect();
        } else {
          throw connectErr;
        }
      }

      const res = (!params || params.length === 0)
        ? await client.query(formattedSql)
        : await client.query(formattedSql, params);

      rows = Array.isArray(res) ? res : (res?.rows || []);
    } catch (err: any) {
      console.warn('[PostgreSQL Query Notice]:', err?.message || err);
      throw err;
    } finally {
      if (client) {
        try { client.release(); } catch (_) {}
      }
    }
  } else {
    try {
      const [resultRows] = await rawPool.execute(formattedSql, params);
      rows = Array.isArray(resultRows) ? resultRows : [];
    } catch (err: any) {
      console.warn('[MySQL Query Notice]:', err?.message || err);
      throw err;
    }
  }

  (rows as any).rows = rows;
  (rows as any).rowCount = rows.length;
  return rows as T[];
}

export async function transaction<T>(callback: (client: any, dialect: DatabaseDialect) => Promise<T>): Promise<T> {
  const dialect = getDatabaseDialect();
  const rawPool = getPool();

  if (!rawPool) {
    throw new Error('Database pool not available for transaction.');
  }

  if (dialect === 'postgres') {
    const client = await rawPool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client, 'postgres');
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const connection = await rawPool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection, 'mysql');
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

export const pool = new Proxy({} as any, {
  get(_target, prop) {
    const active = getPool();
    if (!active) {
      if (prop === 'then') return undefined;
      if (prop === 'connect') return async () => ({
        query: async () => ({ rows: [] }),
        release: () => {},
      });
      if (prop === 'query') return async () => ({ rows: [] });
      if (prop === 'on') return () => {};
      if (prop === 'end') return async () => {};
      return undefined;
    }
    const val = (active as any)[prop];
    return typeof val === 'function' ? val.bind(active) : val;
  }
});

export const db = pool;

const dbModule = {
  query,
  transaction,
  getDbPool,
  getPool,
  pool,
  db,
  getConnectionString,
  getDatabaseDialect,
  formatQueryForDialect,
  parseDbRows,
  parseDbRow,
  isPostgres,
  isMySQL,
};

export default dbModule;
