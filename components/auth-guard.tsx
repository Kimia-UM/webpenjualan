'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/navbar';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [user, loading, pathname, router]);

  // Show a beautiful loading animation while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-800 border-t-purple-500"></div>
          <p className="text-sm font-medium text-neutral-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // Prevent flash of protected content for unauthenticated users
  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-[#0a0a0a]" />
    );
  }

  // Prevent flash of login page for authenticated users
  if (user && pathname === '/login') {
    return (
      <div className="min-h-screen bg-[#0a0a0a]" />
    );
  }

  return (
    <>
      {pathname !== '/login' && <Navbar />}
      {children}
    </>
  );
}
