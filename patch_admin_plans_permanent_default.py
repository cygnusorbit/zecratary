import os
import glob
import json
import re

# 1. Locate admin/plans/page.tsx
candidates = [
    'apps/web/src/app/admin/plans/page.tsx',
    'src/app/admin/plans/page.tsx',
    'apps/web/app/admin/plans/page.tsx',
    'app/admin/plans/page.tsx'
]

target_files = [p for p in candidates if os.path.exists(p)]

if not target_files:
    matches = glob.glob('**/admin/plans/page.tsx', recursive=True)
    target_files = [p for p in matches if 'node_modules' not in p and '.next' not in p]

if not target_files:
    print("❌ Error: Could not locate admin/plans/page.tsx")
    exit(1)

# 2. Patch each candidate admin/plans/page.tsx
for page_path in target_files:
    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # A. Permanently lock isDefault to preset_taster in loadLocalPackages
    load_pattern = re.compile(
        r'const\s+hasDefault\s*=\s*list\.some\(\(p\)\s*=>\s*p\.isDefault\);\s*if\s*\(!hasDefault\)\s*\{\s*list\s*=\s*list\.map\(\(p\)\s*=>\s*\(\{\s*\.\.\.p,\s*isDefault:\s*p\.slug\s*===\s*\'taster\'\s*\|\|\s*p\.id\s*===\s*\'preset_taster\',\s*\}\)\);\s*\}',
        re.MULTILINE
    )
    if load_pattern.search(content):
        content = load_pattern.sub(
            "list = list.map((p) => ({\n            ...p,\n            isDefault: p.slug === 'taster' || p.id === 'preset_taster',\n          }));",
            content,
            count=1
        )

    # B. Update handleSetDefaultPlan to strictly enforce preset_taster
    old_set_default_pattern = re.compile(
        r'const\s+handleSetDefaultPlan\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?setFeedback\(\{\s*type:\s*\'success\',[\s\S]*?\}\);\s*\};',
        re.MULTILINE
    )
    new_set_default = """const handleSetDefaultPlan = (targetPkg: SubscriptionPackageConfig) => {
    const isTaster = targetPkg.id === 'preset_taster' || targetPkg.slug === 'taster';
    if (!isTaster) {
      alert(t('tasterPermanentDefaultAlert', 'The Taster plan (ID: preset_taster) is permanently locked as the system default plan and cannot be changed.'));
      return;
    }

    const updated = packages.map((p) => ({
      ...p,
      isDefault: p.id === 'preset_taster' || p.slug === 'taster',
    }));

    setPackages(updated);
    localStorage.setItem('zecratary_subscription_configs', JSON.stringify(updated));
    localStorage.setItem('zecratary_default_plan_slug', 'taster');
    localStorage.setItem('zecratary_default_plan', 'taster');
    window.dispatchEvent(new Event('zecratary_plans_updated'));
    window.dispatchEvent(new Event('storage'));

    setFeedback({
      type: 'success',
      msg: `"${DEFAULT_PRESET_TASTER.name}" ${t('permanentDefaultConfirmed', 'is permanently locked as the default plan for new registrations!')}`,
    });
  };"""
    if old_set_default_pattern.search(content):
        content = old_set_default_pattern.sub(new_set_default, content, count=1)

    # C. Preserve permanent default status in handleSavePlan
    content = content.replace(
        "isDefault: form.isDefault ?? (generatedSlug === 'taster'),",
        "isDefault: planId === 'preset_taster' || generatedSlug === 'taster',"
    )
    content = content.replace(
        "setPackages(updatedList);",
        "updatedList = updatedList.map((p) => ({ ...p, isDefault: p.id === 'preset_taster' || p.slug === 'taster' }));\n      setPackages(updatedList);"
    )

    # D. Style & lock the Star button in the package list to preset_taster
    old_star_btn_pattern = re.compile(
        r'<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*handleSetDefaultPlan\(pkg\)\}\s+className=\{`p-2 rounded-xl border transition flex items-center gap-1 cursor-pointer shadow-xs[\s\S]*?<\/button>',
        re.MULTILINE
    )
    new_star_btn = """<button
                          type="button"
                          disabled={!isTaster}
                          onClick={() => handleSetDefaultPlan(pkg)}
                          className={`p-2 rounded-xl border transition flex items-center gap-1 shadow-xs ${
                            isTaster
                              ? 'text-amber-500 border-amber-500/50 bg-amber-500/15 cursor-default'
                              : 'opacity-30 cursor-not-allowed text-slate-400'
                          }`}
                          style={{
                            backgroundColor: isTaster
                              ? (isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)')
                              : (isDayMode ? '#ffffff' : 'var(--color-card, #111726)'),
                            borderColor: isTaster ? '#f59e0b' : (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')
                          }}
                          title={
                            isTaster
                              ? t('tasterPermanentDefaultTooltip', 'The Taster plan (ID: preset_taster) is permanently locked as the system default plan')
                              : t('tasterLockedDefaultTooltip', 'The Taster plan (ID: preset_taster) is permanently locked as the default plan')
                          }
                        >
                          <Star className={`h-4 w-4 ${isTaster ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>"""
    if old_star_btn_pattern.search(content):
        content = old_star_btn_pattern.sub(new_star_btn, content, count=1)

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Updated {page_path} to permanently lock preset_taster as default")

# 3. Synchronize server data files if present
for root in [os.getcwd(), os.path.dirname(os.getcwd())]:
    configs_path = os.path.join(root, 'data', 'subscription_configs.json')
    if os.path.exists(configs_path):
        try:
            with open(configs_path, 'r', encoding='utf-8') as f:
                cfgs = json.load(f)
            if isinstance(cfgs, list):
                for p in cfgs:
                    p['isDefault'] = (p.get('id') == 'preset_taster' or p.get('slug') == 'taster')
                with open(configs_path, 'w', encoding='utf-8') as f:
                    json.dump(cfgs, f, indent=2)
                print(f"✓ Synchronized server defaults in {configs_path}")
        except Exception as e:
            print(f"Warning updating {configs_path}: {e}")

print("\n🚀 The Taster plan (ID: preset_taster) is now permanently locked as the default plan!")
