'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, LayoutTemplate, Scissors, Music, Tv, ChevronRight, AppWindow } from 'lucide-react';

const appsCards = [
  {
    title: 'ChatGPT Plus',
    description: 'Manajemen akun, pelanggan, dan stok untuk layanan ChatGPT Plus.',
    href: '/apps-premium/chatgpt-plus',
    icon: MessageSquare,
    colorIcon: 'text-green-500',
    bgIcon: 'bg-green-100 dark:bg-green-900/30',
    hoverBorder: 'hover:border-green-300 dark:hover:border-green-700',
  },
  {
    title: 'Canva Premium',
    description: 'Manajemen akun, pelanggan, dan stok untuk layanan Canva Premium.',
    href: '/apps-premium/canva',
    icon: LayoutTemplate,
    colorIcon: 'text-blue-500',
    bgIcon: 'bg-blue-100 dark:bg-blue-900/30',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
  },
  {
    title: 'Capcut Pro',
    description: 'Manajemen akun, pelanggan, dan stok untuk layanan Capcut Pro.',
    href: '/apps-premium/capcut',
    icon: Scissors,
    colorIcon: 'text-neutral-900 dark:text-neutral-100',
    bgIcon: 'bg-neutral-200 dark:bg-neutral-800',
    hoverBorder: 'hover:border-neutral-400 dark:hover:border-neutral-600',
  },
  {
    title: 'Spotify Premium',
    description: 'Manajemen akun, pelanggan, dan stok untuk layanan Spotify Premium.',
    href: '/apps-premium/spotify',
    icon: Music,
    colorIcon: 'text-emerald-500',
    bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  {
    title: 'Hiburan Premium',
    description: 'Manajemen layanan Netflix, Youtube, Loklok, dan WeTV Premium.',
    href: '/apps-premium/hiburan',
    icon: Tv,
    colorIcon: 'text-red-500',
    bgIcon: 'bg-red-100 dark:bg-red-900/30',
    hoverBorder: 'hover:border-red-300 dark:hover:border-red-700',
  },
];

export default function AppsPremiumPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
          <AppWindow className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Katalog Apps Premium</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Pilih layanan aplikasi premium yang ingin Anda kelola.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 rounded-2xl dark:focus:ring-offset-neutral-950">
              <div className={`group flex flex-col h-full bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${card.hoverBorder}`}>
                <div className="flex items-start justify-between mb-5">
                  <div className={`p-3.5 rounded-xl ${card.bgIcon} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${card.colorIcon}`} />
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-900 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ChevronRight className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed flex-grow">
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
