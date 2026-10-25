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
      <head>
        <script
          id="zecratary-theme-prehydrate"
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var doc = document.documentElement;
                doc.classList.add('theme-preloading');
                var mode = localStorage.getItem('zecratary_theme_mode');
                var isDay = mode === 'light' || mode === 'day';
                if (isDay) {
                  doc.classList.remove('dark');
                  doc.classList.add('light');
                } else {
                  doc.classList.remove('light');
                  doc.classList.add('dark');
                }
                var stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
                var c = stored ? JSON.parse(stored) : null;
                if (c) {
                  var p = c.primary || c.primaryColor || (isDay ? '#10b981' : '#10b981');
                  var ph = c.primaryHover || '#059669';
                  var ac = c.accentEmerald || c.accentColor || c.accent || '#10b981';
                  var bg = c.backgroundColor || c.backgroundDark || '#070b13';
                  var card = c.cardBackground || c.cardDark || '#0f172a';
                  var border = c.cardBorder || c.borderColor || '#1e293b';
                  var textSec = c.textSecondary || '#94a3b8';
                  var txt = c.textColor || '#ffffff';

                  doc.style.setProperty('--color-primary', p);
                  doc.style.setProperty('--color-primary-hover', ph);
                  doc.style.setProperty('--color-accent', ac);
                  doc.style.setProperty('--color-emerald', ac);

                  if (isDay) {
                    doc.style.setProperty('--color-bg', '#f8fafc');
                    doc.style.setProperty('--color-card', '#ffffff');
                    doc.style.setProperty('--color-inner-dark', '#f1f5f9');
                    doc.style.setProperty('--color-border', '#e2e8f0');
                    doc.style.setProperty('--color-text', '#0f172a');
                    doc.style.setProperty('--color-text-secondary', '#64748b');
                  } else {
                    doc.style.setProperty('--color-bg', bg);
                    doc.style.setProperty('--color-card', card);
                    doc.style.setProperty('--color-inner-dark', '#111726');
                    doc.style.setProperty('--color-border', border);
                    doc.style.setProperty('--color-text', txt);
                    doc.style.setProperty('--color-text-secondary', textSec);
                  }
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
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
