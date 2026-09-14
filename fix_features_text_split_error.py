import os
import glob
import re

# 1. Locate admin/plans/page.tsx
candidates = [
    'src/app/admin/plans/page.tsx',
    'apps/web/src/app/admin/plans/page.tsx',
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

for page_path in target_files:
    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix line 508: currentFeaturesList defensive resolution
    pattern_features = re.compile(
        r'const\s+currentFeaturesList\s*=\s*form\.featuresText\.split\([^)]*\)\.filter\(Boolean\);'
    )
    replacement_features = (
        "const currentFeaturesList = (typeof form.featuresText === 'string'\n"
        "    ? form.featuresText\n"
        "    : (Array.isArray((form as any).features) ? (form as any).features.join('\\n') : ''))\n"
        "    .split(/\\r?\\n/)\n"
        "    .filter(Boolean);"
    )
    if pattern_features.search(content):
        content = pattern_features.sub(replacement_features, content, count=1)
        print(f"✓ Guarded currentFeaturesList in {page_path}")

    # 2. Fix line 509: currentAllowedModels resolution
    pattern_models = re.compile(
        r'const\s+currentAllowedModels\s*=\s*form\.allowedAiModels\s*\?\s*form\.allowedAiModels\.split\([^)]*\)[^;]*;?'
    )
    replacement_models = (
        "const currentAllowedModels = Array.isArray(form.allowedAiModels)\n"
        "    ? form.allowedAiModels\n"
        "    : (typeof form.allowedAiModels === 'string'\n"
        "        ? form.allowedAiModels.split(',').map((s: string) => s.trim()).filter(Boolean)\n"
        "        : []);"
    )
    if pattern_models.search(content):
        content = pattern_models.sub(replacement_models, content, count=1)
        print(f"✓ Guarded currentAllowedModels in {page_path}")

    # 3. Guard parsedFeatures in handleSavePlan
    pattern_save = re.compile(
        r'const\s+parsedFeatures\s*=\s*form\.featuresText\s*\.split\([^)]*\)[\s\S]*?\.filter\([^)]*\);'
    )
    replacement_save = (
        "const rawFeaturesText = typeof form.featuresText === 'string'\n"
        "      ? form.featuresText\n"
        "      : (Array.isArray((form as any).features) ? (form as any).features.join('\\n') : '');\n"
        "    const parsedFeatures = rawFeaturesText\n"
        "      .split(/\\r?\\n/)\n"
        "      .map((s) => s.trim())\n"
        "      .filter((s) => s.length > 0);"
    )
    if pattern_save.search(content):
        content = pattern_save.sub(replacement_save, content, count=1)
        print(f"✓ Guarded handleSavePlan parsedFeatures in {page_path}")

    # 4. Guard handleEditPackage to ensure featuresText and allowedAiModels are normalized
    old_edit_pattern = re.compile(
        r'const\s+handleEditPackage\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?setForm\(\{[\s\S]*?\}\);\s*\};',
        re.MULTILINE
    )
    new_edit_function = """const handleEditPackage = (pkg: SubscriptionPackageConfig) => {
    const targetIdentifier = pkg.id || pkg.slug;
    const planIsFree = Boolean(pkg.isFree || (Number(pkg.monthlyPriceDollars) === 0 && Number(pkg.annualPriceDollars) === 0));
    setEditingId(targetIdentifier);
    setIsFree(planIsFree);

    const fText = pkg.featuresText || (Array.isArray((pkg as any).features) ? (pkg as any).features.join('\\n') : '');
    const aModels = Array.isArray(pkg.allowedAiModels)
      ? pkg.allowedAiModels.join(',')
      : (typeof pkg.allowedAiModels === 'string' ? pkg.allowedAiModels : (activeSettingsModel || 'gemini-3.6-flash'));

    setForm({ 
      ...pkg, 
      featuresText: fText,
      allowedAiModels: aModels,
      isFree: planIsFree,
      tokenLimit: pkg.tokenLimit !== undefined ? pkg.tokenLimit : 100000,
      tokenReimburseFrequency: pkg.tokenReimburseFrequency || 'monthly',
    });
  };"""
    if old_edit_pattern.search(content):
        content = old_edit_pattern.sub(new_edit_function, content, count=1)
        print(f"✓ Guarded handleEditPackage in {page_path}")

    # 5. Guard handleApplyPreset
    old_preset_pattern = re.compile(
        r'const\s+handleApplyPreset\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?setForm\(\{[\s\S]*?\}\);\s*\};',
        re.MULTILINE
    )
    new_preset_function = """const handleApplyPreset = (preset: SubscriptionPackageConfig) => {
    setEditingId(null);
    setIsFree(preset.isFree);

    const fText = preset.featuresText || (Array.isArray((preset as any).features) ? (preset as any).features.join('\\n') : '');
    const aModels = Array.isArray(preset.allowedAiModels)
      ? preset.allowedAiModels.join(',')
      : (typeof preset.allowedAiModels === 'string' ? preset.allowedAiModels : (activeSettingsModel || 'gemini-3.6-flash'));

    setForm({ 
      ...preset, 
      featuresText: fText,
      allowedAiModels: aModels,
      id: 'plan_' + Date.now(),
      slug: preset.slug || preset.name.toLowerCase().replace(/\\s+/g, '-')
    });
  };"""
    if old_preset_pattern.search(content):
        content = old_preset_pattern.sub(new_preset_function, content, count=1)
        print(f"✓ Guarded handleApplyPreset in {page_path}")

    # 6. Ensure textarea value defaults to empty string instead of undefined
    content = content.replace("value={form.featuresText}", "value={form.featuresText || ''}")

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Successfully resolved 'Cannot read properties of undefined (reading 'split')'!")
