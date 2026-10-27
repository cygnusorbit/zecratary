// Universal Multi-Dialect Database Client (PostgreSQL & MySQL)
// GitHub: cygnusorbit/zecratary
// Satisfies Constraint 8: Adaptive SSL resolution without global process.env pollution

declare const __non_webpack_require__: any;

import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

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

  // Reuse existing pool instance if connection string and SSL mode match
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

// Universal getDbPool export satisfying callers expecting direct pool or { pool, dialect }
export async function getDbPool(): Promise<any> {
  const p = getPool();
  if (!p) {
    return {
      pool: null,
      dialect: getDatabaseDialect(),
      query: async () => ({ rows: [], rowCount: 0 }),
      connect: async () => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      }),
    };
  }
  (p as any).pool = p;
  (p as any).dialect = getDatabaseDialect();
  return p;
}

// Proxied pool export ensuring full compatibility with both named and default imports
export const pool: any = new Proxy({}, {
  get(_target, prop) {
    const p = getPool();
    if (!p) {
      if (prop === 'then') return undefined;
      if (prop === 'connect') {
        return async () => ({
          query: async () => ({ rows: [], rowCount: 0 }),
          release: () => {},
        });
      }
      if (prop === 'query') {
        return async () => ({ rows: [], rowCount: 0 });
      }
      if (prop === 'on') return () => {};
      if (prop === 'end') return async () => {};
      return undefined;
    }
    const val = (p as any)[prop];
    return typeof val === 'function' ? val.bind(p) : val;
  }
});

export async function query(sql: string, params: any[] = []): Promise<any> {
  const dialect = getDatabaseDialect();
  const connStr = getConnectionString();

  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
    const emptyRows: any = [];
    Object.defineProperty(emptyRows, 'rows', { get: () => emptyRows, enumerable: false, configurable: true });
    Object.defineProperty(emptyRows, 'rowCount', { get: () => 0, enumerable: false, configurable: true });
    return emptyRows;
  }

  if (dialect === 'postgres') {
    let poolInstance = getPool();
    if (!poolInstance) {
      const emptyRows: any = [];
      Object.defineProperty(emptyRows, 'rows', { get: () => emptyRows, enumerable: false, configurable: true });
      Object.defineProperty(emptyRows, 'rowCount', { get: () => 0, enumerable: false, configurable: true });
      return emptyRows;
    }

    let client: any = null;
    try {
      try {
        client = await poolInstance.connect();
      } catch (connectErr: any) {
        // Automatic SSL Handshake Fallback: If local PostgreSQL rejects SSL with 'N' packet
        if (
          connectErr.message &&
          connectErr.message.includes('The server does not support SSL connections')
        ) {
          globalThis.__zecratary_ssl_unsupported = true;
          poolInstance = getPool(true);
          if (!poolInstance) return [];
          client = await poolInstance.connect();
        } else {
          throw connectErr;
        }
      }

      // Simple Query Protocol for parameterless DDL, Extended Query Protocol for parameters
      const res = (!params || params.length === 0)
        ? await client.query(sql)
        : await client.query(sql, params);

      const rows: any = Array.isArray(res) ? res : (res?.rows || []);

      // Attach non-enumerable .rows and .rowCount getters for dual-access compatibility
      if (Array.isArray(rows)) {
        try {
          if (!('rows' in rows)) {
            Object.defineProperty(rows, 'rows', {
              get: () => rows,
              enumerable: false,
              configurable: true,
            });
          }
          if (!('rowCount' in rows)) {
            Object.defineProperty(rows, 'rowCount', {
              get: () => (res && typeof res.rowCount === 'number' ? res.rowCount : rows.length),
              enumerable: false,
              configurable: true,
            });
          }
        } catch (_) {}
      }

      return rows;
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
    // MySQL query executor with isolated Webpack-safe runtime loader
    try {
      let mysqlModule: any = null;
      try {
        if (typeof __non_webpack_require__ !== 'undefined') {
          mysqlModule = __non_webpack_require__('mysql2/promise');
        }
      } catch (_) {
        mysqlModule = null;
      }

      if (!mysqlModule) {
        console.warn('[MySQL] mysql2 driver not available, returning empty set.');
        const emptyRows: any = [];
        Object.defineProperty(emptyRows, 'rows', { get: () => emptyRows, enumerable: false, configurable: true });
        Object.defineProperty(emptyRows, 'rowCount', { get: () => 0, enumerable: false, configurable: true });
        return emptyRows;
      }

      const connection = await mysqlModule.createConnection(connStr);
      try {
        const [rawRows] = await connection.execute(sql, params);
        const rows: any = Array.isArray(rawRows) ? rawRows : [];

        try {
          if (!('rows' in rows)) {
            Object.defineProperty(rows, 'rows', {
              get: () => rows,
              enumerable: false,
              configurable: true,
            });
          }
          if (!('rowCount' in rows)) {
            Object.defineProperty(rows, 'rowCount', {
              get: () => rows.length,
              enumerable: false,
              configurable: true,
            });
          }
        } catch (_) {}

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
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database pool is not available for transaction');
  }
  const client = await poolInstance.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
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

const defaultExport: any = {
  query,
  transaction,
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
};

Object.setPrototypeOf(
  defaultExport,
  new Proxy({}, {
    get(_target, prop) {
      const p = getPool();
      if (!p) return undefined;
      const val = (p as any)[prop];
      return typeof val === 'function' ? val.bind(p) : val;
    },
  })
);

export default defaultExport;
