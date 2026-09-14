import os

paths = [
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx'
]
profile_path = next((p for p in paths if os.path.exists(p)), None)

if not profile_path:
    print("❌ Error: Could not locate profile page.")
    exit(1)

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'handleDeleteAccount' not in content:
    delete_func_code = """
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.')) {
      return;
    }
    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const userId = user.id;

      try {
        const rawDel = localStorage.getItem('zecratary_deleted_users');
        const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (cleanEmail && !delList.includes(cleanEmail)) delList.push(cleanEmail);
        if (userId && !delList.includes(userId)) delList.push(userId);
        localStorage.setItem('zecratary_deleted_users', JSON.stringify(delList));
      } catch (_) {}

      try {
        const rawUsers = localStorage.getItem('zecratary_users');
        const users: any[] = rawUsers ? JSON.parse(rawUsers) : [];
        const updatedUsers = users.filter(u => u.id !== userId && (!u.email || u.email.toLowerCase() !== cleanEmail));
        localStorage.setItem('zecratary_users', JSON.stringify(updatedUsers));
      } catch (_) {}

      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, email: cleanEmail }),
      }).catch(() => {});

      logoutUser();
      router.replace('/login');
    } catch (err: any) {
      alert('Failed to delete account: ' + (err?.message || 'Server error'));
    }
  };
"""
    content = content.replace("  const handleSelectPlan = async (plan: SubscriptionPlanItem) => {", delete_func_code + "\n  const handleSelectPlan = async (plan: SubscriptionPlanItem) => {")

delete_button_code = """              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs text-red-400 hover:text-red-300 border-red-900/60 hover:bg-red-950/30"
              >
                Delete Account
              </button>"""

if 'onClick={handleDeleteAccount}' not in content:
    content = content.replace(
        """                <LogOut className="h-4 w-4 text-red-500" /> {t('signOutBtn') || 'Sign Out'}
              </button>""",
        f"""                <LogOut className="h-4 w-4 text-red-500" /> {{t('signOutBtn') || 'Sign Out'}}
              </button>

{delete_button_code}"""
    )

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully added Delete Account feature to {profile_path}")
