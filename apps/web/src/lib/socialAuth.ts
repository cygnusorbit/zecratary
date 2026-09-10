import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

export type SocialProvider = 'google' | 'facebook' | 'grok';

export interface SocialLoginConfig {
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  facebookEnabled: boolean;
  facebookAppId: string;
  facebookAppSecret: string;
  grokEnabled: boolean;
  grokClientId: string;
  grokClientSecret: string;
  redirectUri: string;
}

export const DEFAULT_SOCIAL_CONFIG: SocialLoginConfig = {
  googleEnabled: true,
  googleClientId: '782910481234-samplegoogleclientid.apps.googleusercontent.com',
  googleClientSecret: '',
  facebookEnabled: true,
  facebookAppId: '109283746592810',
  facebookAppSecret: '',
  grokEnabled: false,
  grokClientId: 'grok_client_sample_99182',
  grokClientSecret: '',
  redirectUri: 'http://localhost:3000/api/auth/callback',
};

function parseStrictBool(val: any, fallback: boolean): boolean {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'false' || s === '0' || s === 'off') return false;
    if (s === 'true' || s === '1' || s === 'on') return true;
  }
  return Boolean(val);
}

export function getSocialLoginConfig(): SocialLoginConfig {
  if (typeof window === 'undefined') return DEFAULT_SOCIAL_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_social_login_config') || localStorage.getItem('zecratary_social_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        googleEnabled: parseStrictBool(parsed.googleEnabled, DEFAULT_SOCIAL_CONFIG.googleEnabled),
        googleClientId: parsed.googleClientId || DEFAULT_SOCIAL_CONFIG.googleClientId,
        googleClientSecret: parsed.googleClientSecret || '',
        facebookEnabled: parseStrictBool(parsed.facebookEnabled, DEFAULT_SOCIAL_CONFIG.facebookEnabled),
        facebookAppId: parsed.facebookAppId || DEFAULT_SOCIAL_CONFIG.facebookAppId,
        facebookAppSecret: parsed.facebookAppSecret || '',
        grokEnabled: parseStrictBool(parsed.grokEnabled, false),
        grokClientId: parsed.grokClientId || DEFAULT_SOCIAL_CONFIG.grokClientId,
        grokClientSecret: parsed.grokClientSecret || '',
        redirectUri: parsed.redirectUri || DEFAULT_SOCIAL_CONFIG.redirectUri,
      };
    }
  } catch (_) {}
  return DEFAULT_SOCIAL_CONFIG;
}

export function broadcastConfigUpdate(cfg: SocialLoginConfig): void {
  if (typeof window === 'undefined') return;
  const normalized: SocialLoginConfig = {
    ...cfg,
    googleEnabled: parseStrictBool(cfg.googleEnabled, false),
    facebookEnabled: parseStrictBool(cfg.facebookEnabled, false),
    grokEnabled: parseStrictBool(cfg.grokEnabled, false),
  };
  const json = JSON.stringify(normalized);
  localStorage.setItem('zecratary_social_login_config', json);
  localStorage.setItem('zecratary_social_config', json);

  // Broadcast to same tab
  window.dispatchEvent(new Event('zecratary_social_login_updated'));
  window.dispatchEvent(new Event('storage'));

  // Broadcast to all other tabs instantly
  try {
    const channel = new BroadcastChannel('zecratary_social_channel');
    channel.postMessage({ type: 'CONFIG_UPDATED', config: normalized });
    channel.close();
  } catch (_) {}
}

export function saveSocialLoginConfig(cfg: SocialLoginConfig): void {
  broadcastConfigUpdate(cfg);
}

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
