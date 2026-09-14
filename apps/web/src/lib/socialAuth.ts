import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

export type SocialProvider = 'google' | 'facebook' | 'apple' | 'github';

export interface SocialLoginConfig {
  googleEnabled: boolean;
  googleClientId: string;
  facebookEnabled: boolean;
  facebookClientId: string;
  appleEnabled: boolean;
  appleClientId: string;
}

export const DEFAULT_SOCIAL_CONFIG: SocialLoginConfig = {
  googleEnabled: true,
  googleClientId: '',
  facebookEnabled: false,
  facebookClientId: '',
  appleEnabled: false,
  appleClientId: '',
};

export function getSocialLoginConfig(): SocialLoginConfig {
  if (typeof window === 'undefined') return DEFAULT_SOCIAL_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_social_login_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        googleEnabled: parsed.googleEnabled ?? true,
        googleClientId: parsed.googleClientId || '',
        facebookEnabled: parsed.facebookEnabled ?? false,
        facebookClientId: parsed.facebookClientId || '',
        appleEnabled: parsed.appleEnabled ?? false,
        appleClientId: parsed.appleClientId || '',
      };
    }
  } catch (_) {}
  return DEFAULT_SOCIAL_CONFIG;
}

export function getDefaultSubscriptionPlan(): string {
  if (typeof window === 'undefined') return 'taster';
  try {
    const explicitDefault = localStorage.getItem('zecratary_default_plan');
    if (explicitDefault) return explicitDefault;

    const rawConfigs = localStorage.getItem('zecratary_subscription_configs');
    if (rawConfigs) {
      const configs = JSON.parse(rawConfigs);
      if (Array.isArray(configs) && configs.length > 0) {
        const defaultPlan = configs.find((c: any) => c.isDefault);
        if (defaultPlan?.slug || defaultPlan?.id) return defaultPlan.slug || defaultPlan.id;

        const freePlan = configs.find(
          (c: any) => c.isFree || (Number(c.monthlyPriceDollars || 0) === 0 && Number(c.annualPriceDollars || 0) === 0)
        );
        if (freePlan?.slug || freePlan?.id) return freePlan.slug || freePlan.id;

        if (configs[0]?.slug || configs[0]?.id) return configs[0].slug || configs[0].id;
      }
    }

    const rawPlans = localStorage.getItem('zecratary_subscription_plans');
    if (rawPlans) {
      const plans = JSON.parse(rawPlans);
      if (Array.isArray(plans) && plans.length > 0) {
        const free = plans.find((p: any) => p.priceCents === 0 || p.isFree);
        if (free?.slug || free?.id) return free.slug || free.id;
      }
    }
  } catch (_) {}
  return 'taster';
}

export interface SocialProfile {
  name: string;
  email: string;
  avatar?: string;
  provider: SocialProvider;
}

export function decodeGoogleCredential(credential: string): { email: string; name: string; avatar?: string } | null {
  try {
    const base64Url = credential.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      email: payload.email,
      name: payload.name || payload.given_name || payload.email.split('@')[0],
      avatar: payload.picture,
    };
  } catch (err) {
    return null;
  }
}

export function executeSocialAuth(profile: SocialProfile): User {
  initAuthStorage();
  const cleanEmail = profile.email.trim().toLowerCase();
  const rawUsers = localStorage.getItem('zecratary_users');
  const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

  let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!matchedUser) {
    const systemDefaultPlan = getDefaultSubscriptionPlan();
    matchedUser = {
      id: `usr_${profile.provider}_${Date.now().toString(36)}`,
      name: profile.name.trim() || `${profile.provider.toUpperCase()} User`,
      email: cleanEmail,
      role: 'user',
      subscriptionPlan: systemDefaultPlan,
      subscriptionTier: systemDefaultPlan,
      createdAt: new Date().toISOString(),
      avatar: profile.avatar,
    } as any;
    users.unshift(matchedUser);
    localStorage.setItem('zecratary_users', JSON.stringify(users));
  }

  setCurrentUser(matchedUser);

  try {
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchedUser),
    }).catch(() => {});
  } catch (_) {}

  window.dispatchEvent(new Event('zecratary_users_updated'));
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.dispatchEvent(new Event('storage'));

  return matchedUser;
}
