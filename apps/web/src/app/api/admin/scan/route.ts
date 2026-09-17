import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Users with paid plan but NO valid unexpired transaction
    const unpaidUsers = await query(`
      SELECT u.id, u.name, u.email, u.subscription_plan AS "subscriptionPlan"
      FROM users u
      WHERE u.subscription_plan NOT IN ('taster', 'free')
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt
          WHERE LOWER(pt.customer_email) = LOWER(u.email)
            AND pt.status IN ('succeeded', 'paid', 'canceled')
            AND (pt.expiry_date IS NULL OR pt.expiry_date > NOW())
        )
    `);

    // 2. Users with expired transactions still on paid tier
    const expiredUsers = await query(`
      SELECT u.id, u.name, u.email, u.subscription_plan AS "subscriptionPlan", pt.id AS "txId", pt.expiry_date AS "expiryDate"
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

    // 3. Multiple active transactions for 1 user
    const duplicateTxs = await query(`
      SELECT LOWER(customer_email) AS "customerEmail", COUNT(*)::int AS "activeCount", ARRAY_AGG(id) AS "txIds"
      FROM payment_transactions
      WHERE status IN ('succeeded', 'paid')
        AND (expiry_date IS NULL OR expiry_date > NOW())
      GROUP BY LOWER(customer_email)
      HAVING COUNT(*) > 1
    `);

    // 4. Plan slug mismatch between user and active transaction
    const mismatchedPlans = await query(`
      SELECT u.id AS "userId", u.email, u.subscription_plan AS "userPlan", pt.plan_slug AS "txPlan", pt.status, pt.expiry_date AS "expiryDate"
      FROM users u
      JOIN payment_transactions pt ON LOWER(pt.customer_email) = LOWER(u.email)
      WHERE pt.status IN ('succeeded', 'paid', 'canceled')
        AND (pt.expiry_date IS NULL OR pt.expiry_date > NOW())
        AND LOWER(REPLACE(u.subscription_plan, '_', '-')) != LOWER(REPLACE(pt.plan_slug, '_', '-'))
    `);

    // 5. Missing plan definitions in subscription_plans catalog
    const missingPlans = await query(`
      SELECT DISTINCT u.subscription_plan AS "missingSlug", 'users' AS "sourceTable"
      FROM users u
      WHERE u.subscription_plan NOT IN ('taster', 'free')
        AND NOT EXISTS (
          SELECT 1 FROM subscription_plans sp 
          WHERE sp.slug = u.subscription_plan OR sp.id = u.subscription_plan
             OR sp.monthly_plan_id = u.subscription_plan OR sp.annual_plan_id = u.subscription_plan
        )
      UNION
      SELECT DISTINCT pt.plan_slug AS "missingSlug", 'payment_transactions' AS "sourceTable"
      FROM payment_transactions pt
      WHERE pt.plan_slug NOT IN ('taster', 'free')
        AND NOT EXISTS (
          SELECT 1 FROM subscription_plans sp 
          WHERE sp.slug = pt.plan_slug OR sp.id = pt.plan_slug
             OR sp.monthly_plan_id = pt.plan_slug OR sp.annual_plan_id = pt.plan_slug
        )
    `);

    // 6. Tombstone collisions
    const tombstoneCollisions = await query(`
      SELECT u.id, u.email, u.role, d.deleted_at AS "deletedAt"
      FROM users u
      JOIN deleted_users d ON LOWER(u.email) = LOWER(d.email)
    `);

    const totalIssues = unpaidUsers.length + expiredUsers.length + duplicateTxs.length +
                        mismatchedPlans.length + missingPlans.length + tombstoneCollisions.length;

    return NextResponse.json({
      success: true,
      healthy: totalIssues === 0,
      totalIssues,
      report: {
        unpaidUsers: { count: unpaidUsers.length, items: unpaidUsers, fixAction: "Revert user subscription_plan to 'taster'" },
        expiredUsers: { count: expiredUsers.length, items: expiredUsers, fixAction: "Revert user subscription_plan to 'taster'" },
        duplicateTxs: { count: duplicateTxs.length, items: duplicateTxs, fixAction: "Keep latest transaction; mark older ones 'refunded'" },
        mismatchedPlans: { count: mismatchedPlans.length, items: mismatchedPlans, fixAction: "Synchronize user plan with active transaction plan_slug" },
        missingPlans: { count: missingPlans.length, items: missingPlans, fixAction: "Create missing package entries in subscription_plans" },
        tombstoneCollisions: { count: tombstoneCollisions.length, items: tombstoneCollisions, fixAction: "Remove resurrected users from deleted_users table" }
      }
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldFix = searchParams.get('fix') === 'true' || (await req.json().catch(() => ({})))?.fix;

    if (!shouldFix) {
      return NextResponse.json({ success: false, error: 'Pass ?fix=true or body { fix: true } to apply automated repair.' }, { status: 400 });
    }

    const repairsApplied: string[] = [];

    // 1. Auto-revert unpaid users to taster
    const unpaidFix = await query(`
      UPDATE users SET subscription_plan = 'taster', updated_at = NOW()
      WHERE subscription_plan NOT IN ('taster', 'free')
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt
          WHERE LOWER(pt.customer_email) = LOWER(users.email)
            AND pt.status IN ('succeeded', 'paid', 'canceled')
            AND (pt.expiry_date IS NULL OR pt.expiry_date > NOW())
        )
      RETURNING email, subscription_plan;
    `);
    if (unpaidFix.length > 0) {
      repairsApplied.push(`Reverted ${unpaidFix.length} unpaid user(s) to 'taster': ${unpaidFix.map((r: any) => r.email).join(', ')}`);
    }

    // 2. Auto-revert expired users to taster
    const expiredFix = await query(`
      UPDATE users SET subscription_plan = 'taster', updated_at = NOW()
      WHERE subscription_plan NOT IN ('taster', 'free')
        AND EXISTS (
          SELECT 1 FROM payment_transactions pt
          WHERE LOWER(pt.customer_email) = LOWER(users.email)
            AND pt.status IN ('succeeded', 'paid', 'canceled')
            AND pt.expiry_date <= NOW()
        )
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions active_pt
          WHERE LOWER(active_pt.customer_email) = LOWER(users.email)
            AND active_pt.status IN ('succeeded', 'paid')
            AND (active_pt.expiry_date IS NULL OR active_pt.expiry_date > NOW())
        )
      RETURNING email;
    `);
    if (expiredFix.length > 0) {
      repairsApplied.push(`Demoted ${expiredFix.length} expired user(s) to 'taster': ${expiredFix.map((r: any) => r.email).join(', ')}`);
    }

    // 3. Resolve duplicate active transactions (keep newest, refund older)
    const dupes = await query(`
      SELECT LOWER(customer_email) AS "customerEmail"
      FROM payment_transactions
      WHERE status IN ('succeeded', 'paid')
        AND (expiry_date IS NULL OR expiry_date > NOW())
      GROUP BY LOWER(customer_email)
      HAVING COUNT(*) > 1
    `);

    for (const d of dupes) {
      const email = d.customerEmail;
      await query(`
        UPDATE payment_transactions
        SET status = 'refunded'
        WHERE LOWER(customer_email) = $1
          AND status IN ('succeeded', 'paid')
          AND id NOT IN (
            SELECT id FROM payment_transactions
            WHERE LOWER(customer_email) = $1
              AND status IN ('succeeded', 'paid')
              AND (expiry_date IS NULL OR expiry_date > NOW())
            ORDER BY created_at DESC
            LIMIT 1
          )
      `, [email]);
      repairsApplied.push(`Resolved duplicate active transactions for ${email}: preserved newest, refunded older.`);
    }

    // 4. Synchronize mismatched plan slugs
    const syncFix = await query(`
      UPDATE users u
      SET subscription_plan = pt.plan_slug, updated_at = NOW()
      FROM (
        SELECT DISTINCT ON (LOWER(customer_email)) LOWER(customer_email) AS c_email, plan_slug
        FROM payment_transactions
        WHERE status IN ('succeeded', 'paid', 'canceled')
          AND (expiry_date IS NULL OR expiry_date > NOW())
        ORDER BY LOWER(customer_email), created_at DESC
      ) pt
      WHERE LOWER(u.email) = pt.c_email
        AND LOWER(REPLACE(u.subscription_plan, '_', '-')) != LOWER(REPLACE(pt.plan_slug, '_', '-'))
      RETURNING u.email, u.subscription_plan;
    `);
    if (syncFix.length > 0) {
      repairsApplied.push(`Synchronized plan slugs for ${syncFix.length} user(s) with their active transactions.`);
    }

    // 5. Clean tombstone collisions
    const tombstoneFix = await query(`
      DELETE FROM deleted_users d
      WHERE EXISTS (
        SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(d.email)
      )
      RETURNING email;
    `);
    if (tombstoneFix.length > 0) {
      repairsApplied.push(`Purged ${tombstoneFix.length} active user email(s) from deleted_users tombstone.`);
    }

    return NextResponse.json({
      success: true,
      message: 'Automated database synchronization and healing complete.',
      repairsCount: repairsApplied.length,
      repairsApplied
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
