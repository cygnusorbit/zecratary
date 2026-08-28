import os

os.makedirs("apps/web/src/lib", exist_ok=True)

auth_lib_code = """'use client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  password?: string;
  createdAt?: string;
}

const DEFAULT_ADMIN_USER: User = {
  id: 'admin_1',
  name: 'Admin User',
  email: 'admin@foodieprep.io',
  role: 'admin',
  password: 'password123',
  createdAt: '2026-08-24T00:00:00.000Z',
};

const DEFAULT_USERS: User[] = [
  DEFAULT_ADMIN_USER,
  {
    id: 'user_1',
    name: 'Sample User',
    email: 'user@foodieprep.io',
    role: 'user',
    password: 'password123',
    createdAt: '2026-08-25T00:00:00.000Z',
  }
];

export const initAuthStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!localStorage.getItem('zecratary_users')) {
      localStorage.setItem('zecratary_users', JSON.stringify(DEFAULT_USERS));
    }
    const current = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
    if (!current) {
      localStorage.setItem('zecratary_current_user', JSON.stringify(DEFAULT_ADMIN_USER));
      localStorage.setItem('zecratary_user', JSON.stringify(DEFAULT_ADMIN_USER));
    }
  } catch (e) {
    console.error('Failed to initialize auth storage', e);
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') {
    return DEFAULT_ADMIN_USER;
  }
  try {
    initAuthStorage();
    const stored = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_ADMIN_USER;
  } catch (e) {
    return DEFAULT_ADMIN_USER;
  }
};

export const setCurrentUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('zecratary_current_user', JSON.stringify(user));
    localStorage.setItem('zecratary_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('zecratary_current_user');
    localStorage.removeItem('zecratary_user');
  }
  window.dispatchEvent(new Event('zecratary_auth_changed'));
};

export const logoutUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('zecratary_current_user');
  localStorage.removeItem('zecratary_user');
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.location.reload();
};
"""

with open("apps/web/src/lib/auth.ts", "w", encoding="utf-8") as f:
    f.write(auth_lib_code)

print("✅ apps/web/src/lib/auth.ts updated with exported initAuthStorage helper!")
