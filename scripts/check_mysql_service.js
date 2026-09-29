// MySQL Service Diagnostic & Connection Doctor
// Usage: node scripts/check_mysql_service.js

const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function checkTcpPort(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ status: 'open' });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ status: 'timeout' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ status: 'error', error: err.code || err.message });
    });

    socket.connect(port, host);
  });
}

async function runDoctor() {
  const rawUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || '';
  let host = '127.0.0.1';
  let port = 3306;

  if (rawUrl && rawUrl.startsWith('mysql://')) {
    try {
      const u = new URL(rawUrl);
      host = u.hostname || host;
      port = u.port ? parseInt(u.port, 10) : port;
    } catch (_) {}
  }

  console.log('\n======================================================');
  console.log('🩺 MySQL Connection & Service Doctor');
  console.log('======================================================');
  console.log(`Checking connection to: ${host}:${port} ...`);

  const result = await checkTcpPort(host, port);

  if (result.status === 'open') {
    console.log(`✅ SUCCESS: Port ${port} is OPEN on ${host}.`);
    console.log('The MySQL daemon is active and accepting TCP connections.');
    console.log('\nYou can now proceed with:');
    console.log('  node scripts/migrate_to_mysql.js\n');
    return;
  }

  console.log(`\n❌ PORT CHECK FAILED: Connection ${result.error || result.status} on ${host}:${port}`);

  if (host === '127.0.0.1' || host === 'localhost') {
    console.log('\n[Root Cause]: The local MySQL service (mysqld) is not running on your Mac.');

    // Inspect Homebrew status on macOS
    try {
      const brewServices = execSync('brew services list', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      if (brewServices.includes('mysql')) {
        console.log('\nHomebrew MySQL service detected.');
        console.log('👉 Start it now with:');
        console.log('   brew services start mysql');
      } else {
        console.log('\nMySQL was not found in Homebrew services.');
        console.log('👉 Install and start MySQL with:');
        console.log('   brew install mysql');
        console.log('   brew services start mysql');
      }
    } catch (_) {
      console.log('👉 Run this command in your terminal to start MySQL:');
      console.log('   brew services start mysql');
    }

    console.log('\n[Alternative]: Follow Project Constraint 8 (PostgreSQL)');
    console.log('If you prefer to continue with PostgreSQL without local MySQL setup:');
    console.log('   node scripts/migrate_all_to_postgres.js');
  } else {
    console.log(`\n[Root Cause]: Remote host ${host} cannot be reached on port ${port}.`);
    console.log('Verify network firewalls, security groups, or SSH tunnels.');
  }

  console.log('======================================================\n');
}

runDoctor();
