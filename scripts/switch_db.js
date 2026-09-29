// Database Dialect & Connection Inspector
// Usage: node scripts/switch_db.js

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

const dbType = (process.env.DATABASE_TYPE || '').toLowerCase().trim();
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MYSQL_URL || '';

console.log('\n=============================================================');
console.log('🔄 Zecratary Database Dialect Inspector');
console.log('=============================================================');

if (!dbUrl) {
  console.log('⚠️  No active database connection string detected.');
  console.log('Default Engine: PostgreSQL (Constraint 8)');
  console.log('Configure connection strings in .env:');
  console.log('  PostgreSQL: DATABASE_URL="postgresql://user:pass@host:5432/db"');
  console.log('  MySQL:      MYSQL_URL="mysql://user:pass@host:3306/db"');
  process.exit(0);
}

const isMySQL = dbType === 'mysql' || dbUrl.startsWith('mysql://') || Boolean(process.env.MYSQL_URL);

if (isMySQL) {
  console.log('🎯 Active Dialect: MySQL (Alternative Option)');
  console.log('   Connection URI:', dbUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('   Schema File: scripts/schema.mysql.sql');
  console.log('   Migration Script: node scripts/migrate_to_mysql.js');
} else {
  console.log('✅ Active Dialect: PostgreSQL (Constraint 8 Compliant & Default)');
  console.log('   Connection URI:', dbUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('   Schema File: scripts/schema.sql');
  console.log('   Migration Script: node scripts/migrate_all_to_postgres.js');
}
console.log('=============================================================\n');
