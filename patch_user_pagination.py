import os

user_management_code = """'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, LogOut, Check,
  ShieldCheck, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getCurrentUser, logoutUser, initAuthStorage } from '@/lib/auth';

interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function AdminUserManagementPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'user'>('user');
  const [addError, setAddError] = useState('');

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editError, setEditError] = useState('');

  const loadUsers = () => {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        setUsers(JSON.parse(raw));
      } catch (e) {}
    }
  };

  useEffect(() => {
    document.title = 'User Management - Admin Console';
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();

    const handleSync = () => loadUsers();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, []);

  const saveUsersList = (updated: AppUser[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      !search.trim() || 
      u.name.toLowerCase().includes(search.toLowerCase().trim()) || 
      u.email.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.role.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [users, search]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Adjust page if current page exceeds total pages after deletion
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // --- ADD USER ---
  const handleOpenAddModal = () => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole('user');
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError('Please fill in all required fields.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      setAddError('A user with this email address already exists.');
      return;
    }

    if (addPassword.length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`User "${newUser.name}" successfully created!`);
  };

  // --- EDIT USER ---
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setEditError('');

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanName = editName.trim();

    if (!cleanName || !cleanEmail) {
      setEditError('Name and Email cannot be empty.');
      return;
    }

    const emailTaken = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setEditError('Another user is already registered with this email.');
      return;
    }

    const updated = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: cleanName,
          email: cleanEmail,
          password: editPassword ? editPassword : u.password,
          role: editRole
        };
      }
      return u;
    });

    saveUsersList(updated);

    if (currentUser?.id === editingUserId) {
      const activeUserUpdated = {
        ...currentUser,
        name: cleanName,
        email: cleanEmail,
        role: editRole
      };
      localStorage.setItem('zecratary_current_user', JSON.stringify(activeUserUpdated));
      setCurrentUser(activeUserUpdated);
      window.dispatchEvent(new Event('zecratary_auth_changed'));
    }

    setShowEditModal(false);
    showToast(`User "${cleanName}" updated successfully!`);
  };

  // --- DELETE USER ---
  const handleDeleteUser = (id: string, userEmail: string, userName: string) => {
    if (currentUser?.email === userEmail || currentUser?.id === id) {
      alert('You cannot delete your own active admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${userName}" (${userEmail})? This action cannot be undone.`)) return;

    const updated = users.filter(u => u.id !== id);
    saveUsersList(updated);
    showToast(`User "${userName}" has been deleted.`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-20 px-2 sm:px-4 pt-2">
      
      {/* ACCESS WARNING FOR NON-ADMINS */}
      {currentUser && currentUser.role !== 'admin' && (
        <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>. Switch to an admin account to manage full user access permissions.
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 bg-[#E05638] text-white font-bold rounded-xl shrink-0 ml-3"
          >
            Switch to Admin
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/60 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-8 w-8 text-[#E05638]" /> User Management
          </h1>
          <p className="text-sm font-semibold text-emerald-400">
            Create new accounts, edit credentials, assign roles, and remove users ({users.length} registered)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddModal}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
          <Link
            href="/admin"
            className="bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Shield className="h-4 w-4 text-emerald-400" /> Admin Settings
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, email address, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#070b13] border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition shadow-inner"
        />
      </div>

      {/* USERS TABLE & PAGINATION CONTAINER */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Created Date</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No users found matching "{search}".
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                  return (
                    <tr key={user.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#111726] border border-slate-700 flex items-center justify-center text-xs font-black text-[#E05638] shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white">{user.name}</span>
                            {isCurrent && (
                              <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          user.role === 'admin'
                            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm"
                            title="Edit User Details"
                          >
                            <Edit3 className="h-4 w-4 text-[#E05638]" />
                          </button>
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                            className={`p-2 rounded-xl border transition shadow-sm ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800'
                            }`}
                            title={isCurrent ? 'Cannot delete active account' : 'Delete User'}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* 10-USER PAGINATION CONTROLS */}
        <div className="px-5 py-4 bg-[#070b13] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            {filteredUsers.length === 0 ? (
              'Showing 0 users'
            ) : (
              <>
                Showing <span className="font-bold text-white">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-white">{endIndex}</span> of{' '}
                <span className="font-bold text-white">{filteredUsers.length}</span> users (10 per page)
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={`p-2 rounded-xl border flex items-center justify-center transition ${
                currentPage <= 1
                  ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                  : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17]'
              }`}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center border ${
                  currentPage === pageNum
                    ? 'bg-[#E05638] text-white border-[#E05638] shadow-md shadow-[#E05638]/20'
                    : 'bg-[#0b0f17] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={`p-2 rounded-xl border flex items-center justify-center transition ${
                currentPage >= totalPages
                  ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                  : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17]'
              }`}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ADD USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Add New User
              </h2>
              <p className="text-slate-400 text-xs">Create a new user account with role permissions.</p>
            </div>

            {addError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Smith"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 4 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'user'}
                      onChange={() => setAddRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setAddRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'admin'}
                      onChange={() => setAddRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs"
                >
                  <UserPlus className="h-4 w-4" /> Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EDIT USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <Edit3 className="h-5 w-5" /> Edit User Account
              </h2>
              <p className="text-slate-400 text-xs">Update account name, email address, password, or role.</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Change Password (leave blank to keep current)</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Enter new password..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setEditRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'user'}
                      onChange={() => setEditRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setEditRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'admin'}
                      onChange={() => setEditRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs"
                >
                  <Check className="h-4 w-4" /> Save Changes
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

paths = [
    "apps/web/src/app/add-user/page.tsx",
    "apps/web/src/app/admin/add-user/page.tsx",
    "apps/web/src/app/admin/users/page.tsx"
]

for p in paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(user_management_code)
    print(f"✅ Added 10-user pagination controls to {p}")

