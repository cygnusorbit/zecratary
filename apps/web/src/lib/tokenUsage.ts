import { query } from '@/lib/db';

export interface TokenUsageResult {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  monthlyLimit?: number;
}

export async function recordTokenUsage({
  userId,
  userEmail,
  promptTokens = 0,
  completionTokens = 0,
  model = 'gemini-1.5-flash',
  source = 'unknown'
}: {
  userId?: string | null;
  userEmail?: string | null;
  promptTokens: number;
  completionTokens: number;
  model?: string;
  source?: string;
}): Promise<TokenUsageResult | null> {
  try {
    const pTokens = Math.max(1, Math.round(Number(promptTokens) || 0));
    const cTokens = Math.max(1, Math.round(Number(completionTokens) || 0));
    const addTotal = pTokens + cTokens;

    // 1. Ensure columns exist on PostgreSQL users table
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_usage JSONB DEFAULT '{}'::jsonb;
    `);

    // 2. Resolve User Identifier
    let userRow: any = null;
    if (userId) {
      const rows = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (rows.length > 0) userRow = rows[0];
    }
    if (!userRow && userEmail) {
      const rows = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
      if (rows.length > 0) userRow = rows[0];
    }

    if (!userRow) {
      return null;
    }

    // 3. Atomically increment token counters in PostgreSQL
    const newPrompt = (Number(userRow.prompt_tokens) || 0) + pTokens;
    const newCompletion = (Number(userRow.completion_tokens) || 0) + cTokens;
    const newTotal = (Number(userRow.total_tokens) || 0) + addTotal;
    const newReqCount = (Number(userRow.request_count) || 0) + 1;

    const tokenUsageObj = {
      promptTokens: newPrompt,
      completionTokens: newCompletion,
      totalTokens: newTotal,
      requestCount: newReqCount,
      lastModelUsed: model,
      lastSource: source,
      lastUpdated: new Date().toISOString()
    };

    await query(`
      UPDATE users SET
        prompt_tokens = $1,
        completion_tokens = $2,
        total_tokens = $3,
        request_count = $4,
        token_usage = $5::jsonb,
        updated_at = NOW()
      WHERE id = $6
    `, [newPrompt, newCompletion, newTotal, newReqCount, JSON.stringify(tokenUsageObj), userRow.id]);

    return {
      promptTokens: newPrompt,
      completionTokens: newCompletion,
      totalTokens: newTotal,
      requestCount: newReqCount
    };
  } catch (err) {
    console.error('Failed to record token usage in PostgreSQL:', err);
    return null;
  }
}

export async function getUserTokenUsage(userId?: string | null, userEmail?: string | null): Promise<TokenUsageResult> {
  try {
    let rows: any[] = [];
    if (userId) {
      rows = await query('SELECT prompt_tokens, completion_tokens, total_tokens, request_count, token_usage FROM users WHERE id = $1 LIMIT 1', [userId]);
    } else if (userEmail) {
      rows = await query('SELECT prompt_tokens, completion_tokens, total_tokens, request_count, token_usage FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [userEmail.trim()]);
    }

    if (rows.length > 0) {
      const u = rows[0];
      const tu = u.token_usage || {};
      return {
        promptTokens: Number(tu.promptTokens ?? u.prompt_tokens ?? 0),
        completionTokens: Number(tu.completionTokens ?? u.completion_tokens ?? 0),
        totalTokens: Number(tu.totalTokens ?? u.total_tokens ?? 0),
        requestCount: Number(tu.requestCount ?? u.request_count ?? 0)
      };
    }
  } catch (_) {}

  return { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 };
}
