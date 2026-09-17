import { query } from '../apps/web/src/lib/db';

async function runCliScan() {
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('       🔍 USER & PLAN & PAYMENT INTEGRITY HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    const unpaid = await query(`
      SELECT u.id, u.name, u.email, u.subscription_plan
      FROM users u
      WHERE u.subscription_plan NOT IN ('taster', 'free')
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt
          WHERE LOWER(pt.customer_email) = LOWER(u.email)
            AND pt.status IN ('succeeded', 'paid', 'canceled')
            AND (pt.expiry_date IS NULL OR pt.expiry_date > NOW())
        )
    `);

    const expired = await query(`
      SELECT u.id, u.name, u.email, u.subscription_plan, pt.expiry_date
      FROM users u
      JOIN payment_transactions pt ON LOWER(pt.customer_email) = LOWER(u.email)
      WHERE u.subscription_plan NOT IN ('taster', 'free')
        AND pt.status IN ('succeeded', 'paid', 'canceled')
        AND pt.expiry_date <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions active_pt
          WHERE LOWER(active_pt.customer_email) = LOWER(u.email)
            AND active_pt.status IN ('succeeded', 'paid')
            AND (active_pt.expiry_date IS NULL OR active_pt.expiry_date > NOW())
        )
    `);

    const dupes = await query(`
      SELECT LOWER(customer_email) AS email, COUNT(*)::int AS count
      FROM payment_transactions
      WHERE status IN ('succeeded', 'paid')
        AND (expiry_date IS NULL OR expiry_date > NOW())
      GROUP BY LOWER(customer_email)
      HAVING COUNT(*) > 1
    `);

    const mismatches = await query(`
      SELECT u.email, u.subscription_plan AS user_plan, pt.plan_slug AS tx_plan
      FROM users u
      JOIN payment_transactions pt ON LOWER(pt.customer_email) = LOWER(u.email)
      WHERE pt.status IN ('succeeded', 'paid', 'canceled')
        AND (pt.expiry_date IS NULL OR pt.expiry_date > NOW())
        AND LOWER(REPLACE(u.subscription_plan, '_', '-')) != LOWER(REPLACE(pt.plan_slug, '_', '-'))
    `);

    const missingCatalog = await query(`
      SELECT DISTINCT u.subscription_plan AS slug, 'users' AS table_name
      FROM users u
      WHERE u.subscription_plan NOT IN ('taster', 'free')
        AND NOT EXISTS (
          SELECT 1 FROM subscription_plans sp 
          WHERE sp.slug = u.subscription_plan OR sp.id = u.subscription_plan
             OR sp.monthly_plan_id = u.subscription_plan OR sp.annual_plan_id = u.subscription_plan
        )
    `);

    const total = unpaid.length + expired.length + dupes.length + mismatches.length + missingCatalog.length;

    console.log(` 1. Unpaid Users on Paid Plans:          [ ${unpaid.length === 0 ? '✓ HEALTHY (0)' : '⚠️  ' + unpaid.length + ' ISSUE(S)'} ]`);
    if (unpaid.length > 0) console.table(unpaid);

    console.log(` 2. Expired Plans Needing Demotion:       [ ${expired.length === 0 ? '✓ HEALTHY (0)' : '⚠️  ' + expired.length + ' ISSUE(S)'} ]`);
    if (expired.length > 0) console.table(expired);

    console.log(` 3. Duplicate Active Transactions:        [ ${dupes.length === 0 ? '✓ HEALTHY (0)' : '⚠️  ' + dupes.length + ' ISSUE(S)'} ]`);
    if (dupes.length > 0) console.table(dupes);

    console.log(` 4. User Plan vs Transaction Mismatches:  [ ${mismatches.length === 0 ? '✓ HEALTHY (0)' : '⚠️  ' + mismatches.length + ' ISSUE(S)'} ]`);
    if (mismatches.length > 0) console.table(mismatches);

    console.log(` 5. Missing Catalog Plan Slugs:           [ ${missingCatalog.length === 0 ? '✓ HEALTHY (0)' : '⚠️  ' + missingCatalog.length + ' ISSUE(S)'} ]`);
    if (missingCatalog.length > 0) console.table(missingCatalog);

    console.log('\n───────────────────────────────────────────────────────────────────────');
    if (total === 0) {
      console.log(' ✨ ALL SYSTEMS HEALTHY! Zero inconsistencies detected in PostgreSQL.');
    } else {
      console.log(` ⚠️  TOTAL INCONSISTENCIES FOUND: ${total}`);
      console.log(' 💡 To auto-repair all issues, send a POST request to: /api/admin/scan?fix=true');
    }
    console.log('───────────────────────────────────────────────────────────────────────\n');
  } catch (err: any) {
    console.error('Database connection / query note:', err.message);
  } finally {
    process.exit(0);
  }
}

runCliScan();
