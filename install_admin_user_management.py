import os
import glob

# 1. Detect active Next.js App Router root
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
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

# 2. Provision /admin/add-user/page.tsx
target_dir = os.path.join(app_dir, 'admin', 'add-user')
os.makedirs(target_dir, exist_ok=True)
target_path = os.path.join(target_dir, 'page.tsx')

page_code = """'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  UserPlus, Users, Search, Trash2, Edit2, Shield, 
  Award, Mail, Lock, User as UserIcon, CheckCircle2, 
  AlertCircle, ArrowLeft, RefreshCw, X, Check, Eye, EyeOff
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface ManagedUser extends User {
  linkedProviders?: string[];
}

export default function AdminUserManagementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeAdmin, setActiveAdmin] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isDayMode, setIsDayMode] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    subscriptionPlan: 'taster'
  });
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  const loadUsers = useCallback(() => {
    try {
      const raw = localStorage.getItem('zecratary_users');
      if (raw) {
        setUsers(JSON.parse(raw));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    loadUsers();

    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_users_updated', loadUsers);
    window.addEventListener('storage', syncTheme);
    window.addEventListener('storage', loadUsers);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_users_updated', loadUsers);
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('storage', loadUsers);
    };
  }, [syncTheme, loadUsers]);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }
    if (active.role !== 'admin' && !active.email.includes('admin')) {
      router.replace('/profile');
      return;
    }
    setActiveAdmin(active);
  }, [router]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      subscriptionPlan: 'taster'
    });
    setEditingUserId(null);
    setIsCreating(false);
    setShowPassword(false);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = formData.name.trim();

    if (!cleanEmail || !cleanName) {
      setStatusMsg({ text: 'Name and a valid email are required.', success: false });
      return;
    }

    if (!editingUserId && !formData.password) {
      setStatusMsg({ text: 'Password is required when creating a new account.', success: false });
      return;
    }

    const existingIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (!editingUserId && existingIndex !== -1) {
      setStatusMsg({ text: 'An account with this email address already exists.', success: false });
      return;
    }

    let updatedUsers = [...users];

    if (editingUserId) {
      updatedUsers = updatedUsers.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: cleanName,
            email: cleanEmail,
            role: formData.role,
            subscriptionPlan: formData.subscriptionPlan,
            subscriptionTier: formData.subscriptionPlan,
            password: formData.password ? formData.password : u.password
          };
        }
        return u;
      });
      setStatusMsg({ text: `User ${cleanName} updated successfully.`, success: true });
    } else {
      const newUser: ManagedUser = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: cleanName,
        email: cleanEmail,
        password: formData.password,
        role: formData.role,
        subscriptionPlan: formData.subscriptionPlan,
        subscriptionTier: formData.subscriptionPlan,
        createdAt: new Date().toISOString()
      };
      updatedUsers.unshift(newUser);
      setStatusMsg({ text: `User ${cleanName} created successfully.`, success: true });
    }

    setUsers(updatedUsers);
    localStorage.setItem('zecratary_users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));

    resetForm();
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleEditClick = (target: ManagedUser) => {
    setEditingUserId(target.id);
    setFormData({
      name: target.name || '',
      email: target.email || '',
      password: '',
      role: target.role === 'admin' ? 'admin' : 'user',
      subscriptionPlan: target.subscriptionPlan || 'taster'
    });
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteUser = (target: ManagedUser) => {
    if (target.id === activeAdmin?.id || target.email.toLowerCase() === activeAdmin?.email.toLowerCase()) {
      setStatusMsg({ text: 'You cannot delete your own active administrator account.', success: false });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${target.name} (${target.email})?`)) return;

    const updated = users.filter(u => u.id !== target.id);
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));

    setStatusMsg({ text: `Deleted user ${target.name}.`, success: true });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesPlan = planFilter === 'all' || (u.subscriptionPlan || 'taster').toLowerCase().includes(planFilter.toLowerCase());

      return matchesSearch && matchesRole && matchesPlan;
    });
  }, [users, searchQuery, roleFilter, planFilter]);

  if (!activeAdmin) return null;

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
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
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary, #E05638)' }}>
              {t('addUser') || 'User Management & Provisioning'}
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Inspect registered accounts, create users manually, assign administrator roles, and configure subscription plans.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsCreating(!isCreating);
          }}
          className="px-4 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          {isCreating ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isCreating ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {statusMsg && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            statusMsg.success
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {statusMsg.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      {isCreating && (
        <div 
          className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in zoom-in-95 transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <h2 className="text-base font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <UserPlus className="h-4 w-4 text-[var(--color-primary)]" />
              {editingUserId ? 'Edit User Profile & Permissions' : 'Create New Account'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-white cursor-pointer text-xs">✕</button>
          </div>

          <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Robin Banks"
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-bold"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@zecratary.com"
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {editingUserId ? 'New Password (optional)' : 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUserId ? 'Leave blank to retain' : '••••••••'}
                    className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Role Permission</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full border rounded-xl px-3 py-2.5 outline-none font-bold cursor-pointer"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Subscription Tier</label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2.5 outline-none font-bold cursor-pointer"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                >
                  <option value="taster">Taster (Free Tier)</option>
                  <option value="nutrition-pro-monthly">Nutrition Pro (Monthly)</option>
                  <option value="nutrition-pro-annual">Nutrition Pro (Annual)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <button
                type="button" onClick={resetForm}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer transition hover:opacity-80"
                style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              >
                <Check className="h-4 w-4" /> {editingUserId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div 
        className="p-4 border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border rounded-xl pl-10 pr-3.5 py-2 text-xs outline-none"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="border text-xs rounded-xl px-3 py-2 font-bold outline-none cursor-pointer flex-1 md:flex-initial"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="border text-xs rounded-xl px-3 py-2 font-bold outline-none cursor-pointer flex-1 md:flex-initial"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
          >
            <option value="all">All Plans</option>
            <option value="taster">Taster (Free)</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {/* USER LIST TABLE */}
      <div 
        className="border rounded-3xl overflow-hidden shadow-xl"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b', backgroundColor: isDayMode ? '#f8fafc' : '#070b13' }}>
                <th className="p-4 font-black uppercase text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>User</th>
                <th className="p-4 font-black uppercase text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Role</th>
                <th className="p-4 font-black uppercase text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Subscription</th>
                <th className="p-4 font-black uppercase text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Auth Origin</th>
                <th className="p-4 font-black uppercase text-[11px] text-right" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isCurrent = user.id === activeAdmin.id;
                  const authOrigin = user.id.startsWith('usr_google_')
                    ? 'Google'
                    : user.id.startsWith('usr_facebook_')
                    ? 'Facebook'
                    : user.id.startsWith('usr_apple_')
                    ? 'Apple'
                    : 'Email/Pass';

                  return (
                    <tr key={user.id} className="transition hover:opacity-90">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs uppercase"
                            style={{ backgroundColor: isDayMode ? '#f1f5f9' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: 'var(--color-primary, #E05638)' }}
                          >
                            {user.name.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                              {user.name}
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-extrabold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          user.role === 'admin'
                            ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400')
                            : (isDayMode ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300')
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-bold capitalize" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                          {user.subscriptionPlan || 'Taster'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded border" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>
                          {authOrigin}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 border rounded-lg hover:opacity-80 transition cursor-pointer"
                            style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#334155' : '#cbd5e1' }}
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 border rounded-lg text-red-400 border-red-900/40 hover:bg-red-950/20 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isCurrent ? 'Cannot delete current user' : 'Delete User'}
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
    </div>
  );
}
"""

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(page_code)

print(f"✓ Provisioned Admin User Management: {target_path}")
print("Admin User Management suite installed successfully!")
