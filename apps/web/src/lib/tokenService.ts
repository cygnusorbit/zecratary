import { query } from '@/lib/db';

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
}

export interface TokenSettings {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  chefCost: number;
  importUrlCost: number;
  importTextCost: number;
  importPhotoCost: number;
  packages: TokenPackage[];
  planAllocations?: { [slug: string]: number };
  isEnabled: boolean;
  updatedAt?: string;
}

export interface DeductionResult {
  success: boolean;
  error?: string;
  deducted?: number;
  currentBalance?: number;
  required?: number;
  tokenSymbol?: string;
}

export interface AffectedUserBalance {
  id: string;
  email: string;
  oldBalance: number;
  newBalance: number;
  adjustedTokens: number;
}

const DEFAULT_SETTINGS: TokenSettings = {
  id: 'primary_token_settings',
  tokenName: 'Foodie Token',
  tokenSymbol: '🪙',
  chefCost: 1,
  importUrlCost: 2,
  importTextCost: 1,
  importPhotoCost: 3,
  packages: [
    { id: 'pkg_starter', name: 'Starter Pantry', tokens: 100, price: 4.99, badge: 'Starter' },
    { id: 'pkg_pro', name: 'Culinary Master', tokens: 500, price: 19.99, badge: 'Popular', isPopular: true },
    { id: 'pkg_buffet', name: 'Executive Chef', tokens: 1500, price: 49.99, badge: 'Best Value' }
  ],
  planAllocations: {},
  isEnabled: true
};

export async function initTokenTables(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS token_settings (
        id VARCHAR(64) PRIMARY KEY,
        token_name VARCHAR(100) DEFAULT 'Foodie Token',
        token_symbol VARCHAR(20) DEFAULT '🪙',
        chef_cost INTEGER DEFAULT 1,
        import_url_cost INTEGER DEFAULT 2,
        import_text_cost INTEGER DEFAULT 1,
        import_photo_cost INTEGER DEFAULT 3,
        packages JSONB DEFAULT '[]'::jsonb,
        plan_allocations JSONB DEFAULT '{}'::jsonb,
        is_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      ALTER TABLE token_settings 
      ADD COLUMN IF NOT EXISTS plan_allocations JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS token_transactions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_email VARCHAR(255),
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS last_token_grant_cycle VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_token_grant_date TIMESTAMPTZ;
    `);

    await query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS monthly_tokens INTEGER DEFAULT 500,
      ADD COLUMN IF NOT EXISTS token_limit INTEGER DEFAULT 500;
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_token_transactions_email ON token_transactions(user_email);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON token_transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
    `);
  } catch (err) {
    console.warn('initTokenTables warning:', err);
  }
}

export async function getTokenSettings(): Promise<TokenSettings> {
  await initTokenTables();
  try {
    const rows = await query('SELECT * FROM token_settings ORDER BY updated_at DESC LIMIT 1');
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id || 'primary_token_settings',
        tokenName: r.token_name || DEFAULT_SETTINGS.tokenName,
        tokenSymbol: r.token_symbol || DEFAULT_SETTINGS.tokenSymbol,
        chefCost: Number(r.chef_cost ?? DEFAULT_SETTINGS.chefCost),
        importUrlCost: Number(r.import_url_cost ?? DEFAULT_SETTINGS.importUrlCost),
        importTextCost: Number(r.import_text_cost ?? DEFAULT_SETTINGS.importTextCost),
        importPhotoCost: Number(r.import_photo_cost ?? DEFAULT_SETTINGS.importPhotoCost),
        packages: Array.isArray(r.packages) 
          ? r.packages 
          : (typeof r.packages === 'string' ? JSON.parse(r.packages) : DEFAULT_SETTINGS.packages),
        planAllocations: r.plan_allocations 
          ? (typeof r.plan_allocations === 'string' ? JSON.parse(r.plan_allocations) : r.plan_allocations) 
          : {},
        isEnabled: Boolean(r.is_enabled ?? true),
        updatedAt: r.updated_at
      };
    }
  } catch (_) {}
  return DEFAULT_SETTINGS;
}

export async function saveTokenSettings(settings: Partial<TokenSettings>): Promise<TokenSettings> {
  await initTokenTables();
  const current = await getTokenSettings();
  
  const merged: TokenSettings = {
    ...current,
    ...settings,
    packages: Array.isArray(settings.packages) ? settings.packages : current.packages,
    planAllocations: settings.planAllocations || current.planAllocations || {},
    isEnabled: settings.isEnabled !== undefined ? Boolean(settings.isEnabled) : current.isEnabled
  };

  const idToUse = current.id || 'primary_token_settings';

  await query(`
    INSERT INTO token_settings (
      id, token_name, token_symbol, chef_cost, import_url_cost,
      import_text_cost, import_photo_cost, packages, plan_allocations, is_enabled, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, NOW())
    ON CONFLICT (id) DO UPDATE SET
      token_name = EXCLUDED.token_name,
      token_symbol = EXCLUDED.token_symbol,
      chef_cost = EXCLUDED.chef_cost,
      import_url_cost = EXCLUDED.import_url_cost,
      import_text_cost = EXCLUDED.import_text_cost,
      import_photo_cost = EXCLUDED.import_photo_cost,
      packages = EXCLUDED.packages,
      plan_allocations = EXCLUDED.plan_allocations,
      is_enabled = EXCLUDED.is_enabled,
      updated_at = NOW()
  `, [
    idToUse,
    merged.tokenName,
    merged.tokenSymbol,
    merged.chefCost,
    merged.importUrlCost,
    merged.importTextCost,
    merged.importPhotoCost,
    JSON.stringify(merged.packages),
    JSON.stringify(merged.planAllocations),
    merged.isEnabled
  ]);

  if (merged.planAllocations && typeof merged.planAllocations === 'object') {
    for (const [slug, amount] of Object.entries(merged.planAllocations)) {
      const num = Math.max(0, Number(amount));
      try {
        await query(`
          UPDATE subscription_plans 
          SET token_limit = $1, monthly_tokens = $1, updated_at = NOW() 
          WHERE LOWER(slug) = LOWER($2) OR LOWER(id) = LOWER($2)
        `, [num, slug]);
      } catch (_) {}
    }
  }

  return merged;
}

export async function getUserTokenBalance(userId?: string | null, userEmail?: string | null): Promise<number> {
  await initTokenTables();
  try {
    let rows: any[] = [];
    if (userId) {
      rows = await query('SELECT token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    } else if (userEmail) {
      rows = await query('SELECT token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    }
    if (rows.length > 0 && rows[0].token_balance !== null) {
      return Number(rows[0].token_balance);
    }
  } catch (_) {}
  return 0;
}

export async function deductUserTokens({
  userId,
  userEmail,
  cost,
  feature,
  description
}: {
  userId?: string | null;
  userEmail?: string | null;
  cost: number;
  feature: string;
  description: string;
}): Promise<DeductionResult> {
  await initTokenTables();
  const settings = await getTokenSettings();

  if (!settings.isEnabled || cost <= 0) {
    const current = await getUserTokenBalance(userId, userEmail);
    return { success: true, deducted: 0, currentBalance: current, tokenSymbol: settings.tokenSymbol };
  }

  let userRow: any = null;
  if (userId) {
    const rows = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (rows.length > 0) userRow = rows[0];
  }
  if (!userRow && userEmail) {
    const rows = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    if (rows.length > 0) userRow = rows[0];
  }

  if (!userRow) {
    return { success: false, error: 'User not found' };
  }

  const currentBalance = Number(userRow.token_balance ?? 0);
  if (currentBalance < cost) {
    return {
      success: false,
      error: `Insufficient ${settings.tokenName}. Required: ${cost} ${settings.tokenSymbol}, Balance: ${currentBalance} ${settings.tokenSymbol}`,
      currentBalance,
      required: cost,
      tokenSymbol: settings.tokenSymbol
    };
  }

  const updateRes = await query(`
    UPDATE users 
    SET token_balance = token_balance - $1, updated_at = NOW() 
    WHERE id = $2 AND token_balance >= $1 
    RETURNING token_balance
  `, [cost, userRow.id]);

  if (updateRes.length === 0) {
    return {
      success: false,
      error: 'Token deduction failed due to concurrent update.',
      currentBalance,
      required: cost
    };
  }

  const newBalance = Number(updateRes[0].token_balance);
  const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  try {
    await query(`
      INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [txId, userRow.id, userRow.email, -cost, newBalance, `usage_${feature}`, description]);
  } catch (txErr) {
    console.error('Failed to log token transaction:', txErr);
  }

  return {
    success: true,
    deducted: cost,
    currentBalance: newBalance,
    tokenSymbol: settings.tokenSymbol
  };
}

export async function grantMonthlyPlanTokenReward(
  userEmailOrId: string,
  options?: { force?: boolean; source?: string; customTokens?: number; orderId?: string }
): Promise<{
  success: boolean;
  tokensGranted: number;
  newBalance: number;
  reason?: string;
  cycle?: string;
  isPaid?: boolean;
}> {
  try {
    await initTokenTables();
    const cleanIdent = String(userEmailOrId || '').trim();
    if (!cleanIdent) {
      return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User identifier required' };
    }

    const userRows = await query(`
      SELECT id, email, token_balance, subscription_plan, plan_slug, plan_name, plan_interval, plan_expiry_date, last_token_grant_cycle, last_token_grant_date
      FROM users 
      WHERE LOWER(email) = LOWER($1) OR id = $1 
      LIMIT 1
    `, [cleanIdent]);

    if (!userRows || userRows.length === 0) {
      return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User not found in database' };
    }

    const user = userRows[0];
    const userEmail = (user.email || '').toLowerCase().trim();
    const rawPlanSlug = String(user.plan_slug || user.subscription_plan || 'taster').toLowerCase().trim();
    const baseSlug = rawPlanSlug.replace(/-(monthly|annual|year|free)$/i, '');
    const isFreeTier = baseSlug === 'taster' || baseSlug === 'free';

    let isPaymentPaid = false;
    let activeTx: any = null;

    if (isFreeTier) {
      isPaymentPaid = true;
    } else {
      const txRows = await query(`
        SELECT id, plan_name, plan_slug, amount, status, expiry_date, created_at
        FROM payment_transactions
        WHERE LOWER(TRIM(customer_email)) = $1
          AND status IN ('succeeded', 'paid')
          AND (expiry_date IS NULL OR expiry_date > NOW())
        ORDER BY created_at DESC LIMIT 1
      `, [userEmail]);

      const txList = Array.isArray(txRows) ? txRows : (txRows?.rows || []);
      if (txList.length > 0) {
        activeTx = txList[0];
        isPaymentPaid = true;
      }
    }

    if (!isPaymentPaid) {
      return {
        success: false,
        tokensGranted: 0,
        newBalance: Number(user.token_balance || 0),
        isPaid: false,
        reason: 'Payment is not in PAID status. Token rewards are stopped until an active subscription payment succeeds.'
      };
    }

    const now = new Date();
    const currentCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastCycle = user.last_token_grant_cycle;

    if (lastCycle === currentCycle && !options?.force) {
      return {
        success: false,
        tokensGranted: 0,
        newBalance: Number(user.token_balance || 0),
        isPaid: true,
        cycle: currentCycle,
        reason: `Monthly token reward for cycle ${currentCycle} has already been credited. Tokens are issued once a month.`
      };
    }

    let tokensToGrant = options?.customTokens ?? 0;
    let resolvedPlanName = user.plan_name || rawPlanSlug;

    if (!tokensToGrant || tokensToGrant <= 0) {
      const planRows = await query(`
        SELECT name, slug, token_limit, monthly_tokens 
        FROM subscription_plans 
        WHERE LOWER(slug) = LOWER($1) OR LOWER(id) = LOWER($1) OR LOWER(slug) = LOWER($2)
        LIMIT 1
      `, [rawPlanSlug, baseSlug]);

      const pList = Array.isArray(planRows) ? planRows : (planRows?.rows || []);
      if (pList.length > 0) {
        const p = pList[0];
        tokensToGrant = Number(p.token_limit ?? p.monthly_tokens ?? (isFreeTier ? 50 : 500));
        if (p.name) resolvedPlanName = p.name;
      } else {
        const settings = await getTokenSettings();
        const alloc = settings.planAllocations || {};
        tokensToGrant = Number(alloc[rawPlanSlug] ?? alloc[baseSlug] ?? (isFreeTier ? 50 : 500));
      }
    }

    if (tokensToGrant <= 0) {
      tokensToGrant = isFreeTier ? 50 : 500;
    }

    const settings = await getTokenSettings();
    const symbol = settings.tokenSymbol || '🪙';

    const updateRes = await query(`
      UPDATE users 
      SET token_balance = COALESCE(token_balance, 0) + $1,
          last_token_grant_cycle = $2,
          last_token_grant_date = NOW(),
          updated_at = NOW()
      WHERE id = $3
      RETURNING token_balance
    `, [tokensToGrant, currentCycle, user.id]);

    const updatedRows = Array.isArray(updateRes) ? updateRes : (updateRes?.rows || []);
    const newBalance = Number(updatedRows[0]?.token_balance ?? (Number(user.token_balance || 0) + tokensToGrant));

    const txId = 'tx_grant_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const description = `Monthly Plan Token Reward: ${resolvedPlanName} (+${tokensToGrant.toLocaleString()} ${symbol}) [Cycle: ${currentCycle}]${options?.orderId ? ` [Order: ${options.orderId}]` : activeTx?.id ? ` [Order: ${activeTx.id}]` : ''}`;

    await query(`
      INSERT INTO token_transactions 
      (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'plan_monthly_grant', $6, NOW())
    `, [txId, user.id, userEmail, tokensToGrant, newBalance, description]);

    return {
      success: true,
      tokensGranted: tokensToGrant,
      newBalance,
      cycle: currentCycle,
      isPaid: true
    };
  } catch (err: any) {
    console.error('grantMonthlyPlanTokenReward error:', err);
    return { success: false, tokensGranted: 0, newBalance: 0, reason: err.message };
  }
}

export async function grantPlanTokensOnPurchase(
  userEmailOrId: string,
  planSlug: string,
  options?: { customTokens?: number; orderId?: string; isAnnual?: boolean; planName?: string }
): Promise<{ success: boolean; tokensGranted: number; newBalance: number; error?: string }> {
  const result = await grantMonthlyPlanTokenReward(userEmailOrId, {
    customTokens: options?.customTokens,
    orderId: options?.orderId
  });

  return {
    success: result.success,
    tokensGranted: result.tokensGranted,
    newBalance: result.newBalance,
    error: result.reason
  };
}

/**
 * Deletes token transactions and atomically adjusts the user's token balance in PostgreSQL.
 * If transaction was a credit (+tokens), tokens are removed: newBalance = max(0, oldBalance - amount)
 * If transaction was a debit (-tokens), deduction is undone: newBalance = oldBalance + abs(amount)
 */
export async function deleteTokenTransactionsAndSyncBalance(ids: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  affectedUsers: AffectedUserBalance[];
  error?: string;
}> {
  await initTokenTables();
  if (!ids || ids.length === 0) {
    return { success: false, deletedCount: 0, affectedUsers: [], error: 'No transaction ID(s) provided' };
  }

  // 1. Fetch transactions before deleting
  const txRows = await query(`
    SELECT id, user_id, user_email, amount, type, description 
    FROM token_transactions 
    WHERE id = ANY($1)
  `, [ids]);
  const rawTxs = Array.isArray(txRows) ? txRows : (txRows?.rows || []);

  if (rawTxs.length === 0) {
    return { success: false, deletedCount: 0, affectedUsers: [], error: 'No matching transaction records found' };
  }

  // 2. Aggregate adjustments per user
  const userAdjustments = new Map<string, { userId: string; userEmail: string; netAmount: number; types: string[] }>();

  for (const tx of rawTxs) {
    const email = (tx.user_email || '').toLowerCase().trim();
    const uId = (tx.user_id || '').trim();
    const key = email || uId;
    if (!key) continue;

    const amt = Number(tx.amount || 0);
    const existing = userAdjustments.get(key) || { userId: uId, userEmail: email, netAmount: 0, types: [] };
    existing.netAmount += amt;
    existing.types.push(tx.type);
    if (!existing.userId && uId) existing.userId = uId;
    if (!existing.userEmail && email) existing.userEmail = email;
    userAdjustments.set(key, existing);
  }

  // 3. Atomically update users.token_balance in PostgreSQL
  const affectedUsers: AffectedUserBalance[] = [];

  for (const [, adj] of userAdjustments.entries()) {
    const uRes = await query(`
      SELECT id, email, token_balance, last_token_grant_cycle 
      FROM users 
      WHERE (id = $1 AND $1 != '') OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($2)) AND $2 != '')
      LIMIT 1
    `, [adj.userId, adj.userEmail]);
    const uList = Array.isArray(uRes) ? uRes : (uRes?.rows || []);

    if (uList.length > 0) {
      const u = uList[0];
      const oldBalance = Number(u.token_balance ?? 0);
      // Reversal: newBalance = max(0, oldBalance - netAmount)
      const newBalance = Math.max(0, oldBalance - adj.netAmount);

      await query(`
        UPDATE users 
        SET token_balance = $1, updated_at = NOW() 
        WHERE id = $2
      `, [newBalance, u.id]);

      // If a monthly grant was deleted, reset cycle so it can be reclaimed if desired
      if (adj.types.includes('plan_monthly_grant')) {
        await query(`
          UPDATE users 
          SET last_token_grant_cycle = NULL, updated_at = NOW() 
          WHERE id = $1
        `, [u.id]).catch(() => {});
      }

      affectedUsers.push({
        id: u.id,
        email: u.email,
        oldBalance,
        newBalance,
        adjustedTokens: -adj.netAmount
      });
    }
  }

  // 4. Delete transactions from PostgreSQL token_transactions
  await query(`DELETE FROM token_transactions WHERE id = ANY($1)`, [ids]);

  return {
    success: true,
    deletedCount: rawTxs.length,
    affectedUsers
  };
}
