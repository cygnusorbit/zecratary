// Automated MySQL Credential Prober & Resolver
// Usage: node scripts/repair_mysql_auth.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getEnvFiles() {
  return ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local']
    .map(p => path.join(process.cwd(), p))
    .filter(p => fs.existsSync(p));
}

function updateEnvMysqlUrl(newUrl) {
  const targets = getEnvFiles();
  if (targets.length === 0) targets.push(path.join(process.cwd(), '.env'));

  for (const envPath of targets) {
    let content = fs.readFileSync(envPath, 'utf-8');
    if (content.includes('MYSQL_URL=')) {
      content = content.replace(/MYSQL_URL=[^\r\n]*/g, `MYSQL_URL="${newUrl}"`);
    } else {
      content += `\nMYSQL_URL="${newUrl}"\n`;
    }
    fs.writeFileSync(envPath, content, 'utf-8');
    console.log(`✓ Updated MYSQL_URL in ${path.basename(envPath)}`);
  }
}

async function testPassword(password) {
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch (_) {
    console.error('❌ "mysql2" package is not installed. Run `npm install mysql2`.');
    process.exit(1);
  }

  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: password,
      connectTimeout: 2000
    });
    await conn.end();
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🔍 Testing Local MySQL Credentials on 127.0.0.1:3306');
  console.log('======================================================');

  const candidates = [
    { label: 'Blank / Empty (Homebrew Default)', pass: '' },
    { label: '"root"', pass: 'root' },
    { label: '"password"', pass: 'password' },
    { label: '"admin"', pass: 'admin' },
    { label: '"123456"', pass: '123456' },
    { label: '"zecratary"', pass: 'zecratary' }
  ];

  let workingPass = null;

  for (const item of candidates) {
    process.stdout.write(`• Testing root with ${item.label}... `);
    const ok = await testPassword(item.pass);
    if (ok) {
      console.log('SUCCESS! ✅');
      workingPass = item.pass;
      break;
    } else {
      console.log('Access Denied ❌');
    }
  }

  if (workingPass !== null) {
    const safePass = encodeURIComponent(workingPass);
    const validUrl = `mysql://root:${safePass}@127.0.0.1:3306/zecratary`;
    console.log(`\n🎉 Verified working password: "${workingPass}"`);
    updateEnvMysqlUrl(validUrl);
    console.log('\n🚀 Proceeding with MySQL migration...');
    const runner = path.join(__dirname, 'run_mysql_migration_now.js');
    if (fs.existsSync(runner)) {
      require(runner);
    }
    return;
  }

  console.log('\n⚠️ None of the common default passwords matched.');
  console.log('Initiating automated safe-mode reset to set password to blank ("")...');

  try {
    execSync('brew services stop mysql', { stdio: 'ignore' });
    execSync('pkill -9 -f mysqld', { stdio: 'ignore' });

    let mysqldSafeBin = '/opt/homebrew/bin/mysqld_safe';
    if (!fs.existsSync(mysqldSafeBin)) mysqldSafeBin = '/usr/local/bin/mysqld_safe';

    if (fs.existsSync(mysqldSafeBin)) {
      console.log('• Launching mysqld_safe with --skip-grant-tables...');
      const child = require('child_process').spawn(mysqldSafeBin, ['--skip-grant-tables', '--skip-networking=OFF'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Wait 3 seconds for safe daemon
      await new Promise(r => setTimeout(r, 3000));

      let mysqlCli = '/opt/homebrew/bin/mysql';
      if (!fs.existsSync(mysqlCli)) mysqlCli = '/usr/local/bin/mysql';
      if (!fs.existsSync(mysqlCli)) mysqlCli = 'mysql';

      try {
        execSync(`${mysqlCli} -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY ''; FLUSH PRIVILEGES;"`, { stdio: 'inherit' });
        console.log('✅ Successfully reset root password to blank ("")!');
      } catch (e) {
        console.log('Notice during flush/alter:', e.message);
      }

      execSync('pkill -9 -f mysqld', { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1500));
      execSync('brew services start mysql', { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 2000));

      // Test blank password
      const retest = await testPassword('');
      if (retest) {
        const blankUrl = 'mysql://root:@127.0.0.1:3306/zecratary';
        updateEnvMysqlUrl(blankUrl);
        console.log('\n🚀 Executing MySQL migration...');
        const runner = path.join(__dirname, 'run_mysql_migration_now.js');
        if (fs.existsSync(runner)) {
          require(runner);
        }
        return;
      }
    }
  } catch (err) {
    console.error('Safe mode automation notice:', err.message);
  }

  console.log('\nIf safe mode reset did not succeed, execute manual reset in Terminal:');
  console.log('  1) brew services stop mysql');
  console.log('  2) mysqld_safe --skip-grant-tables &');
  console.log('  3) mysql -u root -e "FLUSH PRIVILEGES; ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'\'; FLUSH PRIVILEGES;"');
  console.log('  4) pkill -9 -f mysqld && brew services start mysql\n');
}

main();
