import os
import glob
import re

# 1. Discover App Router root and lib directory
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

# 2. Patch lib/auth.ts for Firefox-compliant cookie clearing and valid session parsing
auth_files = glob.glob('**/lib/auth.ts', recursive=True)
auth_files = [p for p in auth_files if 'node_modules' not in p and '.next' not in p]

firefox_cookie_helpers = """
// Firefox-compliant cookie validator and session destroyer
export function isSessionCookieValid(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\\s*)zecratary_session=([^;]+)/);
  if (!match || !match[1]) return false;
  try {
    const raw = decodeURIComponent(match[1]).trim();
    if (!raw || raw === '""' || raw === '{}') return false;
    const session = JSON.parse(raw);
    return Boolean(session && (session.email || session.id));
  } catch (_) {
    return false;
  }
}

export function purgeSessionCookies(): void {
  if (typeof document === 'undefined') return;
  const pastDate = 'Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = `zecratary_session=; Path=/; Expires=${pastDate}; Max-Age=0; SameSite=Lax;`;
  document.cookie = `zecratary_session=; Path=/; Expires=${pastDate}; Max-Age=0;`;
  document.cookie = `zecratary_session=; Expires=${pastDate}; Max-Age=0; SameSite=Lax;`;
  document.cookie = `zecratary_session=; Expires=${pastDate}; Max-Age=0;`;
}

export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('zecratary_current_user');
      localStorage.removeItem('zecratary_user');
      localStorage.removeItem('zecratary_admin_impersonator');
      sessionStorage.clear();
      purgeSessionCookies();
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('zecratary_auth_changed', { detail: null }));
    window.location.replace('/login');
  }
}
"""

for ap in auth_files:
    with open(ap, 'r', encoding='utf-8') as f:
        auth_code = f.read()

    # Strip any multi-line or single-line fallback user seeding in initAuthStorage
    auth_code = re.sub(
        r"localStorage\.setItem\(\s*['\"]zecratary_current_user['\"][\s\S]*?\);",
        "// seed removed for cross-browser stability",
        auth_code
    )
    auth_code = re.sub(
        r"localStorage\.setItem\(\s*['\"]zecratary_user['\"][\s\S]*?\);",
        "// seed removed for cross-browser stability",
        auth_code
    )

    # Remove prior logoutUser, isSessionCookieValid, and purgeSessionCookies implementations
    auth_code = re.sub(r"export\s+(?:function|const)\s+logoutUser[\s\S]*?\{[\s\S]*?\n\};?", "", auth_code)
    auth_code = re.sub(r"export\s+function\s+isSessionCookieValid[\s\S]*?\{[\s\S]*?\n\}", "", auth_code)
    auth_code = re.sub(r"export\s+function\s+purgeSessionCookies[\s\S]*?\{[\s\S]*?\n\}", "", auth_code)

    auth_code = auth_code.rstrip() + "\n\n" + firefox_cookie_helpers + "\n"

    with open(ap, 'w', encoding='utf-8') as f:
        f.write(auth_code)
    print(f"✓ Injected Firefox cookie validator & logoutUser into: {ap}")

# 3. Patch login/page.tsx to parse actual cookie contents and resist bfcache
login_files = glob.glob(f'{app_dir}/**/login/page.tsx', recursive=True)
if not login_files:
    login_files = glob.glob('**/login/page.tsx', recursive=True)
login_files = [p for p in login_files if 'node_modules' not in p and '.next' not in p]

firefox_login_mount = """  useEffect(() => {
    initAuthStorage();
    if (typeof window === 'undefined') return;

    const evaluateFirefoxAuth = () => {
      const match = document.cookie.match(/(?:^|;\\s*)zecratary_session=([^;]+)/);
      let isValidSession = false;

      if (match && match[1]) {
        try {
          const raw = decodeURIComponent(match[1]).trim();
          if (raw && raw !== '""' && raw !== '{}') {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.email || parsed.id)) {
              isValidSession = true;
            }
          }
        } catch (_) {}
      }

      const activeUser = getCurrentUser();

      // If no valid session cookie is present, flush any orphaned storage
      if (!isValidSession) {
        localStorage.removeItem('zecratary_current_user');
        localStorage.removeItem('zecratary_user');
        return;
      }

      // Only redirect when both storage and cookie represent a verified active session
      if (activeUser && isValidSession) {
        window.location.replace('/profile');
      }
    };

    evaluateFirefoxAuth();

    // Prevent Firefox Back-Forward Cache (bfcache) from restoring stale sessions
    const handleBfCache = (e: PageTransitionEvent) => {
      if (e.persisted) {
        evaluateFirefoxAuth();
      }
    };

    window.addEventListener('pageshow', handleBfCache);
    return () => window.removeEventListener('pageshow', handleBfCache);
  }, []);"""

for lp in login_files:
    with open(lp, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(
        r'useEffect\(\(\)\s*=>\s*\{[\s\S]*?initAuthStorage\(\);[\s\S]*?\}\s*,\s*\[[^\]]*\]\);?',
        firefox_login_mount,
        content,
        count=1
    )

    with open(lp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Injected Firefox-validated session guard into: {lp}")

# 4. Patch AuthGuard.tsx if present to use strict payload validation
guard_files = glob.glob('**/AuthGuard.tsx', recursive=True)
guard_files = [p for p in guard_files if 'node_modules' not in p and '.next' not in p]

for gp in guard_files:
    with open(gp, 'r', encoding='utf-8') as f:
        content = f.read()

    strict_guard_check = """      const user = getCurrentUser();
      let hasValidCookie = false;
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\\s*)zecratary_session=([^;]+)/);
        if (match && match[1]) {
          try {
            const raw = decodeURIComponent(match[1]).trim();
            const parsed = JSON.parse(raw);
            hasValidCookie = Boolean(parsed && (parsed.email || parsed.id));
          } catch (_) {}
        }
      }"""

    content = re.sub(
        r"const user = getCurrentUser\(\);[\s\S]*?const hasCookie = .*?;",
        strict_guard_check,
        content
    )
    content = re.sub(r"hasCookie", "hasValidCookie", content)

    with open(gp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Hardened AuthGuard against Firefox cookie artifacts: {gp}")

# 5. Patch middleware.ts to reject empty or malformed cookie payloads
middleware_files = [
    os.path.join(base_dir, 'middleware.ts'),
    os.path.join(base_dir, 'src', 'middleware.ts'),
    'apps/web/src/middleware.ts',
    'src/middleware.ts',
    'middleware.ts'
]
mw_files = [p for p in set(middleware_files) if os.path.exists(p)]

for mw in mw_files:
    with open(mw, 'r', encoding='utf-8') as f:
        content = f.read()

    session_cleaner = """  const sessionCookie = req.cookies.get('zecratary_session')?.value;
  let session: { email?: string; role?: string; provider?: string } | null = null;

  if (sessionCookie && sessionCookie.trim() !== '') {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (_) {
      try {
        session = JSON.parse(sessionCookie);
      } catch (_) {}
    }
  }

  const isAuthenticated = Boolean(session && (session.email || (session as any).id));"""

    content = re.sub(
        r"const sessionCookie = req\.cookies\.get\(['\"]zecratary_session['\"]\)\?\.value;[\s\S]*?const isAuthenticated = .*?;",
        session_cleaner,
        content,
        count=1
    )

    with open(mw, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Hardened Edge Middleware against empty Firefox cookie values in: {mw}")

print("\n🚀 Firefox authentication and logout patches applied successfully!")
