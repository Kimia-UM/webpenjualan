'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/sidebar';
import { Menu, Database } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import Image from 'next/image';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapsed state across reloads
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const handleCollapsedChange = (v: boolean) => {
    setCollapsed(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [user, loading, pathname, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-800 border-t-purple-500" />
          <p className="text-sm font-medium text-neutral-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated flash prevention
  if (!user && pathname !== '/login') {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  // Authenticated on login page flash prevention
  if (user && pathname === '/login') {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  // Login page — no sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Main app layout with sidebar
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapsedChange={handleCollapsedChange}
      />

      {/* Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Topbar */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-900 bg-white dark:bg-[#0a0a0a] shrink-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center h-11">
            <Image
              src="/images/logohorizontal.png"
              alt="j0eeys premiums logo"
              width={160}
              height={40}
              priority
              className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.45)] dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] transition-all duration-300"
            />
          </Link>

          <ThemeToggle />
        </header>

        {/* Desktop/Tablet Top Header */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-neutral-200 dark:border-neutral-900 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md shrink-0 z-30 transition-colors">
          <div>
            {/* Left side empty or reserved */}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center h-12">
              <Image
                src="/images/logohorizontal.png"
                alt="j0eeys premiums logo"
                width={180}
                height={44}
                priority
                className="h-11 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.45)] dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] transition-all duration-300"
              />
            </Link>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
