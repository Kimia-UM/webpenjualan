'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { PrivatPremium } from '@/types';
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
  Plus,
  Search,
  Calendar,
  AlertCircle,
  Trash2,
  Loader2,
  Pencil,
  Briefcase,
  DollarSign,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export default function PrivatPremiumPage() {
  const [privatData, setPrivatData] = useState<PrivatPremium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentData, setCurrentData] = useState<PrivatPremium | null>(null);

  // Form Add states
  const [customerName, setCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [capitalPrice, setCapitalPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [warrantyActive, setWarrantyActive] = useState(false);
  const [warrantyDeduction, setWarrantyDeduction] = useState<number>(5000);

  // Form Edit states
  const [editForm, setEditForm] = useState({
    customerName: '',
    orderDate: '',
    sellingPrice: 0,
    capitalPrice: 0,
    notes: '',
    warrantyActive: false,
    warrantyDeduction: 5000,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    const dataRef = ref(db, 'privat_premium');
    setLoading(true);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as PrivatPremium[];
        setPrivatData(list.sort((a, b) => b.created_at - a.created_at));
      } else {
        setPrivatData([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching privat premium:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Helper: Calculate Warranty Refund
  const calculateWarrantyRefund = (orderDateStr: string, sellingPrice: number, deductionPerMonth: number = 0, isWarrantyActive: boolean = false) => {
    if (!isWarrantyActive || !orderDateStr) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderDate = new Date(orderDateStr);
    orderDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - orderDate.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    if (diffDays <= 10) {
      return sellingPrice; // 100% refund in first 10 days
    }
    
    const monthsUsed = Math.ceil((diffDays - 10) / 30);
    const deduction = monthsUsed * deductionPerMonth;
    const refund = Math.max(0, sellingPrice - deduction);
    
    return refund;
  };

  // Handle Add Open
  const handleAddOpen = () => {
    setCustomerName('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setSellingPrice(0);
    setCapitalPrice(0);
    setNotes('');
    setWarrantyActive(false);
    setWarrantyDeduction(5000);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Edit Open
  const handleEditOpen = (data: PrivatPremium) => {
    setCurrentData(data);
    setEditForm({
      customerName: data.customer_name,
      orderDate: data.order_date,
      sellingPrice: data.selling_price,
      capitalPrice: data.capital_price,
      notes: data.notes || '',
      warrantyActive: data.warranty_active || false,
      warrantyDeduction: data.warranty_deduction || 5000,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!customerName || !orderDate || sellingPrice === undefined || capitalPrice === undefined) {
      setFormError('Semua field wajib diisi (kecuali catatan).');
      setIsSubmitting(false);
      return;
    }

    const profit = Number(sellingPrice) - Number(capitalPrice);

    try {
      const dataRef = ref(db, 'privat_premium');
      const newDataRef = push(dataRef);
      await set(newDataRef, {
        customer_name: customerName.trim(),
        order_date: orderDate,
        selling_price: Number(sellingPrice),
        capital_price: Number(capitalPrice),
        profit: profit,
        notes: notes.trim(),
        warranty_active: warrantyActive,
        warranty_deduction: warrantyActive ? Number(warrantyDeduction) : null,
        created_at: Date.now()
      });
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error saving privat premium:', err);
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

    if (!currentData?.id) {
      setIsSubmitting(false);
      return;
    }

    if (!editForm.customerName || !editForm.orderDate || editForm.sellingPrice === undefined || editForm.capitalPrice === undefined) {
      setFormError('Semua field wajib diisi (kecuali catatan).');
      setIsSubmitting(false);
      return;
    }

    const profit = Number(editForm.sellingPrice) - Number(editForm.capitalPrice);

    try {
      await update(ref(db, `privat_premium/${currentData.id}`), {
        customer_name: editForm.customerName.trim(),
        order_date: editForm.orderDate,
        selling_price: Number(editForm.sellingPrice),
        capital_price: Number(editForm.capitalPrice),
        profit: profit,
        notes: editForm.notes.trim(),
        warranty_active: editForm.warrantyActive,
        warranty_deduction: editForm.warrantyActive ? Number(editForm.warrantyDeduction) : null,
      });
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Error updating privat premium:', err);
      setFormError(err.message || 'Gagal mengubah data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Permanent
  const handleDelete = async () => {
    if (!currentData?.id) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await remove(ref(db, `privat_premium/${currentData.id}`));
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error('Error deleting privat premium:', err);
      setFormError(err.message || 'Gagal menghapus data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters
  const filteredData = privatData.filter(item => {
    const searchLow = searchQuery.toLowerCase();
    const notesMatch = item.notes ? item.notes.toLowerCase().includes(searchLow) : false;
    return item.customer_name.toLowerCase().includes(searchLow) || notesMatch;
  });

  // Stats
  const totalTransaksi = privatData.length;
  const totalPendapatan = privatData.reduce((acc, curr) => acc + curr.selling_price, 0);
  const totalKeuntungan = privatData.reduce((acc, curr) => acc + curr.profit, 0);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
              Manajemen Privat Premium
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola pesanan privat premium dengan mudah.
            </p>
          </div>
          <Button
            onClick={handleAddOpen}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white gap-2 self-start sm:self-center font-medium shadow-md shadow-teal-900/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Transaksi</span>
          </Button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
              <Briefcase className="h-4 w-4 text-teal-600" />
              <h3 className="text-xs font-semibold">Total Transaksi</h3>
            </div>
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{totalTransaksi}</p>
          </div>
          <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
              <DollarSign className="h-4 w-4 text-teal-500" />
              <h3 className="text-xs font-semibold">Total Pendapatan</h3>
            </div>
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{formatRupiah(totalPendapatan)}</p>
          </div>
          <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-semibold">Total Keuntungan</h3>
            </div>
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{formatRupiah(totalKeuntungan)}</p>
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
              placeholder="Cari nama akun customer atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 focus:border-teal-500/50 focus:ring-teal-500/20"
            />
          </div>
        </div>

        {/* Content Table / Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              <p className="text-sm text-muted-foreground">Memuat data privat premium...</p>
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4 text-neutral-400 dark:text-neutral-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Tidak Ada Data</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1.5">
              {searchQuery 
                ? 'Tidak ada hasil pencarian yang cocok.' 
                : 'Belum ada data privat premium. Tambahkan data baru di atas.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-hidden bg-white dark:bg-neutral-950/20 transition-colors">
              <Table>
                <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                  <TableRow className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-transparent">
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold py-4">Nama/Akun Customer</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Tgl Order</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Harga Jual</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Modal</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Keuntungan</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Garansi</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold max-w-[200px]">Catatan</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right py-4 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((data) => (
                    <TableRow key={data.id} className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/10 transition-colors">
                      <TableCell className="font-semibold text-neutral-800 dark:text-neutral-200 py-3">{data.customer_name}</TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-neutral-405 dark:text-neutral-500" />
                          <span>{formatIndonesianDate(data.order_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-800 dark:text-neutral-300 font-medium">{formatRupiah(data.selling_price)}</TableCell>
                      <TableCell className="text-neutral-600 dark:text-neutral-400">{formatRupiah(data.capital_price)}</TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400 font-bold">{formatRupiah(data.profit)}</TableCell>
                      <TableCell>
                        {data.warranty_active ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Aktif
                            </span>
                            <span className="text-xs text-neutral-600 dark:text-neutral-300 font-semibold">
                              {formatRupiah(calculateWarrantyRefund(data.order_date, data.selling_price, data.warranty_deduction, data.warranty_active) || 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs max-w-[200px] truncate" title={data.notes}>
                        {data.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOpen(data)}
                            className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-neutral-700 hover:text-teal-600 dark:text-neutral-300 dark:hover:text-teal-400 border hover:border-teal-200 dark:hover:border-teal-900/40 gap-1.5 text-xs font-medium"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setCurrentData(data); setIsDeleteOpen(true); }}
                            className="h-8 w-8 text-neutral-500 dark:text-neutral-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Grid View */}
            <div className="grid gap-4 md:hidden">
              {filteredData.map((data) => (
                <div key={data.id} className="border border-neutral-200 dark:border-neutral-900 rounded-xl bg-white dark:bg-neutral-950/20 p-5 space-y-4 shadow-sm transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-neutral-800 dark:text-neutral-200 truncate">{data.customer_name}</h4>
                      <span className="text-[10px] text-neutral-400 block truncate mt-0.5">
                        {data.notes ? `Catatan: ${data.notes}` : 'Tidak ada catatan'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-neutral-200 dark:border-neutral-900/60 text-xs">
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Keuntungan / Order</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 block text-sm">{formatRupiah(data.profit)}</strong>
                      <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">{formatIndonesianDate(data.order_date)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Jual / Modal</span>
                      <strong className="text-neutral-700 dark:text-neutral-300 block">{formatRupiah(data.selling_price)}</strong>
                      <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">{formatRupiah(data.capital_price)}</span>
                    </div>
                  </div>

                  {data.warranty_active && (
                    <div className="flex items-center justify-between px-3 py-2 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-lg">
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Nilai Refund Saat Ini:
                      </span>
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                        {formatRupiah(calculateWarrantyRefund(data.order_date, data.selling_price, data.warranty_deduction, data.warranty_active) || 0)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end text-xs pt-1">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditOpen(data)}
                        className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setCurrentData(data); setIsDeleteOpen(true); }}
                        className="h-8 w-8 text-neutral-500 dark:text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-805 dark:text-neutral-100 max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Tambah Transaksi</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Masukkan data pesanan privat premium baru.
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
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Nama / Akun Customer</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>

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
                className="flex w-full rounded-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 p-3 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 min-h-[80px]"
                placeholder="Tulis catatan di sini..."
              />
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 bg-neutral-50/50 dark:bg-neutral-950/20">
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <input
                  type="checkbox"
                  id="add-warranty"
                  checked={warrantyActive}
                  onChange={(e) => setWarrantyActive(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-600"
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="add-warranty" className="text-xs font-semibold cursor-pointer">
                    Aktifkan Sistem Garansi
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    10 hari pertama refund 100%. Hari ke-11 ke atas akan dipotong per bulan.
                  </p>
                </div>
              </div>

              {warrantyActive && (
                <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Potongan Garansi (per Bulan)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={warrantyDeduction}
                    onChange={(e) => setWarrantyDeduction(Number(e.target.value))}
                    required={warrantyActive}
                    className="mt-1 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Misal: Rp5000. Jika klaim dilakukan setelah lewat 10 hari (masuk bulan ke-1), dana yang di-refund = Harga Jual - Rp5000.
                  </p>
                </div>
              )}
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
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium shadow-md shadow-teal-900/10"
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
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Edit Transaksi</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Ubah data transaksi privat premium.
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
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Nama / Akun Customer</Label>
              <Input
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>

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
                className="flex w-full rounded-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 p-3 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 min-h-[80px]"
                placeholder="Tulis catatan di sini..."
              />
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 bg-neutral-50/50 dark:bg-neutral-950/20">
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <input
                  type="checkbox"
                  id="edit-warranty"
                  checked={editForm.warrantyActive}
                  onChange={(e) => setEditForm({ ...editForm, warrantyActive: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-600"
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="edit-warranty" className="text-xs font-semibold cursor-pointer">
                    Aktifkan Sistem Garansi
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    10 hari pertama refund 100%. Hari ke-11 ke atas akan dipotong per bulan.
                  </p>
                </div>
              </div>

              {editForm.warrantyActive && (
                <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Potongan Garansi (per Bulan)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.warrantyDeduction}
                    onChange={(e) => setEditForm({ ...editForm, warrantyDeduction: Number(e.target.value) })}
                    required={editForm.warrantyActive}
                    className="mt-1 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Misal: Rp5000. Jika klaim dilakukan setelah lewat 10 hari (masuk bulan ke-1), dana yang di-refund = Harga Jual - Rp5000.
                  </p>
                </div>
              )}
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
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium shadow-md shadow-teal-900/10"
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
            <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Hapus Transaksi</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Apakah Anda yakin ingin menghapus <strong>{currentData?.customer_name}</strong> secara permanen?
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
