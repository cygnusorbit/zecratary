import os
import glob
import re

# 1. Locate profile page file
candidates = [
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx',
    'apps/web/app/profile/page.tsx',
    'app/profile/page.tsx'
]

profile_path = next((p for p in candidates if os.path.exists(p)), None)
if not profile_path:
    matches = glob.glob('**/profile/page.tsx', recursive=True)
    profile_path = next((p for p in matches if 'node_modules' not in p and '.next' not in p), None)

if not profile_path:
    print("❌ Error: Could not locate profile page.tsx")
    exit(1)

with open(profile_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 2. Fix sanitizeSinglePlan and checkIsCurrentPlan to correctly match active subscription plans
old_sanitize = """const sanitizeSinglePlan = (planInput?: string | string[]): string => {
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
};"""

new_sanitize = """const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  let raw = '';
  if (Array.isArray(planInput)) {
    raw = planInput[0] ? String(planInput[0]).trim() : 'taster';
  } else if (typeof planInput === 'string') {
    if (planInput.includes(',')) {
      const parts = planInput.split(',').map(s => s.trim()).filter(Boolean);
      raw = parts[0] || 'taster';
    } else {
      raw = planInput.trim();
    }
  } else {
    raw = String(planInput).trim();
  }
  const clean = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!clean || clean === 'free' || clean === 'taster') return 'taster';
  return clean;
};"""

if old_sanitize in code:
    code = code.replace(old_sanitize, new_sanitize)
else:
    # Fallback replacement if exact match varies
    code = re.sub(r'const sanitizeSinglePlan[\s\S]*?return\s*\'taster\';\s*\};', new_sanitize, code)

# 3. Upgrade checkIsCurrentPlan to robustly compare slugs and tiers
old_check_current = """  const checkIsCurrentPlan = (plan: SubscriptionPlanItem): boolean => {
    if (!user) return false;

    const rawUser = user as any;
    const userPlan = sanitizeSinglePlan(rawUser.subscriptionPlan || rawUser.subscriptionTier || '').toLowerCase().trim();
    const targetSlug = sanitizeSinglePlan(plan.slug || '').toLowerCase().trim();
    const isPlanFree = Boolean(plan.isFree || plan.priceCents === 0);

    const isUserFree = !userPlan || userPlan === 'taster' || userPlan === 'free' || userPlan.includes('free');
    if (isUserFree) {
      return isPlanFree || targetSlug === 'taster';
    }

    if (isPlanFree) return false;
    return userPlan === targetSlug;
  };"""

new_check_current = """  const checkIsCurrentPlan = (plan: SubscriptionPlanItem): boolean => {
    if (!user) return false;

    const rawUser = user as any;
    const userPlanRaw = rawUser.subscriptionPlan || rawUser.subscriptionTier || rawUser.planSlug || 'taster';
    const userPlan = sanitizeSinglePlan(userPlanRaw);
    const targetSlug = sanitizeSinglePlan(plan.slug || plan.id || '');
    const isPlanFree = Boolean(plan.isFree || plan.priceCents === 0);

    const isUserFree = !userPlan || userPlan === 'taster' || userPlan === 'free' || userPlan.includes('free');
    if (isUserFree) {
      return isPlanFree || targetSlug === 'taster' || targetSlug.includes('taster');
    }

    if (isPlanFree) return false;

    // Check exact match or normalized comparison
    if (userPlan === targetSlug) return true;
    if (userPlan.includes(targetSlug) || targetSlug.includes(userPlan)) return true;

    // Check interval matching for Nutrition Pro
    const userInterval = ((rawUser.planInterval || '')).toUpperCase();
    const planInterval = (plan.interval || '').toUpperCase();
    if (userPlan.includes('pro') && targetSlug.includes('pro')) {
      if (userInterval && planInterval) {
        return userInterval === planInterval;
      }
      return true;
    }

    return false;
  };"""

if old_check_current in code:
    code = code.replace(old_check_current, new_check_current)
else:
    code = re.sub(r'const checkIsCurrentPlan[\s\S]*?return userPlan === targetSlug;\s*\};', new_check_current, code)

# 4. Ensure handleSelectPlan properly normalizes and updates plan interval and expiry
old_handle_select = """      const updatedUser: any = {
        ...user,
        subscriptionPlan: targetSlug,
        subscriptionTier: targetSlug,
        planName: `${plan.name}${isFree ? ' (Free)' : plan.interval === 'YEAR' ? ' (Annual)' : ' (Monthly)'}`,
        planInterval: plan.interval,
        subscriptionStatus: 'active',
        lastPaymentDate: isFree ? '' : new Date().toISOString(),
        planExpiryDate: newExpiryDate,
        expiryDate: newExpiryDate,
        updatedAt: new Date().toISOString()
      };"""

new_handle_select = """      const updatedUser: any = {
        ...user,
        subscriptionPlan: targetSlug,
        subscriptionTier: targetSlug,
        planSlug: targetSlug,
        planName: `${plan.name}${isFree ? ' (Free)' : plan.interval === 'YEAR' ? ' (Annual)' : ' (Monthly)'}`,
        planInterval: plan.interval,
        subscriptionStatus: 'active',
        lastPaymentDate: isFree ? '' : new Date().toISOString(),
        planExpiryDate: newExpiryDate,
        expiryDate: newExpiryDate,
        updatedAt: new Date().toISOString()
      };"""

if old_handle_select in code:
    code = code.replace(old_handle_select, new_handle_select)

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f"✓ Successfully patched membership plan logic in {profile_path}")
