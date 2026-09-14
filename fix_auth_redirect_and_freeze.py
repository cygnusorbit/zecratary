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

# 2. Patch middleware.ts to redirect cleanly to /login without error params
middleware_candidates = [
    os.path.join(base_dir, 'middleware.ts'),
    os.path.join(base_dir, 'src', 'middleware.ts'),
    'apps/web/src/middleware.ts',
    'apps/web/middleware.ts',
    'src/middleware.ts',
    'middleware.ts'
]
mw_files = [p for p in set(middleware_candidates) if os.path.exists(p)]
if not mw_files:
    mw_files = glob.glob('**/middleware.ts', recursive=True)
    mw_files = [p for p in mw_files if 'node_modules' not in p and '.next' not in p]

for mw_path in set(mw_files):
    with open(mw_path, 'r', encoding='utf-8') as f:
        mw_code = f.read()

    mw_code = re.sub(
        r"loginUrl\.searchParams\.set\(['\"]error['\"],\s*['\"]unauthorized_access['\"]\);?\s*return NextResponse\.redirect\(loginUrl\);",
        "return NextResponse.redirect(new URL('/login', req.url));",
        mw_code
    )
    mw_code = re.sub(
        r"return NextResponse\.redirect\(new URL\(['\"]/login\?error=unauthorized_access['\"],\s*([^)]+)\)\);?",
        r"return NextResponse.redirect(new URL('/login', \1));",
        mw_code
    )
    mw_code = re.sub(r"[a-zA-Z0-9_]+\.searchParams\.set\(['\"]error['\"],\s*['\"]unauthorized_access['\"]\);?\n?", "", mw_code)

    with open(mw_path, 'w', encoding='utf-8') as f:
        f.write(mw_code)
    print(f"✓ Cleaned unauthorized redirects in: {mw_path}")

# 3. Patch lib/auth.ts to guarantee synchronous session cookies and clean logout
auth_files = glob.glob('**/lib/auth.ts', recursive=True)
auth_files = [p for p in auth_files if 'node_modules' not in p and '.next' not in p]

clean_logout_fn = """export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('zecratary_current_user');
      localStorage.removeItem('zecratary_user');
      localStorage.removeItem('zecratary_admin_impersonator');
      document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
    } catch (_) {}
    window.dispatchEvent(new Event('zecratary_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/login';
  }
}"""

for ap in auth_files:
    with open(ap, 'r', encoding='utf-8') as f:
        auth_code = f.read()

    # Synchronize cookies in setCurrentUser
    auth_code = re.sub(
        r"(localStorage\.setItem\(['\"]zecratary_current_user['\"],\s*JSON\.stringify\((.*?)\)\);?)",
        r"\1\n    if (typeof document !== 'undefined') { document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(\2))}; path=/; max-age=604800; SameSite=Lax`; }",
        auth_code
    )

    # Inject hardened logoutUser
    pattern = re.compile(r"export\s+function\s+logoutUser\s*\([^)]*\)\s*:\s*void\s*\{[\s\S]*?\n\}", re.MULTILINE)
    if pattern.search(auth_code):
        auth_code = pattern.sub(clean_logout_fn, auth_code)
    else:
        auth_code += "\n" + clean_logout_fn

    with open(ap, 'w', encoding='utf-8') as f:
        f.write(auth_code)
    print(f"✓ Hardened session cookie writes and logoutUser in: {ap}")

# 4. Patch login pages to terminate the redirect loop
login_files = glob.glob(f'{app_dir}/**/login/page.tsx', recursive=True)
if not login_files:
    login_files = glob.glob('**/login/page.tsx', recursive=True)
login_files = [p for p in login_files if 'node_modules' not in p and '.next' not in p]

loop_breaker = """  useEffect(() => {
    initAuthStorage();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized_access') {
        localStorage.removeItem('zecratary_current_user');
        localStorage.removeItem('zecratary_user');
        document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
        window.history.replaceState({}, document.title, '/login');
        return;
      }
    }

    const active = getCurrentUser();
    if (active) {
      router.replace('/profile');
    }
  }, [router]);"""

for lp in login_files:
    with open(lp, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(
        r'useEffect\(\(\)\s*=>\s*\{[^}]*?getCurrentUser\(\)[^}]*?router\.replace\([\'"]\/profile[\'"]\);?\s*\}\s*,\s*\[router\]\);?',
        re.DOTALL
    )
    if pattern.search(content):
        content = pattern.sub(loop_breaker, content, count=1)
        print(f"✓ Injected redirect loop breaker into {lp}")
    else:
        alt_pattern = re.compile(
            r'useEffect\(\(\)\s*=>\s*\{[^}]*?initAuthStorage\(\);[^}]*?\}\s*,\s*\[[^\]]*\]\);?',
            re.DOTALL
        )
        if alt_pattern.search(content):
            content = alt_pattern.sub(loop_breaker, content, count=1)
            print(f"✓ Replaced mount effect with loop breaker in {lp}")

    # Ensure handleLogin syncs cookie before navigation
    if "document.cookie = `zecratary_session=" not in content:
        content = re.sub(
            r"(setCurrentUser\((.*?)\);?)",
            r"\1\n        if (typeof document !== 'undefined') { document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(\2))}; path=/; max-age=604800; SameSite=Lax`; }",
            content
        )

    with open(lp, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Auth redirect fix applied successfully!")
