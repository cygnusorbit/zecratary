import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getMysqlModule(): any {
  try {
    const loader = typeof (globalThis as any).__non_webpack_require__ === 'function'
      ? (globalThis as any).__non_webpack_require__
      : eval('require');
    return loader('mysql2/promise');
  } catch (_) {
    return null;
  }
}

function readEnvFiles(): Record<string, string> {
  const envMap: Record<string, string> = { ...process.env } as Record<string, string>;
  const candidateFiles = ['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'];

  for (const f of candidateFiles) {
    const fullPath = path.join(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const k = trimmed.slice(0, idx).trim();
            let v = trimmed.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            envMap[k] = v;
          }
        });
      } catch (_) {}
    }
  }
  return envMap;
}

function updateEnvFiles(updates: Record<string, string>) {
  Object.entries(updates).forEach(([k, v]) => {
    process.env[k] = v;
  });

  const envFiles = ['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'];
  for (const envFile of envFiles) {
    const fullPath = path.join(process.cwd(), envFile);
    let lines: string[] = [];
    if (fs.existsSync(fullPath)) {
      try {
        lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/);
      } catch (_) {
        lines = [];
      }
    }

    const keysSeen = new Set<string>();
    const newLines = lines.map((l) => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        if (updates[k] !== undefined) {
          keysSeen.add(k);
          return `${k}="${updates[k]}"`;
        }
      }
      return l;
    });

    Object.entries(updates).forEach(([k, v]) => {
      if (!keysSeen.has(k)) {
        newLines.push(`${k}="${v}"`);
      }
    });

    try {
      fs.writeFileSync(fullPath, newLines.join('\n') + '\n', 'utf-8');
    } catch (_) {}
  }
}

function maskConnectionString(urlStr: string): string {
  if (!urlStr) return '';
  return urlStr.replace(/:([^:@]+)@/, ':••••••••@');
}

async function ensureCoreTables(targetUrl: string, dialect: string) {
  if (dialect === 'postgres') {
    try {
      // @ts-ignore
      const { Pool } = await import('pg');
      const p = new Pool({
        connectionString: targetUrl,
        ssl: targetUrl.includes('sslmode=') || !targetUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 7000,
      });

      await p.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
          site_name VARCHAR(255) DEFAULT 'Zecratary',
          titlebar_emoji VARCHAR(32) DEFAULT '🍳',
          favicon_emoji VARCHAR(32) DEFAULT '🍳',
          currency VARCHAR(10) DEFAULT 'USD',
          ai_provider VARCHAR(64) DEFAULT 'gemini',
          ai_model VARCHAR(128) DEFAULT 'gemini-3.5-flash-lite',
          theme_colors JSONB DEFAULT '{}'::jsonb,
          payment_settings JSONB DEFAULT '{}'::jsonb,
          social_login JSONB DEFAULT '{}'::jsonb,
          chef_ai_settings JSONB DEFAULT '{}'::jsonb,
          recipe_types JSONB DEFAULT '[]'::jsonb,
          ingredient_categories JSONB DEFAULT '[]'::jsonb,
          supported_languages JSONB DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(64) UNIQUE NOT NULL,
          is_free BOOLEAN DEFAULT FALSE,
          is_default BOOLEAN DEFAULT FALSE,
          monthly_price_dollars NUMERIC(10, 2) DEFAULT 0.00,
          annual_price_dollars NUMERIC(10, 2) DEFAULT 0.00,
          monthly_badge VARCHAR(64) DEFAULT '',
          annual_badge VARCHAR(64) DEFAULT '',
          trial_badge VARCHAR(64) DEFAULT '',
          description_monthly TEXT DEFAULT '',
          description_annual TEXT DEFAULT '',
          button_text VARCHAR(64) DEFAULT 'Choose Plan',
          ai_recipe_limit INTEGER DEFAULT 5,
          recipe_library_limit INTEGER DEFAULT 25,
          social_scrape_limit INTEGER DEFAULT 5,
          can_view_macros BOOLEAN DEFAULT FALSE,
          allowed_ai_models TEXT DEFAULT 'gemini-3.5-flash-lite',
          features JSONB DEFAULT '[]'::jsonb,
          token_limit INTEGER DEFAULT 50000,
          token_reimburse_frequency VARCHAR(32) DEFAULT 'monthly',
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          role VARCHAR(32) NOT NULL DEFAULT 'user',
          subscription_plan VARCHAR(64) DEFAULT 'taster',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payment_transactions (
          id VARCHAR(64) PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          plan_name VARCHAR(255) NOT NULL,
          plan_slug VARCHAR(64),
          amount NUMERIC(10, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'USD',
          gateway VARCHAR(32) NOT NULL DEFAULT 'stripe',
          status VARCHAR(32) NOT NULL DEFAULT 'succeeded',
          failure_reason TEXT,
          test_mode BOOLEAN DEFAULT TRUE,
          expiry_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS saved_recipes (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          recipe_type VARCHAR(64),
          cuisine VARCHAR(64),
          prep_time VARCHAR(32),
          cook_time VARCHAR(32),
          servings VARCHAR(32),
          difficulty VARCHAR(32),
          ingredients JSONB DEFAULT '[]'::jsonb,
          directions JSONB DEFAULT '[]'::jsonb,
          nutrition JSONB DEFAULT '{}'::jsonb,
          tags JSONB DEFAULT '[]'::jsonb,
          image_url TEXT,
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS page_contents (
          page_slug VARCHAR(128) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          meta_description TEXT,
          content_blocks JSONB DEFAULT '[]'::jsonb,
          custom_attributes JSONB DEFAULT '{}'::jsonb,
          is_published BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS frontend_pages (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          description TEXT DEFAULT '',
          is_default BOOLEAN DEFAULT FALSE,
          is_published BOOLEAN DEFAULT TRUE,
          elements JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await p.end();
      return true;
    } catch (_) {
      return false;
    }
  }
  return true;
}

export async function GET() {
  const env = readEnvFiles();

  // Primary: DATABASE_URL -> POSTGRES_URL -> Localhost Default
  const dbUrl = env.DATABASE_URL || env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public';
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Strict URL-based dialect identification
  let dialect: 'postgres' | 'mysql' = 'postgres';
  if (dbUrl.startsWith('mysql://')) {
    dialect = 'mysql';
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    dialect = 'postgres';
  } else if ((env.DATABASE_TYPE || '').toLowerCase() === 'mysql') {
    dialect = 'mysql';
  }

  const isMySQL = dialect === 'mysql';
  const isSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com');
  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

  let activeTargetName = 'Localhost PostgreSQL';
  if (isSupabase) {
    activeTargetName = 'Supabase Cloud PostgreSQL';
  } else if (isMySQL) {
    activeTargetName = isLocalhost ? 'Localhost MySQL' : 'Remote MySQL Server';
  } else if (!isLocalhost && dbUrl) {
    activeTargetName = 'Custom Remote PostgreSQL';
  }

  let isConnected = false;
  let latencyMs = 0;
  let serverVersion = 'Unknown';
  let databaseName = 'Unknown';
  let host = 'localhost';
  let port = isMySQL ? '3306' : '5432';
  let sslActive = false;
  let databaseSize = '—';
  let activeConnections = 1;
  let cacheHitRatio = '99.4%';

  interface TableMetric {
    name: string;
    count: number;
    size: string;
    status: 'ready' | 'empty' | 'missing';
  }
  const tableMetrics: TableMetric[] = [];

  const targetTables = [
    'admin_settings',
    'subscription_plans',
    'users',
    'payment_transactions',
    'saved_recipes',
    'page_contents',
    'frontend_pages',
    'planner_meals',
    'pantry_items',
    'grocery_items'
  ];

  if (dbUrl) {
    try {
      const parsedUrl = new URL(
        dbUrl.replace(/^postgresql:\/\//, 'http://')
             .replace(/^postgres:\/\//, 'http://')
             .replace(/^mysql:\/\//, 'http://')
      );
      host = parsedUrl.hostname || 'localhost';
      port = parsedUrl.port || (isMySQL ? '3306' : '5432');
      databaseName = parsedUrl.pathname.replace(/^\//, '').split('?')[0] || 'zecratary';
      sslActive = dbUrl.includes('sslmode=require') || (!['localhost', '127.0.0.1'].includes(host));
    } catch (_) {}

    if (!isMySQL) {
      try {
        // @ts-ignore
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: dbUrl,
          ssl: sslActive ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000,
        });

        const start = Date.now();
        const pingRes = await pool.query(`
          SELECT 
            current_database() AS db,
            version() AS full_ver,
            NOW() AS server_now,
            pg_size_pretty(pg_database_size(current_database())) AS dbsize;
        `);
        latencyMs = Date.now() - start;
        isConnected = true;
        databaseName = pingRes.rows[0]?.db || databaseName;
        databaseSize = pingRes.rows[0]?.dbsize || '—';

        const rawVer = pingRes.rows[0]?.full_ver || '';
        const matchVer = rawVer.match(/PostgreSQL\s+([\d\.]+)/i);
        serverVersion = matchVer ? `PostgreSQL ${matchVer[1]}` : (rawVer.split(' ')[0] || 'PostgreSQL');

        try {
          const statsRes = await pool.query(`
            SELECT count(*)::int AS active_conns 
            FROM pg_stat_activity 
            WHERE datname = current_database();
          `);
          activeConnections = statsRes.rows[0]?.active_conns || 1;
        } catch (_) {}

        try {
          const cacheRes = await pool.query(`
            SELECT 
              round((sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0)), 2) AS hit_ratio 
            FROM pg_stat_database 
            WHERE datname = current_database();
          `);
          if (cacheRes.rows[0]?.hit_ratio) {
            cacheHitRatio = `${cacheRes.rows[0].hit_ratio}%`;
          }
        } catch (_) {}

        for (const tbl of targetTables) {
          try {
            const countQ = await pool.query(`SELECT count(*)::int AS count FROM ${tbl};`);
            const rowCount = countQ.rows[0]?.count ?? 0;
            let sizePretty = '< 1 MB';
            try {
              const szQ = await pool.query(`SELECT pg_size_pretty(pg_total_relation_size('${tbl}')) AS sz;`);
              sizePretty = szQ.rows[0]?.sz || sizePretty;
            } catch (_) {}

            tableMetrics.push({
              name: tbl,
              count: rowCount,
              size: sizePretty,
              status: rowCount > 0 ? 'ready' : 'empty'
            });
          } catch (_) {
            tableMetrics.push({
              name: tbl,
              count: -1,
              size: '—',
              status: 'missing'
            });
          }
        }
        await pool.end();
      } catch (_) {
        isConnected = false;
      }
    } else {
      const mysql = getMysqlModule();
      if (!mysql) {
        isConnected = false;
        serverVersion = 'MySQL (Driver not installed)';
      } else {
        try {
          const conn = await mysql.createConnection(dbUrl);
          const start = Date.now();
          const [rows] = await conn.query('SELECT VERSION() AS ver, DATABASE() AS db');
          latencyMs = Date.now() - start;
          isConnected = true;
          serverVersion = `MySQL ${(rows as any)?.[0]?.ver || ''}`;
          databaseName = (rows as any)?.[0]?.db || databaseName;

          for (const tbl of targetTables) {
            try {
              const [cRes] = await conn.query(`SELECT COUNT(*) AS count FROM ${tbl}`);
              const count = Number((cRes as any)?.[0]?.count || 0);
              tableMetrics.push({
                name: tbl,
                count,
                size: '—',
                status: count > 0 ? 'ready' : 'empty'
              });
            } catch (_) {
              tableMetrics.push({
                name: tbl,
                count: -1,
                size: '—',
                status: 'missing'
              });
            }
          }
          await conn.end();
        } catch (_) {
          isConnected = false;
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      status: isConnected ? 'connected' : dbUrl ? 'error' : 'unconfigured',
      dialect,
      isSupabase,
      isLocalhost,
      activeTargetName,
      host,
      port,
      databaseName,
      serverVersion,
      latencyMs,
      sslActive,
      databaseSize,
      activeConnections,
      cacheHitRatio,
      maskedUrl: maskConnectionString(dbUrl),
      rawUrl: dbUrl,
      tableMetrics,
      savedTargets: {
        localhostPostgres: env.DATABASE_URL_LOCAL_PG || (isLocalhost && !isMySQL ? dbUrl : 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public'),
        localhostMysql: env.MYSQL_URL || 'mysql://root:@127.0.0.1:3306/zecratary',
        supabasePooler: env.SUPABASE_DATABASE_URL || (isSupabase ? dbUrl : ''),
        customUrl: env.CUSTOM_DATABASE_URL || (!isLocalhost && !isSupabase ? dbUrl : '')
      },
      settings: {
        maxConnections: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
      supabase: {
        url: supabaseUrl,
        publishableKeyMasked: supabaseKey ? `${supabaseKey.slice(0, 16)}...` : '',
        rawKey: supabaseKey,
        isConfigured: Boolean(supabaseUrl && supabaseKey),
      },
    },
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Switch & Activate Database
    
    // Action: Clone Localhost Database to Supabase
    if (action === 'clone_local_to_supabase') {
      const env = readEnvFiles();
      const localDbUrl = env.DATABASE_URL_LOCAL_PG || 
        (env.DATABASE_URL && env.DATABASE_URL.includes('localhost') ? env.DATABASE_URL : 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public');

      const targetSupaUrl = (body.supabaseUrl || env.SUPABASE_DATABASE_URL || '').trim();
      if (!targetSupaUrl || (!targetSupaUrl.includes('supabase.co') && !targetSupaUrl.includes('pooler.supabase.com'))) {
        return NextResponse.json({
          success: false,
          error: 'Valid Supabase pooled connection string (port 6543) is required.'
        }, { status: 400 });
      }

      // @ts-ignore
      const { Pool } = await import('pg');
      const localPool = new Pool({
        connectionString: localDbUrl,
        ssl: localDbUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      });

      const supaPool = new Pool({
        connectionString: targetSupaUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

      try {
        await localPool.query('SELECT 1;');
        await supaPool.query('SELECT 1;');
        await ensureCoreTables(targetSupaUrl, 'postgres');

        const tablesToClone = [
          'subscription_plans',
          'users',
          'admin_settings',
          'payment_transactions',
          'saved_recipes',
          'page_contents',
          'frontend_pages'
        ];

        let totalCloned = 0;
        const details: Record<string, number> = {};

        for (const tbl of tablesToClone) {
          try {
            const lRes = await localPool.query(`SELECT * FROM ${tbl};`);
            for (const row of lRes.rows) {
              const keys = Object.keys(row);
              const values = Object.values(row).map((v) => {
                if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
                  return JSON.stringify(v);
                }
                return v;
              });

              const cols = keys.join(', ');
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const conflictCol = keys.includes('id') ? 'id' : keys.includes('page_slug') ? 'page_slug' : keys[0];

              const updateCols = keys
                .filter((k) => k !== conflictCol)
                .map((k) => `${k} = EXCLUDED.${k}`)
                .join(', ');

              const upsertSql = updateCols
                ? `INSERT INTO ${tbl} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateCols};`
                : `INSERT INTO ${tbl} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO NOTHING;`;

              await supaPool.query(upsertSql, values);
              totalCloned++;
            }
            details[tbl] = lRes.rows.length;
          } catch (_) {}
        }

        await localPool.end();
        await supaPool.end();

        return NextResponse.json({
          success: true,
          message: `Successfully cloned ${totalCloned} records from Localhost to Supabase!`,
          details
        });
      } catch (err: any) {
        await localPool.end().catch(() => {});
        await supaPool.end().catch(() => {});
        return NextResponse.json({
          success: false,
          error: `Cloning failed: ${err.message}`
        }, { status: 400 });
      }
    }

    if (action === 'switch_database') {
      const { targetType, customUrl } = body;
      const env = readEnvFiles();
      let targetUrl = '';
      let dialect = 'postgres';

      if (targetType === 'localhost_postgres') {
        targetUrl = customUrl || env.DATABASE_URL_LOCAL_PG || 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public';
        dialect = 'postgres';
      } else if (targetType === 'localhost_mysql') {
        targetUrl = customUrl || env.MYSQL_URL || 'mysql://root:@127.0.0.1:3306/zecratary';
        dialect = 'mysql';
      } else if (targetType === 'supabase') {
        targetUrl = customUrl || env.SUPABASE_DATABASE_URL || env.DATABASE_URL || '';
        dialect = 'postgres';
      } else if (targetType === 'custom') {
        targetUrl = (customUrl || '').trim();
        dialect = targetUrl.startsWith('mysql://') ? 'mysql' : 'postgres';
      }

      if (!targetUrl) {
        return NextResponse.json({ success: false, error: 'Database connection string is required.' }, { status: 400 });
      }

      // Pre-flight TCP verification
      if (dialect === 'mysql') {
        const mysql = getMysqlModule();
        if (!mysql) {
          return NextResponse.json({
            success: false,
            error: 'MySQL driver (mysql2) is not installed in the system. Run "npm install mysql2" or choose PostgreSQL / Supabase.'
          }, { status: 400 });
        }
        try {
          const conn = await mysql.createConnection(targetUrl);
          await conn.query('SELECT 1');
          await conn.end();
        } catch (err: any) {
          return NextResponse.json({ success: false, error: `MySQL connection refused: ${err.message}` }, { status: 400 });
        }
      } else {
        // @ts-ignore
        const { Pool } = await import('pg');
        const testPool = new Pool({
          connectionString: targetUrl,
          ssl: targetUrl.includes('sslmode=require') || !targetUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000,
        });
        try {
          await testPool.query('SELECT 1;');
          await testPool.end();
        } catch (err: any) {
          await testPool.end().catch(() => {});
          return NextResponse.json({ success: false, error: `PostgreSQL connection failed: ${err.message}` }, { status: 400 });
        }
      }

      const updates: Record<string, string> = {
        DATABASE_URL: targetUrl,
        DATABASE_TYPE: dialect
      };

      if (dialect === 'postgres') {
        updates['POSTGRES_URL'] = targetUrl;
        if (targetType === 'localhost_postgres') updates['DATABASE_URL_LOCAL_PG'] = targetUrl;
        if (targetType === 'supabase') updates['SUPABASE_DATABASE_URL'] = targetUrl;
      } else {
        updates['MYSQL_URL'] = targetUrl;
      }
      if (targetType === 'custom') {
        updates['CUSTOM_DATABASE_URL'] = targetUrl;
      }

      updateEnvFiles(updates);
      await ensureCoreTables(targetUrl, dialect);

      return NextResponse.json({
        success: true,
        message: `Successfully switched and activated ${targetType.replace('_', ' ').toUpperCase()}!`,
        targetUrl: maskConnectionString(targetUrl)
      });
    }

    // Action 2: Test Any Given Connection String
    if (action === 'test_connection') {
      const targetUrl = (body.connectionString || '').trim();
      const isMySQLTarget = targetUrl.startsWith('mysql://');

      if (!targetUrl) {
        return NextResponse.json({ success: false, error: 'Connection string is required.' }, { status: 400 });
      }

      if (isMySQLTarget) {
        const mysql = getMysqlModule();
        if (!mysql) {
          return NextResponse.json({
            success: false,
            error: 'MySQL driver (mysql2) is not installed. Please run "npm install mysql2" to test MySQL, or use PostgreSQL / Supabase.'
          }, { status: 400 });
        }
        try {
          const start = Date.now();
          const conn = await mysql.createConnection(targetUrl);
          const [rows] = await conn.query('SELECT VERSION() AS ver, DATABASE() AS db');
          const latency = Date.now() - start;
          await conn.end();
          return NextResponse.json({
            success: true,
            message: 'MySQL TCP Handshake successful!',
            details: {
              database: (rows as any)?.[0]?.db,
              latencyMs: latency,
              version: `MySQL ${(rows as any)?.[0]?.ver || ''}`
            }
          });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: `MySQL handshake failed: ${err.message}` }, { status: 400 });
        }
      } else {
        // @ts-ignore
        const { Pool } = await import('pg');
        const testPool = new Pool({
          connectionString: targetUrl,
          ssl: targetUrl.includes('sslmode=require') || !targetUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 6000,
        });

        try {
          const start = Date.now();
          const res = await testPool.query('SELECT current_database() AS db, version() AS ver;');
          const latency = Date.now() - start;
          await testPool.end();
          return NextResponse.json({
            success: true,
            message: 'PostgreSQL TCP Handshake successful!',
            details: {
              database: res.rows[0]?.db,
              latencyMs: latency,
              version: res.rows[0]?.ver?.split(' ')?.[0] || 'PostgreSQL'
            }
          });
        } catch (err: any) {
          await testPool.end().catch(() => {});
          return NextResponse.json({ success: false, error: `PostgreSQL connection failed: ${err.message}` }, { status: 400 });
        }
      }
    }

    // Action 3: Test Supabase HTTPS API Gateway
    if (action === 'test_supabase_api') {
      const targetApiUrl = (body.supabaseUrl || '').trim();
      const targetKey = (body.publishableKey || '').trim();
      if (!targetApiUrl || !targetKey) {
        return NextResponse.json({ success: false, error: 'Supabase URL and API Key are required.' }, { status: 400 });
      }

      const start = Date.now();
      const healthRes = await fetch(`${targetApiUrl.replace(/\/$/, '')}/auth/v1/health`, {
        method: 'GET',
        headers: { apikey: targetKey, Authorization: `Bearer ${targetKey}` },
      });
      const latency = Date.now() - start;

      if (!healthRes.ok) {
        return NextResponse.json({ success: false, error: `Supabase Auth responded with HTTP ${healthRes.status}: ${healthRes.statusText}` }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Supabase HTTPS Auth & REST Gateway verified!', latencyMs: latency });
    }

    // Action 4: Save & Apply Database Connection
    if (action === 'save_database_connection') {
      const { databaseUrl, databaseType } = body;
      if (!databaseUrl) {
        return NextResponse.json({ success: false, error: 'Database URL is required.' }, { status: 400 });
      }

      const derivedType = databaseUrl.startsWith('mysql://') ? 'mysql' : 'postgres';
      const updates: Record<string, string> = {
        DATABASE_URL: databaseUrl.trim(),
        POSTGRES_URL: databaseUrl.trim(),
        DATABASE_TYPE: databaseType || derivedType
      };
      if (derivedType === 'mysql') {
        updates['MYSQL_URL'] = databaseUrl.trim();
      } else {
        updates['DATABASE_URL_LOCAL_PG'] = databaseUrl.trim();
      }

      updateEnvFiles(updates);
      const schemaApplied = await ensureCoreTables(databaseUrl.trim(), updates.DATABASE_TYPE);

      return NextResponse.json({ success: true, message: 'Database configuration persisted successfully.', schemaApplied });
    }

    // Action 5: Save Supabase Cloud Parameters
    if (action === 'save_supabase_connection') {
      const { supabaseUrl, publishableKey, databaseUrl } = body;
      const updates: Record<string, string> = {};
      if (supabaseUrl) {
        updates['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl.trim();
        updates['SUPABASE_URL'] = supabaseUrl.trim();
      }
      if (publishableKey) {
        updates['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = publishableKey.trim();
        updates['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = publishableKey.trim();
      }
      if (databaseUrl) {
        let normalized = databaseUrl.trim();
        if (!normalized.includes('sslmode=') && !normalized.includes('localhost')) {
          normalized += (normalized.includes('?') ? '&' : '?') + 'sslmode=require';
        }
        updates['DATABASE_URL'] = normalized;
        updates['POSTGRES_URL'] = normalized;
        updates['SUPABASE_DATABASE_URL'] = normalized;
        updates['DATABASE_TYPE'] = 'postgres';
      }

      updateEnvFiles(updates);
      if (databaseUrl) {
        await ensureCoreTables(updates['DATABASE_URL'], 'postgres');
      }

      return NextResponse.json({ success: true, message: 'Supabase configuration persisted successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
