// Automated MySQL Password Setter & .env Synchronizer
// Usage: node scripts/set_mysql_password.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function getEnvFile() {
  const envCandidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'apps/web/.env.local'),
    path.join(process.cwd(), 'apps/web/.env')
  ];
  return envCandidates.find(f => fs.existsSync(f)) || path.join(process.cwd(), '.env');
}

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

async function main() {
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch (_) {
    console.error('❌ "mysql2" package is not installed. Run: npm install mysql2');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🐬 MySQL Password Configuration & Synchronization');
  console.log('======================================================');

  rl.question('Enter CURRENT root password (leave BLANK if empty/default): ', (currentPass) => {
    rl.question('Enter DESIRED NEW root password: ', async (newPass) => {
      newPass = newPass.trim();
      if (!newPass) {
        console.log('⚠️ Password cannot be empty.');
        rl.close();
        return;
      }

      console.log('\nConnecting to MySQL on 127.0.0.1:3306 with current password...');
      try {
        const conn = await mysql.createConnection({
          host: '127.0.0.1',
          port: 3306,
          user: 'root',
          password: currentPass
        });

        console.log('✓ Current authentication accepted. Updating root password...');
        
        // Update root password for localhost and 127.0.0.1
        await conn.query(`ALTER USER 'root'@'localhost' IDENTIFIED BY ?;`, [newPass]);
        try {
          await conn.query(`ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY ?;`, [newPass]);
        } catch (_) {}
        await conn.query('FLUSH PRIVILEGES;');
        await conn.end();

        console.log('✅ Password successfully updated in MySQL server!');

        // Update active .env file
        const envPath = getEnvFile();
        const encodedPass = encodeURIComponent(newPass);
        const newMysqlUrl = `mysql://root:${encodedPass}@127.0.0.1:3306/zecratary`;

        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        if (content.includes('MYSQL_URL=')) {
          content = content.replace(/MYSQL_URL=[^\r\n]*/g, `MYSQL_URL="${newMysqlUrl}"`);
        } else {
          content += `\nMYSQL_URL="${newMysqlUrl}"\n`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
        console.log(`✓ Updated MYSQL_URL in ${path.basename(envPath)}:`);
        console.log(`  ${newMysqlUrl.replace(/:[^:@]+@/, ':****@')}`);

        console.log('\nTesting new credentials...');
        const verifyConn = await mysql.createConnection({
          host: '127.0.0.1',
          port: 3306,
          user: 'root',
          password: newPass
        });
        console.log('🎉 Verification successful! Connection confirmed.');
        await verifyConn.end();

        console.log('\nYou can now run the MySQL migration:');
        console.log('  node scripts/create_mysql_db.js\n');

      } catch (err) {
        console.error('\n❌ Could not connect with the provided current password:', err.message);
        console.log('\nIf you do not know the current password, reset it in safe mode:');
        console.log('  1) brew services stop mysql');
        console.log('  2) mysqld_safe --skip-grant-tables &');
        console.log('  3) /opt/homebrew/bin/mysql -u root -e "FLUSH PRIVILEGES; ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'' + newPass + '\'; FLUSH PRIVILEGES;"');
        console.log('  4) pkill -f mysqld && brew services start mysql\n');
      } finally {
        rl.close();
      }
    });
  });
}

main();
