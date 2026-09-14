import os
import glob
import re

candidates = [
    'apps/web/src/app/admin/users/page.tsx',
    'src/app/admin/users/page.tsx',
    'apps/web/src/app/users/page.tsx',
    'src/app/users/page.tsx'
]

found_files = [p for p in candidates if os.path.exists(p)]
if not found_files:
    found_files = glob.glob('**/admin/users/page.tsx', recursive=True) + glob.glob('**/users/page.tsx', recursive=True)

found_files = list(set([p for p in found_files if 'node_modules' not in p and '.next' not in p]))

if not found_files:
    print("❌ Error: Could not locate admin/users/page.tsx")
    exit(1)

clean_delete_handler = """  const handleDeleteUser = async (id: string, email: string) => {
    if (currentUser && (currentUser.id === id || (currentUser.email && currentUser.email.toLowerCase() === email.toLowerCase()))) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete ${email}?`)) return;

    try {
      // 1. Remove from server registry
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email })
      });

      // 2. Remove from local client state and localStorage
      const cleanEmail = email.toLowerCase().trim();
      const updated = users.filter(u => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail));
      setUsers(updated);
      localStorage.setItem('zecratary_users', JSON.stringify(updated));

      // 3. Notify app components
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user: ' + (err?.message || 'Server error'));
    }
  };"""

for file_path in found_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(
        r'const\s+handleDeleteUser\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?setStatusMsg[\s\S]*?\n  \};',
        re.MULTILINE
    )

    if pattern.search(content):
        content = pattern.sub(lambda _: clean_delete_handler, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Fixed handleDeleteUser and removed undefined setStatusMsg in: {file_path}")
    else:
        if 'setStatusMsg' in content:
            content = re.sub(r'^\s*setStatusMsg\([^)]*\);?\s*$', '', content, flags=re.MULTILINE)
            content = re.sub(r'^\s*setTimeout\(\(\)\s*=>\s*setStatusMsg\([^)]*\)[^;]*;\s*$', '', content, flags=re.MULTILINE)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Cleaned stray setStatusMsg statements in: {file_path}")

print("\n🚀 ReferenceError: setStatusMsg fixed successfully!")
