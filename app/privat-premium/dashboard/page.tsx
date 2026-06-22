'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { PrivatPremium } from '@/types';
import {
  ShieldCheck, TrendingUp, DollarSign, Package,
  ArrowUpRight, Loader2, Settings, Users, FileText,
} from 'lucide-react';

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => {
  if (!d) return '-';
  try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)); }
  catch { return d; }
};

export default function PrivatPremiumDashboardPage() {
  const [items, setItems] = useState<PrivatPremium[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, 'privat_premium'), snap => {
      const d = snap.val();
      setItems(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalRevenue = items.reduce((s, x) => s + (x.selling_price || 0), 0);
  const totalProfit = items.reduce((s, x) => s + (x.profit || 0), 0);
  const totalCapital = items.reduce((s, x) => s + (x.capital_price || 0), 0);

  // Grouped by month
  const byMonth: Record<string, { count: number; revenue: number; profit: number }> = {};
  items.forEach(x => {
    const key = x.order_date?.slice(0, 7) || 'unknown';
    if (!byMonth[key]) byMonth[key] = { count: 0, revenue: 0, profit: 0 };
    byMonth[key].count++;
    byMonth[key].revenue += x.selling_price || 0;
    byMonth[key].profit += x.profit || 0;
  });
  const monthlyData = Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);

  // Recent 5
  const recent = [...items].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm text-muted-foreground">Memuat dashboard Privat Premium...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10">
              <ShieldCheck className="h-6 w-6 text-teal-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                Dashboard Privat Premium
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Ringkasan statistik dan tren transaksi privat premium.</p>
            </div>
          </div>
          <Link href="/privat-premium" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-sm font-semibold transition-colors self-start sm:self-auto">
            <Settings className="h-4 w-4" />
            Manajemen Privat
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-2">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Transaksi</span>
            </div>
            <p className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100">{items.length}</p>
          </div>
          <div className="rounded-xl border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/10 p-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Pendapatan</span>
            </div>
            <p className="text-lg font-extrabold text-teal-700 dark:text-teal-400">{formatRupiah(totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Keuntungan</span>
            </div>
            <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{formatRupiah(totalProfit)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/40 bg-neutral-100/60 dark:bg-neutral-900/20 p-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-2">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Modal</span>
            </div>
            <p className="text-lg font-extrabold text-neutral-600 dark:text-neutral-300">{formatRupiah(totalCapital)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Monthly Trend */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Tren Per Bulan (5 Terakhir)</h2>
              <Link href="/privat-premium/laporan" className="text-[10px] font-semibold text-teal-500 hover:text-teal-400 flex items-center gap-0.5">
                Lihat Semua <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {monthlyData.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-8">Belum ada data.</p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map(([month, data]) => (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 w-16 shrink-0">{month}</span>
                    <div className="flex-1 h-7 bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-hidden relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-teal-500/20 dark:bg-teal-500/30 rounded-lg"
                        style={{ width: `${Math.min(100, (data.revenue / totalRevenue) * 100)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-2 justify-between">
                        <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">{data.count} transaksi</span>
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">{formatRupiah(data.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Transaksi Terbaru</h2>
              <Link href="/privat-premium/laporan" className="text-[10px] font-semibold text-teal-500 hover:text-teal-400 flex items-center gap-0.5">
                Lihat Laporan <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-8">Belum ada data.</p>
            ) : (
              <div className="space-y-2">
                {recent.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{item.customer_name}</p>
                      <p className="text-[10px] text-neutral-400">{formatDate(item.order_date)}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400">{formatRupiah(item.selling_price)}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{formatRupiah(item.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/privat-premium" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold transition-colors shadow-md shadow-teal-900/10">
            <Settings className="h-4 w-4" />
            Kelola / Tambah Transaksi
          </Link>
          <Link href="/privat-premium/laporan" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-200 dark:border-teal-900/40 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-sm font-semibold transition-colors">
            <FileText className="h-4 w-4" />
            Lihat Laporan
          </Link>
        </div>

      </div>
    </div>
  );
}
