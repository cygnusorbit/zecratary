'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg,#0a0e17)] text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}
