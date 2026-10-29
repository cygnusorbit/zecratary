import { NextResponse } from 'next/server';
import { query, getDatabaseDialect, getConnectionString } from '@/lib/db';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const uptime = process.uptime();
  let dbStatus = 'disconnected';
  let dialect = 'unknown';
  let serverTime: any = null;
  let dbError: string | null = null;
  let tableCount = 0;

  try {
    dialect = getDatabaseDialect();
    const connStr = getConnectionString();

    if (connStr) {
      const sql = dialect === 'postgres'
        ? 'SELECT NOW() AS server_time, current_database() AS db_name;'
        : 'SELECT NOW() AS server_time, DATABASE() AS db_name;';

      const rows: any = await query(sql);
      const row = parseDbRow(rows);

      if (row) {
        dbStatus = 'connected';
        serverTime = row.server_time || row.NOW || new Date().toISOString();
      }

      const tableSql = dialect === 'postgres'
        ? "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = 'public';"
        : "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE();";

      const tableRows: any = await query(tableSql).catch(() => []);
      const tRow = parseDbRow(tableRows);
      tableCount = tRow?.total ? Number(tRow.total) : 0;
    }
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err?.message || 'Database connection error';
  }

  return NextResponse.json(
    {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      environment: process.env.NODE_ENV || 'production',
      domain: 'zecratary.com',
      database: {
        status: dbStatus,
        dialect,
        serverTime,
        publicTables: tableCount,
        error: dbError,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  );
}
