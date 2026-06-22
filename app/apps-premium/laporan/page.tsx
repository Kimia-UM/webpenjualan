'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AppsPremium } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Download, Loader2, AppWindow, Calendar, TrendingUp, DollarSign, ShoppingBag,
} from 'lucide-react';

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => {
  if (!d) return '-';
  try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)); }
  catch { return d; }
};

export default function AppsPremiumLaporanPage() {
  const [items, setItems] = useState<AppsPremium[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appFilter, setAppFilter] = useState('');

  useEffect(() => {
    const unsub = onValue(ref(db, 'apps_premium'), snap => {
      const d = snap.val();
      setItems(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(x => {
    if (startDate && x.order_date < startDate) return false;
    if (endDate && x.order_date > endDate) return false;
    if (appFilter && !x.app_name.toLowerCase().includes(appFilter.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

  const totalRevenue = filtered.reduce((s, x) => s + (x.selling_price || 0), 0);
  const totalCapital = filtered.reduce((s, x) => s + (x.capital_price || 0), 0);
  const totalProfit = filtered.reduce((s, x) => s + (x.profit || 0), 0);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = ['Nama Aplikasi', 'Akun', 'Variasi', 'Tgl Order', 'Tgl Habis', 'Harga Jual', 'Modal', 'Keuntungan', 'Catatan'];
    const rows = filtered.map(x => [
      x.app_name, x.account, x.variation, x.order_date, x.expiry_date,
      x.selling_price, x.capital_price, x.profit, x.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_apps_premium_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
                Laporan Apps Premium
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Filter dan ekspor data transaksi apps premium.</p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 self-start sm:self-center font-medium"
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/30 dark:bg-neutral-950/40 p-5 mb-8">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-300 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            Filter Laporan
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Tanggal Mulai</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Tanggal Selesai</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Nama Aplikasi</Label>
              <Input type="text" placeholder="Cari nama aplikasi..." value={appFilter} onChange={e => setAppFilter(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
            </div>
          </div>
          {(startDate || endDate || appFilter) && (
            <div className="flex justify-end mt-3">
              <button onClick={() => { setStartDate(''); setEndDate(''); setAppFilter(''); }} className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium">
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Pendapatan</span>
                  <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mt-1">{formatRupiah(totalRevenue)}</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Keuntungan</span>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatRupiah(totalProfit)}</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Jumlah Transaksi</span>
                  <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mt-1">{filtered.length} item</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center">
                <AppWindow className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-3" />
                <h3 className="font-semibold text-neutral-700 dark:text-neutral-300">Tidak Ada Data</h3>
                <p className="text-xs text-neutral-400 mt-1">Tidak ditemukan transaksi yang sesuai filter.</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-hidden bg-white dark:bg-neutral-950/20">
                  <Table>
                    <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                      <TableRow className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-transparent">
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold py-4">Nama Aplikasi</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Akun</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Variasi</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Tgl Order</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Tgl Habis</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right">Harga Jual</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right">Modal</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right pr-6">Keuntungan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(item => (
                        <TableRow key={item.id} className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900/20">
                          <TableCell className="font-medium text-neutral-800 dark:text-neutral-200 py-4">{item.app_name}</TableCell>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs">{item.account}</TableCell>
                          <TableCell className="text-neutral-600 dark:text-neutral-300">{item.variation}</TableCell>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs">{formatDate(item.order_date)}</TableCell>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs">{formatDate(item.expiry_date)}</TableCell>
                          <TableCell className="text-right text-neutral-800 dark:text-neutral-200 font-semibold">{formatRupiah(item.selling_price)}</TableCell>
                          <TableCell className="text-right text-neutral-500 dark:text-neutral-400">{formatRupiah(item.capital_price)}</TableCell>
                          <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(item.profit)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-neutral-50/80 dark:bg-neutral-950/60 border-t-2 border-neutral-200 dark:border-neutral-800">
                        <TableCell colSpan={5} className="font-bold text-neutral-700 dark:text-neutral-300 py-3 pl-4">TOTAL ({filtered.length} transaksi)</TableCell>
                        <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">{formatRupiah(totalRevenue)}</TableCell>
                        <TableCell className="text-right font-bold text-neutral-600 dark:text-neutral-300">{formatRupiah(totalCapital)}</TableCell>
                        <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalProfit)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map(item => (
                    <div key={item.id} className="border border-neutral-200 dark:border-neutral-900 rounded-xl bg-white dark:bg-neutral-950/20 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">{item.app_name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40 shrink-0">{item.variation}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-neutral-400">Harga Jual</span><p className="font-bold text-neutral-800 dark:text-neutral-200">{formatRupiah(item.selling_price)}</p></div>
                        <div><span className="text-neutral-400">Keuntungan</span><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(item.profit)}</p></div>
                        <div><span className="text-neutral-400">Order</span><p className="text-neutral-600 dark:text-neutral-300">{formatDate(item.order_date)}</p></div>
                        <div><span className="text-neutral-400">Habis</span><p className="text-neutral-600 dark:text-neutral-300">{formatDate(item.expiry_date)}</p></div>
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="border-2 border-orange-200 dark:border-orange-900/50 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 p-4">
                    <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">TOTAL ({filtered.length} transaksi)</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[10px] text-neutral-400">Pendapatan</span><p className="font-bold text-orange-600 dark:text-orange-400">{formatRupiah(totalRevenue)}</p></div>
                      <div><span className="text-[10px] text-neutral-400">Keuntungan</span><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalProfit)}</p></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
