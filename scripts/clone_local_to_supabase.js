// Automated Localhost-to-Supabase Database Cloner
// Usage: node scripts/clone_local_to_supabase.js

const fs = require('fs');
const path = require('path');

function readEnvFiles() {
  const envMap = { ...process.env };
  const candidateFiles = ['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'];

  for (const f of candidateFiles) {
    const fullPath = path.join(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const k = trimmed.slice(0, idx).trim();
            let v = trimmed.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (!envMap[k]) envMap[k] = v;
          }
        });
      } catch (_) {}
    }
  }
  return envMap;
}

async function cloneDatabase() {
  console.log('\n============================================================');
  console.log('🐘 LOCALHOST TO SUPABASE DATABASE CLONER');
  console.log('============================================================');

  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (err) {
    console.error('❌ "pg" driver is missing. Run: npm install pg');
    process.exit(1);
  }

  const env = readEnvFiles();

  const localDbUrl = env.DATABASE_URL_LOCAL_PG || 
    (env.DATABASE_URL && env.DATABASE_URL.includes('localhost') ? env.DATABASE_URL : 'postgresql://postgres:postgres@localhost:5432/zecratary?schema=public');

  const supabaseDbUrl = env.SUPABASE_DATABASE_URL || 
    (env.DATABASE_URL && (env.DATABASE_URL.includes('supabase.co') || env.DATABASE_URL.includes('pooler.supabase.com')) ? env.DATABASE_URL : '');

  console.log('Source (Localhost):', localDbUrl.replace(/:([^:@]+)@/, ':••••@'));
  console.log('Target (Supabase) :', supabaseDbUrl ? supabaseDbUrl.replace(/:([^:@]+)@/, ':••••@') : 'MISSING');
  console.log('------------------------------------------------------------');

  if (!supabaseDbUrl || supabaseDbUrl.includes('[YOUR-PASSWORD]')) {
    console.error('❌ Supabase connection string is missing or unconfigured.');
    console.log('👉 Please set SUPABASE_DATABASE_URL in .env.local:');
    console.log('   SUPABASE_DATABASE_URL="postgresql://postgres.tnhrkjtujdfgvwhsuuxb:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"\n');
    process.exit(1);
  }

  const localPool = new Pool({
    connectionString: localDbUrl,
    ssl: localDbUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });

  const supaPool = new Pool({
    connectionString: supabaseDbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    // 1. Verify Localhost Connection
    console.log('📡 [1/4] Verifying Localhost connection...');
    const localPing = await localPool.query('SELECT current_database() AS db, version() AS ver;');
    console.log(`   ✓ Connected to Localhost database "${localPing.rows[0].db}"`);

    // 2. Verify Supabase Connection
    console.log('📡 [2/4] Verifying Supabase Cloud connection...');
    const supaPing = await supaPool.query('SELECT current_database() AS db, version() AS ver;');
    console.log(`   ✓ Connected to Supabase database "${supaPing.rows[0].db}"`);

    // 3. Ensure Schema on Supabase
    console.log('\n📦 [3/4] Initializing Relational Schema on Supabase...');
    await supaPool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
        site_name VARCHAR(255) DEFAULT 'Zecratary',
        titlebar_emoji VARCHAR(32) DEFAULT '🍳',
        favicon_emoji VARCHAR(32) DEFAULT '🍳',
        currency VARCHAR(10) DEFAULT 'USD',
        ai_provider VARCHAR(64) DEFAULT 'gemini',
        ai_model VARCHAR(128) DEFAULT 'gemini-3.5-flash-lite',
        theme_colors JSONB DEFAULT '{}'::jsonb,
        payment_settings JSONB DEFAULT '{}'::jsonb,
        social_login JSONB DEFAULT '{}'::jsonb,
        chef_ai_settings JSONB DEFAULT '{}'::jsonb,
        recipe_types JSONB DEFAULT '[]'::jsonb,
        ingredient_categories JSONB DEFAULT '[]'::jsonb,
        supported_languages JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(64) UNIQUE NOT NULL,
        is_free BOOLEAN DEFAULT FALSE,
        is_default BOOLEAN DEFAULT FALSE,
        monthly_price_dollars NUMERIC(10, 2) DEFAULT 0.00,
        annual_price_dollars NUMERIC(10, 2) DEFAULT 0.00,
        monthly_badge VARCHAR(64) DEFAULT '',
        annual_badge VARCHAR(64) DEFAULT '',
        trial_badge VARCHAR(64) DEFAULT '',
        description_monthly TEXT DEFAULT '',
        description_annual TEXT DEFAULT '',
        button_text VARCHAR(64) DEFAULT 'Choose Plan',
        ai_recipe_limit INTEGER DEFAULT 5,
        recipe_library_limit INTEGER DEFAULT 25,
        social_scrape_limit INTEGER DEFAULT 5,
        can_view_macros BOOLEAN DEFAULT FALSE,
        allowed_ai_models TEXT DEFAULT 'gemini-3.5-flash-lite',
        features JSONB DEFAULT '[]'::jsonb,
        token_limit INTEGER DEFAULT 50000,
        token_reimburse_frequency VARCHAR(32) DEFAULT 'monthly',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(32) NOT NULL DEFAULT 'user',
        subscription_plan VARCHAR(64) DEFAULT 'taster',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(64) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        plan_name VARCHAR(255) NOT NULL,
        plan_slug VARCHAR(64),
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        gateway VARCHAR(32) NOT NULL DEFAULT 'stripe',
        status VARCHAR(32) NOT NULL DEFAULT 'succeeded',
        failure_reason TEXT,
        test_mode BOOLEAN DEFAULT TRUE,
        expiry_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS saved_recipes (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        recipe_type VARCHAR(64),
        cuisine VARCHAR(64),
        prep_time VARCHAR(32),
        cook_time VARCHAR(32),
        servings VARCHAR(32),
        difficulty VARCHAR(32),
        ingredients JSONB DEFAULT '[]'::jsonb,
        directions JSONB DEFAULT '[]'::jsonb,
        nutrition JSONB DEFAULT '{}'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        image_url TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS page_contents (
        page_slug VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        meta_description TEXT,
        content_blocks JSONB DEFAULT '[]'::jsonb,
        custom_attributes JSONB DEFAULT '{}'::jsonb,
        is_published BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS frontend_pages (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        is_default BOOLEAN DEFAULT FALSE,
        is_published BOOLEAN DEFAULT TRUE,
        elements JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✓ Schema verified on Supabase.');

    // 4. Clone Records in Relational Dependency Order
    console.log('\n🚀 [4/4] Cloning Data from Localhost to Supabase...');
    const tablesToClone = [
      'subscription_plans',
      'users',
      'admin_settings',
      'payment_transactions',
      'saved_recipes',
      'page_contents',
      'frontend_pages'
    ];

    const auditResults = [];

    for (const table of tablesToClone) {
      try {
        const localRows = await localPool.query(`SELECT * FROM ${table};`);
        const count = localRows.rows.length;

        if (count === 0) {
          auditResults.push({ table, local: 0, supa: 0, status: 'Empty' });
          continue;
        }

        for (const row of localRows.rows) {
          const keys = Object.keys(row);
          const values = Object.values(row).map((v) => {
            if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
              return JSON.stringify(v);
            }
            return v;
          });

          const cols = keys.join(', ');
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const conflictCol = keys.includes('id') ? 'id' : keys.includes('page_slug') ? 'page_slug' : keys[0];

          const updateCols = keys
            .filter((k) => k !== conflictCol)
            .map((k) => `${k} = EXCLUDED.${k}`)
            .join(', ');

          const upsertSql = updateCols
            ? `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateCols};`
            : `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO NOTHING;`;

          await supaPool.query(upsertSql, values);
        }

        const supaCheck = await supaPool.query(`SELECT count(*)::int AS count FROM ${table};`);
        auditResults.push({
          table,
          local: count,
          supa: supaCheck.rows[0].count,
          status: 'Synced'
        });
        console.log(`   ✓ ${table.padEnd(24)} : ${count} rows cloned`);
      } catch (err) {
        auditResults.push({ table, local: 'Error', supa: '—', status: err.message });
        console.warn(`   ⚠️ ${table}: ${err.message}`);
      }
    }

    console.log('\n============================================================');
    console.log('📊 DATABASE CLONE AUDIT REPORT');
    console.log('============================================================');
    console.log('Table Name'.padEnd(25) + 'Localhost'.padEnd(12) + 'Supabase'.padEnd(12) + 'Status');
    console.log('------------------------------------------------------------');
    for (const r of auditResults) {
      console.log(
        r.table.padEnd(25) +
        String(r.local).padEnd(12) +
        String(r.supa).padEnd(12) +
        r.status
      );
    }
    console.log('============================================================');
    console.log('✨ Localhost database successfully cloned to Supabase!\n');

  } catch (err) {
    console.error('\n❌ Cloning Failed:', err.message);
  } finally {
    await localPool.end().catch(() => {});
    await supaPool.end().catch(() => {});
  }
}

cloneDatabase();
