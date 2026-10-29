// @ts-nocheck
/**
 * Dual Database Engine - MySQL Adapter
 * Repository: cygnusorbit/zecratary (GitHub)
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

export async function query<T = any>(sql: string, params: any[] = []): Promise<any> {
  const pool = await getMysqlPool();

  if (!pool) {
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

export default {
  query,
  queryMysql,
  execute,
  executeMysql,
  pool,
  mysqlPool,
  getMysqlPool,
  getMysqlConnection,
  isMysqlAvailable,
  getMysqlConnectionUrl,
};
