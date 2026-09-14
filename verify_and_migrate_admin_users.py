import os
import glob
import re

# 1. Locate active App Router directory
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
    print("❌ Error: Could not locate App Router root.")
    exit(1)

base_dir = os.path.dirname(app_dir)
components_dir = os.path.join(base_dir, 'components')

print(f"✓ Detected App Router: {app_dir}")

# 2. Redirect legacy /admin/add-user to /admin/users
add_user_dir = os.path.join(app_dir, 'admin', 'add-user')
if os.path.exists(add_user_dir):
    add_user_page = os.path.join(add_user_dir, 'page.tsx')
    redirect_code = """'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyAddUserRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);
  return null;
}
"""
    with open(add_user_page, 'w', encoding='utf-8') as f:
        f.write(redirect_code)
    print(f"✓ Routed legacy {add_user_page} -> /admin/users")

# 3. Update Sidebar.tsx links
sidebar_candidates = [
    os.path.join(components_dir, 'Sidebar.tsx'),
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((p for p in sidebar_candidates if os.path.exists(p)), None)

if sidebar_path:
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        sidebar_content = f.read()

    if '/admin/add-user' in sidebar_content:
        sidebar_content = sidebar_content.replace('/admin/add-user', '/admin/users')
        sidebar_content = re.sub(r'>\s*Add User\s*<', '>Users<', sidebar_content)
        with open(sidebar_path, 'w', encoding='utf-8') as f:
            f.write(sidebar_content)
        print(f"✓ Updated navigation in {sidebar_path} to point to /admin/users")
    else:
        print(f"✓ Sidebar already references /admin/users or contains no legacy links.")

# 4. Verify /admin/users/page.tsx
admin_users_path = os.path.join(app_dir, 'admin', 'users', 'page.tsx')
direct_users_path = os.path.join(app_dir, 'users', 'page.tsx')

if not os.path.exists(admin_users_path):
    print(f"⚠ Notice: {admin_users_path} not found. Creating canonical Users Management page...")
    full_users_code = """'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Plus, Trash2, Edit2, LogIn, CheckCircle2, 
  AlertCircle, Shield, User as UserIcon, X, Save, Crown
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'Administrator',
    email: 'admin@zecratary.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    subscriptionTier: 'nutrition-pro-annual',
    planExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString()
  }
];

export default function UsersManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editPlan, setEditPlan] = useState('taster');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newPlan, setNewPlan] = useState('taster');

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  const loadUsers = useCallback(() => {
    try {
      const raw = localStorage.getItem('zecratary_users');
      if (raw) {
        setUsers(JSON.parse(raw));
      } else {
        localStorage.setItem('zecratary_users', JSON.stringify(DEFAULT_USERS));
        setUsers(DEFAULT_USERS);
      }
    } catch (_) {
      setUsers(DEFAULT_USERS);
    }
  }, []);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active || active.role !== 'admin') {
      router.replace(active ? '/profile' : '/login');
      return;
    }
    setCurrentUser(active);
    loadUsers();

    window.addEventListener('zecratary_users_updated', loadUsers);
    window.addEventListener('storage', loadUsers);
    return () => {
      window.removeEventListener('zecratary_users_updated', loadUsers);
      window.removeEventListener('storage', loadUsers);
    };
  }, [router, loadUsers]);

  const saveUsers = (updated: User[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLoginAsUser = (targetUser: User) => {
    if (!confirm(`Switch session and login as ${targetUser.name || targetUser.email}?`)) return;
    try {
      if (currentUser && currentUser.role === 'admin') {
        localStorage.setItem('zecratary_impersonator_admin', JSON.stringify(currentUser));
      }
      localStorage.setItem('zecratary_current_user', JSON.stringify(targetUser));
      document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(targetUser))}; path=/; max-age=604800; SameSite=Lax`;
      window.dispatchEvent(new Event('zecratary_auth_changed'));
      window.dispatchEvent(new Event('storage'));
      window.location.href = '/profile';
    } catch (err: any) {
      setStatusMsg({ text: 'Failed to switch user session.', type: 'error' });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updated = users.map(u => u.id === editingUser.id ? {
      ...u, name: editName.trim(), role: editRole, subscriptionPlan: editPlan, subscriptionTier: editPlan
    } : u);
    saveUsers(updated);
    setEditingUser(null);
    setStatusMsg({ text: 'User details updated successfully!', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDeleteUser = (id: string, email: string) => {
    if (email === currentUser?.email) {
      alert('You cannot delete your own active admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    setStatusMsg({ text: `User ${email} deleted.`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      setStatusMsg({ text: 'A user with this email already exists.', type: 'error' });
      return;
    }
    const createdUser: User = {
      id: 'usr_' + Date.now().toString(36),
      name: newName.trim() || 'New User',
      email: cleanEmail,
      role: newRole,
      subscriptionPlan: newPlan,
      subscriptionTier: newPlan,
      planExpiryDate: newPlan !== 'taster' ? new Date(Date.now() + 365 * 86400000).toISOString() : ''
    };
    saveUsers([createdUser, ...users]);
    setNewName('');
    setNewEmail('');
    setShowAddModal(false);
    setStatusMsg({ text: `User ${createdUser.email} created successfully.`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  if (!currentUser) return null;

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ 
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' 
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Users Management
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Manage user accounts, assign admin roles, override subscription tiers, and log in directly as any user.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <Plus className="h-4 w-4" /> Add New User
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
          statusMsg.type === 'success' 
            ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300')
            : (isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300')
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div 
        className="p-4 border rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or user ID..."
            className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <option value="all">All Roles</option>
            <option value="user">Standard Users</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div 
        className="border rounded-3xl overflow-hidden shadow-xl"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead 
              className="border-b font-extrabold uppercase tracking-wider"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                borderColor: isDayMode ? '#e2e8f0' : '#1e293b',
                color: isDayMode ? '#64748b' : '#94a3b8'
              }}
            >
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Subscription Tier</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const plan = (u as any).subscriptionPlan || (u as any).subscriptionTier || 'taster';
                  const isSelf = u.email === currentUser.email;

                  return (
                    <tr key={u.id} className="hover:opacity-95 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                            style={{
                              backgroundColor: u.role === 'admin' ? 'rgba(224, 86, 56, 0.15)' : (isDayMode ? '#e2e8f0' : '#1e293b'),
                              color: u.role === 'admin' ? 'var(--color-primary)' : (isDayMode ? '#0f172a' : '#ffffff')
                            }}
                          >
                            {u.name ? u.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-black text-sm flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                              {u.name || 'Unnamed User'}
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                          u.role === 'admin'
                            ? (isDayMode ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-orange-950/40 border-orange-500/40 text-orange-400')
                            : (isDayMode ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300')
                        }`}>
                          {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                          {u.role || 'user'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1 ${
                          plan.includes('pro') || plan.includes('annual') || plan.includes('monthly')
                            ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400')
                            : (isDayMode ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400')
                        }`}>
                          <Crown className="h-3 w-3" />
                          {plan}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoginAsUser(u)}
                            title={`Log in as ${u.name || u.email}`}
                            className="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90"
                            style={{
                              backgroundColor: isDayMode ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)',
                              borderColor: isDayMode ? '#86efac' : 'rgba(16, 185, 129, 0.4)',
                              color: isDayMode ? '#15803d' : '#34d399'
                            }}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Login As User</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setEditName(u.name || '');
                              setEditRole(u.role || 'user');
                              setEditPlan((u as any).subscriptionPlan || 'taster');
                            }}
                            title="Edit User"
                            className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : '#1e293b',
                              borderColor: isDayMode ? '#cbd5e1' : '#334155',
                              color: isDayMode ? '#0f172a' : '#cbd5e1'
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete User'}
                            className="p-1.5 rounded-xl border text-red-400 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ borderColor: isDayMode ? '#fca5a5' : '#7f1d1d' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Edit2 className="h-4 w-4 text-[var(--color-primary)]" /> Edit User Details
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>User Email</label>
                <input 
                  type="email" disabled value={editingUser.email} 
                  className="w-full border rounded-xl px-3 py-2 font-mono opacity-60"
                  style={{ backgroundColor: isDayMode ? '#f1f5f9' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Full Name</label>
                <input 
                  type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} 
                  className="w-full border rounded-xl px-3 py-2 font-bold outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Role</label>
                  <select 
                    value={editRole} onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Subscription Plan</label>
                  <select 
                    value={editPlan} onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  >
                    <option value="taster">Taster (Free)</option>
                    <option value="nutrition-pro-monthly">Nutrition Pro (Monthly)</option>
                    <option value="nutrition-pro-annual">Nutrition Pro (Annual)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded-xl font-bold cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>Cancel</button>
                <button type="submit" className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Plus className="h-4 w-4 text-[var(--color-primary)]" /> Create New User
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address *</label>
                <input 
                  type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com"
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Full Name</label>
                <input 
                  type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Doe"
                  className="w-full border rounded-xl px-3 py-2 font-bold outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Role</label>
                  <select 
                    value={newRole} onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Subscription Plan</label>
                  <select 
                    value={newPlan} onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  >
                    <option value="taster">Taster (Free)</option>
                    <option value="nutrition-pro-monthly">Nutrition Pro (Monthly)</option>
                    <option value="nutrition-pro-annual">Nutrition Pro (Annual)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-xl font-bold cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>Cancel</button>
                <button type="submit" className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"""
    os.makedirs(os.path.dirname(admin_users_path), exist_ok=True)
    with open(admin_users_path, 'w', encoding='utf-8') as f:
        f.write(full_users_code)
    print(f"✓ Provisioned {admin_users_path}")
else:
    print(f"✓ Verified existing {admin_users_path}")

# 5. Mirror /users to /admin/users to support root routing
os.makedirs(os.path.dirname(direct_users_path), exist_ok=True)
reexport_code = """'use client';
import UsersManagementPage from '../admin/users/page';
export default UsersManagementPage;
"""
with open(direct_users_path, 'w', encoding='utf-8') as f:
    f.write(reexport_code)
print(f"✓ Linked direct route /users ({direct_users_path}) -> {admin_users_path}")

print("\n✅ Verification and migration to /admin/users complete!")
