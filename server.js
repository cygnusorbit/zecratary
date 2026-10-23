// Universal LiteSpeed / lsnode.js Production Server Launcher
// GitHub: cygnusorbit/zecratary
// Satisfies Hostinger Node.js Web App Deployment Requirements

const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

process.env.PORT = String(port);
process.env.HOSTNAME = hostname;

console.log(`[Zecratary Boot] Initializing on Node.js ${process.version}`);
console.log(`[Zecratary Boot] Target Port: ${port} | Hostname: ${hostname}`);
console.log(`[Zecratary Boot] __dirname: ${__dirname}`);
console.log(`[Zecratary Boot] process.cwd(): ${process.cwd()}`);

// Priority search candidates for Next.js standalone server entry point
// In Hostinger monorepo deployments, the files are copied into:
// /home/u472824187/domains/zecratary.com/hbuilds/current/nodejs/apps/web/server.js
const candidates = [
  path.join(__dirname, 'apps', 'web', 'server.js'),
  path.join(__dirname, '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, 'apps', 'web', '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, 'standalone', 'apps', 'web', 'server.js'),
  path.join(process.cwd(), 'apps', 'web', 'server.js'),
  path.join(process.cwd(), '.next', 'standalone', 'apps', 'web', 'server.js'),
  path.join(__dirname, '.next', 'standalone', 'server.js'),
  path.join(__dirname, 'standalone', 'server.js'),
];

let targetServer = null;
for (const cand of candidates) {
  if (fs.existsSync(cand) && path.resolve(cand) !== path.resolve(__filename)) {
    targetServer = cand;
    break;
  }
}

if (targetServer) {
  console.log(`🚀 [Hostinger lsnode] Booting Next.js standalone server from: ${targetServer}`);

  const targetDir = path.dirname(targetServer);
  if (fs.existsSync(path.join(targetDir, '.next'))) {
    try {
      process.chdir(targetDir);
      console.log(`✓ [Hostinger lsnode] Switched working directory to: ${targetDir}`);
    } catch (err) {
      console.warn('chdir notice:', err.message);
    }
  }

  // Execute Next.js standalone server bundle (binds LiteSpeed socket via customListen)
  require(targetServer);
} else {
  console.log(`ℹ️ Standalone server candidate not found. Attempting Next.js runtime fallback...`);

  let nextModule = null;
  const nextResolutionPaths = [
    'next',
    path.join(__dirname, 'node_modules', 'next'),
    path.join(__dirname, 'apps', 'web', 'node_modules', 'next'),
    path.join(process.cwd(), 'node_modules', 'next'),
    path.join(process.cwd(), 'apps', 'web', 'node_modules', 'next'),
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
    console.error('Checked standalone paths:', candidates);
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
