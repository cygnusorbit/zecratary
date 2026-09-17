// Automated PostgreSQL Content & Pages Verification Suite
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envCandidates = ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local'];
  for (const envFile of envCandidates) {
    const fullPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is missing. Please configure it in your .env or .env.local file.');
  process.exit(1);
}

async function verifyPostgresStorage() {
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (err) {
    console.error('❌ Error: pg module is not installed. Run `npm install pg` first.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('------------------------------------------------------------');
    console.log('🐘 Connected to PostgreSQL: Checking All Tables & Page Data');
    console.log('------------------------------------------------------------\n');

    // 1. Check existing tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `);

    const existingTables = tablesRes.rows.map(r => r.table_name);
    console.log('📊 Active Database Tables in public schema:');
    console.log(existingTables.length ? existingTables.map(t => `   • ${t}`).join('\n') : '   ⚠️ No tables found.');
    console.log('');

    // Target application entities supporting views and pages
    const targetTables = [
      { name: 'admin_settings', description: 'Global branding, theme tokens, AI models, languages (/admin, /profile)' },
      { name: 'subscription_plans', description: 'Membership tiers, pricing, quotas (/package, /admin/plans)' },
      { name: 'users', description: 'User credentials, roles, assigned plans (/admin/users, /profile, /login)' },
      { name: 'payment_transactions', description: 'Financial ledger, plan upgrades (/admin/payment)' },
      { name: 'page_contents', description: 'CMS dynamic page blocks, templates, metadata' },
      { name: 'saved_recipes', description: 'Recipe collections, pantry items, bookmarks (/saved, /manual)' }
    ];

    console.log('📋 Verifying Table Data & Page Associations:');
    for (const target of targetTables) {
      if (existingTables.includes(target.name)) {
        const countRes = await client.query(`SELECT COUNT(*) AS total FROM ${target.name};`);
        const total = countRes.rows[0].total;
        console.log(`  ✓ Table [${target.name}]: ${total} record(s)`);
        console.log(`    ↳ Used by: ${target.description}`);

        // Sample content inspection for core pages
        if (target.name === 'admin_settings' && parseInt(total, 10) > 0) {
          const sample = await client.query(`SELECT site_name, theme_colors, supported_languages FROM admin_settings LIMIT 1;`);
          const row = sample.rows[0];
          console.log(`    ↳ Verified settings payload: site_name="${row.site_name}", theme_colors=${row.theme_colors ? 'Stored (JSONB)' : 'None'}, languages=${row.supported_languages ? 'Stored (JSONB)' : 'None'}`);
        } else if (target.name === 'page_contents' && parseInt(total, 10) > 0) {
          const pages = await client.query(`SELECT page_slug, title, is_published FROM page_contents LIMIT 5;`);
          pages.rows.forEach(p => console.log(`    ↳ Page Slug: "${p.page_slug}" | Title: "${p.title}" | Published: ${p.is_published}`));
        }
      } else {
        console.log(`  ⚠️ Table [${target.name}] does NOT exist in PostgreSQL yet.`);
      }
      console.log('');
    }

    client.release();
    console.log('------------------------------------------------------------');
    console.log('✨ Verification Finished.');
    console.log('------------------------------------------------------------');
  } catch (err) {
    console.error('❌ Connection/Query Error:', err.message);
  } finally {
    await pool.end();
  }
}

verifyPostgresStorage();
