import os

layout_code = """'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChefHat, BookOpen, UploadCloud, Calendar, ShoppingCart, 
  Settings, PlusCircle, Package, ShieldCheck, Book, Users, 
  LayoutTemplate, User, Box 
} from 'lucide-react';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Chef Chat', href: '/chef', icon: ChefHat },
    { label: 'Saved Recipes', href: '/recipes', icon: BookOpen },
    { label: 'Books', href: '/books', icon: Book },
    { label: 'Contacts', href: '/contacts', icon: Users },
    { label: 'Templates', href: '/templates', icon: LayoutTemplate },
    { label: 'Import Recipe', href: '/import', icon: UploadCloud },
    { label: 'Create Manual', href: '/manual', icon: PlusCircle },
    { label: 'Meal Planner', href: '/planner', icon: Calendar },
    { label: 'Pantry', href: '/pantry', icon: Package },
    { label: 'Shopping List', href: '/shopping', icon: ShoppingCart },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Package', href: '/package', icon: Box },
    { label: 'Admin Setting', href: '/admin', icon: ShieldCheck },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <html lang="en">
      <body className="bg-[#0B101D] text-slate-100 antialiased">
        <div className="flex min-h-screen bg-[#0B101D] text-slate-100">
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-[#111726] border-r border-slate-800 flex flex-col justify-between p-6 shrink-0">
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-2xl bg-[#E05638]/20 flex items-center justify-center text-[#E05638]">
                  <ChefHat className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-white">Zecratary</span>
              </div>

              <nav className="space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl font-bold text-xs transition ${
                        active
                          ? 'bg-[#E05638] text-white shadow-lg shadow-[#E05638]/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 text-center font-medium">
              Zecratary AI Chef v1.0
            </div>
          </aside>

          {/* Main Content View */}
          <main className="flex-1 p-8 overflow-y-auto max-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
"""

os.makedirs("apps/web/src/app", exist_ok=True)
with open("apps/web/src/app/layout.tsx", "w", encoding="utf-8") as f:
    f.write(layout_code)

print("✅ Sidebar menu successfully updated with Books, Contacts, Templates, Profile, and Package!")
