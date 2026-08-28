import os

os.makedirs("apps/web/src/lib", exist_ok=True)

auth_lib_code = """'use client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const DEFAULT_ADMIN_USER: User = {
  id: 'admin_1',
  name: 'Admin User',
  email: 'admin@foodieprep.io',
  role: 'admin',
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') {
    return DEFAULT_ADMIN_USER;
  }
  try {
    const stored = localStorage.getItem('zecratary_user');
    if (stored) {
      return JSON.parse(stored);
    }
    localStorage.setItem('zecratary_user', JSON.stringify(DEFAULT_ADMIN_USER));
    return DEFAULT_ADMIN_USER;
  } catch (e) {
    return DEFAULT_ADMIN_USER;
  }
};

export const setCurrentUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('zecratary_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('zecratary_user');
  }
  window.dispatchEvent(new Event('zecratary_auth_changed'));
};

export const logoutUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('zecratary_user');
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.location.reload();
};
"""

with open("apps/web/src/lib/auth.ts", "w", encoding="utf-8") as f:
    f.write(auth_lib_code)

print("✅ apps/web/src/lib/auth.ts successfully created!")
