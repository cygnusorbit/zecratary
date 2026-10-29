import os
import sys

TARGET_PATHS = [
    os.path.join("apps", "web", "src", "components", "Sidebar.tsx"),
    os.path.join("src", "components", "Sidebar.tsx"),
    "Sidebar.tsx"
]

target_file = None
for p in TARGET_PATHS:
    if os.path.exists(p):
        target_file = p
        break

if not target_file:
    print("❌ Error: Sidebar.tsx not found.")
    sys.exit(1)

print(f"📦 Patching mobile navigation drawer in: {target_file}")

with open(target_file, "r", encoding="utf-8") as f:
    content = f.read()

# Marker for mobile application drawer
mobile_marker = "{/* MOBILE APPLICATION DRAWER */}"
if mobile_marker not in content:
    print("❌ Error: Could not find '{/* MOBILE APPLICATION DRAWER */}' in Sidebar.tsx")
    sys.exit(1)

pre_mobile = content.split(mobile_marker)[0]

upgraded_mobile_drawer = """{/* MOBILE APPLICATION DRAWER */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          data-lpignore="true"
          data-form-type="other"
          className="md:hidden fixed inset-0 z-50 flex"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-80 max-w-[85vw] h-full flex flex-col p-4 space-y-3 overflow-y-auto pb-20 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-text)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Brand & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                {isImageIcon(siteIcon) ? (
                  <img src={siteIcon} alt="Logo" className="w-6 h-6 rounded-md object-contain shrink-0" />
                ) : (
                  <span className="text-xl shrink-0">{siteIcon || '🍳'}</span>
                )}
                <span className="font-extrabold text-sm truncate">{siteName || 'Zecratary'}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
                style={{ borderColor: 'var(--color-border)' }}
                aria-label="Close Mobile Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile User Profile & Telemetry Card */}
            <div 
              className="p-3 rounded-2xl border space-y-2 shrink-0 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center font-black text-xs shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-extrabold truncate">{currentUser?.name || 'User'}</div>
                    <div className="text-[10px] opacity-60 truncate">{currentUser?.email || ''}</div>
                  </div>
                </div>
                <span 
                  className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {planBadgeText}
                </span>
              </div>

              {/* Quick Language Selector & Notification Bar */}
              <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
                {/* Language Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span>{getLanguageMeta(currentLanguage).flag}</span>
                    <span className="uppercase text-[10px] font-mono">{currentLanguage || 'en'}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {langDropdownOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 mt-1 w-48 border rounded-xl p-1.5 shadow-xl z-50 space-y-1 text-xs"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      {activeLanguages.map((lang: any) => {
                        const meta = getLanguageMeta(lang.code);
                        const isSelected = currentLanguage === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              if (typeof changeLanguage === 'function') changeLanguage(lang.code);
                              setLangDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/40 text-xs font-semibold cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span>{meta.flag}</span>
                              <span className="truncate">{lang.native || meta.native}</span>
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notifications Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold relative cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>{t('topbarNotifications', 'Alerts')}</span>
                  {unreadCount > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* In-Drawer Notification Expander */}
              {notifDropdownOpen && (
                <div 
                  className="mt-2 p-2 border rounded-xl space-y-1.5 max-h-40 overflow-y-auto text-xs"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-bold text-[10px] uppercase tracking-wider">{t('topbarNotifications', 'Notifications')}</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[9px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="h-2.5 w-2.5" />
                        <span>{t('topbarMarkAllRead', 'Mark read')}</span>
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-3 opacity-60 text-[10px]">{t('topbarNoNotifications', 'No notifications')}</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-1.5 rounded-lg border text-[10px]" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="font-bold">{n.title}</div>
                        <div className="opacity-75 text-[9px]">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Navigation Tree with All 5 Accordion Sections */}
            <div className="flex-1 space-y-3">
              {/* Dashboard */}
              <div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={navClass('/dashboard')}
                  style={navStyle('/dashboard')}
                  title={t('dashboard', 'Dashboard')}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>{t('dashboard', 'Dashboard')}</span>
                </Link>
              </div>

              {/* 1. CREATE ACCORDION */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection('create')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:opacity-100 transition cursor-pointer"
                >
                  <span>{t('createSection', 'Create')}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.create ? 'rotate-0' : '-rotate-90'}`} />
                </button>

                {openSections.create && (
                  <div className="space-y-0.5 pl-1">
                    <Link href="/chef" onClick={() => setMobileMenuOpen(false)} className={navClass('/chef')} style={navStyle('/chef')} title={t('aiChef', 'AI Assistant')}>
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span>{t('aiChef', 'AI Assistant')}</span>
                    </Link>
                    <Link href="/manual" onClick={() => setMobileMenuOpen(false)} className={navClass('/manual')} style={navStyle('/manual')} title={t('manualEntry', 'Add Recipe')}>
                      <SquarePen className="h-4 w-4 shrink-0" />
                      <span>{t('manualEntry', 'Add Recipe')}</span>
                    </Link>
                    <Link href="/import" onClick={() => setMobileMenuOpen(false)} className={navClass('/import')} style={navStyle('/import')} title={t('importRecipe', 'Import Recipe')}>
                      <UploadCloud className="h-4 w-4 shrink-0" />
                      <span>{t('importRecipe', 'Import Recipe')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. MANAGE ACCORDION */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection('manage')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:opacity-100 transition cursor-pointer"
                >
                  <span>{t('manageSection', 'Manage')}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.manage ? 'rotate-0' : '-rotate-90'}`} />
                </button>

                {openSections.manage && (
                  <div className="space-y-0.5 pl-1">
                    <Link href="/recipes" onClick={() => setMobileMenuOpen(false)} className={navClass('/recipes')} style={navStyle('/recipes')} title={t('savedRecipes', 'Saved Recipes')}>
                      <BookOpen className="h-4 w-4 shrink-0" />
                      <span>{t('savedRecipes', 'Saved Recipes')}</span>
                    </Link>
                    <Link href="/books" onClick={() => setMobileMenuOpen(false)} className={navClass('/books')} style={navStyle('/books')} title={t('cookbooks', 'Cookbooks')}>
                      <Book className="h-4 w-4 shrink-0" />
                      <span>{t('cookbooks', 'Cookbooks')}</span>
                    </Link>
                    <Link href="/pantry" onClick={() => setMobileMenuOpen(false)} className={navClass('/pantry')} style={navStyle('/pantry')} title={t('pantryInventory', 'Pantry Inventory')}>
                      <Package className="h-4 w-4 shrink-0" />
                      <span>{t('pantryInventory', 'Pantry Inventory')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. PLAN ACCORDION */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection('plan')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:opacity-100 transition cursor-pointer"
                >
                  <span>{t('planSection', 'Plan')}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.plan ? 'rotate-0' : '-rotate-90'}`} />
                </button>

                {openSections.plan && (
                  <div className="space-y-0.5 pl-1">
                    <Link href="/planner" onClick={() => setMobileMenuOpen(false)} className={navClass('/planner')} style={navStyle('/planner')} title={t('mealPlanner', 'Meal Planner')}>
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{t('mealPlanner', 'Meal Planner')}</span>
                    </Link>
                    <Link href="/templates" onClick={() => setMobileMenuOpen(false)} className={navClass('/templates')} style={navStyle('/templates')} title={t('templates', 'Meal Blueprints')}>
                      <LayoutTemplate className="h-4 w-4 shrink-0" />
                      <span>{t('templates', 'Meal Blueprints')}</span>
                    </Link>
                    <Link href="/shopping" onClick={() => setMobileMenuOpen(false)} className={navClass('/shopping')} style={navStyle('/shopping')} title={t('shoppingList', 'Shopping List')}>
                      <ShoppingCart className="h-4 w-4 shrink-0" />
                      <span>{t('shoppingList', 'Shopping List')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 4. FINANCIAL & UTILITY ACCORDION */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection('finance')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:opacity-100 transition cursor-pointer"
                >
                  <span>{t('financeSection', 'Finance Hub')}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.finance ? 'rotate-0' : '-rotate-90'}`} />
                </button>

                {openSections.finance && (
                  <div className="space-y-0.5 pl-1">
                    <Link href="/token" onClick={() => setMobileMenuOpen(false)} className={navClass('/token')} style={navStyle('/token')} title={t('token', 'Token')}>
                      <Coins className="h-4 w-4 shrink-0" />
                      <span>{t('token', 'Token')}</span>
                    </Link>
                    <Link href="/wallet" onClick={() => setMobileMenuOpen(false)} className={navClass('/wallet')} style={navStyle('/wallet')} title={financeWalletLabel}>
                      <Wallet className="h-4 w-4 shrink-0" />
                      <span>{financeWalletLabel}</span>
                    </Link>
                    <Link href="/subscriptions" onClick={() => setMobileMenuOpen(false)} className={navClass('/subscriptions')} style={navStyle('/subscriptions')} title={t('subscriptions', 'Subscriptions')}>
                      <Layers className="h-4 w-4 shrink-0" />
                      <span>{t('subscriptions', 'Subscriptions')}</span>
                    </Link>
                    <Link href="/billing" onClick={() => setMobileMenuOpen(false)} className={navClass('/billing')} style={navStyle('/billing')} title={t('billing', 'Billing History')}>
                      <Receipt className="h-4 w-4 shrink-0" />
                      <span>{t('billing', 'Billing History')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 5. ADMIN MANAGEMENT ACCORDION (Visible for Administrators) */}
              {isAdmin && (
                <div className="space-y-1 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => toggleSection('admin')}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:opacity-100 transition cursor-pointer"
                  >
                    <span>{t('adminAccess', 'Admin Access')}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.admin ? 'rotate-0' : '-rotate-90'}`} />
                  </button>

                  {openSections.admin && (
                    <div className="space-y-0.5 pl-1">
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin')} style={navStyle('/admin')} title={t('generalSettings', 'General Settings')}>
                        <Settings className="h-4 w-4 shrink-0" />
                        <span>{t('generalSettings', 'General Settings')}</span>
                      </Link>
                      <Link href="/admin/frontend" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/frontend')} style={navStyle('/admin/frontend')} title={t('pageBuilder', 'Page Builder')}>
                        <Globe className="h-4 w-4 shrink-0" />
                        <span>{t('pageBuilder', 'Page Builder')}</span>
                      </Link>
                      <Link href="/admin/language" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/language')} style={navStyle('/admin/language')} title={t('languageSetting', 'Language Setting')}>
                        <Languages className="h-4 w-4 shrink-0" />
                        <span>{t('languageSetting', 'Language Setting')}</span>
                      </Link>
                      <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/users')} style={navStyle('/admin/users')} title={t('users', 'Users')}>
                        <UserPlus className="h-4 w-4 shrink-0" />
                        <span>{t('users', 'User Accounts')}</span>
                      </Link>
                      <Link href="/admin/plans" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/plans')} style={navStyle('/admin/plans')} title={t('plans', 'Plans')}>
                        <CreditCard className="h-4 w-4 shrink-0" />
                        <span>{t('plans', 'Subscription Plans')}</span>
                      </Link>
                      <Link href="/admin/payment-gateway" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/payment-gateway')} style={navStyle('/admin/payment-gateway')} title={t('payments', 'Payments')}>
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span>{t('payments', 'Payment Gateway')}</span>
                      </Link>
                      <Link href="/admin/token-setting" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/token-setting')} style={navStyle('/admin/token-setting')} title={t('tokenSettings', 'Token Settings')}>
                        <Coins className="h-4 w-4 shrink-0" />
                        <span>{t('tokenSettings', 'Token Settings')}</span>
                      </Link>
                      <Link href="/admin/wallet-settings" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/wallet-settings')} style={navStyle('/admin/wallet-settings')} title={t('walletSettings', 'Wallet Settings')}>
                        <Wallet className="h-4 w-4 shrink-0" />
                        <span>{t('walletSettings', 'Wallet Settings')}</span>
                      </Link>
                      <Link href="/admin/notification-settings" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/notification-settings')} style={navStyle('/admin/notification-settings')} title={t('notifications', 'Alerts')}>
                        <BellRing className="h-4 w-4 shrink-0" />
                        <span>{t('notifications', 'Notifications')}</span>
                      </Link>
                      <Link href="/admin/ai-settings" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/ai-settings')} style={navStyle('/admin/ai-settings')} title={t('aiModels', 'AI Models')}>
                        <Cpu className="h-4 w-4 shrink-0" />
                        <span>{t('aiModels', 'AI Engine')}</span>
                      </Link>
                      <Link href="/admin/storage" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/storage')} style={navStyle('/admin/storage')} title={t('storageSettings', 'Storage Settings')}>
                        <HardDrive className="h-4 w-4 shrink-0" />
                        <span>{t('storageSettings', 'Storage Settings')}</span>
                      </Link>
                      <Link href="/admin/recipe-type" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/recipe-type')} style={navStyle('/admin/recipe-type')} title={t('recipeTypes', 'Recipe Types')}>
                        <Utensils className="h-4 w-4 shrink-0" />
                        <span>{t('recipeTypes', 'Recipe Types')}</span>
                      </Link>
                      <Link href="/admin/ingredient-categories" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/ingredient-categories')} style={navStyle('/admin/ingredient-categories')} title={t('categories', 'Categories')}>
                        <Tag className="h-4 w-4 shrink-0" />
                        <span>{t('categories', 'Categories')}</span>
                      </Link>
                      <Link href="/admin/social-login-setting" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/social-login-setting')} style={navStyle('/admin/social-login-setting')} title={t('socialLogin', 'OAuth')}>
                        <Key className="h-4 w-4 shrink-0" />
                        <span>{t('socialLogin', 'Social Login')}</span>
                      </Link>
                      <Link href="/admin/database" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/database')} style={navStyle('/admin/database')} title={t('databaseSettings', 'Database Settings')}>
                        <Database className="h-4 w-4 shrink-0" />
                        <span>{t('databaseSettings', 'Database Settings')}</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* User Profile & Support Shortcuts */}
              <div className="pt-2 border-t space-y-0.5" style={{ borderColor: 'var(--color-border)' }}>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className={navClass('/profile')} style={navStyle('/profile')}>
                  <UserIcon className="h-4 w-4 shrink-0" /> <span>{t('topbarProfile', 'User Profile')}</span>
                </Link>
                <Link href="/contacts" onClick={() => setMobileMenuOpen(false)} className={navClass('/contacts')} style={navStyle('/contacts')}>
                  <Mail className="h-4 w-4 shrink-0" /> <span>{t('contactSupport', 'Contact Support')}</span>
                </Link>
              </div>
            </div>

            {/* Mobile Drawer Footer: App Version & Logout */}
            <div className="pt-3 border-t space-y-2 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-[10px] font-mono opacity-60 px-1">
                <span>{t('version', 'App Version')}</span>
                <span>v{packageInfo.version || '1.0.0'}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('logOut', 'Log Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
"""

final_content = pre_mobile + upgraded_mobile_drawer

with open(target_file, "w", encoding="utf-8") as f:
    f.write(final_content)

print("✅ Successfully patched Sidebar.tsx! All 24 routes, 5 accordions, and utilities restored on mobile.")
