// Supabase Secret Key & Admin API Diagnostic Suite
// Tests HTTPS Admin Auth API, PostgREST API, and TCP Database status

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = ['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'];
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

const supabaseUrl = process.env.SUPABASE_URL || 'https://tnhrkjtujdfgvwhsuuxb.supabase.co';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function runAudit() {
  console.log('\n============================================================');
  console.log('🔒 SUPABASE SECRET KEY & ADMIN GATEWAY DIAGNOSTICS');
  console.log('============================================================');
  console.log('Endpoint URL       :', supabaseUrl);
  console.log('Secret Key (Admin) :', secretKey ? `${secretKey.slice(0, 15)}...${secretKey.slice(-6)}` : 'MISSING');
  console.log('Publishable Key    :', publishableKey ? `${publishableKey.slice(0, 18)}...` : 'MISSING');
  console.log('Database URL (TCP) :', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT CONFIGURED');
  console.log('------------------------------------------------------------');

  if (!secretKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not defined.');
    process.exit(1);
  }

  // TEST 1: Public Health Ping
  console.log('\n📡 [1/3] Testing Supabase Public Auth Gateway...');
  try {
    const start = Date.now();
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` }
    });
    const latency = Date.now() - start;
    if (res.ok) {
      console.log(`✅ Public Auth Gateway reachable (${res.status} OK) - ${latency}ms`);
    } else {
      console.log(`⚠️ Public Auth Gateway returned HTTP ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    console.error('❌ Failed to reach Auth endpoint:', err.message);
  }

  // TEST 2: Admin Users API (Validates Secret Service Role Key)
  console.log('\n🛡️ [2/3] Validating Supabase Secret Key via Admin Auth API...');
  try {
    const start = Date.now();
    const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`
      }
    });
    const latency = Date.now() - start;

    if (adminRes.ok) {
      const data = await adminRes.json();
      const userCount = Array.isArray(data?.users) ? data.users.length : (data?.length || 0);
      console.log(`✅ Secret Key VALIDATED! Admin privileges confirmed (${adminRes.status} OK) - ${latency}ms`);
      console.log(`   Sample Admin Query: Retrieved user metadata successfully.`);
    } else if (adminRes.status === 401 || adminRes.status === 403) {
      console.log(`❌ Authentication failed (HTTP ${adminRes.status}). Verify secret key string.`);
    } else {
      console.log(`ℹ️ Admin endpoint responded with HTTP ${adminRes.status}: ${adminRes.statusText}`);
    }
  } catch (err) {
    console.error('❌ Admin verification failed:', err.message);
  }

  // TEST 3: PostgREST REST API
  console.log('\n📦 [3/3] Testing PostgREST Schema Root with Secret Key...');
  try {
    const restRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`
      }
    });
    if (restRes.ok) {
      console.log(`✅ PostgREST API Handshake Successful (${restRes.status} OK)`);
    } else {
      console.log(`ℹ️ PostgREST responded with HTTP ${restRes.status}`);
    }
  } catch (err) {
    console.error('❌ PostgREST check failed:', err.message);
  }

  // STEP 4: Relational PostgreSQL Check
  console.log('\n🐘 Relational PostgreSQL TCP Status (Constraint 8):');
  if (dbUrl && !dbUrl.includes('[YOUR-PASSWORD]')) {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
      const ping = await pool.query('SELECT current_database() AS db, NOW() AS now;');
      console.log(`✅ PostgreSQL TCP Connected to [${ping.rows[0].db}] at ${ping.rows[0].now}`);
      await pool.end();
    } catch (dbErr) {
      console.log(`ℹ️ PostgreSQL TCP connection notice: ${dbErr.message}`);
    }
  } else {
    console.log('ℹ️ DATABASE_URL is not set or contains placeholder password.');
    console.log('   In Hostinger hPanel Environment Variables, add:');
    console.log('   DATABASE_URL="postgresql://postgres.tnhrkjtujdfgvwhsuuxb:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"');
  }

  console.log('\n============================================================');
  console.log('✨ Diagnostic check complete.');
  console.log('============================================================\n');
}

runAudit();
