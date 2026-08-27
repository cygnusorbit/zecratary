'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, MessageSquare, UploadCloud, Edit3, 
  BookOpen, Book, Package, ShoppingCart, Calendar, 
  LayoutTemplate, Moon, User, Mail, LogOut, ShieldCheck
} from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0b0f19] border-r border-slate-800/80 flex flex-col justify-between p-5 shrink-0 select-none">
        <div className="space-y-6">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="text-[#E05638] text-xl">🥕</div>
            <span className="font-extrabold text-lg tracking-tight">
              <span className="text-[#E05638]">Foodie</span>
              <span className="text-emerald-500">Prep</span>
            </span>
          </div>

          {/* Main Dashboard Link */}
          <nav className="space-y-1">
            <Link
              href="/chef"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                pathname === '/chef' || pathname === '/'
                  ? 'bg-[#141b2d] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-slate-400" />
              Dashboard
            </Link>

            {/* CREATE SECTION */}
            <div className="pt-4 pb-1 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Create
            </div>
            {[
              { label: 'Chef Foodie AI', href: '/chef', icon: MessageSquare },
              { label: 'Import', href: '/import', icon: UploadCloud },
              { label: 'Manual', href: '/manual', icon: Edit3 },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    active
                      ? 'bg-[#141b2d] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
                  }`}
                >
                  <item.icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}

            {/* MANAGE SECTION */}
            <div className="pt-4 pb-1 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Manage
            </div>
            {[
              { label: 'Saved Recipes', href: '/recipes', icon: BookOpen },
              { label: 'Books', href: '/books', icon: Book },
              { label: 'Pantry', href: '/pantry', icon: Package },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    active
                      ? 'bg-[#141b2d] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
                  }`}
                >
                  <item.icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}

            {/* PLAN SECTION */}
            <div className="pt-4 pb-1 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Plan
            </div>
            {[
              { label: 'Shopping List', href: '/shopping', icon: ShoppingCart },
              { label: 'Planner', href: '/planner', icon: Calendar },
              { label: 'Templates', href: '/templates', icon: LayoutTemplate },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    active
                      ? 'bg-[#1c3a27] text-emerald-300 border border-emerald-500/30 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="space-y-1.5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between px-3.5 py-2 text-slate-400">
            <Moon className="h-4 w-4 text-[#E05638]" />
          </div>

          {[
            { label: 'Profile', href: '/profile', icon: User },
            { label: 'Contact Us', href: '/contacts', icon: Mail },
            { label: 'Admin Setting', href: '/admin', icon: ShieldCheck },
            { label: 'Logout', href: '#', icon: LogOut },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => {
                if (item.label === 'Logout') {
                  e.preventDefault();
                  alert('Logged out successfully.');
                }
              }}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-300 hover:text-white hover:bg-[#141b2d]/50 transition"
            >
              <item.icon className="h-4 w-4 text-slate-400" />
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT VIEW */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}
