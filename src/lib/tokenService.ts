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
    const rows: any = await query('SELECT * FROM token_settings ORDER BY updated_at DESC LIMIT 1');
    const list: any[] = Array.isArray(rows) ? rows : ((rows as any)?.rows || []);
    if (list && list.length > 0) {
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
    let rows: any = [];
    if (userId) {
      rows = await query('SELECT token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    } else if (userEmail) {
      rows = await query('SELECT token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    }
    const list: any[] = Array.isArray(rows) ? rows : ((rows as any)?.rows || []);
    if (list.length > 0 && list[0].token_balance !== null) {
      return Number(list[0].token_balance);
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
    const rows: any = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    const list: any[] = Array.isArray(rows) ? rows : ((rows as any)?.rows || []);
    if (list.length > 0) userRow = list[0];
  }
  if (!userRow && userEmail) {
    const rows: any = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    const list: any[] = Array.isArray(rows) ? rows : ((rows as any)?.rows || []);
    if (list.length > 0) userRow = list[0];
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

  const updateRes: any = await query(`
    UPDATE users 
    SET token_balance = token_balance - $1, updated_at = NOW() 
    WHERE id = $2 AND token_balance >= $1 
    RETURNING token_balance
  `, [cost, userRow.id]);

  const updatedList: any[] = Array.isArray(updateRes) ? updateRes : ((updateRes as any)?.rows || []);
  if (updatedList.length === 0) {
    return { success: false, error: 'Token deduction failed.', currentBalance, required: cost };
  }

  const newBalance = Number(updatedList[0].token_balance);
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
  userEmailOrId?: string | null,
  tokens?: number | { planSlug?: string; planName?: string; customTokens?: number; force?: boolean; [key: string]: any } | any,
  options?: { planSlug?: string; planName?: string; customTokens?: number; force?: boolean; [key: string]: any } | any
): Promise<{
  success: boolean;
  tokensGranted: number;
  newBalance: number;
  reason?: string;
  cycle?: string;
  plan?: string;
  [key: string]: any;
}> {
  await initTokenTables();

  let opt: any = options;
  let numTokens: number | undefined = undefined;

  if (typeof tokens === 'number') {
    numTokens = tokens;
  } else if (typeof tokens === 'object' && tokens !== null && !options) {
    opt = tokens;
  }

  const cleanIdent = String(userEmailOrId || '').trim();
  if (!cleanIdent) return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User identifier required' };

  try {
    const userRows: any = await query(`
      SELECT id, email, token_balance, subscription_plan, plan_slug, plan_name, last_token_grant_cycle 
      FROM users 
      WHERE LOWER(email) = LOWER($1) OR id = $1 
      LIMIT 1
    `, [cleanIdent]);

    const uList: any[] = Array.isArray(userRows) ? userRows : ((userRows as any)?.rows || []);

    if (!uList || uList.length === 0) {
      return { success: false, tokensGranted: 0, newBalance: 0, reason: 'User not found' };
    }

    const user = uList[0];
    const now = new Date();
    const currentCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (user.last_token_grant_cycle === currentCycle && !opt?.force) {
      return {
        success: false,
        tokensGranted: 0,
        newBalance: Number(user.token_balance || 0),
        reason: 'Monthly tokens already credited for this cycle'
      };
    }

    const tokensToGrant = (typeof numTokens === 'number' && numTokens > 0)
      ? numTokens
      : (opt?.customTokens && Number(opt.customTokens) > 0)
        ? Number(opt.customTokens)
        : (opt?.tokens && Number(opt.tokens) > 0)
          ? Number(opt.tokens)
          : (opt?.tokenLimit && Number(opt.tokenLimit) > 0)
            ? Number(opt.tokenLimit)
            : 500;

    const updateRes: any = await query(`
      UPDATE users 
      SET token_balance = COALESCE(token_balance, 0) + $1,
          last_token_grant_cycle = $2,
          last_token_grant_date = NOW(),
          updated_at = NOW()
      WHERE id = $3
      RETURNING token_balance
    `, [tokensToGrant, currentCycle, user.id]);

    const updated: any[] = Array.isArray(updateRes) ? updateRes : ((updateRes as any)?.rows || []);
    const newBalance = Number(updated[0]?.token_balance ?? (Number(user.token_balance || 0) + tokensToGrant));
    const txId = 'tx_grant_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const planDesc = opt?.planName || opt?.planSlug || user.plan_name || user.plan_slug || 'Monthly Plan';

    await query(`
      INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'plan_monthly_grant', $6, NOW())
    `, [txId, user.id, user.email, tokensToGrant, newBalance, `Monthly plan grant: ${planDesc} (+${tokensToGrant})`]);

    return {
      success: true,
      tokensGranted: tokensToGrant,
      newBalance,
      cycle: currentCycle,
      plan: opt?.planSlug || opt?.planName
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
  options?: { customTokens?: number; orderId?: string; [key: string]: any }
) {
  return grantMonthlyPlanTokenReward(userEmailOrId, options);
}

export async function grantUserTokens(
  userEmailOrId: string,
  tokens: number,
  reason: string = 'Admin grant'
) {
  return grantMonthlyPlanTokenReward(userEmailOrId, { customTokens: tokens, force: true });
}

export async function purchaseTokenPackage(
  userEmailOrIdOrPayload: string | {
    userId?: string | null;
    userEmail?: string | null;
    email?: string | null;
    packageId?: string;
    package_id?: string;
    tokens?: number;
    amount?: number;
    amountPaid?: number;
    price?: number;
    currency?: string;
    gateway?: string;
    paymentMethod?: string;
    payment_method?: string;
    packageName?: string;
    package_name?: string;
    orderId?: string;
    description?: string;
    [key: string]: any;
  } | any,
  packageIdOrTokens?: string | number | any,
  options?: {
    orderId?: string;
    amountPaid?: number;
    currency?: string;
    gateway?: string;
    description?: string;
    [key: string]: any;
  } | any
): Promise<{
  success: boolean;
  tokensAdded: number;
  tokensToAdd?: number;
  newBalance: number;
  wallet_balance?: number;
  newWalletBalance?: number;
  paymentMethod?: string;
  transactionId?: string;
  error?: string;
  user?: any;
  [key: string]: any;
}> {
  await initTokenTables();

  let userIdentifier = '';
  let pkgId = '';
  let explicitTokens = 0;
  let orderId = '';
  let gateway = 'stripe';
  let desc = '';
  let paymentMethod = 'wallet';
  let customPrice = 0;

  if (typeof userEmailOrIdOrPayload === 'object' && userEmailOrIdOrPayload !== null) {
    userIdentifier = String(userEmailOrIdOrPayload.userId || userEmailOrIdOrPayload.userEmail || userEmailOrIdOrPayload.email || '').trim();
    pkgId = String(userEmailOrIdOrPayload.packageId || userEmailOrIdOrPayload.package_id || '').trim();
    explicitTokens = Number(userEmailOrIdOrPayload.tokens || 0);
    orderId = String(userEmailOrIdOrPayload.orderId || '');
    gateway = String(userEmailOrIdOrPayload.gateway || userEmailOrIdOrPayload.paymentMethod || 'wallet');
    paymentMethod = String(userEmailOrIdOrPayload.paymentMethod || userEmailOrIdOrPayload.payment_method || 'wallet');
    desc = String(userEmailOrIdOrPayload.description || '');
    customPrice = Number(userEmailOrIdOrPayload.price || userEmailOrIdOrPayload.amount || 0);
  } else {
    userIdentifier = String(userEmailOrIdOrPayload || '').trim();
    if (typeof packageIdOrTokens === 'number') {
      explicitTokens = packageIdOrTokens;
    } else if (typeof packageIdOrTokens === 'string') {
      pkgId = packageIdOrTokens.trim();
      const num = Number(packageIdOrTokens);
      if (!isNaN(num) && num > 0) explicitTokens = num;
    }
    if (options) {
      orderId = String(options.orderId || '');
      gateway = String(options.gateway || 'stripe');
      desc = String(options.description || '');
      customPrice = Number(options.amountPaid || 0);
    }
  }

  if (!userIdentifier) {
    return { success: false, tokensAdded: 0, newBalance: 0, error: 'User identifier is required.' };
  }

  // 1. Fetch user from PostgreSQL
  const userRows: any = await query(`
    SELECT id, email, token_balance, wallet_balance 
    FROM users 
    WHERE id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2)) 
    LIMIT 1
  `, [userIdentifier, userIdentifier]);

  const uList: any[] = Array.isArray(userRows) ? userRows : ((userRows as any)?.rows || []);
  if (!uList || uList.length === 0) {
    return { success: false, tokensAdded: 0, newBalance: 0, error: 'User not found in database.' };
  }

  const user = uList[0];
  const settings = await getTokenSettings();

  // 2. Resolve token amount, package price, and package name
  let tokensToAdd = explicitTokens;
  let packageName = 'Token Package';
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
    if (pkgId === 'pkg_starter') { tokensToAdd = 100; packagePrice = packagePrice || 4.99; }
    else if (pkgId === 'pkg_pro') { tokensToAdd = 500; packagePrice = packagePrice || 19.99; }
    else if (pkgId === 'pkg_buffet') { tokensToAdd = 1500; packagePrice = packagePrice || 49.99; }
    else { tokensToAdd = 100; packagePrice = packagePrice || 4.99; }
  }

  // 3. Deduct from wallet if payment method is wallet
  let updatedWalletBalance = parseFloat(user.wallet_balance || 0);
  if (paymentMethod === 'wallet' && packagePrice > 0) {
    if (updatedWalletBalance < packagePrice) {
      return {
        success: false,
        tokensAdded: 0,
        newBalance: Number(user.token_balance || 0),
        error: `Insufficient wallet balance ($${updatedWalletBalance.toFixed(2)} available). This bundle requires $${packagePrice.toFixed(2)}.`
      };
    }

    updatedWalletBalance = updatedWalletBalance - packagePrice;
    await query(`
      UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2
    `, [updatedWalletBalance, user.id]);

    const wtxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await query(`
      INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, status, description, created_at)
      VALUES ($1, $2, $3, 'token_purchase', $4, $5, 'wallet', 'succeeded', $6, NOW())
    `, [wtxId, user.id, user.email, -packagePrice, updatedWalletBalance, `Purchased ${packageName} (+${tokensToAdd.toLocaleString()} tokens)`]);
  }

  // 4. Atomically update users.token_balance in PostgreSQL
  const updateRes: any = await query(`
    UPDATE users 
    SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW() 
    WHERE id = $2 
    RETURNING token_balance
  `, [tokensToAdd, user.id]);

  const updatedToken: any[] = Array.isArray(updateRes) ? updateRes : ((updateRes as any)?.rows || []);
  const newBalance = Number(updatedToken[0]?.token_balance ?? (Number(user.token_balance || 0) + tokensToAdd));

  // 5. Record audit ledger in token_transactions
  const txId = 'tx_buy_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const txDesc = desc || `Purchased ${packageName} (+${tokensToAdd} tokens) via ${paymentMethod.toUpperCase()}${orderId ? ` [Order: ${orderId}]` : ''}`;

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, 'purchase_package', $6, NOW())
  `, [txId, user.id, user.email, tokensToAdd, newBalance, txDesc]);

  const tokensAdded = tokensToAdd;

  return {
    success: true,
    tokensAdded,
    tokensToAdd,
    newBalance,
    wallet_balance: updatedWalletBalance,
    newWalletBalance: updatedWalletBalance,
    paymentMethod,
    transactionId: txId,
    user: {
      id: user.id,
      email: user.email,
      tokenBalance: newBalance,
      walletBalance: updatedWalletBalance
    }
  };
}

export interface UserAdjustmentEntry {
  userId: string;
  userEmail: string;
  netAmount: number;
  types: string[];
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

  const txRows: any = await query(`
    SELECT id, user_id, user_email, amount, type, description 
    FROM token_transactions 
    WHERE id = ANY($1)
  `, [ids]);
  const rawTxs: any[] = Array.isArray(txRows) ? txRows : ((txRows as any)?.rows || []);

  if (rawTxs.length === 0) {
    return { success: false, deletedCount: 0, affectedUsers: [], error: 'No matching transaction records found' };
  }

  const userAdjustments = new Map<string, UserAdjustmentEntry>();

  for (let i = 0; i < rawTxs.length; i++) {
    const tx = rawTxs[i];
    const email = String(tx.user_email || '').toLowerCase().trim();
    const uId = String(tx.user_id || '').trim();
    const key = email || uId;
    if (!key) continue;

    const amt = Number(tx.amount || 0);
    const existing: UserAdjustmentEntry = userAdjustments.get(key) || {
      userId: uId,
      userEmail: email,
      netAmount: 0,
      types: [] as string[]
    };
    existing.netAmount += amt;
    existing.types.push(String(tx.type || ''));
    if (!existing.userId && uId) existing.userId = uId;
    if (!existing.userEmail && email) existing.userEmail = email;
    userAdjustments.set(key, existing);
  }

  const adjustmentsList: UserAdjustmentEntry[] = [];
  userAdjustments.forEach((entry) => {
    adjustmentsList.push(entry);
  });

  const affectedUsers: AffectedUserBalance[] = [];

  for (let i = 0; i < adjustmentsList.length; i++) {
    const adj = adjustmentsList[i];
    const uRes: any = await query(`
      SELECT id, email, token_balance 
      FROM users 
      WHERE (id = $1 AND $1 != '') OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($2)) AND $2 != '')
      LIMIT 1
    `, [adj.userId, adj.userEmail]);
    const uList: any[] = Array.isArray(uRes) ? uRes : ((uRes as any)?.rows || []);

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
        id: String(u.id),
        email: String(u.email || ''),
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
