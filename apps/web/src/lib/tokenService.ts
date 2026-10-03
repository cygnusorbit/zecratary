import { query } from '@/lib/db';
import { Pool } from 'pg';

let poolInstance: Pool | null = null;
export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return poolInstance;
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
}

export interface TokenSettings {
  id?: string;
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
  [key: string]: any;
}

export interface DeductUserTokensParams {
  userId?: string | null;
  userEmail?: string | null;
  email?: string | null;
  cost?: number;
  amount?: number;
  feature?: string;
  type?: string;
  description?: string;
  [key: string]: any;
}

export interface DeductionResult {
  success: boolean;
  error?: string;
  deducted?: number;
  currentBalance?: number;
  newBalance?: number;
  balance?: number;
  required?: number;
  tokenSymbol?: string;
  [key: string]: any;
}

export interface PurchasePackageParams {
  userId?: string | null;
  userEmail?: string | null;
  email?: string | null;
  packageId?: string;
  package_id?: string;
  tokens?: number;
  price?: number;
  amount?: number;
  amountPaid?: number;
  currency?: string;
  gateway?: string;
  paymentMethod?: string;
  payment_method?: string;
  packageName?: string;
  package_name?: string;
  orderId?: string;
  description?: string;
  [key: string]: any;
}

export interface PurchasePackageResult {
  success: boolean;
  tokensAdded?: number;
  tokensToAdd?: number;
  tokensGranted?: number;
  newBalance?: number;
  balance?: number;
  wallet_balance?: number;
  newWalletBalance?: number | null;
  paymentMethod?: string;
  transactionId?: string;
  message?: string;
  error?: string;
  package?: TokenPackage;
  user?: any;
  requiresWalletTopUp?: boolean;
  packagePrice?: number;
  shortfall?: number;
  [key: string]: any;
}

export interface AffectedUserBalance {
  id: string;
  email: string;
  oldBalance: number;
  newBalance: number;
  adjustedTokens: number;
}

export interface DeleteTransactionsResult {
  success: boolean;
  error?: string;
  deletedCount: number;
  affectedUsers: AffectedUserBalance[];
  [key: string]: any;
}

export const DEFAULT_SETTINGS: TokenSettings = {
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

export const DEFAULT_TOKEN_SETTINGS = DEFAULT_SETTINGS;

function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

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
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE token_settings 
      ADD COLUMN IF NOT EXISTS plan_allocations JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

      CREATE TABLE IF NOT EXISTS admin_settings (
        key VARCHAR(128) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS token_transactions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        amount NUMERIC NOT NULL DEFAULT 0,
        balance_after NUMERIC NOT NULL DEFAULT 0,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id, user_email);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON token_transactions(created_at DESC);

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        type VARCHAR(50) DEFAULT 'token_purchase',
        amount NUMERIC NOT NULL DEFAULT 0,
        balance_after NUMERIC NOT NULL DEFAULT 0,
        gateway VARCHAR(50) DEFAULT 'wallet',
        status VARCHAR(50) DEFAULT 'succeeded',
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id, user_email);
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);

      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_token_grant_cycle VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_token_grant_date TIMESTAMPTZ;
    `);

    // Self-healing: synchronize wallet balance across duplicate records with matching email
    await query(`
      UPDATE users u1
      SET wallet_balance = u2.wallet_balance
      FROM users u2
      WHERE LOWER(TRIM(u1.email)) = LOWER(TRIM(u2.email))
        AND u1.id != u2.id
        AND COALESCE(u1.wallet_balance, 0) = 0
        AND COALESCE(u2.wallet_balance, 0) > 0;
    `).catch(() => {});
  } catch (err) {
    console.warn('initTokenTables warning:', err);
  }
}

export async function getTokenSettings(): Promise<TokenSettings> {
  await initTokenTables();
  try {
    const rows = await query('SELECT * FROM token_settings ORDER BY updated_at DESC LIMIT 1');
    const list = parseDbRows(rows);
    if (list.length > 0) {
      const r = list[0];
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
          : (DEFAULT_SETTINGS.planAllocations || {}),
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
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanId = (userId || '').trim();
    const rows = await query(`
      SELECT token_balance FROM users 
      WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
         OR (id::text = $2 AND $2 != '')
      ORDER BY CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END
      LIMIT 1
    `, [cleanEmail || 'none', cleanId || 'none']);

    const list = parseDbRows(rows);
    if (list.length > 0 && list[0].token_balance !== null && list[0].token_balance !== undefined) {
      return Number(list[0].token_balance);
    }
  } catch (_) {}
  return 0;
}

// Polymorphic deductUserTokens implementation
export async function deductUserTokens(params: DeductUserTokensParams): Promise<DeductionResult>;
export async function deductUserTokens(
  userId: string | null | undefined,
  userEmail: string | null | undefined,
  amount: number,
  type: string,
  description: string
): Promise<DeductionResult>;
export async function deductUserTokens(
  arg1: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any
): Promise<DeductionResult> {
  await initTokenTables();
  const settings = await getTokenSettings();

  let targetUserId = '';
  let targetEmail = '';
  let cost = 0;
  let feature = 'operation';
  let description = 'Token deduction';

  if (typeof arg1 === 'object' && arg1 !== null) {
    targetUserId = String(arg1.userId || arg1.id || '').trim();
    targetEmail = String(arg1.userEmail || arg1.email || '').toLowerCase().trim();
    cost = Number(arg1.cost ?? arg1.amount ?? 0);
    feature = arg1.feature || arg1.type || 'operation';
    description = arg1.description || 'Token deduction';
  } else {
    targetUserId = String(arg1 || '').trim();
    targetEmail = String(arg2 || '').toLowerCase().trim();
    cost = Number(arg3 || 0);
    feature = arg4 || 'operation';
    description = arg5 || 'Token deduction';
  }

  if (!settings.isEnabled || cost <= 0) {
    const current = await getUserTokenBalance(targetUserId, targetEmail);
    return {
      success: true,
      deducted: 0,
      currentBalance: current,
      newBalance: current,
      balance: current,
      tokenSymbol: settings.tokenSymbol || '🪙'
    };
  }

  const rows = await query(`
    SELECT id, email, token_balance FROM users 
    WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
       OR (id::text = $2 AND $2 != '')
    ORDER BY CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END
    LIMIT 1
  `, [targetEmail || 'none', targetUserId || 'none']);

  const list = parseDbRows(rows);
  if (list.length === 0) {
    return { success: false, error: 'User account not found' };
  }

  const userRow = list[0];
  const currentBalance = Number(userRow.token_balance ?? 0);
  if (currentBalance < cost) {
    return {
      success: false,
      error: `Insufficient ${settings.tokenName || 'tokens'}. Required: ${cost} ${settings.tokenSymbol || '🪙'}, Balance: ${currentBalance} ${settings.tokenSymbol || '🪙'}`,
      currentBalance,
      newBalance: currentBalance,
      balance: currentBalance,
      required: cost,
      tokenSymbol: settings.tokenSymbol || '🪙'
    };
  }

  const updateRes = await query(`
    UPDATE users 
    SET token_balance = token_balance - $1, updated_at = NOW() 
    WHERE id = $2 AND token_balance >= $1 
    RETURNING token_balance
  `, [cost, userRow.id]);

  const updatedRows = parseDbRows(updateRes);
  const newBalance = Number(updatedRows[0]?.token_balance ?? (currentBalance - cost));
  const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const txType = feature.startsWith('usage_') ? feature : `usage_${feature}`;

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [txId, userRow.id, userRow.email, -cost, newBalance, txType, description]);

  return {
    success: true,
    deducted: cost,
    currentBalance: newBalance,
    newBalance,
    balance: newBalance,
    tokenSymbol: settings.tokenSymbol || '🪙'
  };
}

export async function addTokensToUser(
  arg1: any,
  userEmail?: string | null,
  amount?: number,
  type?: string,
  description?: string
): Promise<number | null> {
  await initTokenTables();

  let targetUserId = '';
  let targetEmail = '';
  let amt = 0;
  let txType = 'manual_credit';
  let desc = 'Tokens credited';

  if (typeof arg1 === 'object' && arg1 !== null) {
    targetUserId = String(arg1.userId || arg1.id || '').trim();
    targetEmail = String(arg1.userEmail || arg1.email || '').toLowerCase().trim();
    amt = Number(arg1.amount || 0);
    txType = arg1.type || 'manual_credit';
    desc = arg1.description || 'Tokens credited';
  } else {
    targetUserId = String(arg1 || '').trim();
    targetEmail = String(userEmail || '').toLowerCase().trim();
    amt = Number(amount || 0);
    txType = type || 'manual_credit';
    desc = description || 'Tokens credited';
  }

  const rows = await query(`
    SELECT id, email, token_balance FROM users 
    WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
       OR (id::text = $2 AND $2 != '')
    ORDER BY CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END
    LIMIT 1
  `, [targetEmail || 'none', targetUserId || 'none']);

  const list = parseDbRows(rows);
  if (list.length === 0) return null;

  const userRow = list[0];
  const updateRes = await query(`
    UPDATE users 
    SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING token_balance
  `, [amt, userRow.id]);

  const updated = parseDbRows(updateRes);
  const newBalance = Number(updated[0]?.token_balance ?? ((userRow.token_balance || 0) + amt));
  const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [txId, userRow.id, userRow.email, amt, newBalance, txType, desc]);

  return newBalance;
}

// 3. Purchase Token Package (Strict Dual-Identity & Funded Account Settlement)
export async function purchaseTokenPackage(
  userEmailOrIdOrPayload: string | PurchasePackageParams | any,
  packageIdOrTokens?: string | number | any,
  options?: any
): Promise<PurchasePackageResult> {
  await initTokenTables();

  let targetUserId = '';
  let targetEmail = '';
  let pkgId = '';
  let explicitTokens = 0;
  let orderId = '';
  let paymentMethod = 'wallet';
  let customPrice = 0;
  let desc = '';
  let customPkgName = '';

  if (typeof userEmailOrIdOrPayload === 'object' && userEmailOrIdOrPayload !== null) {
    targetUserId = String(userEmailOrIdOrPayload.userId || userEmailOrIdOrPayload.id || '').trim();
    targetEmail = String(userEmailOrIdOrPayload.userEmail || userEmailOrIdOrPayload.email || '').toLowerCase().trim();
    pkgId = String(userEmailOrIdOrPayload.packageId || userEmailOrIdOrPayload.package_id || '').trim();
    explicitTokens = Number(userEmailOrIdOrPayload.tokens || 0);
    orderId = String(userEmailOrIdOrPayload.orderId || '');
    paymentMethod = String(userEmailOrIdOrPayload.paymentMethod || userEmailOrIdOrPayload.payment_method || 'wallet');
    desc = String(userEmailOrIdOrPayload.description || '');
    customPrice = Number(userEmailOrIdOrPayload.price ?? userEmailOrIdOrPayload.amount ?? userEmailOrIdOrPayload.amountPaid ?? 0);
    customPkgName = String(userEmailOrIdOrPayload.packageName || userEmailOrIdOrPayload.package_name || '');
  } else {
    const raw = String(userEmailOrIdOrPayload || '').trim();
    if (raw.includes('@')) {
      targetEmail = raw.toLowerCase();
    } else {
      targetUserId = raw;
    }
    if (typeof packageIdOrTokens === 'number') {
      explicitTokens = packageIdOrTokens;
    } else if (typeof packageIdOrTokens === 'string') {
      pkgId = packageIdOrTokens.trim();
      const num = Number(packageIdOrTokens);
      if (!isNaN(num) && num > 0) explicitTokens = num;
    }
    if (options && typeof options === 'object') {
      orderId = String(options.orderId || '');
      paymentMethod = String(options.paymentMethod || options.payment_method || 'wallet');
      desc = String(options.description || '');
      customPrice = Number(options.price ?? options.amount ?? options.amountPaid ?? 0);
      customPkgName = String(options.packageName || options.package_name || '');
      if (options.userEmail || options.email) targetEmail = String(options.userEmail || options.email).toLowerCase().trim();
      if (options.userId || options.id) targetUserId = String(options.userId || options.id).trim();
    }
  }

  if (!targetEmail && !targetUserId) {
    targetEmail = 'admin@zecratary.com';
  }

  // Prioritize matching by authenticated email address and funded wallet balance
  const userRows = await query(`
    SELECT id, email, token_balance, wallet_balance 
    FROM users 
    WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
       OR (id::text = $2 AND $2 != '')
       OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($2)) AND $2 != '')
    ORDER BY 
      CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END,
      COALESCE(wallet_balance, 0) DESC
    LIMIT 1
  `, [targetEmail || 'none', targetUserId || 'none']);

  const uList = parseDbRows(userRows);
  if (uList.length === 0) {
    return { success: false, tokensAdded: 0, newBalance: 0, error: 'User account not found.' };
  }

  const user = uList[0];
  const settings = await getTokenSettings();

  let tokensToAdd = explicitTokens;
  let packageName = customPkgName || 'Token Package';
  let packagePrice = customPrice;

  if (pkgId && Array.isArray(settings.packages)) {
    const matched = settings.packages.find((p: any) => p.id === pkgId || p.name?.toLowerCase() === pkgId.toLowerCase());
    if (matched) {
      tokensToAdd = Number(matched.tokens || tokensToAdd);
      packageName = matched.name || packageName;
      if (packagePrice <= 0) packagePrice = Number(matched.price || 0);
    }
  }

  if (tokensToAdd <= 0) {
    if (pkgId === 'pkg_starter') { tokensToAdd = 100; packagePrice = packagePrice || 4.99; packageName = 'Starter Pantry'; }
    else if (pkgId === 'pkg_pro') { tokensToAdd = 500; packagePrice = packagePrice || 19.99; packageName = 'Culinary Master'; }
    else if (pkgId === 'pkg_buffet') { tokensToAdd = 1500; packagePrice = packagePrice || 49.99; packageName = 'Executive Chef'; }
    else { tokensToAdd = 100; packagePrice = packagePrice || 4.99; }
  }
  if (packagePrice <= 0) packagePrice = 4.99;

  let currentWalletBalance = parseFloat(user.wallet_balance || 0);
  if (paymentMethod === 'wallet' && packagePrice > 0) {
    if (currentWalletBalance < packagePrice) {
      return {
        success: false,
        tokensAdded: 0,
        tokensToAdd: 0,
        newBalance: Number(user.token_balance || 0),
        requiresWalletTopUp: true,
        packagePrice,
        shortfall: packagePrice - currentWalletBalance,
        wallet_balance: currentWalletBalance,
        newWalletBalance: currentWalletBalance,
        error: `Insufficient wallet balance ($${currentWalletBalance.toFixed(2)} available). This bundle requires $${packagePrice.toFixed(2)}. Please top up your wallet first.`
      };
    }

    const updatedWalletBalance = Math.max(0, currentWalletBalance - packagePrice);
    
    // Atomically debit wallet on user row and sync linked records with the same email
    await query(`
      UPDATE users 
      SET wallet_balance = $1, updated_at = NOW() 
      WHERE id = $2 OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($3)) AND $3 != '')
    `, [updatedWalletBalance, user.id, user.email || targetEmail]);

    const wtxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await query(`
      INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, status, description, metadata, created_at)
      VALUES ($1, $2, $3, 'token_purchase', $4, $5, 'wallet', 'succeeded', $6, $7::jsonb, NOW())
    `, [
      wtxId,
      user.id,
      user.email,
      -packagePrice,
      updatedWalletBalance,
      `Purchased ${packageName} (+${tokensToAdd.toLocaleString()} ${settings.tokenSymbol || '🪙'})`,
      JSON.stringify({ packageId: pkgId || 'bundle', tokens: tokensToAdd, price: packagePrice })
    ]);

    currentWalletBalance = updatedWalletBalance;
  }

  // Atomically increment token balance
  const updateRes = await query(`
    UPDATE users 
    SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING token_balance
  `, [tokensToAdd, user.id]);

  const updatedToken = parseDbRows(updateRes);
  const newBalance = Number(updatedToken[0]?.token_balance ?? (Number(user.token_balance || 0) + tokensToAdd));

  const txId = 'tx_pkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const txDesc = desc || `Purchased Package: ${packageName} (+${tokensToAdd.toLocaleString()} ${settings.tokenSymbol || '🪙'})${orderId ? ` [Order: ${orderId}]` : ''}`;

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, 'package_purchase', $6, NOW())
  `, [txId, user.id, user.email, tokensToAdd, newBalance, txDesc]);

  return {
    success: true,
    tokensAdded: tokensToAdd,
    tokensToAdd: tokensToAdd,
    tokensGranted: tokensToAdd,
    newBalance,
    balance: newBalance,
    wallet_balance: currentWalletBalance,
    newWalletBalance: currentWalletBalance,
    paymentMethod,
    transactionId: txId,
    message: `Successfully purchased ${packageName}! Credited +${tokensToAdd.toLocaleString()} ${settings.tokenSymbol || '🪙'} (Deducted $${packagePrice.toFixed(2)} from Store Wallet).`,
    user: {
      id: user.id,
      email: user.email,
      tokenBalance: newBalance,
      walletBalance: currentWalletBalance
    }
  };
}

export async function grantMonthlyPlanTokenReward(
  userEmailOrId?: string | { id?: string; email?: string; userId?: string; userEmail?: string } | null,
  tokensOrOptions?: number | string | { tokenLimit?: number; tokens?: number; planSlug?: string; planName?: string; customTokens?: number; force?: boolean; [key: string]: any } | any,
  options?: { planSlug?: string; planName?: string; force?: boolean; customTokens?: number; orderId?: string; [key: string]: any } | any
): Promise<{
  success: boolean;
  tokensGranted: number;
  newBalance: number;
  reason?: string;
  cycle?: string;
  plan?: string;
  isPaid?: boolean;
  error?: string;
  [key: string]: any;
}> {
  await initTokenTables();

  let targetId = '';
  let targetEmail = '';

  if (typeof userEmailOrId === 'string') {
    const raw = userEmailOrId.trim();
    if (raw.includes('@')) targetEmail = raw.toLowerCase();
    else targetId = raw;
  } else if (userEmailOrId && typeof userEmailOrId === 'object') {
    targetId = (userEmailOrId.id || userEmailOrId.userId || '').trim();
    targetEmail = (userEmailOrId.email || userEmailOrId.userEmail || '').trim().toLowerCase();
  }

  if (!targetId && !targetEmail) {
    return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User identifier required' };
  }

  let opt: any = options || {};
  let explicitAmount = 0;

  if (typeof tokensOrOptions === 'number') {
    explicitAmount = tokensOrOptions;
  } else if (typeof tokensOrOptions === 'string') {
    const p = parseInt(tokensOrOptions, 10);
    if (!isNaN(p)) explicitAmount = p;
  } else if (tokensOrOptions && typeof tokensOrOptions === 'object') {
    explicitAmount = Number(tokensOrOptions.customTokens ?? tokensOrOptions.tokenLimit ?? tokensOrOptions.tokens ?? 0);
    opt = { ...tokensOrOptions, ...opt };
  }

  const userRows = await query(`
    SELECT id, email, token_balance, subscription_plan, plan_slug, plan_name, last_token_grant_cycle 
    FROM users 
    WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
       OR (id::text = $2 AND $2 != '')
    ORDER BY CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END
    LIMIT 1
  `, [targetEmail || 'none', targetId || 'none']);

  const uList = parseDbRows(userRows);
  if (uList.length === 0) {
    return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User not found in database' };
  }

  const user = uList[0];
  const now = new Date();
  const currentCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (user.last_token_grant_cycle === currentCycle && !opt?.force) {
    return {
      success: false,
      tokensGranted: 0,
      newBalance: Number(user.token_balance || 0),
      reason: `Monthly tokens already credited for cycle ${currentCycle}`,
      cycle: currentCycle,
      isPaid: true
    };
  }

  const planSlug = String(opt?.planSlug || user.plan_slug || user.subscription_plan || 'free').toLowerCase().trim();
  const baseSlug = planSlug.replace(/-(monthly|annual|free)$/i, '');

  let tokensToGrant = explicitAmount;
  if (tokensToGrant <= 0) {
    const planRows = await query(`
      SELECT name, slug, token_limit, monthly_tokens 
      FROM subscription_plans 
      WHERE LOWER(slug) = LOWER($1) OR LOWER(id) = LOWER($1) OR LOWER(slug) = LOWER($2)
      LIMIT 1
    `, [planSlug, baseSlug]);
    const pList = parseDbRows(planRows);
    if (pList.length > 0) {
      tokensToGrant = Number(pList[0].token_limit ?? pList[0].monthly_tokens ?? 500);
    } else {
      const settings = await getTokenSettings();
      const alloc = settings.planAllocations || {};
      tokensToGrant = Number(alloc[planSlug] ?? alloc[baseSlug] ?? (planSlug.includes('pro') ? 500 : 50));
    }
  }

  if (tokensToGrant <= 0) tokensToGrant = 500;

  const updateRes = await query(`
    UPDATE users 
    SET token_balance = COALESCE(token_balance, 0) + $1,
        last_token_grant_cycle = $2,
        last_token_grant_date = NOW(),
        updated_at = NOW()
    WHERE id = $3
    RETURNING token_balance
  `, [tokensToGrant, currentCycle, user.id]);

  const updated = parseDbRows(updateRes);
  const newBalance = Number(updated[0]?.token_balance ?? (Number(user.token_balance || 0) + tokensToGrant));

  const planDesc = opt?.planName || user.plan_name || planSlug;
  const txId = 'tx_grant_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, 'plan_monthly_grant', $6, NOW())
  `, [txId, user.id, user.email, tokensToGrant, newBalance, `Monthly plan grant: ${planDesc} (+${tokensToGrant.toLocaleString()})`]);

  return {
    success: true,
    tokensGranted: tokensToGrant,
    newBalance,
    cycle: currentCycle,
    plan: planSlug,
    isPaid: true
  };
}

export async function syncUserMonthlyTokens(userId?: string | null, email?: string | null): Promise<any> {
  const ident = email || userId;
  if (!ident) return { success: false, reason: 'No identifier provided' };
  return grantMonthlyPlanTokenReward(ident);
}

export async function grantPlanTokensOnPurchase(
  userEmailOrId: string,
  planSlug: string,
  options?: { customTokens?: number; orderId?: string; isAnnual?: boolean; planName?: string; [key: string]: any }
): Promise<{ success: boolean; tokensGranted: number; newBalance: number; error?: string }> {
  const res = await grantMonthlyPlanTokenReward(userEmailOrId, {
    customTokens: options?.customTokens,
    orderId: options?.orderId,
    planSlug,
    planName: options?.planName,
    force: true
  });
  return {
    success: res.success,
    tokensGranted: res.tokensGranted,
    newBalance: res.newBalance,
    error: res.reason || res.error
  };
}

export async function grantUserTokens(
  userEmailOrId: string,
  tokens: number = 100,
  reason: string = 'Admin grant'
): Promise<any> {
  return grantMonthlyPlanTokenReward(userEmailOrId, { customTokens: tokens, force: true, reason });
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
      SELECT id, user_id, user_email, amount, type, description 
      FROM token_transactions 
      WHERE id IN (${placeholders})
    `, validIds);

    const rawTxs = parseDbRows(txRows);
    if (rawTxs.length === 0) {
      return { success: true, deletedCount: 0, affectedUsers: [] };
    }

    const userAdjustments: Record<string, { userId: string; userEmail: string; netChange: number; types: string[] }> = {};
    for (const tx of rawTxs) {
      const uKey = (tx.user_email || tx.user_id || '').toLowerCase().trim();
      if (!uKey) continue;
      if (!userAdjustments[uKey]) {
        userAdjustments[uKey] = {
          userId: tx.user_id,
          userEmail: tx.user_email || '',
          netChange: 0,
          types: []
        };
      }
      userAdjustments[uKey].netChange -= Number(tx.amount || 0);
      userAdjustments[uKey].types.push(tx.type);
    }

    const affectedUsers: AffectedUserBalance[] = [];

    for (const item of Object.values(userAdjustments)) {
      if (item.netChange === 0) continue;

      const rows = await query(`
        SELECT id, email, token_balance FROM users 
        WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
           OR (id::text = $2 AND $2 != '')
        ORDER BY CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END
        LIMIT 1
      `, [item.userEmail.toLowerCase().trim() || 'none', item.userId || 'none']);

      const list = parseDbRows(rows);
      if (list.length > 0) {
        const uRow = list[0];
        const oldBalance = Number(uRow.token_balance ?? 0);
        const updatedBal = Math.max(0, oldBalance + item.netChange);

        await query(`
          UPDATE users 
          SET token_balance = $1, updated_at = NOW() 
          WHERE id = $2
        `, [updatedBal, uRow.id]);

        if (item.types.includes('plan_monthly_grant')) {
          await query(`
            UPDATE users 
            SET last_token_grant_cycle = NULL, updated_at = NOW() 
            WHERE id = $1
          `, [uRow.id]).catch(() => {});
        }

        affectedUsers.push({
          id: uRow.id,
          email: uRow.email,
          oldBalance,
          newBalance: updatedBal,
          adjustedTokens: item.netChange
        });
      }
    }

    await query(`
      DELETE FROM token_transactions 
      WHERE id IN (${placeholders})
    `, validIds);

    return {
      success: true,
      deletedCount: rawTxs.length,
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
