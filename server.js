// Universal Production Server Entry for Hostinger Node.js Web App (LiteSpeed / lsnode)
// GitHub: cygnusorbit/zecratary

const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Comprehensive candidate list for Next.js standalone server entry
const standaloneCandidates = [
  path.join(__dirname, '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, 'apps', 'web', '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, '.next', 'standalone', 'server.js'),
  path.join(__dirname, 'apps', 'web', '.next', 'standalone', 'server.js'),
  path.join(__dirname, 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, 'standalone', 'server.js'),
];

let targetServer = standaloneCandidates.find(p => fs.existsSync(p));

if (targetServer) {
  console.log(`🚀 Booting Next.js Standalone Server from: ${targetServer}`);
  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;
  require(targetServer);
} else {
  console.log(`ℹ️ Standalone server bundle not detected. Attempting Next.js runtime resolution...`);
  let nextModule = null;
  const nextResolutionPaths = [
    'next',
    path.join(__dirname, 'node_modules', 'next'),
    path.join(__dirname, 'apps', 'web', 'node_modules', 'next'),
    path.join(process.cwd(), 'node_modules', 'next'),
    path.join(process.cwd(), 'apps', 'web', 'node_modules', 'next')
  ];

  for (const np of nextResolutionPaths) {
    try {
      nextModule = require(np);
      console.log(`✓ Resolved Next.js from: ${np}`);
      break;
    } catch (_) {}
  }

  if (!nextModule) {
    console.error('❌ FATAL: Cannot resolve Next.js or standalone server in runtime environment.');
    console.error('Checked standalone paths:', standaloneCandidates);
    console.error('Checked Next module paths:', nextResolutionPaths);
    process.exit(1);
  }

  const appDir = fs.existsSync(path.join(__dirname, 'apps', 'web'))
    ? path.join(__dirname, 'apps', 'web')
    : __dirname;

  const app = nextModule({ dev: false, dir: appDir, hostname, port: Number(port) });
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
}
