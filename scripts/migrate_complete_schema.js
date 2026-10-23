// Complete Self-Healing Database Migration for Supabase / PostgreSQL (Constraint 8)
// GitHub: cygnusorbit/zecratary
const path = require('path');
const fs = require('fs');

// Load environment credentials
['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'].forEach(f => {
  const full = path.join(process.cwd(), f);
  if (fs.existsSync(full)) {
    fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
});

const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Cannot run migration: DATABASE_URL is missing or contains placeholder password.');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const cleanConnStr = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: cleanConnStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  console.log('🐘 Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('✓ Connected. Executing idempotent DDL self-healing migration...');

    // 1. users table & root admin seed
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT 'User',
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        subscription_plan VARCHAR(100) DEFAULT 'taster',
        tokens_balance INT DEFAULT 50,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_balance INT DEFAULT 50;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

      INSERT INTO users (id, name, email, role, subscription_plan, tokens_balance, created_at, updated_at)
      VALUES ('usr_admin_1', 'System Administrator', 'admin@zecratary.com', 'admin', 'nutrition-pro-annual', 1000, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('  ✅ [1/7] users table verified & root admin seeded.');

    // 2. frontend_pages table & missing is_default column
    await client.query(`
      CREATE TABLE IF NOT EXISTS frontend_pages (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'published',
        is_default BOOLEAN DEFAULT false,
        show_in_nav BOOLEAN DEFAULT true,
        show_in_footer BOOLEAN DEFAULT true,
        order_index INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN DEFAULT true;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE frontend_pages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';

      INSERT INTO frontend_pages (id, title, slug, content, status, is_default, show_in_nav, show_in_footer, order_index)
      VALUES 
        ('page_home', 'Home', 'home', 'Welcome to Zecratary Culinary Intelligence', 'published', true, true, true, 1),
        ('page_about', 'About Us', 'about', 'About Zecratary Chef & Nutrition Assistant', 'published', false, true, true, 2),
        ('page_pricing', 'Pricing Plans', 'pricing', 'Explore flexible culinary intelligence plans', 'published', false, true, true, 3)
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log('  ✅ [2/7] frontend_pages table verified & is_default column added.');

    // 3. admin_settings table & supported_languages column
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(255) PRIMARY KEY DEFAULT 'current',
        key VARCHAR(100) DEFAULT 'current',
        site_name VARCHAR(255) DEFAULT 'Zecratary',
        titlebar_emoji VARCHAR(50) DEFAULT '🍳',
        favicon_emoji VARCHAR(50) DEFAULT '🍳',
        currency VARCHAR(20) DEFAULT 'USD',
        ai_provider VARCHAR(50) DEFAULT 'gemini',
        ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
        theme_colors JSONB,
        supported_languages JSONB DEFAULT '["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "th"]'::jsonb,
        translations JSONB DEFAULT '{}'::jsonb,
        default_language VARCHAR(50) DEFAULT 'en',
        recipe_types JSONB DEFAULT '["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Beverage"]'::jsonb,
        ingredient_categories JSONB DEFAULT '["Produce", "Meat", "Dairy", "Pantry", "Spices", "Bakery"]'::jsonb,
        payment_settings JSONB DEFAULT '{"stripeEnabled": true, "currency": "USD"}'::jsonb,
        chef_ai_settings JSONB DEFAULT '{"temperature": 0.7, "maxTokens": 2048}'::jsonb,
        value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "th"]'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(50) DEFAULT 'en';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100) DEFAULT 'current';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS site_name VARCHAR(255) DEFAULT 'Zecratary';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'gemini';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'USD';
    `);
    console.log('  ✅ [3/7] admin_settings table verified & supported_languages added.');

    // 4. saved_recipes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_recipes (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'usr_admin_1',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ingredients JSONB DEFAULT '[]'::jsonb,
        instructions JSONB DEFAULT '[]'::jsonb,
        directions JSONB DEFAULT '[]'::jsonb,
        prep_time VARCHAR(100),
        cook_time VARCHAR(100),
        servings VARCHAR(50),
        image TEXT,
        image_url TEXT,
        is_favorite BOOLEAN DEFAULT false,
        tags JSONB DEFAULT '[]'::jsonb,
        source_url TEXT,
        nutrition JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS instructions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS directions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    console.log('  ✅ [4/7] saved_recipes table verified & columns updated.');

    // 5. subscription_plans table & dual-column synchronization
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        monthly_price_dollars NUMERIC(10, 2) DEFAULT 0,
        annual_price_dollars NUMERIC(10, 2) DEFAULT 0,
        price_monthly NUMERIC(10, 2) DEFAULT 0,
        price_annual NUMERIC(10, 2) DEFAULT 0,
        price NUMERIC(10, 2) DEFAULT 0,
        token_limit INT DEFAULT 50000,
        tokens_monthly INT DEFAULT 50000,
        monthly_tokens INT DEFAULT 50000,
        features JSONB DEFAULT '[]'::jsonb,
        is_free BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        plan_group_id VARCHAR(100),
        monthly_plan_id VARCHAR(100),
        annual_plan_id VARCHAR(100),
        monthly_badge VARCHAR(64) DEFAULT '',
        annual_badge VARCHAR(64) DEFAULT '',
        trial_badge VARCHAR(64) DEFAULT '',
        description_monthly TEXT DEFAULT '',
        description_annual TEXT DEFAULT '',
        button_text VARCHAR(64) DEFAULT 'Choose Plan',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Idempotent column evolution: guarantee all column variations exist
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_price_dollars NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_price_dollars NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_annual NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS token_limit INT DEFAULT 50000;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tokens_monthly INT DEFAULT 50000;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_tokens INT DEFAULT 50000;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_group_id VARCHAR(100);
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_plan_id VARCHAR(100);
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_plan_id VARCHAR(100);
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_badge VARCHAR(64) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_badge VARCHAR(64) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_badge VARCHAR(64) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description_monthly TEXT DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description_annual TEXT DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS button_text VARCHAR(64) DEFAULT 'Choose Plan';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      -- Synchronize price and token columns bi-directionally
      UPDATE subscription_plans
      SET 
        monthly_price_dollars = COALESCE(monthly_price_dollars, price_monthly, price, 0),
        price_monthly = COALESCE(price_monthly, monthly_price_dollars, price, 0),
        annual_price_dollars = COALESCE(annual_price_dollars, price_annual, 0),
        price_annual = COALESCE(price_annual, annual_price_dollars, 0),
        token_limit = COALESCE(token_limit, tokens_monthly, monthly_tokens, 50000),
        tokens_monthly = COALESCE(tokens_monthly, token_limit, monthly_tokens, 50000),
        monthly_tokens = COALESCE(monthly_tokens, token_limit, tokens_monthly, 50000);

      -- Slug-safe upsert without unique key collisions
      INSERT INTO subscription_plans (
        id, name, slug, plan_group_id, monthly_plan_id, annual_plan_id,
        monthly_price_dollars, annual_price_dollars, price_monthly, price_annual,
        token_limit, tokens_monthly, monthly_tokens, is_free, is_active, sort_order
      )
      VALUES 
        ('plan_taster', 'Taster', 'taster', 'group_taster', 'plan_taster_monthly', 'plan_taster_annual', 0, 0, 0, 0, 50000, 50000, 50000, true, true, 1),
        ('plan_starter', 'Starter Chef', 'starter', 'group_starter', 'plan_starter_monthly', 'plan_starter_annual', 9.99, 89.99, 9.99, 89.99, 100000, 100000, 100000, false, true, 2),
        ('plan_pro', 'Nutrition Pro', 'pro', 'group_pro', 'plan_pro_monthly', 'plan_pro_annual', 19.99, 189.99, 19.99, 189.99, 250000, 250000, 250000, false, true, 3),
        ('plan_master', 'Master Culinary', 'master', 'group_master', 'plan_master_monthly', 'plan_master_annual', 39.99, 349.99, 39.99, 349.99, 600000, 600000, 600000, false, true, 4)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        monthly_price_dollars = EXCLUDED.monthly_price_dollars,
        annual_price_dollars = EXCLUDED.annual_price_dollars,
        price_monthly = EXCLUDED.price_monthly,
        price_annual = EXCLUDED.price_annual,
        token_limit = EXCLUDED.token_limit,
        tokens_monthly = EXCLUDED.tokens_monthly,
        monthly_tokens = EXCLUDED.monthly_tokens,
        is_free = EXCLUDED.is_free,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order;
    `);
    console.log('  ✅ [5/7] subscription_plans table verified & plans seeded.');

    // 6. payment_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        customer_name VARCHAR(255),
        customer_email VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        plan_id VARCHAR(100),
        plan_name VARCHAR(255),
        plan_slug VARCHAR(64),
        billing_cycle VARCHAR(50) DEFAULT 'monthly',
        status VARCHAR(50) DEFAULT 'succeeded',
        gateway VARCHAR(50) DEFAULT 'stripe',
        payment_method VARCHAR(50) DEFAULT 'stripe',
        transaction_id VARCHAR(255),
        gateway_transaction_id TEXT,
        test_mode BOOLEAN DEFAULT FALSE,
        failure_reason TEXT,
        is_recurring BOOLEAN DEFAULT FALSE,
        auto_renew BOOLEAN DEFAULT FALSE,
        confirmed_amount NUMERIC,
        confirmed_at TIMESTAMPTZ,
        expiry_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_id VARCHAR(100);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_slug VARCHAR(64);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'succeeded';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) DEFAULT 'stripe';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'stripe';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT FALSE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('  ✅ [6/7] payment_transactions table verified.');

    // 7. token_settings & token_transactions tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_settings (
        id VARCHAR(255) PRIMARY KEY DEFAULT 'current',
        free_tier_tokens INT DEFAULT 50,
        cost_per_recipe INT DEFAULT 5,
        cost_per_ai_chat INT DEFAULT 2,
        cost_per_image INT DEFAULT 10,
        plan_allocations JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE token_settings ADD COLUMN IF NOT EXISTS free_tier_tokens INT DEFAULT 50;
      ALTER TABLE token_settings ADD COLUMN IF NOT EXISTS cost_per_recipe INT DEFAULT 5;
      ALTER TABLE token_settings ADD COLUMN IF NOT EXISTS cost_per_ai_chat INT DEFAULT 2;
      ALTER TABLE token_settings ADD COLUMN IF NOT EXISTS cost_per_image INT DEFAULT 10;
      ALTER TABLE token_settings ADD COLUMN IF NOT EXISTS plan_allocations JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE token_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS token_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        amount INT NOT NULL DEFAULT 0,
        type VARCHAR(50) NOT NULL DEFAULT 'usage',
        description TEXT,
        balance_after INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS amount INT DEFAULT 0;
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'usage';
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS balance_after INT;
      ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('  ✅ [7/7] token_settings & token_transactions tables verified.');

    console.log('\n🎉 ALL CORE TABLES & SCHEMAS SUCCESSFULLY INITIALIZED IN POSTGRESQL!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
