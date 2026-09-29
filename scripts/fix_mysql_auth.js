// Automated MySQL Credential Diagnostic & .env Auto-Updater
// Usage: node scripts/fix_mysql_auth.js

const fs = require('fs');
const path = require('path');

function getEnvFile() {
  const envFiles = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'apps/web/.env.local'),
    path.join(process.cwd(), 'apps/web/.env')
  ];
  return envFiles.find(f => fs.existsSync(f)) || path.join(process.cwd(), '.env');
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

async function probeCredentials() {
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch (_) {
    console.error('❌ "mysql2" package is not installed. Run: npm install mysql2');
    process.exit(1);
  }

  // Passwords commonly used in local macOS development
  const candidatePasswords = [
    { label: 'Blank / Empty string (Homebrew default)', pass: '' },
    { label: '"root"', pass: 'root' },
    { label: '"admin"', pass: 'admin' },
    { label: '"123456"', pass: '123456' },
    { label: '"password"', pass: 'password' },
    { label: '"zecratary"', pass: 'zecratary' }
  ];

  const existingUrl = process.env.MYSQL_URL || '';
  if (existingUrl.startsWith('mysql://')) {
    try {
      const parsed = new URL(existingUrl);
      if (parsed.password) {
        const decoded = decodeURIComponent(parsed.password);
        if (!candidatePasswords.some(c => c.pass === decoded)) {
          candidatePasswords.unshift({ label: 'Current string in .env', pass: decoded });
        }
      }
    } catch (_) {}
  }

  const hosts = ['127.0.0.1', 'localhost'];
  let workingConn = null;

  console.log('\n-------------------------------------------------------------');
  console.log('🔍 Testing local MySQL credentials on port 3306...');
  console.log('-------------------------------------------------------------');

  for (const h of hosts) {
    for (const item of candidatePasswords) {
      process.stdout.write(`• Trying root@${h} with [${item.label}]... `);
      try {
        const conn = await mysql.createConnection({
          host: h,
          port: 3306,
          user: 'root',
          password: item.pass,
          connectTimeout: 2000
        });
        console.log('✅ SUCCESS!');
        workingConn = { host: h, pass: item.pass };
        await conn.end();
        break;
      } catch (err) {
        if (err.code === 'ECONNREFUSED') {
          console.log('\n❌ Connection refused: MySQL daemon is NOT running.');
          console.log('   Run: brew services start mysql\n');
          process.exit(1);
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
          console.log('❌ Denied');
        } else {
          console.log(`❌ (${err.message})`);
        }
      }
    }
    if (workingConn) break;
  }

  const targetEnv = getEnvFile();

  if (workingConn) {
    const encodedPass = encodeURIComponent(workingConn.pass);
    const newMysqlUrl = `mysql://root:${encodedPass}@${workingConn.host}:3306/zecratary`;

    console.log('\n🎉 Working MySQL Credentials Found!');
    console.log(`   Host:     ${workingConn.host}`);
    console.log(`   Password: "${workingConn.pass}"`);
    console.log(`   URL:      ${newMysqlUrl}`);

    let envContent = fs.existsSync(targetEnv) ? fs.readFileSync(targetEnv, 'utf-8') : '';
    if (envContent.includes('MYSQL_URL=')) {
      envContent = envContent.replace(/MYSQL_URL=[^\r\n]*/g, `MYSQL_URL="${newMysqlUrl}"`);
    } else {
      envContent += `\nMYSQL_URL="${newMysqlUrl}"\n`;
    }

    fs.writeFileSync(targetEnv, envContent, 'utf-8');
    console.log(`✓ Updated MYSQL_URL in ${path.basename(targetEnv)}`);

    console.log('\n🚀 Initializing MySQL database and schema...');
    const createDbScript = path.join(__dirname, 'create_mysql_db.js');
    if (fs.existsSync(createDbScript)) {
      require(createDbScript);
    } else {
      require('./migrate_to_mysql.js');
    }
  } else {
    console.log('\n⚠️ None of the standard local default passwords worked.');
    console.log('To reset your local macOS MySQL root password to blank, run:');
    console.log('  1) brew services stop mysql');
    console.log('  2) mysqld_safe --skip-grant-tables &');
    console.log('  3) mysql -u root -e "FLUSH PRIVILEGES; ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'\';"');
    console.log('  4) pkill -f mysqld && brew services start mysql');
  }
  console.log('-------------------------------------------------------------\n');
}

probeCredentials();
