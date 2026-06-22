'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AppsPremium } from '@/types';
import {
  AppWindow, TrendingUp, DollarSign, Package,
  CheckCircle2, Clock, XCircle, AlertTriangle,
  ArrowUpRight, Loader2, Settings,
} from 'lucide-react';

type Status = 'aktif' | 'akan_habis' | 'habis';

const getStatus = (expiry: string): Status => {
  if (!expiry) return 'habis';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'habis';
  if (diff <= 3) return 'akan_habis';
  return 'aktif';
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => {
  if (!d) return '-';
  try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)); }
  catch { return d; }
};

export default function AppsPremiumDashboardPage() {
  const [items, setItems] = useState<AppsPremium[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, 'apps_premium'), snap => {
      const d = snap.val();
      setItems(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const aktif = items.filter(x => getStatus(x.expiry_date) === 'aktif');
  const akanHabis = items.filter(x => getStatus(x.expiry_date) === 'akan_habis');
  const habis = items.filter(x => getStatus(x.expiry_date) === 'habis');
  const totalRevenue = items.reduce((s, x) => s + (x.selling_price || 0), 0);
  const totalProfit = items.reduce((s, x) => s + (x.profit || 0), 0);

  // Recent 5 items sorted by created_at desc
  const recent = [...items].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm text-muted-foreground">Memuat dashboard Apps Premium...</p>
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
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              <AppWindow className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                Dashboard Apps Premium
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Ringkasan statistik dan kondisi akun apps premium.</p>
            </div>
          </div>
          <Link href="/apps-premium" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-semibold transition-colors self-start sm:self-auto">
            <Settings className="h-4 w-4" />
            Manajemen Apps
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-2">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Item</span>
            </div>
            <p className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100">{items.length}</p>
          </div>
          <div className="rounded-xl border border-orange-200/60 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/10 p-4">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Pendapatan</span>
            </div>
            <p className="text-lg font-extrabold text-orange-700 dark:text-orange-400">{formatRupiah(totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Keuntungan</span>
            </div>
            <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{formatRupiah(totalProfit)}</p>
          </div>
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Akan Habis</span>
            </div>
            <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-400">{akanHabis.length}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Status Breakdown */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950/20 p-6">
            <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4">Status Akun</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Aktif</span>
                </div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{aktif.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Akan Habis (≤3 hari)</span>
                </div>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{akanHabis.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Habis</span>
                </div>
                <span className="text-lg font-bold text-neutral-500 dark:text-neutral-400">{habis.length}</span>
              </div>
            </div>
          </div>

          {/* Expiry Alerts */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950/20 p-6">
            <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Segera Habis
            </h2>
            {akanHabis.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-xs text-neutral-400">Semua akun masih aman</p>
              </div>
            ) : (
              <div className="space-y-2">
                {akanHabis.map(item => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const exp = new Date(item.expiry_date); exp.setHours(0, 0, 0, 0);
                  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{item.app_name}</p>
                        <p className="text-[10px] text-neutral-400">{item.account}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                        {diff === 0 ? 'Hari ini' : `${diff}h`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Transaksi Terbaru</h2>
              <Link href="/apps-premium/laporan" className="text-[10px] font-semibold text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
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
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{item.app_name}</p>
                      <p className="text-[10px] text-neutral-400">{item.variation} · {formatDate(item.order_date)}</p>
                    </div>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0 ml-2">{formatRupiah(item.selling_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/apps-premium" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors shadow-md shadow-orange-900/10">
            <Settings className="h-4 w-4" />
            Kelola / Tambah Item
          </Link>
          <Link href="/apps-premium/laporan" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-sm font-semibold transition-colors">
            <ArrowUpRight className="h-4 w-4" />
            Lihat Laporan
          </Link>
        </div>

      </div>
    </div>
  );
}
