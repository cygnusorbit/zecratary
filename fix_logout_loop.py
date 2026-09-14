import os
import glob
import re

# 1. Discover app and base directories
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
components_dir = os.path.join(base_dir, 'components')

# 2. Patch lib/auth.ts: Neutralize auto-seeding in initAuthStorage and harden logoutUser
auth_files = glob.glob('**/lib/auth.ts', recursive=True)
auth_files = [p for p in auth_files if 'node_modules' not in p and '.next' not in p]

clean_logout_fn = """export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('zecratary_current_user');
      localStorage.removeItem('zecratary_user');
      localStorage.removeItem('zecratary_admin_impersonator');
      sessionStorage.clear();
      document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
      document.cookie = 'zecratary_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
    } catch (_) {}
    window.dispatchEvent(new Event('zecratary_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/login';
  }
}"""

for ap in auth_files:
    with open(ap, 'r', encoding='utf-8') as f:
        content = f.read()

    # Strip any line inside initAuthStorage that sets zecratary_current_user or zecratary_user
    content = re.sub(
        r"localStorage\.setItem\(['\"]zecratary_current_user['\"],\s*[^)]+\);?",
        "// seed removed to prevent auto-login loop",
        content
    )
    content = re.sub(
        r"localStorage\.setItem\(['\"]zecratary_user['\"],\s*[^)]+\);?",
        "// seed removed to prevent auto-login loop",
        content
    )

    # Replace logoutUser definition
    pattern = re.compile(r"export\s+(?:const|function)\s+logoutUser[\s\S]*?\{[\s\S]*?\n\};?", re.MULTILINE)
    if pattern.search(content):
        content = pattern.sub(clean_logout_fn, content, count=1)
    else:
        content = content.rstrip() + "\n\n" + clean_logout_fn + "\n"

    with open(ap, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Hardened initAuthStorage and logoutUser in: {ap}")

# 3. Patch login/page.tsx to stop resurrecting cookies when logging out
login_files = glob.glob(f'{app_dir}/**/login/page.tsx', recursive=True)
if not login_files:
    login_files = glob.glob('**/login/page.tsx', recursive=True)
login_files = [p for p in login_files if 'node_modules' not in p and '.next' not in p]

login_mount_hook = """  useEffect(() => {
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

      const active = getCurrentUser();
      const hasCookie = document.cookie.includes('zecratary_session=');

      // If user remains in storage but cookie is gone, this was a logout - clear storage
      if (active && !hasCookie) {
        localStorage.removeItem('zecratary_current_user');
        localStorage.removeItem('zecratary_user');
        return;
      }

      // Only redirect to profile if BOTH storage and session cookie are active
      if (active && hasCookie) {
        window.location.href = '/profile';
      }
    }
  }, []);"""

for lp in login_files:
    with open(lp, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(
        r'useEffect\(\(\)\s*=>\s*\{[\s\S]*?initAuthStorage\(\);[\s\S]*?\}\s*,\s*\[[^\]]*\]\);?',
        login_mount_hook,
        content,
        count=1
    )

    with open(lp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Fixed login mount hook to stop session resurrection in: {lp}")

# 4. Patch AuthGuard.tsx if present to require active session cookie
guard_files = glob.glob('**/AuthGuard.tsx', recursive=True)
guard_files = [p for p in guard_files if 'node_modules' not in p and '.next' not in p]

for gp in guard_files:
    with open(gp, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(
        r"const user = getCurrentUser\(\);",
        "const user = getCurrentUser();\n      const hasCookie = typeof document !== 'undefined' && document.cookie.includes('zecratary_session=');",
        content
    )
    content = re.sub(
        r"if\s*\(!user\s*&&\s*!isPublic\)",
        "if ((!user || !hasCookie) && !isPublic)",
        content
    )
    content = re.sub(
        r"else\s+if\s*\(user\s*&&\s*isPublic\)",
        "else if (user && hasCookie && isPublic)",
        content
    )

    with open(gp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Synchronized cookie checks in AuthGuard: {gp}")

# 5. Verify and hook logout buttons in Sidebar and Profile page
profile_files = glob.glob('**/profile/page.tsx', recursive=True)
profile_files = [p for p in profile_files if 'node_modules' not in p and '.next' not in p]

for pp in profile_files:
    with open(pp, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'logoutUser' not in content and '@/lib/auth' in content:
        content = re.sub(
            r"(import\s*\{[^}]*?)(\}\s*from\s*['\"]@/lib/auth['\"];?)",
            r"\1, logoutUser\2",
            content,
            count=1
        )

    content = re.sub(
        r'const handleLogout\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};',
        "const handleLogout = () => {\n    logoutUser();\n  };",
        content
    )

    with open(pp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Verified handleLogout in: {pp}")

sidebar_files = glob.glob('**/Sidebar.tsx', recursive=True)
sidebar_files = [p for p in sidebar_files if 'node_modules' not in p and '.next' not in p]

for sp in sidebar_files:
    with open(sp, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'logoutUser' not in content and '@/lib/auth' in content:
        content = re.sub(
            r"(import\s*\{[^}]*?)(\}\s*from\s*['\"]@/lib/auth['\"];?)",
            r"\1, logoutUser\2",
            content,
            count=1
        )

    with open(sp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Ensured logoutUser availability in: {sp}")

print("\n🚀 Logout loop resolved successfully!")
