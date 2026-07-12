'use client';

import React from 'react';
import Link from 'next/link';
import { Users, AppWindow, ShieldCheck, ChevronRight, FileText } from 'lucide-react';

const laporanCards = [
  {
    title: 'Laporan PremiumShare',
    description: 'Kelola laporan transaksi, stok, dan performa untuk layanan PremiumShare.',
    href: '/laporan/premium-share',
    icon: Users,
    colorIcon: 'text-purple-500',
    bgIcon: 'bg-purple-100 dark:bg-purple-900/30',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700',
  },
  {
    title: 'Laporan Apps Premium',
    description: 'Kelola laporan penjualan dan ketersediaan aplikasi premium.',
    href: '/laporan/apps-premium',
    icon: AppWindow,
    colorIcon: 'text-orange-500',
    bgIcon: 'bg-orange-100 dark:bg-orange-900/30',
    hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700',
  },
  {
    title: 'Laporan Privat Premium',
    description: 'Kelola laporan manajemen layanan privat premium dan pelanggan.',
    href: '/laporan/privat-premium',
    icon: ShieldCheck,
    colorIcon: 'text-teal-500',
    bgIcon: 'bg-teal-100 dark:bg-teal-900/30',
    hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
  },
];

export default function LaporanPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Pusat Laporan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Pilih kategori laporan yang ingin Anda lihat dari berbagai layanan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {laporanCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-2xl dark:focus:ring-offset-neutral-950">
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
