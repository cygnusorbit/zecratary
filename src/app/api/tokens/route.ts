import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readServerTokenSettings(): any {
  const candidatePaths = [
    path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
    path.join(process.cwd(), 'data/admin_settings.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (parsed?.tokenSettings || parsed?.token_settings) {
          return parsed.tokenSettings || parsed.token_settings;
        }
      } catch (_) {}
    }
  }
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';

    let userBalance = 100;
    let walletBalance = 0.00;
    let tokenSymbol = '🪙';
    let tokenIcon = '';
    let tokenName = 'Foodie Token';
    let isEnabled = true;
    let costs = {
      chef: 2,
      import_url: 5,
      import_text: 2,
      import_photo: 10,
      meal_planner: 5,
      macro_analysis: 3
    };
    let packages: any[] = [];
    let transactions: any[] = [];
    let totalPages = 1;
    let stats = { totalDeducted: 0, totalGranted: 0, totalEvents: 0 };

    // 1. Fetch token settings from PostgreSQL / MySQL or local JSON
    try {
      const sRes: any = await Promise.race([
        query(`SELECT * FROM token_settings WHERE id::text = 'primary_settings' OR id::text = '1' LIMIT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]).catch(() => null);

      const sRow = (Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0]);
      const fallback = readServerTokenSettings();

      if (sRow) {
        tokenName = sRow.token_name || sRow.tokenName || tokenName;
        tokenSymbol = sRow.token_symbol || sRow.tokenSymbol || tokenSymbol;
        tokenIcon = sRow.token_icon || sRow.tokenIcon || '';
        isEnabled = sRow.is_enabled !== undefined ? sRow.is_enabled : (sRow.isEnabled !== undefined ? sRow.isEnabled : true);
        costs = {
          chef: sRow.ai_chef_cost ?? sRow.aiChefCost ?? 2,
          import_url: sRow.import_url_cost ?? sRow.importUrlCost ?? 5,
          import_text: sRow.import_text_cost ?? sRow.importTextCost ?? 2,
          import_photo: sRow.import_photo_cost ?? sRow.importPhotoCost ?? 10,
          meal_planner: sRow.meal_planner_cost ?? sRow.mealPlannerCost ?? 5,
          macro_analysis: sRow.macro_analysis_cost ?? sRow.macroAnalysisCost ?? 3
        };
        const rawPkgs = typeof sRow.packages === 'string' ? JSON.parse(sRow.packages) : sRow.packages;
        if (Array.isArray(rawPkgs)) packages = rawPkgs;
      } else if (fallback) {
        tokenName = fallback.tokenName || tokenName;
        tokenSymbol = fallback.tokenSymbol || tokenSymbol;
        tokenIcon = fallback.tokenIcon || '';
        isEnabled = fallback.isEnabled !== undefined ? fallback.isEnabled : true;
        if (fallback.packages && Array.isArray(fallback.packages)) packages = fallback.packages;
        costs = {
          chef: fallback.aiChefCost ?? 2,
          import_url: fallback.importUrlCost ?? 5,
          import_text: fallback.importTextCost ?? 2,
          import_photo: fallback.importPhotoCost ?? 10,
          meal_planner: fallback.mealPlannerCost ?? 5,
          macro_analysis: fallback.macroAnalysisCost ?? 3
        };
      }
    } catch (_) {}

    // Fallback default packages if none configured
    if (!packages || packages.length === 0) {
      packages = [
        { id: 'pkg_starter', name: 'Starter Spark', tokens: 250, tokenAmount: 250, price: 4.99, priceDollars: 4.99, badge: 'Popular', bonusTokens: 0, isPopular: true },
        { id: 'pkg_chef', name: 'Culinary Master', tokens: 1000, tokenAmount: 1000, price: 14.99, priceDollars: 14.99, badge: 'Best Value', bonusTokens: 150, isPopular: false },
        { id: 'pkg_executive', name: 'Kitchen Enterprise', tokens: 5000, tokenAmount: 5000, price: 49.99, priceDollars: 49.99, badge: 'VIP', bonusTokens: 1000, isPopular: false }
      ];
    } else {
      // Normalize dual property schema
      packages = packages.map((pkg) => {
        const tok = Number(pkg.tokens ?? pkg.tokenAmount ?? 0);
        const prc = Number(pkg.price ?? pkg.priceDollars ?? 0);
        const isPop = Boolean(pkg.popular ?? pkg.isPopular ?? (pkg.badge && String(pkg.badge).toLowerCase().includes('popular')));
        const isBest = Boolean(pkg.bestValue ?? (pkg.badge && String(pkg.badge).toLowerCase().includes('value')));
        return {
          id: pkg.id,
          name: pkg.name,
          tokens: tok,
          tokenAmount: tok,
          price: prc,
          priceDollars: prc,
          badge: pkg.badge,
          bonusTokens: Number(pkg.bonusTokens || 0),
          popular: isPop,
          isPopular: isPop,
          bestValue: isBest,
          description: pkg.description || undefined
        };
      });
    }

    // 2. Fetch User Balances (Safe across PostgreSQL & MySQL)
    if (email || userId) {
      try {
        let uRow = null;
        if (email) {
          const byEmail: any = await query(`SELECT id, email, token_balance, wallet_balance FROM users WHERE email = $1 LIMIT 1`, [email]).catch(() => null);
          uRow = (Array.isArray(byEmail) ? byEmail[0] : (byEmail as any)?.rows?.[0]);
        }
        if (!uRow && userId) {
          const isUuidOrInt = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || /^\d+$/.test(userId);
          if (isUuidOrInt) {
            const byId: any = await query(`SELECT id, email, token_balance, wallet_balance FROM users WHERE id = $1 LIMIT 1`, [userId]).catch(() => null);
            uRow = (Array.isArray(byId) ? byId[0] : (byId as any)?.rows?.[0]);
          }
        }

        if (uRow) {
          if (uRow.token_balance !== null && uRow.token_balance !== undefined) {
            userBalance = Number(uRow.token_balance);
          }
          if (uRow.wallet_balance !== null && uRow.wallet_balance !== undefined) {
            walletBalance = parseFloat(String(uRow.wallet_balance));
          }
        }
      } catch (_) {}
    }

    // 3. Fetch User Audit Ledger & Stats
    if (email || userId) {
      try {
        const cleanEmail = email || '';
        let whereClauses = [`user_email = $1`];
        let params: any[] = [cleanEmail];

        const isUuidOrInt = userId && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || /^\d+$/.test(userId));
        if (isUuidOrInt) {
          whereClauses = [`(user_id = $1 OR user_email = $2)`];
          params = [userId, cleanEmail];
        }

        if (search) {
          params.push(`%${search}%`);
          whereClauses.push(`(description ILIKE $${params.length} OR id ILIKE $${params.length})`);
        }
        if (type && type !== 'all') {
          params.push(`%${type}%`);
          whereClauses.push(`type ILIKE $${params.length}`);
        }

        const countQuery = `SELECT COUNT(*) as total FROM token_transactions WHERE ${whereClauses.join(' AND ')}`;
        const cRes: any = await query(countQuery, params);
        const total = parseInt(((Array.isArray(cRes) ? cRes[0] : (cRes as any)?.rows?.[0]))?.total || '0', 10);
        totalPages = Math.max(1, Math.ceil(total / limit));

        const offset = (page - 1) * limit;
        params.push(limit, offset);
        const txQuery = `
          SELECT id, user_id, user_email, amount, balance_after, type, description, created_at
          FROM token_transactions
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY created_at DESC
          LIMIT $${params.length - 1} OFFSET $${params.length}
        `;
        const txRes: any = await query(txQuery, params);
        transactions = (Array.isArray(txRes) ? txRes : (((txRes as any)?.rows) || []));

        const statsParams = isUuidOrInt ? [userId, cleanEmail] : [cleanEmail];
        const statsWhere = isUuidOrInt ? `(user_id = $1 OR user_email = $2)` : `user_email = $1`;
        const statsRes: any = await query(`
          SELECT 
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
            COUNT(*) as total_events
          FROM token_transactions
          WHERE ${statsWhere}
        `, statsParams);
        const sRow = (Array.isArray(statsRes) ? statsRes[0] : (statsRes as any)?.rows?.[0]);
        if (sRow) {
          stats = {
            totalDeducted: Number(sRow.total_deducted || 0),
            totalGranted: Number(sRow.total_granted || 0),
            totalEvents: Number(sRow.total_events || 0)
          };
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      balance: userBalance,
      tokenBalance: userBalance,
      walletBalance,
      tokenSymbol,
      tokenIcon,
      tokenName,
      isEnabled,
      costs,
      packages,
      transactions,
      page,
      totalPages,
      stats
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'purchase';
    const userId = body.userId;
    const userEmail = body.userEmail;

    if (action === 'purchase' || action === 'purchase_package') {
      const tokensToAdd = Number(body.tokens ?? body.tokenAmount ?? 0);
      const priceToDeduct = Number(body.price ?? body.priceDollars ?? 0);
      const packageName = body.packageName || 'Token Bundle';

      if (!userId && !userEmail) {
        return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
      }

      let user = null;
      if (userEmail) {
        const byEmail: any = await query(`SELECT id, email, token_balance, wallet_balance FROM users WHERE email = $1 LIMIT 1`, [userEmail]).catch(() => null);
        user = (Array.isArray(byEmail) ? byEmail[0] : (byEmail as any)?.rows?.[0]);
      }
      if (!user && userId) {
        const isUuidOrInt = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || /^\d+$/.test(userId);
        if (isUuidOrInt) {
          const byId: any = await query(`SELECT id, email, token_balance, wallet_balance FROM users WHERE id = $1 LIMIT 1`, [userId]).catch(() => null);
          user = (Array.isArray(byId) ? byId[0] : (byId as any)?.rows?.[0]);
        }
      }

      if (!user) {
        return NextResponse.json({ success: false, error: 'User account not found' }, { status: 404 });
      }

      const currentWallet = parseFloat(String(user.wallet_balance || 0));
      if (currentWallet < priceToDeduct) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient wallet balance. Short by $${(priceToDeduct - currentWallet).toFixed(2)}.` 
        }, { status: 400 });
      }

      const newWallet = currentWallet - priceToDeduct;
      const newTokens = (Number(user.token_balance) || 0) + tokensToAdd;

      await query(`
        UPDATE users 
        SET token_balance = $1, wallet_balance = $2, updated_at = NOW() 
        WHERE id = $3
      `, [newTokens, newWallet, user.id]);

      const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
      await query(`
        INSERT INTO token_transactions (id, user_id, user_email, amount, balance_after, type, description, created_at)
        VALUES ($1, $2, $3, $4, $5, 'purchase', $6, NOW())
      `, [txId, String(user.id), user.email, tokensToAdd, newTokens, `Purchased bundle: ${packageName}`]);

      return NextResponse.json({
        success: true,
        message: 'Tokens purchased successfully!',
        balance: newTokens,
        walletBalance: newWallet,
        tokensAdded: tokensToAdd,
        amountDeducted: priceToDeduct
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
