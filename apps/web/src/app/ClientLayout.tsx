import { LanguageProvider } from '@/components/LanguageProvider';
'use client';
import Sidebar from '@/components/Sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-[#0B101D] text-slate-100 font-sans antialiased">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full min-w-0">
        {children}
      </main>
    </div>
    </LanguageProvider>
  );
}
