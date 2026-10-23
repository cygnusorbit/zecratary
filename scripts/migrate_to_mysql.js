// Automated Migration Bridge: Server Data -> MySQL
// Usage: node scripts/migrate_to_mysql.js

const fs = require('fs');
const path = require('path');

function loadEnvironmentVariables() {
  const candidateFiles = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'apps/web/.env'),
    path.join(process.cwd(), 'apps/web/.env.local')
  ];

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
          }
        }
      } catch (_) {}
    }
  }
}
loadEnvironmentVariables();

function readJsonFile(filename, fallback) {
  const searchDirs = [
    path.join(process.cwd(), 'apps/web/data', filename),
    path.join(process.cwd(), 'data', filename),
    path.join(process.cwd(), filename)
  ];
  for (const p of searchDirs) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (_) {}
    }
  }
  return fallback;
}

async function runMySQLMigration() {
  const connUri = process.env.MYSQL_URL || process.env.DATABASE_URL;

  console.log('\n======================================================');
  console.log('🐬 MySQL Migration Suite for Zecratary');
  console.log('======================================================');

  if (!connUri || (!connUri.startsWith('mysql://') && !process.env.MYSQL_URL)) {
    console.error('❌ Error: No MySQL connection string detected.');
    console.error('Please configure MYSQL_URL in your .env or .env.local:');
    console.error('  MYSQL_URL="mysql://root:password@127.0.0.1:3306/zecratary"\n');
    process.exit(1);
  }

  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch (_) {
    console.error('❌ Error: "mysql2" driver is not installed.');
    console.error('Install it with:');
    console.error('  npm install mysql2\n');
    process.exit(1);
  }

  console.log('Connecting to MySQL instance...');
  const pool = mysql.createPool({ uri: connUri, multipleStatements: true });

  try {
    // 1. Apply Schema DDL
    const schemaFile = path.join(__dirname, 'schema.mysql.sql');
    if (fs.existsSync(schemaFile)) {
      const schemaSql = fs.readFileSync(schemaFile, 'utf-8');
      await pool.query(schemaSql);
      console.log('✓ Applied mirrored MySQL relational tables.');
    }

    // 2. Migrate Subscription Plans
    const plans = readJsonFile('subscription_plans.json', []);
    for (const p of plans) {
      await pool.execute(`
        INSERT INTO subscription_plans (
          id, name, slug, is_free, is_default, monthly_price_dollars, annual_price_dollars,
          monthly_badge, annual_badge, trial_badge, description_monthly, description_annual,
          button_text, ai_recipe_limit, recipe_library_limit, social_scrape_limit,
          can_view_macros, allowed_ai_models, features, token_limit, token_reimburse_frequency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          monthly_price_dollars = VALUES(monthly_price_dollars),
          annual_price_dollars = VALUES(annual_price_dollars),
          features = VALUES(features),
          token_limit = VALUES(token_limit);
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
      await pool.execute(`
        INSERT INTO users (id, name, email, role, subscription_plan, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          role = VALUES(role),
          subscription_plan = VALUES(subscription_plan);
      `, [
        u.id || ('usr_' + Date.now().toString(36)),
        u.name || 'User',
        (u.email || 'user@example.com').toLowerCase().trim(),
        u.role || 'user',
        u.subscriptionPlan || 'taster',
        u.createdAt ? new Date(u.createdAt) : new Date()
      ]);
    }
    console.log(`✓ Migrated ${users.length} user record(s).`);

    // 4. Migrate Admin Settings
    const adminSettings = readJsonFile('admin_settings.json', {});
    if (Object.keys(adminSettings).length > 0) {
      await pool.execute(`
        INSERT INTO admin_settings (
          id, site_name, titlebar_emoji, titlebar_image, favicon_emoji, favicon_image,
          currency, ai_provider, ai_model, theme_colors, payment_settings, social_login,
          chef_ai_settings, recipe_types, ingredient_categories, supported_languages
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          site_name = VALUES(site_name),
          theme_colors = VALUES(theme_colors),
          payment_settings = VALUES(payment_settings),
          social_login = VALUES(social_login),
          chef_ai_settings = VALUES(chef_ai_settings);
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

    // 5. Migrate Payment Transactions
    const txs = readJsonFile('payment_transactions.json', []);
    for (const t of txs) {
      await pool.execute(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount,
          currency, gateway, status, failure_reason, test_mode, expiry_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status);
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
        t.createdAt ? new Date(t.createdAt) : new Date()
      ]);
    }
    console.log(`✓ Migrated ${txs.length} payment transaction(s).`);

    // 6. Migrate Saved Recipes
    const recipes = readJsonFile('saved_recipes.json', []);
    for (const r of recipes) {
      await pool.execute(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, cuisine, prep_time,
          cook_time, servings, difficulty, ingredients, directions, nutrition,
          tags, image_url, is_public, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description);
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
        r.createdAt ? new Date(r.createdAt) : new Date()
      ]);
    }
    console.log(`✓ Migrated ${recipes.length} saved recipe(s).`);

    console.log('\n✨ MySQL database synchronization successfully completed!');
  } catch (err) {
    console.error('\n❌ MySQL Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

runMySQLMigration();
