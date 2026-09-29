// Monorepo shadcn executor
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2).join(' ');
const targetDir = fs.existsSync(path.join(process.cwd(), 'apps', 'web')) 
  ? path.join(process.cwd(), 'apps', 'web') 
  : process.cwd();

console.log(`📦 Running shadcn in ${targetDir}...`);
try {
  execSync(`npx shadcn@latest ${args}`, { cwd: targetDir, stdio: 'inherit' });
} catch (err) {
  process.exit(1);
}
