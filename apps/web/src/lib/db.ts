// Universal Multi-Dialect Database Client (PostgreSQL & MySQL)
// GitHub: cygnusorbit/zecratary
// Satisfies Constraint 8: Adaptive SSL resolution without global process.env pollution

import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

declare const __non_webpack_require__: any;

declare global {
  // eslint-disable-next-line no-var
  var __zecratary_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __zecratary_current_conn: string | undefined;
  // eslint-disable-next-line no-var
  var __zecratary_ssl_unsupported: boolean | undefined;
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

export function formatQueryForDialect(sql: string): string {
  if (getDatabaseDialect() === 'mysql') {
    return sql.replace(/\$\d+/g, '?');
  }
  return sql;
}

export function isPlaintextHost(rawConnStr: string): boolean {
  if (!rawConnStr) return true;
  const lower = rawConnStr.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('::1') ||
    lower.includes('@postgres:') ||
    lower.includes('@db:') ||
    lower.includes('sslmode=disable') ||
    process.env.PGSSLMODE === 'disable'
  );
}

export function buildPoolConfig(rawConnStr: string, forcePlaintext = false): PoolConfig {
  const cleanConnStr = rawConnStr
    .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
    .replace(/[?&]$/, '');

  const isLocal = isPlaintextHost(rawConnStr);

  const isSupabaseOrPooler =
    rawConnStr.includes('supabase') ||
    rawConnStr.includes('pooler') ||
    rawConnStr.includes('aws-0') ||
    (rawConnStr.includes('sslmode=require') && !isLocal);

  const poolConfig: PoolConfig = {
    connectionString: cleanConnStr,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    max: 10,
  };

  // Driver-scoped SSL: Enable strictly for remote/pooler endpoints when not flagged as unsupported
  if (!forcePlaintext && !globalThis.__zecratary_ssl_unsupported && (!isLocal || isSupabaseOrPooler)) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return poolConfig;
}

export function getPool(forcePlaintext = false): Pool | null {
  const rawConnStr = getConnectionString();
  if (!rawConnStr || rawConnStr.includes('[YOUR-PASSWORD]')) {
    return null;
  }

  if (
    !forcePlaintext &&
    globalThis.__zecratary_pg_pool &&
    globalThis.__zecratary_current_conn === rawConnStr
  ) {
    return globalThis.__zecratary_pg_pool;
  }

  if (globalThis.__zecratary_pg_pool) {
    try {
      globalThis.__zecratary_pg_pool.end().catch(() => {});
    } catch (_) {}
    globalThis.__zecratary_pg_pool = undefined;
  }

  globalThis.__zecratary_current_conn = rawConnStr;

  const config = buildPoolConfig(rawConnStr, forcePlaintext);
  const newPool = new Pool(config);

  newPool.on('error', (err) => {
    console.warn('[PostgreSQL Pool Client Notice]:', err.message);
  });

  globalThis.__zecratary_pg_pool = newPool;
  return newPool;
}

/**
 * Universal Dual-Contract getDbPool()
 * Satisfies callers expecting activePool, activePool.pool, or activePool.dialect
 */
export function getDbPool(): any {
  const activePool: any = getPool();
  if (activePool) {
    activePool.pool = activePool;
    activePool.dialect = getDatabaseDialect();
    return activePool;
  }
  return {
    pool: null,
    dialect: getDatabaseDialect(),
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    }),
  };
}

/**
 * Dynamic Proxy Pool export satisfying import { pool } from '@/lib/db'
 */
export const pool: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const activePool: any = getPool();
      if (!activePool) {
        if (prop === 'query') return async () => ({ rows: [] });
        if (prop === 'connect') return async () => ({ query: async () => ({ rows: [] }), release: () => {} });
        if (prop === 'on') return () => {};
        return undefined;
      }
      const val = activePool[prop];
      if (typeof val === 'function') {
        return val.bind(activePool);
      }
      return val;
    },
  }
);

export async function query(sql: string, params: any[] = []): Promise<any> {
  const dialect = getDatabaseDialect();
  const connStr = getConnectionString();

  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
    return [];
  }

  if (dialect === 'postgres') {
    let activePool = getPool();
    if (!activePool) return [];

    let client: any = null;
    try {
      try {
        client = await activePool.connect();
      } catch (connectErr: any) {
        if (
          connectErr?.message &&
          connectErr.message.includes('The server does not support SSL connections')
        ) {
          globalThis.__zecratary_ssl_unsupported = true;
          activePool = getPool(true);
          if (!activePool) return [];
          client = await activePool.connect();
        } else {
          throw connectErr;
        }
      }

      const res = (!params || params.length === 0)
        ? await client.query(sql)
        : await client.query(sql, params);

      return Array.isArray(res) ? res : (res?.rows || []);
    } catch (err: any) {
      console.warn('[PostgreSQL Query Notice]:', err.message);
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (_) {}
      }
    }
  } else {
    try {
      let mysqlModule: any = null;
      try {
        mysqlModule = typeof __non_webpack_require__ !== 'undefined'
          ? __non_webpack_require__('mysql2/promise')
          : eval('require')('mysql2/promise');
      } catch (_) {
        mysqlModule = await import('mysql2/promise').catch(() => null);
      }

      if (!mysqlModule) {
        console.warn('[MySQL] mysql2 driver not available, falling back.');
        return [];
      }

      const connection = await mysqlModule.createConnection(connStr);
      try {
        const formattedSql = formatQueryForDialect(sql);
        const [rows] = await connection.execute(formattedSql, params);
        return rows;
      } finally {
        await connection.end().catch(() => {});
      }
    } catch (mysqlErr: any) {
      console.warn('[MySQL Query Notice]:', mysqlErr.message);
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
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
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

const dbDefault: any = new Proxy(
  {
    query,
    getPool,
    getDbPool,
    pool,
    transaction,
    getConnectionString,
    getDatabaseDialect,
    isPostgres,
    isMySQL,
    isPlaintextHost,
    buildPoolConfig,
    parseDbRows,
    parseDbRow,
    formatQueryForDialect,
    closePool,
  },
  {
    get(target: any, prop: string | symbol) {
      if (prop in target) {
        return target[prop];
      }
      const activePool: any = getPool();
      if (activePool && prop in activePool) {
        const val = activePool[prop];
        return typeof val === 'function' ? val.bind(activePool) : val;
      }
      return undefined;
    },
  }
);

export default dbDefault;
