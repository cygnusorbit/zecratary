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
    localStorage.setItem('zecratary_current_user', JSON.stringify(user));
  document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;
    localStorage.setItem('zecratary_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('zecratary_current_user');
  document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('zecratary_user');
  }
  window.dispatchEvent(new Event('zecratary_auth_changed'));
};

export const logoutUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('zecratary_current_user');
  document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  localStorage.removeItem('zecratary_user');
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.location.href = '/login';
};
