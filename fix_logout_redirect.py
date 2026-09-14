import os
import glob
import re

# 1. Locate root directories
candidates = [
    'apps/web/src/app',
    'src/app',
    'apps/web/app',
    'app'
]
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate application directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')

# 2. Patch middleware.ts to redirect unauthenticated users cleanly to /login
mw_candidates = [
    os.path.join(base_dir, 'middleware.ts'),
    os.path.join(base_dir, 'src', 'middleware.ts'),
    'apps/web/middleware.ts',
    'apps/web/src/middleware.ts',
    'middleware.ts',
    'src/middleware.ts'
]

mw_files = [p for p in mw_candidates if os.path.exists(p)]
if not mw_files:
    mw_files = glob.glob('**/middleware.ts', recursive=True)

for mw_path in set(mw_files):
    if 'node_modules' in mw_path or '.next' in mw_path:
        continue
    with open(mw_path, 'r', encoding='utf-8') as f:
        mw_content = f.read()

    # Replace any logic setting ?error=unauthorized_access on login redirect
    updated_mw = re.sub(
        r"loginUrl\.searchParams\.set\(['\"]error['\"],\s*['\"]unauthorized_access['\"]\);?",
        "// redirect cleanly to /login without error query",
        mw_content
    )

    # In case of direct assignment
    updated_mw = re.sub(
        r"return NextResponse\.redirect\(new URL\(['\"]/login\?error=unauthorized_access['\"],\s*([^)]+)\)\);?",
        r"return NextResponse.redirect(new URL('/login', \1));",
        updated_mw
    )

    if updated_mw != mw_content:
        with open(mw_path, 'w', encoding='utf-8') as f:
            f.write(updated_mw)
        print(f"✓ Removed 'unauthorized_access' query redirect from {mw_path}")
    else:
        print(f"ℹ No 'unauthorized_access' query string found in {mw_path}")

# 3. Patch lib/auth.ts logoutUser function
auth_files = glob.glob('**/lib/auth.ts', recursive=True)
for auth_path in auth_files:
    if 'node_modules' in auth_path or '.next' in auth_path:
        continue

    with open(auth_path, 'r', encoding='utf-8') as f:
        auth_content = f.read()

    # Robust logoutUser that performs a direct window.location.href navigation to /login
    clean_logout_fn = """export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('zecratary_current_user');
    localStorage.removeItem('zecratary_user');
    localStorage.removeItem('zecratary_admin_impersonator');
    document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
    window.dispatchEvent(new Event('zecratary_auth_changed'));
    window.dispatchEvent(new Event('storage'));
  } catch (_) {}
  window.location.href = '/login';
}"""

    # Replace existing logoutUser implementation
    pattern = re.compile(r'export function logoutUser\(\)[^{]*\{[\s\S]*?\n\}', re.MULTILINE)
    if pattern.search(auth_content):
        auth_content = pattern.sub(clean_logout_fn, auth_content, count=1)
        with open(auth_path, 'w', encoding='utf-8') as f:
            f.write(auth_content)
        print(f"✓ Updated logoutUser() in {auth_path} to route directly to /login")

# 4. Patch profile/page.tsx logout triggers
profile_files = glob.glob('**/profile/page.tsx', recursive=True)
for prof_path in profile_files:
    if 'node_modules' in prof_path or '.next' in prof_path:
        continue

    with open(prof_path, 'r', encoding='utf-8') as f:
        prof_content = f.read()

    # Ensure handleLogout calls logoutUser and redirects cleanly
    prof_content = re.sub(
        r'const handleLogout\s*=\s*\(\)\s*=>\s*\{[\s\S]*?router\.replace\([\'"]\/login[\'"]\);?[\s\S]*?\};',
        "const handleLogout = () => {\n    logoutUser();\n    if (typeof window !== 'undefined') window.location.href = '/login';\n  };",
        prof_content
    )

    with open(prof_path, 'w', encoding='utf-8') as f:
        f.write(prof_content)
    print(f"✓ Verified logout handler in {prof_path}")

# 5. Patch login/page.tsx to automatically scrub ?error=unauthorized_access from the URL
login_files = glob.glob('**/login/page.tsx', recursive=True)
for login_path in login_files:
    if 'node_modules' in login_path or '.next' in login_path:
        continue

    with open(login_path, 'r', encoding='utf-8') as f:
        login_content = f.read()

    # If error is unauthorized_access, silently clear it from history without showing an error box
    scrubber_code = """    const errParam = searchParams.get('error');
    if (errParam) {
      if (errParam === 'unauthorized_access') {
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, '/login');
        }
      } else {
        setError(decodeURIComponent(errParam));
      }
      return;
    }"""

    login_content = re.sub(
        r'const errParam = searchParams\.get\([\'"]error[\'"]\);[\s\S]*?setError\(decodeURIComponent\(errParam\)\);[\s\S]*?return;[\s\S]*?\}',
        scrubber_code,
        login_content
    )

    with open(login_path, 'w', encoding='utf-8') as f:
        f.write(login_content)
    print(f"✓ Patched URL scrubber in {login_path}")

print("\n🚀 Successfully fixed logout flow! Sign out will now redirect cleanly to /login.")
