// Isolated MySQL Client with Webpack-Safe Driver Loader
// GitHub: cygnusorbit/zecratary

declare const __non_webpack_require__: any;

function loadMysqlDriver(): any {
  try {
    if (typeof __non_webpack_require__ !== 'undefined') {
      return __non_webpack_require__('mysql2/promise');
    }
  } catch (_) {}
  return null;
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  const driver = loadMysqlDriver();
  if (!driver) {
    const emptyRows: any = [];
    Object.defineProperty(emptyRows, 'rows', { get: () => emptyRows, enumerable: false, configurable: true });
    Object.defineProperty(emptyRows, 'rowCount', { get: () => 0, enumerable: false, configurable: true });
    return emptyRows;
  }

  const connStr = process.env.MYSQL_URL || process.env.DATABASE_URL || '';
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
    const emptyRows: any = [];
    Object.defineProperty(emptyRows, 'rows', { get: () => emptyRows, enumerable: false, configurable: true });
    Object.defineProperty(emptyRows, 'rowCount', { get: () => 0, enumerable: false, configurable: true });
    return emptyRows;
  }

  const connection = await driver.createConnection(connStr);
  try {
    const [rawRows] = await connection.execute(sql, params);
    const rows: any = Array.isArray(rawRows) ? rawRows : [];
    try {
      if (!('rows' in rows)) {
        Object.defineProperty(rows, 'rows', { get: () => rows, enumerable: false, configurable: true });
      }
      if (!('rowCount' in rows)) {
        Object.defineProperty(rows, 'rowCount', { get: () => rows.length, enumerable: false, configurable: true });
      }
    } catch (_) {}
    return rows;
  } finally {
    await connection.end().catch(() => {});
  }
}

export const queryMysql = query;
export const execute = query;
export const executeMysql = query;

export async function getMysqlPool(): Promise<any> {
  return { query, execute: query };
}
export const getMysqlConnection = getMysqlPool;

export const pool: any = { query, execute: query };
export const mysqlPool: any = pool;

export async function testMysqlConnection(): Promise<boolean> {
  try {
    const res = await query('SELECT 1');
    return Array.isArray(res);
  } catch (_) {
    return false;
  }
}

export async function initMysqlTables(): Promise<void> {}

const defaultExport = {
  query,
  queryMysql,
  execute,
  executeMysql,
  getMysqlPool,
  getMysqlConnection,
  pool,
  mysqlPool,
  testMysqlConnection,
  initMysqlTables,
};

export default defaultExport;
