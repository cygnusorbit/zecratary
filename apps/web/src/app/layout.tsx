import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zecratary - AI Culinary Assistant & Meal Planner',
  description: 'Organize recipes, manage pantry inventory, and plan meals with AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f19] text-slate-100 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
