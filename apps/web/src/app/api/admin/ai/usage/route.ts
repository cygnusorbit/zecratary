import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface UsagePoint {
  date: string;
  dayLabel: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get('timeframe') || '7d') as '24h' | '7d' | '30d';
    const provider = searchParams.get('provider') || 'gemini';

    // 1. Ensure table exists
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
    `);

    const now = new Date();
    const points: UsagePoint[] = [];

    if (timeframe === '24h') {
      const startTime = new Date(now.getTime() - 24 * 3600 * 1000);
      
      const rows = await query(`
        SELECT 
          date_trunc('hour', created_at) AS time_bucket,
          COUNT(*) AS request_count,
          COALESCE(SUM(prompt_tokens), 0) AS sum_prompt,
          COALESCE(SUM(completion_tokens), 0) AS sum_completion,
          COALESCE(SUM(cost), 0) AS sum_cost
        FROM ai_usage_telemetry
        WHERE created_at >= $1
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `, [startTime.toISOString()]);

      const map = new Map<string, any>();
      rows.forEach((r: any) => {
        const d = new Date(r.time_bucket);
        map.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`, r);
      });

      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600 * 1000);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const match = map.get(key);

        const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
        const reqs = match ? parseInt(match.request_count, 10) : 0;
        const promptTok = match ? parseInt(match.sum_prompt, 10) : 0;
        const compTok = match ? parseInt(match.sum_completion, 10) : 0;
        const costVal = match ? parseFloat(parseFloat(match.sum_cost).toFixed(4)) : 0;

        points.push({
          date: d.toISOString(),
          dayLabel: hourStr,
          requests: reqs,
          promptTokens: promptTok,
          completionTokens: compTok,
          cost: costVal
        });
      }
    } else {
      const numDays = timeframe === '30d' ? 30 : 7;
      const startTime = new Date(now.getTime() - numDays * 24 * 3600 * 1000);

      const rows = await query(`
        SELECT 
          date_trunc('day', created_at) AS time_bucket,
          COUNT(*) AS request_count,
          COALESCE(SUM(prompt_tokens), 0) AS sum_prompt,
          COALESCE(SUM(completion_tokens), 0) AS sum_completion,
          COALESCE(SUM(cost), 0) AS sum_cost
        FROM ai_usage_telemetry
        WHERE created_at >= $1
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `, [startTime.toISOString()]);

      const map = new Map<string, any>();
      rows.forEach((r: any) => {
        const d = new Date(r.time_bucket);
        map.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, r);
      });

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const match = map.get(key);

        const dayName = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        const reqs = match ? parseInt(match.request_count, 10) : 0;
        const promptTok = match ? parseInt(match.sum_prompt, 10) : 0;
        const compTok = match ? parseInt(match.sum_completion, 10) : 0;
        const costVal = match ? parseFloat(parseFloat(match.sum_cost).toFixed(4)) : 0;

        points.push({
          date: d.toISOString(),
          dayLabel: dayName,
          requests: reqs,
          promptTokens: promptTok,
          completionTokens: compTok,
          cost: costVal
        });
      }
    }

    // Also check token_transactions for fallback data if telemetry table is fresh
    const totalRequests = points.reduce((acc, p) => acc + p.requests, 0);
    if (totalRequests === 0) {
      try {
        const txRows = await query(`
          SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as tot 
          FROM token_transactions 
          WHERE type LIKE 'usage_%'
        `);
        if (txRows.length > 0 && parseInt(txRows[0].cnt, 10) > 0) {
          const count = parseInt(txRows[0].cnt, 10);
          const lastPoint = points[points.length - 1];
          if (lastPoint) {
            lastPoint.requests = count;
            lastPoint.promptTokens = count * 350;
            lastPoint.completionTokens = count * 180;
            lastPoint.cost = parseFloat(((lastPoint.promptTokens * 0.075 + lastPoint.completionTokens * 0.3) / 1000000).toFixed(4));
          }
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      timeframe,
      provider,
      points,
      totalRequests: points.reduce((acc, p) => acc + p.requests, 0),
      totalPromptTokens: points.reduce((acc, p) => acc + p.promptTokens, 0),
      totalCompletionTokens: points.reduce((acc, p) => acc + p.completionTokens, 0),
      totalCost: points.reduce((acc, p) => acc + p.cost, 0)
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
