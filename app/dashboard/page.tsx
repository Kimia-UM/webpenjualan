'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Subscription, HostAccount, AppsPremium, PrivatPremium, ResellerOrder, Withdrawal } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  Users,
  AppWindow,
  ShieldCheck,
  DollarSign,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  Briefcase,
  Database,
  BarChart3,
  Wallet,
  History,
  Plus,
  ArrowDownCircle,
  Trash2,
} from 'lucide-react';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Status = 'aktif' | 'akan_habis' | 'habis';

const getStatus = (expiryDate: string): Status => {
  if (!expiryDate) return 'habis';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function DashboardUtamaPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>([]);
  const [appsItems, setAppsItems] = useState<AppsPremium[]>([]);
  const [privatItems, setPrivatItems] = useState<PrivatPremium[]>([]);
  const [resellerOrders, setResellerOrders] = useState<ResellerOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Dialog State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [wAmount, setWAmount] = useState('');
  const [wDate, setWDate] = useState(new Date().toISOString().split('T')[0]);
  const [wNote, setWNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wError, setWError] = useState<string | null>(null);

  // Dialog Delete State
  const [isDeleteWithdrawOpen, setIsDeleteWithdrawOpen] = useState(false);
  const [withdrawToDelete, setWithdrawToDelete] = useState<Withdrawal | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = 0;
    const done = () => { if (++loaded === 6) setLoading(false); };

    const u1 = onValue(ref(db, 'subscriptions'), snap => {
      const d = snap.val();
      setSubscriptions(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      done();
    });
    const u2 = onValue(ref(db, 'host_accounts'), snap => {
      const d = snap.val();
      setHostAccounts(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      done();
    });
    const u3 = onValue(ref(db, 'apps_premium'), snap => {
      const d = snap.val();
      setAppsItems(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      done();
    });
    const u4 = onValue(ref(db, 'privat_premium'), snap => {
      const d = snap.val();
      setPrivatItems(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      done();
    });
    const u5 = onValue(ref(db, 'reseller_orders'), snap => {
      const data = snap.val();
      if (data) {
        let allOrders: ResellerOrder[] = [];
        Object.values(data).forEach((resellerObj: any) => {
          if (resellerObj) {
            allOrders = [...allOrders, ...Object.keys(resellerObj).map(k => ({ id: k, ...resellerObj[k] }))];
          }
        });
        setResellerOrders(allOrders);
      } else { setResellerOrders([]); }
      done();
    });
    const u6 = onValue(ref(db, 'withdrawals'), snap => {
      const d = snap.val();
      setWithdrawals(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      done();
    });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  // â”€â”€ Handler Tarik Dana â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWError(null);
    const amount = Number(wAmount);
    if (!amount || amount <= 0) {
      setWError('Nominal tidak valid.');
      return;
    }
    if (!wDate || !wNote.trim()) {
      setWError('Semua field wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await push(ref(db, 'withdrawals'), {
        amount,
        date: wDate,
        note: wNote.trim(),
        created_at: Date.now()
      });
      setIsWithdrawOpen(false);
      setWAmount('');
      setWNote('');
    } catch (err: any) {
      setWError(err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteWithdrawal = (w: Withdrawal) => {
    setWithdrawToDelete(w);
    setIsDeleteWithdrawOpen(true);
  };

  const handleDeleteWithdrawal = async () => {
    if (!withdrawToDelete?.id) return;
    setIsSubmitting(true);
    try {
      await remove(ref(db, `withdrawals/${withdrawToDelete.id}`));
      setIsDeleteWithdrawOpen(false);
      setWithdrawToDelete(null);
    } catch (err) {
      console.error('Failed to delete withdrawal', err);
      alert('Gagal menghapus penarikan dana.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // â”€â”€ Computed values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // PremiumShare
  const psRevenue = subscriptions.reduce((s, x) => s + (x.price || 0), 0);
  const psCapital = hostAccounts.reduce((s, x) => s + (x.capital_price || 0), 0);
  const psProfit = psRevenue - psCapital;
  const psAktif = subscriptions.filter(x => getStatus(x.expiry_date) === 'aktif').length;
  const psAkanHabis = subscriptions.filter(x => getStatus(x.expiry_date) === 'akan_habis');
  const psHabis = subscriptions.filter(x => getStatus(x.expiry_date) === 'habis').length;

  // Apps Premium
  const appsRevenue = appsItems.reduce((s, x) => s + (x.selling_price || 0), 0);
  const appsProfit = appsItems.reduce((s, x) => s + (x.profit || 0), 0);
  const appsAkanHabis = appsItems.filter(x => getStatus(x.expiry_date) === 'akan_habis');

  // Privat Premium
  const privatRevenue = privatItems.reduce((s, x) => s + (x.selling_price || 0), 0);
  const privatProfit = privatItems.reduce((s, x) => s + (x.profit || 0), 0);

  // Reseller Orders
  const resellerRevenue = resellerOrders.reduce((s, x) => s + (x.selling_price || 0), 0);
  const resellerProfit = resellerOrders.reduce((s, x) => s + (x.profit || 0), 0);

  // Grand totals
  const grandRevenue = psRevenue + appsRevenue + privatRevenue + resellerRevenue;
  const grandProfit = psProfit + appsProfit + privatProfit + resellerProfit;
  const grandTransactions = subscriptions.length + appsItems.length + privatItems.length + resellerOrders.length;

  // Withdrawals
  const totalWithdrawals = withdrawals.reduce((s, x) => s + (x.amount || 0), 0);
  const saldoTersedia = grandProfit - totalWithdrawals;

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-muted-foreground">Memuat dashboard utama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <BarChart3 className="h-6 w-6 text-indigo-500" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
              Dashboard Utama
            </h1>
          </div>
          <p className="text-muted-foreground text-sm pl-1">
            Ringkasan keseluruhan dari semua produk â€” PremiumShare, Apps Premium, dan Privat Premium.
          </p>
        </div>

        {/* â”€â”€ Saldo Tersedia (Uang Kas) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-10 p-6 sm:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 shadow-lg shadow-emerald-500/5 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-5 w-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Saldo Tersedia</h2>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-emerald-700 dark:text-emerald-300 drop-shadow-sm">
              {formatRupiah(saldoTersedia)}
            </p>
            <p className="text-xs sm:text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-2 font-medium max-w-md">
              Dihitung dari total keuntungan bersih semua produk dikurangi total penarikan yang sudah dilakukan.
            </p>
          </div>
          <Button
            onClick={() => { setWError(null); setIsWithdrawOpen(true); }}
            className="relative z-10 w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 gap-2 h-12 px-6 rounded-xl font-bold"
          >
            <ArrowDownCircle className="h-5 w-5" />
            Tarik Uang
          </Button>

          {/* Background decoration */}
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <Wallet className="w-64 h-64" />
          </div>
        </div>

        {/* â”€â”€ Grand Total KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <div className="rounded-2xl border border-indigo-200/50 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-950/10 p-6">
            <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
              <Package className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            </div>
            <p className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300">{grandTransactions}</p>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mt-1">Dari semua produk</p>
          </div>

          <div className="rounded-2xl border border-purple-200/50 dark:border-purple-900/40 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-950/10 p-6">
            <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Pendapatan</span>
            </div>
            <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-300">{formatRupiah(grandRevenue)}</p>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/60 mt-1">Harga jual gabungan</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-950/10 p-6">
            <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Estimasi Keuntungan</span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{formatRupiah(grandProfit)}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-1">Gabungan semua produk</p>
          </div>
        </div>

        {/* â”€â”€ Per-Product Summary Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <h2 className="text-base font-bold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-neutral-400 dark:bg-neutral-600 inline-block" />
          Ringkasan per Produk
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">

          {/* PremiumShare */}
          <div className="rounded-2xl border border-purple-200/60 dark:border-purple-900/40 bg-white dark:bg-neutral-950/20 p-6 flex flex-col hover:border-purple-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-800 dark:text-neutral-100">PremiumShare</h3>
                <p className="text-[10px] text-neutral-400">Sharing akun premium</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2.5">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{psAktif}</p>
                <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70 font-medium">Aktif</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{psAkanHabis.length}</p>
                <p className="text-[9px] text-amber-600/70 dark:text-amber-500/70 font-medium">Akan Habis</p>
              </div>
              <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 p-2.5">
                <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400">{psHabis}</p>
                <p className="text-[9px] text-neutral-400/70 font-medium">Habis</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Total Transaksi</span>
                <strong className="text-neutral-800 dark:text-neutral-100">{subscriptions.length} akun</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Total Pendapatan</span>
                <strong className="text-purple-600 dark:text-purple-400">{formatRupiah(psRevenue)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">Total Keuntungan</span>
                <strong className={`font-bold ${psProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatRupiah(psProfit)}
                </strong>
              </div>
            </div>

            <Link href="/customers" className="mt-auto flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors">
              Kelola PremiumShare <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Apps Premium */}
          <div className="rounded-2xl border border-orange-200/60 dark:border-orange-900/40 bg-white dark:bg-neutral-950/20 p-6 flex flex-col hover:border-orange-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-orange-500/10">
                <AppWindow className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-800 dark:text-neutral-100">Apps Premium</h3>
                <p className="text-[10px] text-neutral-400">Akun aplikasi premium</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2.5">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {appsItems.filter(x => getStatus(x.expiry_date) === 'aktif').length}
                </p>
                <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70 font-medium">Aktif</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{appsAkanHabis.length}</p>
                <p className="text-[9px] text-amber-600/70 dark:text-amber-500/70 font-medium">Akan Habis</p>
              </div>
              <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 p-2.5">
                <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400">
                  {appsItems.filter(x => getStatus(x.expiry_date) === 'habis').length}
                </p>
                <p className="text-[9px] text-neutral-400/70 font-medium">Habis</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Total Transaksi</span>
                <strong className="text-neutral-800 dark:text-neutral-100">{appsItems.length} item</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Total Pendapatan</span>
                <strong className="text-orange-600 dark:text-orange-400">{formatRupiah(appsRevenue)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">Total Keuntungan</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiah(appsProfit)}</strong>
              </div>
            </div>

            <Link href="/apps-premium" className="mt-auto flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors">
              Kelola Apps Premium <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Privat Premium */}
          <div className="rounded-2xl border border-teal-200/60 dark:border-teal-900/40 bg-white dark:bg-neutral-950/20 p-6 flex flex-col hover:border-teal-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-teal-500/10">
                <ShieldCheck className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-800 dark:text-neutral-100">Privat Premium</h3>
                <p className="text-[10px] text-neutral-400">Transaksi privat</p>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/20 py-5 mb-5">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-teal-600 dark:text-teal-400">{privatItems.length}</p>
                <p className="text-xs text-teal-600/70 dark:text-teal-500/70 mt-1">Total Transaksi</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Total Pendapatan</span>
                <strong className="text-teal-600 dark:text-teal-400">{formatRupiah(privatRevenue)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">Total Keuntungan</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiah(privatProfit)}</strong>
              </div>
            </div>

            <Link href="/privat-premium" className="mt-auto flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-500 transition-colors">
              Kelola Privat Premium <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* â”€â”€ Owner Photo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-4">
          <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm bg-black">
            <Image
              src="/images/owner.jpeg"
              alt="Owner j0eeys premiums"
              width={1600}
              height={1066}
              className="w-full h-auto block"
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            {/* Top badge */}
            <div className="absolute top-5 left-5">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Owner
              </span>
            </div>
            {/* Bottom caption */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
              <p className="text-white/70 text-[11px] mb-1.5 tracking-widest uppercase font-medium">Pemilik Usaha</p>
              <h2 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-lg">j0eeys premiums</h2>
              <p className="text-white/80 text-xs sm:text-sm mt-2 max-w-md leading-relaxed">
                Kelola semua layanan premium â€” PremiumShare, Apps Premium, dan Privat Premium â€” dari satu dashboard terintegrasi.
              </p>
            </div>
          </div>
        </div>

        {/* â”€â”€ Riwayat Penarikan Dana â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-10">
          <h2 className="text-base font-bold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-neutral-400 dark:bg-neutral-600 inline-block" />
            Riwayat Penarikan
          </h2>
          <div className="bg-white dark:bg-neutral-950/20 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 shadow-sm overflow-hidden">
            {withdrawals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-60">
                <History className="h-10 w-10 text-neutral-400 mb-3" />
                <p className="text-sm font-medium text-neutral-500">Belum ada riwayat penarikan dana.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {[...withdrawals].sort((a, b) => b.created_at - a.created_at).map(w => (
                  <div key={w.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-100 text-sm">{w.note}</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(w.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-red-500 dark:text-red-400">-{formatRupiah(w.amount)}</p>
                      </div>
                      <button
                        onClick={() => confirmDeleteWithdrawal(w)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                        title="Batalkan Penarikan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* â”€â”€ Dialog Tarik Dana â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-md rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
              Tarik Uang
            </DialogTitle>
            <DialogDescription>
              Catat uang yang Anda tarik. Nominal ini akan langsung memotong perhitungan Saldo Tersedia Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-neutral-700 dark:text-neutral-300">Nominal Tarik (Rp)</Label>
              <Input
                type="number"
                placeholder="Contoh: 150000"
                value={wAmount}
                onChange={(e) => setWAmount(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-lg font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-700 dark:text-neutral-300">Tanggal Penarikan</Label>
              <Input
                type="date"
                value={wDate}
                onChange={(e) => setWDate(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-700 dark:text-neutral-300">Catatan / Keterangan</Label>
              <Input
                type="text"
                placeholder="Contoh: Tarik ke BCA, Gaji admin"
                value={wNote}
                onChange={(e) => setWNote(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              />
            </div>

            {wError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/50">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{wError}</p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsWithdrawOpen(false)} className="border-neutral-200 dark:border-neutral-800">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-md shadow-emerald-500/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isSubmitting ? 'Memproses...' : 'Simpan Penarikan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Dialog Batal Penarikan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isDeleteWithdrawOpen} onOpenChange={setIsDeleteWithdrawOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Batalkan Penarikan?
            </DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400">
              Uang kas akan otomatis dikembalikan ke total Saldo Tersedia Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
              <p className="text-sm text-red-700 dark:text-red-400 mb-1">Anda akan membatalkan penarikan:</p>
              <p className="font-bold text-red-800 dark:text-red-300">
                {withdrawToDelete?.note} â€” {formatRupiah(withdrawToDelete?.amount || 0)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteWithdrawOpen(false)}
              className="border-neutral-200 dark:border-neutral-800"
            >
              Kembali
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWithdrawal}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isSubmitting ? 'Memproses...' : 'Ya, Batalkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
