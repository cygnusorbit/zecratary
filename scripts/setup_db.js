// Database Connection & Configuration Helper
// Usage: node scripts/setup_db.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');


function loadEnvironmentVariables() {
  const fs = require('fs');
  const path = require('path');
  const candidateFiles = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'apps/web/.env'),
    path.join(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../.env.local')
  ];

  let loadedCount = 0;
  for (const envFile of candidateFiles) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
            loadedCount++;
          }
        }
      } catch (_) {}
    }
  }
}
loadEnvironmentVariables();


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n======================================================');
console.log('🛠️  Zecratary Database Configuration Manager');
console.log('======================================================');

const currentDbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (currentDbUrl) {
  console.log(`✓ Detected existing DATABASE_URL: ${currentDbUrl.replace(/:[^:@]+@/, ':****@')}`);
} else {
  console.log('ℹ️  No DATABASE_URL configured yet (Using Server JSON flat files).');
}

console.log('\nChoose an option:');
console.log('  1) Test Current Connection & Run Migration');
console.log('  2) Enter New PostgreSQL DATABASE_URL');
console.log('  3) Use Server JSON Storage (No Database Needed)');
console.log('  4) Exit\n');

rl.question('Select [1-4]: ', async (choice) => {
  choice = choice.trim();

  if (choice === '1') {
    rl.close();
    require('./migrate_to_postgres.js');
    return;
  }

  if (choice === '2') {
    rl.question('\nEnter PostgreSQL connection string (e.g. postgresql://user:pass@localhost:5432/zecratary):\n> ', (newUrl) => {
      newUrl = newUrl.trim();
      if (!newUrl) {
        console.log('Cancelled.');
        rl.close();
        return;
      }

      // Write to .env file
      const envPath = fs.existsSync(path.join(process.cwd(), '.env.local')) 
        ? path.join(process.cwd(), '.env.local') 
        : path.join(process.cwd(), '.env');

      let currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      if (currentEnv.includes('DATABASE_URL=')) {
        currentEnv = currentEnv.replace(/DATABASE_URL=[^\r\n]*/g, `DATABASE_URL="${newUrl}"`);
      } else {
        currentEnv += `\nDATABASE_URL="${newUrl}"\n`;
      }

      fs.writeFileSync(envPath, currentEnv, 'utf-8');
      console.log(`✓ Saved DATABASE_URL to ${path.basename(envPath)}`);
      process.env.DATABASE_URL = newUrl;

      rl.close();
      console.log('\nProceeding to migrate existing JSON records to PostgreSQL...');
      require('./migrate_to_postgres.js');
    });
    return;
  }

  if (choice === '3') {
    console.log('\n✓ Server JSON Storage confirmed active.');
    console.log('  • Storage directory: data/*.json & apps/web/data/*.json');
    console.log('  • Browser LocalStorage: Completely bypassed.');
    console.log('  • All admin settings, users, and plans persist automatically.\n');
    rl.close();
    return;
  }

  console.log('Exiting.');
  rl.close();
});
