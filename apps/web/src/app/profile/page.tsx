'use client';
import { useState } from 'react';
import { User, Globe, Shield, Trash2, CheckCircle2 } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [email] = useState('ed1226@gmail.com');
  const [country, setCountry] = useState('Singapore');
  const [saved, setSaved] = useState(false);

  const handleCountryChange = (c: string) => {
    setCountry(c);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-slate-100">
      {/* Profile Settings */}
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-[#E05638]">Profile Settings</h1>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-[#E05638] uppercase">Email</label>
            <div className="text-sm font-semibold text-slate-200 mt-1">{email}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#E05638] uppercase">Country</label>
            <p className="text-xs text-slate-400">This determines whether recipes use metric or imperial measurements</p>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white mt-1 outline-none focus:border-[#E05638]"
            >
              <option value="Singapore">Singapore (Metric)</option>
              <option value="United States">United States (Imperial)</option>
              <option value="United Kingdom">United Kingdom (Metric)</option>
              <option value="Australia">Australia (Metric)</option>
            </select>
          </div>
          {saved && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Measurement units updated</span>}
        </div>
      </div>

      {/* Subscription Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#E05638]">Subscription Management</h2>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Your Subscription</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Plan:</span>
              <span className="font-bold text-white">Taster</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status:</span>
              <span className="bg-emerald-950 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-800">active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Renews on:</span>
              <span className="font-bold text-white">September 22, 2026</span>
            </div>
          </div>
          <button
            onClick={() => alert("Redirecting to Stripe Customer Portal...")}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition mt-2"
          >
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#E05638]">Account Management</h2>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-emerald-400 text-sm">Delete account</h4>
            <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and all associated data. This can't be undone.</p>
          </div>
          <button
            onClick={() => confirm("Are you sure you want to delete your account?") && alert("Account deletion processed.")}
            className="bg-[#2D1515] border border-red-900/50 hover:bg-red-900/50 text-red-400 font-bold text-xs px-4 py-2 rounded-xl transition"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
