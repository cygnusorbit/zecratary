import os
import glob
import re

candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/profile/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(matches[0])

if not app_dir:
    print("Error: Could not locate Next.js app directory.")
    exit(1)

profile_files = glob.glob(f'{app_dir}/**/profile/page.tsx', recursive=True)
if not profile_files:
    profile_files = glob.glob('**/profile/page.tsx', recursive=True)
profile_files = [p for p in profile_files if 'node_modules' not in p and '.next' not in p]

for pp in profile_files:
    with open(pp, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove recursive self-listening storage event from handleSyncEvent and applySavedTheme
    content = re.sub(
        r"window\.addEventListener\('storage',\s*applySavedTheme\);?",
        "// window.addEventListener('storage', applySavedTheme);",
        content
    )
    content = re.sub(
        r"window\.removeEventListener\('storage',\s*applySavedTheme\);?",
        "// window.removeEventListener('storage', applySavedTheme);",
        content
    )
    content = re.sub(
        r"window\.addEventListener\('storage',\s*handleSyncEvent\);?",
        "// window.addEventListener('storage', handleSyncEvent);",
        content
    )
    content = re.sub(
        r"window\.removeEventListener\('storage',\s*handleSyncEvent\);?",
        "// window.removeEventListener('storage', handleSyncEvent);",
        content
    )

    # 2. Prevent handleToggleSocialLink from dispatching synthetic storage events back into current window
    content = re.sub(
        r"window\.dispatchEvent\(new Event\('storage'\)\);?",
        "// window.dispatchEvent(new Event('storage'));",
        content
    )
    content = re.sub(
        r"window\.dispatchEvent\(new Event\('zecratary_auth_changed'\)\);?",
        "// window.dispatchEvent(new Event('zecratary_auth_changed'));",
        content
    )

    # 3. Ensure reloadActiveUser checks session cookie if localStorage is delayed or empty
    cookie_check = """    initAuthStorage();
    let active = getCurrentUser() as ExtendedUser | null;

    if (!active && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\\s*)zecratary_session=([^;]+)/);
      if (match && match[1]) {
        try {
          const cookieData = JSON.parse(decodeURIComponent(match[1]));
          if (cookieData && (cookieData.email || cookieData.id)) {
            active = {
              id: cookieData.id || 'usr_standard_default',
              name: cookieData.name || 'Standard User',
              email: cookieData.email || 'user@foodieprep.com',
              role: cookieData.role || 'user',
              subscriptionPlan: 'taster'
            };
            localStorage.setItem('zecratary_current_user', JSON.stringify(active));
          }
        } catch (_) {}
      }
    }

    if (!active) {
      router.replace('/login');
      return;
    }"""

    content = re.sub(
        r'initAuthStorage\(\);\s*\n\s*const active = getCurrentUser\(\) as ExtendedUser \| null;\s*\n\s*if \(!active\) \{\s*\n\s*router\.replace\(\'/login\'\);\s*\n\s*return;\s*\}',
        cookie_check,
        content,
        count=1
    )

    with open(pp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully patched {pp}")

print("Done! Profile freeze loop resolved.")
