import AuthGuard from '@/components/AuthGuard';
import { LanguageProvider } from '@/components/LanguageProvider';
import './globals.css';
import { ThemeInitializer } from '@/lib/theme';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Zecratary - Autonomous Culinary Planning',
  description: 'AI-driven recipe management, meal planning, and grocery tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col md:flex-row bg-[var(--color-bg)] text-slate-100 font-sans antialiased">
        <LanguageProvider>
          <ThemeInitializer />
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <AuthGuard>{children}</AuthGuard>
        </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
