'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { HostAccount, Subscription, SubscriptionStatus } from '@/types';
import { 
  TrendingUp, 
  Users, 
  Database, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  Loader2, 
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subsRef = ref(db, 'subscriptions');
    const hostRef = ref(db, 'host_accounts');

    setLoading(true);
    setError(null);

    const unsubscribeSubs = onValue(subsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as Subscription[];
        setSubscriptions(list);
      } else {
        setSubscriptions([]);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching subscriptions:', err);
      setError('Gagal mengambil data dari database.');
      setLoading(false);
    });

    const unsubscribeHosts = onValue(hostRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as HostAccount[];
        setHostAccounts(list);
      } else {
        setHostAccounts([]);
      }
    }, (err) => {
      console.error('Error fetching host accounts:', err);
      setError('Gagal mengambil data dari database.');
    });

    return () => {
      unsubscribeSubs();
      unsubscribeHosts();
    };
  }, []);

  // Helper: Get Subscription Status based on Expiry Date
  const getSubscriptionStatus = (expiryDateStr: string): SubscriptionStatus => {
    if (!expiryDateStr) return 'habis';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'habis';
    if (diffDays <= 3) return 'akan_habis';
    return 'aktif';
  };

  // Helper: Get remaining days count
  const getRemainingDays = (expiryDateStr: string): number => {
    if (!expiryDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper: Get Host Account remaining slots dynamically
  const getHostSisaSlot = (host: HostAccount) => {
    if (!host.id) return host.total_slot;
    const activeSubs = subscriptions.filter(sub => {
      if (sub.host_account_id !== host.id) return false;
      const status = getSubscriptionStatus(sub.expiry_date);
      return status !== 'habis';
    });
    return host.total_slot - activeSubs.length;
  };

  // Helper: Get Host Account Email from ID
  const getHostEmail = (id: string) => {
    const host = hostAccounts.find(h => h.id === id);
    return host ? host.account_email : 'Tidak ditemukan';
  };

  // Helper: Format Rupiah Currency
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculations for Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11

  // Today Revenue (sum price of subscriptions created today)
  const revenueToday = subscriptions
    .filter(sub => {
      const createdDate = new Date(sub.created_at).toISOString().split('T')[0];
      return createdDate === todayStr;
    })
    .reduce((sum, sub) => sum + (sub.price || 0), 0);

  // Month Revenue (sum price of subscriptions created this month)
  const revenueMonth = subscriptions
    .filter(sub => {
      const date = new Date(sub.created_at);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    })
    .reduce((sum, sub) => sum + (sub.price || 0), 0);

  // All-Time Revenue
  const revenueAllTime = subscriptions.reduce((sum, sub) => sum + (sub.price || 0), 0);

  // Active Customers Count (status is aktif or akan_habis)
  const activeCustomersCount = subscriptions.filter(sub => {
    const status = getSubscriptionStatus(sub.expiry_date);
    return status !== 'habis';
  }).length;

  // Customers expiring in <= 3 days (excluding already expired)
  const expiringCustomers = subscriptions
    .filter(sub => {
      const status = getSubscriptionStatus(sub.expiry_date);
      return status === 'akan_habis';
    })
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

  // Host accounts that are expiring soon (<= 7 days) OR almost full (sisa_slot <= 1)
  const alertHosts = hostAccounts
    .filter(host => {
      if (host.status !== 'aktif') return false;
      const sisa = getHostSisaSlot(host);
      
      // Calculate active_until remaining days
      let daysLeft = 999;
      if (host.active_until) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeUntil = new Date(host.active_until);
        activeUntil.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((activeUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      return sisa <= 1 || daysLeft <= 7;
    })
    .map(host => {
      const sisa = getHostSisaSlot(host);
      let daysLeft = 999;
      if (host.active_until) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeUntil = new Date(host.active_until);
        activeUntil.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((activeUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        ...host,
        sisaSlot: sisa,
        daysLeft
      };
    });

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
            Dashboard Utama
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ringkasan data pendapatan harian, bulanan, stok akun induk, dan pengingat masa aktif.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-950/10 p-5 text-sm text-red-400 mb-8">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 sm:p-5 flex flex-col justify-between min-h-[110px]">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Pendapatan Hari Ini</span>
            <div className="flex items-baseline justify-between mt-2 flex-wrap gap-1">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-800 dark:text-neutral-200">{formatRupiah(revenueToday)}</h3>
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 sm:p-5 flex flex-col justify-between min-h-[110px]">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Pendapatan Bulan Ini</span>
            <div className="flex items-baseline justify-between mt-2 flex-wrap gap-1">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-800 dark:text-neutral-200">{formatRupiah(revenueMonth)}</h3>
              <TrendingUp className="h-4 w-4 text-purple-500 shrink-0" />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 sm:p-5 flex flex-col justify-between min-h-[110px]">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Pendapatan</span>
            <div className="flex items-baseline justify-between mt-2 flex-wrap gap-1">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-800 dark:text-neutral-200">{formatRupiah(revenueAllTime)}</h3>
              <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 sm:p-5 flex flex-col justify-between min-h-[110px]">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Customer Aktif</span>
            <div className="flex items-baseline justify-between mt-2 flex-wrap gap-1">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-800 dark:text-neutral-200">{activeCustomersCount} Slot</h3>
              <Users className="h-4 w-4 text-emerald-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Alerts Section (Expiring Subscriptions & Host accounts) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Expiring Customers Card */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/30 dark:bg-neutral-950/40 p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-300 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Customer Akan Habis (≤3 hari)
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
                {expiringCustomers.length} Antrean
              </span>
            </h2>

            {expiringCustomers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-3 text-neutral-400 dark:text-neutral-600">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-300 text-xs">Semua Aman</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                  Tidak ada customer yang akan habis masa aktifnya dalam 3 hari ke depan.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {expiringCustomers.map(sub => {
                  const remDays = getRemainingDays(sub.expiry_date);
                  return (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-100/50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-900/60 text-xs">
                      <div className="overflow-hidden pr-2">
                        <strong className="block text-neutral-800 dark:text-neutral-200 truncate font-semibold">{sub.customer_email}</strong>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate block mt-0.5">
                          Host: {getHostEmail(sub.host_account_id)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          remDays === 0 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {remDays === 0 ? 'Hari Ini' : `${remDays} hari lagi`}
                        </span>
                        <Link 
                          href="/customers" 
                          className="block text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 font-semibold mt-1.5 transition-colors"
                        >
                          Perpanjang &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expiring / Full Host Accounts Card */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/30 dark:bg-neutral-950/40 p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-300 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                Peringatan Stok & Akun Induk
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
                {alertHosts.length} Akun
              </span>
            </h2>

            {alertHosts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-3 text-neutral-400 dark:text-neutral-600">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-300 text-xs">Stok & Akun Aman</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                  Semua akun induk memiliki sisa slot yang cukup dan masa aktif yang masih lama.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {alertHosts.map(host => {
                  const isAlmostFull = host.sisaSlot <= 1;
                  const isExpiring = host.daysLeft <= 7;
                  return (
                    <div key={host.id} className="p-3 rounded-lg bg-neutral-100/50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-900/60 text-xs space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <strong className="text-neutral-800 dark:text-neutral-200 truncate font-semibold block">{host.account_email}</strong>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 shrink-0">
                          {host.billing_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {isAlmostFull && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                            Slot Sisa: {host.sisaSlot} / {host.total_slot} (Hampir Penuh)
                          </span>
                        )}
                        {isExpiring && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Masa Aktif: {host.daysLeft <= 0 ? 'Habis' : `${host.daysLeft} Hari Lagi`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
