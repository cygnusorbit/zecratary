import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_ADMIN = {
  id: 'usr_admin_1',
  name: 'System Administrator',
  email: 'admin@zecratary.com',
  role: 'admin',
  subscriptionPlan: 'nutrition-pro-annual',
  createdAt: '2026-01-01T00:00:00.000Z'
};

const JSON_STORES = [
  path.join(process.cwd(), 'apps', 'web', 'data', 'users.json'),
  path.join(process.cwd(), 'data', 'users.json')
];

function readJsonUsers(): any[] {
  for (const p of JSON_STORES) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.users)) return parsed.users;
      } catch (_) {}
    }
  }
  return [DEFAULT_ADMIN];
}

function writeJsonUsers(users: any[]) {
  for (const p of JSON_STORES) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(users, null, 2), 'utf-8');
    } catch (_) {}
  }
}

export async function GET() {
  let usersList: any[] = readJsonUsers();

  // Try PostgreSQL or MySQL if available
  try {
    const { getDbPool } = await import('@/lib/db').catch(() => ({ getDbPool: null as any }));
    if (typeof getDbPool === 'function') {
      const pool = await getDbPool();
      if (pool) {
        const res = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
        const rows = res.rows || res[0] || [];
        if (Array.isArray(rows) && rows.length > 0) {
          usersList = rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            role: r.role,
            subscriptionPlan: r.subscription_plan || r.subscriptionPlan || 'taster',
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          }));
        }
      }
    }
  } catch (_) {}

  // Guarantee usr_admin_1 invariant
  const hasRootAdmin = usersList.some(
    u => u.id === 'usr_admin_1' || u.email?.toLowerCase() === 'admin@zecratary.com'
  );
  if (!hasRootAdmin) {
    usersList.unshift(DEFAULT_ADMIN);
    writeJsonUsers(usersList);
  }

  return NextResponse.json({ success: true, users: usersList }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    let usersList: any[] = readJsonUsers();

    const cleanEmail = (payload.email || '').toLowerCase().trim();
    const cleanId = payload.id || 'usr_' + Date.now().toString(36);
    const assignedPlan = payload.subscriptionPlan || payload.subscription_plan || 'taster';
    const isRoot = cleanId === 'usr_admin_1' || cleanEmail === 'admin@zecratary.com';
    const role = isRoot ? 'admin' : (payload.role || 'user');

    const normalized = {
      id: cleanId,
      name: payload.name || 'User',
      email: cleanEmail,
      password: payload.password,
      role: role,
      subscriptionPlan: assignedPlan,
      createdAt: payload.createdAt || payload.created_at || new Date().toISOString()
    };

    const existingIndex = usersList.findIndex(
      u => u.id === cleanId || (u.email && u.email.toLowerCase() === cleanEmail)
    );

    if (existingIndex >= 0) {
      usersList[existingIndex] = {
        ...usersList[existingIndex],
        ...normalized,
        password: normalized.password || usersList[existingIndex].password
      };
    } else {
      usersList.unshift(normalized);
    }

    // Persist to relational DB if available
    try {
      const { getDbPool } = await import('@/lib/db').catch(() => ({ getDbPool: null as any }));
      if (typeof getDbPool === 'function') {
        const pool = await getDbPool();
        if (pool) {
          const sql = `
            INSERT INTO users (id, name, email, role, subscription_plan, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              role = EXCLUDED.role,
              subscription_plan = EXCLUDED.subscription_plan;
          `;
          await pool.query(sql, [
            normalized.id,
            normalized.name,
            normalized.email,
            normalized.role,
            normalized.subscriptionPlan,
            normalized.createdAt
          ]).catch(() => {});
        }
      }
    } catch (_) {}

    writeJsonUsers(usersList);

    return NextResponse.json({ success: true, users: usersList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const queryEmail = searchParams.get('email');

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch (_) {}

    const targetId = queryId || bodyData.id;
    const targetEmail = (queryEmail || bodyData.email || '').toLowerCase().trim();

    if (targetId === 'usr_admin_1' || targetEmail === 'admin@zecratary.com') {
      return NextResponse.json({ error: 'Primary administrator cannot be deleted.' }, { status: 403 });
    }

    let usersList: any[] = readJsonUsers();
    usersList = usersList.filter(u => {
      const matchId = targetId && u.id === targetId;
      const matchEmail = targetEmail && u.email && u.email.toLowerCase() === targetEmail;
      return !(matchId || matchEmail);
    });

    // Remove from DB if connected
    try {
      const { getDbPool } = await import('@/lib/db').catch(() => ({ getDbPool: null as any }));
      if (typeof getDbPool === 'function') {
        const pool = await getDbPool();
        if (pool) {
          await pool.query('DELETE FROM users WHERE id = $1 OR email = $2', [targetId, targetEmail]).catch(() => {});
        }
      }
    } catch (_) {}

    writeJsonUsers(usersList);

    return NextResponse.json({ success: true, users: usersList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
