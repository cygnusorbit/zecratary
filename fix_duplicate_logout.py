import os
import glob
import re

auth_files = glob.glob('**/lib/auth.ts', recursive=True)
auth_files = [p for p in auth_files if 'node_modules' not in p and '.next' not in p]

if not auth_files:
    print("❌ Error: Could not locate lib/auth.ts")
    exit(1)

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
        content = f.read()

    # 1. Remove arrow-function logoutUser definitions (export const logoutUser = () => { ... };)
    content = re.sub(
        r"export\s+const\s+logoutUser\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=>]+)?\s*=>\s*\{[\s\S]*?\n\};?",
        "",
        content
    )

    # 2. Remove standard function logoutUser definitions (export function logoutUser(...) { ... })
    content = re.sub(
        r"export\s+function\s+logoutUser\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{[\s\S]*?\n\}",
        "",
        content
    )

    # 3. Clean trailing spaces and append single clean definition
    content = content.rstrip() + "\n\n" + clean_logout_fn + "\n"

    with open(ap, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Removed duplicate logoutUser definitions and injected unified function in: {ap}")

print("\n🚀 auth.ts compiled conflict resolved successfully!")
