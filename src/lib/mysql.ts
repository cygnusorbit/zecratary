// Webpack-safe & TypeScript-compliant MySQL Database Adapter for Zecratary
export interface MysqlQueryResult<T = any> {
  rows: T[];
  fields?: any[];
}

/**
 * Webpack-safe dynamic loader for mysql2/promise.
 * Prevents Webpack / Turbopack static AST analyzer from throwing
 * "Module not found: Can't resolve 'mysql2/promise'" when mysql2 is optional.
 */
function getMysqlDriver(): any {
  try {
    const loader = typeof (globalThis as any).__non_webpack_require__ === 'function'
      ? (globalThis as any).__non_webpack_require__
      : (typeof require === 'function' ? require : eval('require'));
    return loader('mysql2/promise');
  } catch (_) {
    return null;
  }
}

export function isMysqlConfigured(): boolean {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  return Boolean(url && url.startsWith('mysql://'));
}

export async function getMysqlConnection(): Promise<any | null> {
  const mysqlUrl = process.env.MYSQL_URL || 
    (process.env.DATABASE_URL?.startsWith('mysql://') ? process.env.DATABASE_URL : null);
  
  if (!mysqlUrl) return null;

  const mysql = getMysqlDriver();
  if (!mysql) return null;

  try {
    return await mysql.createConnection(mysqlUrl);
  } catch (err) {
    console.warn('[getMysqlConnection] Connection failed:', err);
    return null;
  }
}

export async function queryMysql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const conn = await getMysqlConnection();
  if (!conn) return [];

  try {
    const [rows] = await conn.query(sql, params);
    return Array.isArray(rows) ? (rows as T[]) : ([rows] as unknown as T[]);
  } catch (err) {
    console.warn('[queryMysql] Query execution failed:', err);
    return [];
  } finally {
    await conn.end().catch(() => {});
  }
}

const mysqlAdapter = {
  queryMysql,
  getMysqlConnection,
  isMysqlConfigured
};

export default mysqlAdapter;
