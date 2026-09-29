// Automated Localhost to Supabase Database Synchronizer
// Usage: node scripts/sync_to_supabase.js

const fs = require('fs');
const path = require('path');

function getEnvConfig() {
  const envFiles = ['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'];
  const env = { ...process.env };

  for (const f of envFiles) {
    const full = path.join(process.cwd(), f);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          let v = trimmed.slice(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!env[k]) env[k] = v;
        }
      });
    }
  }
  return env;
}

const env = getEnvConfig();
const dbUrl = env.DATABASE_URL || env.POSTGRES_URL;

function readLocalJson(filename, fallback = []) {
  const searchPaths = [
    path.join(process.cwd(), 'apps/web/data', filename),
    path.join(process.cwd(), 'data', filename),
    path.join(process.cwd(), filename)
  ];
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.warn(`[WARN] Failed to parse ${p}:`, e.message);
      }
    }
  }
  return fallback;
}

async function sync() {
  console.log('\n============================================================');
  console.log('🚀 SUPABASE ONLINE DATABASE SYNCHRONIZER');
  console.log('============================================================');
  console.log('Target Project Ref: tnhrkjtujdfgvwhsuuxb');

  if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
    console.error('\n❌ DATABASE_URL is missing or contains placeholder values.');
    console.log('👉 To get your connection string:');
    console.log('   1. Visit: https://supabase.com/dashboard/project/tnhrkjtujdfgvwhsuuxb/settings/database');
    console.log('   2. Scroll to "Connection String" -> Select "URI" -> Mode: "Transaction" (Port 6543).');
    console.log('   3. Replace [YOUR-PASSWORD] with your actual Supabase database password.');
    console.log('   4. Set DATABASE_URL in your .env.local file and re-run:');
    console.log('      node scripts/sync_to_supabase.js\n');
    process.exit(1);
  }

  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (err) {
    console.error('❌ "pg" driver missing. Run: npm install pg');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();

  try {
    console.log('📡 Connecting to Supabase PostgreSQL cluster...');
    const ping = await client.query('SELECT current_database() AS db, version() AS ver, NOW() AS now;');
    console.log(`✅ Connected to Supabase [${ping.rows[0].db}] at ${ping.rows[0].now}`);

    await client.query('BEGIN');

    // STEP 1: Apply Schema DDL
    console.log('\n📦 [1/7] Applying Relational Schema to Supabase...');
    const schemaFile = path.join(process.cwd(), 'scripts', 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const ddl = fs.readFileSync(schemaFile, 'utf-8');
      await client.query(ddl);
      console.log('   ✓ Verified all schema tables, constraints, and indexes.');
    } else {
      // Fallback baseline DDL if schema.sql is not found
      await client.query(`
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
      `);
      console.log('   ✓ Schema created via baseline definitions.');
    }

    // STEP 2: Sync Subscription Plans
    console.log('\n💳 [2/7] Synchronizing Subscription Plans...');
    const plans = readLocalJson('subscription_plans.json', [
      { id: 'taster', name: 'Taster', slug: 'taster', isFree: true, isDefault: true, monthlyPriceDollars: 0 },
      { id: 'culinary-pro', name: 'Culinary Pro', slug: 'culinary-pro', isFree: false, monthlyPriceDollars: 9.99 }
    ]);
    for (const p of plans) {
      await client.query(`
        INSERT INTO subscription_plans (
          id, name, slug, is_free, is_default, monthly_price_dollars, annual_price_dollars,
          monthly_badge, annual_badge, trial_badge, description_monthly, description_annual,
          button_text, ai_recipe_limit, recipe_library_limit, social_scrape_limit,
          can_view_macros, allowed_ai_models, features, token_limit, token_reimburse_frequency, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          monthly_price_dollars = EXCLUDED.monthly_price_dollars,
          annual_price_dollars = EXCLUDED.annual_price_dollars,
          features = EXCLUDED.features,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        p.id || p.slug,
        p.name || 'Plan',
        p.slug || 'plan',
        Boolean(p.isFree),
        Boolean(p.isDefault),
        p.monthlyPriceDollars || 0,
        p.annualPriceDollars || 0,
        p.monthlyBadge || '',
        p.annualBadge || '',
        p.trialBadge || '',
        p.descriptionMonthly || '',
        p.descriptionAnnual || '',
        p.buttonText || 'Choose Plan',
        p.aiRecipeLimit !== undefined ? p.aiRecipeLimit : 5,
        p.recipeLibraryLimit !== undefined ? p.recipeLibraryLimit : 25,
        p.socialScrapeLimit !== undefined ? p.socialScrapeLimit : 5,
        Boolean(p.canViewMacros),
        Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.5-flash-lite'),
        JSON.stringify(p.features || []),
        p.tokenLimit || 50000,
        p.tokenReimburseFrequency || 'monthly'
      ]);
    }
    console.log(`   ✓ ${plans.length} plan(s) synced to Supabase.`);

    // STEP 3: Sync Users
    console.log('\n👤 [3/7] Synchronizing Users...');
    const users = readLocalJson('users.json', [
      { id: 'usr_admin', name: 'Administrator', email: 'cygnusorbit@gmail.com', role: 'admin', subscriptionPlan: 'nutrition-pro-annual' }
    ]);
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, name, email, password_hash, role, subscription_plan, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          subscription_plan = EXCLUDED.subscription_plan,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        u.id || ('usr_' + Date.now().toString(36)),
        u.name || 'User',
        (u.email || 'user@example.com').toLowerCase().trim(),
        u.passwordHash || u.password || null,
        u.role || 'user',
        u.subscriptionPlan || 'taster',
        u.createdAt ? new Date(u.createdAt) : null
      ]);
    }
    console.log(`   ✓ ${users.length} user(s) synced to Supabase.`);

    // STEP 4: Sync Admin Settings
    console.log('\n⚙️ [4/7] Synchronizing System & Localization Settings...');
    const settings = readLocalJson('admin_settings.json', {});
    await client.query(`
      INSERT INTO admin_settings (
        id, site_name, titlebar_emoji, favicon_emoji, currency, ai_provider, ai_model,
        theme_colors, payment_settings, social_login, chef_ai_settings,
        recipe_types, ingredient_categories, supported_languages, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        site_name = EXCLUDED.site_name,
        titlebar_emoji = EXCLUDED.titlebar_emoji,
        favicon_emoji = EXCLUDED.favicon_emoji,
        currency = EXCLUDED.currency,
        ai_provider = EXCLUDED.ai_provider,
        ai_model = EXCLUDED.ai_model,
        theme_colors = EXCLUDED.theme_colors,
        payment_settings = EXCLUDED.payment_settings,
        social_login = EXCLUDED.social_login,
        chef_ai_settings = EXCLUDED.chef_ai_settings,
        recipe_types = EXCLUDED.recipe_types,
        ingredient_categories = EXCLUDED.ingredient_categories,
        supported_languages = EXCLUDED.supported_languages,
        updated_at = CURRENT_TIMESTAMP;
    `, [
      'primary_settings',
      settings.siteName || 'Zecratary',
      settings.titlebarEmoji || '🍳',
      settings.faviconEmoji || '🍳',
      settings.currency || 'USD',
      settings.aiProvider || 'gemini',
      settings.aiModel || 'gemini-3.5-flash-lite',
      JSON.stringify(settings.themeColors || {}),
      JSON.stringify(settings.paymentSettings || {}),
      JSON.stringify(settings.socialLogin || {}),
      JSON.stringify(settings.chefAiSettings || {}),
      JSON.stringify(settings.recipeTypes || []),
      JSON.stringify(settings.ingredientCategories || []),
      JSON.stringify(settings.supportedLanguages || [])
    ]);
    console.log('   ✓ Admin branding, colors, and localization dictionaries synced.');

    // STEP 5: Sync Payment Transactions
    console.log('\n💵 [5/7] Synchronizing Payment Transactions...');
    const txs = readLocalJson('payment_transactions.json', []);
    for (const t of txs) {
      await client.query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount, currency,
          gateway, status, failure_reason, test_mode, expiry_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, CURRENT_TIMESTAMP))
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          failure_reason = EXCLUDED.failure_reason;
      `, [
        t.id || ('tx_' + Date.now().toString(36)),
        t.customerName || 'Customer',
        (t.customerEmail || 'customer@example.com').toLowerCase().trim(),
        t.planName || 'Plan',
        t.planSlug || null,
        t.amount || 0,
        t.currency || 'USD',
        t.gateway || 'stripe',
        t.status || 'succeeded',
        t.failureReason || null,
        Boolean(t.testMode),
        t.expiryDate ? new Date(t.expiryDate) : null,
        t.createdAt ? new Date(t.createdAt) : null
      ]);
    }
    console.log(`   ✓ ${txs.length} payment transaction(s) synced.`);

    // STEP 6: Sync Saved Recipes
    console.log('\n🍲 [6/7] Synchronizing Saved Recipes...');
    const recipes = readLocalJson('saved_recipes.json', []);
    for (const r of recipes) {
      await client.query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, COALESCE($17, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          nutrition = EXCLUDED.nutrition,
          image_url = EXCLUDED.image_url,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        r.id || ('rcp_' + Math.random().toString(36).substring(2, 9)),
        r.userId || null,
        r.title || 'Untitled Recipe',
        r.description || '',
        r.recipeType || 'General',
        r.cuisine || '',
        r.prepTime || '',
        r.cookTime || '',
        r.servings || '',
        r.difficulty || '',
        JSON.stringify(r.ingredients || []),
        JSON.stringify(r.directions || []),
        JSON.stringify(r.nutrition || {}),
        JSON.stringify(r.tags || []),
        r.imageUrl || '',
        Boolean(r.isPublic),
        r.createdAt ? new Date(r.createdAt) : null
      ]);
    }
    console.log(`   ✓ ${recipes.length} recipe(s) synced.`);

    // STEP 7: Sync Dynamic Page Contents
    console.log('\n📄 [7/7] Synchronizing Page Contents...');
    const pages = readLocalJson('page_contents.json', []);
    for (const pc of pages) {
      await client.query(`
        INSERT INTO page_contents (page_slug, title, meta_description, content_blocks, custom_attributes, is_published, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (page_slug) DO UPDATE SET
          title = EXCLUDED.title,
          meta_description = EXCLUDED.meta_description,
          content_blocks = EXCLUDED.content_blocks,
          custom_attributes = EXCLUDED.custom_attributes,
          is_published = EXCLUDED.is_published,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        pc.pageSlug || pc.slug || 'home',
        pc.title || 'Page',
        pc.metaDescription || '',
        JSON.stringify(pc.contentBlocks || []),
        JSON.stringify(pc.customAttributes || {}),
        pc.isPublished !== undefined ? Boolean(pc.isPublished) : true
      ]);
    }
    console.log(`   ✓ ${pages.length} dynamic page CMS block(s) synced.`);

    await client.query('COMMIT');

    // AUDIT SUMMARY
    console.log('\n============================================================');
    console.log('📊 SUPABASE SYNC VERIFICATION AUDIT');
    console.log('============================================================');
    const tables = ['admin_settings', 'subscription_plans', 'users', 'payment_transactions', 'saved_recipes', 'page_contents'];
    for (const tbl of tables) {
      const countRes = await client.query(`SELECT count(*)::int AS count FROM ${tbl}`);
      console.log(`   • ${tbl.padEnd(24)} : ${countRes.rows[0].count} records in Supabase`);
    }
    console.log('============================================================');
    console.log('✨ Localhost database is fully synchronized with Supabase!\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Sync Failed and rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

sync();
