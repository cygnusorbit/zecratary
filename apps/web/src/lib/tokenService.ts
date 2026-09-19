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
  isEnabled: true
};

export async function initTokenTables() {
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
        is_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS token_transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_email VARCHAR(255),
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_token_grant_cycle VARCHAR(50);
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_tokens INTEGER DEFAULT 100;
    `);
  } catch (err) {
    console.error('Failed initializing token tables in PostgreSQL:', err);
  }
}

export async function getTokenSettings(): Promise<TokenSettings> {
  await initTokenTables();
  try {
    const rows = await query('SELECT * FROM token_settings WHERE id = $1 LIMIT 1', ['primary_token_settings']);
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        tokenName: r.token_name || DEFAULT_SETTINGS.tokenName,
        tokenSymbol: r.token_symbol || DEFAULT_SETTINGS.tokenSymbol,
        chefCost: Number(r.chef_cost ?? DEFAULT_SETTINGS.chefCost),
        importUrlCost: Number(r.import_url_cost ?? DEFAULT_SETTINGS.importUrlCost),
        importTextCost: Number(r.import_text_cost ?? DEFAULT_SETTINGS.importTextCost),
        importPhotoCost: Number(r.import_photo_cost ?? DEFAULT_SETTINGS.importPhotoCost),
        packages: Array.isArray(r.packages) && r.packages.length > 0 ? r.packages : DEFAULT_SETTINGS.packages,
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
    packages: settings.packages || current.packages
  };

  await query(`
    INSERT INTO token_settings (
      id, token_name, token_symbol, chef_cost, import_url_cost,
      import_text_cost, import_photo_cost, packages, is_enabled, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW())
    ON CONFLICT (id) DO UPDATE SET
      token_name = EXCLUDED.token_name,
      token_symbol = EXCLUDED.token_symbol,
      chef_cost = EXCLUDED.chef_cost,
      import_url_cost = EXCLUDED.import_url_cost,
      import_text_cost = EXCLUDED.import_text_cost,
      import_photo_cost = EXCLUDED.import_photo_cost,
      packages = EXCLUDED.packages,
      is_enabled = EXCLUDED.is_enabled,
      updated_at = NOW()
  `, [
    'primary_token_settings',
    merged.tokenName,
    merged.tokenSymbol,
    merged.chefCost,
    merged.importUrlCost,
    merged.importTextCost,
    merged.importPhotoCost,
    JSON.stringify(merged.packages),
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

  // Find user
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

  // Atomically decrement
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
  const txId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

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
}) {
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
  const txId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  await query(`
    INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [txId, userRow.id, userRow.email, amount, newBalance, type, description]);

  return newBalance;
}

export async function syncUserMonthlyTokens(userId?: string | null, userEmail?: string | null) {
  await initTokenTables();
  try {
    let userRow: any = null;
    if (userId) {
      const rows = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (rows.length > 0) userRow = rows[0];
    } else if (userEmail) {
      const rows = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
      if (rows.length > 0) userRow = rows[0];
    }
    if (!userRow) return;

    const currentCycle = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    if (userRow.last_token_grant_cycle === currentCycle) {
      return; // Already granted for this monthly cycle
    }

    const planSlug = userRow.subscription_plan || 'taster';
    const planRows = await query('SELECT monthly_tokens, token_limit FROM subscription_plans WHERE slug = $1 LIMIT 1', [planSlug]);
    
    // Default tokens granted per plan: Free/Taster: 50, Nutrition Pro: 500, Custom: 2000
    let tokensToGrant = 50;
    if (planRows.length > 0 && planRows[0].monthly_tokens) {
      tokensToGrant = Number(planRows[0].monthly_tokens);
    } else if (planSlug.includes('pro')) {
      tokensToGrant = 500;
    }

    await addTokensToUser({
      userId: userRow.id,
      userEmail: userRow.email,
      amount: tokensToGrant,
      type: 'plan_monthly_grant',
      description: `Monthly Plan Token Grant (${planSlug.toUpperCase()} - ${currentCycle})`
    });

    await query('UPDATE users SET last_token_grant_cycle = $1 WHERE id = $2', [currentCycle, userRow.id]);
  } catch (err) {
    console.error('Failed syncing monthly plan tokens:', err);
  }
}
