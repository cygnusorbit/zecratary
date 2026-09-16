// Automated PostgreSQL Migration Bridge (Dotenv-Aware)
// Usage: node scripts/migrate_to_postgres.js

const fs = require('fs');
const path = require('path');


function loadEnvironmentVariables() {
  const fs = require('fs');
  const path = require('path');
  const candidateFiles = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'apps/web/.env'),
    path.join(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../.env.local')
  ];

  let loadedCount = 0;
  for (const envFile of candidateFiles) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
            loadedCount++;
          }
        }
      } catch (_) {}
    }
  }
}
loadEnvironmentVariables();


function readJsonFile(filename, fallback) {
  const paths = [
    path.join(process.cwd(), 'apps/web/data', filename),
    path.join(process.cwd(), 'data', filename)
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (_) {}
    }
  }
  return fallback;
}

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  console.log('\n======================================================');
  console.log('🐘 PostgreSQL Database Migration Tool');
  console.log('======================================================');

  if (!connectionString) {
    console.log('ℹ️ DATABASE_URL is not set in your .env or shell environment.');
    console.log('ℹ️ Server JSON storage remains active and fully functional.');
    console.log('\nTo connect PostgreSQL:');
    console.log('  1. Add DATABASE_URL to your .env or .env.local file:');
    console.log('     DATABASE_URL="postgresql://user:password@localhost:5432/zecratary?schema=public"');
    console.log('  2. Or run local Docker Postgres:');
    console.log('     docker compose -f docker-compose.postgres.yml up -d');
    console.log('  3. Re-run: node scripts/migrate_to_postgres.js\n');
    return;
  }

  console.log('✓ Found DATABASE_URL in environment.');
  console.log('Connecting to database endpoint...');

  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (e) {
    console.log('⚠️ The "pg" npm package is required to connect to PostgreSQL.');
    console.log('Install it by running: npm install pg\n');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000
  });

  try {
    // Verify connection
    const testRes = await pool.query('SELECT current_database() as db, NOW() as now');
    console.log(`✓ Connected to PostgreSQL database: "${testRes.rows[0].db}"`);

    // Ensure schema exists
    const schemaFile = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const schemaSql = fs.readFileSync(schemaFile, 'utf-8');
      await pool.query(schemaSql);
      console.log('✓ Verified and applied relational schema tables.');
    }

    // 1. Migrate Admin Settings
    const adminSettings = readJsonFile('admin_settings.json', {});
    if (Object.keys(adminSettings).length > 0) {
      await pool.query(`
        INSERT INTO admin_settings (
          id, site_name, titlebar_emoji, titlebar_image, favicon_emoji, favicon_image,
          currency, ai_provider, ai_model, theme_colors, payment_settings, social_login,
          chef_ai_settings, recipe_types, ingredient_categories, supported_languages
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          site_name = EXCLUDED.site_name,
          theme_colors = EXCLUDED.theme_colors,
          payment_settings = EXCLUDED.payment_settings,
          social_login = EXCLUDED.social_login,
          chef_ai_settings = EXCLUDED.chef_ai_settings,
          updated_at = NOW();
      `, [
        'primary_settings',
        adminSettings.siteName || 'Zecratary',
        adminSettings.titlebarEmoji || '🍳',
        adminSettings.titlebarImage || '',
        adminSettings.faviconEmoji || '🍳',
        adminSettings.faviconImage || '',
        adminSettings.currency || 'USD',
        adminSettings.aiProvider || 'gemini',
        adminSettings.aiModel || 'gemini-3.5-flash-lite',
        JSON.stringify(adminSettings.themeColors || {}),
        JSON.stringify(adminSettings.paymentSettings || {}),
        JSON.stringify(adminSettings.socialLogin || {}),
        JSON.stringify(adminSettings.chefAiSettings || {}),
        JSON.stringify(adminSettings.recipeTypes || []),
        JSON.stringify(adminSettings.ingredientCategories || []),
        JSON.stringify(adminSettings.supportedLanguages || [])
      ]);
      console.log('✓ Migrated admin_settings.');
    }

    // 2. Migrate Subscription Plans
    const plans = readJsonFile('subscription_plans.json', []);
    for (const p of plans) {
      await pool.query(`
        INSERT INTO subscription_plans (
          id, name, slug, is_free, is_default, monthly_price_dollars, annual_price_dollars,
          monthly_badge, annual_badge, trial_badge, description_monthly, description_annual,
          button_text, ai_recipe_limit, recipe_library_limit, social_scrape_limit,
          can_view_macros, allowed_ai_models, features, token_limit, token_reimburse_frequency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          monthly_price_dollars = EXCLUDED.monthly_price_dollars,
          annual_price_dollars = EXCLUDED.annual_price_dollars,
          features = EXCLUDED.features,
          token_limit = EXCLUDED.token_limit;
      `, [
        p.id || p.slug,
        p.name,
        p.slug,
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
        p.aiRecipeLimit !== undefined ? p.aiRecipeLimit : -1,
        p.recipeLibraryLimit !== undefined ? p.recipeLibraryLimit : -1,
        p.socialScrapeLimit !== undefined ? p.socialScrapeLimit : -1,
        Boolean(p.canViewMacros),
        Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || ''),
        JSON.stringify(p.features || []),
        p.tokenLimit || 100000,
        p.tokenReimburseFrequency || 'monthly'
      ]);
    }
    console.log(`✓ Migrated ${plans.length} subscription plan(s).`);

    // 3. Migrate Users
    const users = readJsonFile('users.json', []);
    for (const u of users) {
      await pool.query(`
        INSERT INTO users (id, name, email, role, subscription_plan, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          subscription_plan = EXCLUDED.subscription_plan;
      `, [
        u.id || ('usr_' + Date.now().toString(36)),
        u.name,
        u.email.toLowerCase().trim(),
        u.role || 'user',
        u.subscriptionPlan || 'taster',
        u.createdAt || new Date().toISOString()
      ]);
    }
    console.log(`✓ Migrated ${users.length} user record(s).`);

    // 4. Migrate Transactions
    const txs = readJsonFile('payment_transactions.json', []);
    for (const t of txs) {
      await pool.query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount, currency,
          gateway, status, failure_reason, test_mode, expiry_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
      `, [
        t.id,
        t.customerName,
        t.customerEmail.toLowerCase().trim(),
        t.planName,
        t.planSlug || null,
        t.amount || 0,
        t.currency || 'USD',
        t.gateway || 'stripe',
        t.status || 'succeeded',
        t.failureReason || null,
        Boolean(t.testMode),
        t.expiryDate || null,
        t.createdAt || new Date().toISOString()
      ]);
    }
    console.log(`✓ Migrated ${txs.length} payment transaction(s).`);

    console.log('\n✨ PostgreSQL database is fully populated and synchronized!');
  } catch (err) {
    console.error('\n✕ PostgreSQL operation failed:', err.message);
    console.log('ℹ️ Server JSON storage remains unaffected and active.');
  } finally {
    await pool.end();
  }
}

runMigration();
