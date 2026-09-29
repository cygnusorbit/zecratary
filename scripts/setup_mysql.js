// Interactive MySQL Configuration & Migration Runner
// Usage: node scripts/setup_mysql.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Zero-dependency .env file parser
function loadEnv() {
  const envFiles = ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local'];
  for (const ef of envFiles) {
    const full = path.join(process.cwd(), ef);
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n======================================================');
console.log('🐬 MySQL Connection & Migration Assistant');
console.log('======================================================');

const currentMysqlUrl = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://') ? process.env.DATABASE_URL : '');

if (currentMysqlUrl) {
  console.log(`Current MySQL URL: ${currentMysqlUrl.replace(/:[^:@]+@/, ':****@')}`);
} else {
  console.log('Status: No active MySQL connection string set.');
}

console.log('\nOptions:');
console.log('  1) Run Migration with Current Settings');
console.log('  2) Enter / Update MySQL Credentials (host, port, user, password, db)');
console.log('  3) Paste Full MYSQL_URL connection string');
console.log('  4) Exit\n');

rl.question('Select option [1-4]: ', async (choice) => {
  choice = choice.trim();

  if (choice === '1') {
    rl.close();
    require('./migrate_to_mysql.js');
    return;
  }

  if (choice === '2') {
    rl.question('MySQL Host [127.0.0.1]: ', (host) => {
      host = host.trim() || '127.0.0.1';
      rl.question('MySQL Port [3306]: ', (port) => {
        port = port.trim() || '3306';
        rl.question('MySQL User [root]: ', (user) => {
          user = user.trim() || 'root';
          rl.question('MySQL Password: ', (pass) => {
            pass = pass.trim();
            rl.question('Database Name [zecratary]: ', (dbName) => {
              dbName = dbName.trim() || 'zecratary';

              const encodedPass = encodeURIComponent(pass);
              const builtUrl = `mysql://${encodeURIComponent(user)}:${encodedPass}@${host}:${port}/${dbName}`;

              saveMysqlUrl(builtUrl);
              rl.close();
              console.log('\nProceeding to run migration...');
              require('./migrate_to_mysql.js');
            });
          });
        });
      });
    });
    return;
  }

  if (choice === '3') {
    rl.question('\nEnter MYSQL_URL: ', (newUrl) => {
      newUrl = newUrl.trim();
      if (!newUrl) {
        console.log('Aborted.');
        rl.close();
        return;
      }
      saveMysqlUrl(newUrl);
      rl.close();
      console.log('\nProceeding to run migration...');
      require('./migrate_to_mysql.js');
    });
    return;
  }

  console.log('Exiting.');
  rl.close();
});

function saveMysqlUrl(url) {
  const envPath = fs.existsSync(path.join(process.cwd(), '.env.local'))
    ? path.join(process.cwd(), '.env.local')
    : path.join(process.cwd(), '.env');

  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  if (content.includes('MYSQL_URL=')) {
    content = content.replace(/MYSQL_URL=[^\r\n]*/g, `MYSQL_URL="${url}"`);
  } else {
    content += `\nMYSQL_URL="${url}"\n`;
  }

  fs.writeFileSync(envPath, content, 'utf-8');
  process.env.MYSQL_URL = url;
  console.log(`✓ Saved MYSQL_URL to ${path.basename(envPath)}`);
}
