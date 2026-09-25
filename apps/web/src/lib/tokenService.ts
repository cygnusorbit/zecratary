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

export const DEFAULT_PACKAGES: TokenPackage[] = [
  { id: 'pkg_starter', name: 'Starter Pantry', tokens: 100, price: 4.99, badge: 'Starter' },
  { id: 'pkg_pro', name: 'Culinary Master', tokens: 500, price: 19.99, badge: 'Popular', isPopular: true },
  { id: 'pkg_buffet', name: 'Executive Chef', tokens: 1500, price: 49.99, badge: 'Best Value' }
];

const DEFAULT_SETTINGS: TokenSettings = {
  id: 'primary_token_settings',
  tokenName: 'Foodie Token',
  tokenSymbol: '🪙',
  chefCost: 1,
  importUrlCost: 2,
  importTextCost: 1,
  importPhotoCost: 3,
  packages: DEFAULT_PACKAGES,
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
      ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS last_token_grant_cycle VARCHAR(50);
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        amount NUMERIC(12, 2) NOT NULL,
        balance_after NUMERIC(12, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        gateway VARCHAR(50) DEFAULT 'store_wallet',
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
    console.warn('initTokenTables warning:', err);
  }
}

export async function getTokenSettings(): Promise<TokenSettings> {
  await initTokenTables();
  try {
    const rows = await query('SELECT * FROM token_settings ORDER BY updated_at DESC LIMIT 1');
    if (rows && rows.length > 0) {
      const r = rows[0];
      let pkgs: TokenPackage[] = [];
      if (Array.isArray(r.packages)) {
        pkgs = r.packages;
      } else if (typeof r.packages === 'string') {
        try { pkgs = JSON.parse(r.packages); } catch (_) {}
      }

      if (!pkgs || pkgs.length === 0) {
        pkgs = DEFAULT_PACKAGES;
      }

      return {
        id: r.id || 'primary_token_settings',
        tokenName: r.token_name || DEFAULT_SETTINGS.tokenName,
        tokenSymbol: r.token_symbol || DEFAULT_SETTINGS.tokenSymbol,
        chefCost: Number(r.chef_cost ?? DEFAULT_SETTINGS.chefCost),
        importUrlCost: Number(r.import_url_cost ?? DEFAULT_SETTINGS.importUrlCost),
        importTextCost: Number(r.import_text_cost ?? DEFAULT_SETTINGS.importTextCost),
        importPhotoCost: Number(r.import_photo_cost ?? DEFAULT_SETTINGS.importPhotoCost),
        packages: pkgs,
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

export async function purchaseTokenPackage({
  packageId,
  userId,
  userEmail,
  paymentMethod = 'wallet'
}: {
  packageId: string;
  userId?: string | null;
  userEmail?: string | null;
  paymentMethod?: 'wallet' | 'direct';
}): Promise<{
  success: boolean;
  message?: string;
  newBalance?: number;
  walletBalance?: number;
  package?: TokenPackage;
  error?: string;
  shortAmount?: number;
}> {
  await initTokenTables();
  const settings = await getTokenSettings();
  const pkg = settings.packages.find(p => String(p.id) === String(packageId));

  if (!pkg) {
    return { success: false, error: 'Token package not found in current system settings.' };
  }

  let userRow: any = null;
  if (userId) {
    const rows = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (rows.length > 0) userRow = rows[0];
  }
  if (!userRow && userEmail) {
    const rows = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    if (rows.length > 0) userRow = rows[0];
  }

  if (!userRow) {
    return { success: false, error: 'User account not found. Please log in.' };
  }

  const currentWallet = userRow.wallet_balance !== null ? Number(userRow.wallet_balance) : null;
  const pkgPrice = Number(pkg.price);
  const pkgTokens = Number(pkg.tokens);

  let newWalletBal = currentWallet;
  let newTokBal = Number(userRow.token_balance ?? 0) + pkgTokens;

  // Wallet payment check
  if (currentWallet !== null && paymentMethod === 'wallet' && currentWallet >= pkgPrice) {
    newWalletBal = currentWallet - pkgPrice;
    await query(`
      UPDATE users 
      SET 
        wallet_balance = $1,
        token_balance = COALESCE(token_balance, 0) + $2,
        updated_at = NOW()
      WHERE id = $3
    `, [newWalletBal, pkgTokens, userRow.id]);

    const wTxId = 'wtx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    try {
      await query(`
        INSERT INTO wallet_transactions 
        (id, user_id, user_email, amount, balance_after, type, gateway, description, created_at)
        VALUES ($1, $2, $3, $4, $5, 'token_purchase', 'store_wallet', $6, NOW())
      `, [wTxId, userRow.id, userRow.email, -pkgPrice, newWalletBal, `Purchased Token Package: ${pkg.name} (+${pkgTokens.toLocaleString()} ${settings.tokenSymbol})`]);
    } catch (_) {}
  } else {
    // Direct / instant credit
    const updateRes = await query(`
      UPDATE users 
      SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING token_balance, wallet_balance
    `, [pkgTokens, userRow.id]);

    newTokBal = Number(updateRes[0]?.token_balance ?? newTokBal);
    if (updateRes[0]?.wallet_balance !== null && updateRes[0]?.wallet_balance !== undefined) {
      newWalletBal = Number(updateRes[0].wallet_balance);
    }
  }

  const txId = 'tx_pkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const desc = `Purchased ${pkg.name} (+${pkgTokens.toLocaleString()} ${settings.tokenSymbol}) - $${pkgPrice.toFixed(2)}`;

  try {
    await query(`
      INSERT INTO token_transactions 
      (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'package_purchase', $6, NOW())
    `, [txId, userRow.id, userRow.email, pkgTokens, newTokBal, desc]);
  } catch (err) {
    console.error('Failed to log token transaction:', err);
  }

  return {
    success: true,
    message: `+${pkgTokens.toLocaleString()} ${settings.tokenSymbol} credited to your account!`,
    newBalance: newTokBal,
    walletBalance: newWalletBal !== null ? newWalletBal : undefined,
    package: pkg
  };
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

/**
 * Grants monthly or plan-associated token rewards to a user upon subscription or cycle renewal.
 * Stored and updated in PostgreSQL users table (token_balance).
 */
export async function grantMonthlyPlanTokenReward(
  userIdOrEmail: string | { id?: string; email?: string; userId?: string; userEmail?: string },
  tokenAmountOrPlan?: number | string | { tokenLimit?: number; tokens?: number; planSlug?: string; planName?: string },
  planDetails?: any
): Promise<{ success: boolean; tokensGranted: number; newBalance: number; error?: string }> {
  let userIdentifier = '';
  let emailIdentifier = '';

  if (typeof userIdOrEmail === 'string') {
    if (userIdOrEmail.includes('@')) {
      emailIdentifier = userIdOrEmail.trim().toLowerCase();
    } else {
      userIdentifier = userIdOrEmail.trim();
    }
  } else if (userIdOrEmail && typeof userIdOrEmail === 'object') {
    userIdentifier = (userIdOrEmail.id || userIdOrEmail.userId || '').trim();
    emailIdentifier = (userIdOrEmail.email || userIdOrEmail.userEmail || '').trim().toLowerCase();
  }

  let tokensToGrant = 0;
  if (typeof tokenAmountOrPlan === 'number') {
    tokensToGrant = tokenAmountOrPlan;
  } else if (typeof tokenAmountOrPlan === 'string') {
    const parsed = parseInt(tokenAmountOrPlan, 10);
    if (!isNaN(parsed)) tokensToGrant = parsed;
  } else if (tokenAmountOrPlan && typeof tokenAmountOrPlan === 'object') {
    tokensToGrant = Number(tokenAmountOrPlan.tokenLimit ?? tokenAmountOrPlan.tokens ?? 0);
  }

  if (tokensToGrant <= 0 && planDetails) {
    if (typeof planDetails === 'number') {
      tokensToGrant = planDetails;
    } else if (typeof planDetails === 'object') {
      tokensToGrant = Number(planDetails.tokenLimit ?? planDetails.tokens ?? 0);
    }
  }

  if (tokensToGrant <= 0) {
    tokensToGrant = 50000;
  }

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance NUMERIC DEFAULT 0;
      `).catch(() => {});

      let res;
      if (userIdentifier && emailIdentifier) {
        res = await client.query(
          `UPDATE users 
           SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
           WHERE id = $2 OR LOWER(email) = LOWER($3)
           RETURNING id, email, token_balance`,
          [tokensToGrant, userIdentifier, emailIdentifier]
        );
      } else if (userIdentifier) {
        res = await client.query(
          `UPDATE users 
           SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
           WHERE id = $2
           RETURNING id, email, token_balance`,
          [tokensToGrant, userIdentifier]
        );
      } else if (emailIdentifier) {
        res = await client.query(
          `UPDATE users 
           SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
           WHERE LOWER(email) = LOWER($2)
           RETURNING id, email, token_balance`,
          [tokensToGrant, emailIdentifier]
        );
      }

      const updatedUser = res?.rows?.[0];
      const newBalance = updatedUser ? Number(updatedUser.token_balance) : tokensToGrant;

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS token_transactions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            user_email VARCHAR(255),
            type VARCHAR(32) NOT NULL,
            amount NUMERIC NOT NULL,
            balance_after NUMERIC NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
        const txId = 'ttx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
        await client.query(
          `INSERT INTO token_transactions (id, user_id, user_email, type, amount, balance_after, description, created_at)
           VALUES ($1, $2, $3, 'plan_grant', $4, $5, $6, NOW())`,
          [
            txId, 
            updatedUser?.id || userIdentifier || 'user', 
            updatedUser?.email || emailIdentifier || '', 
            tokensToGrant, 
            newBalance, 
            `Monthly Plan Token Reward: +${tokensToGrant.toLocaleString()} tokens`
          ]
        );
      } catch (_) {}

      return {
        success: true,
        tokensGranted: tokensToGrant,
        newBalance
      };
    } finally {
      client.release();
      await pool.end().catch(() => {});
    }
  } catch (dbErr: any) {
    console.warn('[grantMonthlyPlanTokenReward warning]:', dbErr.message);
    return {
      success: true,
      tokensGranted: tokensToGrant,
      newBalance: tokensToGrant,
      error: dbErr.message
    };
  }
}

