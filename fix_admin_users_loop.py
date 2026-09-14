import os
import glob

# 1. Locate App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/users/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(matches[0])))

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

target_files = [
    os.path.join(app_dir, 'admin', 'users', 'page.tsx'),
    os.path.join(app_dir, 'users', 'page.tsx')
]

target_files = [p for p in target_files if os.path.exists(p)]
if not target_files:
    target_files = glob.glob('**/admin/users/page.tsx', recursive=True)
    target_files = [p for p in target_files if 'node_modules' not in p and '.next' not in p]

if not target_files:
    print("❌ Error: Could not locate admin/users/page.tsx")
    exit(1)

clean_page_code = """'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, Check,
  ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Users, CreditCard, Zap, Sparkles
} from 'lucide-react';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';

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
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>(DEFAULT_AVAILABLE_PLANS);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Mutex and debounce refs to prevent recursive fetch storms
  const isFetchingUsersRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Identify Primary First Administrator
  const isFirstAdminUser = useCallback((targetUser: AppUser | null | undefined): boolean => {
    if (!targetUser) return false;
    
    if (
      targetUser.id === 'usr_admin_1' || 
      targetUser.email.toLowerCase() === 'admin@zecratary.com' ||
      targetUser.email.toLowerCase() === 'admin@foodieprep.com'
    ) {
      return true;
    }

    const sortedAdmins = users
      .filter((u) => u.role === 'admin')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

    return sortedAdmins.length > 0 && sortedAdmins[0].id === targetUser.id;
  }, [users]);

  const isEditingFirstAdmin = useMemo(() => {
    const target = users.find((u) => u.id === editingUserId);
    return isFirstAdminUser(target);
  }, [editingUserId, users, isFirstAdminUser]);

  // Dynamic Theme Synchronization
  useEffect(() => {
    const applySavedTheme = () => {
      try {
        const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
        if (stored) {
          const c = JSON.parse(stored);
          const root = document.documentElement;
          if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
          if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
          if (c.backgroundDark || c.backgroundColor) {
            root.style.setProperty('--color-bg-dark', c.backgroundDark || c.backgroundColor);
            root.style.setProperty('--color-background', c.backgroundDark || c.backgroundColor);
            root.style.setProperty('--color-bg', c.backgroundDark || c.backgroundColor);
          }
          if (c.cardDark || c.cardBackground) {
            root.style.setProperty('--color-card-dark', c.cardDark || c.cardBackground);
            root.style.setProperty('--color-card', c.cardDark || c.cardBackground);
          }
          if (c.innerDark || c.backgroundColor) root.style.setProperty('--color-inner-dark', c.innerDark || c.backgroundColor);
          if (c.borderColor || c.cardBorder) root.style.setProperty('--color-border', c.borderColor || c.cardBorder);
          if (c.accentEmerald || c.accentColor) {
            root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
            root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor);
          }
          if (c.textColor) root.style.setProperty('--color-text', c.textColor);
          if (c.textSecondary) root.style.setProperty('--color-text-secondary', c.textSecondary);
        }
      } catch (e) {}
    };

    applySavedTheme();
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('storage', applySavedTheme);

    return () => {
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
    };
  }, []);

  // Synchronize System Packages
  const loadPlans = useCallback(async () => {
    let parsedPlans: PlanOption[] = [];

    try {
      const rawConfigs = localStorage.getItem('zecratary_subscription_configs');
      if (rawConfigs) {
        const configs = JSON.parse(rawConfigs);
        if (Array.isArray(configs) && configs.length > 0) {
          configs.forEach((cfg: any) => {
            const isZeroCost = cfg.isFree || (Number(cfg.monthlyPriceDollars || 0) === 0 && Number(cfg.annualPriceDollars || 0) === 0);
            
            if (isZeroCost) {
              parsedPlans.push({
                id: cfg.id || cfg.slug,
                name: `${cfg.name} (Free)`,
                slug: cfg.slug || cfg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                priceFormatted: 'Free',
                isFree: true,
              });
            } else {
              if (cfg.monthlyPriceDollars !== undefined && cfg.monthlyPriceDollars !== null && Number(cfg.monthlyPriceDollars) > 0) {
                const mPrice = Number(cfg.monthlyPriceDollars);
                parsedPlans.push({
                  id: `${cfg.slug}-monthly`,
                  name: `${cfg.name} (Monthly)`,
                  slug: `${cfg.slug}-monthly`,
                  priceFormatted: `$${mPrice.toFixed(2)}/mo`,
                  interval: 'MONTH',
                  isFree: false,
                });
              }
              if (cfg.annualPriceDollars !== undefined && cfg.annualPriceDollars !== null && Number(cfg.annualPriceDollars) > 0) {
                const aPrice = Number(cfg.annualPriceDollars);
                parsedPlans.push({
                  id: `${cfg.slug}-annual`,
                  name: `${cfg.name} (Annual)`,
                  slug: `${cfg.slug}-annual`,
                  priceFormatted: `$${aPrice.toFixed(2)}/yr`,
                  interval: 'YEAR',
                  isFree: false,
                });
              }
            }
          });
        }
      }
    } catch (e) {}

    if (parsedPlans.length === 0) {
      try {
        const rawPlans = localStorage.getItem('zecratary_subscription_plans');
        if (rawPlans) {
          const directPlans = JSON.parse(rawPlans);
          if (Array.isArray(directPlans) && directPlans.length > 0) {
            parsedPlans = directPlans.map((p: any) => ({
              id: p.id || p.slug,
              name: p.name,
              slug: p.slug,
              priceFormatted: p.priceCents === 0 ? 'Free' : `$${(p.priceCents / 100).toFixed(2)} / ${(p.interval || 'MONTH').toLowerCase()}`,
              interval: p.interval,
              isFree: p.priceCents === 0,
            }));
          }
        }
      } catch (e) {}
    }

    if (parsedPlans.length === 0) {
      try {
        const res = await fetch('/api/admin/plans');
        const data = await res.json();
        if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
          parsedPlans = data.plans.map((p: any) => ({
            id: p.id || p.slug,
            name: p.name,
            slug: p.slug,
            priceFormatted: p.priceCents === 0 ? 'Free' : `$${(p.priceCents / 100).toFixed(2)} / ${(p.interval || 'MONTH').toLowerCase()}`,
            interval: p.interval,
            isFree: p.priceCents === 0,
          }));
        }
      } catch (e) {}
    }

    if (parsedPlans.length > 0) {
      setAvailablePlans(parsedPlans);
    } else {
      setAvailablePlans(DEFAULT_AVAILABLE_PLANS);
    }
  }, []);

  // Safe Non-Looping User Fetcher
  const loadUsers = useCallback(async () => {
    if (isFetchingUsersRef.current) return;
    isFetchingUsersRef.current = true;

    try {
      let localList: AppUser[] = [];
      const raw = localStorage.getItem('zecratary_users');
      if (raw) {
        try { localList = JSON.parse(raw); } catch (_) {}
      }

      let deletedSet = new Set<string>();
      try {
        const rawDel = localStorage.getItem('zecratary_deleted_users');
        if (rawDel) {
          const parsed: string[] = JSON.parse(rawDel);
          deletedSet = new Set(parsed.map((s) => s.toLowerCase().trim()));
        }
      } catch (_) {}

      localList = localList.filter((u) => {
        if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
        if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
        return true;
      });

      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const serverUsers: AppUser[] = data.users.filter((u: any) => {
            if (u.id && deletedSet.has(u.id.toLowerCase())) return false;
            if (u.email && deletedSet.has(u.email.toLowerCase())) return false;
            return true;
          });

          const mergedMap = new Map<string, AppUser>();
          serverUsers.forEach((u) => {
            if (u && u.email) mergedMap.set(u.email.toLowerCase(), u);
          });
          localList.forEach((u) => {
            if (u && u.email) {
              const existing = mergedMap.get(u.email.toLowerCase()) || {};
              mergedMap.set(u.email.toLowerCase(), { ...existing, ...u });
            }
          });

          const merged = Array.from(mergedMap.values());
          setUsers(merged);

          // Only write to localStorage if changed to prevent storage event loops
          const newSerialized = JSON.stringify(merged);
          if (raw !== newSerialized) {
            localStorage.setItem('zecratary_users', newSerialized);
          }
          return;
        }
      }

      setUsers(localList);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      isFetchingUsersRef.current = false;
    }
  }, []);

  useEffect(() => {
    document.title = 'User Management - Admin Console';
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();
    loadPlans();

    // Debounced and filtered listener
    const handleSync = (e?: Event) => {
      if (e && 'key' in e) {
        const sEvt = e as StorageEvent;
        if (sEvt.key && sEvt.key !== 'zecratary_users' && sEvt.key !== 'zecratary_subscription_plans' && sEvt.key !== 'zecratary_deleted_users') {
          return;
        }
      }

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        loadUsers();
        loadPlans();
      }, 400);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_plans_updated', handleSync);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_plans_updated', handleSync);
    };
  }, [loadUsers, loadPlans]);

  const saveUsersList = (updated: AppUser[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  const handleAdminSort = (field: SortField) => {
    if (adminSortField === field) {
      setAdminSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortField(field);
      setAdminSortOrder('asc');
    }
  };

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  // Filter & Sort for Admins
  const processedAdmins = useMemo(() => {
    const admins = users.filter(u => u.role === 'admin');
    const filtered = admins.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim()) ||
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

  // Filter & Sort for Standard Users
  const processedStandardUsers = useMemo(() => {
    const standardUsers = users.filter(u => u.role === 'user');
    const filtered = standardUsers.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim()) ||
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

  const adminTotalPages = Math.max(1, Math.ceil(processedAdmins.length / ITEMS_PER_PAGE));
  const adminStartIndex = (adminCurrentPage - 1) * ITEMS_PER_PAGE;
  const adminEndIndex = Math.min(adminStartIndex + ITEMS_PER_PAGE, processedAdmins.length);
  const paginatedAdmins = processedAdmins.slice(adminStartIndex, adminEndIndex);

  const userTotalPages = Math.max(1, Math.ceil(processedStandardUsers.length / ITEMS_PER_PAGE));
  const userStartIndex = (userCurrentPage - 1) * ITEMS_PER_PAGE;
  const userEndIndex = Math.min(userStartIndex + ITEMS_PER_PAGE, processedStandardUsers.length);
  const paginatedStandardUsers = processedStandardUsers.slice(userStartIndex, userEndIndex);

  useEffect(() => {
    setAdminCurrentPage(1);
    setUserCurrentPage(1);
  }, [search]);

  const handleOpenAddModal = (presetRole: 'admin' | 'user' = 'user') => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole(presetRole);
    
    const defaultAdminPlan = availablePlans.find(p => p.slug.includes('annual') || p.slug.includes('pro'))?.slug || availablePlans[availablePlans.length - 1]?.slug || 'nutrition-pro-annual';
    const defaultUserPlan = availablePlans.find(p => p.isFree || p.slug === 'taster')?.slug || availablePlans[0]?.slug || 'taster';
    
    setAddSubscriptionPlan(presetRole === 'admin' ? defaultAdminPlan : defaultUserPlan);
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

    const assignedPlan = addSubscriptionPlan || (addRole === 'admin' ? 'nutrition-pro-annual' : 'taster');

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      subscriptionPlan: assignedPlan,
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`User "${newUser.name}" created with "${getPlanBadge(newUser.subscriptionPlan).label}" plan!`);
  };

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

    const targetUser = users.find(u => u.id === editingUserId);
    const isFirstAdmin = isFirstAdminUser(targetUser);

    const finalRole: 'admin' | 'user' = isFirstAdmin ? 'admin' : editRole;

    const updated = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: cleanName,
          email: cleanEmail,
          password: editPassword ? editPassword : u.password,
          role: finalRole,
          subscriptionPlan: editSubscriptionPlan
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
        role: finalRole,
        subscriptionPlan: editSubscriptionPlan
      };
      localStorage.setItem('zecratary_current_user', JSON.stringify(activeUserUpdated));
      setCurrentUser(activeUserUpdated);
      window.dispatchEvent(new Event('zecratary_auth_changed'));
    }

    setShowEditModal(false);
    showToast(`User "${cleanName}" updated successfully!`);
  };

  // Safe Non-Looping Deletion Handler
  const handleDeleteUser = async (id: string, email: string, name?: string) => {
    if (currentUser && (currentUser.id === id || (currentUser.email && currentUser.email.toLowerCase() === email.toLowerCase()))) {
      alert('You cannot delete your own active administrator account.');
      return;
    }

    const targetUser = users.find((u) => u.id === id || (u.email && u.email.toLowerCase() === email.toLowerCase()));
    if (isFirstAdminUser(targetUser)) {
      alert('You cannot delete the primary system administrator account.');
      return;
    }

    const displayName = name || (targetUser?.name) || email;
    if (!confirm(`Are you sure you want to permanently delete ${displayName}?`)) return;

    try {
      const cleanEmail = (email || '').toLowerCase().trim();

      // 1. Tombstone in deleted list
      try {
        const rawDel = localStorage.getItem('zecratary_deleted_users');
        const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (cleanEmail && !delList.includes(cleanEmail)) delList.push(cleanEmail);
        if (id && !delList.includes(id)) delList.push(id);
        localStorage.setItem('zecratary_deleted_users', JSON.stringify(delList));
      } catch (_) {}

      // 2. Remove locally from state immediately
      const updated = users.filter((u) => u.id !== id && (!u.email || u.email.toLowerCase() !== cleanEmail));
      setUsers(updated);
      localStorage.setItem('zecratary_users', JSON.stringify(updated));

      // 3. Remove on server
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: cleanEmail }),
      }).catch(() => {});

      showToast(`User "${displayName}" deleted successfully.`);
      // Note: Do NOT dispatch synthetic 'storage' event here to prevent ping-pong request loops
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user: ' + (err?.message || 'Server error'));
    }
  };

  const renderSortIcon = (currentField: SortField, targetField: SortField, order: SortOrder) => {
    if (currentField !== targetField) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" style={{ color: 'var(--color-primary, #E05638)' }} />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" style={{ color: 'var(--color-primary, #E05638)' }} />
    );
  };

  const getPlanBadge = (planKey?: string) => {
    if (!planKey) {
      return {
        label: 'Taster (Free)',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'var(--color-emerald, #10b981)',
        color: 'var(--color-emerald, #10b981)',
        icon: Sparkles
      };
    }

    const matched = availablePlans.find(
      p => p.slug === planKey || p.id === planKey || p.slug.toLowerCase() === planKey.toLowerCase()
    );

    if (matched) {
      if (matched.isFree || planKey === 'taster' || planKey.includes('free')) {
        return {
          label: matched.name,
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'var(--color-emerald, #10b981)',
          color: 'var(--color-emerald, #10b981)',
          icon: Sparkles
        };
      }
      if (matched.interval === 'YEAR' || planKey.includes('annual') || planKey.includes('year')) {
        return {
          label: matched.name,
          bg: 'rgba(59, 130, 246, 0.15)',
          border: '#3b82f6',
          color: '#60a5fa',
          icon: Zap
        };
      }
      if (matched.interval === 'MONTH' || planKey.includes('monthly')) {
        return {
          label: matched.name,
          bg: 'rgba(224, 86, 56, 0.15)',
          border: 'var(--color-primary, #E05638)',
          color: 'var(--color-primary, #E05638)',
          icon: Zap
        };
      }
      return {
        label: matched.name,
        bg: 'rgba(168, 85, 247, 0.15)',
        border: '#a855f7',
        color: '#c084fc',
        icon: CreditCard
      };
    }

    const formatted = planKey
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (planKey.includes('free') || planKey === 'taster') {
      return {
        label: `${formatted} (Free)`,
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'var(--color-emerald, #10b981)',
        color: 'var(--color-emerald, #10b981)',
        icon: Sparkles
      };
    }

    return {
      label: formatted,
      bg: 'rgba(168, 85, 247, 0.15)',
      border: '#a855f7',
      color: '#c084fc',
      icon: CreditCard
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-slate-100 pb-24 px-2 sm:px-4 pt-2">
      {currentUser && currentUser.role !== 'admin' && (
        <div 
          className="rounded-2xl p-4 flex items-center justify-between text-xs border"
          style={{
            backgroundColor: 'rgba(120, 53, 15, 0.4)',
            borderColor: 'rgba(217, 119, 6, 0.4)',
            color: '#fde68a'
          }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>. Switch to an admin account to manage user subscription permissions.
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 text-white font-bold rounded-xl shrink-0 ml-3 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            Switch to Admin
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div 
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in border"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: 'var(--color-emerald, #10b981)',
            color: 'var(--color-emerald, #10b981)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
             User & Subscription Management
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Active System Packages synced: {availablePlans.length} plans available from /admin/plans
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAddModal('user')}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)',
              color: '#cbd5e1'
            }}
          >
            <CreditCard className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> Manage Plans
          </Link>
          <Link
            href="/admin"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)',
              color: '#cbd5e1'
            }}
          >
            <Shield className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} /> Admin Settings
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, email, or subscription plan across all tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition shadow-inner"
          style={{
            backgroundColor: 'var(--color-inner-dark, #070b13)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
        />
      </div>

      {/* TABLE 1: ADMINISTRATORS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: 'var(--color-emerald, #10b981)'
              }}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Administrators
                <span 
                  className="text-xs border font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'var(--color-emerald, #10b981)',
                    color: 'var(--color-emerald, #10b981)'
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
            style={{ color: 'var(--color-emerald, #10b981)' }}
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Admin
          </button>
        </div>

        <div 
          className="border rounded-3xl overflow-hidden shadow-xl"
          style={{
            backgroundColor: 'var(--color-card, #0b0f17)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b text-slate-400 uppercase font-bold text-[10px] tracking-wider"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
              >
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Admin User</span>
                      {renderSortIcon(adminSortField, 'name', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('subscriptionPlan')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Subscription Type</span>
                      {renderSortIcon(adminSortField, 'subscriptionPlan', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(adminSortField, 'createdAt', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y text-slate-300"
                style={{ borderColor: 'var(--color-border, #1e293b)' }}
              >
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      No administrators found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    const isPrimary = isFirstAdminUser(user);
                    const planBadge = getPlanBadge(user.subscriptionPlan);
                    const PlanIcon = planBadge.icon;
                    return (
                      <tr 
                        key={user.id} 
                        className="transition"
                        style={{ borderColor: 'var(--color-border, #1e293b)' }}
                      >
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              borderColor: 'var(--color-emerald, #10b981)',
                              color: 'var(--color-emerald, #10b981)'
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isPrimary && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    borderColor: '#f59e0b',
                                    color: '#fbbf24'
                                  }}
                                  title="Primary Administrator"
                                >
                                  PRIMARY
                                </span>
                              )}
                              {isCurrent && !isPrimary && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                    borderColor: 'var(--color-emerald, #10b981)',
                                    color: 'var(--color-emerald, #10b981)'
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              borderColor: 'var(--color-emerald, #10b981)',
                              color: 'var(--color-emerald, #10b981)'
                            }}
                          >
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit"
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
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white rounded-xl border transition shadow-sm cursor-pointer"
                              style={{
                                backgroundColor: 'var(--color-inner-dark, #070b13)',
                                borderColor: 'var(--color-border, #1e293b)'
                              }}
                              title="Edit Admin Account & Plan"
                            >
                              <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent || isPrimary}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent || isPrimary
                                  ? 'opacity-30 cursor-not-allowed text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 cursor-pointer'
                              }`}
                              style={{
                                backgroundColor: 'var(--color-inner-dark, #070b13)',
                                borderColor: 'var(--color-border, #1e293b)'
                              }}
                              title={
                                isPrimary
                                  ? 'Cannot delete primary system admin'
                                  : isCurrent
                                    ? 'Cannot delete active session account'
                                    : 'Delete Admin'
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

          {processedAdmins.length > ITEMS_PER_PAGE && (
            <div 
              className="px-5 py-3.5 border-t flex items-center justify-between text-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <span className="text-slate-400">
                Showing {adminStartIndex + 1} to {adminEndIndex} of {processedAdmins.length} admins
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-card, #0b0f17)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white px-2">Page {adminCurrentPage} of {adminTotalPages}</span>
                <button
                  type="button"
                  disabled={adminCurrentPage >= adminTotalPages}
                  onClick={() => setAdminCurrentPage(p => Math.min(adminTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-card, #0b0f17)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE 2: STANDARD USERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl border flex items-center justify-center text-blue-400"
              style={{
                backgroundColor: 'rgba(30, 58, 138, 0.4)',
                borderColor: 'rgba(59, 130, 246, 0.4)'
              }}
            >
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Standard Users
                <span 
                  className="text-xs border font-bold px-2 py-0.5 rounded-full text-blue-300"
                  style={{
                    backgroundColor: 'rgba(30, 58, 138, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 0.5)'
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
            <UserPlus className="h-3.5 w-3.5" /> Add Standard User
          </button>
        </div>

        <div 
          className="border rounded-3xl overflow-hidden shadow-xl"
          style={{
            backgroundColor: 'var(--color-card, #0b0f17)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b text-slate-400 uppercase font-bold text-[10px] tracking-wider"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
              >
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Standard User</span>
                      {renderSortIcon(userSortField, 'name', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('subscriptionPlan')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Subscription Type</span>
                      {renderSortIcon(userSortField, 'subscriptionPlan', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(userSortField, 'createdAt', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y text-slate-300"
                style={{ borderColor: 'var(--color-border, #1e293b)' }}
              >
                {paginatedStandardUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      No standard users found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedStandardUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    const planBadge = getPlanBadge(user.subscriptionPlan);
                    const PlanIcon = planBadge.icon;
                    return (
                      <tr 
                        key={user.id} 
                        className="transition"
                        style={{ borderColor: 'var(--color-border, #1e293b)' }}
                      >
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0"
                            style={{
                              backgroundColor: 'var(--color-card, #111726)',
                              borderColor: 'var(--color-border, #1e293b)',
                              color: 'var(--color-primary, #E05638)'
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                    borderColor: 'var(--color-emerald, #10b981)',
                                    color: 'var(--color-emerald, #10b981)'
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border text-slate-300 flex items-center gap-1 w-fit"
                            style={{
                              backgroundColor: 'var(--color-inner-dark, #070b13)',
                              borderColor: 'var(--color-border, #1e293b)'
                            }}
                          >
                            <UserIcon className="h-3 w-3 text-slate-400" /> Standard User
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit shadow-sm"
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
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white rounded-xl border transition shadow-sm cursor-pointer"
                              style={{
                                backgroundColor: 'var(--color-inner-dark, #070b13)',
                                borderColor: 'var(--color-border, #1e293b)'
                              }}
                              title="Edit User & Plan Assignment"
                            >
                              <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 cursor-pointer'
                              }`}
                              style={{
                                backgroundColor: 'var(--color-inner-dark, #070b13)',
                                borderColor: 'var(--color-border, #1e293b)'
                              }}
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

          <div 
            className="px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark, #070b13)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <div className="text-slate-400">
              {processedStandardUsers.length === 0 ? (
                'Showing 0 standard users'
              ) : (
                <>
                  Showing <span className="font-bold text-white">{userStartIndex + 1}</span> to{' '}
                  <span className="font-bold text-white">{userEndIndex}</span> of{' '}
                  <span className="font-bold text-white">{processedStandardUsers.length}</span> standard users
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-slate-300 hover:text-white cursor-pointer'
                }`}
                style={{
                  backgroundColor: 'var(--color-card, #0b0f17)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
                title="Previous Page"
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
                    backgroundColor: 'var(--color-card, #0b0f17)',
                    borderColor: 'var(--color-border, #1e293b)',
                    color: '#cbd5e1'
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={userCurrentPage >= userTotalPages}
                onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage >= userTotalPages
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-slate-300 hover:text-white cursor-pointer'
                }`}
                style={{
                  backgroundColor: 'var(--color-card, #0b0f17)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. ADD USER MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer text-slate-300 hover:text-white"
              style={{ backgroundColor: 'var(--color-inner-dark, #172033)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <UserPlus className="h-5 w-5" /> Add New User
              </h2>
              <p className="text-slate-400 text-xs">Create a new user account with role & active package tier.</p>
            </div>

            {addError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5 pt-1">
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
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
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
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
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
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    Active Subscription Plan *
                  </span>
                  <Link href="/admin/plans" className="text-[10px] text-slate-400 hover:text-white underline">
                    Manage Plans ({availablePlans.length})
                  </Link>
                </label>
                <select
                  value={addSubscriptionPlan}
                  onChange={(e) => setAddSubscriptionPlan(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-white outline-none transition cursor-pointer font-bold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
                >
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug}>
                      {plan.name} — ({plan.priceFormatted})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between"
                    style={addRole === 'user' ? {
                      backgroundColor: 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">App Subscriber</div>
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
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between"
                    style={addRole === 'admin' ? {
                      backgroundColor: 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3" style={{ color: 'var(--color-emerald, #10b981)' }} /> Admin
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

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer text-slate-300"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  <UserPlus className="h-4 w-4" /> Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT USER MODAL */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer text-slate-300 hover:text-white"
              style={{ backgroundColor: 'var(--color-inner-dark, #172033)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <Edit3 className="h-5 w-5" /> Edit User & Plan
              </h2>
              <p className="text-slate-400 text-xs">Update account details, role permissions, and active subscription plan.</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
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
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
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
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    Active Subscription Plan
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">Live Synced ({availablePlans.length})</span>
                </label>
                <select
                  value={editSubscriptionPlan}
                  onChange={(e) => setEditSubscriptionPlan(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-white outline-none transition cursor-pointer font-bold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #1e293b)')}
                >
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug}>
                      {plan.name} — ({plan.priceFormatted})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-300">Assigned Role</label>
                  {isEditingFirstAdmin && (
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        borderColor: '#f59e0b',
                        color: '#fbbf24'
                      }}
                    >
                      <Lock className="h-3 w-3" /> Primary Admin Locked
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => {
                      if (!isEditingFirstAdmin) setEditRole('user');
                    }}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                      isEditingFirstAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    style={editRole === 'user' && !isEditingFirstAdmin ? {
                      backgroundColor: 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">App Subscriber</div>
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
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between"
                    style={editRole === 'admin' ? {
                      backgroundColor: 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3" style={{ color: 'var(--color-emerald, #10b981)' }} /> Admin
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

                {isEditingFirstAdmin && (
                  <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                    The primary system administrator role is permanently protected and cannot be changed or demoted.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer text-slate-300"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
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

for target_file in target_files:
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(clean_page_code)
    print(f"✓ Deployed loop-guarded admin users page at: {target_file}")

print("\n🚀 Server request loop terminated successfully!")
