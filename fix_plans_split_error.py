import os
import glob
import re

# 1. Locate candidate admin/plans/page.tsx files
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

    # 1. Fix line 1393: modelsList in packages.map loop
    old_models_list_pattern = re.compile(
        r'const\s+modelsList\s*=\s*pkg\.allowedAiModels\s*\?\s*pkg\.allowedAiModels\.split\([^)]*\)[\s\S]*?:\s*\[\];',
        re.MULTILINE
    )
    new_models_list = (
        "const modelsList = Array.isArray(pkg.allowedAiModels)\n"
        "                    ? pkg.allowedAiModels\n"
        "                    : (typeof pkg.allowedAiModels === 'string'\n"
        "                        ? pkg.allowedAiModels.split(',').map((m: string) => m.trim()).filter(Boolean)\n"
        "                        : []);"
    )
    if old_models_list_pattern.search(content):
        content = old_models_list_pattern.sub(new_models_list, content, count=1)
        print(f"✓ Fixed modelsList resolution in {page_path}")
    else:
        # Direct string fallback replace
        direct_target = "const modelsList = pkg.allowedAiModels ? pkg.allowedAiModels.split(',').map(m => m.trim()).filter(Boolean) : [];"
        if direct_target in content:
            content = content.replace(direct_target, new_models_list)
            print(f"✓ Replaced direct modelsList in {page_path}")

    # 2. Fix currentAllowedModels in form preview
    old_current_models_pattern = re.compile(
        r'const\s+currentAllowedModels\s*=\s*form\.allowedAiModels\s*\?\s*form\.allowedAiModels\.split\([^)]*\)[\s\S]*?:\s*\[\];',
        re.MULTILINE
    )
    new_current_models = (
        "const currentAllowedModels = Array.isArray(form.allowedAiModels)\n"
        "    ? form.allowedAiModels\n"
        "    : (typeof form.allowedAiModels === 'string'\n"
        "        ? form.allowedAiModels.split(',').map((s: string) => s.trim()).filter(Boolean)\n"
        "        : []);"
    )
    if old_current_models_pattern.search(content):
        content = old_current_models_pattern.sub(new_current_models, content, count=1)
        print(f"✓ Fixed currentAllowedModels resolution in {page_path}")

    # 3. Fix handleAddAiModel array check
    old_add_model_pattern = re.compile(
        r'const\s+current\s*=\s*form\.allowedAiModels\s*\?\s*form\.allowedAiModels\.split\([^)]*\)[\s\S]*?:\s*\[\];',
        re.MULTILINE
    )
    new_add_model_helper = (
        "const current = Array.isArray(form.allowedAiModels)\n"
        "      ? [...form.allowedAiModels]\n"
        "      : (typeof form.allowedAiModels === 'string'\n"
        "          ? form.allowedAiModels.split(',').map((s: string) => s.trim()).filter(Boolean)\n"
        "          : []);"
    )
    if old_add_model_pattern.search(content):
        content = old_add_model_pattern.sub(new_add_model_helper, content)
        print(f"✓ Fixed handleAddAiModel / handleRemoveAiModel in {page_path}")

    # 4. Normalize allowedAiModels inside handleEditPackage when pkg.allowedAiModels is an Array
    edit_pkg_pattern = re.compile(
        r'(const\s+handleEditPackage\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?setForm\(\{[\s\S]*?allowedAiModels:\s*)(pkg\.allowedAiModels[^,\n}]+)',
        re.MULTILINE
    )
    if edit_pkg_pattern.search(content):
        content = edit_pkg_pattern.sub(
            r"\1Array.isArray(pkg.allowedAiModels) ? pkg.allowedAiModels.join(',') : (\2)",
            content,
            count=1
        )
        print(f"✓ Normalized allowedAiModels in handleEditPackage in {page_path}")

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n🚀 Successfully resolved 'pkg.allowedAiModels.split is not a function' error!")
