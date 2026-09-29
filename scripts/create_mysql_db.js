// Automated MySQL Database Provisioner
// Usage: node scripts/create_mysql_db.js

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

async function createDatabase() {
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch (e) {
    console.error('❌ "mysql2" package is not installed. Run: npm install mysql2');
    process.exit(1);
  }

  const rawUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || '';
  let host = '127.0.0.1';
  let port = 3306;
  let user = 'root';
  let password = '';
  let targetDb = 'zecratary';

  if (rawUrl && rawUrl.startsWith('mysql://')) {
    try {
      const u = new URL(rawUrl);
      host = u.hostname || host;
      port = u.port ? parseInt(u.port, 10) : port;
      user = decodeURIComponent(u.username || user);
      password = decodeURIComponent(u.password || '');
      if (u.pathname && u.pathname.length > 1) {
        targetDb = u.pathname.slice(1);
      }
    } catch (_) {}
  }

  console.log('\n--------------------------------------------------');
  console.log('🐬 Creating MySQL Database via Node.js connection...');
  console.log(`   Host: ${host}:${port}`);
  console.log(`   User: ${user}`);
  console.log(`   Target Database: ${targetDb}`);
  console.log('--------------------------------------------------');

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    await conn.query(
      "CREATE DATABASE IF NOT EXISTS `" + targetDb + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    );

    console.log(`✅ Database "${targetDb}" successfully created or verified!`);
    await conn.end();

    console.log('\n🚀 Running migration to apply schema and sync data...');
    const migrateScript = path.join(__dirname, 'migrate_to_mysql.js');
    if (fs.existsSync(migrateScript)) {
      require(migrateScript);
    } else {
      console.log('Ready for migration.');
    }
  } catch (err) {
    console.error('❌ MySQL Connection failed:', err.message);
  }
}

createDatabase();
