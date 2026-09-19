import { NextRequest, NextResponse } from 'next/server';
import { 
  getTokenSettings, 
  getUserTokenBalance, 
  addTokensToUser, 
  syncUserMonthlyTokens 
} from '@/lib/tokenService';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');
    let email = searchParams.get('email')?.toLowerCase().trim();

    if (!userId && !email) {
      const cookieHeader = req.cookies.get('zecratary_session')?.value;
      if (cookieHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieHeader));
          userId = parsed.id;
          email = parsed.email?.toLowerCase().trim();
        } catch (_) {}
      }
    }

    if (userId || email) {
      await syncUserMonthlyTokens(userId, email);
    }

    const settings = await getTokenSettings();
    const balance = await getUserTokenBalance(userId, email);

    // Fetch AI settings and restrictions from PostgreSQL admin_settings
    let aiSettings = {
      model: 'gemini-3.5-flash-lite',
      provider: 'gemini',
      enableWebSearch: true,
      strictDietEnforcement: false,
      filterWordsList: [] as string[],
      customVocabularyList: [] as string[],
      maxTokens: 4096
    };

    try {
      const sRows = await query('SELECT chef_ai_settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
      if (sRows.length > 0 && sRows[0].chef_ai_settings) {
        const c = sRows[0].chef_ai_settings;
        aiSettings = {
          model: c.model || 'gemini-3.5-flash-lite',
          provider: c.provider || 'gemini',
          enableWebSearch: c.enableWebSearch !== false,
          strictDietEnforcement: Boolean(c.strictDietEnforcement),
          filterWordsList: Array.isArray(c.filterWordsList) ? c.filterWordsList : [],
          customVocabularyList: Array.isArray(c.customVocabularyList) ? c.customVocabularyList : [],
          maxTokens: Number(c.maxTokens) || 4096
        };
      }
    } catch (dbErr) {
      console.warn('Could not read chef_ai_settings:', dbErr);
    }

    let transactions: any[] = [];
    if (userId || email) {
      try {
        transactions = await query(`
          SELECT id, amount, balance_after, type, description, created_at
          FROM token_transactions
          WHERE user_id = $1 OR LOWER(user_email) = LOWER($2)
          ORDER BY created_at DESC
          LIMIT 10
        `, [userId || 'none', email || 'none']);
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      balance,
      tokenName: settings.tokenName,
      tokenSymbol: settings.tokenSymbol,
      costs: {
        chef: settings.chefCost,
        importUrl: settings.importUrlCost,
        importText: settings.importTextCost,
        importPhoto: settings.importPhotoCost
      },
      packages: settings.packages,
      isEnabled: settings.isEnabled,
      aiSettings,
      transactions
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, packageId, userId, userEmail } = body;

    const settings = await getTokenSettings();

    if (action === 'purchase') {
      const pkg = settings.packages.find(p => p.id === packageId);
      if (!pkg) {
        return NextResponse.json({ success: false, error: 'Token package not found' }, { status: 404 });
      }

      const newBalance = await addTokensToUser({
        userId,
        userEmail,
        amount: pkg.tokens,
        type: 'package_purchase',
        description: `Purchased ${pkg.name} (+${pkg.tokens} ${settings.tokenSymbol} for $${pkg.price})`
      });

      return NextResponse.json({
        success: true,
        message: `Successfully added ${pkg.tokens} ${settings.tokenSymbol} to your balance!`,
        newBalance,
        package: pkg
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid token action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
