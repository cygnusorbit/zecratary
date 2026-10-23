// Universal Production Server Entry for Hostinger Node.js Web App
// GitHub: cygnusorbit/zecratary

const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

const standaloneCandidates = [
  path.join(__dirname, '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, 'apps', 'web', '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, '.next', 'standalone', 'server.js'),
  path.join(__dirname, 'apps', 'web', '.next', 'standalone', 'server.js')
];

const targetServer = standaloneCandidates.find(p => fs.existsSync(p));

if (targetServer) {
  console.log(`🚀 Booting Next.js Standalone Server from: ${targetServer}`);
  process.env.PORT = port;
  process.env.HOSTNAME = hostname;
  require(targetServer);
} else {
  console.log(`ℹ️ Standalone server bundle not detected. Starting standard Next.js runner on ${hostname}:${port}...`);
  try {
    const next = require('next');
    const appDir = fs.existsSync(path.join(__dirname, 'apps', 'web')) ? path.join(__dirname, 'apps', 'web') : __dirname;
    const app = next({ dev: false, dir: appDir, hostname, port });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      const http = require('http');
      http.createServer((req, res) => {
        handle(req, res);
      }).listen(port, hostname, (err) => {
        if (err) throw err;
        console.log(`✅ Zecratary Web Server active at http://${hostname}:${port}`);
      });
    }).catch(err => {
      console.error('❌ Failed to prepare Next.js app:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Error initializing Next.js:', err.message);
    process.exit(1);
  }
}
