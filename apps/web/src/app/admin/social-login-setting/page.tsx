\'use client\';
import { useState, useEffect } from \'react\';
import { Save, CheckCircle2 } from \'lucide-react\';

export default function SocialLoginSettingPage() {
  const [config, setConfig] = useState({
    googleEnabled: true, googleClientId: \'\', googleClientSecret: \'\',
    facebookEnabled: true, facebookClientId: \'\', facebookClientSecret: \'\',
    appleEnabled: true, appleClientId: \'\', appleTeamId: \'\', appleKeyId: \'\',
    redirectUri: \'http://localhost:3000/api/auth/callback\'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedCfg = localStorage.getItem(\'zecratary_social_login_config\');
    if (savedCfg) {
      try { setConfig(JSON.parse(savedCfg)); } catch (e) {}
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(\'zecratary_social_login_config\', JSON.stringify(config));
    window.dispatchEvent(new Event(\'zecratary_social_login_updated\'));
    window.dispatchEvent(new Event(\'storage\'));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b pb-4 border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white">Social Login Settings</h1>
          <p className="text-xs text-slate-400">Configure identity providers for authentication and registration.</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold">
            <CheckCircle2 className="h-4 w-4" /> Settings Saved & Broadcasted
          </div>
        )}
      </div>
      <form onSubmit={handleSave} className="space-y-6 text-xs">
        <div className="p-6 border border-slate-800 rounded-3xl bg-[#0b0f17] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-white">Google Provider</h3>
            <input type="checkbox" checked={config.googleEnabled} onChange={(e) => setConfig({...config, googleEnabled: e.target.checked})} className="w-5 h-5 accent-orange-500 cursor-pointer" />
          </div>
          {config.googleEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <input type="text" value={config.googleClientId} onChange={(e) => setConfig({...config, googleClientId: e.target.value})} placeholder="Google Client ID" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
              <input type="password" value={config.googleClientSecret} onChange={(e) => setConfig({...config, googleClientSecret: e.target.value})} placeholder="Google Client Secret" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
            </div>
          )}
        </div>

        <div className="p-6 border border-slate-800 rounded-3xl bg-[#0b0f17] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-white">Facebook Provider</h3>
            <input type="checkbox" checked={config.facebookEnabled} onChange={(e) => setConfig({...config, facebookEnabled: e.target.checked})} className="w-5 h-5 accent-orange-500 cursor-pointer" />
          </div>
          {config.facebookEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <input type="text" value={config.facebookClientId} onChange={(e) => setConfig({...config, facebookClientId: e.target.value})} placeholder="Facebook App ID" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
              <input type="password" value={config.facebookClientSecret} onChange={(e) => setConfig({...config, facebookClientSecret: e.target.value})} placeholder="Facebook App Secret" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
            </div>
          )}
        </div>

        <div className="p-6 border border-slate-800 rounded-3xl bg-[#0b0f17] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-white">Apple Sign In</h3>
            <input type="checkbox" checked={config.appleEnabled} onChange={(e) => setConfig({...config, appleEnabled: e.target.checked})} className="w-5 h-5 accent-orange-500 cursor-pointer" />
          </div>
          {config.appleEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <input type="text" value={config.appleClientId} onChange={(e) => setConfig({...config, appleClientId: e.target.value})} placeholder="Service ID" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
              <input type="text" value={config.appleTeamId} onChange={(e) => setConfig({...config, appleTeamId: e.target.value})} placeholder="Team ID" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
              <input type="text" value={config.appleKeyId} onChange={(e) => setConfig({...config, appleKeyId: e.target.value})} placeholder="Key ID" className="w-full border border-slate-800 rounded-xl px-3.5 py-2 bg-[#070b13] text-white" />
            </div>
          )}
        </div>

        <button type="submit" className="w-full py-3 bg-[#E05638] text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer">
          <Save className="h-4 w-4" /> Save Configuration & Sync Registration
        </button>
      </form>
    </div>
  );
}
