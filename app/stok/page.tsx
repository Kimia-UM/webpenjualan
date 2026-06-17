'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { HostAccount, Subscription, BillingType, HostStatus } from '@/types';
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
  Pencil, 
  Trash2, 
  Loader2, 
  Search, 
  Database,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

export default function StokPage() {
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentHost, setCurrentHost] = useState<HostAccount | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('bulanan');
  const [totalSlot, setTotalSlot] = useState(5);
  const [activeUntil, setActiveUntil] = useState('');
  const [status, setStatus] = useState<HostStatus>('proses');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen to host accounts and subscriptions from Firebase RTDB
  useEffect(() => {
    const hostRef = ref(db, 'host_accounts');
    const subsRef = ref(db, 'subscriptions');

    setLoading(true);

    const unsubscribeHosts = onValue(hostRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as HostAccount[];
        setHostAccounts(list.sort((a, b) => b.created_at - a.created_at));
      } else {
        setHostAccounts([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching host accounts:', error);
      setLoading(false);
    });

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
    });

    return () => {
      unsubscribeHosts();
      unsubscribeSubs();
    };
  }, []);

  // Calculate sisa slot
  const getSisaSlot = (hostId: string, totalSlot: number) => {
    const activeSubs = subscriptions.filter(sub => {
      if (sub.host_account_id !== hostId) return false;
      
      // Calculate status dynamically based on expiry date
      if (!sub.expiry_date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(sub.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      
      return expiry.getTime() >= today.getTime(); // Not expired (active or expiring)
    });
    return totalSlot - activeSubs.length;
  };

  // Open form for adding new host
  const handleAddOpen = () => {
    setCurrentHost(null);
    setEmail('');
    setBillingType('bulanan');
    setTotalSlot(5);
    setActiveUntil('');
    setStatus('proses');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open form for editing existing host
  const handleEditOpen = (host: HostAccount) => {
    setCurrentHost(host);
    setEmail(host.account_email);
    setBillingType(host.billing_type);
    setTotalSlot(host.total_slot);
    setActiveUntil(host.active_until);
    setStatus(host.status);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open delete confirmation
  const handleDeleteOpen = (host: HostAccount) => {
    setCurrentHost(host);
    setIsDeleteOpen(true);
  };

  // Handle submit form (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!email || !billingType || !totalSlot || !activeUntil || !status) {
      setFormError('Semua field wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (currentHost?.id) {
        // Edit mode
        const hostRef = ref(db, `host_accounts/${currentHost.id}`);
        await update(hostRef, {
          account_email: email.trim().toLowerCase(),
          billing_type: billingType,
          total_slot: Number(totalSlot),
          active_until: activeUntil,
          status: status
        });
      } else {
        // Add mode
        const hostRef = ref(db, 'host_accounts');
        const newHostRef = push(hostRef);
        await set(newHostRef, {
          account_email: email.trim().toLowerCase(),
          billing_type: billingType,
          total_slot: Number(totalSlot),
          active_until: activeUntil,
          status: status,
          created_at: Date.now()
        });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error saving host account:', err);
      setFormError(err.message || 'Gagal menyimpan data ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete host
  const handleDelete = async () => {
    if (!currentHost?.id) return;
    setIsSubmitting(true);
    setFormError(null);

    // Check if there are active subscriptions connected to this host account
    const activeSubs = subscriptions.filter(
      sub => sub.host_account_id === currentHost.id && sub.status !== 'habis'
    );

    if (activeSubs.length > 0) {
      setFormError(`Gagal menghapus! Masih ada ${activeSubs.length} customer aktif terhubung ke akun induk ini.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const hostRef = ref(db, `host_accounts/${currentHost.id}`);
      await remove(hostRef);
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error('Error deleting host account:', err);
      setFormError(err.message || 'Gagal menghapus data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Indonesian date
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

  // Filter host accounts based on search query
  const filteredHosts = hostAccounts.filter(host => 
    host.account_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    host.billing_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    host.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Manajemen Stok (Host Accounts)
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Kelola akun induk premium beserta sisa slot dan masa aktif.
            </p>
          </div>
          <Button
            onClick={handleAddOpen}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white gap-2 self-start sm:self-center font-medium shadow-md shadow-purple-900/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Akun</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6 max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
            <Search className="h-4 w-4" />
          </div>
          <Input
            type="text"
            placeholder="Cari email akun induk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-neutral-900/40 border-neutral-800 text-neutral-200 focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {/* Content Table / Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-neutral-500">Memuat data akun...</p>
            </div>
          </div>
        ) : filteredHosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-2xl p-16 text-center bg-neutral-950/10">
            <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4 text-neutral-600">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-neutral-300 text-lg">Tidak Ada Data Akun</h3>
            <p className="text-sm text-neutral-500 max-w-sm mt-1.5">
              {searchQuery ? 'Tidak ada hasil pencarian yang cocok.' : 'Belum ada akun induk yang terdaftar. Tambahkan akun baru sekarang.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-neutral-900 rounded-xl overflow-hidden bg-neutral-950/20">
              <Table>
                <TableHeader className="bg-neutral-950/60">
                  <TableRow className="border-b border-neutral-900 hover:bg-transparent">
                    <TableHead className="text-neutral-400 font-semibold py-4">Email Akun Induk</TableHead>
                    <TableHead className="text-neutral-400 font-semibold">Tipe Billing</TableHead>
                    <TableHead className="text-neutral-400 font-semibold text-center">Total Slot</TableHead>
                    <TableHead className="text-neutral-400 font-semibold text-center">Sisa Slot</TableHead>
                    <TableHead className="text-neutral-400 font-semibold">Masa Aktif</TableHead>
                    <TableHead className="text-neutral-400 font-semibold">Status</TableHead>
                    <TableHead className="text-neutral-400 font-semibold text-right py-4 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHosts.map((host) => {
                    const sisaSlotValue = host.id ? getSisaSlot(host.id, host.total_slot) : host.total_slot;
                    return (
                      <TableRow key={host.id} className="border-b border-neutral-900 hover:bg-neutral-900/10 transition-colors">
                        <TableCell className="font-medium text-neutral-200 py-4.5">{host.account_email}</TableCell>
                        <TableCell className="capitalize text-neutral-300">{host.billing_type}</TableCell>
                        <TableCell className="text-center text-neutral-300">{host.total_slot}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
                            sisaSlotValue <= 0 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                              : sisaSlotValue === 1 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {sisaSlotValue} Slot
                          </span>
                        </TableCell>
                        <TableCell className="text-neutral-300">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                            <span>{formatIndonesianDate(host.active_until)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            host.status === 'aktif'
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                              : host.status === 'proses'
                                ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700/60'
                          }`}>
                            {host.status === 'aktif' && <CheckCircle2 className="h-3 w-3" />}
                            {host.status === 'proses' && <Clock className="h-3 w-3" />}
                            {host.status === 'nonaktif' && <XCircle className="h-3 w-3" />}
                            <span className="capitalize">{host.status}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-4.5 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditOpen(host)}
                              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOpen(host)}
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/20"
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
              {filteredHosts.map((host) => {
                const sisaSlotValue = host.id ? getSisaSlot(host.id, host.total_slot) : host.total_slot;
                return (
                  <div key={host.id} className="border border-neutral-900 rounded-xl bg-neutral-950/20 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="overflow-hidden">
                        <h4 className="font-semibold text-neutral-200 truncate">{host.account_email}</h4>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                            {host.billing_type}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                            host.status === 'aktif'
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                              : host.status === 'proses'
                                ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700/60'
                          }`}>
                            <span className="capitalize">{host.status}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOpen(host)}
                          className="h-8 w-8 text-neutral-400 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOpen(host)}
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-neutral-900/60 text-xs">
                      <div>
                        <span className="text-neutral-500 block mb-1">Total Slot</span>
                        <strong className="text-neutral-300">{host.total_slot} Slot</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500 block mb-1">Sisa Slot</span>
                        <strong className={`font-semibold px-2 py-0.5 rounded-full ${
                          sisaSlotValue <= 0 
                            ? 'bg-red-500/10 text-red-400' 
                            : sisaSlotValue === 1 
                              ? 'bg-amber-500/10 text-amber-400' 
                              : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {sisaSlotValue} Slot
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <span>Masa Aktif: {formatIndonesianDate(host.active_until)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-neutral-800 bg-[#0c0c0e] text-neutral-100 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-100">
              {currentHost ? 'Edit Akun Induk' : 'Tambah Akun Induk'}
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs">
              Isi data detail akun induk premium di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4.5 py-2">
            {formError && (
              <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 p-3.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="form-email" className="text-xs font-semibold text-neutral-300">Email Akun Induk</Label>
              <Input
                id="form-email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-neutral-950 border-neutral-800 focus:border-purple-500/50 text-neutral-100 placeholder:text-neutral-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-billing" className="text-xs font-semibold text-neutral-300">Tipe Billing</Label>
                <Select 
                  value={billingType} 
                  onValueChange={(val) => { if (val) setBillingType(val as BillingType); }}
                >
                  <SelectTrigger id="form-billing" className="bg-neutral-950 border-neutral-800 text-neutral-200">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                    <SelectItem value="harian">Harian</SelectItem>
                    <SelectItem value="mingguan">Mingguan</SelectItem>
                    <SelectItem value="bulanan">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-slots" className="text-xs font-semibold text-neutral-300">Total Slot</Label>
                <Input
                  id="form-slots"
                  type="number"
                  min={1}
                  max={100}
                  value={totalSlot}
                  onChange={(e) => setTotalSlot(Number(e.target.value))}
                  required
                  className="bg-neutral-950 border-neutral-800 focus:border-purple-500/50 text-neutral-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-active" className="text-xs font-semibold text-neutral-300">Masa Aktif</Label>
                <Input
                  id="form-active"
                  type="date"
                  value={activeUntil}
                  onChange={(e) => setActiveUntil(e.target.value)}
                  required
                  className="bg-neutral-950 border-neutral-800 focus:border-purple-500/50 text-neutral-100 block w-full custom-date-picker"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-status" className="text-xs font-semibold text-neutral-300">Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(val) => { if (val) setStatus(val as HostStatus); }}
                >
                  <SelectTrigger id="form-status" className="bg-neutral-950 border-neutral-800 text-neutral-200">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                    <SelectItem value="proses">Proses</SelectItem>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-400 hover:text-white hover:bg-neutral-900/60"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-purple-900/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Akun'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-neutral-800 bg-[#0c0c0e] text-neutral-100 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-100">Hapus Akun Induk?</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs">
              Tindakan ini tidak dapat dibatalkan. Akun <strong>{currentHost?.account_email}</strong> akan dihapus secara permanen dari database.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 p-3.5 text-xs text-red-400 my-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="text-neutral-400 hover:text-white hover:bg-neutral-900/60"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-500 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Ya, Hapus'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
