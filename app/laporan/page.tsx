'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { HostAccount, Subscription } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  Loader2, 
  FileText, 
  Calendar, 
  TrendingUp, 
  BadgeCent, 
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';

export default function LaporanPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedHostId, setSelectedHostId] = useState('semua');

  // Load subscriptions and host accounts
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
      setError('Gagal mengambil data transaksi dari database.');
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
      setError('Gagal mengambil data akun induk dari database.');
    });

    return () => {
      unsubscribeSubs();
      unsubscribeHosts();
    };
  }, []);

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

  // Helper: Format Indonesian Date
  const formatIndonesianDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // Filter subscriptions based on filters
  const filteredSubs = subscriptions.filter(sub => {
    // 1. Host Account filter
    if (selectedHostId !== 'semua' && sub.host_account_id !== selectedHostId) {
      return false;
    }

    // 2. Date Range filter (check if subscription start_date falls inside range)
    if (startDate && sub.start_date < startDate) {
      return false;
    }
    if (endDate && sub.start_date > endDate) {
      return false;
    }

    return true;
  });

  // Calculate metrics
  const totalRevenue = filteredSubs.reduce((sum, sub) => sum + (sub.price || 0), 0);
  const totalTransactions = filteredSubs.length;
  
  // Count active subscriptions dynamically in filtered set
  const activeCount = filteredSubs.filter(sub => {
    if (!sub.expiry_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(sub.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    return expiry.getTime() >= today.getTime();
  }).length;

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredSubs.length === 0) return;

    // Build CSV content
    const headers = ['Email Customer', 'Akun Induk', 'Durasi', 'Tanggal Mulai', 'Tanggal Habis', 'Metode Pembayaran', 'Harga'];
    const rows = filteredSubs.map(sub => [
      sub.customer_email,
      getHostEmail(sub.host_account_id),
      sub.duration_label,
      sub.start_date,
      sub.expiry_date,
      sub.payment_channel,
      sub.price
    ]);

    // CSV format: surround cells with quotes and escape inner quotes
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(value => {
        const strVal = String(value ?? '').replace(/"/g, '""');
        return `"${strVal}"`;
      }).join(','))
    ].join('\n');

    // Create file and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // File name format: laporan_pendapatan_YYYY-MM-DD.csv
    const dateLabel = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_pendapatan_${dateLabel}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Laporan Pendapatan & Ekspor
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Filter transaksi penjualan customer dan ekspor data ke file CSV.
            </p>
          </div>
          <Button
            onClick={handleExportCSV}
            disabled={filteredSubs.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 self-start sm:self-center font-medium shadow-md transition-all h-10 px-4 rounded-lg"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Ekspor ke CSV</span>
          </Button>
        </div>

        {/* Filters Panel */}
        <div className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-5 mb-8">
          <h2 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            Filter Laporan
          </h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rep-start" className="text-xs font-semibold text-neutral-400">Tanggal Mulai</Label>
              <Input
                id="rep-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-neutral-900 border-neutral-800 focus:border-purple-500/50 text-neutral-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rep-end" className="text-xs font-semibold text-neutral-400">Tanggal Selesai</Label>
              <Input
                id="rep-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-neutral-900 border-neutral-800 focus:border-purple-500/50 text-neutral-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rep-host" className="text-xs font-semibold text-neutral-400">Akun Induk (Host)</Label>
              <Select value={selectedHostId} onValueChange={(val) => { if (val) setSelectedHostId(val); }}>
                <SelectTrigger id="rep-host" className="bg-neutral-900 border-neutral-800 text-neutral-300 h-9.5">
                  <SelectValue placeholder="Semua Akun Induk" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                  <SelectItem value="semua">Semua Akun Induk</SelectItem>
                  {hostAccounts.map(host => (
                    <SelectItem key={host.id} value={host.id || ''}>
                      {host.account_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(startDate || endDate || selectedHostId !== 'semua') && (
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedHostId('semua');
                }}
                className="text-xs text-neutral-500 hover:text-neutral-300 font-medium transition-colors"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-950/10 p-5 text-sm text-red-400 mb-6">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading / Data Grid Section */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-neutral-500">Memuat laporan data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Metrics Cards */}
            <div className="grid gap-5 sm:grid-cols-3 mb-8">
              <div className="rounded-xl border border-neutral-900 bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500">Total Pendapatan</span>
                  <h3 className="text-2xl font-bold text-neutral-200 mt-1">{formatRupiah(totalRevenue)}</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-900 bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500">Jumlah Transaksi</span>
                  <h3 className="text-2xl font-bold text-neutral-200 mt-1">{totalTransactions} Transaksi</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-900 bg-neutral-950/20 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500">Subscription Aktif</span>
                  <h3 className="text-2xl font-bold text-neutral-200 mt-1">{activeCount} Customer</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <BadgeCent className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Results Table / Cards */}
            {filteredSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-2xl p-16 text-center bg-neutral-950/10">
                <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4 text-neutral-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-neutral-300 text-lg">Tidak Ada Data Transaksi</h3>
                <p className="text-sm text-neutral-500 max-w-sm mt-1.5">
                  Tidak ditemukan transaksi yang cocok dengan filter yang dipilih.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block border border-neutral-900 rounded-xl overflow-hidden bg-neutral-950/20">
                  <Table>
                    <TableHeader className="bg-neutral-950/60">
                      <TableRow className="border-b border-neutral-900 hover:bg-transparent">
                        <TableHead className="text-neutral-400 font-semibold py-4">Email Customer</TableHead>
                        <TableHead className="text-neutral-400 font-semibold">Akun Induk</TableHead>
                        <TableHead className="text-neutral-400 font-semibold">Durasi</TableHead>
                        <TableHead className="text-neutral-400 font-semibold">Mulai</TableHead>
                        <TableHead className="text-neutral-400 font-semibold">Habis</TableHead>
                        <TableHead className="text-neutral-400 font-semibold">Pembayaran</TableHead>
                        <TableHead className="text-neutral-400 font-semibold text-right py-4 pr-6">Harga</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((sub) => (
                        <TableRow key={sub.id} className="border-b border-neutral-900 hover:bg-neutral-900/10 transition-colors">
                          <TableCell className="font-medium text-neutral-200 py-4.5">{sub.customer_email}</TableCell>
                          <TableCell className="text-neutral-400 text-xs">{getHostEmail(sub.host_account_id)}</TableCell>
                          <TableCell className="text-neutral-300">{sub.duration_label}</TableCell>
                          <TableCell className="text-neutral-300 text-xs">{formatIndonesianDate(sub.start_date)}</TableCell>
                          <TableCell className="text-neutral-300 text-xs">{formatIndonesianDate(sub.expiry_date)}</TableCell>
                          <TableCell>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                              {sub.payment_channel}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4.5 pr-6 font-semibold text-neutral-200">
                            {formatRupiah(sub.price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="grid gap-4 md:hidden">
                  {filteredSubs.map((sub) => (
                    <div key={sub.id} className="border border-neutral-900 rounded-xl bg-neutral-950/20 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="overflow-hidden">
                          <h4 className="font-semibold text-neutral-200 truncate">{sub.customer_email}</h4>
                          <span className="text-[10px] text-neutral-500 block mt-1 overflow-hidden text-ellipsis">
                            Host: {getHostEmail(sub.host_account_id)}
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 shrink-0">
                          {sub.payment_channel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-neutral-900/60 text-xs">
                        <div>
                          <span className="text-neutral-500 block mb-1">Durasi / Mulai</span>
                          <strong className="text-neutral-300 block">{sub.duration_label}</strong>
                          <span className="text-[10px] text-neutral-400">{formatIndonesianDate(sub.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block mb-1">Harga</span>
                          <strong className="text-neutral-200 block">{formatRupiah(sub.price)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <Calendar className="h-4 w-4 text-neutral-500" />
                        <span>Masa Aktif Sampai: {formatIndonesianDate(sub.expiry_date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
