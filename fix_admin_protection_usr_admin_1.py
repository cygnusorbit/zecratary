import os
import glob
import re

# 1. Locate App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/users/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(matches[0])))

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

# 2. Update /api/admin/users/route.ts to strictly protect only usr_admin_1
api_users_file = os.path.join(app_dir, 'api', 'admin', 'users', 'route.ts')
if os.path.exists(api_users_file):
    with open(api_users_file, 'r', encoding='utf-8') as f:
        api_content = f.read()

    # Ensure DELETE route explicitly rejects only usr_admin_1
    delete_handler_pattern = re.compile(r'export\s+async\s+function\s+DELETE\s*\(req:\s*Request\)\s*\{[\s\S]*?\n\}', re.MULTILINE)
    new_api_delete = """export async function DELETE(req: Request) {
  try {
    const { id, email } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanId = (id || '').trim().toLowerCase();

    // Guard: Only usr_admin_1 is permanently protected from deletion
    if (cleanId === 'usr_admin_1' || id === 'usr_admin_1') {
      return NextResponse.json(
        { success: false, error: 'The primary system administrator account (usr_admin_1) cannot be deleted.' },
        { status: 403 }
      );
    }

    const deletedList = readDeleted();
    if (cleanEmail && !deletedList.includes(cleanEmail)) deletedList.push(cleanEmail);
    if (cleanId && !deletedList.includes(cleanId)) deletedList.push(cleanId);
    writeDeleted(deletedList);

    let users = readUsers();
    users = users.filter((u: any) => {
      if (cleanId && u.id && u.id.toLowerCase() === cleanId) return false;
      if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return false;
      return true;
    });
    writeUsers(users);

    return NextResponse.json({ success: true, deleted: { id, email }, deletedUsers: deletedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}"""

    if delete_handler_pattern.search(api_content):
        api_content = delete_handler_pattern.sub(new_api_delete, api_content, count=1)
        with open(api_users_file, 'w', encoding='utf-8') as f:
            f.write(api_content)
        print(f"✓ Updated backend DELETE guard for usr_admin_1 in {api_users_file}")

# 3. Patch user management pages (/admin/users/page.tsx and /users/page.tsx)
target_pages = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

# Replacement for isFirstAdminUser: strictly checks user.id === 'usr_admin_1'
new_is_first_admin = """  // Helper: Strictly identify primary root administrator (usr_admin_1)
  const isFirstAdminUser = useCallback((targetUser: AppUser | null | undefined): boolean => {
    if (!targetUser) return false;
    return targetUser.id === 'usr_admin_1';
  }, []);"""

# Replacement for handleDeleteUser: only blocks usr_admin_1 and active session self-deletion
new_handle_delete_user = """  // Delete User (Allows deleting any admin except usr_admin_1 and current active session)
  const handleDeleteUser = async (id: string, userEmail: string, userName?: string) => {
    const targetUser = users.find(u => u.id === id || (u.email && u.email.toLowerCase() === userEmail.toLowerCase()));

    if (currentUser?.email?.toLowerCase() === userEmail.toLowerCase() || currentUser?.id === id) {
      alert('You cannot delete your own active admin account.');
      return;
    }

    if (id === 'usr_admin_1' || targetUser?.id === 'usr_admin_1') {
      alert('The primary system administrator account (usr_admin_1) cannot be deleted.');
      return;
    }

    const displayName = userName || targetUser?.name || userEmail;
    if (!confirm(`Are you sure you want to delete "${displayName}" (${userEmail})? This action cannot be undone.`)) return;

    try {
      const cleanEmail = userEmail.toLowerCase().trim();

      // 1. Record tombstone in localStorage to prevent cache resurrection
      try {
        const rawDel = localStorage.getItem('zecratary_deleted_users');
        const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (cleanEmail && !delList.includes(cleanEmail)) delList.push(cleanEmail);
        if (id && !delList.includes(id)) delList.push(id);
        localStorage.setItem('zecratary_deleted_users', JSON.stringify(delList));
      } catch (_) {}

      // 2. Remove locally from state and localStorage
      const updated = users.filter(u => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail));
      setUsers(updated);
      if (typeof setSelectedUserIds === 'function') {
        setSelectedUserIds((prev: string[]) => prev.filter((uid) => uid !== id));
      }
      localStorage.setItem('zecratary_users', JSON.stringify(updated));

      // 3. Remove from backend API
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: cleanEmail }),
      }).catch(() => {});

      showToast(`User "${displayName}" has been deleted.`);
      window.dispatchEvent(new Event('zecratary_users_updated'));
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user: ' + (err?.message || 'Server error'));
    }
  };"""

for page_file in target_pages:
    if not os.path.exists(page_file):
        continue

    with open(page_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace isFirstAdminUser definition
    is_first_pattern = re.compile(
        r'//\s*(?:Helper:\s*)?Identify(?:ing)?\s*(?:Root\s*/\s*)?Primary\s*(?:First\s*)?Administrator[\s\S]*?const\s+isFirstAdminUser\s*=\s*useCallback\s*\(\s*\([^\)]*\)[^{]*\{[\s\S]*?\}\s*,\s*\[.*?\]\);',
        re.MULTILINE
    )
    if not is_first_pattern.search(content):
        is_first_pattern = re.compile(
            r'const\s+isFirstAdminUser\s*=\s*useCallback\s*\(\s*\([^\)]*\)[^{]*\{[\s\S]*?\}\s*,\s*\[.*?\]\);',
            re.MULTILINE
        )

    if is_first_pattern.search(content):
        content = is_first_pattern.sub(new_is_first_admin, content, count=1)
        print(f"✓ Scoped primary admin protection exclusively to usr_admin_1 in {page_file}")

    # 2. Replace handleDeleteUser definition
    del_pattern = re.compile(
        r'//\s*Delete User[\s\S]*?const\s+handleDeleteUser\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \};',
        re.MULTILINE
    )
    if del_pattern.search(content):
        content = del_pattern.sub(new_handle_delete_user, content, count=1)
        print(f"✓ Updated handleDeleteUser in {page_file}")

    # 3. Ensure button tooltip reflects only primary system admin for usr_admin_1
    content = content.replace('Cannot delete primary system admin', 'Cannot delete primary system admin (usr_admin_1)')

    with open(page_file, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Administrator deletion rule successfully updated: Only usr_admin_1 is protected!")
