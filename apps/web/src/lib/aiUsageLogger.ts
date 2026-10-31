import { query } from '@/lib/db';

export interface LogAiUsageParams {
  provider?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  cost?: number;
  latencyMs?: number;
  source?: string;
  userId?: string | null;
  userEmail?: string | null;
}

export async function logAiUsageTelemetry(params: LogAiUsageParams) {
  const provider = (params.provider || 'gemini').toLowerCase();
  const model = params.model || 'gemini-2.5-flash';
  const promptTokens = Math.max(0, Math.round(params.promptTokens || 0));
  const completionTokens = Math.max(0, Math.round(params.completionTokens || 0));
  const totalTokens = params.totalTokens || (promptTokens + completionTokens);
  const latencyMs = Math.max(0, Math.round(params.latencyMs || 0));
  const source = params.source || 'chef';

  // Calculate standard Gemini cost: ~$0.075 / 1M prompt, $0.30 / 1M completion
  const calculatedCost = params.cost !== undefined ? params.cost : 
    parseFloat(((promptTokens * 0.075 + completionTokens * 0.3) / 1000000).toFixed(6));

  try {
    // 1. Ensure table exists in PostgreSQL / MySQL
    await query(`
      CREATE TABLE IF NOT EXISTS ai_usage_telemetry (
        id VARCHAR(64) PRIMARY KEY,
        provider VARCHAR(32) NOT NULL,
        model VARCHAR(64) NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        source VARCHAR(64) DEFAULT 'chef',
        user_id VARCHAR(64),
        user_email VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_telemetry(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_telemetry(provider);
    `);

    const id = 'ai_usg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    // 2. Insert record
    await query(`
      INSERT INTO ai_usage_telemetry (
        id, provider, model, prompt_tokens, completion_tokens,
        total_tokens, cost, latency_ms, source, user_id, user_email, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [
      id,
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      calculatedCost,
      latencyMs,
      source,
      params.userId || null,
      params.userEmail || null
    ]);

    return { success: true, id };
  } catch (err) {
    console.warn('[aiUsageLogger] Failed to persist usage record:', err);
    return { success: false, error: err };
  }
}
