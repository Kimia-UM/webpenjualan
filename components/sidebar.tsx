'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  Users,
  AppWindow,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  FileText,
  Box,
  BarChart3,
} from 'lucide-react';

// ─── Navigation Structure ─────────────────────────────────────────────────────

// Top-level: Dashboard Utama (single link)
const dashboardItem = {
  name: 'Dashboard Utama',
  href: '/',
  icon: LayoutDashboard,
  colorIcon: 'text-indigo-500',
  activeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
  activeBorder: 'border-indigo-200 dark:border-indigo-900/60',
  activeText: 'text-indigo-700 dark:text-indigo-400',
};

// PremiumShare group with sub-items
const premiumShareGroup = {
  name: 'PremiumShare',
  icon: Users,
  colorIcon: 'text-purple-500',
  activeText: 'text-purple-700 dark:text-purple-400',
  // A route is "active" if any sub-item is active
  matchPaths: ['/', '/stok', '/customers', '/laporan'],
  children: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Stok Akun', href: '/stok', icon: Database },
    { name: 'Manajemen Customer', href: '/customers', icon: Users },
    { name: 'Laporan', href: '/laporan', icon: FileText },
  ],
};

// Product groups (Apps Premium + Privat Premium) with sub-items
const productGroups = [
  {
    name: 'Apps Premium',
    icon: AppWindow,
    colorIcon: 'text-orange-500',
    matchPaths: ['/apps-premium', '/apps-premium/dashboard', '/apps-premium/laporan'],
    children: [
      { name: 'Dashboard', href: '/apps-premium/dashboard', icon: LayoutDashboard },
      { name: 'Manajemen Apps', href: '/apps-premium', icon: AppWindow },
      { name: 'Laporan', href: '/apps-premium/laporan', icon: FileText },
    ],
    activeBg: 'bg-orange-50 dark:bg-orange-950/40',
    activeBorder: 'border-orange-200 dark:border-orange-900/60',
    activeText: 'text-orange-700 dark:text-orange-400',
    childActive: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/60 text-orange-700 dark:text-orange-400',
  },
  {
    name: 'Privat Premium',
    icon: ShieldCheck,
    colorIcon: 'text-teal-500',
    matchPaths: ['/privat-premium', '/privat-premium/dashboard', '/privat-premium/laporan'],
    children: [
      { name: 'Dashboard', href: '/privat-premium/dashboard', icon: LayoutDashboard },
      { name: 'Manajemen Privat', href: '/privat-premium', icon: ShieldCheck },
      { name: 'Laporan', href: '/privat-premium/laporan', icon: FileText },
    ],
    activeBg: 'bg-teal-50 dark:bg-teal-950/40',
    activeBorder: 'border-teal-200 dark:border-teal-900/60',
    activeText: 'text-teal-700 dark:text-teal-400',
    childActive: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/60 text-teal-700 dark:text-teal-400',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  // PremiumShare group: auto-open if current path is one of its children
  const isPremiumShareActive = premiumShareGroup.matchPaths.includes(pathname);
  const [psOpen, setPsOpen] = useState(isPremiumShareActive);

  // Product groups open state
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => ({
    'Apps Premium': productGroups[0].matchPaths.some(p => pathname === p || pathname.startsWith(p + '/')),
    'Privat Premium': productGroups[1].matchPaths.some(p => pathname === p || pathname.startsWith(p + '/')),
  }));

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // ── Shared nav link styles ──────────────────────────────────────────────────
  const linkBase = (isActive: boolean, isChild = false, forceCollapsed = false) =>
    [
      'flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150 border',
      forceCollapsed || collapsed ? 'justify-center px-2 py-2.5' : isChild ? 'pl-8 pr-3 py-2' : 'px-3 py-2.5',
      isActive
        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-400'
        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-transparent',
    ].join(' ');

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">

      {/* ── Logo + Collapse Toggle ── */}
      <div className={`flex items-center h-14 px-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? (
          <Link href="/dashboard" onClick={onLinkClick} className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-sm">
              <Database className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm truncate bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
              j0eeys premiums
            </span>
          </Link>
        ) : (
          <Link href="/dashboard" onClick={onLinkClick}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600">
              <Database className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}

        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden md:flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={collapsed ? 'Perluas sidebar' : 'Persempit sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">

        {/* ① Dashboard Utama ───────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          onClick={onLinkClick}
          title={collapsed ? 'Dashboard Utama' : undefined}
          className={[
            'flex items-center gap-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border mb-1',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
            pathname === '/dashboard'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-transparent',
          ].join(' ')}
        >
          <BarChart3 className={`h-4 w-4 shrink-0 ${pathname === '/dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500'}`} />
          {!collapsed && <span>Dashboard Utama</span>}
        </Link>

        {/* Separator */}
        <div className="py-1">
          <div className="border-t border-neutral-100 dark:border-neutral-800/60" />
        </div>
        <div>
          {/* Group header button */}
          <button
            onClick={() => !collapsed && setPsOpen(!psOpen)}
            title={collapsed ? 'PremiumShare' : undefined}
            className={[
              'w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-150 border',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5 justify-between',
              isPremiumShareActive
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-400'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-transparent',
            ].join(' ')}
          >
            <div className="flex items-center gap-2.5">
              <Users className={`h-4 w-4 shrink-0 ${isPremiumShareActive ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500'}`} />
              {!collapsed && <span>PremiumShare</span>}
            </div>
            {!collapsed && (
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${psOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {/* Sub-items */}
          {(psOpen || collapsed) && (
            <div className={`mt-0.5 ${collapsed ? 'space-y-0.5' : 'space-y-0.5'}`}>
              {premiumShareGroup.children.map((child) => {
                const ChildIcon = child.icon;
                const isActive = child.href === '/' ? pathname === '/' : pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onLinkClick}
                    title={collapsed ? child.name : undefined}
                    className={linkBase(isActive, true, collapsed)}
                  >
                    <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                    {!collapsed && <span className="truncate">{child.name}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ③ Separator ─────────────────────────────────────────────────── */}
        <div className="py-1">
          <div className="border-t border-neutral-100 dark:border-neutral-800/60" />
        </div>

        {/* ④ Apps Premium + Privat Premium (collapsible groups) ──────── */}
        {productGroups.map((group, index) => {
          const GroupIcon = group.icon;
          const isGroupActive = group.matchPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
          const isOpen = groupOpen[group.name];
          return (
            <React.Fragment key={group.name}>
              {index > 0 && (
                <div className="py-1">
                  <div className="border-t border-neutral-100 dark:border-neutral-800/60" />
                </div>
              )}
              <div>
                <button
                  onClick={() => !collapsed && setGroupOpen(prev => ({ ...prev, [group.name]: !prev[group.name] }))}
                  title={collapsed ? group.name : undefined}
                  className={[
                    'w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-150 border',
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5 justify-between',
                    isGroupActive
                      ? `${group.activeBg} ${group.activeBorder} ${group.activeText}`
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-transparent',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2.5">
                    <GroupIcon className={`h-4 w-4 shrink-0 ${isGroupActive ? group.activeText : group.colorIcon}`} />
                    {!collapsed && <span>{group.name}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {(isOpen || collapsed) && (
                  <div className="mt-0.5 space-y-0.5">
                    {group.children.map(child => {
                      const ChildIcon = child.icon;
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onLinkClick}
                          title={collapsed ? child.name : undefined}
                          className={[
                            'flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150 border',
                            collapsed ? 'justify-center px-2 py-2.5' : 'pl-8 pr-3 py-2',
                            isActive
                              ? group.childActive
                              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-transparent',
                          ].join(' ')}
                        >
                          <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? group.activeText : 'text-neutral-400 dark:text-neutral-500'}`} />
                          {!collapsed && <span className="truncate">{child.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div className={`shrink-0 border-t border-neutral-200 dark:border-neutral-800 px-2 py-3 ${collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'}`}>
        {!collapsed && user && (
          <div className="px-1 pb-1">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-600 mb-0.5">Masuk sebagai</p>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">{user.email}</p>
          </div>
        )}

        <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center gap-2'}`}>
          <ThemeToggle />
          {user && (
            <button
              onClick={handleLogout}
              title="Keluar"
              className={`flex items-center gap-1.5 rounded-lg text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors ${collapsed ? 'h-8 w-8 justify-center' : 'px-2.5 py-1.5 flex-1 justify-start'}`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>Keluar</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'w-[72px]' : 'w-[240px]'
          }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="relative z-10 flex flex-col w-[240px] h-full bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-900 shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent onLinkClick={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
