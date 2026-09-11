'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, UserPlus, Shield, CheckCircle2, AlertCircle,
  Search, Filter, Trash2, Edit2, LogIn, ArrowLeft,
  RefreshCw, Check, X, ShieldCheck, Mail, Sparkles
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface ManagedUser extends User {
  createdAt?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
}

const DEFAULT_USERS: ManagedUser[] = [
  {
    id: 'usr_admin_01',
    name: 'Admin System',
    email: 'admin@zecratary.com',
    role: 'admin',
    subscriptionPlan: 'nutrition-pro-annual',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'usr_sample_02',
    name: 'Marcus Vance',
    email: 'marcus@example.com',
    role: 'user',
    subscriptionPlan: 'nutrition-pro-annual',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'usr_sample_03',
    name: 'Elena Rostova',
    email: 'elena@sample.org',
    role: 'user',
    subscriptionPlan: 'nutrition-pro-monthly',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'usr_sample_04',
    name: 'David K.',
    email: 'david.k@testmail.io',
    role: 'user',
    subscriptionPlan: 'taster',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formPlan, setFormPlan] = useState<string>('taster');

  // Sync theme
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

  // Auth Guard
  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }
    if (active.role !== 'admin') {
      router.replace('/profile');
      return;
    }
    setCurrentUser(active);
  }, [router]);

  // Load users
  const reloadUsers = useCallback(() => {
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
    reloadUsers();
    window.addEventListener('zecratary_users_updated', reloadUsers);
    window.addEventListener('storage', reloadUsers);
    return () => {
      window.removeEventListener('zecratary_users_updated', reloadUsers);
      window.removeEventListener('storage', reloadUsers);
    };
  }, [reloadUsers]);

  const saveUsersList = (updated: ManagedUser[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  // FEATURE: Login As User
  const handleLoginAsUser = (targetUser: ManagedUser) => {
    if (!confirm(`Switch active session and login as ${targetUser.name || targetUser.email}?`)) {
      return;
    }

    try {
      const activeAdmin = getCurrentUser();
      if (activeAdmin && activeAdmin.email !== targetUser.email) {
        localStorage.setItem('zecratary_admin_impersonator', JSON.stringify(activeAdmin));
      }

      // Establish new active session
      localStorage.setItem('zecratary_current_user', JSON.stringify(targetUser));
      localStorage.setItem('zecratary_user', JSON.stringify(targetUser));

      window.dispatchEvent(new Event('zecratary_auth_changed'));
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMsg({
        text: `Session authenticated as ${targetUser.name || targetUser.email}. Redirecting...`,
        type: 'success'
      });

      setTimeout(() => {
        router.push('/profile');
      }, 500);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to switch user session.', type: 'error' });
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setFormPlan('taster');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (target: ManagedUser) => {
    setEditingUser(target);
    setFormName(target.name || '');
    setFormEmail(target.email || '');
    setFormPassword('');
    setFormRole((target.role as any) || 'user');
    setFormPlan(target.subscriptionPlan || 'taster');
    setIsModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    if (editingUser) {
      const updated = users.map((u) => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: formName.trim(),
            email: cleanEmail,
            role: formRole,
            subscriptionPlan: formPlan,
            ...(formPassword.trim() ? { password: formPassword.trim() } : {})
          };
        }
        return u;
      });

      saveUsersList(updated);
      setStatusMsg({ text: `User ${cleanEmail} updated successfully!`, type: 'success' });
    } else {
      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        setStatusMsg({ text: 'A user with this email address already exists.', type: 'error' });
        return;
      }

      const newUser: ManagedUser = {
        id: 'usr_' + Date.now().toString(36),
        name: formName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: formRole,
        subscriptionPlan: formPlan,
        password: formPassword.trim() || 'password123',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      saveUsersList([newUser, ...users]);
      setStatusMsg({ text: `New user ${cleanEmail} created successfully!`, type: 'success' });
    }

    setIsModalOpen(false);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Delete User
  const handleDeleteUser = (id: string, email: string) => {
    if (currentUser && currentUser.id === id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently remove ${email}?`)) return;

    const filtered = users.filter((u) => u.id !== id);
    saveUsersList(filtered);
    setStatusMsg({ text: `User ${email} removed.`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesPlan = planFilter === 'all' || (u.subscriptionPlan || 'taster') === planFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      return matchesRole && matchesPlan && matchesSearch;
    });
  }, [users, roleFilter, planFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const proCount = users.filter((u) => u.subscriptionPlan && u.subscriptionPlan !== 'taster').length;
    return { total, adminCount, proCount };
  }, [users]);

  if (!currentUser) return null;

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* Header */}
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
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)] flex items-center gap-2">
              <Users className="h-6 w-6" /> User Management
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Manage platform accounts, grant administrative rights, customize subscription tiers, or login as a user.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl text-xs font-extrabold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <UserPlus className="h-4 w-4" /> Add New User
        </button>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            statusMsg.type === 'success'
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          className="border rounded-2xl p-4 shadow-sm flex items-center justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Total Users</div>
            <div className="text-2xl font-black font-mono mt-0.5">{metrics.total}</div>
          </div>
          <Users className="h-8 w-8 text-blue-400/30" />
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm flex items-center justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Administrators</div>
            <div className="text-2xl font-black font-mono mt-0.5 text-purple-400">{metrics.adminCount}</div>
          </div>
          <ShieldCheck className="h-8 w-8 text-purple-400/30" />
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm flex items-center justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Pro Subscribers</div>
            <div className="text-2xl font-black font-mono mt-0.5 text-emerald-400">{metrics.proCount}</div>
          </div>
          <Sparkles className="h-8 w-8 text-emerald-400/30" />
        </div>
      </div>

      {/* Users Audit Table */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div>
            <h2 className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Platform Directory</h2>
            <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Showing {filteredUsers.length} of {users.length} registered profiles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none w-48 font-semibold"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border outline-none cursor-pointer font-bold"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border outline-none cursor-pointer font-bold"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <option value="all">All Plans</option>
              <option value="taster">Taster (Free)</option>
              <option value="nutrition-pro-monthly">Nutrition Pro Monthly</option>
              <option value="nutrition-pro-annual">Nutrition Pro Annual</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b font-extrabold uppercase tracking-wider" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)', color: isDayMode ? '#64748b' : '#94a3b8' }}>
                <th className="py-3 px-3">User Details</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Subscription</th>
                <th className="py-3 px-3">Registered</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                    No users found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:opacity-95 transition">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase"
                          style={{
                            backgroundColor: u.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(224, 86, 56, 0.15)',
                            color: u.role === 'admin' ? '#c084fc' : 'var(--color-primary, #E05638)'
                          }}
                        >
                          {(u.name || u.email).substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                            {u.name || 'Anonymous User'}
                            {currentUser.id === u.id && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                        u.role === 'admin' 
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        u.subscriptionPlan?.includes('pro')
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {u.subscriptionPlan || 'taster'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                    </td>

                    {/* Actions: Login As User + Edit + Delete */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Login As User Button */}
                        <button
                          type="button"
                          onClick={() => handleLoginAsUser(u)}
                          title={`Login as ${u.name || u.email}`}
                          className="px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-85"
                          style={{
                            backgroundColor: isDayMode ? '#f0fdf4' : 'rgba(34, 197, 94, 0.1)',
                            borderColor: isDayMode ? '#86efac' : 'rgba(34, 197, 94, 0.3)',
                            color: isDayMode ? '#15803d' : '#4ade80'
                          }}
                        >
                          <LogIn className="h-3 w-3" />
                          <span>Login As User</span>
                        </button>

                        {/* 2. Edit User Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User"
                          className="p-1.5 rounded-xl border transition cursor-pointer hover:opacity-85"
                          style={{
                            backgroundColor: isDayMode ? '#f8fafc' : '#0e1626',
                            borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                            color: isDayMode ? '#0f172a' : '#94a3b8'
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* 3. Delete User Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          title="Delete User"
                          className="p-1.5 rounded-xl border text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          style={{
                            borderColor: isDayMode ? '#fca5a5' : '#7f1d1d'
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div 
            className="border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                {editingUser ? <Edit2 className="h-4 w-4 text-[var(--color-primary)]" /> : <UserPlus className="h-4 w-4 text-[var(--color-primary)]" />}
                {editingUser ? 'Edit User Details' : 'Create New User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Full Name</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full border rounded-xl px-3 py-2 outline-none font-bold"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address</label>
                <input 
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full border rounded-xl px-3 py-2 outline-none font-mono"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {editingUser ? 'Reset Password (optional)' : 'Account Password'}
                </label>
                <input 
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Leave blank to preserve current password' : '••••••••'}
                  required={!editingUser}
                  className="w-full border rounded-xl px-3 py-2 outline-none font-mono"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full border rounded-xl px-2.5 py-2 outline-none font-bold cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Subscription Plan</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 outline-none font-bold cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <option value="taster">Taster (Free)</option>
                    <option value="nutrition-pro-monthly">Nutrition Pro (Monthly)</option>
                    <option value="nutrition-pro-annual">Nutrition Pro (Annual)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                  style={{
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#64748b' : '#94a3b8'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
