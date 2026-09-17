'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, Check,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Users, CreditCard, Zap, Sparkles, Download, RefreshCw
} from 'lucide-react';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { applyThemeToDocument } from '@/lib/themeConfig';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings 
} from '@/lib/adminSync';

interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  subscriptionPlan?: string;
  createdAt: string;
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  priceFormatted: string;
  interval?: string;
  isFree?: boolean;
}

const DEFAULT_AVAILABLE_PLANS: PlanOption[] = [
  { id: 'taster', name: 'Taster (Free)', slug: 'taster', priceFormatted: 'Free', isFree: true },
  { id: 'nutrition-pro-monthly', name: 'Nutrition Pro (Monthly)', slug: 'nutrition-pro-monthly', priceFormatted: '$8.99/mo', interval: 'MONTH' },
  { id: 'nutrition-pro-annual', name: 'Nutrition Pro (Annual)', slug: 'nutrition-pro-annual', priceFormatted: '$59.99/yr', interval: 'YEAR' },
];

type SortField = 'name' | 'createdAt' | 'subscriptionPlan';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function AdminUserManagementPage() {
  const langContext = useTranslation();
  const t = langContext?.t;
  const locale = langContext?.locale;

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>(DEFAULT_AVAILABLE_PLANS);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected User IDs for Export
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Admin Table Sorting & Pagination State
  const [adminSortField, setAdminSortField] = useState<SortField>('createdAt');
  const [adminSortOrder, setAdminSortOrder] = useState<SortOrder>('desc');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  // Standard User Table Sorting & Pagination State
  const [userSortField, setUserSortField] = useState<SortField>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<SortOrder>('desc');
  const [userCurrentPage, setUserCurrentPage] = useState(1);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'user'>('user');
  const [addSubscriptionPlan, setAddSubscriptionPlan] = useState<string>('taster');
  const [addError, setAddError] = useState('');

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editSubscriptionPlan, setEditSubscriptionPlan] = useState<string>('taster');
  const [editError, setEditError] = useState('');

  // Identify primary root administrator (usr_admin_1)
  const isFirstAdminUser = useCallback((targetUser: AppUser | null | undefined): boolean => {
    if (!targetUser) return false;
    return targetUser.id === 'usr_admin_1' || targetUser.email?.toLowerCase() === 'admin@zecratary.com';
  }, []);

  const isEditingFirstAdmin = useMemo(() => {
    const target = users.find((u) => u.id === editingUserId);
    return isFirstAdminUser(target);
  }, [editingUserId, users, isFirstAdminUser]);

  // Dynamic Theme Synchronization
  const syncTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const day = mode === 'light' || mode === 'day';
      setIsDayMode(day);

      const stored = typeof window !== 'undefined'
        ? (localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config'))
        : null;
      if (stored) {
        applyThemeToDocument(JSON.parse(stored));
      } else {
        applyThemeToDocument(null);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_theme_changed', syncTheme);
    window.addEventListener('zecratary_theme_updated', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_theme_changed', syncTheme);
      window.removeEventListener('zecratary_theme_updated', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  // Load Plans from Server API (Zero LocalStorage)
  const loadPlans = useCallback(async () => {
    let parsedPlans: PlanOption[] = [];

    try {
      const serverSettings = await fetchServerAdminSettings();
      if (serverSettings && Array.isArray(serverSettings.subscriptionPlans) && serverSettings.subscriptionPlans.length > 0) {
        serverSettings.subscriptionPlans.forEach((cfg: any) => {
          const isZeroCost = cfg.price === 0 || cfg.isFree;
          const price = Number(cfg.price || 0);
          const interval = cfg.interval ? (cfg.interval.toLowerCase().includes('year') ? 'YEAR' : 'MONTH') : 'MONTH';

          parsedPlans.push({
            id: cfg.id || cfg.slug,
            name: `${cfg.name} (Free)`,
            slug: cfg.slug || cfg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            priceFormatted: isZeroCost ? 'Free' : `$${price.toFixed(2)}${interval === 'YEAR' ? '/yr' : '/mo'}`,
            interval,
            isFree: isZeroCost,
          });
        });
      }
    } catch (_) {}

    if (parsedPlans.length === 0) {
      try {
        const res = await fetch('/api/admin/plans?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const plansList = Array.isArray(data) ? data : (data?.plans || data?.packages);
          if (Array.isArray(plansList) && plansList.length > 0) {
            parsedPlans = plansList.map((p: any) => ({
              id: p.id || p.slug,
              name: p.name,
              slug: p.slug,
              priceFormatted: p.priceCents === 0 ? 'Free' : `$${(p.priceCents / 100).toFixed(2)} / ${(p.interval || 'MONTH').toLowerCase()}`,
              interval: p.interval,
              isFree: p.priceCents === 0 || p.price === 0,
            }));
          }
        }
      } catch (_) {}
    }

    if (parsedPlans.length > 0) {
      setAvailablePlans(parsedPlans);
    } else {
      setAvailablePlans(DEFAULT_AVAILABLE_PLANS);
    }
  }, []);

  // Hydrate Users Exclusively from Server Storage
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    purgeLegacyBrowserAdminStorage();

    try {
      const res = await fetch('/api/admin/users?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          let list: AppUser[] = [...data.users];

          // Ensure primary root admin exists
          const hasRootAdmin = list.some(
            (u) => u.id === 'usr_admin_1' || u.email?.toLowerCase() === 'admin@zecratary.com'
          );

          if (!hasRootAdmin) {
            const rootAdmin: AppUser = {
              id: 'usr_admin_1',
              name: 'System Administrator',
              email: 'admin@zecratary.com',
              role: 'admin',
              subscriptionPlan: 'nutrition-pro-annual',
              createdAt: '2026-01-01T00:00:00.000Z'
            };
            list.unshift(rootAdmin);
            fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rootAdmin)
            }).catch(() => {});
          }

          setUsers(list);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load users from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = tr('admin.users.docTitle', 'User Management - Admin Console');
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();
    loadPlans();

    const handleSync = () => {
      loadUsers();
      loadPlans();
    };

    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, [loadUsers, loadPlans, tr]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Selection Toggles
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export Selected Users
  const handleExportSelected = (format: 'csv' | 'json' = 'csv') => {
    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));
    if (selectedUsers.length === 0) {
      showToast(tr('admin.users.selectUsersPrompt', 'Please select at least one user to export.'));
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const exportData = selectedUsers.map(({ password, ...rest }) => rest);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`${tr('admin.users.exportedJson', 'Exported')} ${selectedUsers.length} ${tr('admin.users.usersCountJson', 'selected user(s) to JSON!')}`);
    } else {
      const headers = ['ID', 'Name', 'Email Address', 'Role', 'Subscription Plan', 'Created At'];
      const rows = selectedUsers.map((u) => [
        `"${(u.id || '').replace(/"/g, '""')}"`,
        `"${(u.name || '').replace(/"/g, '""')}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${(u.role || '').replace(/"/g, '""')}"`,
        `"${(u.subscriptionPlan || '').replace(/"/g, '""')}"`,
        `"${(u.createdAt || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`${tr('admin.users.exportedCsv', 'Exported')} ${selectedUsers.length} ${tr('admin.users.usersCountCsv', 'selected user(s) to CSV!')}`);
    }
  };

  // Sort Toggles
  const handleAdminSort = (field: SortField) => {
    if (adminSortField === field) {
      setAdminSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortField(field);
      setAdminSortOrder('asc');
    }
  };

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  // Case-Insensitive Filter & Sort for Admins
  const processedAdmins = useMemo(() => {
    const admins = users.filter((u) => (u.role || '').toLowerCase() === 'admin');
    const filtered = admins.filter(
      (u) =>
        !search.trim() ||
        (u.name || '').toLowerCase().includes(search.toLowerCase().trim()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase().trim()) ||
        (u.subscriptionPlan && u.subscriptionPlan.toLowerCase().includes(search.toLowerCase().trim()))
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (adminSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (adminSortField === 'subscriptionPlan') {
        comparison = (a.subscriptionPlan || '').localeCompare(b.subscriptionPlan || '');
      } else if (adminSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return adminSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, adminSortField, adminSortOrder]);

  // Case-Insensitive Filter & Sort for Standard Users
  const processedStandardUsers = useMemo(() => {
    const standardUsers = users.filter((u) => (u.role || '').toLowerCase() !== 'admin');
    const filtered = standardUsers.filter(
      (u) =>
        !search.trim() ||
        (u.name || '').toLowerCase().includes(search.toLowerCase().trim()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase().trim()) ||
        (u.subscriptionPlan && u.subscriptionPlan.toLowerCase().includes(search.toLowerCase().trim()))
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (userSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (userSortField === 'subscriptionPlan') {
        comparison = (a.subscriptionPlan || '').localeCompare(b.subscriptionPlan || '');
      } else if (userSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return userSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, userSortField, userSortOrder]);

  // Pagination Calculations
  const adminTotalPages = Math.max(1, Math.ceil(processedAdmins.length / ITEMS_PER_PAGE));
  const adminStartIndex = (adminCurrentPage - 1) * ITEMS_PER_PAGE;
  const adminEndIndex = Math.min(adminStartIndex + ITEMS_PER_PAGE, processedAdmins.length);
  const paginatedAdmins = processedAdmins.slice(adminStartIndex, adminEndIndex);

  const userTotalPages = Math.max(1, Math.ceil(processedStandardUsers.length / ITEMS_PER_PAGE));
  const userStartIndex = (userCurrentPage - 1) * ITEMS_PER_PAGE;
  const userEndIndex = Math.min(userStartIndex + ITEMS_PER_PAGE, processedStandardUsers.length);
  const paginatedStandardUsers = processedStandardUsers.slice(userStartIndex, userEndIndex);

  const isAllAdminsOnPageSelected =
    paginatedAdmins.length > 0 && paginatedAdmins.every((u) => selectedUserIds.includes(u.id));

  const handleToggleSelectAllAdmins = () => {
    const pageAdminIds = paginatedAdmins.map((u) => u.id);
    if (isAllAdminsOnPageSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !pageAdminIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageAdminIds])));
    }
  };

  const isAllStandardOnPageSelected =
    paginatedStandardUsers.length > 0 && paginatedStandardUsers.every((u) => selectedUserIds.includes(u.id));

  const handleToggleSelectAllStandardUsers = () => {
    const pageUserIds = paginatedStandardUsers.map((u) => u.id);
    if (isAllStandardOnPageSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !pageUserIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageUserIds])));
    }
  };

  useEffect(() => {
    setAdminCurrentPage(1);
    setUserCurrentPage(1);
  }, [search]);

  // Add User Modal Handlers
  const handleOpenAddModal = (presetRole: 'admin' | 'user' = 'user') => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole(presetRole);
    
    const defaultAdminPlan = availablePlans.find((p) => p.slug.includes('annual') || p.slug.includes('pro'))?.slug || availablePlans[availablePlans.length - 1]?.slug || 'nutrition-pro-annual';
    const defaultUserPlan = availablePlans.find((p) => p.isFree || p.slug === 'taster')?.slug || availablePlans[0]?.slug || 'taster';
    
    setAddSubscriptionPlan(presetRole === 'admin' ? defaultAdminPlan : defaultUserPlan);
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError(tr('admin.users.fillRequired', 'Please fill in all required fields.'));
      return;
    }

    if (users.some((u) => u && u.email && u.email.toLowerCase() === cleanEmail)) {
      setAddError(tr('admin.users.emailExists', 'A user with this email address already exists.'));
      return;
    }

    if (addPassword.length < 4) {
      setAddError(tr('admin.users.passwordLength', 'Password must be at least 4 characters long.'));
      return;
    }

    const assignedPlan = addSubscriptionPlan || (addRole === 'admin' ? 'nutrition-pro-annual' : 'taster');

    const newUser: AppUser = {
      id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      subscriptionPlan: assignedPlan,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server error creating user');
      }

      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers((prev) => [newUser, ...prev.filter((u) => u.email.toLowerCase() !== cleanEmail)]);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_users_updated'));
      }

      setShowAddModal(false);
      showToast(`${tr('admin.users.userCreatedPrefix', 'User')} "${newUser.name}" ${tr('admin.users.userCreatedSuffix', 'created successfully!')}`);
    } catch (err: any) {
      setAddError(err.message || 'Failed to persist new user');
    }
  };

  // Edit User Modal Handlers
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditSubscriptionPlan(user.subscriptionPlan || (user.role === 'admin' ? 'nutrition-pro-annual' : 'taster'));
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setEditError('');

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanName = editName.trim();

    if (!cleanName || !cleanEmail) {
      setEditError(tr('admin.users.nameEmailEmpty', 'Name and Email cannot be empty.'));
      return;
    }

    const emailTaken = users.some((u) => u.id !== editingUserId && u.email && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setEditError(tr('admin.users.emailTaken', 'Another user is already registered with this email.'));
      return;
    }

    const targetUser = users.find((u) => u.id === editingUserId);
    const isFirstAdmin = isFirstAdminUser(targetUser);
    const finalRole: 'admin' | 'user' = isFirstAdmin ? 'admin' : editRole;

    const updatedUser: AppUser = {
      id: editingUserId,
      name: cleanName,
      email: cleanEmail,
      password: editPassword ? editPassword : targetUser?.password,
      role: finalRole,
      subscriptionPlan: editSubscriptionPlan,
      createdAt: targetUser?.createdAt || new Date().toISOString()
    };

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server error updating user');
      }

      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? updatedUser : u)));
      }

      if (currentUser?.id === editingUserId) {
        setCurrentUser({
          ...currentUser,
          name: cleanName,
          email: cleanEmail,
          role: finalRole,
          subscriptionPlan: editSubscriptionPlan
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_users_updated'));
      }

      setShowEditModal(false);
      showToast(`${tr('admin.users.userUpdatedPrefix', 'User')} "${cleanName}" ${tr('admin.users.userUpdatedSuffix', 'updated successfully!')}`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    }
  };

  // Safe Deletion Handler with Dual Parameter Transmission and Live State Sync
  const handleDeleteUser = async (id: string, userEmail: string, userName?: string) => {
    const targetUser = users.find((u) => u.id === id || (u.email && u.email.toLowerCase() === userEmail.toLowerCase()));

    if (currentUser?.email?.toLowerCase() === userEmail.toLowerCase() || currentUser?.id === id) {
      alert(tr('admin.users.cannotDeleteSelf', 'You cannot delete your own active admin account.'));
      return;
    }

    if (isFirstAdminUser(targetUser)) {
      alert(tr('admin.users.cannotDeletePrimary', 'The primary system administrator account cannot be deleted.'));
      return;
    }

    const displayName = userName || targetUser?.name || userEmail;
    if (!confirm(`${tr('admin.users.deleteConfirmPrompt', 'Are you sure you want to delete')} "${displayName}" (${userEmail})? ${tr('admin.users.actionUndone', 'This action cannot be undone.')}`)) return;

    try {
      const cleanEmail = userEmail.toLowerCase().trim();

      const queryParams = new URLSearchParams();
      if (id) queryParams.set('id', id);
      if (cleanEmail) queryParams.set('email', cleanEmail);

      const res = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: cleanEmail }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server error deleting user');
      }

      const resData = await res.json().catch(() => null);
      if (resData?.users && Array.isArray(resData.users)) {
        setUsers(resData.users);
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail)));
      }

      setSelectedUserIds((prev) => prev.filter((uid) => uid !== id));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_users_updated'));
      }

      showToast(`${tr('admin.users.userDeletedPrefix', 'User')} "${displayName}" ${tr('admin.users.userDeletedSuffix', 'has been deleted.')}`);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showToast(tr('admin.users.deleteFail', 'Failed to delete user: ') + (err?.message || 'Server error'));
    }
  };

  const renderSortIcon = (currentField: SortField, targetField: SortField, order: SortOrder) => {
    if (currentField !== targetField) {
      return <ArrowUpDown className={`h-3.5 w-3.5 opacity-60 ${isDayMode ? 'text-slate-400' : 'text-slate-500'}`} />;
    }
    return order === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" style={{ color: 'var(--color-primary, #E05638)' }} />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" style={{ color: 'var(--color-primary, #E05638)' }} />
    );
  };

  // Dynamic Subscription Plan Badge Renderer
  const getPlanBadge = (planKey?: string) => {
    const isFreePlan = !planKey || planKey === 'taster' || planKey.includes('free');
    if (isFreePlan) {
      return {
        label: 'Taster (Free)',
        bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
        border: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
        color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
        icon: Sparkles
      };
    }

    const matched = availablePlans.find(
      (p) => p.slug === planKey || p.id === planKey || p.slug.toLowerCase() === planKey.toLowerCase()
    );

    if (matched) {
      if (matched.isFree || planKey === 'taster' || planKey.includes('free')) {
        return {
          label: matched.name,
          bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
          border: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
          color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
          icon: Sparkles
        };
      }
      if (matched.interval === 'YEAR' || planKey.includes('annual') || planKey.includes('year')) {
        return {
          label: matched.name,
          bg: isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)',
          border: isDayMode ? '#bfdbfe' : '#3b82f6',
          color: isDayMode ? '#1d4ed8' : '#60a5fa',
          icon: Zap
        };
      }
      if (matched.interval === 'MONTH' || planKey.includes('monthly')) {
        return {
          label: matched.name,
          bg: isDayMode ? 'rgba(224, 86, 56, 0.08)' : 'rgba(224, 86, 56, 0.15)',
          border: isDayMode ? 'rgba(224, 86, 56, 0.3)' : 'var(--color-primary, #E05638)',
          color: 'var(--color-primary, #E05638)',
          icon: Zap
        };
      }
      return {
        label: matched.name,
        bg: isDayMode ? '#faf5ff' : 'rgba(168, 85, 247, 0.15)',
        border: isDayMode ? '#e9d5ff' : '#a855f7',
        color: isDayMode ? '#7e22ce' : '#c084fc',
        icon: CreditCard
      };
    }

    const formatted = planKey
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      label: formatted,
      bg: isDayMode ? '#faf5ff' : 'rgba(168, 85, 247, 0.15)',
      border: isDayMode ? '#e9d5ff' : '#a855f7',
      color: isDayMode ? '#7e22ce' : '#c084fc',
      icon: CreditCard
    };
  };

  // Computed Context Tokens
  const cCardBg = isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)';
  const cInnerBg = isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)';
  const cBorder = isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)';
  const cInputBorder = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)';
  const cText = isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)';
  const cSubText = isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)';
  const cLabel = isDayMode ? '#334155' : '#cbd5e1';

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: cText }}
    >
      {/* ACCESS WARNING FOR NON-ADMINS */}
      {currentUser && currentUser.role !== 'admin' && (
        <div 
          className="rounded-2xl p-4 flex items-center justify-between text-xs border shadow-xs transition-colors"
          style={{
            backgroundColor: isDayMode ? '#fffbeb' : 'rgba(120, 53, 15, 0.4)',
            borderColor: isDayMode ? '#fde68a' : 'rgba(217, 119, 6, 0.4)',
            color: isDayMode ? '#92400e' : '#fde68a'
          }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <span>
              {tr('admin.users.signedInAs', 'Signed in as')} <strong>{currentUser.email}</strong>. {tr('admin.users.switchNotice', 'Switch to an admin account to manage user subscription permissions.')}
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 text-white font-bold rounded-xl shrink-0 ml-3 cursor-pointer shadow-xs hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {tr('admin.users.switchToAdmin', 'Switch to Admin')}
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div 
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in border"
          style={{
            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
            borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
            color: isDayMode ? '#065f46' : 'var(--color-emerald, #10b981)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {tr('admin.users.title', 'User & Subscription Management')}
          </h1>
          <p className="text-xs" style={{ color: cSubText }}>
            {tr('admin.users.activePlansPrefix', 'Active System Packages synced:')} {availablePlans.length} {tr('admin.users.activePlansSuffix', 'plans available from /admin/plans')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* RELOAD BUTTON */}
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: cCardBg,
              borderColor: cInputBorder,
              color: cText
            }}
            title="Reload users from server database"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary, #E05638)' }} />
            <span>Reload</span>
          </button>

          {/* EXPORT ACTION BUTTONS */}
          <button
            type="button"
            onClick={() => handleExportSelected('csv')}
            disabled={selectedUserIds.length === 0}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            style={{
              backgroundColor: cCardBg,
              borderColor: selectedUserIds.length > 0 ? 'var(--color-primary, #E05638)' : cInputBorder,
              color: selectedUserIds.length > 0 ? 'var(--color-primary, #E05638)' : (isDayMode ? '#475569' : '#cbd5e1')
            }}
            title={selectedUserIds.length === 0 ? tr('admin.users.selectToExport', 'Select user(s) to export') : `${tr('admin.users.exportPrefix', 'Export')} ${selectedUserIds.length} ${tr('admin.users.exportCsvSuffix', 'user(s) to CSV')}`}
          >
            <Download className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
            <span>{tr('admin.users.exportCsv', 'Export CSV')} {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportSelected('json')}
            disabled={selectedUserIds.length === 0}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            style={{
              backgroundColor: cCardBg,
              borderColor: cInputBorder,
              color: isDayMode ? '#475569' : '#cbd5e1'
            }}
            title={selectedUserIds.length === 0 ? tr('admin.users.selectToExport', 'Select user(s) to export') : `${tr('admin.users.exportPrefix', 'Export')} ${selectedUserIds.length} ${tr('admin.users.exportJsonSuffix', 'user(s) to JSON')}`}
          >
            <Download className="h-4 w-4" style={{ color: cSubText }} />
            <span>{tr('admin.users.exportJson', 'Export JSON')}</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('user')}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <UserPlus className="h-4 w-4" /> {tr('admin.users.addNewUser', 'Add New User')}
          </button>
        </div>
      </div>

      {/* SELECTION BANNER */}
      {selectedUserIds.length > 0 && (
        <div 
          className="p-3.5 px-5 rounded-2xl flex items-center justify-between text-xs border shadow-lg animate-in fade-in"
          style={{
            backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.08)' : 'rgba(224, 86, 56, 0.12)',
            borderColor: 'var(--color-primary, #E05638)',
            color: cText
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold">
              {selectedUserIds.length} {tr('admin.users.of', 'of')} {users.length} {tr('admin.users.usersSelected', 'user(s) selected')}
            </span>
            <button 
              type="button"
              onClick={() => setSelectedUserIds([])}
              className="text-[11px] underline cursor-pointer hover:opacity-80"
              style={{ color: cSubText }}
            >
              {tr('admin.users.clearSelection', 'Clear selection')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportSelected('csv')}
              className="px-3.5 py-1.5 rounded-xl text-white font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs text-xs hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              <Download className="h-3.5 w-3.5" /> {tr('admin.users.exportSelectedCsv', 'Export Selected (CSV)')}
            </button>
            <button
              type="button"
              onClick={() => handleExportSelected('json')}
              className="px-3.5 py-1.5 rounded-xl font-bold border transition shadow-xs text-xs cursor-pointer hover:opacity-85"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : '#1e293b',
                borderColor: cInputBorder,
                color: cText
              }}
            >
              <Download className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className={`h-4 w-4 absolute left-4 top-3.5 pointer-events-none ${isDayMode ? 'text-slate-400' : 'text-slate-500'}`} />
        <input
          type="text"
          placeholder={tr('admin.users.searchPlaceholder', 'Search by name, email, or subscription plan across all tables...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition shadow-inner font-medium"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : cInnerBg,
            borderColor: cInputBorder,
            color: cText
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 1: ADMINISTRATORS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
                color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
              }}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: cText }}>
                {tr('admin.users.administrators', 'Administrators')}
                <span 
                  className="text-xs border font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                    borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
                    color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                  }}
                >
                  {processedAdmins.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('admin')}
            className="text-xs font-bold transition flex items-center gap-1 cursor-pointer hover:underline"
            style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
          >
            <UserPlus className="h-3.5 w-3.5" /> {tr('admin.users.addAdmin', 'Add Admin')}
          </button>
        </div>

        <div 
          className="border rounded-3xl overflow-hidden shadow-xl transition-colors"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b uppercase font-bold text-[10px] tracking-wider"
                style={{
                  backgroundColor: cInnerBg,
                  borderColor: cBorder,
                  color: cSubText
                }}
              >
                <tr>
                  <th className="w-10 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllAdminsOnPageSelected}
                      onChange={handleToggleSelectAllAdmins}
                      className="rounded cursor-pointer accent-[#E05638]"
                      title={tr('admin.users.selectAllAdmins', 'Select all administrators on this page')}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('name')}
                      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: cText }}
                    >
                      <span>{tr('admin.users.colAdminUser', 'Admin User')}</span>
                      {renderSortIcon(adminSortField, 'name', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">{tr('admin.users.colEmail', 'Email Address')}</th>
                  <th className="px-5 py-4">{tr('admin.users.colRole', 'Role')}</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('subscriptionPlan')}
                      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: cText }}
                    >
                      <span>{tr('admin.users.colSubscriptionType', 'Subscription Type')}</span>
                      {renderSortIcon(adminSortField, 'subscriptionPlan', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('createdAt')}
                      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: cText }}
                    >
                      <span>{tr('admin.users.colCreatedDate', 'Created Date')}</span>
                      {renderSortIcon(adminSortField, 'createdAt', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">{tr('admin.users.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y"
                style={{ borderColor: cBorder, color: cText }}
              >
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10" style={{ color: cSubText }}>
                      {tr('admin.users.noAdminsFound', 'No administrators found')} {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email?.toLowerCase() === user.email?.toLowerCase();
                    const isPrimary = isFirstAdminUser(user);
                    const isSelected = selectedUserIds.includes(user.id);
                    const planBadge = getPlanBadge(user.subscriptionPlan);
                    const PlanIcon = planBadge.icon;
                    return (
                      <tr 
                        key={user.id} 
                        className="transition"
                        style={{ 
                          borderColor: cBorder,
                          backgroundColor: isSelected ? 'rgba(224, 86, 56, 0.08)' : undefined
                        }}
                      >
                        <td className="w-10 px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.id)}
                            className="rounded cursor-pointer accent-[#E05638]"
                            title={`Select ${user.name}`}
                          />
                        </td>
                        <td className="px-5 py-4 font-bold flex items-center gap-3" style={{ color: cText }}>
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0"
                            style={{
                              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
                              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                            }}
                          >
                            {(user.name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold" style={{ color: cText }}>{user.name}</span>
                              {isPrimary && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                                    borderColor: '#f59e0b',
                                    color: isDayMode ? '#b45309' : '#fbbf24'
                                  }}
                                  title={tr('admin.users.primaryAdminTooltip', 'Primary Administrator')}
                                >
                                  {tr('admin.users.badgePrimary', 'PRIMARY')}
                                </span>
                              )}
                              {isCurrent && !isPrimary && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                                    borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
                                    color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                                  }}
                                >
                                  {tr('admin.users.badgeYou', 'YOU')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs" style={{ color: cSubText }}>{user.email}</td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit"
                            style={{
                              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
                              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                            }}
                          >
                            <Shield className="h-3 w-3" /> {tr('admin.users.roleAdmin', 'Admin')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit shadow-xs"
                            style={{
                              backgroundColor: planBadge.bg,
                              borderColor: planBadge.border,
                              color: planBadge.color
                            }}
                          >
                            <PlanIcon className="h-3 w-3 shrink-0" />
                            {planBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4" style={{ color: cSubText }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : tr('admin.users.activeStatus', 'Active')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 rounded-xl border transition shadow-xs cursor-pointer hover:opacity-85"
                              style={{
                                backgroundColor: isDayMode ? '#ffffff' : cInnerBg,
                                borderColor: cInputBorder,
                                color: cText
                              }}
                              title={tr('admin.users.editAdminAccount', 'Edit Admin Account & Plan')}
                            >
                              <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent || isPrimary}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-xs ${
                                isCurrent || isPrimary
                                  ? 'opacity-30 cursor-not-allowed'
                                  : isDayMode
                                    ? 'text-red-600 hover:bg-red-50 border-red-200 cursor-pointer'
                                    : 'text-red-400 hover:bg-red-500/10 border-red-500/30 cursor-pointer'
                              }`}
                              style={{
                                backgroundColor: isDayMode ? '#ffffff' : cInnerBg,
                                borderColor: isDayMode && !(isCurrent || isPrimary) ? '#fca5a5' : cInputBorder
                              }}
                              title={
                                isPrimary
                                  ? tr('admin.users.cannotDeletePrimaryTooltip', 'Cannot delete primary system admin (usr_admin_1)')
                                  : isCurrent
                                    ? tr('admin.users.cannotDeleteActiveSession', 'Cannot delete active session account')
                                    : tr('admin.users.deleteAdmin', 'Delete Admin')
                              }
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

          {/* Admin Pagination */}
          {processedAdmins.length > ITEMS_PER_PAGE && (
            <div 
              className="px-5 py-3.5 border-t flex items-center justify-between text-xs transition-colors"
              style={{
                backgroundColor: cInnerBg,
                borderColor: cBorder,
                color: cSubText
              }}
            >
              <span>
                {tr('admin.users.showing', 'Showing')} {adminStartIndex + 1} {tr('admin.users.to', 'to')} {adminEndIndex} {tr('admin.users.of', 'of')} {processedAdmins.length} {tr('admin.users.adminsCount', 'admins')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer"
                  style={{
                    backgroundColor: cCardBg,
                    borderColor: cInputBorder,
                    color: cText
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold px-2" style={{ color: cText }}>
                  {tr('admin.users.page', 'Page')} {adminCurrentPage} {tr('admin.users.of', 'of')} {adminTotalPages}
                </span>
                <button
                  type="button"
                  disabled={adminCurrentPage >= adminTotalPages}
                  onClick={() => setAdminCurrentPage((p) => Math.min(adminTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer"
                  style={{
                    backgroundColor: cCardBg,
                    borderColor: cInputBorder,
                    color: cText
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 2: STANDARD USERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: isDayMode ? '#eff6ff' : 'rgba(30, 58, 138, 0.4)',
                borderColor: isDayMode ? '#bfdbfe' : 'rgba(59, 130, 246, 0.4)',
                color: isDayMode ? '#2563eb' : '#60a5fa'
              }}
            >
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: cText }}>
                {tr('admin.users.standardUsers', 'Standard Users')}
                <span 
                  className="text-xs border font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isDayMode ? '#eff6ff' : 'rgba(30, 58, 138, 0.6)',
                    borderColor: isDayMode ? '#bfdbfe' : 'rgba(59, 130, 246, 0.5)',
                    color: isDayMode ? '#1d4ed8' : '#93c5fd'
                  }}
                >
                  {processedStandardUsers.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('user')}
            className="text-xs font-bold transition flex items-center gap-1 cursor-pointer hover:underline"
            style={{ color: 'var(--color-primary, #E05638)' }}
          >
            <UserPlus className="h-3.5 w-3.5" /> {tr('admin.users.addStandardUser', 'Add Standard User')}
          </button>
        </div>

        <div 
          className="border rounded-3xl overflow-hidden shadow-xl transition-colors"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b uppercase font-bold text-[10px] tracking-wider"
                style={{
                  backgroundColor: cInnerBg,
                  borderColor: cBorder,
                  color: cSubText
                }}
              >
                <tr>
                  <th className="w-10 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllStandardOnPageSelected}
                      onChange={handleToggleSelectAllStandardUsers}
                      className="rounded cursor-pointer accent-[#E05638]"
                      title={tr('admin.users.selectAllStandard', 'Select all standard users on this page')}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('name')}
                      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: cText }}
                    >
                      <span>{tr('admin.users.colStandardUser', 'Standard User')}</span>
                      {renderSortIcon(userSortField, 'name', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">{tr('admin.users.colEmail', 'Email Address')}</th>
                  <th className="px-5 py-4">{tr('admin.users.colRole', 'Role')}</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('subscriptionPlan')}
                      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: cText }}
                    >
                      <span>{tr('admin.users.colSubscriptionType', 'Subscription Type')}</span>
                      {renderSortIcon(userSortField, 'subscriptionPlan', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('createdAt')}
                      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: cText }}
                    >
                      <span>{tr('admin.users.colCreatedDate', 'Created Date')}</span>
                      {renderSortIcon(userSortField, 'createdAt', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">{tr('admin.users.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y"
                style={{ borderColor: cBorder, color: cText }}
              >
                {paginatedStandardUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10" style={{ color: cSubText }}>
                      {tr('admin.users.noStandardFound', 'No standard users found')} {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedStandardUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email?.toLowerCase() === user.email?.toLowerCase();
                    const isSelected = selectedUserIds.includes(user.id);
                    const planBadge = getPlanBadge(user.subscriptionPlan);
                    const PlanIcon = planBadge.icon;
                    return (
                      <tr 
                        key={user.id} 
                        className="transition"
                        style={{ 
                          borderColor: cBorder,
                          backgroundColor: isSelected ? 'rgba(224, 86, 56, 0.08)' : undefined
                        }}
                      >
                        <td className="w-10 px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.id)}
                            className="rounded cursor-pointer accent-[#E05638]"
                            title={`Select ${user.name}`}
                          />
                        </td>
                        <td className="px-5 py-4 font-bold flex items-center gap-3" style={{ color: cText }}>
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0"
                            style={{
                              backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-card, #111726)',
                              borderColor: cInputBorder,
                              color: 'var(--color-primary, #E05638)'
                            }}
                          >
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold" style={{ color: cText }}>{user.name}</span>
                              {isCurrent && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                                    borderColor: 'var(--color-emerald, #10b981)',
                                    color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                                  }}
                                >
                                  {tr('admin.users.badgeYou', 'YOU')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs" style={{ color: cSubText }}>{user.email}</td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit"
                            style={{
                              backgroundColor: isDayMode ? '#f1f5f9' : cInnerBg,
                              borderColor: cInputBorder,
                              color: cSubText
                            }}
                          >
                            <UserIcon className="h-3 w-3" /> {tr('admin.users.roleStandard', 'Standard User')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit shadow-xs"
                            style={{
                              backgroundColor: planBadge.bg,
                              borderColor: planBadge.border,
                              color: planBadge.color
                            }}
                          >
                            <PlanIcon className="h-3 w-3 shrink-0" />
                            {planBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4" style={{ color: cSubText }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : tr('admin.users.activeStatus', 'Active')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 rounded-xl border transition shadow-xs cursor-pointer hover:opacity-85"
                              style={{
                                backgroundColor: isDayMode ? '#ffffff' : cInnerBg,
                                borderColor: cInputBorder,
                                color: cText
                              }}
                              title={tr('admin.users.editUserAndPlan', 'Edit User & Plan Assignment')}
                            >
                              <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-xs ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : isDayMode
                                    ? 'text-red-600 hover:bg-red-50 border-red-200 cursor-pointer'
                                    : 'text-red-400 hover:bg-red-500/10 border-red-500/30 cursor-pointer'
                              }`}
                              style={{
                                backgroundColor: isDayMode ? '#ffffff' : cInnerBg,
                                borderColor: isDayMode && !isCurrent ? '#fca5a5' : cInputBorder
                              }}
                              title={isCurrent ? tr('admin.users.cannotDeleteActiveAccount', 'Cannot delete active account') : tr('admin.users.deleteUser', 'Delete User')}
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

          {/* Standard User Pagination */}
          <div 
            className="px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors"
            style={{
              backgroundColor: cInnerBg,
              borderColor: cBorder,
              color: cSubText
            }}
          >
            <div>
              {processedStandardUsers.length === 0 ? (
                tr('admin.users.showingZeroStandard', 'Showing 0 standard users')
              ) : (
                <>
                  {tr('admin.users.showing', 'Showing')}{' '}
                  <span className="font-bold" style={{ color: cText }}>{userStartIndex + 1}</span>{' '}
                  {tr('admin.users.to', 'to')}{' '}
                  <span className="font-bold" style={{ color: cText }}>{userEndIndex}</span>{' '}
                  {tr('admin.users.of', 'of')}{' '}
                  <span className="font-bold" style={{ color: cText }}>{processedStandardUsers.length}</span>{' '}
                  {tr('admin.users.standardUsersCount', 'standard users')}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage((p) => Math.max(1, p - 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:opacity-80'
                }`}
                style={{
                  backgroundColor: cCardBg,
                  borderColor: cInputBorder,
                  color: cText
                }}
                title={tr('admin.users.prevPage', 'Previous Page')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setUserCurrentPage(pageNum)}
                  className="min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer"
                  style={userCurrentPage === pageNum ? {
                    backgroundColor: 'var(--color-primary, #E05638)',
                    borderColor: 'var(--color-primary, #E05638)',
                    color: '#ffffff'
                  } : {
                    backgroundColor: cCardBg,
                    borderColor: cInputBorder,
                    color: cSubText
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={userCurrentPage >= userTotalPages}
                onClick={() => setUserCurrentPage((p) => Math.min(userTotalPages, p + 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage >= userTotalPages
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:opacity-80'
                }`}
                style={{
                  backgroundColor: cCardBg,
                  borderColor: cInputBorder,
                  color: cText
                }}
                title={tr('admin.users.nextPage', 'Next Page')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ADD USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default transition-colors"
            style={{
              backgroundColor: cCardBg,
              borderColor: cBorder,
              color: cText
            }}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer hover:opacity-80"
              style={{ backgroundColor: isDayMode ? '#f1f5f9' : cInnerBg, color: cSubText }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <UserPlus className="h-5 w-5" /> {tr('admin.users.modalAddTitle', 'Add New User')}
              </h2>
              <p className="text-xs" style={{ color: cSubText }}>
                {tr('admin.users.modalAddSubtitle', 'Create a new user account with role & active package tier.')}
              </p>
            </div>

            {addError && (
              <div 
                className="p-3 border rounded-xl font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: isDayMode ? '#fef2f2' : 'rgba(127, 29, 29, 0.4)',
                  borderColor: isDayMode ? '#fca5a5' : '#991b1b',
                  color: isDayMode ? '#991b1b' : '#fca5a5'
                }}
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelFullName', 'Full Name')} *
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: cSubText }} />
                  <input
                    type="text"
                    required
                    placeholder={tr('admin.users.placeholderName', 'e.g. Jordan Smith')}
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-medium shadow-inner"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder,
                      color: cText
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelEmail', 'Email Address')} *
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: cSubText }} />
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-mono shadow-inner"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder,
                      color: cText
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelPassword', 'Password')} *
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: cSubText }} />
                  <input
                    type="password"
                    required
                    placeholder={tr('admin.users.placeholderPassword', 'Minimum 4 characters')}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-mono shadow-inner"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder,
                      color: cText
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 flex items-center justify-between" style={{ color: cLabel }}>
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    {tr('admin.users.labelActivePlan', 'Active Subscription Plan')} *
                  </span>
                  <Link href="/admin/plans" className="text-[10px] underline hover:opacity-80" style={{ color: cSubText }}>
                    {tr('admin.users.managePlans', 'Manage Plans')} ({availablePlans.length})
                  </Link>
                </label>
                <select
                  value={addSubscriptionPlan}
                  onChange={(e) => setAddSubscriptionPlan(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none transition cursor-pointer font-bold shadow-inner"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                    borderColor: cInputBorder,
                    color: cText
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                >
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug} className={isDayMode ? 'bg-white text-slate-900' : 'bg-[#070b13] text-white'}>
                      {plan.name} — ({plan.priceFormatted})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelAssignedRole', 'Assigned Role')}
                </label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs"
                    style={addRole === 'user' ? {
                      backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.08)' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs" style={{ color: cText }}>{tr('admin.users.roleStandardUser', 'Standard User')}</div>
                      <div className="text-[10px]" style={{ color: cSubText }}>{tr('admin.users.descSubscriber', 'App Subscriber')}</div>
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
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs"
                    style={addRole === 'admin' ? {
                      backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.08)' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1" style={{ color: cText }}>
                        <Shield className="h-3 w-3" style={{ color: 'var(--color-emerald, #10b981)' }} /> {tr('admin.users.roleAdmin', 'Admin')}
                      </div>
                      <div className="text-[10px]" style={{ color: cSubText }}>{tr('admin.users.descFullAccess', 'Full Access')}</div>
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

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: cBorder }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                    borderColor: cInputBorder,
                    color: cText
                  }}
                >
                  {tr('admin.users.btnCancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  <UserPlus className="h-4 w-4" /> {tr('admin.users.btnCreateUser', 'Create User')}
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
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default transition-colors"
            style={{
              backgroundColor: cCardBg,
              borderColor: cBorder,
              color: cText
            }}
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer hover:opacity-80"
              style={{ backgroundColor: isDayMode ? '#f1f5f9' : cInnerBg, color: cSubText }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <Edit3 className="h-5 w-5" /> {tr('admin.users.modalEditTitle', 'Edit User & Plan')}
              </h2>
              <p className="text-xs" style={{ color: cSubText }}>
                {tr('admin.users.modalEditSubtitle', 'Update account details, role permissions, and active subscription plan.')}
              </p>
            </div>

            {editError && (
              <div 
                className="p-3 border rounded-xl font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: isDayMode ? '#fef2f2' : 'rgba(127, 29, 29, 0.4)',
                  borderColor: isDayMode ? '#fca5a5' : '#991b1b',
                  color: isDayMode ? '#991b1b' : '#fca5a5'
                }}
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelFullName', 'Full Name')} *
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: cSubText }} />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-medium shadow-inner"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder,
                      color: cText
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelEmail', 'Email Address')} *
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: cSubText }} />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-mono shadow-inner"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder,
                      color: cText
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
                  {tr('admin.users.labelChangePassword', 'Change Password (leave blank to keep current)')}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: cSubText }} />
                  <input
                    type="password"
                    placeholder={tr('admin.users.placeholderNewPass', 'Enter new password...')}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-mono shadow-inner"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder,
                      color: cText
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 flex items-center justify-between" style={{ color: cLabel }}>
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    {tr('admin.users.labelActivePlan', 'Active Subscription Plan')}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                    {tr('admin.users.liveSynced', 'Live Synced')} ({availablePlans.length})
                  </span>
                </label>
                <select
                  value={editSubscriptionPlan}
                  onChange={(e) => setEditSubscriptionPlan(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none transition cursor-pointer font-bold shadow-inner"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                    borderColor: cInputBorder,
                    color: cText
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = cInputBorder)}
                >
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug} className={isDayMode ? 'bg-white text-slate-900' : 'bg-[#070b13] text-white'}>
                      {plan.name} — ({plan.priceFormatted})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold" style={{ color: cLabel }}>{tr('admin.users.labelAssignedRole', 'Assigned Role')}</label>
                  {isEditingFirstAdmin && (
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border"
                      style={{
                        backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                        borderColor: '#f59e0b',
                        color: isDayMode ? '#b45309' : '#fbbf24'
                      }}
                    >
                      <Lock className="h-3 w-3" /> {tr('admin.users.primaryAdminLocked', 'Primary Admin Locked')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => {
                      if (!isEditingFirstAdmin) setEditRole('user');
                    }}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between shadow-xs ${
                      isEditingFirstAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    style={editRole === 'user' && !isEditingFirstAdmin ? {
                      backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.08)' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs" style={{ color: cText }}>{tr('admin.users.roleStandardUser', 'Standard User')}</div>
                      <div className="text-[10px]" style={{ color: cSubText }}>{tr('admin.users.descSubscriber', 'App Subscriber')}</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      disabled={isEditingFirstAdmin}
                      checked={editRole === 'user'}
                      onChange={() => {
                        if (!isEditingFirstAdmin) setEditRole('user');
                      }}
                      className="accent-[#E05638] disabled:opacity-50"
                    />
                  </label>

                  <label 
                    onClick={() => setEditRole('admin')}
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs"
                    style={editRole === 'admin' ? {
                      backgroundColor: isDayMode ? 'rgba(224, 86, 56, 0.08)' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                      borderColor: cInputBorder
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1" style={{ color: cText }}>
                        <Shield className="h-3 w-3" style={{ color: 'var(--color-emerald, #10b981)' }} /> {tr('admin.users.roleAdmin', 'Admin')}
                      </div>
                      <div className="text-[10px]" style={{ color: cSubText }}>{tr('admin.users.descFullAccess', 'Full Access')}</div>
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

                {isEditingFirstAdmin && (
                  <p className="text-[11px] mt-1.5 font-medium" style={{ color: cSubText }}>
                    {tr('admin.users.primaryAdminLockedNote', 'The primary system administrator role is permanently protected and cannot be changed or demoted.')}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: cBorder }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : cInnerBg,
                    borderColor: cInputBorder,
                    color: cText
                  }}
                >
                  {tr('admin.users.btnCancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  <Check className="h-4 w-4" /> {tr('admin.users.btnSaveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
