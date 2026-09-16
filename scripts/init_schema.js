// Automated Schema Initializer over TCP
// Usage: node scripts/init_schema.js

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

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not defined in your environment files.');
  process.exit(1);
}

async function run() {
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (_) {
    console.error('❌ Error: "pg" package is required. Run: npm install pg');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Connecting to PostgreSQL via TCP...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('✓ Successfully applied schema.sql. All tables created and indexed.');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
