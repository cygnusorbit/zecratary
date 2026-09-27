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
      error: `Insufficient tokens. Required: ${cost}, Balance: ${currentBalance}`,
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
    return { success: false, error: 'Token deduction failed.', currentBalance, required: cost };
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
  options?: { force?: boolean; customTokens?: number; orderId?: string }
): Promise<{
  success: boolean;
  tokensGranted: number;
  newBalance: number;
  reason?: string;
  cycle?: string;
}> {
  await initTokenTables();
  const cleanIdent = String(userEmailOrId || '').trim();
  if (!cleanIdent) return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User identifier required' };

  try {
    const userRows = await query(`
      SELECT id, email, token_balance, subscription_plan, plan_slug, plan_name, last_token_grant_cycle 
      FROM users 
      WHERE LOWER(email) = LOWER($1) OR id = $1 
      LIMIT 1
    `, [cleanIdent]);

    if (!userRows || userRows.length === 0) {
      return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User not found' };
    }

    const user = userRows[0];
    const now = new Date();
    const currentCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (user.last_token_grant_cycle === currentCycle && !options?.force) {
      return {
        success: false,
        tokensGranted: 0,
        newBalance: Number(user.token_balance || 0),
        reason: 'Monthly tokens already credited for this cycle'
      };
    }

    const tokensToGrant = options?.customTokens && options.customTokens > 0 ? options.customTokens : 500;
    const updateRes = await query(`
      UPDATE users 
      SET token_balance = COALESCE(token_balance, 0) + $1,
          last_token_grant_cycle = $2,
          last_token_grant_date = NOW(),
          updated_at = NOW()
      WHERE id = $3
      RETURNING token_balance
    `, [tokensToGrant, currentCycle, user.id]);

    const newBalance = Number(updateRes[0]?.token_balance || 0);
    const txId = 'tx_grant_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    await query(`
      INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'plan_monthly_grant', $6, NOW())
    `, [txId, user.id, user.email, tokensToGrant, newBalance, `Monthly plan grant (+${tokensToGrant})`]);

    return {
      success: true,
      tokensGranted: tokensToGrant,
      newBalance,
      cycle: currentCycle
    };
  } catch (err: any) {
    return { success: false, tokensGranted: 0, newBalance: 0, reason: err.message };
  }
}

export async function syncUserMonthlyTokens(userId?: string | null, email?: string | null) {
  const ident = email || userId;
  if (!ident) return { success: false, reason: 'No identifier' };
  return grantMonthlyPlanTokenReward(ident);
}

export async function grantPlanTokensOnPurchase(
  userEmailOrId: string,
  planSlug: string,
  options?: { customTokens?: number; orderId?: string }
) {
  return grantMonthlyPlanTokenReward(userEmailOrId, options);
}

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

  const txRows = await query(`
    SELECT id, user_id, user_email, amount, type, description 
    FROM token_transactions 
    WHERE id = ANY($1)
  `, [ids]);
  const rawTxs = Array.isArray(txRows) ? txRows : (txRows?.rows || []);

  if (rawTxs.length === 0) {
    return { success: false, deletedCount: 0, affectedUsers: [], error: 'No matching transaction records found' };
  }

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

  const affectedUsers: AffectedUserBalance[] = [];

  for (const [, adj] of userAdjustments.entries()) {
    const uRes = await query(`
      SELECT id, email, token_balance 
      FROM users 
      WHERE (id = $1 AND $1 != '') OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($2)) AND $2 != '')
      LIMIT 1
    `, [adj.userId, adj.userEmail]);
    const uList = Array.isArray(uRes) ? uRes : (uRes?.rows || []);

    if (uList.length > 0) {
      const u = uList[0];
      const oldBalance = Number(u.token_balance ?? 0);
      const newBalance = Math.max(0, oldBalance - adj.netAmount);

      await query(`
        UPDATE users 
        SET token_balance = $1, updated_at = NOW() 
        WHERE id = $2
      `, [newBalance, u.id]);

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

  await query(`DELETE FROM token_transactions WHERE id = ANY($1)`, [ids]);

  return {
    success: true,
    deletedCount: rawTxs.length,
    affectedUsers
  };
}
