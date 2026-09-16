import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDataPaths(filename: string): string[] {
  const cwd = process.cwd();
  const paths: string[] = [];
  
  if (cwd.endsWith('apps/web') || cwd.endsWith('apps/web/')) {
    const root = path.resolve(cwd, '../..');
    paths.push(path.join(cwd, 'data', filename));
    paths.push(path.join(root, 'data', filename));
    paths.push(path.join(root, 'apps/web/data', filename));
  } else {
    paths.push(path.join(cwd, 'apps/web/data', filename));
    paths.push(path.join(cwd, 'data', filename));
  }
  return Array.from(new Set(paths));
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed) return parsed as T;
      } catch (_) {}
    }
  }
  return fallback;
}

function writeJsonFile<T>(filename: string, data: T): void {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

const PRIMARY_ADMIN = {
  id: 'usr_admin_1',
  name: 'System Administrator',
  email: 'admin@zecratary.com',
  role: 'admin',
  subscriptionPlan: 'nutrition-pro-annual',
  createdAt: '2026-01-01T00:00:00.000Z'
};

export async function GET() {
  let users = readJsonFile('users.json', [] as any[]);
  if (!Array.isArray(users)) users = [];

  // Self-Healing: Guarantee at least one administrator user exists
  const hasAdmin = users.some((u: any) => 
    u.id === 'usr_admin_1' || 
    String(u.email || '').toLowerCase() === 'admin@zecratary.com' ||
    String(u.role || '').toLowerCase() === 'admin'
  );

  if (!hasAdmin) {
    users.unshift(PRIMARY_ADMIN);
    writeJsonFile('users.json', users);
  } else {
    // Ensure primary admin role is locked to admin
    users = users.map((u: any) => {
      if (u.id === 'usr_admin_1' || String(u.email || '').toLowerCase() === 'admin@zecratary.com') {
        return { ...u, role: 'admin' };
      }
      return u;
    });
  }

  return NextResponse.json({
    success: true,
    users
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let currentUsers = readJsonFile('users.json', [] as any[]);
    if (!Array.isArray(currentUsers)) currentUsers = [];

    const cleanEmail = (body.email || '').trim().toLowerCase();
    const userId = body.id || 'usr_' + Date.now().toString(36);

    const userPayload = {
      ...body,
      id: userId,
      email: cleanEmail,
      createdAt: body.createdAt || new Date().toISOString()
    };

    const existingIdx = currentUsers.findIndex((u: any) => 
      (u.id && u.id === userId) || (u.email && u.email.toLowerCase() === cleanEmail)
    );

    if (existingIdx >= 0) {
      currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...userPayload };
    } else {
      currentUsers.unshift(userPayload);
    }

    // Guarantee primary admin remains intact
    if (!currentUsers.some((u: any) => u.id === 'usr_admin_1' || u.email?.toLowerCase() === 'admin@zecratary.com')) {
      currentUsers.unshift(PRIMARY_ADMIN);
    }

    writeJsonFile('users.json', currentUsers);

    return NextResponse.json({
      success: true,
      user: userPayload,
      users: currentUsers
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to persist user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let email = searchParams.get('email');

    if (!id && !email) {
      try {
        const body = await req.json();
        id = body.id;
        email = body.email;
      } catch (_) {}
    }

    if (id === 'usr_admin_1' || email?.toLowerCase() === 'admin@zecratary.com') {
      return NextResponse.json({ success: false, error: 'Primary administrator cannot be deleted' }, { status: 400 });
    }

    let currentUsers = readJsonFile('users.json', [] as any[]);
    const updated = currentUsers.filter((u: any) => {
      const matchId = id && u.id === id;
      const matchEmail = email && u.email && u.email.toLowerCase() === email.toLowerCase().trim();
      return !(matchId || matchEmail);
    });

    writeJsonFile('users.json', updated);

    return NextResponse.json({ success: true, users: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete user' }, { status: 500 });
  }
}
