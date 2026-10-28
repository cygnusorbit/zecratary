// Universal Multi-Dialect Database Client (PostgreSQL & MySQL)
// GitHub: cygnusorbit/zecratary
// Satisfies Constraints 8 & 10: PostgreSQL & MySQL persistence with getDbPool, pool proxy & adaptive SSL

import { Pool, PoolConfig } from 'pg';

declare const __non_webpack_require__: any;

declare global {
  // eslint-disable-next-line no-var
  var __zecratary_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __zecratary_current_conn: string | undefined;
  // eslint-disable-next-line no-var
  var __zecratary_is_plaintext_only: boolean | undefined;
}

export function getConnectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.MYSQL_URL ||
    ''
  );
}

export function getDatabaseDialect(): 'postgres' | 'mysql' {
  const envDialect = process.env.DATABASE_DIALECT?.toLowerCase();
  if (envDialect === 'mysql') return 'mysql';
  if (envDialect === 'postgres' || envDialect === 'postgresql') return 'postgres';

  const connStr = getConnectionString().toLowerCase();
  if (connStr.startsWith('mysql://')) return 'mysql';
  return 'postgres';
}

export function isPostgres(): boolean {
  return getDatabaseDialect() === 'postgres';
}

export function isMySQL(): boolean {
  return getDatabaseDialect() === 'mysql';
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

export function getPool(): Pool | null {
  const rawConnStr = getConnectionString();
  if (!rawConnStr || rawConnStr.includes('[YOUR-PASSWORD]')) {
    return null;
  }

  // Reuse existing pool instance if connection string is unchanged
  if (globalThis.__zecratary_pg_pool && globalThis.__zecratary_current_conn === rawConnStr) {
    return globalThis.__zecratary_pg_pool;
  }

  if (globalThis.__zecratary_pg_pool) {
    try {
      globalThis.__zecratary_pg_pool.end().catch(() => {});
    } catch (_) {}
    globalThis.__zecratary_pg_pool = undefined;
  }

  globalThis.__zecratary_current_conn = rawConnStr;

  const isLocalHost = 
    rawConnStr.includes('localhost') || 
    rawConnStr.includes('127.0.0.1') || 
    rawConnStr.includes('::1') ||
    rawConnStr.includes('0.0.0.0') ||
    rawConnStr.includes('@postgres:') ||
    rawConnStr.includes('@db:') ||
    rawConnStr.includes('sslmode=disable');

  const isSupabaseOrPooler =
    rawConnStr.includes('supabase') ||
    rawConnStr.includes('pooler') ||
    rawConnStr.includes('aws-0') ||
    rawConnStr.includes('sslmode=require');

  const cleanConnStr = rawConnStr
    .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
    .replace(/[?&]$/, '');

  const poolConfig: PoolConfig = {
    connectionString: cleanConnStr,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10,
  };

  if (globalThis.__zecratary_is_plaintext_only || isLocalHost) {
    poolConfig.ssl = false;
  } else if (isSupabaseOrPooler || !isLocalHost) {
    poolConfig.ssl = { rejectUnauthorized: false };
    if (typeof process !== 'undefined' && process.env) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  const newPool = new Pool(poolConfig);

  newPool.on('error', (err) => {
    if (!err.message?.includes('SSL')) {
      console.warn('[PostgreSQL Pool Notice]:', err.message);
    }
  });

  globalThis.__zecratary_pg_pool = newPool;
  return newPool;
}

// Universal getDbPool satisfying both direct pool access and { pool, dialect } callers
export function getDbPool(): any {
  const p: any = getPool();
  if (!p) return null;
  p.pool = p;
  p.dialect = getDatabaseDialect();
  p.query = query;
  return p;
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  const dialect = getDatabaseDialect();
  const connStr = getConnectionString();

  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
    return [];
  }

  if (dialect === 'postgres') {
    let pool = getPool();
    if (!pool) return [];

    let client: any = null;
    try {
      client = await pool.connect();
      const res = await client.query(sql, params);
      const rows = Array.isArray(res) ? res : (res?.rows || []);
      (rows as any).rows = rows;
      return rows;
    } catch (err: any) {
      // Automatic recovery if server rejects SSL with "does not support SSL connections"
      if (err.message && (err.message.includes('does not support SSL') || err.message.includes('SSL connection'))) {
        globalThis.__zecratary_is_plaintext_only = true;
        if (globalThis.__zecratary_pg_pool) {
          try { await globalThis.__zecratary_pg_pool.end(); } catch (_) {}
          globalThis.__zecratary_pg_pool = undefined;
        }
        pool = getPool();
        if (pool) {
          try {
            client = await pool.connect();
            const retryRes = await client.query(sql, params);
            const rRows = Array.isArray(retryRes) ? retryRes : (retryRes?.rows || []);
            (rRows as any).rows = rRows;
            return rRows;
          } finally {
            if (client) {
              try { client.release(); } catch (_) {}
            }
          }
        }
      }
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (_) {}
      }
    }
  } else {
    // MySQL query executor with isolated runtime loader
    try {
      let mysqlModule: any = null;
      try {
        mysqlModule = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__('mysql2/promise') : eval('require')('mysql2/promise');
      } catch (_) {
        mysqlModule = await import('mysql2/promise').catch(() => null);
      }

      if (!mysqlModule) {
        return [];
      }

      const connection = await mysqlModule.createConnection(connStr);
      try {
        const [rows] = await connection.execute(sql, params);
        if (Array.isArray(rows)) {
          (rows as any).rows = rows;
        }
        return rows;
      } finally {
        await connection.end().catch(() => {});
      }
    } catch (mysqlErr: any) {
      throw mysqlErr;
    }
  }
}

export async function transaction<T = any>(callback: (client: any) => Promise<T>): Promise<T> {
  const p = getPool();
  if (!p) throw new Error('Database pool not available');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (globalThis.__zecratary_pg_pool) {
    try {
      await globalThis.__zecratary_pg_pool.end();
    } catch (_) {}
    globalThis.__zecratary_pg_pool = undefined;
  }
}

// Named pool export Proxy that delegates dynamically to the active connection pool
export const pool: any = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'getDbPool') return getDbPool;
    if (prop === 'query') return query;
    if (prop === 'getPool') return getPool;
    if (prop === 'dialect') return getDatabaseDialect();
    const active = getPool();
    if (!active) return undefined;
    if (prop === 'pool') return active;
    const val = (active as any)[prop];
    return typeof val === 'function' ? val.bind(active) : val;
  }
});

// Dynamic Default Export Proxy
const defaultExport: any = new Proxy(
  {
    query,
    getDatabaseDialect,
    getConnectionString,
    getPool,
    getDbPool,
    isPostgres,
    isMySQL,
    parseDbRows,
    parseDbRow,
    closePool,
    pool,
    transaction,
  },
  {
    get(target: any, prop: string | symbol) {
      if (prop in target) {
        return target[prop];
      }
      const active = getPool();
      if (active && prop in active) {
        const val = (active as any)[prop];
        return typeof val === 'function' ? val.bind(active) : val;
      }
      return undefined;
    }
  }
);

export default defaultExport;
