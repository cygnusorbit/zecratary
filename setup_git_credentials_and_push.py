import subprocess
import getpass
import sys
import os
import re

print("🚀 Configuring Persistent Git Authentication & Safe Snapshot Push...\n")

def run(cmd, capture=True):
    res = subprocess.run(cmd, shell=True, text=True, capture_output=capture)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

# 1. Check or initialize Git repository
code, _, _ = run("git rev-parse --is-inside-work-tree")
if code != 0:
    print("• Initializing new Git repository...")
    run("git init")
    run("git branch -m main")
else:
    print("✓ Git repository verified.")

# 2. Configure Git Credential Helper to store credentials permanently
print("\n🔑 Configuring Git Credential Helper...")
run("git config --global credential.helper store")
print("✓ Enabled 'git config --global credential.helper store' (saved in ~/.git-credentials)")

# 3. Resolve Target Repository URL
default_repo = "https://github.com/cygnusorbit/zecratary.git"
repo_url = os.environ.get("REPO_URL", "").strip() or default_repo

# Check existing credentials or prompt for PAT
print(f"• Target Repository: {repo_url}")
env_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PAT") or os.environ.get("GH_TOKEN")

token = ""
if env_token:
    token = env_token.strip()
    print("✓ Using GitHub Personal Access Token from environment.")
else:
    # Test if Git can already access the remote without prompt
    test_code, _, _ = run(f"git ls-remote {repo_url} -h refs/heads/main")
    if test_code == 0:
        print("✓ Git credentials already cached and authenticated for this repository.")
    else:
        print("\nNotice: GitHub requires a Personal Access Token (PAT) with 'repo' scope.")
        print("Generate one here: https://github.com/settings/tokens")
        try:
            token = getpass.getpass("Enter your GitHub Personal Access Token (starts with ghp_ or github_pat_): ").strip()
        except (EOFError, KeyboardInterrupt):
            token = ""

# 4. Configure Remote URL with Authentication
if token:
    # Embed token for seamless non-interactive execution
    if "@github.com" not in repo_url:
        authed_url = repo_url.replace("https://", f"https://{token}@")
    else:
        # Replace existing auth in URL if present
        authed_url = re.sub(r'https://[^@]+@', f'https://{token}@', repo_url)
else:
    authed_url = repo_url

# Safely add or update remote 'origin'
code, remotes, _ = run("git remote")
if "origin" in remotes.split():
    run(f"git remote set-url origin {authed_url}")
    print(f"✓ Remote 'origin' updated.")
else:
    run(f"git remote add origin {authed_url}")
    print(f"✓ Remote 'origin' configured.")

# 5. Guard against secret leakage before staging
print("\n🔍 Auditing for sensitive environment files before staging...")
gitignore_path = ".gitignore"
protected_entries = [".env", ".env.local", ".env*.local", "*.env"]
existing_ignores = []
if os.path.exists(gitignore_path):
    with open(gitignore_path, "r", encoding="utf-8") as f:
        existing_ignores = f.read().splitlines()

needs_update = False
for entry in protected_entries:
    if entry not in existing_ignores:
        existing_ignores.append(entry)
        needs_update = True

if needs_update:
    with open(gitignore_path, "w", encoding="utf-8") as f:
        f.write("\n".join(existing_ignores) + "\n")
    print("✓ Updated .gitignore to exclude .env and credentials.")

# Untrack cached environment files
run("git rm --cached .env .env.local apps/web/.env apps/web/.env.local 2>/dev/null")

# 6. Stage and commit snapshot
print("\n📦 Staging codebase snapshot...")
run("git add .")
commit_code, commit_out, _ = run('git commit -m "Clean codebase snapshot"')
if commit_code == 0:
    print("✓ Commit created: 'Clean codebase snapshot'")
else:
    print("• Index clean or no modified files to commit.")

# 7. Execute Push
print("\n📤 Pushing to GitHub (main)...")
push_code, push_out, push_err = run("git push -u origin main --force")

if push_code == 0:
    print("\n✅ Successfully pushed snapshot to origin/main without credential prompt!")
else:
    print(f"\n⚠️ Push encountered an issue:\n{push_err}")
    if "repository rule violations" in push_err:
        print("\n🔒 GitHub Ruleset / Branch Protection blocked direct force-pushing to 'main'.")
        print("To push compliant with repository rules, push to a snapshot branch and open a PR:")
        run("git checkout -B snapshot/clean-codebase")
        p_code, _, p_err = run("git push -u origin snapshot/clean-codebase --force")
        if p_code == 0:
            clean_url = repo_url.replace(".git", "").replace("git@github.com:", "https://github.com/")
            print(f"✅ Pushed to branch 'snapshot/clean-codebase'. Open PR here:")
            print(f"   {clean_url}/compare/main...snapshot/clean-codebase?expand=1\n")
    elif "secret" in push_err.lower():
        print("\n🔒 Secret Push Protection tripped. Check files for committed API keys.")

