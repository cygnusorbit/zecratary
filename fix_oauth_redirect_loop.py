import os
import glob
import re

# 1. Locate App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')

# 2. Update apps/web/src/app/api/auth/callback/route.ts to redirect directly to /profile
callback_file = os.path.join(app_dir, 'api', 'auth', 'callback', 'route.ts')
if os.path.exists(callback_file):
    with open(callback_file, 'r', encoding='utf-8') as f:
        cb_code = f.read()

    # Replace redirect to /login with direct redirect to /profile or /admin
    old_redirect_block = re.search(
        r'const\s+redirectUrl\s*=\s*new\s+URL\([\'\"]/login[\'\"],\s*req\.url\);[\s\S]*?const\s+response\s*=\s*NextResponse\.redirect\(redirectUrl\);',
        cb_code
    )
    if old_redirect_block:
        direct_redirect_code = """const targetPath = (newUser.role === 'admin' || cleanEmail.includes('admin')) ? '/admin' : '/profile';
    const response = NextResponse.redirect(new URL(targetPath, req.url));"""
        cb_code = cb_code.replace(old_redirect_block.group(0), direct_redirect_code)
        with open(callback_file, 'w', encoding='utf-8') as f:
            f.write(cb_code)
        print(f"✓ Updated OAuth callback redirect in {callback_file}")

# 3. Patch lib/auth.ts to self-hydrate new Google users directly from the cookie
auth_files = glob.glob('**/lib/auth.ts', recursive=True)
auth_files = [p for p in auth_files if 'node_modules' not in p and '.next' not in p]

new_get_current_user = """export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Inspect session cookie
    let sessionUser: any = null;
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\\s*)zecratary_session=([^;]+)/);
      if (match && match[1]) {
        try {
          const decoded = decodeURIComponent(match[1]).trim();
          if (decoded && decoded !== '""' && decoded !== '{}') {
            sessionUser = JSON.parse(decoded);
          }
        } catch (_) {}
      }
    }

    // 2. Read local storage cache
    const rawCurrent = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
    let localUser: User | null = null;
    if (rawCurrent) {
      try {
        localUser = JSON.parse(rawCurrent);
      } catch (_) {}
    }

    // 3. If a valid cookie exists, synchronize local state to match
    if (sessionUser && (sessionUser.email || sessionUser.id)) {
      const cleanEmail = (sessionUser.email || '').toLowerCase().trim();

      if (localUser && (localUser.email.toLowerCase() === cleanEmail || localUser.id === sessionUser.id)) {
        return localUser;
      }

      const rawUsers = localStorage.getItem('zecratary_users');
      let users: User[] = rawUsers ? JSON.parse(rawUsers) : [...DEFAULT_USERS];

      let matched = users.find(u => (u.email && u.email.toLowerCase() === cleanEmail) || (sessionUser.id && u.id === sessionUser.id));
      if (!matched) {
        matched = DEFAULT_USERS.find(u => (u.email && u.email.toLowerCase() === cleanEmail) || (sessionUser.id && u.id === sessionUser.id));
      }

      if (!matched) {
        matched = {
          id: sessionUser.id || `usr_google_${Date.now().toString(36)}`,
          name: sessionUser.name || cleanEmail.split('@')[0] || 'User',
          email: cleanEmail,
          role: sessionUser.role || 'user',
          subscriptionPlan: sessionUser.subscriptionPlan || 'taster',
          subscriptionTier: sessionUser.subscriptionTier || 'taster',
          createdAt: sessionUser.createdAt || new Date().toISOString(),
          avatar: sessionUser.avatar || '',
        };
        users.unshift(matched);
        localStorage.setItem('zecratary_users', JSON.stringify(users));
      }

      localStorage.setItem('zecratary_current_user', JSON.stringify(matched));
      localStorage.setItem('zecratary_user', JSON.stringify(matched));
      return matched;
    }

    // 4. Return local user if cookie was not set in browser dev context
    if (localUser && isSessionCookieValid()) {
      return localUser;
    }

    return null;
  } catch (_) {
    return null;
  }
}"""

for ap in auth_files:
    with open(ap, 'r', encoding='utf-8') as f:
        auth_content = f.read()

    pattern = re.compile(r'export\s+function\s+getCurrentUser\s*\([^)]*\)\s*:\s*User\s*\|\s*null\s*\{[\s\S]*?\n\}', re.MULTILINE)
    if pattern.search(auth_content):
        auth_content = pattern.sub(lambda _: new_get_current_user, auth_content, count=1)
        with open(ap, 'w', encoding='utf-8') as f:
            f.write(auth_content)
        print(f"✓ Patched self-hydrating getCurrentUser in {ap}")

# 4. Patch middleware.ts to avoid bouncing requests that contain error query parameters
mw_candidates = ['apps/web/src/middleware.ts', 'src/middleware.ts', 'middleware.ts']
mw_path = next((p for p in mw_candidates if os.path.exists(p)), None)

if mw_path:
    with open(mw_path, 'r', encoding='utf-8') as f:
        mw_content = f.read()

    # Allow /login to render without redirecting if an error parameter is present
    old_guest_check = "if ((pathname === '/login' || pathname === '/register') && isAuthenticated)"
    new_guest_check = "if ((pathname === '/login' || pathname === '/register') && isAuthenticated && !req.nextUrl.searchParams.has('error'))"

    if old_guest_check in mw_content:
        mw_content = mw_content.replace(old_guest_check, new_guest_check)
        with open(mw_path, 'w', encoding='utf-8') as f:
            f.write(mw_content)
        print(f"✓ Adjusted guest route evaluation in {mw_path}")

print("\n🚀 Redirect loop fix applied successfully!")
