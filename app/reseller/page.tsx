'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Reseller } from '@/types';
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
  Plus,
  Handshake,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  Users,
  AlertCircle,
  Package,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

// â”€â”€â”€ Color palette untuk card reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CARD_COLORS = [
  { bg: 'bg-rose-100 dark:bg-rose-900/30', icon: 'text-rose-500', border: 'hover:border-rose-300 dark:hover:border-rose-700' },
  { bg: 'bg-violet-100 dark:bg-violet-900/30', icon: 'text-violet-500', border: 'hover:border-violet-300 dark:hover:border-violet-700' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-500', border: 'hover:border-blue-300 dark:hover:border-blue-700' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'text-emerald-500', border: 'hover:border-emerald-300 dark:hover:border-emerald-700' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-500', border: 'hover:border-amber-300 dark:hover:border-amber-700' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', icon: 'text-teal-500', border: 'hover:border-teal-300 dark:hover:border-teal-700' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', icon: 'text-orange-500', border: 'hover:border-orange-300 dark:hover:border-orange-700' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-500', border: 'hover:border-indigo-300 dark:hover:border-indigo-700' },
];

// Helper: inisial dari nama
const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function ResellerPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats agregasi
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalPS, setTotalPS] = useState(0);
  const [totalPSRevenue, setTotalPSRevenue] = useState(0);

  // Dialog Add
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Reseller | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Dialog Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reseller | null>(null);

  // â”€â”€ Fetch resellers & stats dari Firebase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const resellersRef = ref(db, 'resellers');
    const ordersRef = ref(db, 'reseller_orders');
    const subsRef = ref(db, 'subscriptions');

    setLoading(true);
    const unsubscribeRes = onValue(resellersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as Reseller[];
        setResellers(list.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setResellers([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching resellers:', error);
      setLoading(false);
    });

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let count = 0;
        let profit = 0;
        Object.values(data).forEach((resellerOrders: any) => {
          if (resellerOrders) {
            Object.values(resellerOrders).forEach((order: any) => {
              count++;
              profit += (order.profit || 0);
            });
          }
        });
        setTotalOrders(count);
        setTotalProfit(profit);
      } else {
        setTotalOrders(0);
        setTotalProfit(0);
      }
    });

    const unsubscribeSubs = onValue(subsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let count = 0;
        let rev = 0;
        Object.values(data).forEach((sub: any) => {
          if (sub.reseller_id) {
            count++;
            rev += (sub.price || 0);
          }
        });
        setTotalPS(count);
        setTotalPSRevenue(rev);
      } else {
        setTotalPS(0);
        setTotalPSRevenue(0);
      }
    });

    return () => {
      unsubscribeRes();
      unsubscribeOrders();
      unsubscribeSubs();
    };
  }, []);

  // â”€â”€ Tambah Reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAddOpen = () => {
    setAddName('');
    setAddError(null);
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addName.trim()) {
      setAddError('Nama reseller tidak boleh kosong.');
      return;
    }
    setIsSubmitting(true);
    try {
      const resellersRef = ref(db, 'resellers');
      const newRef = push(resellersRef);
      await set(newRef, {
        name: addName.trim(),
        created_at: Date.now(),
      });
      setIsAddOpen(false);
    } catch (err: any) {
      setAddError(err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // â”€â”€ Edit Reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEditOpen = (reseller: Reseller, e: React.MouseEvent) => {
    e.preventDefault(); // Cegah navigasi ke detail page
    e.stopPropagation();
    setEditTarget(reseller);
    setEditName(reseller.name);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Nama reseller tidak boleh kosong.');
      return;
    }
    if (!editTarget?.id) return;
    setIsSubmitting(true);
    try {
      await update(ref(db, `resellers/${editTarget.id}`), {
        name: editName.trim(),
      });
      setIsEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengubah data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // â”€â”€ Hapus Reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeleteOpen = (reseller: Reseller, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(reseller);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsSubmitting(true);
    try {
      // Hapus reseller dan semua order-nya
      await remove(ref(db, `resellers/${deleteTarget.id}`));
      await remove(ref(db, `reseller_orders/${deleteTarget.id}`));
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error('Error deleting reseller:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <Handshake className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Manajemen Reseller
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Kelola daftar reseller. Klik kartu untuk masuk ke ruang khusus reseller.
            </p>
          </div>
        </div>
        <Button
          onClick={handleAddOpen}
          className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white gap-2 self-start sm:self-center font-medium shadow-md shadow-rose-900/10"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Reseller</span>
        </Button>
      </div>

      {/* â”€â”€ Stats Ringkasan â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Handshake className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Reseller</span>
          </div>
          <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{resellers.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Package className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Pesanan</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/10 p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">PremiumShare</span>
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{totalPS}</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Keuntungan Bersih</span>
          </div>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalProfit + totalPSRevenue)}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Memuat data reseller...</p>
          </div>
        </div>
      ) : resellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
          <div className="h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-rose-500" />
          </div>
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Belum Ada Reseller</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-1.5">
            Tambahkan reseller pertama Anda dengan mengklik tombol "Tambah Reseller" di atas.
          </p>
          <Button
            onClick={handleAddOpen}
            className="mt-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Reseller
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {resellers.map((reseller, idx) => {
            const color = CARD_COLORS[idx % CARD_COLORS.length];
            const initials = getInitials(reseller.name);
            return (
              <div key={reseller.id} className="relative group">
                <Link
                  href={`/reseller/${reseller.id}`}
                  className="outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 rounded-2xl dark:focus:ring-offset-neutral-950 block"
                >
                  <div
                    className={`flex flex-col h-full bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${color.border}`}
                  >
                    <div className="flex items-start justify-between mb-5">
                      {/* Avatar Inisial */}
                      <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                        <span className={`text-lg font-bold ${color.icon}`}>{initials}</span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-900 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <ChevronRight className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1 truncate">
                      {reseller.name}
                    </h3>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      Bergabung {new Date(reseller.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </Link>

                {/* Action buttons â€” muncul saat hover card */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <button
                    onClick={(e) => handleEditOpen(reseller, e)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-700 transition-colors shadow-sm"
                    title="Edit nama reseller"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteOpen(reseller, e)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-colors shadow-sm"
                    title="Hapus reseller"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* â”€â”€ Dialog Tambah Reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-900 dark:text-neutral-100 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tambah Reseller</DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
              Masukkan nama reseller. Setelah ditambahkan, klik kartu untuk mengelola pesanannya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-reseller-name" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nama Reseller <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-reseller-name"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  autoFocus
                  className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              {addError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="border-neutral-200 dark:border-neutral-800"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSubmitting ? 'Menyimpan...' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Dialog Edit Reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-900 dark:text-neutral-100 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Nama Reseller</DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
              Ubah nama reseller yang sudah ada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-reseller-name" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nama Reseller <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-reseller-name"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              {editError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-neutral-200 dark:border-neutral-800"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Dialog Hapus Reseller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-900 dark:text-neutral-100 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Hapus Reseller</DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
              Tindakan ini tidak dapat dibatalkan. Semua data pesanan milik reseller ini juga akan ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                Anda akan menghapus reseller: <strong>{deleteTarget?.name}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-neutral-200 dark:border-neutral-800"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isSubmitting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
