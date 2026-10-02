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

export interface PurchasePackageParams {
  packageId: string;
  userId?: string | null;
  userEmail?: string | null;
  paymentMethod?: string;
}

export interface PurchasePackageResult {
  success: boolean;
  error?: string;
  package?: TokenPackage;
  tokensGranted?: number;
  newBalance?: number;
  newWalletBalance?: number | null;
  message?: string;
}

export interface DeleteTransactionsResult {
  success: boolean;
  error?: string;
  deletedCount: number;
  affectedUsers: Array<{
    id: string;
    email?: string;
    newBalance: number;
  }>;
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
  planAllocations: {
    'free': 50,
    'taster': 50,
    'pro': 500,
    'foodie-pro': 500,
    'master': 1500,
    'culinary-master': 1500
  },
  isEnabled: true
};

export async function initTokenTables(): Promise<void> {
  // 1. Ensure token_settings table exists
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
  } catch (err) {
    console.warn('init token_settings warning:', err);
  }

  // 2. Ensure columns on token_settings exist
  try {
    await query(`
      ALTER TABLE token_settings 
      ADD COLUMN IF NOT EXISTS plan_allocations JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
    `);
  } catch (_) {}

  // 3. Ensure token_transactions ledger exists
  try {
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
      CREATE INDEX IF NOT EXISTS idx_token_transactions_email ON token_transactions(user_email);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON token_transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
    `);
  } catch (err) {
    console.warn('init token_transactions warning:', err);
  }

  // 4. Ensure users table columns exist
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_token_grant_cycle VARCHAR(50);
    `);
  } catch (_) {}

  // 5. Ensure subscription_plans exists
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        token_limit INTEGER DEFAULT 500,
        monthly_tokens INTEGER DEFAULT 500,
        is_free BOOLEAN DEFAULT false,
        monthly_price_dollars NUMERIC DEFAULT 0,
        annual_price_dollars NUMERIC DEFAULT 0,
        monthly_badge VARCHAR(50),
        annual_badge VARCHAR(50),
        features JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('init subscription_plans warning:', err);
  }

  // 6. Ensure both monthly_tokens and token_limit columns exist in subscription_plans
  try {
    await query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS monthly_tokens INTEGER DEFAULT 500;
    `);
  } catch (_) {}

  try {
    await query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS token_limit INTEGER DEFAULT 500;
    `);
  } catch (_) {}

  // 7. Backfill & synchronize token_limit and monthly_tokens
  try {
    await query(`
      UPDATE subscription_plans 
      SET monthly_tokens = COALESCE(token_limit, monthly_tokens, 500) 
      WHERE monthly_tokens IS NULL;
    `);
    await query(`
      UPDATE subscription_plans 
      SET token_limit = COALESCE(monthly_tokens, token_limit, 500) 
      WHERE token_limit IS NULL;
    `);
  } catch (_) {}

  // 8. Auto-seed foundational plans if subscription_plans table is empty
  try {
    const existing = await query('SELECT id FROM subscription_plans LIMIT 1');
    if (!existing || existing.length === 0) {
      await query(`
        INSERT INTO subscription_plans (id, slug, name, token_limit, monthly_tokens, is_free, monthly_price_dollars, annual_price_dollars, features, is_active, created_at, updated_at)
        VALUES 
          ('plan_free', 'free', 'Free Starter', 50, 50, true, 0, 0, '["AI Chat (Limited)", "Standard Recipe Generation"]'::jsonb, true, NOW(), NOW()),
          ('plan_pro', 'pro', 'Foodie Pro', 500, 500, false, 9.99, 99.99, '["500 Tokens/mo", "Unlimited Recipes", "Vision Import OCR"]'::jsonb, true, NOW(), NOW()),
          ('plan_master', 'master', 'Culinary Master', 1500, 1500, false, 29.99, 299.99, '["1500 Tokens/mo", "Priority AI Queue", "Executive Support"]'::jsonb, true, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING;
      `);
    }
  } catch (_) {}
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
          : DEFAULT_SETTINGS.planAllocations,
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

  // Synchronize planAllocations directly to subscription_plans in PostgreSQL
  if (merged.planAllocations && typeof merged.planAllocations === 'object') {
    for (const [slug, amount] of Object.entries(merged.planAllocations)) {
      const num = Math.max(0, Number(amount));
      try {
        await query(`
          UPDATE subscription_plans 
          SET token_limit = $1, monthly_tokens = $1, updated_at = NOW() 
          WHERE LOWER(slug) = LOWER($2) OR LOWER(id) = LOWER($2)
        `, [num, slug]);
      } catch (_) {
        try {
          await query(`
            UPDATE subscription_plans 
            SET token_limit = $1, updated_at = NOW() 
            WHERE LOWER(slug) = LOWER($2) OR LOWER(id) = LOWER($2)
          `, [num, slug]);
        } catch (_) {}
      }
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

export async function addTokensToUser({
  userId,
  userEmail,
  amount,
  type,
  description
}: {
  userId?: string | null;
  userEmail?: string | null;
  amount: number;
  type: string;
  description: string;
}): Promise<number | null> {
  await initTokenTables();
  let userRow: any = null;
  if (userId) {
    const rows = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (rows.length > 0) userRow = rows[0];
  }
  if (!userRow && userEmail) {
    const rows = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    if (rows.length > 0) userRow = rows[0];
  }

  if (!userRow) return null;

  const updateRes = await query(`
    UPDATE users 
    SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING token_balance
  `, [amount, userRow.id]);

  const newBalance = Number(updateRes[0].token_balance);
  const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [txId, userRow.id, userRow.email, amount, newBalance, type, description]);

  return newBalance;
}

export async function purchaseTokenPackage({
  packageId,
  userId,
  userEmail,
  paymentMethod = 'wallet'
}: PurchasePackageParams): Promise<PurchasePackageResult> {
  await initTokenTables();
  const settings = await getTokenSettings();

  const pkg = settings.packages?.find((p: TokenPackage) => p.id === packageId) ||
    DEFAULT_SETTINGS.packages.find((p: TokenPackage) => p.id === packageId);

  if (!pkg) {
    return { success: false, error: `Token package '${packageId}' was not found.` };
  }

  let userRow: any = null;
  if (userId) {
    const rows = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (rows && rows.length > 0) userRow = rows[0];
  }
  if (!userRow && userEmail) {
    const rows = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    if (rows && rows.length > 0) userRow = rows[0];
  }

  if (!userRow) {
    return { success: false, error: 'User account not found.' };
  }

  const price = Number(pkg.price || 0);
  let updatedWalletBalance: number | null = userRow.wallet_balance !== null && userRow.wallet_balance !== undefined 
    ? Number(userRow.wallet_balance) 
    : null;

  if (paymentMethod === 'wallet' && price > 0) {
    const currentWallet = Number(userRow.wallet_balance ?? 0);
    if (currentWallet < price) {
      return {
        success: false,
        error: `Insufficient wallet balance ($${currentWallet.toFixed(2)} available, $${price.toFixed(2)} required)`
      };
    }

    try {
      const walletRes = await query(`
        UPDATE users 
        SET wallet_balance = wallet_balance - $1, updated_at = NOW() 
        WHERE id = $2 AND wallet_balance >= $1 
        RETURNING wallet_balance
      `, [price, userRow.id]);

      if (!walletRes || walletRes.length === 0) {
        return { success: false, error: 'Could not deduct funds from wallet.' };
      }
      updatedWalletBalance = Number(walletRes[0].wallet_balance);

      try {
        const wTxId = 'wtx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        await query(`
          INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
          VALUES ($1, $2, $3, $4, $5, 'token_package_purchase', $6, NOW())
        `, [wTxId, userRow.id, userRow.email, -price, updatedWalletBalance, `Purchased token package: ${pkg.name} (${pkg.tokens} tokens)`]);
      } catch (_) {}
    } catch (wErr: any) {
      return { success: false, error: wErr.message || 'Wallet transaction failed' };
    }
  }

  const tokensToGrant = Number(pkg.tokens || 0);
  const tokenUpdateRes = await query(`
    UPDATE users 
    SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING token_balance
  `, [tokensToGrant, userRow.id]);

  const newTokenBalance = Number(tokenUpdateRes[0]?.token_balance ?? ((userRow.token_balance || 0) + tokensToGrant));
  const txId = 'tx_pkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const description = `Purchased Package: ${pkg.name} (+${tokensToGrant.toLocaleString()} ${settings.tokenSymbol})`;

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, 'package_purchase', $6, NOW())
  `, [txId, userRow.id, userRow.email, tokensToGrant, newTokenBalance, description]);

  return {
    success: true,
    message: `Successfully purchased ${pkg.name}! Added ${tokensToGrant} tokens.`,
    package: pkg,
    tokensGranted: tokensToGrant,
    newBalance: newTokenBalance,
    newWalletBalance: updatedWalletBalance
  };
}

export async function grantPlanTokensOnPurchase(
  userEmailOrId: string,
  planSlug: string,
  options?: { customTokens?: number; orderId?: string; isAnnual?: boolean; planName?: string }
): Promise<{ success: boolean; tokensGranted: number; newBalance: number; error?: string }> {
  try {
    await initTokenTables();
    const cleanIdent = String(userEmailOrId || '').trim();
    if (!cleanIdent) return { success: false, tokensGranted: 0, newBalance: 0, error: 'User identifier required' };

    const userRows = await query(`
      SELECT id, email, token_balance, subscription_plan 
      FROM users 
      WHERE LOWER(email) = LOWER($1) OR id = $1 
      LIMIT 1
    `, [cleanIdent]);

    if (!userRows || userRows.length === 0) {
      return { success: false, tokensGranted: 0, newBalance: 0, error: 'User not found in database' };
    }

    const user = userRows[0];
    const cleanPlanSlug = String(planSlug || user.subscription_plan || 'free').toLowerCase().trim();
    const baseSlug = cleanPlanSlug.replace(/-(monthly|annual|free)$/i, '');

    let tokensToGrant = options?.customTokens ?? 0;
    let resolvedPlanName = options?.planName || '';

    if (!tokensToGrant || tokensToGrant <= 0) {
      try {
        const planRows = await query(`
          SELECT * 
          FROM subscription_plans 
          WHERE LOWER(slug) = LOWER($1) OR LOWER(id) = LOWER($1) OR LOWER(slug) = LOWER($2)
          LIMIT 1
        `, [cleanPlanSlug, baseSlug]);

        if (planRows && planRows.length > 0) {
          const p = planRows[0];
          tokensToGrant = Number(p.token_limit ?? p.monthly_tokens ?? 500);
          if (!resolvedPlanName) resolvedPlanName = p.name || cleanPlanSlug;
        }
      } catch (_) {}

      if (!tokensToGrant || tokensToGrant <= 0) {
        const settings = await getTokenSettings();
        const alloc = settings.planAllocations || {};
        tokensToGrant = Number(alloc[cleanPlanSlug] ?? alloc[baseSlug] ?? (cleanPlanSlug.includes('pro') ? 500 : 50));
      }
    }

    if (!resolvedPlanName) {
      resolvedPlanName = cleanPlanSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    }

    if (tokensToGrant <= 0) {
      tokensToGrant = cleanPlanSlug.includes('free') || cleanPlanSlug === 'taster' ? 50 : 500;
    }

    const settings = await getTokenSettings();
    const symbol = settings.tokenSymbol || '🪙';

    const updateResult = await query(`
      UPDATE users
      SET 
        token_balance = COALESCE(token_balance, 0) + $1,
        subscription_plan = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING token_balance
    `, [tokensToGrant, cleanPlanSlug, user.id]);

    const newBalance = Number(updateResult[0]?.token_balance ?? ((user.token_balance || 0) + tokensToGrant));
    const txId = 'tx_plan_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const description = `Plan Purchase: ${resolvedPlanName} (+${tokensToGrant.toLocaleString()} ${symbol})${options?.orderId ? ` [Order: ${options.orderId}]` : ''}`;

    await query(`
      INSERT INTO token_transactions 
      (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'plan_purchase', $6, NOW())
    `, [txId, user.id, user.email, tokensToGrant, newBalance, description]);

    return {
      success: true,
      tokensGranted: tokensToGrant,
      newBalance
    };
  } catch (err: any) {
    console.error('grantPlanTokensOnPurchase error:', err);
    return { success: false, tokensGranted: 0, newBalance: 0, error: err.message };
  }
}

export async function deleteTokenTransactionsAndSyncBalance(ids: string[]): Promise<DeleteTransactionsResult> {
  await initTokenTables();
  const validIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (validIds.length === 0) {
    return { success: true, deletedCount: 0, affectedUsers: [] };
  }

  try {
    const placeholders = validIds.map((_, i) => `$${i + 1}`).join(',');
    const txRows = await query(`
      SELECT id, user_id, user_email, amount 
      FROM token_transactions 
      WHERE id IN (${placeholders})
    `, validIds);

    if (!txRows || txRows.length === 0) {
      return { success: true, deletedCount: 0, affectedUsers: [] };
    }

    // Group net reversals by user:
    // If a transaction amount was -2 (deduction), deleting it adds +2 back.
    // If a transaction amount was +500 (grant/purchase), deleting it removes 500.
    const userAdjustments: Record<string, { userId: string; userEmail: string; netChange: number }> = {};
    for (const tx of txRows) {
      const uKey = tx.user_id || tx.user_email;
      if (!uKey) continue;
      if (!userAdjustments[uKey]) {
        userAdjustments[uKey] = {
          userId: tx.user_id,
          userEmail: tx.user_email || '',
          netChange: 0
        };
      }
      userAdjustments[uKey].netChange -= Number(tx.amount || 0);
    }

    const affectedUsers: Array<{ id: string; email?: string; newBalance: number }> = [];

    for (const item of Object.values(userAdjustments)) {
      if (item.netChange === 0) continue;

      let uRow: any = null;
      if (item.userId) {
        const rows = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [item.userId]);
        if (rows && rows.length > 0) uRow = rows[0];
      }
      if (!uRow && item.userEmail) {
        const rows = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [item.userEmail.trim()]);
        if (rows && rows.length > 0) uRow = rows[0];
      }

      if (uRow) {
        const currentBal = Number(uRow.token_balance ?? 0);
        const updatedBal = Math.max(0, currentBal + item.netChange);

        const updateRes = await query(`
          UPDATE users 
          SET token_balance = $1, updated_at = NOW() 
          WHERE id = $2 
          RETURNING token_balance
        `, [updatedBal, uRow.id]);

        const actualNewBal = updateRes && updateRes.length > 0 ? Number(updateRes[0].token_balance) : updatedBal;
        affectedUsers.push({
          id: uRow.id,
          email: uRow.email,
          newBalance: actualNewBal
        });
      }
    }

    // Delete the transactions from PostgreSQL
    await query(`
      DELETE FROM token_transactions 
      WHERE id IN (${placeholders})
    `, validIds);

    return {
      success: true,
      deletedCount: txRows.length,
      affectedUsers
    };
  } catch (err: any) {
    console.error('deleteTokenTransactionsAndSyncBalance error:', err);
    return {
      success: false,
      error: err.message || 'Failed deleting transactions',
      deletedCount: 0,
      affectedUsers: []
    };
  }
}
