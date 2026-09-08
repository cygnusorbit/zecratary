'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, Check,
  ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Users, CreditCard, Zap, Sparkles, RefreshCw
} from 'lucide-react';
import { getCurrentUser, logoutUser, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

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

const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  if (Array.isArray(planInput)) return planInput[0] ? String(planInput[0]).trim() : 'taster';
  if (typeof planInput === 'string') {
    if (planInput.includes(',')) {
      const parts = planInput.split(',').map(s => s.trim()).filter(Boolean);
      return parts[0] || 'taster';
    }
    return planInput.trim() || 'taster';
  }
  return 'taster';
};

export default function AdminUserManagementPage() {
  const { t, version } = useTranslation();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>(DEFAULT_AVAILABLE_PLANS);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

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
  const [addError, setAddError] = useState('');

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editError, setEditError] = useState('');

  // Dynamic Theme Synchronization & Color Inversion
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      const c = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-card', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', c.innerDark || c.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', c.borderColor || c.cardBorder || '#1e293b');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', c.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', c.textSecondary || '#94a3b8');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('storage', applySavedTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applySavedTheme]);

  // Helper: Identify Root / Primary First Administrator
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

  // Synchronize Plans
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

    const planMap = new Map<string, PlanOption>();
    const planList = parsedPlans.length > 0 ? parsedPlans : DEFAULT_AVAILABLE_PLANS;
    planList.forEach((plan) => {
      if (!planMap.has(plan.slug)) {
        planMap.set(plan.slug, plan);
      }
    });

    setAvailablePlans(Array.from(planMap.values()));
  }, []);

  const loadUsers = useCallback(() => {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const mapped = parsed.map((u: any) => ({
          ...u,
          subscriptionPlan: sanitizeSinglePlan(u.subscriptionPlan || (u.role === 'admin' ? 'nutrition-pro-annual' : 'taster'))
        }));
        setUsers(mapped);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    document.title = `${t('userMgmtTitle') || 'User Management'} - Admin Console`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();
    loadPlans();

    const handleSync = () => {
      loadUsers();
      loadPlans();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadUsers, loadPlans, t, version]);

  const saveUsersList = (updated: AppUser[]) => {
    const normalizedUsers = updated.map(u => ({
      ...u,
      subscriptionPlan: sanitizeSinglePlan(u.subscriptionPlan)
    }));
    setUsers(normalizedUsers);
    localStorage.setItem('zecratary_users', JSON.stringify(normalizedUsers));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Sort Toggles
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

  // Add User Modal
  const handleOpenAddModal = (presetRole: 'admin' | 'user' = 'user') => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole(presetRole);
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError(t('fillAllRequiredFields') || 'Please fill in all required name and email fields.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      setAddError(t('userEmailExists') || 'A user with this email address already exists.');
      return;
    }

    if (addPassword.length < 4) {
      setAddError(t('passwordMinLength') || 'Password must be at least 4 characters long.');
      return;
    }

    const defaultAdminPlan = availablePlans.find(p => p.slug.includes('annual') || p.slug.includes('pro'))?.slug || 'nutrition-pro-annual';
    const defaultUserPlan = availablePlans.find(p => p.isFree || p.slug === 'taster')?.slug || 'taster';
    const singleAssignedPlan = sanitizeSinglePlan(addRole === 'admin' ? defaultAdminPlan : defaultUserPlan);

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      subscriptionPlan: singleAssignedPlan,
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`"${newUser.name}" ${t('userCreatedSuccess') || 'account created successfully!'}`);
  };

  // Edit User Modal
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
      setEditError(t('nameEmailNotEmpty') || 'Name and email fields cannot be empty.');
      return;
    }

    const emailTaken = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setEditError(t('emailTakenByOther') || 'This email address is already taken by another account.');
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
      };
      localStorage.setItem('zecratary_current_user', JSON.stringify(activeUserUpdated));
      setCurrentUser(activeUserUpdated);
      window.dispatchEvent(new Event('zecratary_auth_changed'));
    }

    setShowEditModal(false);
    showToast(`"${cleanName}" ${t('userUpdatedSuccess') || 'account updated successfully!'}`);
  };

  // Delete User
  const handleDeleteUser = (id: string, userEmail: string, userName: string) => {
    const targetUser = users.find(u => u.id === id);

    if (currentUser?.email === userEmail || currentUser?.id === id) {
      alert(t('cannotDeleteSelfAlert') || 'You cannot delete your own currently signed-in account.');
      return;
    }

    if (isFirstAdminUser(targetUser)) {
      alert(t('primaryAdminCannotDeleteAlert') || 'The primary administrator account cannot be deleted.');
      return;
    }

    const confirmMsg = (t('confirmDeleteUser') || 'Are you sure you want to delete user');
    const undoMsg = (t('actionCannotUndo') || 'This action cannot be undone.');
    if (!confirm(`${confirmMsg} "${userName}" (${userEmail})? ${undoMsg}`)) return;

    const updated = users.filter(u => u.id !== id);
    saveUsersList(updated);
    showToast(`"${userName}" ${t('userDeletedSuccess') || 'deleted successfully.'}`);
  };

  const renderSortIcon = (currentField: SortField, targetField: SortField, order: SortOrder) => {
    if (currentField !== targetField) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-60" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />;
    }
    return order === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" style={{ color: 'var(--color-primary, #E05638)' }} />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" style={{ color: 'var(--color-primary, #E05638)' }} />
    );
  };

  const getPlanBadge = (planKey?: string) => {
    const singleKey = sanitizeSinglePlan(planKey);

    if (!singleKey || singleKey === 'taster' || singleKey.includes('free')) {
      return {
        label: 'Taster (Free)',
        bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
        border: 'var(--color-emerald, #10b981)',
        color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
        icon: Sparkles
      };
    }

    const matched = availablePlans.find(
      p => p.slug === singleKey || p.id === singleKey || p.slug.toLowerCase() === singleKey.toLowerCase()
    );

    if (matched) {
      if (matched.isFree || singleKey === 'taster' || singleKey.includes('free')) {
        return {
          label: matched.name,
          bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
          border: 'var(--color-emerald, #10b981)',
          color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
          icon: Sparkles
        };
      }
      if (matched.interval === 'YEAR' || singleKey.includes('annual') || singleKey.includes('year')) {
        return {
          label: matched.name,
          bg: isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)',
          border: '#3b82f6',
          color: isDayMode ? '#1d4ed8' : '#60a5fa',
          icon: Zap
        };
      }
      if (matched.interval === 'MONTH' || singleKey.includes('monthly')) {
        return {
          label: matched.name,
          bg: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)',
          border: 'var(--color-primary, #E05638)',
          color: 'var(--color-primary, #E05638)',
          icon: Zap
        };
      }
      return {
        label: matched.name,
        bg: isDayMode ? '#faf5ff' : 'rgba(168, 85, 247, 0.15)',
        border: '#a855f7',
        color: isDayMode ? '#7e22ce' : '#c084fc',
        icon: CreditCard
      };
    }

    const formatted = singleKey
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      label: formatted,
      bg: isDayMode ? '#faf5ff' : 'rgba(168, 85, 247, 0.15)',
      border: '#a855f7',
      color: isDayMode ? '#7e22ce' : '#c084fc',
      icon: CreditCard
    };
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-8 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      
      {/* Autofill CSS Override */}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-user-input:-webkit-autofill,
        .admin-user-input:-webkit-autofill:hover,
        .admin-user-input:-webkit-autofill:focus,
        .admin-user-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'} inset !important;
          box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'} inset !important;
          -webkit-text-fill-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          caret-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
      `}} />

      {/* ACCESS WARNING FOR NON-ADMINS */}
      {currentUser && currentUser.role !== 'admin' && (
        <div 
          className="rounded-2xl p-4 flex items-center justify-between text-xs border shadow-xs"
          style={{
            backgroundColor: isDayMode ? '#fef3c7' : 'rgba(120, 53, 15, 0.4)',
            borderColor: isDayMode ? '#f59e0b' : 'rgba(217, 119, 6, 0.4)',
            color: isDayMode ? '#92400e' : '#fde68a'
          }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <span>
              {t('signedInAsPrefix') || 'Signed in as'} <strong>{currentUser.email}</strong>. {t('nonAdminUserWarning') || 'You do not have administrator permissions.'}
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 text-white font-bold rounded-xl shrink-0 ml-3 cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {t('switchToAdmin') || 'Switch to Admin'}
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div 
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in border"
          style={{
            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
            borderColor: 'var(--color-emerald, #10b981)',
            color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
             {t('userMgmtTitle') || 'User & Administrator Management'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('userMgmtSubtitle') || 'Manage user accounts, assign roles, and configure subscription access tiers.'}
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
            <UserPlus className="h-4 w-4" /> {t('addNewUserBtn') || 'Add User'}
          </button>
          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <CreditCard className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('managePlans') || 'Manage Plans'}
          </Link>
          <Link
            href="/admin"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <Shield className="h-4 w-4" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} /> {t('adminSettingsBtn') || 'Admin Settings'}
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
        <input
          type="text"
          placeholder={t('userSearchPlaceholder') || 'Filter by user name, email, or plan...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-user-input w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition shadow-xs"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #070b13)',
            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
            color: isDayMode ? '#0f172a' : '#ffffff'
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
        />
      </div>

      {/* TABLE 1: ADMINISTRATORS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
              }}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                {t('administratorsTitle') || 'Administrators'}
                <span 
                  className="text-xs border font-bold px-2 py-0.5 rounded-full shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'var(--color-emerald, #10b981)',
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
            style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }}
          >
            <UserPlus className="h-3.5 w-3.5" /> {t('addAdminBtn') || 'Add Administrator'}
          </button>
        </div>

        <div 
          className="border rounded-3xl overflow-hidden shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b uppercase font-bold text-[10px] tracking-wider transition-colors duration-200"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#64748b' : '#94a3b8'
                }}
              >
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('name')}
                      className="flex items-center gap-1.5 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
                    >
                      <span>{t('adminUserCol') || 'Administrator'}</span>
                      {renderSortIcon(adminSortField, 'name', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">{t('emailAddressCol') || 'Email Address'}</th>
                  <th className="px-5 py-4">{t('roleCol') || 'Role'}</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('subscriptionPlan')}
                      className="flex items-center gap-1.5 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
                    >
                      <span>{t('subscriptionTypeCol') || 'Subscription Type'}</span>
                      {renderSortIcon(adminSortField, 'subscriptionPlan', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('createdAt')}
                      className="flex items-center gap-1.5 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
                    >
                      <span>{t('createdDateCol') || 'Created Date'}</span>
                      {renderSortIcon(adminSortField, 'createdAt', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">{t('actionsCol') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y transition-colors duration-200"
                style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
              >
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                      {t('noAdminsFound') || 'No administrators found'} {search ? `${t('matching') || 'matching'} "${search}"` : ''}.
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
                        className={`transition ${isDayMode ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}`}
                        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
                      >
                        <td className="px-5 py-4 font-bold flex items-center gap-3" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 shadow-xs"
                            style={{
                              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: 'var(--color-emerald, #10b981)',
                              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold">{user.name}</span>
                              {isPrimary && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs"
                                  style={{
                                    backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                                    borderColor: '#f59e0b',
                                    color: isDayMode ? '#b45309' : '#fbbf24'
                                  }}
                                  title="Primary Administrator"
                                >
                                  {t('primaryBadge') || 'PRIMARY'}
                                </span>
                              )}
                              {isCurrent && !isPrimary && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs"
                                  style={{
                                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                                    borderColor: 'var(--color-emerald, #10b981)',
                                    color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                                  }}
                                >
                                  {t('youBadge') || 'YOU'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{user.email}</td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit shadow-xs"
                            style={{
                              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: 'var(--color-emerald, #10b981)',
                              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                            }}
                          >
                            <Shield className="h-3 w-3" /> {t('adminRoleBadge') || 'Administrator'}
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
                        <td className="px-5 py-4 font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : (t('activeStatus') || 'Active')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 rounded-xl border transition shadow-xs cursor-pointer"
                              style={{
                                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#334155' : '#cbd5e1'
                              }}
                              title={t('editAdminTooltip') || 'Edit Administrator'}
                            >
                              <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent || isPrimary}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-xs ${
                                isCurrent || isPrimary
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : 'hover:text-red-500 cursor-pointer'
                              }`}
                              style={{
                                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#64748b' : '#94a3b8'
                              }}
                              title={
                                isPrimary
                                  ? (t('cannotDeletePrimaryAdmin') || 'Primary administrator account is permanently protected')
                                  : isCurrent
                                    ? (t('cannotDeleteActiveSession') || 'Cannot delete your own active session account')
                                    : (t('deleteAdminTooltip') || 'Delete Administrator')
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
              className="px-5 py-3.5 border-t flex items-center justify-between text-xs transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('showing') || 'Showing'} {adminStartIndex + 1} {t('to') || 'to'} {adminEndIndex} {t('of') || 'of'} {processedAdmins.length} {t('adminsCount') || 'administrators'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold px-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {t('page') || 'Page'} {adminCurrentPage} {t('of') || 'of'} {adminTotalPages}
                </span>
                <button
                  type="button"
                  disabled={adminCurrentPage >= adminTotalPages}
                  onClick={() => setAdminCurrentPage(p => Math.min(adminTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
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
              className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#eff6ff' : 'rgba(30, 58, 138, 0.4)',
                borderColor: isDayMode ? '#bfdbfe' : 'rgba(59, 130, 246, 0.4)',
                color: isDayMode ? '#1d4ed8' : '#60a5fa'
              }}
            >
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                {t('standardUsersTitle') || 'Standard Users & Subscribers'}
                <span 
                  className="text-xs border font-bold px-2 py-0.5 rounded-full shadow-xs"
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
            <UserPlus className="h-3.5 w-3.5" /> {t('addStandardUserBtn') || 'Add Subscriber'}
          </button>
        </div>

        <div 
          className="border rounded-3xl overflow-hidden shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b uppercase font-bold text-[10px] tracking-wider transition-colors duration-200"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#64748b' : '#94a3b8'
                }}
              >
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('name')}
                      className="flex items-center gap-1.5 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
                    >
                      <span>{t('standardUserCol') || 'User Account'}</span>
                      {renderSortIcon(userSortField, 'name', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">{t('emailAddressCol') || 'Email Address'}</th>
                  <th className="px-5 py-4">{t('roleCol') || 'Role'}</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('subscriptionPlan')}
                      className="flex items-center gap-1.5 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
                    >
                      <span>{t('subscriptionTypeCol') || 'Subscription Type'}</span>
                      {renderSortIcon(userSortField, 'subscriptionPlan', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('createdAt')}
                      className="flex items-center gap-1.5 transition cursor-pointer select-none font-bold uppercase tracking-wider"
                      style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
                    >
                      <span>{t('createdDateCol') || 'Created Date'}</span>
                      {renderSortIcon(userSortField, 'createdAt', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">{t('actionsCol') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y transition-colors duration-200"
                style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
              >
                {paginatedStandardUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                      {t('noStandardUsersFound') || 'No standard users found'} {search ? `${t('matching') || 'matching'} "${search}"` : ''}.
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
                        className={`transition ${isDayMode ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}`}
                        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
                      >
                        <td className="px-5 py-4 font-bold flex items-center gap-3" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                          <div 
                            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 shadow-xs"
                            style={{
                              backgroundColor: isDayMode ? '#fee2e2' : 'var(--color-card, #111726)',
                              borderColor: isDayMode ? '#fca5a5' : 'var(--color-border, #1e293b)',
                              color: 'var(--color-primary, #E05638)'
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold">{user.name}</span>
                              {isCurrent && (
                                <span 
                                  className="border text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs"
                                  style={{
                                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                                    borderColor: 'var(--color-emerald, #10b981)',
                                    color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                                  }}
                                >
                                  {t('youBadge') || 'YOU'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{user.email}</td>
                        <td className="px-5 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit shadow-xs"
                            style={{
                              backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#334155' : '#cbd5e1'
                            }}
                          >
                            <UserIcon className="h-3 w-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} /> {t('standardUserRoleBadge') || 'Subscriber'}
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
                        <td className="px-5 py-4 font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : (t('activeStatus') || 'Active')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 rounded-xl border transition shadow-xs cursor-pointer"
                              style={{
                                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#334155' : '#cbd5e1'
                              }}
                              title={t('editUserTooltip') || 'Edit User'}
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
                                  : 'hover:text-red-500 cursor-pointer'
                              }`}
                              style={{
                                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#64748b' : '#94a3b8'
                              }}
                              title={isCurrent ? (t('cannotDeleteActiveAccount') || 'Cannot delete active session account') : (t('deleteUserTooltip') || 'Delete User')}
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
            className="px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              {processedStandardUsers.length === 0 ? (
                t('showingZeroStandardUsers') || 'Showing 0 standard users'
              ) : (
                <>
                  {t('showing') || 'Showing'} <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{userStartIndex + 1}</span> {t('to') || 'to'}{' '}
                  <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{userEndIndex}</span> {t('of') || 'of'}{' '}
                  <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{processedStandardUsers.length}</span> {t('standardUsersCount') || 'standard users'}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition shadow-xs ${
                  userCurrentPage <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                style={{
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
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
                  className="min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-xs"
                  style={userCurrentPage === pageNum ? {
                    backgroundColor: 'var(--color-primary, #E05638)',
                    borderColor: 'var(--color-primary, #E05638)',
                    color: '#ffffff'
                  } : {
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={userCurrentPage >= userTotalPages}
                onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition shadow-xs ${
                  userCurrentPage >= userTotalPages
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                style={{
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <UserPlus className="h-5 w-5" /> {t('addUserModalTitle') || 'Create New User Account'}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('addUserModalSub') || 'Register a new user or administrator profile with custom permissions.'}
              </p>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold flex items-center gap-2 shadow-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('fullNameLabel') || 'Full Name *'}
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder={t('fullNamePlaceholder') || 'e.g. Jordan Lee'}
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="admin-user-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('emailAddressLabel') || 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="admin-user-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('passwordLabel') || 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="password"
                    required
                    placeholder={t('passwordMinPlaceholder') || 'At least 4 characters'}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="admin-user-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('assignedRoleLabel') || 'Assigned System Role'}
                </label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className="p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs"
                    style={addRole === 'user' ? {
                      backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('standardUserRoleBadge') || 'Subscriber'}</div>
                      <div className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('appSubscriberRoleSub') || 'App Subscriber'}</div>
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
                      backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        <Shield className="h-3 w-3" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} /> {t('adminRoleBadge') || 'Administrator'}
                      </div>
                      <div className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('fullAccessRoleSub') || 'Full Access'}</div>
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

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  <UserPlus className="h-4 w-4" /> {t('createUserSubmitBtn') || 'Create User Account'}
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <Edit3 className="h-5 w-5" /> {t('editUserModalTitle') || 'Edit User Account'}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('editUserModalSub') || 'Update profile details, password credentials, and access roles.'}
              </p>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold flex items-center gap-2 shadow-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('fullNameLabel') || 'Full Name *'}
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="admin-user-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('emailAddressLabel') || 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="admin-user-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('changePasswordLabel') || 'Change Password (Leave blank to keep current)'}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="password"
                    placeholder={t('enterNewPasswordPlaceholder') || 'New password (optional)'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="admin-user-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              {/* ASSIGNED ROLE WITH PRIMARY ADMIN LOCK */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('assignedRoleLabel') || 'Assigned System Role'}
                  </label>
                  {isEditingFirstAdmin && (
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-xs"
                      style={{
                        backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                        borderColor: '#f59e0b',
                        color: isDayMode ? '#b45309' : '#fbbf24'
                      }}
                    >
                      <Lock className="h-3 w-3" /> {t('primaryAdminLocked') || 'Primary Admin (Locked)'}
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
                      backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('standardUserRoleBadge') || 'Subscriber'}</div>
                      <div className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('appSubscriberRoleSub') || 'App Subscriber'}</div>
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
                      backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.12)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        <Shield className="h-3 w-3" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} /> {t('adminRoleBadge') || 'Administrator'}
                      </div>
                      <div className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('fullAccessRoleSub') || 'Full Access'}</div>
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
                  <p className="text-[11px] mt-1.5 font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('primaryAdminRoleProtectedNote') || 'The primary administrator role cannot be demoted to protect system ownership access.'}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  <Check className="h-4 w-4" /> {t('saveChanges') || 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
