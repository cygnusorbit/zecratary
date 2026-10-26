// Universal Multi-Dialect Database Client (PostgreSQL & MySQL)
// GitHub: cygnusorbit/zecratary (Constraints 8, 10)

import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __zecratary_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __zecratary_current_conn: string | undefined;
  // eslint-disable-next-line no-var
  var __zecratary_ssl_disabled: boolean | undefined;
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

export function getPool(forceNoSsl = false): Pool | null {
  const rawConnStr = getConnectionString();
  if (!rawConnStr || rawConnStr.includes('[YOUR-PASSWORD]')) {
    return null;
  }

  const shouldDisableSsl = forceNoSsl || globalThis.__zecratary_ssl_disabled;

  // Reuse existing pool instance if connection string and SSL state are unchanged
  if (globalThis.__zecratary_pg_pool && globalThis.__zecratary_current_conn === rawConnStr && !forceNoSsl) {
    return globalThis.__zecratary_pg_pool;
  }

  if (globalThis.__zecratary_pg_pool) {
    try {
      globalThis.__zecratary_pg_pool.end().catch(() => {});
    } catch (_) {}
    globalThis.__zecratary_pg_pool = undefined;
  }

  globalThis.__zecratary_current_conn = rawConnStr;

  const isLocal =
    rawConnStr.includes('localhost') ||
    rawConnStr.includes('127.0.0.1') ||
    rawConnStr.includes('@postgres:') ||
    rawConnStr.includes('sslmode=disable') ||
    process.env.PGSSLMODE === 'disable';

  const isSupabaseOrPooler =
    rawConnStr.includes('supabase') ||
    rawConnStr.includes('pooler') ||
    rawConnStr.includes('aws-0') ||
    rawConnStr.includes('sslmode=require');

  // Strip conflicting sslmode query parameters to allow explicit driver configuration
  const cleanConnStr = rawConnStr
    .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
    .replace(/[?&]$/, '');

  const poolConfig: PoolConfig = {
    connectionString: cleanConnStr,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  };

  if (!shouldDisableSsl && !isLocal && isSupabaseOrPooler) {
    poolConfig.ssl = { rejectUnauthorized: false };
  } else {
    poolConfig.ssl = false;
  }

  const newPool = new Pool(poolConfig);

  newPool.on('error', (err) => {
    console.warn('[PostgreSQL Pool Notice]:', err.message);
  });

  globalThis.__zecratary_pg_pool = newPool;
  return newPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const activePool = getPool();
    if (!activePool) {
      if (prop === 'query') return async () => ({ rows: [], rowCount: 0 });
      return undefined;
    }
    const val = (activePool as any)[prop];
    return typeof val === 'function' ? val.bind(activePool) : val;
  },
});

export async function query(sql: string, params: any[] = []): Promise<any> {
  const dialect = getDatabaseDialect();
  const connStr = getConnectionString();

  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
    return [];
  }

  if (dialect === 'postgres') {
    let poolInstance = getPool();
    if (!poolInstance) return [];

    let client: any = null;
    try {
      try {
        client = await poolInstance.connect();
      } catch (connErr: any) {
        // Automatic fallback when local PostgreSQL does not support SSL
        if (
          connErr?.message?.includes('does not support SSL') ||
          connErr?.message?.includes('SSL connections')
        ) {
          globalThis.__zecratary_ssl_disabled = true;
          poolInstance = getPool(true);
          if (poolInstance) {
            client = await poolInstance.connect();
          } else {
            throw connErr;
          }
        } else {
          throw connErr;
        }
      }

      const res = await client.query(sql, params);
      const rows = Array.isArray(res) ? res : (res?.rows || []);
      (rows as any).rows = rows;
      (rows as any).rowCount = res?.rowCount ?? rows.length;
      return rows;
    } catch (err: any) {
      console.warn('[PostgreSQL Query Notice]:', err.message);
      throw err;
    } finally {
      if (client) {
        try { client.release(); } catch (_) {}
      }
    }
  } else {
    try {
      let mysqlModule: any = null;
      try {
        // @ts-ignore
        mysqlModule = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__('mysql2/promise') : eval('require')('mysql2/promise');
      } catch (_) {
        mysqlModule = await import('mysql2/promise').catch(() => null);
      }

      if (!mysqlModule) {
        console.warn('[MySQL] mysql2 driver not available, falling back.');
        return [];
      }

      const connection = await mysqlModule.createConnection(connStr);
      try {
        const [rows] = await connection.execute(sql, params);
        const result = Array.isArray(rows) ? rows : [rows];
        (result as any).rows = result;
        return result;
      } finally {
        await connection.end().catch(() => {});
      }
    } catch (mysqlErr: any) {
      console.warn('[MySQL Query Notice]:', mysqlErr.message);
      throw mysqlErr;
    }
  }
}

export async function closePool(): Promise<void> {
  if (globalThis.__zecratary_pg_pool) {
    try { await globalThis.__zecratary_pg_pool.end(); } catch (_) {}
    globalThis.__zecratary_pg_pool = undefined;
  }
}

export default {
  pool,
  query,
  getDatabaseDialect,
  getConnectionString,
  getPool,
  isPostgres,
  isMySQL,
  parseDbRows,
  closePool,
};
