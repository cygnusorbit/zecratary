import os
import sys
import subprocess
import shutil

print("==================================================================")
print("🚀 ZECRATARY: Reconciling Restored Codebase & Executing Safe Push")
print("   Repository: cygnusorbit/zecratary (GitHub)")
print("==================================================================\n")

WORKSPACE_ROOT = os.getcwd()
APPS_WEB = os.path.join(WORKSPACE_ROOT, 'apps', 'web')
if not os.path.exists(APPS_WEB):
    APPS_WEB = WORKSPACE_ROOT

def run_cmd(cmd, cwd=WORKSPACE_ROOT, capture=True):
    res = subprocess.run(cmd, shell=True, cwd=cwd, text=True, capture_output=capture)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

# ----------------------------------------------------------------------
# 1. Verify Git Environment & Remote Connection
# ----------------------------------------------------------------------
print("1. Checking Git workspace state and remote connection...")
code, _, _ = run_cmd("git rev-parse --is-inside-work-tree")
if code != 0:
    print("❌ Error: Not inside a valid Git repository.")
    sys.exit(1)

code, remote_url, _ = run_cmd("git remote get-url origin")
if code != 0:
    remote_url = "https://github.com/cygnusorbit/zecratary.git"
    run_cmd(f"git remote add origin {remote_url}")
    print(f"   ✓ Configured remote 'origin': {remote_url}")
else:
    print(f"   ✓ Remote URL: {remote_url}")

# Fetch latest refs from GitHub to compare state
print("   • Fetching latest references and tags from origin...")
run_cmd("git fetch origin main --tags --prune")

# ----------------------------------------------------------------------
# 2. Check and Resolve Detached HEAD State
# ----------------------------------------------------------------------
print("\n2. Inspecting branch pointer and HEAD state...")
_, current_branch, _ = run_cmd("git branch --show-current")

sync_branch = "restore/reconcile-main"
if not current_branch:
    print("   ⚠️ Detached HEAD detected! Creating branch pointer...")
    run_cmd(f"git checkout -B {sync_branch}")
    print(f"   ✓ Attached HEAD to new branch '{sync_branch}'.")
else:
    print(f"   ✓ Current active branch: {current_branch}")
    if current_branch == "main":
        print(f"   • Creating safe reconciliation branch '{sync_branch}' to satisfy rulesets...")
        run_cmd(f"git checkout -B {sync_branch}")
    else:
        sync_branch = current_branch

# ----------------------------------------------------------------------
# 3. Sanitize .gitignore and Purge Sensitive Files from Git Index
# ----------------------------------------------------------------------
print("\n3. Enforcing environment credential isolation (.env* & secrets)...")
gi_path = os.path.join(WORKSPACE_ROOT, '.gitignore')
if os.path.exists(gi_path):
    with open(gi_path, 'r', encoding='utf-8') as f:
        gi_lines = f.read().splitlines()
else:
    gi_lines = []

needed_ignores = ['.env', '.env.local', '.env*.local', 'apps/web/.env.local', 'backups/*.sql']
updated_gi = False
for ni in needed_ignores:
    if ni not in gi_lines:
        gi_lines.append(ni)
        updated_gi = True

if updated_gi:
    with open(gi_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(gi_lines) + "\n")
    print("   ✓ Updated .gitignore with secret exclusions.")

# Remove any cached environment files from staging index
run_cmd("git rm --cached .env .env.local apps/web/.env apps/web/.env.local 2>/dev/null")

# Verify admin_settings.json contains no raw secrets
for settings_rel in ["apps/web/data/admin_settings.json", "data/admin_settings.json"]:
    sp = os.path.join(WORKSPACE_ROOT, settings_rel)
    if os.path.exists(sp):
        with open(sp, 'r', encoding='utf-8') as f:
            raw_json = f.read()
        if "GOCSPX-" in raw_json or "AIzaSy" in raw_json:
            print(f"   ⚠️ Scrubbing raw credentials from {settings_rel}...")
            import re
            cleaned_json = re.sub(r'"googleClientSecret"\s*:\s*"[^"]*"', '"googleClientSecret": ""', raw_json)
            with open(sp, 'w', encoding='utf-8') as f:
                f.write(cleaned_json)
            print(f"   ✓ Sanitized {settings_rel}.")

# ----------------------------------------------------------------------
# 4. Safe Build Cache Purge & Production Build Verification
# ----------------------------------------------------------------------
print("\n4. Purging stale build caches...")
for c in [
    os.path.join(APPS_WEB, '.next'),
    os.path.join(WORKSPACE_ROOT, '.next'),
    os.path.join(APPS_WEB, '.turbo'),
    os.path.join(WORKSPACE_ROOT, '.turbo')
]:
    if os.path.lexists(c):
        if os.path.islink(c) or os.path.isfile(c):
            os.remove(c)
        else:
            shutil.rmtree(c)
        print(f"   🧹 Purged: {os.path.relpath(c, WORKSPACE_ROOT)}")

print("\n5. Validating static types and production build ('npm run build')...")
env_vars = os.environ.copy()
env_vars["NEXT_CPU_COUNT"] = "2"
build_res = subprocess.run(["npm", "run", "build"], env=env_vars, cwd=WORKSPACE_ROOT)

if build_res.returncode != 0:
    print(f"\n❌ Local build failed with exit code {build_res.returncode}.")
    print("Fix compilation errors before attempting to push.")
    sys.exit(1)
print("\n✅ Production build PASSED with EXIT CODE 0!")

# ----------------------------------------------------------------------
# 5. Stage Clean Workspace and Commit
# ----------------------------------------------------------------------
print("\n6. Staging restored codebase changes...")
run_cmd("git add -A")
run_cmd("git reset HEAD .env .env.local apps/web/.env apps/web/.env.local 2>/dev/null")

staged_code, staged_diff, _ = run_cmd("git diff --cached --name-only")
if staged_diff:
    print("   • Committing synchronized codebase...")
    run_cmd('git commit -m "chore(restore): reconcile restored working condition and build-ready files"')
    print("   ✓ Commit created.")
else:
    print("   ℹ️ Working tree clean or already committed.")

# ----------------------------------------------------------------------
# 6. Push to GitHub Reconcile Branch
# ----------------------------------------------------------------------
print(f"\n7. Pushing branch '{sync_branch}' to origin...")
push_code, push_out, push_err = run_cmd(f"git push -u origin {sync_branch}")

if push_code == 0:
    print(f"\n🎉 PUSH SUCCEEDED to branch '{sync_branch}'!")
    clean_url = remote_url.replace(".git", "").replace("git@github.com:", "https://github.com/")
    pr_url = f"{clean_url}/compare/main...{sync_branch}?expand=1"
    print(f"\n🔗 Open this link in your browser to merge into 'main' via Pull Request:")
    print(f"   {pr_url}\n")
else:
    print(f"\n❌ Direct push failed:\n{push_err}")
    if "repository rule violations" in push_err:
        print("\n🔒 Branch protection ruleset blocked push to this ref.")
        print("To push directly to main as repository owner:")
        print("1. Go to: https://github.com/cygnusorbit/zecratary/settings/rules")
        print("2. Add your account to the Ruleset Bypass List for 'main'.")
    elif "secret" in push_err.lower():
        print("\n🔒 Push Protection detected secrets in commits. Verify commit history.")

print("==================================================================")
