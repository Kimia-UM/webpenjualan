'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Reseller, ResellerOrder, Subscription, HostAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Download, Loader2, Handshake, Calendar, TrendingUp, DollarSign, ShoppingBag,
} from 'lucide-react';

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => {
  if (!d) return '-';
  try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)); }
  catch { return d; }
};

interface MergedActivity {
  id: string;
  reseller_id: string;
  reseller_name: string;
  type: 'Pesanan Umum' | 'PremiumShare';
  date: string;
  title: string;
  detail: string;
  revenue: number;
  profit: number;
}

export default function ResellerLaporanPage() {
  const [activities, setActivities] = useState<MergedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    let loadedCount = 0;
    let tempResellers: Record<string, Reseller> = {};
    let tempOrders: ResellerOrder[] = [];
    let tempSubs: Subscription[] = [];
    let tempHosts: Record<string, HostAccount> = {};

    const tryMerge = () => {
      if (loadedCount < 4) return;
      
      const merged: MergedActivity[] = [];

      // Add orders
      tempOrders.forEach(o => {
        merged.push({
          id: `order_${o.id}`,
          reseller_id: o.reseller_id,
          reseller_name: tempResellers[o.reseller_id]?.name || 'Unknown Reseller',
          type: 'Pesanan Umum',
          date: o.order_date,
          title: o.app_name,
          detail: o.account,
          revenue: o.selling_price || 0,
          profit: o.profit || 0,
        });
      });

      // Add PremiumShare subs
      tempSubs.forEach(s => {
        if (!s.reseller_id) return;
        const host = tempHosts[s.host_account_id];
        
        merged.push({
          id: `sub_${s.id}`,
          reseller_id: s.reseller_id,
          reseller_name: tempResellers[s.reseller_id]?.name || 'Unknown Reseller',
          type: 'PremiumShare',
          date: s.start_date,
          title: 'PremiumShare ' + s.duration_label,
          detail: s.customer_email,
          revenue: s.price || 0,
          profit: s.price || 0, 
        });
      });

      setActivities(merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    };

    const unsub1 = onValue(ref(db, 'resellers'), snap => {
      tempResellers = snap.val() || {};
      loadedCount++; tryMerge();
    });
    
    const unsub2 = onValue(ref(db, 'reseller_orders'), snap => {
      const data = snap.val();
      tempOrders = [];
      if (data) {
        Object.values(data).forEach((resellerObj: any) => {
          if (resellerObj) {
            tempOrders = [...tempOrders, ...Object.keys(resellerObj).map(k => ({ id: k, ...resellerObj[k] }))];
          }
        });
      }
      loadedCount++; tryMerge();
    });

    const unsub3 = onValue(ref(db, 'subscriptions'), snap => {
      const d = snap.val();
      tempSubs = d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : [];
      loadedCount++; tryMerge();
    });

    const unsub4 = onValue(ref(db, 'host_accounts'), snap => {
      tempHosts = snap.val() || {};
      loadedCount++; tryMerge();
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const filtered = activities.filter(x => {
    if (startDate && x.date < startDate) return false;
    if (endDate && x.date > endDate) return false;
    if (searchName && !x.reseller_name.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((s, x) => s + x.revenue, 0);
  const totalProfit = filtered.reduce((s, x) => s + x.profit, 0);
  
  // Hitung jumlah reseller unik yang ada di dalam transaksi yang sudah terfilter
  const uniqueResellers = new Set(filtered.map(x => x.reseller_id)).size;

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = ['Tanggal', 'Nama Reseller', 'Tipe', 'Produk', 'Detail Akun/Email', 'Pendapatan', 'Keuntungan'];
    const rows = filtered.map(x => [
      x.date, x.reseller_name, x.type, x.title, x.detail,
      x.revenue, x.profit,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_seluruh_reseller_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10">
              <Handshake className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                Laporan Seluruh Reseller
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Filter dan ekspor transaksi gabungan dari semua reseller.</p>
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
            <Calendar className="h-4 w-4 text-rose-500" />
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
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Cari Reseller</Label>
              <Input type="text" placeholder="Masukkan nama reseller..." value={searchName} onChange={e => setSearchName(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
            </div>
          </div>
          {(startDate || endDate || searchName) && (
            <div className="flex justify-end mt-3">
              <button onClick={() => { setStartDate(''); setEndDate(''); setSearchName(''); }} className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium">
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Transaksi</span>
                  <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">{filtered.length} item</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Pendapatan</span>
                  <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatRupiah(totalRevenue)}</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-rose-500" />
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Reseller Aktif</span>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{uniqueResellers} orang</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Handshake className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center">
                <Handshake className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-3" />
                <h3 className="font-semibold text-neutral-700 dark:text-neutral-300">Tidak Ada Data</h3>
                <p className="text-xs text-neutral-400 mt-1">Belum ada transaksi dari reseller pada filter ini.</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-hidden bg-white dark:bg-neutral-950/20">
                  <Table>
                    <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                      <TableRow className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-transparent">
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold py-4 w-[120px]">Tanggal</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Reseller</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Tipe</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Produk</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Akun/Email</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right">Pendapatan</TableHead>
                        <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right pr-6">Keuntungan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(item => (
                        <TableRow key={item.id} className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900/20">
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs py-4">{formatDate(item.date)}</TableCell>
                          <TableCell className="font-bold text-neutral-800 dark:text-neutral-100">{item.reseller_name}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              item.type === 'PremiumShare' 
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
                                : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {item.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-neutral-800 dark:text-neutral-100">{item.title}</TableCell>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs">{item.detail}</TableCell>
                          <TableCell className="text-right text-neutral-800 dark:text-neutral-100 font-semibold">{formatRupiah(item.revenue)}</TableCell>
                          <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(item.profit)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-neutral-50/80 dark:bg-neutral-950/60 border-t-2 border-neutral-200 dark:border-neutral-800">
                        <TableCell colSpan={5} className="font-bold text-neutral-700 dark:text-neutral-300 py-3 pl-4">TOTAL KESELURUHAN</TableCell>
                        <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">{formatRupiah(totalRevenue)}</TableCell>
                        <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalProfit)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map(item => (
                    <div key={item.id} className="border border-neutral-200 dark:border-neutral-900 rounded-xl bg-white dark:bg-neutral-950/20 p-4 space-y-3 flex flex-col">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-neutral-800 dark:text-neutral-100">{item.reseller_name}</h4>
                          <p className="text-xs text-neutral-500">{formatDate(item.date)}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.type === 'PremiumShare' 
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' 
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2.5 rounded-lg text-xs space-y-1">
                        <p><span className="font-semibold text-neutral-700 dark:text-neutral-300">Produk:</span> {item.title}</p>
                        <p><span className="font-semibold text-neutral-700 dark:text-neutral-300">Detail:</span> {item.detail}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-neutral-100 dark:border-neutral-900 mt-2">
                        <div>
                          <span className="text-[10px] text-neutral-400">Pendapatan</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-100">{formatRupiah(item.revenue)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400">Keuntungan</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(item.profit)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="border-2 border-rose-200 dark:border-rose-900/50 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 p-4">
                    <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">TOTAL KESELURUHAN</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[10px] text-neutral-400">Pendapatan</span><p className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(totalRevenue)}</p></div>
                      <div className="text-right"><span className="text-[10px] text-neutral-400">Keuntungan</span><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalProfit)}</p></div>
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
