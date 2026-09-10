import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

export type SocialProvider = 'google' | 'github' | 'apple';

export interface SocialProfile {
  name: string;
  email: string;
  avatar?: string;
  provider: SocialProvider;
}

export function executeSocialAuth(profile: SocialProfile): User {
  initAuthStorage();
  const cleanEmail = profile.email.trim().toLowerCase();
  const rawUsers = localStorage.getItem('zecratary_users');
  const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

  let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!matchedUser) {
    matchedUser = {
      id: `usr_${profile.provider}_${Date.now().toString(36)}`,
      name: profile.name.trim() || `${profile.provider.toUpperCase()} User`,
      email: cleanEmail,
      role: 'user',
      subscriptionPlan: 'taster',
      subscriptionTier: 'taster',
      createdAt: new Date().toISOString(),
    };
    users.unshift(matchedUser);
    localStorage.setItem('zecratary_users', JSON.stringify(users));
  }

  setCurrentUser(matchedUser);

  window.dispatchEvent(new Event('zecratary_users_updated'));
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.dispatchEvent(new Event('storage'));

  return matchedUser;
}
