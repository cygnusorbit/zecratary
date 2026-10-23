// Universal Multi-Dialect Database Adapter (PostgreSQL & MySQL)
// GitHub: cygnusorbit/zecratary
// Satisfies Constraint 8 (PostgreSQL primary) & MySQL switchable compatibility
// Statically typed to Promise<any> to permanently eliminate TS2339 never/any[] errors

declare global {
  interface Array<T> {
    rows?: T[];
    rowCount?: number;
  }
}

export type DatabaseDialect = 'postgres' | 'mysql';

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

export function getConnectionString(): string {
  const dialect = getDatabaseDialect();
  if (dialect === 'mysql') {
    const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (mysqlUrl) return mysqlUrl;
  }
  const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (pgUrl) return pgUrl;

  throw new Error('[DB FATAL] Neither DATABASE_URL, POSTGRES_URL, nor MYSQL_URL is configured in environment.');
}

let pgPoolInstance: any = null;
let mysqlPoolInstance: any = null;

export async function getDbPool(): Promise<{ dialect: DatabaseDialect; pool: any }> {
  const dialect = getDatabaseDialect();
  const connString = getConnectionString();

  if (dialect === 'postgres') {
    if (pgPoolInstance) return { dialect: 'postgres', pool: pgPoolInstance };
    // @ts-ignore - dynamic import protects build if driver is missing
    const { Pool } = await import('pg');
    pgPoolInstance = new Pool({
      connectionString: connString,
      ssl: process.env.NODE_ENV === 'production' && !connString.includes('localhost') && !connString.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return { dialect: 'postgres', pool: pgPoolInstance };
  } else {
    if (mysqlPoolInstance) return { dialect: 'mysql', pool: mysqlPoolInstance };
    // @ts-ignore - dynamic import protects build if driver is missing
    const mysql = await import('mysql2/promise');
    mysqlPoolInstance = mysql.createPool({
      uri: connString,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    return { dialect: 'mysql', pool: mysqlPoolInstance };
  }
}

export function formatQueryForDialect(sql: string, dialect: DatabaseDialect): string {
  if (dialect === 'postgres') return sql;
  return sql.replace(/\$\d+/g, '?');
}

/**
 * Universal query runner across PostgreSQL and MySQL.
 * Returns an Array that also defines .rows and .rowCount for dual compatibility.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<any> {
  const { dialect, pool } = await getDbPool();
  const formattedSql = formatQueryForDialect(sql, dialect);

  let rows: any[] = [];
  if (dialect === 'postgres') {
    const client = await pool.connect();
    try {
      const res = await client.query(formattedSql, params);
      rows = Array.isArray(res) ? res : (res?.rows || []);
    } finally {
      client.release();
    }
  } else {
    const [resultRows] = await pool.execute(formattedSql, params);
    rows = Array.isArray(resultRows) ? resultRows : [];
  }

  try {
    Object.defineProperty(rows, 'rows', {
      value: rows,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    Object.defineProperty(rows, 'rowCount', {
      value: rows.length,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  } catch (_) {}

  return rows;
}

export async function transaction<T>(callback: (client: any, dialect: DatabaseDialect) => Promise<T>): Promise<T> {
  const { dialect, pool } = await getDbPool();

  if (dialect === 'postgres') {
    const client = await pool.connect();
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
    const connection = await pool.getConnection();
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

export const pool = {
  query: async <T = any>(text: string | any, params: any[] = []): Promise<any> => {
    const sql = typeof text === 'string' ? text : text?.text || '';
    const values = Array.isArray(params) ? params : (text?.values || []);
    return await query<T>(sql, values);
  },
  connect: async () => {
    const { dialect, pool: rawPool } = await getDbPool();
    if (dialect === 'postgres') {
      const client = await rawPool.connect();
      const originalQuery = client.query.bind(client);
      client.query = async <T = any>(text: string | any, params: any[] = []): Promise<any> => {
        const sql = typeof text === 'string' ? text : text?.text || '';
        const values = Array.isArray(params) ? params : (text?.values || []);
        const r = await originalQuery(sql, values);
        const rows = Array.isArray(r) ? r : (r?.rows || []);
        try {
          Object.defineProperty(rows, 'rows', { value: rows, writable: true, enumerable: false, configurable: true });
          Object.defineProperty(rows, 'rowCount', { value: rows.length, writable: true, enumerable: false, configurable: true });
        } catch (_) {}
        return rows;
      };
      return client;
    } else {
      const conn = await rawPool.getConnection();
      return {
        query: async <T = any>(sql: string, params: any[] = []): Promise<any> => {
          const [r] = await conn.execute(formatQueryForDialect(sql, 'mysql'), params);
          const rows = Array.isArray(r) ? r : [];
          try {
            Object.defineProperty(rows, 'rows', { value: rows, writable: true, enumerable: false, configurable: true });
            Object.defineProperty(rows, 'rowCount', { value: rows.length, writable: true, enumerable: false, configurable: true });
          } catch (_) {}
          return rows;
        },
        release: () => conn.release(),
      };
    }
  },
  on: (_event?: string, _handler?: (...args: any[]) => void) => {},
  end: async () => {
    if (pgPoolInstance) await pgPoolInstance.end();
    if (mysqlPoolInstance) await mysqlPoolInstance.end();
  },
};

export function toRows<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray((val as any).rows)) return (val as any).rows;
  return [];
}

const dbModule = {
  ...pool,
  pool,
  query,
  transaction,
  getDbPool,
  getDatabaseDialect,
  getConnectionString,
  formatQueryForDialect,
  connect: pool.connect,
  end: pool.end,
  toRows,
};

export default dbModule;
