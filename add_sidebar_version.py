import os
import re
import json

# 1. Sync version from root package.json to apps/web/package.json if necessary
root_pkg_path = 'package.json'
web_pkg_path = 'apps/web/package.json'

version = "1.0.0"
if os.path.exists(root_pkg_path):
    try:
        with open(root_pkg_path, 'r', encoding='utf-8') as f:
            root_data = json.load(f)
            if 'version' in root_data and root_data['version']:
                version = root_data['version']
    except Exception as e:
        print(f"Warning reading root package.json: {e}")

if os.path.exists(web_pkg_path):
    try:
        with open(web_pkg_path, 'r', encoding='utf-8') as f:
            web_data = json.load(f)
        if web_data.get('version') != version:
            web_data['version'] = version
            with open(web_pkg_path, 'w', encoding='utf-8') as f:
                json.dump(web_data, f, indent=2)
            print(f"✓ Synchronized version {version} to {web_pkg_path}")
    except Exception as e:
        print(f"Warning syncing apps/web/package.json: {e}")

# 2. Ensure resolveJsonModule is enabled in tsconfig.json
for tsconfig_path in ['apps/web/tsconfig.json', 'tsconfig.json']:
    if os.path.exists(tsconfig_path):
        try:
            with open(tsconfig_path, 'r', encoding='utf-8') as f:
                ts_content = f.read()
            if 'resolveJsonModule' not in ts_content:
                ts_content = re.sub(
                    r'("compilerOptions"\s*:\s*\{)',
                    r'\1\n    "resolveJsonModule": true,',
                    ts_content
                )
                with open(tsconfig_path, 'w', encoding='utf-8') as f:
                    f.write(ts_content)
                print(f"✓ Enabled resolveJsonModule in {tsconfig_path}")
        except Exception as e:
            print(f"Notice: {tsconfig_path} adjustment skipped: {e}")

# 3. Locate Sidebar.tsx
sidebar_paths = [
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((p for p in sidebar_paths if os.path.exists(p)), None)

if not sidebar_path:
    print("❌ Error: Could not locate Sidebar.tsx")
    exit(1)

with open(sidebar_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 4. Add package.json import if not already present
if 'package.json' not in content:
    import_stmt = "import packageInfo from '../../package.json';\n"
    use_client_match = re.search(r"^(['\"]use client['\"];?\r?\n)", content)
    if use_client_match:
        idx = use_client_match.end()
        content = content[:idx] + import_stmt + content[idx:]
    else:
        content = import_stmt + content
    print("✓ Added package.json import to Sidebar.tsx")

# 5. Inject Dynamic Version at the bottom of the sidebar footer controls
version_ui = """
          {/* DYNAMIC VERSION BADGE */}
          <div className={`pt-2 select-none flex items-center ${showCollapsed ? 'justify-center text-[10px]' : 'px-3.5 justify-between text-[11px]'} font-mono ${
            isDarkMode ? 'text-slate-500' : 'text-slate-600'
          }`}>
            {!showCollapsed && <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75">Version</span>}
            <span className="font-semibold tracking-tight opacity-90">v{packageInfo.version || '1.0.0'}</span>
          </div>"""

# Check if version display is already injected
if 'DYNAMIC VERSION BADGE' not in content:
    # Match the logout button element inside the footer controls container
    logout_pattern = re.compile(r'(<button\s+onClick=\{\(\)\s*=>\s*\{[\s\S]*?title=\{t\([\'"]logout[\'"]\)\}[\s\S]*?</button>)', re.MULTILINE)
    
    if logout_pattern.search(content):
        content = logout_pattern.sub(r'\1' + version_ui, content, count=1)
        with open(sidebar_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Added dynamic version badge to {sidebar_path}")
    else:
        print("❌ Error: Could not find logout button block in Sidebar.tsx")
        exit(1)
else:
    print("Notice: Dynamic version badge already present in Sidebar.tsx")

print("✅ Sidebar successfully updated!")
