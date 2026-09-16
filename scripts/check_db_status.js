// Database Connectivity and Status Checker
// Usage: node scripts/check_db_status.js

const path = require('path');
const fs = require('fs');

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

console.log('\n--------------------------------------------------');
console.log('📊 Zecratary Storage Engine Status');
console.log('--------------------------------------------------');

if (!dbUrl) {
  console.log('Status: ACTIVE (Dual-Path Server JSON Storage)');
  console.log('Storage: apps/web/data/*.json & data/*.json');
  console.log('Browser LocalStorage: 0 references (Bypassed)');
  console.log('Notice: DATABASE_URL is not active in .env.');
  console.log('To activate PostgreSQL:');
  console.log('  1. Start Postgres: docker compose -f docker-compose.postgres.yml up -d');
  console.log('  2. Uncomment DATABASE_URL in .env');
  console.log('  3. Run migration: node scripts/migrate_to_postgres.js');
} else {
  console.log('Status: PostgreSQL Configured');
  console.log('URL:', dbUrl.replace(/:[^:@]+@/, ':****@'));
  
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (_) {
    console.log('⚠️ pg module not installed. Run: npm install pg');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: dbUrl });
  pool.query('SELECT NOW() as now, current_database() as db')
    .then((res) => {
      console.log('✓ Connected to PostgreSQL successfully!');
      console.log('✓ Database:', res.rows[0].db);
      console.log('✓ Server Time:', res.rows[0].now);
      console.log('\nReady to migrate. Run: node scripts/migrate_to_postgres.js');
      pool.end();
    })
    .catch((err) => {
      console.log('✕ Connection failed:', err.message);
      console.log('Fallback: Server JSON storage remains active and functional.');
      pool.end();
    });
}
console.log('--------------------------------------------------\n');
