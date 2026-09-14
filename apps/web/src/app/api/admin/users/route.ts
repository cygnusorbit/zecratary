import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getUsersFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'users.json');
}

function getDeletedFilePath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'deleted_users.json');
}

const DEFAULT_USERS = [
  {
    id: 'usr_admin_1',
    name: 'Administrator',
    email: 'admin@foodieprep.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    subscriptionTier: 'nutrition-pro-annual',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_admin_2',
    name: 'System Admin',
    email: 'admin@zecratary.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    subscriptionTier: 'nutrition-pro-annual',
    createdAt: new Date().toISOString()
  }
];

function readUsers(): any[] {
  const filePath = getUsersFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) return JSON.parse(raw);
    } catch (_) {}
  }
  return [...DEFAULT_USERS];
}

function writeUsers(users: any[]) {
  const filePath = getUsersFilePath();
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
}

function readDeleted(): string[] {
  const filePath = getDeletedFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) return JSON.parse(raw);
    } catch (_) {}
  }
  return [];
}

function writeDeleted(list: string[]) {
  const filePath = getDeletedFilePath();
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const deletedList = readDeleted();
    const deletedSet = new Set(deletedList.map(s => s.toLowerCase().trim()));
    const rawUsers = readUsers();

    const activeUsers = rawUsers.filter((u: any) => {
      if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
      if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
      return true;
    });

    return NextResponse.json({ success: true, users: activeUsers, deletedUsers: deletedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const users = readUsers();
    let deletedList = readDeleted();
    const incomingList = Array.isArray(body) ? body : [body];

    // Remove incoming created users from tombstone list
    const incomingEmails = new Set(incomingList.map(u => (u.email || '').toLowerCase().trim()));
    const incomingIds = new Set(incomingList.map(u => (u.id || '').toLowerCase().trim()));
    deletedList = deletedList.filter(d => {
      const lower = d.toLowerCase().trim();
      return !incomingEmails.has(lower) && !incomingIds.has(lower);
    });
    writeDeleted(deletedList);

    for (const incoming of incomingList) {
      if (!incoming || !incoming.email) continue;
      const cleanEmail = incoming.email.trim().toLowerCase();
      const existingIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

      const userRecord = {
        id: incoming.id || `usr_${Date.now().toString(36)}`,
        name: incoming.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: incoming.password || 'password123',
        role: incoming.role || 'user',
        subscriptionPlan: incoming.subscriptionPlan || incoming.subscriptionTier || 'taster',
        subscriptionTier: incoming.subscriptionTier || incoming.subscriptionPlan || 'taster',
        createdAt: incoming.createdAt || new Date().toISOString(),
        ...incoming
      };

      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...userRecord };
      } else {
        users.unshift(userRecord);
      }
    }

    writeUsers(users);
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, email } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanId = (id || '').trim().toLowerCase();

    // Guard: Only usr_admin_1 is permanently protected from deletion
    if (cleanId === 'usr_admin_1' || id === 'usr_admin_1') {
      return NextResponse.json(
        { success: false, error: 'The primary system administrator account (usr_admin_1) cannot be deleted.' },
        { status: 403 }
      );
    }

    const deletedList = readDeleted();
    if (cleanEmail && !deletedList.includes(cleanEmail)) deletedList.push(cleanEmail);
    if (cleanId && !deletedList.includes(cleanId)) deletedList.push(cleanId);
    writeDeleted(deletedList);

    let users = readUsers();
    users = users.filter((u: any) => {
      if (cleanId && u.id && u.id.toLowerCase() === cleanId) return false;
      if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return false;
      return true;
    });
    writeUsers(users);

    return NextResponse.json({ success: true, deleted: { id, email }, deletedUsers: deletedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
