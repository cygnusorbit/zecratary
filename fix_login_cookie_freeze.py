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

# 2. Patch lib/auth.ts to restore document.cookie in syncSessionCookie and setCurrentUser
auth_files = glob.glob('**/lib/auth.ts', recursive=True)
auth_files = [p for p in auth_files if 'node_modules' not in p and '.next' not in p]

sync_cookie_fn = """// Edge Middleware Cookie Synchronization
export function syncSessionCookie(user: User | null): void {
  if (typeof document === 'undefined') return;
  if (user) {
    const payload = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    }));
    document.cookie = `zecratary_session=${payload}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
  }
}"""

for ap in auth_files:
    with open(ap, 'r', encoding='utf-8') as f:
        auth_code = f.read()

    # Replace existing syncSessionCookie implementation
    if 'function syncSessionCookie' in auth_code:
        auth_code = re.sub(
            r"// Edge Middleware Cookie Synchronization\s*function syncSessionCookie[\s\S]*?\n\}",
            sync_cookie_fn,
            auth_code
        )
    else:
        auth_code += "\n\n" + sync_cookie_fn

    # Ensure setCurrentUser explicitly invokes syncSessionCookie and writes cookie
    if 'syncSessionCookie(user);' not in auth_code:
        auth_code = re.sub(
            r"(export function setCurrentUser\([^)]*\)\s*:\s*void\s*\{)",
            r"\1\n  syncSessionCookie(user);",
            auth_code
        )

    with open(ap, 'w', encoding='utf-8') as f:
        f.write(auth_code)
    print(f"✓ Fixed syncSessionCookie and setCurrentUser in: {ap}")

# 3. Patch login page to prevent ping-pong loop and ensure hard redirection
login_files = glob.glob(f'{app_dir}/**/login/page.tsx', recursive=True)
if not login_files:
    login_files = glob.glob('**/login/page.tsx', recursive=True)
login_files = [p for p in login_files if 'node_modules' not in p and '.next' not in p]

login_mount_hook = """  useEffect(() => {
    initAuthStorage();
    if (typeof window !== 'undefined') {
      const active = getCurrentUser();
      const hasCookie = document.cookie.includes('zecratary_session=');

      // If user exists in storage but cookie was dropped, sync cookie and navigate
      if (active && !hasCookie) {
        const payload = encodeURIComponent(JSON.stringify({
          id: active.id,
          email: active.email,
          role: active.role || 'user'
        }));
        document.cookie = `zecratary_session=${payload}; path=/; max-age=604800; SameSite=Lax`;
        window.location.href = '/profile';
        return;
      }

      if (active && hasCookie) {
        window.location.href = '/profile';
      }
    }
  }, []);"""

for lp in login_files:
    with open(lp, 'r', encoding='utf-8') as f:
        l_content = f.read()

    # Replace mount useEffect with hardened version
    l_content = re.sub(
        r'useEffect\(\(\)\s*=>\s*\{[\s\S]*?initAuthStorage\(\);[\s\S]*?\}\s*,\s*\[[^\]]*\]\);?',
        login_mount_hook,
        l_content,
        count=1
    )

    # Replace triggerLoginSuccess with full document reload
    l_content = re.sub(
        r'const triggerLoginSuccess\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};',
        "const triggerLoginSuccess = () => {\n    window.location.href = '/profile';\n  };",
        l_content
    )

    # Ensure handleLogin synchronously writes cookie before triggering navigation
    if "document.cookie = `zecratary_session=" not in l_content:
        l_content = re.sub(
            r"(setCurrentUser\((.*?)\);?)",
            r"""\1
        if (typeof document !== 'undefined') {
          const payload = encodeURIComponent(JSON.stringify({
            id: \2.id,
            email: \2.email,
            role: \2.role || 'user'
          }));
          document.cookie = `zecratary_session=${payload}; path=/; max-age=604800; SameSite=Lax`;
        }""",
            l_content
        )

    with open(lp, 'w', encoding='utf-8') as f:
        f.write(l_content)
    print(f"✓ Hardened login page redirection logic in: {lp}")

print("\n🚀 Login freeze patch applied successfully!")
