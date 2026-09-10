import os
import glob

# Detect base source directory
base_web_dirs = ['src', 'apps/web/src']
base_dir = next((d for d in base_web_dirs if os.path.exists(d)), None)

if not base_dir:
    matches = glob.glob('**/app/layout.tsx', recursive=True)
    if matches:
        base_dir = os.path.dirname(os.path.dirname(matches[0]))

if not base_dir:
    print("❌ Error: Could not locate 'src' or 'apps/web/src' directory.")
    exit(1)

lib_dir = os.path.join(base_dir, 'lib')
os.makedirs(lib_dir, exist_ok=True)
social_auth_path = os.path.join(lib_dir, 'socialAuth.ts')

social_auth_code = """import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

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
  grokEnabled: true,
  grokClientId: 'grok_client_sample_99182',
  grokClientSecret: '',
  redirectUri: 'http://localhost:3000/api/auth/callback',
};

export function getSocialLoginConfig(): SocialLoginConfig {
  if (typeof window === 'undefined') return DEFAULT_SOCIAL_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_social_login_config');
    if (raw) {
      return { ...DEFAULT_SOCIAL_CONFIG, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT_SOCIAL_CONFIG;
}

export function saveSocialLoginConfig(cfg: SocialLoginConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zecratary_social_login_config', JSON.stringify(cfg));
  window.dispatchEvent(new Event('zecratary_social_login_updated'));
  window.dispatchEvent(new Event('storage'));
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
"""

with open(social_auth_path, 'w', encoding='utf-8') as f:
    f.write(social_auth_code)

print(f"✓ Successfully created {social_auth_path}")
