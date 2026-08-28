'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ChefHat, ArrowRight, Shield, User as UserIcon } from 'lucide-react';
import { initAuthStorage, setCurrentUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    initAuthStorage();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawUsers = localStorage.getItem('zecratary_users');
    const users = rawUsers ? JSON.parse(rawUsers) : [];

    const matched = users.find(
      (u: any) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (matched) {
      const userSession = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        createdAt: matched.createdAt || new Date().toISOString()
      };
      setCurrentUser(userSession);

      if (matched.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/recipes');
      }
    } else {
      setError('Invalid email address or password.');
    }
  };

  const handleQuickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#0b0f17] border border-slate-800/90 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 text-[#E05638] flex items-center justify-center mx-auto shadow-md">
            <ChefHat className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-[#E05638] tracking-tight">Sign In to FoodiePrep</h1>
          <p className="text-xs font-semibold text-slate-400">Access recipes, meal plans, and account settings</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#E05638] hover:bg-[#c94529] text-white font-extrabold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            Sign In <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* DEMO LOGINS */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Quick Logins
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@zecratary.com', 'admin')}
              className="p-2 bg-[#070b13] hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition flex items-center gap-2 cursor-pointer"
            >
              <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-white leading-tight">Admin</div>
                <div className="text-[10px] text-slate-500">Full Access</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('user@zecratary.com', 'user123')}
              className="p-2 bg-[#070b13] hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition flex items-center gap-2 cursor-pointer"
            >
              <UserIcon className="h-4 w-4 text-[#E05638] shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-white leading-tight">User</div>
                <div className="text-[10px] text-slate-500">Standard Access</div>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link href="/register" className="font-bold text-[#E05638] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
