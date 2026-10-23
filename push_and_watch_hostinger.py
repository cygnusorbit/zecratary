import os
import sys
import subprocess
import urllib.request
import urllib.error
import json
import ssl
import time

print("==================================================================")
print("🚀 ZECRATARY: Git Push & Hostinger Extended Health Watcher")
print("   Domain: https://zecratary.com")
print("   Repository: cygnusorbit/zecratary (GitHub)")
print("==================================================================\n")

# ----------------------------------------------------------------------
# 1. Ensure /api/health/route.ts exists in apps/web/src/app/api/health
# ----------------------------------------------------------------------
health_file = os.path.join(os.getcwd(), 'apps', 'web', 'src', 'app', 'api', 'health', 'route.ts')
if not os.path.exists(health_file):
    os.makedirs(os.path.dirname(health_file), exist_ok=True)
    health_code = r'''import { NextResponse } from 'next/server';
import { query, getDatabaseDialect, getConnectionString } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const uptime = process.uptime();
  let dbStatus = 'disconnected';
  let dialect = 'unknown';
  let serverTime: any = null;
  let dbError: string | null = null;
  let tableCount = 0;

  try {
    dialect = getDatabaseDialect();
    const connStr = getConnectionString();

    if (connStr) {
      const sql = dialect === 'postgres'
        ? 'SELECT NOW() AS server_time, current_database() AS db_name;'
        : 'SELECT NOW() AS server_time, DATABASE() AS db_name;';

      const rows: any = await query(sql);
      const row = Array.isArray(rows) ? rows[0] : (rows?.rows?.[0] || null);

      if (row) {
        dbStatus = 'connected';
        serverTime = row.server_time || row.NOW || new Date().toISOString();
      }

      const tableSql = dialect === 'postgres'
        ? "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = 'public';"
        : "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE();";

      const tableRows: any = await query(tableSql).catch(() => []);
      const tRow = Array.isArray(tableRows) ? tableRows[0] : (tableRows?.rows?.[0] || null);
      tableCount = tRow?.total ? Number(tRow.total) : 0;
    }
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err?.message || 'Database connection error';
  }

  return NextResponse.json(
    {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      environment: process.env.NODE_ENV || 'production',
      domain: 'zecratary.com',
      database: {
        status: dbStatus,
        dialect,
        serverTime,
        publicTables: tableCount,
        error: dbError,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  );
}
'''
    with open(health_file, 'w', encoding='utf-8') as f:
        f.write(health_code)
    print(f"✓ Provisioned {os.path.relpath(health_file)}")

# Also mirror to src/app/api/health/route.ts
root_health = os.path.join(os.getcwd(), 'src', 'app', 'api', 'health', 'route.ts')
if not os.path.exists(root_health):
    os.makedirs(os.path.dirname(root_health), exist_ok=True)
    with open(health_file, 'r', encoding='utf-8') as src_f, open(root_health, 'w', encoding='utf-8') as dst_f:
        dst_f.write(src_f.read())
    print(f"✓ Mirrored to {os.path.relpath(root_health)}")

# ----------------------------------------------------------------------
# 2. Stage, Commit & Push to GitHub
# ----------------------------------------------------------------------
print("\n• Checking git working directory status...")
subprocess.run(["git", "add", "apps/web/src/app/api/health", "src/app/api/health"], check=False)
status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout

if "api/health" in status or status.strip():
    print("• Committing uncommitted changes...")
    subprocess.run(["git", "commit", "-m", "Ensure /api/health route is present for Hostinger production deployment"], check=False)
    print("• Pushing to GitHub main branch...")
    push_res = subprocess.run(["git", "push", "origin", "main"])
    if push_res.returncode == 0:
        print("✅ Pushed latest commit to GitHub successfully!")
    else:
        print("⚠️ Warning: git push returned an error. Check remote permissions.")
else:
    print("✓ All health route files are already committed to local git.")
    print("• Verifying remote sync with 'git push origin main'...")
    subprocess.run(["git", "push", "origin", "main"], check=False)

# Display latest commit hash
head_commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
print(f"✓ Current Local HEAD Commit: {head_commit}")

print("\n" + "="*70)
print("👉 ACTION REQUIRED IN HOSTINGER HPANEL:")
print("   1. Open Hostinger hPanel -> Websites -> Manage -> Node.js Web App")
print("   2. Click 'Save and redeploy' (or 'Deploy') to trigger the build")
print("   3. Turn ON the 'Auto-deployment' toggle for future automatic deploys")
print("="*70 + "\n")

# ----------------------------------------------------------------------
# 3. Extended Live Polling (Up to 3 minutes with 15s intervals)
# ----------------------------------------------------------------------
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Connection": "close"
}

target_url = "https://zecratary.com/api/health"
max_attempts = 12
interval_seconds = 15

print(f"🔍 Monitoring {target_url} (Will poll every {interval_seconds}s for up to 3 minutes)...")

for attempt in range(1, max_attempts + 1):
    sys.stdout.write(f"[{attempt}/{max_attempts}] Pinging {target_url}... ")
    sys.stdout.flush()
    t0 = time.time()
    try:
        req = urllib.request.Request(target_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
            latency = int((time.time() - t0) * 1000)
            body = res.read().decode('utf-8', errors='ignore')
            if res.status == 200:
                print(f"✅ SUCCESS! [HTTP 200] ({latency}ms)")
                try:
                    data = json.loads(body)
                    db_info = data.get('database', {})
                    print("\n🎉 LIVE HEALTH TELEMETRY VERIFIED:")
                    print(f"   • Overall Status : {data.get('status')}")
                    print(f"   • Database       : {db_info.get('status')} ({db_info.get('dialect')})")
                    print(f"   • Public Tables  : {db_info.get('publicTables')}")
                    print(f"   • Server Time    : {db_info.get('serverTime')}")
                    print(f"   • Uptime Seconds : {data.get('uptimeSeconds')}")
                except Exception:
                    print(f"   ↳ Response Body: {body[:150]}")
                break
            else:
                print(f"HTTP {res.status} ({latency}ms)")
    except urllib.error.HTTPError as e:
        latency = int((time.time() - t0) * 1000)
        print(f"HTTP {e.code} ({latency}ms) - {e.reason}")
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        print(f"Error ({latency}ms): {e}")

    if attempt < max_attempts:
        time.sleep(interval_seconds)

print("\n==================================================================")
print("✨ Script finished.")
print("==================================================================")
