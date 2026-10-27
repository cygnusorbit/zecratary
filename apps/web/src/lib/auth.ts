// Synchronized Auth Library for Zecratary
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  provider?: string;
  token_balance?: number;
  tokenBalance?: number;
  wallet_balance?: number;
  subscription_plan?: string;
  subscriptionPlan?: string;
  password?: string;
  [key: string]: any;
}

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'System Administrator',
    email: 'admin@zecratary.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    provider: 'local',
    token_balance: 1000000,
    subscription_plan: 'nutrition-pro',
    password: 'admin'
  },
  {
    id: 'usr_demo_1',
    name: 'Chef Jordan',
    email: 'user@zecratary.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    provider: 'local',
    token_balance: 50000,
    subscription_plan: 'taster',
    password: 'password'
  }
];

export function initAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    let current = localStorage.getItem('zecratary_current_user');
    
    // Cookie-to-LocalStorage Hydration Bridge
    if (!current || current === 'null' || current === '{}') {
      const cookieMatches = [
        document.cookie.match(/(?:^|;\s*)zecratary_session=([^;]+)/),
        document.cookie.match(/(?:^|;\s*)zecratary_current_user=([^;]+)/),
        document.cookie.match(/(?:^|;\s*)zecratary_auth_session=([^;]+)/),
        document.cookie.match(/(?:^|;\s*)currentUser=([^;]+)/)
      ];
      
      for (const m of cookieMatches) {
        if (m && m[1]) {
          try {
            const decoded = decodeURIComponent(m[1]);
            const parsed = JSON.parse(decoded);
            if (parsed && parsed.email) {
              localStorage.setItem('zecratary_current_user', JSON.stringify(parsed));
              current = JSON.stringify(parsed);
              break;
            }
          } catch (_) {}
        }
      }
    }

    if (!localStorage.getItem('zecratary_users')) {
      localStorage.setItem('zecratary_users', JSON.stringify(DEFAULT_USERS));
    }
  } catch (_) {}
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_current_user');
    if (raw && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }

    // Direct cookie evaluation fallback
    const cookieMatches = [
      document.cookie.match(/(?:^|;\s*)zecratary_session=([^;]+)/),
      document.cookie.match(/(?:^|;\s*)zecratary_current_user=([^;]+)/),
      document.cookie.match(/(?:^|;\s*)currentUser=([^;]+)/)
    ];
    for (const m of cookieMatches) {
      if (m && m[1]) {
        try {
          const parsed = JSON.parse(decodeURIComponent(m[1]));
          if (parsed && parsed.email) {
            localStorage.setItem('zecratary_current_user', JSON.stringify(parsed));
            return parsed;
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      const keys = ['zecratary_current_user', 'zecratary_session', 'zecratary_auth_session', 'currentUser', 'user'];
      keys.forEach(k => {
        localStorage.removeItem(k);
        document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
      });
      return;
    }

    const raw = JSON.stringify(user);
    const encoded = encodeURIComponent(raw);
    const keys = ['zecratary_current_user', 'zecratary_session', 'zecratary_auth_session', 'currentUser'];
    
    keys.forEach(k => {
      localStorage.setItem(k, raw);
      document.cookie = `${k}=${encoded}; path=/; max-age=604800; SameSite=Lax`;
    });
  } catch (_) {}
}

export function loginUser(email: string, password?: string): User | null {
  if (typeof window === 'undefined') return null;
  initAuthStorage();
  try {
    const cleanEmail = email.toLowerCase().trim();
    let storedUsers: User[] = [];
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try { storedUsers = JSON.parse(raw); } catch (_) {}
    }
    const combined = [...DEFAULT_USERS, ...storedUsers];
    const match = combined.find(u => u.email.toLowerCase().trim() === cleanEmail);
    
    if (match) {
      if (password && match.password && match.password !== password.trim()) {
        return null;
      }
      const safe: User = { ...match };
      delete (safe as any).password;
      setCurrentUser(safe);
      return safe;
    }
  } catch (_) {}
  return null;
}

export function logoutUser(): void {
  setCurrentUser(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('zecratary_auth_changed'));
  }
}
