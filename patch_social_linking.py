import os

# 1. Locate the Profile Page
target_paths = [
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx'
]
profile_path = next((p for p in target_paths if os.path.exists(p)), None)

if not profile_path:
    print("❌ Error: Could not locate profile/page.tsx")
    exit(1)

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'getSocialLoginConfig' in content:
    print("⚠ Social linking appears to be already installed in this file.")
    exit(0)

# --- 2. Injections ---

# Injection A: Imports
old_imports = "import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';"
new_imports = """import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { SocialProvider, getSocialLoginConfig, SocialLoginConfig, DEFAULT_SOCIAL_CONFIG } from '@/lib/socialAuth';"""
content = content.replace(old_imports, new_imports)

# Injection B: State Variables
old_state = "const [successMsg, setSuccessMsg] = useState('');"
new_state = """const [successMsg, setSuccessMsg] = useState('');
  
  // Social Linking State
  const [socialConfig, setSocialConfig] = useState<SocialLoginConfig>(DEFAULT_SOCIAL_CONFIG);
  const [linkedProviders, setLinkedProviders] = useState<SocialProvider[]>([]);
  const [socialActionLoading, setSocialActionLoading] = useState<SocialProvider | null>(null);"""
content = content.replace(old_state, new_state)

# Injection C: Load Link Configurations inside Active User Reload
old_link_state = "setUserState(matchedUser);"
new_link_state = """setUserState(matchedUser);
    setLinkedProviders((matchedUser as any).linkedProviders || []);"""
content = content.replace(old_link_state, new_link_state)

# Injection D: Fetch Global Admin Layout API on mount
old_effect = """    document.title = `${t('accountProfileTitle') || 'Account Profile'} - Zecratary`;
    syncPlansFromAdmin();
    reloadActiveUser();"""
new_effect = """    document.title = `${t('accountProfileTitle') || 'Account Profile'} - Zecratary`;
    syncPlansFromAdmin();
    reloadActiveUser();

    fetch('/api/social-config')
      .then(res => res.json())
      .then(data => setSocialConfig(data))
      .catch(() => setSocialConfig(getSocialLoginConfig()));"""
content = content.replace(old_effect, new_effect)

# Injection E: Social Link/Unlink Action Handler
old_handler = "  if (!user) {"
new_handler = """  const handleToggleSocialLink = (provider: SocialProvider) => {
    if (!user) return;
    setSocialActionLoading(provider);
    
    setTimeout(() => {
      const isLinked = linkedProviders.includes(provider);
      const updatedLinks = isLinked ? linkedProviders.filter(p => p !== provider) : [...linkedProviders, provider];
      
      const rawUsers = localStorage.getItem('zecratary_users');
      const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];
      
      const updatedUser = { ...user, linkedProviders: updatedLinks };
      const updatedList = users.map(u => u.id === user.id ? updatedUser : u);
      
      localStorage.setItem('zecratary_users', JSON.stringify(updatedList));
      setCurrentUser(updatedUser as any);
      setUserState(updatedUser as any);
      setLinkedProviders(updatedLinks);
      
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));
      
      setSuccessMsg(`Successfully ${isLinked ? 'unlinked' : 'linked'} your ${provider.toUpperCase()} account.`);
      setSocialActionLoading(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 600);
  };

  if (!user) {"""
content = content.replace(old_handler, new_handler)

# Injection F: Social UI Card Injection (Right above Membership logic)
old_jsx = "{/* UPGRADE OR CHANGE MEMBERSHIP PLAN */}"
new_jsx = """{/* CONNECTED ACCOUNTS CARD */}
      {(socialConfig.googleEnabled || socialConfig.facebookEnabled || socialConfig.appleEnabled) && (
        <div 
          className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <div>
              <h2 className="text-xl font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Shield className="h-5 w-5 text-indigo-400" />
                Connected Social Accounts
              </h2>
              <p className="text-xs mt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                Link your social profiles to enable one-click sign-in. Disconnecting will require your standard email and password for future logins.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {socialConfig.googleEnabled && (
              <div className="border rounded-2xl p-4 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b', backgroundColor: isDayMode ? '#f8fafc' : '#0B101D' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: linkedProviders.includes('google') ? '#10b981' : (isDayMode ? '#94a3b8' : '#64748b') }}>
                      {linkedProviders.includes('google') ? 'Connected' : 'Not connected'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSocialLink('google')}
                  disabled={socialActionLoading !== null}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: linkedProviders.includes('google') ? (isDayMode ? '#fef2f2' : 'rgba(127,29,29,0.2)') : (isDayMode ? '#ffffff' : '#1e293b'),
                    color: linkedProviders.includes('google') ? '#ef4444' : (isDayMode ? '#0f172a' : '#ffffff'),
                    border: `1px solid ${linkedProviders.includes('google') ? '#fca5a5' : (isDayMode ? '#cbd5e1' : '#334155')}`
                  }}
                >
                  {socialActionLoading === 'google' ? '...' : linkedProviders.includes('google') ? 'Unlink' : 'Link'}
                </button>
              </div>
            )}

            {socialConfig.facebookEnabled && (
              <div className="border rounded-2xl p-4 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b', backgroundColor: isDayMode ? '#f8fafc' : '#0B101D' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <svg className="w-5 h-5 text-blue-600 fill-current" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Facebook</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: linkedProviders.includes('facebook') ? '#10b981' : (isDayMode ? '#94a3b8' : '#64748b') }}>
                      {linkedProviders.includes('facebook') ? 'Connected' : 'Not connected'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSocialLink('facebook')}
                  disabled={socialActionLoading !== null}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: linkedProviders.includes('facebook') ? (isDayMode ? '#fef2f2' : 'rgba(127,29,29,0.2)') : (isDayMode ? '#ffffff' : '#1e293b'),
                    color: linkedProviders.includes('facebook') ? '#ef4444' : (isDayMode ? '#0f172a' : '#ffffff'),
                    border: `1px solid ${linkedProviders.includes('facebook') ? '#fca5a5' : (isDayMode ? '#cbd5e1' : '#334155')}`
                  }}
                >
                  {socialActionLoading === 'facebook' ? '...' : linkedProviders.includes('facebook') ? 'Unlink' : 'Link'}
                </button>
              </div>
            )}

            {socialConfig.appleEnabled && (
              <div className="border rounded-2xl p-4 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b', backgroundColor: isDayMode ? '#f8fafc' : '#0B101D' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <svg className="w-5 h-5 fill-current text-slate-900" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Apple</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: linkedProviders.includes('apple') ? '#10b981' : (isDayMode ? '#94a3b8' : '#64748b') }}>
                      {linkedProviders.includes('apple') ? 'Connected' : 'Not connected'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSocialLink('apple')}
                  disabled={socialActionLoading !== null}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: linkedProviders.includes('apple') ? (isDayMode ? '#fef2f2' : 'rgba(127,29,29,0.2)') : (isDayMode ? '#ffffff' : '#1e293b'),
                    color: linkedProviders.includes('apple') ? '#ef4444' : (isDayMode ? '#0f172a' : '#ffffff'),
                    border: `1px solid ${linkedProviders.includes('apple') ? '#fca5a5' : (isDayMode ? '#cbd5e1' : '#334155')}`
                  }}
                >
                  {socialActionLoading === 'apple' ? '...' : linkedProviders.includes('apple') ? 'Unlink' : 'Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPGRADE OR CHANGE MEMBERSHIP PLAN */}"""
content = content.replace(old_jsx, new_jsx)

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✓ Patched {profile_path}: Social Account Linking module installed.")
