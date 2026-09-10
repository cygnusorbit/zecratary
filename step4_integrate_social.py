import os
import re

# 1. Locate active App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    print("❌ Error: Could not locate active App Router directory.")
    exit(1)

# 2. Create Server-Side API Endpoint for Global Config
api_dir = os.path.join(app_dir, 'api', 'social-config')
os.makedirs(api_dir, exist_ok=True)
api_path = os.path.join(api_dir, 'route.ts')

api_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Using a local JSON file to mock database persistence across browser sessions
const CONFIG_FILE = path.join(process.cwd(), 'social_config.json');

const DEFAULT_CONFIG = {
  googleEnabled: true,
  googleClientId: '',
  googleClientSecret: '',
  facebookEnabled: true,
  facebookClientId: '',
  facebookClientSecret: '',
  appleEnabled: true,
  appleClientId: '',
  appleTeamId: '',
  appleKeyId: '',
  redirectUri: 'http://localhost:3000/api/auth/callback',
};

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
  } catch (e) {
    console.error('Failed to read social config', e);
  }
  return NextResponse.json(DEFAULT_CONFIG);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
"""
with open(api_path, 'w', encoding='utf-8') as f:
    f.write(api_code)
print(f"✓ Created server API endpoint at {api_path}")

# 3. Upgrade Admin Settings Page to push to Server API
admin_path = os.path.join(app_dir, 'admin', 'social-settings', 'page.tsx')
if os.path.exists(admin_path):
    with open(admin_path, 'r', encoding='utf-8') as f:
        admin_code = f.read()

    old_save = """  const handleSave = () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      saveSocialLoginConfig(config);
      setStatusMsg({ text: 'Social configurations successfully saved and synchronized!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to save configuration.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };"""

    new_save = """  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await fetch('/api/social-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      saveSocialLoginConfig(config);
      setStatusMsg({ text: 'Social configurations successfully saved to server and synchronized!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to save configuration.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };"""

    old_load = """    setUser(active);
    setConfig(getSocialLoginConfig());
  }, [router]);"""

    new_load = """    setUser(active);
    fetch('/api/social-config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(() => setConfig(getSocialLoginConfig()));
  }, [router]);"""

    if old_save in admin_code and old_load in admin_code:
        admin_code = admin_code.replace(old_save, new_save).replace(old_load, new_load)
        with open(admin_path, 'w', encoding='utf-8') as f:
            f.write(admin_code)
        print(f"✓ Patched Admin Social Settings to use Server API: {admin_path}")
    else:
        print(f"⚠ Could not locate exact replacement blocks in {admin_path}. It may already be patched.")

# 4. Upgrade Registration Page to pull from Server API
register_path = os.path.join(app_dir, 'register', 'page.tsx')
if not os.path.exists(register_path):
    register_path = os.path.join(app_dir, '(auth)', 'register', 'page.tsx')

if os.path.exists(register_path):
    with open(register_path, 'r', encoding='utf-8') as f:
        reg_code = f.read()

    old_sync = """  const syncSocialConfig = useCallback(() => {
    setConfig(getSocialLoginConfig());
  }, []);"""

    new_sync = """  const syncSocialConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/social-config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        localStorage.setItem('zecratary_social_login_config', JSON.stringify(data));
        return;
      }
    } catch (e) {}
    setConfig(getSocialLoginConfig());
  }, []);"""

    if old_sync in reg_code:
        reg_code = reg_code.replace(old_sync, new_sync)
        with open(register_path, 'w', encoding='utf-8') as f:
            f.write(reg_code)
        print(f"✓ Patched Registration Page to use Server API: {register_path}")
    else:
        print(f"⚠ Could not locate exact replacement block in {register_path}. It may already be patched.")

print("\n🚀 Step 4 Integration Complete!")
