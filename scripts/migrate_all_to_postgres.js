// Automated JSON to PostgreSQL Migration Runner
// Immune to duplicate slug, primary key, and foreign key constraint violations

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPaths = ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local'];
  for (const ep of envPaths) {
    const full = path.join(process.cwd(), ep);
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

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is required to run migration.');
  process.exit(1);
}

function readJsonFile(filename, fallback) {
  const searchDirs = [
    path.join(process.cwd(), 'apps/web/data', filename),
    path.join(process.cwd(), 'apps/web/apps/web/data', filename),
    path.join(process.cwd(), 'data', filename),
    path.join(process.cwd(), filename)
  ];
  for (const p of searchDirs) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8').trim();
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
  }
  return fallback;
}

// Ensure plan slug is unique, clean, and disambiguated between monthly/annual tiers
function normalizePlanList(rawPlans) {
  const normalized = [];
  const seenSlugs = new Set();

  if (!Array.isArray(rawPlans)) return normalized;

  for (let i = 0; i < rawPlans.length; i++) {
    const p = rawPlans[i];
    if (!p) continue;

    let baseSlug = (p.slug || p.id || p.name || `plan-${i + 1}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, '-');

    if (!baseSlug) baseSlug = `plan-${i + 1}`;

    // Disambiguate if slug is already used
    let finalSlug = baseSlug;
    if (seenSlugs.has(finalSlug)) {
      const pId = (p.id || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();

      if (pId.includes('annual') || pName.includes('annual')) {
        finalSlug = `${baseSlug}-annual`;
      } else if (pId.includes('monthly') || pName.includes('monthly')) {
        finalSlug = `${baseSlug}-monthly`;
      } else {
        finalSlug = `${baseSlug}-${i + 1}`;
      }
    }

    seenSlugs.add(finalSlug);

    normalized.push({
      ...p,
      id: p.id || finalSlug,
      slug: finalSlug,
      name: p.name || finalSlug
    });
  }

  return normalized;
}

async function migrate() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('✓ Connected to PostgreSQL. Starting safe migration transaction...');

    // -------------------------------------------------------------
    // 1. Migrate Subscription Plans (Deduplicated & Constraint-Safe)
    // -------------------------------------------------------------
    console.log('📦 Migrating Subscription Plans...');
    let rawPlans = readJsonFile('subscription_plans.json', []);
    if (!rawPlans || rawPlans.length === 0) {
      const adminData = readJsonFile('admin_settings.json', {});
      rawPlans = adminData.subscriptionPlans || [];
    }

    const plans = normalizePlanList(rawPlans);

    for (const p of plans) {
      // Check if plan exists by slug
      const existing = await client.query('SELECT id FROM subscription_plans WHERE slug = $1', [p.slug]);

      if (existing.rows.length > 0) {
        // Update existing row in place by slug without modifying its ID
        await client.query(`
          UPDATE subscription_plans SET
            name = $1,
            is_free = $2,
            is_default = $3,
            monthly_price_dollars = $4,
            annual_price_dollars = $5,
            monthly_badge = $6,
            annual_badge = $7,
            trial_badge = $8,
            description_monthly = $9,
            description_annual = $10,
            button_text = $11,
            ai_recipe_limit = $12,
            recipe_library_limit = $13,
            social_scrape_limit = $14,
            can_view_macros = $15,
            allowed_ai_models = $16,
            features = $17::jsonb,
            token_limit = $18,
            token_reimburse_frequency = $19,
            updated_at = CURRENT_TIMESTAMP
          WHERE slug = $20;
        `, [
          p.name,
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
          p.tokenReimburseFrequency || 'monthly',
          p.slug
        ]);
      } else {
        // Ensure ID is not already used by another slug
        let targetId = p.id || p.slug;
        const idCheck = await client.query('SELECT 1 FROM subscription_plans WHERE id = $1', [targetId]);
        if (idCheck.rows.length > 0) {
          targetId = `${p.slug}_${Math.random().toString(36).substring(2, 7)}`;
        }

        await client.query(`
          INSERT INTO subscription_plans (
            id, name, slug, is_free, is_default, monthly_price_dollars, annual_price_dollars,
            monthly_badge, annual_badge, trial_badge, description_monthly, description_annual,
            button_text, ai_recipe_limit, recipe_library_limit, social_scrape_limit,
            can_view_macros, allowed_ai_models, features, token_limit, token_reimburse_frequency, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, CURRENT_TIMESTAMP);
        `, [
          targetId,
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
    }
    console.log(`  ✓ ${plans.length} subscription plans successfully processed.`);

    // -------------------------------------------------------------
    // 2. Migrate Users (Safe Email Upsert)
    // -------------------------------------------------------------
    console.log('👤 Migrating Users...');
    const rawUsers = readJsonFile('users.json', []);
    const seenEmails = new Set();

    for (const u of rawUsers) {
      if (!u || !u.email) continue;
      const email = u.email.toLowerCase().trim();
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);

      const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        await client.query(`
          UPDATE users SET
            name = $1,
            role = $2,
            subscription_plan = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE email = $4;
        `, [u.name || 'User', u.role || 'user', u.subscriptionPlan || 'taster', email]);
      } else {
        let userId = u.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
        const idCheck = await client.query('SELECT 1 FROM users WHERE id = $1', [userId]);
        if (idCheck.rows.length > 0) {
          userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        }

        await client.query(`
          INSERT INTO users (id, name, email, password_hash, role, subscription_plan, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP);
        `, [
          userId,
          u.name || 'User',
          email,
          u.passwordHash || null,
          u.role || 'user',
          u.subscriptionPlan || 'taster',
          u.createdAt ? new Date(u.createdAt) : null
        ]);
      }
    }
    console.log(`  ✓ ${seenEmails.size} users processed.`);

    // -------------------------------------------------------------
    // 3. Migrate Admin Settings
    // -------------------------------------------------------------
    console.log('⚙️ Migrating Admin Settings...');
    const settings = readJsonFile('admin_settings.json', {});
    await client.query(`
      INSERT INTO admin_settings (
        id, site_name, titlebar_emoji, titlebar_image, favicon_emoji, favicon_image,
        currency, ai_provider, ai_model, theme_colors, payment_settings, social_login,
        chef_ai_settings, recipe_types, ingredient_categories, supported_languages, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, CURRENT_TIMESTAMP)
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
      settings.titlebarImage || '',
      settings.faviconEmoji || '🍳',
      settings.faviconImage || '',
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
    console.log('  ✓ Admin settings imported.');

    // -------------------------------------------------------------
    // 4. Migrate Payment Transactions (Foreign Key Safe)
    // -------------------------------------------------------------
    console.log('💳 Migrating Payment Transactions...');
    const txs = readJsonFile('payment_transactions.json', []);
    for (const t of txs) {
      if (!t) continue;
      let slug = t.planSlug;
      if (!slug && t.planName) {
        slug = t.planName.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
      }

      // Auto-provision plan if referenced slug does not exist in master table
      if (slug) {
        const planExists = await client.query('SELECT 1 FROM subscription_plans WHERE slug = $1', [slug]);
        if (planExists.rows.length === 0) {
          let newPlanId = 'plan_' + slug;
          const idCheck = await client.query('SELECT 1 FROM subscription_plans WHERE id = $1', [newPlanId]);
          if (idCheck.rows.length > 0) {
            newPlanId = `plan_${slug}_${Math.random().toString(36).substring(2, 6)}`;
          }
          await client.query(`
            INSERT INTO subscription_plans (id, name, slug, monthly_price_dollars, is_free)
            VALUES ($1, $2, $3, $4, FALSE);
          `, [newPlanId, t.planName || slug, slug, t.amount || 0]);
        }
      }

      const txId = t.id || ('tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      await client.query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount, currency,
          gateway, status, failure_reason, test_mode, expiry_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, CURRENT_TIMESTAMP))
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          failure_reason = EXCLUDED.failure_reason;
      `, [
        txId,
        t.customerName || 'Customer',
        (t.customerEmail || 'customer@example.com').toLowerCase().trim(),
        t.planName || 'Plan',
        slug || null,
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
    console.log(`  ✓ ${txs.length} payment transactions imported.`);

    // -------------------------------------------------------------
    // 5. Migrate Saved Recipes (User Foreign Key Safe)
    // -------------------------------------------------------------
    console.log('🍲 Migrating Saved Recipes...');
    const recipes = readJsonFile('saved_recipes.json', []);
    for (const r of recipes) {
      if (!r) continue;

      let validUserId = null;
      if (r.userId) {
        const userCheck = await client.query('SELECT 1 FROM users WHERE id = $1', [r.userId]);
        if (userCheck.rows.length > 0) validUserId = r.userId;
      }

      const recipeId = r.id || ('rcp_' + Math.random().toString(36).substring(2, 9));
      await client.query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, COALESCE($17, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          recipe_type = EXCLUDED.recipe_type,
          cuisine = EXCLUDED.cuisine,
          prep_time = EXCLUDED.prep_time,
          cook_time = EXCLUDED.cook_time,
          servings = EXCLUDED.servings,
          difficulty = EXCLUDED.difficulty,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          nutrition = EXCLUDED.nutrition,
          tags = EXCLUDED.tags,
          image_url = EXCLUDED.image_url,
          is_public = EXCLUDED.is_public,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        recipeId,
        validUserId,
        r.title || 'Untitled Recipe',
        r.description || '',
        r.recipeType || r.category || 'General',
        r.cuisine || '',
        r.prepTime || '',
        r.cookTime || '',
        r.servings || '',
        r.difficulty || '',
        JSON.stringify(r.ingredients || []),
        JSON.stringify(r.directions || r.instructions || []),
        JSON.stringify(r.nutrition || r.macros || {}),
        JSON.stringify(r.tags || []),
        r.imageUrl || r.image || '',
        Boolean(r.isPublic),
        r.createdAt ? new Date(r.createdAt) : null
      ]);
    }
    console.log(`  ✓ ${recipes.length} saved recipes imported.`);

    await client.query('COMMIT');
    console.log('\n✨ ALL PROJECT DATA HAS BEEN SUCCESSFULLY MIGRATED TO POSTGRESQL WITHOUT CONSTRAINT ERRORS!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed and rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
