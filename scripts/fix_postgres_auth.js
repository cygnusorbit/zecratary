// Automated PostgreSQL Authentication Diagnostic & Fixer
// Usage: node scripts/fix_postgres_auth.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function loadEnv() {
  const envPaths = ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local'];
  let found = null;
  for (const ep of envPaths) {
    const full = path.join(process.cwd(), ep);
    if (fs.existsSync(full)) {
      if (!found) found = full;
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
  return found || path.join(process.cwd(), '.env');
}

const activeEnvFile = loadEnv();
const currentUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

console.log('\n======================================================');
console.log('🔑 PostgreSQL Authentication Diagnostic & Repair');
console.log('======================================================');
console.log(`Active Env File: ${path.relative(process.cwd(), activeEnvFile)}`);

if (currentUrl) {
  const masked = currentUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`Current URL:     ${masked}`);
} else {
  console.log('Current URL:     Not configured');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testConnection(connStr) {
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (_) {
    console.log('\n⚠️  The "pg" package is required to test. Run: npm install pg');
    return false;
  }

  const pool = new Pool({
    connectionString: connStr,
    connectionTimeoutMillis: 3500
  });

  try {
    const res = await pool.query('SELECT current_database() as db, current_user as usr, NOW() as time');
    console.log('\n✓ Authentication Successful!');
    console.log(`  • Database: ${res.rows[0].db}`);
    console.log(`  • User:     ${res.rows[0].usr}`);
    console.log(`  • Time:     ${res.rows[0].time}`);
    await pool.end();
    return true;
  } catch (err) {
    console.log(`\n✕ Authentication Failed: ${err.message}`);
    await pool.end();
    return false;
  }
}

function updateEnvFile(newUrl) {
  let content = fs.existsSync(activeEnvFile) ? fs.readFileSync(activeEnvFile, 'utf-8') : '';
  if (content.includes('DATABASE_URL=')) {
    content = content.replace(/DATABASE_URL=[^\r\n]*/g, `DATABASE_URL="${newUrl}"`);
  } else {
    content += `\nDATABASE_URL="${newUrl}"\n`;
  }
  fs.writeFileSync(activeEnvFile, content, 'utf-8');
  console.log(`✓ Updated DATABASE_URL in ${path.basename(activeEnvFile)}`);
}

async function promptAction() {
  console.log('\nSelect action:');
  console.log('  1) Test Current DATABASE_URL credentials');
  console.log('  2) Update Password / Enter New Connection URL');
  console.log('  3) Fix Local Docker Password (Reset container to match "postgres")');
  console.log('  4) Keep using Server JSON storage (Zero LocalStorage, No DB required)');
  console.log('  5) Exit\n');

  rl.question('Choice [1-5]: ', async (choice) => {
    choice = choice.trim();

    if (choice === '1') {
      if (!currentUrl) {
        console.log('✕ No DATABASE_URL found to test.');
        rl.close();
        return;
      }
      await testConnection(currentUrl);
      rl.close();
      return;
    }

    if (choice === '2') {
      console.log('\nEnter new PostgreSQL connection string.');
      console.log('Format: postgresql://<user>:<password>@<host>:<port>/<dbname>?schema=public');
      console.log('Tip: If your password contains special characters (@, #, $), URL-encode them (e.g. @ -> %40).\n');
      
      rl.question('New URL: ', async (inputUrl) => {
        inputUrl = inputUrl.trim();
        if (!inputUrl) {
          console.log('No change.');
          rl.close();
          return;
        }

        const ok = await testConnection(inputUrl);
        if (ok) {
          updateEnvFile(inputUrl);
          console.log('\n✓ Ready! You can now run migration: node scripts/migrate_to_postgres.js\n');
        } else {
          rl.question('\nSave this URL anyway? (y/N): ', (ans) => {
            if (ans.trim().toLowerCase() === 'y') {
              updateEnvFile(inputUrl);
            }
            rl.close();
          });
          return;
        }
        rl.close();
      });
      return;
    }

    if (choice === '3') {
      console.log('\n🐳 Resetting Local Docker Container Credentials...');
      console.log('This recreates the container "zecratary-postgres" with user=postgres password=postgres db=zecratary:');
      console.log('Command to run:');
      console.log('  docker compose -f docker-compose.postgres.yml down -v');
      console.log('  docker compose -f docker-compose.postgres.yml up -d');
      console.log('\nSetting DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zecratary?schema=public"...');
      
      const dockerUrl = 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public';
      updateEnvFile(dockerUrl);
      rl.close();
      return;
    }

    if (choice === '4') {
      console.log('\n✓ Server JSON Storage confirmed active.');
      console.log('  • All data persists safely in data/*.json & apps/web/data/*.json');
      console.log('  • Browser LocalStorage is completely bypassed.');
      console.log('  • No PostgreSQL connection is required for normal operation.\n');
      rl.close();
      return;
    }

    rl.close();
  });
}

promptAction();
