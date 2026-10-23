// Complete Self-Healing Database Migration for Supabase / PostgreSQL (Constraint 8)
const path = require('path');
const fs = require('fs');

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
  keepAlive: true,
});

async function runMigration() {
  console.log('🐘 Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('✓ Connected. Executing complete DDL migration for all application tables...');

    // 1. admin_settings: Ensure payment_settings and all configuration columns exist
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

      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"stripeEnabled": true, "currency": "USD"}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS chef_ai_settings JSONB DEFAULT '{"temperature": 0.7, "maxTokens": 2048}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS recipe_types JSONB DEFAULT '["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Beverage"]'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ingredient_categories JSONB DEFAULT '["Produce", "Meat", "Dairy", "Pantry", "Spices", "Bakery"]'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "th"]'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(50) DEFAULT 'en';
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme_colors JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100) DEFAULT 'current';

      UPDATE admin_settings 
      SET payment_settings = '{"stripeEnabled": true, "currency": "USD"}'::jsonb 
      WHERE payment_settings IS NULL;
    `);
    console.log('  ✅ [1/6] admin_settings table verified & payment_settings column provisioned.');

    // 2. wallet_settings & wallet_transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'current',
        is_enabled BOOLEAN DEFAULT true,
        currency VARCHAR(10) DEFAULT 'USD',
        min_topup NUMERIC(10,2) DEFAULT 5.00,
        max_topup NUMERIC(10,2) DEFAULT 1000.00,
        preset_amounts JSONB DEFAULT '[10, 25, 50, 100, 250]'::jsonb,
        bonus_rules JSONB DEFAULT '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]'::jsonb,
        allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]'::jsonb,
        allow_site_purchases BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        user_email VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL DEFAULT 'topup',
        amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        balance_after NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        gateway VARCHAR(32) DEFAULT 'stripe',
        gateway_tx_id VARCHAR(255),
        status VARCHAR(32) DEFAULT 'succeeded',
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;

      INSERT INTO wallet_settings (id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases)
      VALUES ('current', true, 'USD', 5.00, 1000.00, '[10, 25, 50, 100, 250]'::jsonb, '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]'::jsonb, '["stripe", "paypal", "manual"]'::jsonb, true)
      ON CONFLICT (id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    `);
    console.log('  ✅ [2/6] wallet_settings & wallet_transactions tables verified.');

    // 3. notification_settings & custom_notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'current',
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        in_app_notifications BOOLEAN DEFAULT true,
        notify_recipe_updates BOOLEAN DEFAULT true,
        notify_billing_events BOOLEAN DEFAULT true,
        notify_token_alerts BOOLEAN DEFAULT true,
        notify_system_announcements BOOLEAN DEFAULT true,
        channels JSONB DEFAULT '{"email": true, "inApp": true, "push": false}'::jsonb,
        templates JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS custom_notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        category VARCHAR(50) DEFAULT 'system',
        is_read BOOLEAN DEFAULT false,
        action_url TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        read_at TIMESTAMPTZ
      );

      INSERT INTO notification_settings (id, email_notifications, in_app_notifications, notify_system_announcements)
      VALUES ('current', true, true, true)
      ON CONFLICT (id) DO NOTHING;

      -- Seed a welcome notification for root admin
      INSERT INTO custom_notifications (id, user_id, user_email, title, message, type, category, is_read, created_at)
      VALUES ('notif_welcome', 'usr_admin_1', 'admin@zecratary.com', 'Welcome to Zecratary', 'Your database, AI models, and billing engines are fully synchronized.', 'success', 'system', false, NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('  ✅ [3/6] notification_settings & custom_notifications tables verified.');

    // 4. user_sidebar_settings & sidebar_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sidebar_settings (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        settings JSONB DEFAULT '{}'::jsonb,
        collapsed BOOLEAN DEFAULT false,
        favorites JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sidebar_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'current',
        items JSONB DEFAULT '[]'::jsonb,
        visibility JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  ✅ [4/6] user_sidebar_settings & sidebar_settings tables verified.');

    // 5. user_theme table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_theme (
        id VARCHAR(255) PRIMARY KEY DEFAULT 'current',
        primary_color VARCHAR(50) DEFAULT '#10b981',
        card_color VARCHAR(50) DEFAULT '#ffffff',
        border_color VARCHAR(50) DEFAULT '#e5e7eb',
        background_color VARCHAR(50) DEFAULT '#f9fafb',
        mode VARCHAR(20) DEFAULT 'system',
        font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  ✅ [5/6] user_theme table verified.');

    // 6. Verify table row counts
    const countRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = countRes.rows.map(r => r.table_name);
    console.log(`\n🎉 [6/6] VERIFIED ${tables.length} TABLES IN SUPABASE POSTGRESQL:`);
    console.log(`   ${tables.join(', ')}`);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('❌ Migration error:', err.message);
  process.exit(1);
});
