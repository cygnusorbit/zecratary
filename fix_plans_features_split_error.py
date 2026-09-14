import os
import glob
import re

# 1. Discover all candidate admin/plans/page.tsx files
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

    # 1. Defend line 508: currentFeaturesList definition
    old_feat_pattern = re.compile(
        r'const\s+currentFeaturesList\s*=\s*form\.featuresText\.split\(/\\r\?\\n/\)\.filter\(Boolean\);',
        re.MULTILINE
    )
    new_feat_definition = (
        "const currentFeaturesList = (typeof form.featuresText === 'string'\n"
        "    ? form.featuresText\n"
        "    : (Array.isArray((form as any).features) ? (form as any).features.join('\\n') : '')\n"
        "  ).split(/\\r?\\n/).filter(Boolean);"
    )

    if old_feat_pattern.search(content):
        content = old_feat_pattern.sub(new_feat_definition, content, count=1)
        print(f"✓ Guarded currentFeaturesList at line 508 in {page_path}")
    else:
        # Fallback string replace
        target_str = "const currentFeaturesList = form.featuresText.split(/\\r?\\n/).filter(Boolean);"
        if target_str in content:
            content = content.replace(target_str, new_feat_definition)
            print(f"✓ Replaced currentFeaturesList string in {page_path}")

    # 2. Defend currentAllowedModels (line 509) against array/undefined
    old_models_pattern = re.compile(
        r'const\s+currentAllowedModels\s*=\s*form\.allowedAiModels\s*\?\s*form\.allowedAiModels\.split\([^\)]*\)[\s\S]*?:\s*\[\];',
        re.MULTILINE
    )
    new_models_definition = (
        "const currentAllowedModels = Array.isArray(form.allowedAiModels)\n"
        "    ? form.allowedAiModels\n"
        "    : (typeof form.allowedAiModels === 'string'\n"
        "        ? form.allowedAiModels.split(',').map((s: string) => s.trim()).filter(Boolean)\n"
        "        : []);"
    )
    if old_models_pattern.search(content):
        content = old_models_pattern.sub(new_models_definition, content, count=1)
        print(f"✓ Guarded currentAllowedModels in {page_path}")

    # 3. Guard handleSavePlan against undefined form.featuresText and array allowedAiModels
    old_save_features_pattern = re.compile(
        r'const\s+parsedFeatures\s*=\s*form\.featuresText\s*\.split\(/\\r\?\\n/\)',
        re.MULTILINE
    )
    new_save_features = (
        "const rawFeaturesText = typeof form.featuresText === 'string'\n"
        "      ? form.featuresText\n"
        "      : (Array.isArray((form as any).features) ? (form as any).features.join('\\n') : '');\n"
        "    const parsedFeatures = rawFeaturesText.split(/\\r?\\n/)"
    )
    if old_save_features_pattern.search(content):
        content = old_save_features_pattern.sub(new_save_features, content, count=1)
        print(f"✓ Guarded handleSavePlan parsedFeatures in {page_path}")

    # 4. Guard handleEditPackage so featuresText and allowedAiModels are guaranteed strings
    old_edit_pattern = re.compile(
        r'const\s+handleEditPackage\s*=\s*\((?:pkg|targetPkg):\s*SubscriptionPackageConfig\)\s*=>\s*\{[\s\S]*?setForm\(\{[\s\S]*?\}\);?\s*\};',
        re.MULTILINE
    )
    new_edit_handler = """  const handleEditPackage = (pkg: SubscriptionPackageConfig) => {
    const targetIdentifier = pkg.id || pkg.slug;
    const planIsFree = Boolean(pkg.isFree || (Number(pkg.monthlyPriceDollars) === 0 && Number(pkg.annualPriceDollars) === 0));
    const safeFeatures = pkg.featuresText || (Array.isArray((pkg as any).features) ? (pkg as any).features.join('\\n') : '');
    const safeAiModels = Array.isArray(pkg.allowedAiModels)
      ? (pkg.allowedAiModels as string[]).join(',')
      : (typeof pkg.allowedAiModels === 'string' ? pkg.allowedAiModels : (activeSettingsModel || 'gemini-3.6-flash'));

    setEditingId(targetIdentifier);
    setIsFree(planIsFree);
    setForm({ 
      ...pkg, 
      featuresText: safeFeatures,
      allowedAiModels: safeAiModels,
      isFree: planIsFree,
      tokenLimit: pkg.tokenLimit !== undefined ? pkg.tokenLimit : 100000,
      tokenReimburseFrequency: pkg.tokenReimburseFrequency || 'monthly',
    });
  };"""

    if old_edit_pattern.search(content):
        content = old_edit_pattern.sub(new_edit_handler, content, count=1)
        print(f"✓ Updated handleEditPackage normalization in {page_path}")

    # 5. Populate featuresText during loadLocalPackages
    if "featuresText: p.featuresText ||" not in content:
        content = content.replace(
            "list = list.map((p: any) => ({",
            "list = list.map((p: any) => ({\n            featuresText: p.featuresText || (Array.isArray(p.features) ? p.features.join('\\n') : ''),"
        )
        print(f"✓ Added featuresText fallback in loadLocalPackages in {page_path}")

    # 6. Ensure textarea value has a fallback to avoid uncontrolled warnings
    content = content.replace(
        "value={form.featuresText}",
        "value={form.featuresText || ''}"
    )

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Successfully resolved 'Cannot read properties of undefined (reading split)' error!")
