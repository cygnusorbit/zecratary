// Automated Supabase PostgreSQL Connection Verification
// Usage: node scripts/verify_supabase.js

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPaths = ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local'];
  for (const ep of envPaths) {
    const full = path.join(process.cwd(), ep);
    if (fs.existsSync(full)) {
      const lines = fs.readFileSync(full, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          let v = trimmed.slice(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL is not set. Please add your Supabase connection string.');
  process.exit(1);
}

async function verifyConnection() {
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (e) {
    console.error('❌ Error: "pg" driver not installed. Run npm install pg.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to Supabase PostgreSQL instance...');
    const res = await pool.query('SELECT current_database() AS db, version() AS ver, NOW() AS time;');
    console.log('✅ Connected successfully to Supabase!');
    console.log('   Database:', res.rows[0].db);
    console.log('   Server Timestamp:', res.rows[0].time);

    // Verify existing tables
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    console.log('   Existing Public Tables:', tables.length ? tables.join(', ') : 'None (Ready for init_schema.js)');
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
  } finally {
    await pool.end();
  }
}

verifyConnection();
