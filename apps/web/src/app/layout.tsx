import GlobalThemeSync from '@/components/GlobalThemeSync';
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[var(--color-bg)] text-slate-100 font-sans antialiased overflow-x-hidden">
        <GlobalThemeSync />
        <LanguageProvider>
          <ThemeInitializer />
          <Sidebar />
          <main
          id="zecratary-main-content"
          className="min-h-screen transition-all duration-200 ease-in-out relative z-10 box-border"
          style={{
            marginLeft: "var(--sidebar-width, 16rem)",
            width: "calc(100% - var(--sidebar-width, 16rem))",
            paddingTop: "calc(var(--topbar-height, 4rem) + 1.25rem)",
            minHeight: "100vh",
            boxSizing: "border-box"
          }}
        >
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
