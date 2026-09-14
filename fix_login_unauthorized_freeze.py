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
auth_path = os.path.join(lib_dir, 'auth.ts')

# 2. Harden lib/auth.ts to guarantee synchronous session cookies
if os.path.exists(auth_path):
    with open(auth_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    cleaned = [l for l in lines if 'zecratary_session' not in l and 'max-age=604800' not in l]
    auth_code = "".join(cleaned)

    # Inject clean cookie setters directly into setCurrentUser and logoutUser
    auth_code = re.sub(
        r"(localStorage\.setItem\(['\"]zecratary_current_user['\"],\s*JSON\.stringify\((.*?)\)\);?)",
        r"\1\n    if (typeof document !== 'undefined') { document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(\2))}; path=/; max-age=604800; SameSite=Lax`; }",
        auth_code
    )

    auth_code = re.sub(
        r"(localStorage\.removeItem\(['\"]zecratary_current_user['\"]\);?)",
        r"\1\n    if (typeof document !== 'undefined') { document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;'; }",
        auth_code
    )

    with open(auth_path, 'w', encoding='utf-8') as f:
        f.write(auth_code)
    print(f"✓ Synchronized session cookies in: {auth_path}")

# 3. Patch login pages to terminate the redirect loop
login_files = glob.glob(f'{app_dir}/**/login/page.tsx', recursive=True)
if not login_files:
    login_files = glob.glob('**/login/page.tsx', recursive=True)

for login_path in login_files:
    if 'node_modules' in login_path or '.next' in login_path:
        continue

    with open(login_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Invalidate stale sessions on unauthorized_access before any redirect triggers
    loop_breaker = """  useEffect(() => {
    initAuthStorage();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized_access') {
        localStorage.removeItem('zecratary_current_user');
        localStorage.removeItem('zecratary_user');
        document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
        setError('Your session expired or was invalid. Please sign in again.');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }

    const active = getCurrentUser();
    if (active) {
      router.replace('/profile');
    }
  }, [router]);"""

    # Replace existing mount effect or inject the loop breaker
    pattern = re.compile(
        r'useEffect\(\(\)\s*=>\s*\{[^}]*?getCurrentUser\(\)[^}]*?router\.replace\([\'"]\/profile[\'"]\);?\s*\}\s*,\s*\[router\]\);?',
        re.DOTALL
    )

    if pattern.search(content):
        content = pattern.sub(loop_breaker, content, count=1)
        print(f"✓ Injected redirect loop breaker into {login_path}")
    else:
        # Secondary target: look for initAuthStorage block
        alt_pattern = re.compile(
            r'useEffect\(\(\)\s*=>\s*\{[^}]*?initAuthStorage\(\);[^}]*?\}\s*,\s*\[[^\]]*\]\);?',
            re.DOTALL
        )
        if alt_pattern.search(content):
            content = alt_pattern.sub(loop_breaker, content, count=1)
            print(f"✓ Replaced mount effect with loop breaker in {login_path}")

    # Ensure handleLogin explicitly guarantees cookie write before navigating
    if "document.cookie = `zecratary_session=" not in content:
        content = re.sub(
            r"(setCurrentUser\((.*?)\);?)",
            r"\1\n        if (typeof document !== 'undefined') { document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(\2))}; path=/; max-age=604800; SameSite=Lax`; }",
            content
        )

    with open(login_path, 'w', encoding='utf-8') as f:
        f.write(content)

# 4. Verify Edge Middleware cookie extraction
middleware_paths = [
    os.path.join(base_dir, 'middleware.ts'),
    os.path.join(base_dir, 'src', 'middleware.ts'),
    'middleware.ts'
]
mw_path = next((p for p in middleware_paths if os.path.exists(p)), None)

if mw_path:
    with open(mw_path, 'r', encoding='utf-8') as f:
        mw_content = f.read()

    # Ensure fallback JSON parser supports raw and encoded cookies
    cookie_extraction = """  const sessionCookie = req.cookies.get('zecratary_session')?.value;
  let session: { email?: string; role?: string; provider?: string } | null = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (_) {
      try {
        session = JSON.parse(sessionCookie);
      } catch (_) {}
    }
  }"""

    if 'session = JSON.parse(decodeURIComponent(sessionCookie));' not in mw_content:
        mw_content = re.sub(
            r"const sessionCookie = req\.cookies\.get\(['\"]zecratary_session['\"]\)\?\.value;[\s\S]*?let session.*?=.*?;",
            cookie_extraction,
            mw_content,
            count=1
        )
        with open(mw_path, 'w', encoding='utf-8') as f:
            f.write(mw_content)
        print(f"✓ Hardened cookie parsing in {mw_path}")

print("\n🚀 Redirect loop breaker and cookie synchronization applied successfully!")
