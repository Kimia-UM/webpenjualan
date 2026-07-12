'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AppsPremium, SubscriptionStatus } from '@/types';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Loader2,
  Pencil,
  Package,
  DollarSign,
  TrendingUp,
  Wallet,
  CalendarRange,
} from 'lucide-react';

export default function AppsPremiumPage() {
  const [appsData, setAppsData] = useState<AppsPremium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');

  // Stats date range
  type StatsPreset = 'semua' | 'hari_ini' | '7_hari' | '30_hari' | 'bulan_ini' | 'kustom';
  const [statsPreset, setStatsPreset] = useState<StatsPreset>('semua');
  const [statsDateFrom, setStatsDateFrom] = useState('');
  const [statsDateTo, setStatsDateTo] = useState('');

  const applyPreset = (preset: StatsPreset) => {
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    setStatsPreset(preset);
    if (preset === 'hari_ini') {
      setStatsDateFrom(toISO(today));
      setStatsDateTo(toISO(today));
    } else if (preset === '7_hari') {
      const from = new Date(today); from.setDate(today.getDate() - 6);
      setStatsDateFrom(toISO(from));
      setStatsDateTo(toISO(today));
    } else if (preset === '30_hari') {
      const from = new Date(today); from.setDate(today.getDate() - 29);
      setStatsDateFrom(toISO(from));
      setStatsDateTo(toISO(today));
    } else if (preset === 'bulan_ini') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      setStatsDateFrom(toISO(from));
      setStatsDateTo(toISO(today));
    } else {
      setStatsDateFrom('');
      setStatsDateTo('');
    }
  };

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<AppsPremium | null>(null);

  // Form Add states
  const [appName, setAppName] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [variation, setVariation] = useState('1 Bulan');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [capitalPrice, setCapitalPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Form Edit states
  const [editForm, setEditForm] = useState({
    appName: '',
    account: '',
    password: '',
    variation: '',
    orderDate: '',
    expiryDate: '',
    sellingPrice: 0,
    capitalPrice: 0,
    notes: '',
  });

  const [customVariationValue, setCustomVariationValue] = useState(1);
  const [customVariationUnit, setCustomVariationUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');

  // Warranty states (Add form)
  const [warrantyOption, setWarrantyOption] = useState<'none' | '3' | '7' | '14' | '30' | 'custom'>('none');
  const [warrantyCustomDays, setWarrantyCustomDays] = useState(7);

  // Warranty states (Edit form)
  const [editWarrantyOption, setEditWarrantyOption] = useState<'none' | '3' | '7' | '14' | '30' | 'custom'>('none');
  const [editWarrantyCustomDays, setEditWarrantyCustomDays] = useState(7);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    const appsRef = ref(db, 'apps_premium_capcut');
    setLoading(true);
    const unsubscribe = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as AppsPremium[];
        setAppsData(list.sort((a, b) => b.created_at - a.created_at));
      } else {
        setAppsData([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching apps premium:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper: Status
  const getAppsStatus = (expiryDateStr: string): SubscriptionStatus => {
    if (!expiryDateStr) return 'habis';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'habis';
    if (diffDays <= 1) return 'akan_habis';
    return 'aktif';
  };

  // Helper: Warranty Status
  // Returns 'aktif' (still in warranty), 'habis' (expired), or null (no warranty)
  const getWarrantyStatus = (orderDateStr: string, warrantyDays?: number): 'aktif' | 'habis' | null => {
    if (!warrantyDays || warrantyDays <= 0 || !orderDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warrantyEnd = new Date(orderDateStr);
    warrantyEnd.setDate(warrantyEnd.getDate() + warrantyDays);
    warrantyEnd.setHours(0, 0, 0, 0);
    return warrantyEnd.getTime() >= today.getTime() ? 'aktif' : 'habis';
  };

  // Helper: Warranty expiry date string for preview
  const getWarrantyExpiryDate = (orderDateStr: string, warrantyDays: number): string => {
    if (!orderDateStr || warrantyDays <= 0) return '';
    const d = new Date(orderDateStr);
    d.setDate(d.getDate() + warrantyDays);
    return d.toISOString().split('T')[0];
  };

  // Helper: resolve warranty option to days
  const resolveWarrantyDays = (option: string, customDays: number): number => {
    if (option === '3') return 3;
    if (option === '7') return 7;
    if (option === '14') return 14;
    if (option === '30') return 30;
    if (option === 'custom') return customDays;
    return 0;
  };

  // Helper: days → warranty option
  const daysToWarrantyOption = (days?: number): 'none' | '3' | '7' | '14' | '30' | 'custom' => {
    if (!days || days === 0) return 'none';
    if (days === 3) return '3';
    if (days === 7) return '7';
    if (days === 14) return '14';
    if (days === 30) return '30';
    return 'custom';
  };

  // Helper: Format Rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper: Format Date
  const formatIndonesianDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // Calculate Expiry Preview
  useEffect(() => {
    if (!orderDate) return;
    const date = new Date(orderDate);
    if (variation === '1 Hari') date.setDate(date.getDate() + 1);
    else if (variation === '3 Hari') date.setDate(date.getDate() + 3);
    else if (variation === '1 Minggu') date.setDate(date.getDate() + 7);
    else if (variation === '1 Bulan') date.setMonth(date.getMonth() + 1);
    else if (variation === '3 Bulan') date.setMonth(date.getMonth() + 3);
    else if (variation === '6 Bulan') date.setMonth(date.getMonth() + 6);
    else if (variation === '1 Tahun') date.setFullYear(date.getFullYear() + 1);
    else if (variation === 'Kustom...') {
      if (customVariationUnit === 'days') date.setDate(date.getDate() + customVariationValue);
      else if (customVariationUnit === 'weeks') date.setDate(date.getDate() + (customVariationValue * 7));
      else if (customVariationUnit === 'months') date.setMonth(date.getMonth() + customVariationValue);
      else if (customVariationUnit === 'years') date.setFullYear(date.getFullYear() + customVariationValue);
    }
    setExpiryDate(date.toISOString().split('T')[0]);
  }, [orderDate, variation, customVariationValue, customVariationUnit]);

  // Handle Add Open
  const handleAddOpen = () => {
    setAppName('');
    setAccount('');
    setPassword('');
    setVariation('1 Bulan');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setSellingPrice(0);
    setCapitalPrice(0);
    setNotes('');
    setWarrantyOption('none');
    setWarrantyCustomDays(7);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Edit Open
  const handleEditOpen = (app: AppsPremium) => {
    setCurrentApp(app);
    setEditForm({
      appName: app.app_name,
      account: app.account,
      password: app.password,
      variation: app.variation,
      orderDate: app.order_date,
      expiryDate: app.expiry_date,
      sellingPrice: app.selling_price,
      capitalPrice: app.capital_price,
      notes: app.notes || '',
    });
    const opt = daysToWarrantyOption(app.warranty_days);
    setEditWarrantyOption(opt);
    setEditWarrantyCustomDays(opt === 'custom' ? (app.warranty_days ?? 7) : 7);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!appName || !account || !password || !orderDate || !expiryDate || sellingPrice === undefined || capitalPrice === undefined) {
      setFormError('Semua field wajib diisi (kecuali catatan).');
      setIsSubmitting(false);
      return;
    }

    const profit = Number(sellingPrice) - Number(capitalPrice);
    const finalVariation = variation === 'Kustom...' 
      ? `${customVariationValue} ${customVariationUnit === 'days' ? 'Hari' : customVariationUnit === 'weeks' ? 'Minggu' : customVariationUnit === 'months' ? 'Bulan' : 'Tahun'}`
      : variation;

    const warrantyDays = resolveWarrantyDays(warrantyOption, warrantyCustomDays);

    try {
      const appsRef = ref(db, 'apps_premium_capcut');
      const newAppRef = push(appsRef);
      await set(newAppRef, {
        app_name: appName.trim(),
        account: account.trim(),
        password: password.trim(),
        variation: finalVariation,
        order_date: orderDate,
        expiry_date: expiryDate,
        selling_price: Number(sellingPrice),
        capital_price: Number(capitalPrice),
        profit: profit,
        notes: notes.trim(),
        warranty_days: warrantyDays,
        created_at: Date.now()
      });
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error saving apps premium:', err);
      setFormError(err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!currentApp?.id) {
      setIsSubmitting(false);
      return;
    }

    if (!editForm.appName || !editForm.account || !editForm.password || !editForm.orderDate || !editForm.expiryDate || editForm.sellingPrice === undefined || editForm.capitalPrice === undefined) {
      setFormError('Semua field wajib diisi (kecuali catatan).');
      setIsSubmitting(false);
      return;
    }

    const profit = Number(editForm.sellingPrice) - Number(editForm.capitalPrice);
    const editWarrantyDays = resolveWarrantyDays(editWarrantyOption, editWarrantyCustomDays);

    try {
      await update(ref(db, `apps_premium_capcut/${currentApp.id}`), {
        app_name: editForm.appName.trim(),
        account: editForm.account.trim(),
        password: editForm.password.trim(),
        variation: editForm.variation,
        order_date: editForm.orderDate,
        expiry_date: editForm.expiryDate,
        selling_price: Number(editForm.sellingPrice),
        capital_price: Number(editForm.capitalPrice),
        profit: profit,
        notes: editForm.notes.trim(),
        warranty_days: editWarrantyDays,
      });
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Error updating apps premium:', err);
      setFormError(err.message || 'Gagal mengubah data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Permanent
  const handleDelete = async () => {
    if (!currentApp?.id) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await remove(ref(db, `apps_premium_capcut/${currentApp.id}`));
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error('Error deleting apps premium:', err);
      setFormError(err.message || 'Gagal menghapus data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters
  const filteredApps = appsData.filter(app => {
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = app.app_name.toLowerCase().includes(searchLow) ||
                          app.account.toLowerCase().includes(searchLow);
    if (!matchesSearch) return false;
    
    if (statusFilter === 'semua') return true;
    const status = getAppsStatus(app.expiry_date);
    return status === statusFilter;
  });

  // Stats date-filtered data
  const statsFilteredApps = appsData.filter(app => {
    if (statsPreset === 'semua' || (!statsDateFrom && !statsDateTo)) return true;
    const order = app.order_date;
    if (statsDateFrom && order < statsDateFrom) return false;
    if (statsDateTo && order > statsDateTo) return false;
    return true;
  });

  // Stats
  const totalTransaksi = statsFilteredApps.length;
  const totalPendapatan = statsFilteredApps.reduce((acc, curr) => acc + curr.selling_price, 0);
  const totalModal = statsFilteredApps.reduce((acc, curr) => acc + curr.capital_price, 0);
  const totalKeuntungan = statsFilteredApps.reduce((acc, curr) => acc + curr.profit, 0);

  const PRESETS: { key: StatsPreset; label: string }[] = [
    { key: 'semua', label: 'Semua' },
    { key: 'hari_ini', label: 'Hari Ini' },
    { key: '7_hari', label: '7 Hari' },
    { key: '30_hari', label: '30 Hari' },
    { key: 'bulan_ini', label: 'Bulan Ini' },
    { key: 'kustom', label: 'Kustom' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
              Capcut Pro
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola akun aplikasi premium, harga jual, dan keuntungan.
            </p>
          </div>
          <Button
            onClick={handleAddOpen}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white gap-2 self-start sm:self-center font-medium shadow-md shadow-orange-900/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Aplikasi</span>
          </Button>
        </div>

        {/* Stats Section */}
        <div className="mb-8">
          {/* Range Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 mr-1">
              <CalendarRange className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Rentang:</span>
            </div>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statsPreset === p.key
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-orange-400 hover:text-orange-500'
                }`}
              >
                {p.label}
              </button>
            ))}
            {/* Custom date inputs — only shown when preset = kustom */}
            {statsPreset === 'kustom' && (
              <div className="flex items-center gap-2 ml-1">
                <Input
                  type="date"
                  value={statsDateFrom}
                  onChange={(e) => setStatsDateFrom(e.target.value)}
                  className="h-7 text-xs px-2 w-36 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                />
                <span className="text-xs text-neutral-400">–</span>
                <Input
                  type="date"
                  value={statsDateTo}
                  onChange={(e) => setStatsDateTo(e.target.value)}
                  className="h-7 text-xs px-2 w-36 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            )}
            {/* Label range aktif */}
            {statsPreset !== 'semua' && statsDateFrom && (
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-auto">
                {statsDateFrom === statsDateTo
                  ? formatIndonesianDate(statsDateFrom)
                  : `${formatIndonesianDate(statsDateFrom)} – ${formatIndonesianDate(statsDateTo)}`}
              </span>
            )}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
                <Package className="h-4 w-4" />
                <h3 className="text-xs font-semibold">Total Transaksi</h3>
              </div>
              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{totalTransaksi}</p>
            </div>
            <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
                <DollarSign className="h-4 w-4 text-orange-500" />
                <h3 className="text-xs font-semibold">Total Pendapatan</h3>
              </div>
              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{formatRupiah(totalPendapatan)}</p>
            </div>
            <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
                <Wallet className="h-4 w-4 text-violet-500" />
                <h3 className="text-xs font-semibold">Total Modal</h3>
              </div>
              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{formatRupiah(totalModal)}</p>
            </div>
            <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <h3 className="text-xs font-semibold">Total Keuntungan</h3>
              </div>
              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{formatRupiah(totalKeuntungan)}</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-405 dark:text-neutral-500">
              <Search className="h-4 w-4" />
            </div>
            <Input
              type="text"
              placeholder="Cari nama aplikasi atau akun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 focus:border-orange-500/50 focus:ring-orange-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold shrink-0">Filter Status:</span>
            <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-300">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-202">
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="akan_habis">Akan Habis</SelectItem>
                <SelectItem value="habis">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Table / Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm text-muted-foreground">Memuat data aplikasi...</p>
            </div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4 text-neutral-400 dark:text-neutral-600">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Tidak Ada Data</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1.5">
              {searchQuery || statusFilter !== 'semua' 
                ? 'Tidak ada hasil filter/pencarian yang cocok.' 
                : 'Belum ada data aplikasi premium. Tambahkan data baru di atas.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-hidden bg-white dark:bg-neutral-950/20 transition-colors">
              <Table>
                <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                  <TableRow className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-transparent">
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold py-4">Nama Aplikasi</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Akun</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Password</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Variasi</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Tgl Habis</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Keuntungan</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Status</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Garansi</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right py-4 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => {
                    const currentStatus = getAppsStatus(app.expiry_date);
                    return (
                      <TableRow key={app.id} className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/10 transition-colors">
                        <TableCell className="font-semibold text-neutral-800 dark:text-neutral-200 py-3">{app.app_name}</TableCell>
                        <TableCell className="text-neutral-600 dark:text-neutral-400 text-sm">{app.account}</TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-500 font-mono text-xs">{app.password}</TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">{app.variation}</TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-neutral-405 dark:text-neutral-500" />
                            <span>{formatIndonesianDate(app.expiry_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{formatRupiah(app.profit)}</span>
                            <span className="text-[10px] text-neutral-400">Jual: {formatRupiah(app.selling_price)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${
                            currentStatus === 'aktif'
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                              : currentStatus === 'akan_habis'
                                ? 'bg-amber-500/5 text-amber-400 border-amber-500/20 animate-pulse'
                                : 'bg-red-500/5 text-red-400 border-red-500/20'
                          }`}>
                            {currentStatus === 'aktif' && <CheckCircle2 className="h-3 w-3" />}
                            {currentStatus === 'akan_habis' && <Clock className="h-3 w-3" />}
                            {currentStatus === 'habis' && <XCircle className="h-3 w-3" />}
                            <span>
                              {currentStatus === 'aktif' && 'Aktif'}
                              {currentStatus === 'akan_habis' && 'Akan Habis'}
                              {currentStatus === 'habis' && 'Habis'}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const ws = getWarrantyStatus(app.order_date, app.warranty_days);
                            if (ws === null) return <span className="text-neutral-400 dark:text-neutral-600 text-xs">—</span>;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  ws === 'aktif'
                                    ? 'bg-sky-500/5 text-sky-400 border-sky-500/20'
                                    : 'bg-neutral-500/5 text-neutral-400 border-neutral-500/20'
                                }`}>
                                  {ws === 'aktif' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                  {ws === 'aktif' ? 'Dalam Garansi' : 'Garansi Habis'}
                                </span>
                                <span className="text-[10px] text-neutral-400 pl-0.5">{app.warranty_days} hari</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right py-3 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOpen(app)}
                              className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-neutral-700 hover:text-orange-600 dark:text-neutral-300 dark:hover:text-orange-400 border hover:border-orange-200 dark:hover:border-orange-900/40 gap-1.5 text-xs font-medium"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setCurrentApp(app); setIsDeleteOpen(true); }}
                              className="h-8 w-8 text-neutral-500 dark:text-neutral-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Grid View */}
            <div className="grid gap-4 md:hidden">
              {filteredApps.map((app) => {
                const currentStatus = getAppsStatus(app.expiry_date);
                return (
                  <div key={app.id} className="border border-neutral-200 dark:border-neutral-900 rounded-xl bg-white dark:bg-neutral-950/20 p-5 space-y-4 shadow-sm transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-neutral-800 dark:text-neutral-200 truncate">{app.app_name}</h4>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5 truncate">
                          Akun: {app.account}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono block truncate">
                          Pass: {app.password}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                        currentStatus === 'aktif'
                          ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                          : currentStatus === 'akan_habis'
                            ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/5 text-red-400 border-red-500/20'
                      }`}>
                        <span>
                          {currentStatus === 'aktif' && 'Aktif'}
                          {currentStatus === 'akan_habis' && 'Akan Habis'}
                          {currentStatus === 'habis' && 'Habis'}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-neutral-200 dark:border-neutral-900/60 text-xs">
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Keuntungan / Durasi</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 block text-sm">{formatRupiah(app.profit)}</strong>
                        <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">{app.variation}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Jual / Modal</span>
                        <strong className="text-neutral-700 dark:text-neutral-300 block">{formatRupiah(app.selling_price)}</strong>
                        <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">{formatRupiah(app.capital_price)}</span>
                      </div>
                    </div>

                    {/* Warranty row — only show if warranty_days is set */}
                    {(() => {
                      const ws = getWarrantyStatus(app.order_date, app.warranty_days);
                      if (ws === null) return null;
                      return (
                        <div className="flex items-center justify-between pt-1 pb-0.5 text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">Garansi ({app.warranty_days} hari)</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            ws === 'aktif'
                              ? 'bg-sky-500/5 text-sky-400 border-sky-500/20'
                              : 'bg-neutral-500/5 text-neutral-400 border-neutral-500/20'
                          }`}>
                            {ws === 'aktif' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {ws === 'aktif' ? 'Dalam Garansi' : 'Garansi Habis'}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex flex-col gap-1 text-neutral-600 dark:text-neutral-400 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-neutral-405 dark:text-neutral-500" />
                          <span>Order: {formatIndonesianDate(app.order_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-neutral-405 dark:text-neutral-500" />
                          <span>Habis: {formatIndonesianDate(app.expiry_date)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOpen(app)}
                          className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setCurrentApp(app); setIsDeleteOpen(true); }}
                          className="h-8 w-8 text-neutral-500 dark:text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-805 dark:text-neutral-100 max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Tambah Aplikasi</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Masukkan data akun aplikasi premium baru.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 p-3.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Nama Aplikasi</Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Akun (Email/User)</Label>
                <Input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Password</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Variasi / Durasi</Label>
              <Select value={variation} onValueChange={(val) => { if (val) setVariation(val); }}>
                <SelectTrigger className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <SelectValue placeholder="Pilih Durasi" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectItem value="1 Hari">1 Hari</SelectItem>
                  <SelectItem value="3 Hari">3 Hari</SelectItem>
                  <SelectItem value="1 Minggu">1 Minggu</SelectItem>
                  <SelectItem value="1 Bulan">1 Bulan</SelectItem>
                  <SelectItem value="3 Bulan">3 Bulan</SelectItem>
                  <SelectItem value="6 Bulan">6 Bulan</SelectItem>
                  <SelectItem value="1 Tahun">1 Tahun</SelectItem>
                  <SelectItem value="Kustom...">Kustom...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warranty field — Add form */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Garansi (Opsional)</Label>
              <Select value={warrantyOption} onValueChange={(val) => { if (val) setWarrantyOption(val as any); }}>
                <SelectTrigger className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <SelectValue placeholder="Pilih Garansi" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectItem value="none">Tidak Ada Garansi</SelectItem>
                  <SelectItem value="3">3 Hari</SelectItem>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="14">14 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                  <SelectItem value="custom">Kustom...</SelectItem>
                </SelectContent>
              </Select>
              {warrantyOption === 'custom' && (
                <Input
                  type="number"
                  min={1}
                  value={warrantyCustomDays}
                  onChange={(e) => setWarrantyCustomDays(Number(e.target.value))}
                  placeholder="Jumlah hari garansi"
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-sm"
                />
              )}
              {warrantyOption !== 'none' && orderDate && (
                <p className="text-[10px] text-sky-500 dark:text-sky-400 pl-0.5">
                  Garansi berakhir: {formatIndonesianDate(getWarrantyExpiryDate(orderDate, resolveWarrantyDays(warrantyOption, warrantyCustomDays)))}
                </p>
              )}
            </div>

            {variation === 'Kustom...' && (
              <div className="grid grid-cols-2 gap-4 bg-neutral-50/50 dark:bg-neutral-950/40 p-3 rounded-lg border border-neutral-200 dark:border-neutral-900">
                <div className="space-y-1">
                  <Label className="text-[10px] text-neutral-500">Jumlah</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customVariationValue}
                    onChange={(e) => setCustomVariationValue(Number(e.target.value))}
                    className="h-8 text-xs bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-neutral-500">Satuan</Label>
                  <Select 
                    value={customVariationUnit} 
                    onValueChange={(val) => { if (val) setCustomVariationUnit(val as any); }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                      <SelectItem value="days">Hari</SelectItem>
                      <SelectItem value="weeks">Minggu</SelectItem>
                      <SelectItem value="months">Bulan</SelectItem>
                      <SelectItem value="years">Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Order</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Habis</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Harga Jual (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Modal (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={capitalPrice}
                  onChange={(e) => setCapitalPrice(Number(e.target.value))}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/30 text-xs flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Keuntungan Bersih:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                {formatRupiah(Number(sellingPrice) - Number(capitalPrice))}
              </strong>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Catatan (Opsional)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 p-3 text-xs focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 min-h-[80px]"
                placeholder="Tulis catatan di sini..."
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium shadow-md shadow-orange-900/10"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-805 dark:text-neutral-100 max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Edit Aplikasi</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Ubah data aplikasi premium.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 p-3.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Nama Aplikasi</Label>
              <Input
                value={editForm.appName}
                onChange={(e) => setEditForm({ ...editForm, appName: e.target.value })}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Akun (Email/User)</Label>
                <Input
                  value={editForm.account}
                  onChange={(e) => setEditForm({ ...editForm, account: e.target.value })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Password</Label>
                <Input
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Variasi / Durasi</Label>
              <Input
                value={editForm.variation}
                onChange={(e) => setEditForm({ ...editForm, variation: e.target.value })}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>

            {/* Warranty field — Edit form */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Garansi (Opsional)</Label>
              <Select value={editWarrantyOption} onValueChange={(val) => { if (val) setEditWarrantyOption(val as any); }}>
                <SelectTrigger className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <SelectValue placeholder="Pilih Garansi" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectItem value="none">Tidak Ada Garansi</SelectItem>
                  <SelectItem value="3">3 Hari</SelectItem>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="14">14 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                  <SelectItem value="custom">Kustom...</SelectItem>
                </SelectContent>
              </Select>
              {editWarrantyOption === 'custom' && (
                <Input
                  type="number"
                  min={1}
                  value={editWarrantyCustomDays}
                  onChange={(e) => setEditWarrantyCustomDays(Number(e.target.value))}
                  placeholder="Jumlah hari garansi"
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-sm"
                />
              )}
              {editWarrantyOption !== 'none' && editForm.orderDate && (
                <p className="text-[10px] text-sky-500 dark:text-sky-400 pl-0.5">
                  Garansi berakhir: {formatIndonesianDate(getWarrantyExpiryDate(editForm.orderDate, resolveWarrantyDays(editWarrantyOption, editWarrantyCustomDays)))}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Order</Label>
                <Input
                  type="date"
                  value={editForm.orderDate}
                  onChange={(e) => setEditForm({ ...editForm, orderDate: e.target.value })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Habis</Label>
                <Input
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Harga Jual (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Modal (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.capitalPrice}
                  onChange={(e) => setEditForm({ ...editForm, capitalPrice: Number(e.target.value) })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/30 text-xs flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Keuntungan Bersih:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                {formatRupiah(Number(editForm.sellingPrice) - Number(editForm.capitalPrice))}
              </strong>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Catatan (Opsional)</Label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="flex w-full rounded-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 p-3 text-xs focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 min-h-[80px]"
                placeholder="Tulis catatan di sini..."
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium shadow-md shadow-orange-900/10"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-800 dark:text-neutral-100 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Hapus Aplikasi</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Apakah Anda yakin ingin menghapus <strong>{currentApp?.app_name}</strong> secara permanen?
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 p-3.5 text-xs text-red-400 my-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-full border-red-600/30 hover:border-red-500 bg-red-950/10 hover:bg-red-950/30 text-red-300 justify-start px-4 h-12 text-left text-xs gap-3"
            >
              <Trash2 className="h-5 w-5 shrink-0" />
              <div>
                <strong className="block font-semibold">Hapus Permanen</strong>
                <span className="text-[10px] text-red-400/80">Data tidak dapat dikembalikan.</span>
              </div>
            </Button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
