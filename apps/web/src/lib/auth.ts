'use client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  password?: string;
  createdAt: string;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'System Admin',
    email: 'admin@zecratary.com',
    password: 'admin',
    role: 'admin',
    createdAt: '2026-08-24T00:00:00.000Z'
  },
  {
    id: 'usr_demo_1',
    name: 'Demo User',
    email: 'user@zecratary.com',
    password: 'user123',
    role: 'user',
    createdAt: '2026-08-25T00:00:00.000Z'
  }
];

export const initAuthStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    const existing = localStorage.getItem('zecratary_users');
    if (!existing) {
      localStorage.setItem('zecratary_users', JSON.stringify(DEFAULT_USERS));
    }
  } catch (e) {
    console.error('Failed to initialize auth storage', e);
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    // seed removed to prevent auto-login loop);
    if (typeof document !== 'undefined') { document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`; }
    // seed removed to prevent auto-login loop);
  } else {
    localStorage.removeItem('zecratary_current_user');
    if (typeof document !== 'undefined') { document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;'; }
    localStorage.removeItem('zecratary_user');
  }
  window.dispatchEvent(new Event('zecratary_auth_changed'));
};

export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('zecratary_current_user');
      localStorage.removeItem('zecratary_user');
      localStorage.removeItem('zecratary_admin_impersonator');
      sessionStorage.clear();
      document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
      document.cookie = 'zecratary_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
    } catch (_) {}
    window.dispatchEvent(new Event('zecratary_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/login';
  }
}

// Edge Middleware Cookie Synchronization
export function syncSessionCookie(user: User | null): void {
  if (typeof document === 'undefined') return;
  if (user) {
    const payload = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    }));
    document.cookie = `zecratary_session=${payload}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
  }
}
