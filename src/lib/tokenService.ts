import { query } from '@/lib/db';

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  tokenAmount?: number;
  price: number;
  priceDollars?: number;
  badge?: string;
  bonusTokens?: number;
  isPopular?: boolean;
  [key: string]: any;
}

export interface TokenSettings {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  chefCost: number;
  aiChefCost?: number;
  importUrlCost: number;
  importTextCost: number;
  importPhotoCost: number;
  mealPlannerCost?: number;
  macroAnalysisCost?: number;
  startingBalance?: number;
  packages: TokenPackage[];
  planAllocations?: { [slug: string]: number };
  isEnabled: boolean;
  updatedAt?: string;
  [key: string]: any;
}

export interface DeductionResult {
  success: boolean;
  error?: string;
  deducted?: number;
  currentBalance?: number;
  required?: number;
  tokenSymbol?: string;
  [key: string]: any;
}

export interface DeleteTokenTransactionsResult {
  success: boolean;
  deletedCount?: number;
  affectedUsers?: any;
  affectedUserIds?: string[];
  error?: string;
  [key: string]: any;
}

const DEFAULT_SETTINGS: TokenSettings = {
  id: 'primary_token_settings',
  tokenName: 'Foodie Token',
  tokenSymbol: '',
  chefCost: 8,
  aiChefCost: 8,
  importUrlCost: 5,
  importTextCost: 2,
  importPhotoCost: 10,
  mealPlannerCost: 5,
  macroAnalysisCost: 3,
  startingBalance: 100,
  packages: [
    { id: 'pkg_starter', name: 'Starter Spark', tokens: 250, tokenAmount: 250, price: 4.99, priceDollars: 4.99, badge: 'Popular', bonusTokens: 0, isPopular: true },
    { id: 'pkg_chef', name: 'Culinary Master', tokens: 1000, tokenAmount: 1000, price: 14.99, priceDollars: 14.99, badge: 'Best Value', bonusTokens: 150, isPopular: false },
    { id: 'pkg_executive', name: 'Kitchen Enterprise', tokens: 5000, tokenAmount: 5000, price: 49.99, priceDollars: 49.99, badge: 'VIP', bonusTokens: 1000, isPopular: false }
  ],
  planAllocations: {
    'free': 50,
    'nutrition-pro': 750,
    'vip-chef': 3000
  },
  isEnabled: true
};

export async function initTokenTables(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS token_settings (
        id VARCHAR(64) PRIMARY KEY,
        token_name VARCHAR(100) DEFAULT 'Foodie Token',
        token_symbol VARCHAR(20) DEFAULT '',
        chef_cost INTEGER DEFAULT 8,
        ai_chef_cost INTEGER DEFAULT 8,
        import_url_cost INTEGER DEFAULT 5,
        import_text_cost INTEGER DEFAULT 2,
        import_photo_cost INTEGER DEFAULT 10,
        meal_planner_cost INTEGER DEFAULT 5,
        macro_analysis_cost INTEGER DEFAULT 3,
        starting_balance INTEGER DEFAULT 100,
        packages JSONB DEFAULT '[]'::jsonb,
        plan_allocations JSONB DEFAULT '{}'::jsonb,
        is_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      ALTER TABLE token_settings 
      ADD COLUMN IF NOT EXISTS chef_cost INTEGER DEFAULT 8,
      ADD COLUMN IF NOT EXISTS ai_chef_cost INTEGER DEFAULT 8,
      ADD COLUMN IF NOT EXISTS import_url_cost INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS import_text_cost INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS import_photo_cost INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS meal_planner_cost INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS macro_analysis_cost INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS starting_balance INTEGER DEFAULT 100,
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
      ADD COLUMN IF NOT EXISTS last_token_grant_cycle VARCHAR(50);
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
      const resolvedCost = Number(r.ai_chef_cost ?? r.chef_cost ?? DEFAULT_SETTINGS.chefCost);
      const pkgs = Array.isArray(r.packages) 
        ? r.packages 
        : (typeof r.packages === 'string' ? JSON.parse(r.packages) : DEFAULT_SETTINGS.packages);

      return {
        id: r.id || 'primary_token_settings',
        tokenName: r.token_name || DEFAULT_SETTINGS.tokenName,
        tokenSymbol: r.token_symbol !== undefined && r.token_symbol !== null ? String(r.token_symbol).trim() : '',
        chefCost: resolvedCost,
        aiChefCost: resolvedCost,
        importUrlCost: Number(r.import_url_cost ?? DEFAULT_SETTINGS.importUrlCost),
        importTextCost: Number(r.import_text_cost ?? DEFAULT_SETTINGS.importTextCost),
        importPhotoCost: Number(r.import_photo_cost ?? DEFAULT_SETTINGS.importPhotoCost),
        mealPlannerCost: Number(r.meal_planner_cost ?? DEFAULT_SETTINGS.mealPlannerCost),
        macroAnalysisCost: Number(r.macro_analysis_cost ?? DEFAULT_SETTINGS.macroAnalysisCost),
        startingBalance: Number(r.starting_balance ?? DEFAULT_SETTINGS.startingBalance),
        packages: pkgs.map((p: any) => ({
          id: p.id,
          name: p.name,
          tokens: Number(p.tokens ?? p.tokenAmount ?? 250),
          tokenAmount: Number(p.tokenAmount ?? p.tokens ?? 250),
          price: Number(p.price ?? p.priceDollars ?? 4.99),
          priceDollars: Number(p.priceDollars ?? p.price ?? 4.99),
          badge: p.badge || undefined,
          bonusTokens: Number(p.bonusTokens || 0),
          isPopular: Boolean(p.isPopular)
        })),
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

export async function saveTokenSettings(settings: Partial<TokenSettings> & Record<string, any>): Promise<TokenSettings> {
  await initTokenTables();
  const current = await getTokenSettings();
  
  const rawChef = settings.aiChefCost ?? settings.chefCost ?? (settings.featureCosts ? (settings.featureCosts['AI Chef Recipe Generation'] ?? settings.featureCosts['chef']) : undefined);
  const resolvedChefCost = rawChef !== undefined ? Math.max(0, Number(rawChef)) : current.chefCost;

  const incomingPkgs = settings.packages || current.packages;
  const normalizedPackages = (Array.isArray(incomingPkgs) ? incomingPkgs : []).map((p: any) => ({
    id: p.id || 'pkg_' + Date.now().toString(36),
    name: p.name || 'Bundle',
    tokens: Math.max(1, Number(p.tokens ?? p.tokenAmount ?? 250)),
    tokenAmount: Math.max(1, Number(p.tokenAmount ?? p.tokens ?? 250)),
    price: Math.max(0.01, Number(p.price ?? p.priceDollars ?? 4.99)),
    priceDollars: Math.max(0.01, Number(p.priceDollars ?? p.price ?? 4.99)),
    badge: p.badge || undefined,
    bonusTokens: Number(p.bonusTokens || 0),
    isPopular: Boolean(p.isPopular)
  }));

  const merged: TokenSettings = {
    ...current,
    ...settings,
    tokenSymbol: settings.tokenSymbol !== undefined ? String(settings.tokenSymbol).trim() : current.tokenSymbol,
    chefCost: resolvedChefCost,
    aiChefCost: resolvedChefCost,
    importUrlCost: settings.importUrlCost !== undefined ? Math.max(0, Number(settings.importUrlCost)) : current.importUrlCost,
    importTextCost: settings.importTextCost !== undefined ? Math.max(0, Number(settings.importTextCost)) : current.importTextCost,
    importPhotoCost: settings.importPhotoCost !== undefined ? Math.max(0, Number(settings.importPhotoCost)) : current.importPhotoCost,
    mealPlannerCost: settings.mealPlannerCost !== undefined ? Math.max(0, Number(settings.mealPlannerCost)) : current.mealPlannerCost,
    macroAnalysisCost: settings.macroAnalysisCost !== undefined ? Math.max(0, Number(settings.macroAnalysisCost)) : current.macroAnalysisCost,
    startingBalance: settings.startingBalance !== undefined ? Math.max(0, Number(settings.startingBalance)) : current.startingBalance,
    packages: normalizedPackages,
    planAllocations: settings.planAllocations || current.planAllocations || DEFAULT_SETTINGS.planAllocations,
    isEnabled: settings.isEnabled !== undefined ? Boolean(settings.isEnabled) : current.isEnabled
  };

  const idToUse = current.id || 'primary_token_settings';

  await query(`
    INSERT INTO token_settings (
      id, token_name, token_symbol, chef_cost, ai_chef_cost, import_url_cost,
      import_text_cost, import_photo_cost, meal_planner_cost, macro_analysis_cost,
      starting_balance, packages, plan_allocations, is_enabled, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, NOW())
    ON CONFLICT (id) DO UPDATE SET
      token_name = EXCLUDED.token_name,
      token_symbol = EXCLUDED.token_symbol,
      chef_cost = EXCLUDED.chef_cost,
      ai_chef_cost = EXCLUDED.ai_chef_cost,
      import_url_cost = EXCLUDED.import_url_cost,
      import_text_cost = EXCLUDED.import_text_cost,
      import_photo_cost = EXCLUDED.import_photo_cost,
      meal_planner_cost = EXCLUDED.meal_planner_cost,
      macro_analysis_cost = EXCLUDED.macro_analysis_cost,
      starting_balance = EXCLUDED.starting_balance,
      packages = EXCLUDED.packages,
      plan_allocations = EXCLUDED.plan_allocations,
      is_enabled = EXCLUDED.is_enabled,
      updated_at = NOW()
  `, [
    idToUse,
    merged.tokenName,
    merged.tokenSymbol,
    merged.chefCost,
    merged.aiChefCost,
    merged.importUrlCost,
    merged.importTextCost,
    merged.importPhotoCost,
    merged.mealPlannerCost,
    merged.macroAnalysisCost,
    merged.startingBalance,
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
  feature = 'chef',
  description = 'AI Chef Recipe Generation'
}: {
  userId?: string | null;
  userEmail?: string | null;
  cost?: number;
  feature?: string;
  description?: string;
}): Promise<DeductionResult> {
  await initTokenTables();
  const settings = await getTokenSettings();

  const finalCost = cost !== undefined ? Number(cost) : settings.chefCost;

  if (!settings.isEnabled || finalCost <= 0) {
    let balance = 0;
    try {
      const bRes = await query('SELECT token_balance FROM users WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1', [userId || '', (userEmail || '').trim()]);
      if (bRes.length > 0) balance = Number(bRes[0].token_balance || 0);
    } catch (_) {}
    return { success: true, deducted: 0, currentBalance: balance, tokenSymbol: settings.tokenSymbol };
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
  if (currentBalance < finalCost) {
    return {
      success: false,
      error: `Insufficient ${settings.tokenName}. Required: ${finalCost} ${settings.tokenSymbol}, Balance: ${currentBalance} ${settings.tokenSymbol}`,
      currentBalance,
      required: finalCost,
      tokenSymbol: settings.tokenSymbol
    };
  }

  const updateRes = await query(`
    UPDATE users 
    SET token_balance = token_balance - $1, updated_at = NOW() 
    WHERE id = $2 AND token_balance >= $1 
    RETURNING token_balance
  `, [finalCost, userRow.id]);

  if (updateRes.length === 0) {
    return {
      success: false,
      error: 'Token deduction failed due to concurrent update.',
      currentBalance,
      required: finalCost
    };
  }

  const newBalance = Number(updateRes[0].token_balance);
  const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  try {
    await query(`
      INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [txId, userRow.id, userRow.email, -finalCost, newBalance, `usage_${feature}`, description]);
  } catch (txErr) {
    console.error('Failed to log token transaction:', txErr);
  }

  return {
    success: true,
    deducted: finalCost,
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

export async function deleteTokenTransactionsAndSyncBalance(
  transactionIds?: any
): Promise<DeleteTokenTransactionsResult> {
  try {
    await initTokenTables();
    let cleanIds: string[] = [];

    if (transactionIds) {
      if (Array.isArray(transactionIds)) {
        cleanIds = transactionIds.map(String).filter(Boolean);
      } else if (typeof transactionIds === 'object') {
        const candidate = transactionIds.ids || transactionIds.transactionIds || transactionIds.id;
        if (Array.isArray(candidate)) {
          cleanIds = candidate.map(String).filter(Boolean);
        } else if (candidate) {
          cleanIds = [String(candidate)].filter(Boolean);
        }
      } else {
        cleanIds = [String(transactionIds)].filter(Boolean);
      }
    }

    // 1. Fetch matching transactions to calculate user balance reversal
    let txsToDelete: any[] = [];
    if (cleanIds.length > 0) {
      const placeholders = cleanIds.map((_, i) => `$${i + 1}`).join(', ');
      txsToDelete = await query(`SELECT id, user_id, user_email, amount, type FROM token_transactions WHERE id IN (${placeholders})`, cleanIds);
    } else {
      txsToDelete = await query('SELECT id, user_id, user_email, amount, type FROM token_transactions');
    }

    const txRows = Array.isArray(txsToDelete) ? txsToDelete : ((txsToDelete as any)?.rows || []);

    // 2. Calculate net token adjustments per user
    const userAdjustments = new Map<string, { userId?: string; userEmail?: string; netAmount: number }>();
    for (const tx of txRows) {
      const key = tx.user_id || tx.user_email;
      if (!key) continue;
      const existing = userAdjustments.get(key) || { userId: tx.user_id, userEmail: tx.user_email, netAmount: 0 };
      existing.netAmount += Number(tx.amount || 0);
      userAdjustments.set(key, existing);
    }

    // 3. Update user balances in database
    const affectedUserList: string[] = [];
    for (const adj of Array.from(userAdjustments.values())) {
      if (adj.userId) {
        await query(
          'UPDATE users SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - $1), updated_at = NOW() WHERE id = $2',
          [adj.netAmount, adj.userId]
        );
        affectedUserList.push(adj.userId);
      } else if (adj.userEmail) {
        await query(
          'UPDATE users SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - $1), updated_at = NOW() WHERE LOWER(email) = LOWER($2)',
          [adj.netAmount, adj.userEmail.trim()]
        );
        affectedUserList.push(adj.userEmail);
      }
    }

    // 4. Delete the transaction records
    let deletedCount = 0;
    if (cleanIds.length > 0) {
      const placeholders = cleanIds.map((_, i) => `$${i + 1}`).join(', ');
      await query(`DELETE FROM token_transactions WHERE id IN (${placeholders})`, cleanIds);
      deletedCount = cleanIds.length;
    } else {
      await query('DELETE FROM token_transactions');
      deletedCount = txRows.length;
    }

    return {
      success: true,
      deletedCount,
      affectedUsers: affectedUserList.length,
      affectedUserIds: affectedUserList
    };
  } catch (err: any) {
    console.error('deleteTokenTransactionsAndSyncBalance error:', err);
    return {
      success: false,
      deletedCount: 0,
      affectedUsers: 0,
      error: err.message
    };
  }
}

export async function purchaseTokenPackage(options: {
  userId?: string | null;
  userEmail?: string | null;
  packageId: string;
  tokens?: number;
  price?: number;
  packageName?: string;
  paymentMethod?: string;
  [key: string]: any;
}): Promise<{ success: boolean; tokensAdded?: number; newBalance?: number; error?: string; [key: string]: any }> {
  try {
    await initTokenTables();
    const settings = await getTokenSettings();
    const pkg = (settings.packages || []).find((p: any) => p.id === options.packageId);

    const tokensToAdd = Number(options.tokens ?? pkg?.tokens ?? pkg?.tokenAmount ?? 100);
    const costPrice = Number(options.price ?? pkg?.price ?? pkg?.priceDollars ?? 4.99);
    const pkgTitle = options.packageName || pkg?.name || 'Token Bundle';

    let userRow: any = null;
    if (options.userId) {
      const uRes = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE id = $1 LIMIT 1', [options.userId]);
      if (uRes.length > 0) userRow = uRes[0];
    }
    if (!userRow && options.userEmail) {
      const uRes = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [options.userEmail.trim()]);
      if (uRes.length > 0) userRow = uRes[0];
    }

    if (!userRow) {
      return { success: false, error: 'User not found for token purchase' };
    }

    const currentBal = Number(userRow.token_balance || 0);
    const newBal = currentBal + tokensToAdd;

    await query('UPDATE users SET token_balance = $1, updated_at = NOW() WHERE id = $2', [newBal, userRow.id]);

    const txId = 'tx_pkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await query(`
      INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'package_purchase', $6, NOW())
    `, [txId, userRow.id, userRow.email, tokensToAdd, newBal, `Purchased ${pkgTitle} (+${tokensToAdd.toLocaleString()} ${settings.tokenSymbol})`]);

    return {
      success: true,
      tokensAdded: tokensToAdd,
      newBalance: newBal,
      wallet_balance: userRow.wallet_balance
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function grantMonthlyPlanTokenReward(
  userEmailOrId: string,
  tokensToGrant: number,
  options?: { planSlug?: string; planName?: string }
): Promise<{ success: boolean; tokensGranted: number; newBalance: number; error?: string }> {
  try {
    await initTokenTables();
    const ident = String(userEmailOrId || '').trim();
    const uRes = await query('SELECT id, email, token_balance FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) LIMIT 1', [ident]);
    if (!uRes || uRes.length === 0) return { success: false, tokensGranted: 0, newBalance: 0, error: 'User not found' };
    const user = uRes[0];

    const newBal = Number(user.token_balance || 0) + Number(tokensToGrant || 0);
    await query('UPDATE users SET token_balance = $1, updated_at = NOW() WHERE id = $2', [newBal, user.id]);

    const txId = 'tx_grant_' + Date.now().toString(36);
    await query(`
      INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
      VALUES ($1, $2, $3, $4, $5, 'plan_monthly_grant', $6, NOW())
    `, [txId, user.id, user.email, tokensToGrant, newBal, `Monthly Plan Grant: ${options?.planName || options?.planSlug || 'Active Tier'}`]);

    return { success: true, tokensGranted: tokensToGrant, newBalance: newBal };
  } catch (err: any) {
    return { success: false, tokensGranted: 0, newBalance: 0, error: err.message };
  }
}

export const syncUserMonthlyTokens = grantMonthlyPlanTokenReward;
export const grantUserTokens = addTokensToUser;
export const grantPlanTokensOnPurchase = grantMonthlyPlanTokenReward;
