// Central Authentication Engine for Zecratary
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  subscriptionPlan?: string;
  subscriptionTier?: string;
  createdAt?: string;
  linkedProviders?: string[];
}

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin_default',
    name: 'Administrator',
    email: 'admin@foodieprep.com',
    password: 'admin',
    role: 'admin',
    subscriptionPlan: 'nutrition_pro',
    subscriptionTier: 'nutrition_pro',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_admin_alias',
    name: 'Admin User',
    email: 'admin@zecratary.com',
    password: 'admin',
    role: 'admin',
    subscriptionPlan: 'nutrition_pro',
    subscriptionTier: 'nutrition_pro',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_standard_default',
    name: 'Standard User',
    email: 'user@foodieprep.com',
    password: 'password',
    role: 'user',
    subscriptionPlan: 'taster',
    subscriptionTier: 'taster',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_standard_alias',
    name: 'Demo Member',
    email: 'user@example.com',
    password: 'password',
    role: 'user',
    subscriptionPlan: 'taster',
    subscriptionTier: 'taster',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export function purgeSessionCookies(): void {
  if (typeof document === 'undefined') return;
  const pastDate = 'Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = `zecratary_session=; Path=/; Expires=${pastDate}; Max-Age=0; SameSite=Lax;`;
  document.cookie = `zecratary_session=; Path=/; Expires=${pastDate}; Max-Age=0;`;
  document.cookie = `zecratary_session=; Expires=${pastDate}; Max-Age=0; SameSite=Lax;`;
  document.cookie = `zecratary_session=; Expires=${pastDate}; Max-Age=0;`;
}

export function syncSessionCookie(user: User | null): void {
  if (typeof document === 'undefined') return;
  if (user && (user.email || user.id)) {
    const payload = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name || ''
    }));
    document.cookie = `zecratary_session=${payload}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    purgeSessionCookies();
  }
}

export function isSessionCookieValid(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\s*)zecratary_session=([^;]+)/);
  if (!match || !match[1]) return false;
  try {
    const raw = decodeURIComponent(match[1]).trim();
    if (!raw || raw === '""' || raw === '{}') return false;
    const session = JSON.parse(raw);
    return Boolean(session && (session.email || session.id));
  } catch (_) {
    return false;
  }
}

export function initAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const rawUsers = localStorage.getItem('zecratary_users');
    let users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

    // Ensure all default admin & standard users exist in registry
    let updated = false;
    for (const def of DEFAULT_USERS) {
      if (!users.some(u => u.email.toLowerCase() === def.email.toLowerCase())) {
        users.push(def);
        updated = true;
      }
    }
    if (updated || !rawUsers) {
      localStorage.setItem('zecratary_users', JSON.stringify(users));
    }
  } catch (_) {}
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('zecratary_current_user', JSON.stringify(user));
    localStorage.setItem('zecratary_user', JSON.stringify(user));
    syncSessionCookie(user);
    window.dispatchEvent(new Event('zecratary_auth_changed'));
    window.dispatchEvent(new Event('storage'));
  }
}

export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('zecratary_current_user');
      localStorage.removeItem('zecratary_user');
      localStorage.removeItem('zecratary_admin_impersonator');
      sessionStorage.clear();
      purgeSessionCookies();
    } catch (_) {}
    window.dispatchEvent(new Event('zecratary_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    window.location.replace('/login');
  }
}

export function authenticateUser(emailInput: string, passInput: string): { success: boolean; user?: User; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Server context' };
  try {
    initAuthStorage();
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPass = (passInput || '').trim();

    const raw = localStorage.getItem('zecratary_users');
    const users: User[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];

    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    // Fallback: Check built-in defaults
    if (!user) {
      user = DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      if (user) {
        users.push(user);
        localStorage.setItem('zecratary_users', JSON.stringify(users));
      }
    }

    if (!user) {
      return { success: false, error: 'Invalid email address or password.' };
    }

    // Password validation: allows 'admin' or 'admin123' for admins, 'password' or 'password123' for users
    const validPass = user.password || (user.role === 'admin' ? 'admin' : 'password');
    const isPassValid = 
      cleanPass === validPass ||
      (user.role === 'admin' && (cleanPass === 'admin' || cleanPass === 'admin123')) ||
      (user.role === 'user' && (cleanPass === 'password' || cleanPass === 'password123'));

    if (!isPassValid) {
      return { success: false, error: 'Invalid email address or password.' };
    }

    setCurrentUser(user);
    return { success: true, user };
  } catch (e: any) {
    return { success: false, error: e.message || 'Authentication failed.' };
  }
}
