// @ts-nocheck
/**
 * Dual Database Engine - MySQL Adapter
 * Repository: cygnusorbit/zecratary (GitHub)
 * 
 * Uses Webpack's native __non_webpack_require__ to prevent
 * "Critical dependency: require function is used in a way in which dependencies cannot be statically extracted"
 */

declare const __non_webpack_require__: ((id: string) => any) | undefined;

export interface MysqlQueryResult<T = any> extends Array<T> {
  rows: T[];
  fields?: any[];
  affectedRows?: number;
  insertId?: number;
  [key: string]: any;
}

let cachedMysqlDriver: any = null;
let driverChecked = false;

/**
 * Safely resolves mysql2/promise using Webpack's official non-webpack require macro.
 * This ensures Webpack never attempts static extraction and never emits critical dependency warnings.
 */
function getMysqlDriver(): any {
  if (driverChecked) return cachedMysqlDriver;
  driverChecked = true;

  try {
    if (typeof __non_webpack_require__ === 'function') {
      cachedMysqlDriver = __non_webpack_require__('mysql2/promise');
      return cachedMysqlDriver;
    }
  } catch (_) {}

  return null;
}

export function isMysqlAvailable(): boolean {
  return !!getMysqlDriver();
}

export function getMysqlConnectionUrl(): string | null {
  const url = process.env.MYSQL_URL || process.env.MYSQL_DATABASE_URL;
  if (url && url.startsWith('mysql://')) return url;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('mysql://')) return dbUrl;

  const host = process.env.MYSQL_HOST;
  const database = process.env.MYSQL_DATABASE;
  if (host && database) {
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const port = process.env.MYSQL_PORT || '3306';
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  return null;
}

const globalWithMysql = globalThis as unknown as {
  __zecratary_mysql_pool?: any;
};

export async function getMysqlPool(): Promise<any> {
  if (globalWithMysql.__zecratary_mysql_pool) {
    return globalWithMysql.__zecratary_mysql_pool;
  }

  const driver = getMysqlDriver();
  const connUrl = getMysqlConnectionUrl();

  if (!driver || !connUrl) {
    return null;
  }

  try {
    const pool = driver.createPool({
      uri: connUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    globalWithMysql.__zecratary_mysql_pool = pool;
    return pool;
  } catch (err: any) {
    console.warn('[MySQL Pool Initialization Notice]:', err.message);
    return null;
  }
}

export const getMysqlConnection = getMysqlPool;

/**
 * Universal Query Executor for MySQL
 * Formats results to be seamlessly compatible with Array indexing, .rows property, and .affectedRows.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<any> {
  const pool = await getMysqlPool();

  if (!pool) {
    // If MySQL is not configured, fall back to PostgreSQL or return empty safe result
    try {
      const { query: pgQuery } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof pgQuery === 'function') {
        const pgResult = await pgQuery(sql, params);
        const rows = Array.isArray(pgResult) ? pgResult : (pgResult?.rows || []);
        const formatted = [...rows] as MysqlQueryResult<T>;
        formatted.rows = rows;
        return formatted;
      }
    } catch (_) {}

    const empty = [] as unknown as MysqlQueryResult<T>;
    empty.rows = [];
    return empty;
  }

  try {
    const [rawRows, fields] = await pool.query(sql, params);
    const rows = Array.isArray(rawRows) ? rawRows : [];
    const result = [...rows] as MysqlQueryResult<T>;
    result.rows = rows;
    result.fields = fields;

    if (rawRows && typeof rawRows === 'object' && !Array.isArray(rawRows)) {
      result.affectedRows = (rawRows as any).affectedRows;
      result.insertId = (rawRows as any).insertId;
    }

    return result;
  } catch (err: any) {
    console.warn('[MySQL Query Notice]:', err.message);
    const errResult = [] as unknown as MysqlQueryResult<T>;
    errResult.rows = [];
    return errResult;
  }
}

// Canonical named exports required by route handlers
export const queryMysql = query;
export const execute = query;
export const executeMysql = query;

export const mysqlPool = {
  query,
  queryMysql,
  execute,
  executeMysql,
  getPool: getMysqlPool,
  getConnection: getMysqlPool,
};
export const pool = mysqlPool;

export async function testMysqlConnection(): Promise<{ connected: boolean; version?: string; database?: string; error?: string }> {
  const pool = await getMysqlPool();
  if (!pool) {
    return {
      connected: false,
      error: isMysqlAvailable()
        ? 'MySQL connection URL is not configured (MYSQL_URL).'
        : 'mysql2 driver is not installed in node_modules.',
    };
  }

  try {
    const [rows]: any = await pool.query('SELECT VERSION() AS ver, DATABASE() AS db;');
    const ver = rows?.[0]?.ver || 'Unknown';
    const db = rows?.[0]?.db || 'Default';
    return { connected: true, version: ver, database: db };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

export const testConnection = testMysqlConnection;

export async function initMysqlTables(): Promise<void> {
  const pool = await getMysqlPool();
  if (!pool) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        user_id VARCHAR(64),
        wallet_balance DECIMAL(10,2) DEFAULT 0.00,
        token_balance INT DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        user_email VARCHAR(255),
        amount INT NOT NULL,
        balance_after INT NOT NULL,
        type VARCHAR(64),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err: any) {
    console.warn('[MySQL Table Init Notice]:', err.message);
  }
}

export default {
  query,
  queryMysql,
  execute,
  executeMysql,
  pool,
  mysqlPool,
  getMysqlPool,
  getMysqlConnection,
  testMysqlConnection,
  testConnection,
  initMysqlTables,
  isMysqlAvailable,
  getMysqlConnectionUrl,
};
