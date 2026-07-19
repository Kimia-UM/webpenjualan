'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { HostAccount, Subscription, SubscriptionStatus } from '@/types';
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
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Trash2,
  Loader2,
  CreditCard,
  Pencil,
  TrendingUp,
  DollarSign
} from 'lucide-react';


import { use } from 'react';

export default function ResellerWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id: resellerId } = use(params);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<string[]>(['QRIS']);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);

  // Form Edit states
  const [editForm, setEditForm] = useState({
    customerEmail: '',
    hostAccountId: '',
    startDate: '',
    expiryDate: '',
    paymentChannel: '',
    price: 0,
  });

  // Form Add states
  const [customerEmail, setCustomerEmail] = useState('');
  const [hostAccountId, setHostAccountId] = useState('');
  const [durationPreset, setDurationPreset] = useState('1_bulan');
  const [customDurationValue, setCustomDurationValue] = useState(1);
  const [customDurationUnit, setCustomDurationUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [paymentChannel, setPaymentChannel] = useState('QRIS');
  const [newPaymentChannel, setNewPaymentChannel] = useState('');
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Renew states
  const [renewHostAccountId, setRenewHostAccountId] = useState('');
  const [renewDurationPreset, setRenewDurationPreset] = useState('1_bulan');
  const [renewCustomDurationValue, setRenewCustomDurationValue] = useState(1);
  const [renewCustomDurationUnit, setRenewCustomDurationUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [renewPaymentChannel, setRenewPaymentChannel] = useState('QRIS');
  const [renewPrice, setRenewPrice] = useState<number>();
  const [renewFromOldExpiry, setRenewFromOldExpiry] = useState('true'); // 'true' = start from old expiry, 'false' = start from today

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load subscriptions, host accounts, and payment channels
  useEffect(() => {
    const subsRef = ref(db, 'subscriptions');
    const hostRef = ref(db, 'host_accounts');
    const channelsRef = ref(db, 'payment_channels');

    setLoading(true);

    const unsubscribeSubs = onValue(subsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as Subscription[];
        setSubscriptions(list.sort((a, b) => b.created_at - a.created_at));
      } else {
        setSubscriptions([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching subscriptions:', error);
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
    });

    const unsubscribeChannels = onValue(channelsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Force to QRIS as per user request
          setPaymentChannels(['QRIS']);
        } else {
          setPaymentChannels(['QRIS']);
        }
      });

    return () => {
      unsubscribeSubs();
      unsubscribeHosts();
      unsubscribeChannels();
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
    
    if (diffDays < 0) {
      return 'habis';
    } else if (diffDays <= 1) {
      return 'akan_habis';
    } else {
      return 'aktif';
    }
  };

  // Helper: Get Host Account remaining slots
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

  // Helper: Calculate Expiry Date based on duration
  const calculateExpiry = (
    start: string,
    preset: string,
    customVal: number,
    customUnit: 'days' | 'weeks' | 'months' | 'years'
  ): string => {
    const date = new Date(start);
    if (preset === '3_hari') {
      date.setDate(date.getDate() + 3);
    } else if (preset === '1_minggu') {
      date.setDate(date.getDate() + 7);
    } else if (preset === '1_bulan') {
      date.setMonth(date.getMonth() + 1);
    } else if (preset === '3_bulan') {
      date.setMonth(date.getMonth() + 3);
    } else if (preset === '9_bulan') {
      date.setMonth(date.getMonth() + 9);
    } else if (preset === '1_tahun') {
      date.setFullYear(date.getFullYear() + 1);
    } else if (preset === 'custom') {
      if (customUnit === 'days') date.setDate(date.getDate() + customVal);
      else if (customUnit === 'weeks') date.setDate(date.getDate() + (customVal * 7));
      else if (customUnit === 'months') date.setMonth(date.getMonth() + customVal);
      else if (customUnit === 'years') date.setFullYear(date.getFullYear() + customVal);
    }
    return date.toISOString().split('T')[0];
  };

  // Helper: Get label text from duration preset
  const getDurationLabel = (
    preset: string,
    customVal: number,
    customUnit: string
  ): string => {
    if (preset === '3_hari') return '3 hari';
    if (preset === '1_minggu') return '1 minggu';
    if (preset === '1_bulan') return '1 bulan';
    if (preset === '3_bulan') return '3 bulan';
    if (preset === '9_bulan') return '9 bulan';
    if (preset === '1_tahun') return '1 tahun';
    
    const unitTranslate = {
      days: 'hari',
      weeks: 'minggu',
      months: 'bulan',
      years: 'tahun'
    }[customUnit] || '';
    
    return `${customVal} ${unitTranslate}`;
  };

  // Pre-calculated Expiry Date for ADD form preview
  const calculatedExpiryPreview = calculateExpiry(
    startDate,
    durationPreset,
    customDurationValue,
    customDurationUnit
  );

  // Pre-calculated Expiry Date for RENEW form preview
  const getRenewCalculatedExpiry = (): string => {
    if (!currentSub) return '';
    const baseDate = renewFromOldExpiry === 'true' 
      ? (new Date(currentSub.expiry_date) > new Date() ? currentSub.expiry_date : new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
    
    return calculateExpiry(
      baseDate,
      renewDurationPreset,
      renewCustomDurationValue,
      renewCustomDurationUnit
    );
  };

  // Active host accounts with slot available
  const availableHosts = hostAccounts.filter(h => h.status === 'aktif' && getHostSisaSlot(h) > 0);

  // Open Add Form Dialog
  const handleAddOpen = () => {
    setCustomerEmail('');
    setFormError(null);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDurationPreset('1_bulan');
    setCustomDurationValue(1);
    setCustomDurationUnit('months');
    setPaymentChannel('QRIS');
    setPrice(15000); // default guess
    
    // Auto-select first host that has slot
    if (availableHosts.length > 0) {
      setHostAccountId(availableHosts[0].id || '');
    } else {
      setHostAccountId('');
    }
    
    setIsFormOpen(true);
  };

  // Open Renew Dialog
  const handleRenewOpen = (sub: Subscription) => {
    setCurrentSub(sub);
    setRenewHostAccountId(sub.host_account_id);
    setRenewDurationPreset('1_bulan');
    setRenewCustomDurationValue(1);
    setRenewCustomDurationUnit('months');
    setRenewPaymentChannel(sub.payment_channel);
    setRenewPrice(sub.price);
    setRenewFromOldExpiry('true');
    setFormError(null);
    setIsRenewOpen(true);
  };

  // Open Delete Confirmation
  const handleDeleteOpen = (sub: Subscription) => {
    setCurrentSub(sub);
    setFormError(null);
    setIsDeleteOpen(true);
  };

  // Open Edit Dialog
  const handleEditOpen = (sub: Subscription) => {
    setCurrentSub(sub);
    setEditForm({
      customerEmail: sub.customer_email,
      hostAccountId: sub.host_account_id,
      startDate: sub.start_date || '',
      expiryDate: sub.expiry_date || '',
      paymentChannel: sub.payment_channel,
      price: sub.price,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!currentSub || !currentSub.id) {
      setIsSubmitting(false);
      return;
    }

    if (!editForm.customerEmail || !editForm.hostAccountId || !editForm.paymentChannel || editForm.price === undefined || !editForm.startDate || !editForm.expiryDate) {
      setFormError('Semua field wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    // Verify host account changes if applicable
    if (editForm.hostAccountId !== currentSub.host_account_id) {
      const targetHost = hostAccounts.find(h => h.id === editForm.hostAccountId);
      if (!targetHost) {
        setFormError('Akun induk baru tidak ditemukan.');
        setIsSubmitting(false);
        return;
      }
      const sisa = getHostSisaSlot(targetHost);
      if (sisa <= 0) {
        setFormError('Gagal! Akun induk baru sudah penuh (0 slot tersisa).');
        setIsSubmitting(false);
        return;
      }
    }

    // Calculate duration_label based on editForm.startDate and editForm.expiryDate
    const diffTime = new Date(editForm.expiryDate).getTime() - new Date(editForm.startDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let durationLabel = `${diffDays} hari`;
    if (diffDays > 0) {
      if (diffDays % 365 === 0) {
        durationLabel = `${diffDays / 365} tahun`;
      } else if (diffDays % 30 === 0) {
        durationLabel = `${diffDays / 30} bulan`;
      } else if (diffDays % 7 === 0) {
        durationLabel = `${diffDays / 7} minggu`;
      }
    }

    const editedFields = {
      customer_email: editForm.customerEmail.trim().toLowerCase(),
      host_account_id: editForm.hostAccountId,
      duration_label: durationLabel,
      start_date: editForm.startDate,
      expiry_date: editForm.expiryDate,
      payment_channel: editForm.paymentChannel,
      price: Number(editForm.price),
      status: getSubscriptionStatus(editForm.expiryDate)
    };

    try {
      await update(ref(db, `subscriptions/${currentSub.id}`), { ...editedFields });
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      setFormError(err.message || 'Gagal mengubah data subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Inline Payment Channel
  const handleAddPaymentChannel = async () => {
    if (!newPaymentChannel.trim()) return;
    const cleanChannel = newPaymentChannel.trim();
    if (paymentChannels.includes(cleanChannel)) {
      setFormError('Metode pembayaran sudah ada.');
      return;
    }
    
    try {
      const channelsRef = ref(db, 'payment_channels');
      const updated = [...paymentChannels, cleanChannel];
      await set(channelsRef, updated);
      setPaymentChannel(cleanChannel);
      setRenewPaymentChannel(cleanChannel);
      setNewPaymentChannel('');
      setShowAddChannel(false);
    } catch (error) {
      console.error('Error adding payment channel:', error);
    }
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!customerEmail || !hostAccountId || !paymentChannel || price === undefined) {
      setFormError('Semua field wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    // Double check host slot availability
    const selectedHost = hostAccounts.find(h => h.id === hostAccountId);
    if (!selectedHost) {
      setFormError('Akun induk tidak ditemukan.');
      setIsSubmitting(false);
      return;
    }

    const sisa = getHostSisaSlot(selectedHost);
    if (sisa <= 0) {
      setFormError('Gagal! Akun induk ini sudah penuh (0 slot tersisa).');
      setIsSubmitting(false);
      return;
    }

    const expiry = calculatedExpiryPreview;
    const durationLabel = getDurationLabel(durationPreset, customDurationValue, customDurationUnit);

    try {
      const subsRef = ref(db, 'subscriptions');
      const newSubRef = push(subsRef);
      await set(newSubRef, {
        customer_email: customerEmail.trim().toLowerCase(),
        host_account_id: hostAccountId,
        duration_label: durationLabel,
        start_date: startDate,
        expiry_date: expiry,
        payment_channel: paymentChannel,
        price: Number(price),
        status: getSubscriptionStatus(expiry),
        created_at: Date.now()
      });
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error saving subscription:', err);
      setFormError(err.message || 'Gagal menyimpan subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Renew Submit
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!currentSub || !renewHostAccountId || !renewPaymentChannel || renewPrice === undefined) {
      setFormError('Semua field wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    // If host account is changing, verify the new host has slots
    if (renewHostAccountId !== currentSub.host_account_id) {
      const targetHost = hostAccounts.find(h => h.id === renewHostAccountId);
      if (!targetHost) {
        setFormError('Akun induk baru tidak ditemukan.');
        setIsSubmitting(false);
        return;
      }
      const sisa = getHostSisaSlot(targetHost);
      if (sisa <= 0) {
        setFormError('Gagal! Akun induk baru sudah penuh (0 slot tersisa).');
        setIsSubmitting(false);
        return;
      }
    }

    const expiry = getRenewCalculatedExpiry();
    const durationLabel = getDurationLabel(renewDurationPreset, renewCustomDurationValue, renewCustomDurationUnit);

    try {
      // 1. Mark OLD subscription as "habis" immediately, so the slot of the old host is freed
      if (currentSub.id) {
        const oldSubRef = ref(db, `subscriptions/${currentSub.id}`);
        await update(oldSubRef, {
          status: 'habis'
        });
      }

      // 2. Create NEW subscription for the extension
      const subsRef = ref(db, 'subscriptions');
      const newSubRef = push(subsRef);
      const baseStartDate = renewFromOldExpiry === 'true'
        ? (new Date(currentSub.expiry_date) > new Date() ? currentSub.expiry_date : new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0];

      await set(newSubRef, {
        customer_email: currentSub.customer_email,
        host_account_id: renewHostAccountId,
        duration_label: durationLabel,
        start_date: baseStartDate,
        expiry_date: expiry,
        payment_channel: renewPaymentChannel,
        price: Number(renewPrice),
        status: getSubscriptionStatus(expiry),
        created_at: Date.now()
      });

      setIsRenewOpen(false);
    } catch (err: any) {
      console.error('Error renewing subscription:', err);
      setFormError(err.message || 'Gagal melakukan perpanjangan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Subscription (or set status to habis)
  const handleDelete = async (permanent: boolean) => {
    if (!currentSub?.id) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (permanent) {
        // Delete permanently
        const subRef = ref(db, `subscriptions/${currentSub.id}`);
        await remove(subRef);
      } else {
        // Deactivate (Set status to 'habis')
        const subRef = ref(db, `subscriptions/${currentSub.id}`);
        await update(subRef, {
          status: 'habis'
        });
      }
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error('Error handling subscription deactivation:', err);
      setFormError(err.message || 'Gagal mengubah data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter subscriptions based on search query and status filter
  const filteredSubs = subscriptions.filter(sub => {
    // 1. Search filter
    const matchesSearch = sub.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getHostEmail(sub.host_account_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sub.payment_channel.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Status filter
    if (statusFilter === 'semua') return true;
    
    const calculatedStatus = getSubscriptionStatus(sub.expiry_date);
    return calculatedStatus === statusFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
              Manajemen Customer (Subscriptions)
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Pantau durasi subscription customer aktif, habis, dan lakukan perpanjangan slot.
            </p>
          </div>
          <Button
            onClick={handleAddOpen}
            disabled={hostAccounts.length === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white gap-2 self-start sm:self-center font-medium shadow-md shadow-purple-900/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Customer</span>
          </Button>
        </div>

        {/* Individual Dashboard â€” Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Total Customer</span>
            </div>
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{subscriptions.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Aktif</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {subscriptions.filter(s => getSubscriptionStatus(s.expiry_date) === 'aktif').length}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Akan Habis</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {subscriptions.filter(s => getSubscriptionStatus(s.expiry_date) === 'akan_habis').length}
            </p>
          </div>
          <div className="rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/10 p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Total Pendapatan</span>
            </div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(subscriptions.reduce((sum, s) => sum + (s.price || 0), 0))}
            </p>
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
              placeholder="Cari email customer atau akun induk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 focus:border-purple-500/50 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-neutral-500 dark:text-neutral-500 dark:text-neutral-400 font-semibold shrink-0">Filter Status:</span>
            <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-700 dark:text-neutral-300">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="akan_habis">Akan Habis (â‰¤1 hari)</SelectItem>
                <SelectItem value="habis">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Table / Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">Memuat data customer...</p>
            </div>
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4 text-neutral-400 dark:text-neutral-600">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Tidak Ada Data Customer</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1.5">
              {searchQuery || statusFilter !== 'semua' 
                ? 'Tidak ada hasil filter/pencarian yang cocok.' 
                : 'Belum ada customer terdaftar. Daftarkan customer baru di atas.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-hidden bg-white dark:bg-neutral-950/20 transition-colors">
              <Table>
                <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                  <TableRow className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-transparent">
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold py-4">Email Customer</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Akun Induk</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Durasi</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Tanggal Habis</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Pembayaran</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Harga</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold">Status</TableHead>
                    <TableHead className="text-neutral-500 dark:text-neutral-400 font-semibold text-right py-4 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.map((sub) => {
                    const currentStatus = getSubscriptionStatus(sub.expiry_date);
                    return (
                      <TableRow key={sub.id} className="border-b border-neutral-200 dark:border-neutral-900 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/10 transition-colors">
                        <TableCell className="font-medium text-neutral-800 dark:text-neutral-100 py-4.5">{sub.customer_email}</TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-400 text-xs">{getHostEmail(sub.host_account_id)}</TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-700 dark:text-neutral-300">{sub.duration_label}</TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-700 dark:text-neutral-300">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-neutral-405 dark:text-neutral-500" />
                            <span>{formatIndonesianDate(sub.expiry_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors">
                            {sub.payment_channel}
                          </span>
                        </TableCell>
                        <TableCell className="text-neutral-800 dark:text-neutral-800 dark:text-neutral-300 font-medium">{formatRupiah(sub.price)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
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
                        <TableCell className="text-right py-4.5 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenewOpen(sub)}
                              className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-neutral-700 hover:text-purple-600 dark:text-neutral-300 dark:hover:text-purple-400 border hover:border-purple-200 dark:hover:border-purple-900/40 gap-1.5 text-xs font-medium"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Perpanjang</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOpen(sub)}
                              className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-neutral-700 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400 border hover:border-blue-200 dark:hover:border-blue-900/40 gap-1.5 text-xs font-medium"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOpen(sub)}
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
              {filteredSubs.map((sub) => {
                const currentStatus = getSubscriptionStatus(sub.expiry_date);
                return (
                  <div key={sub.id} className="border border-neutral-200 dark:border-neutral-900 rounded-xl bg-white dark:bg-neutral-950/20 p-5 space-y-4 shadow-sm transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="overflow-hidden">
                        <h4 className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{sub.customer_email}</h4>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-1 overflow-hidden text-ellipsis">
                          Host: {getHostEmail(sub.host_account_id)}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
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
                        <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Durasi / Harga</span>
                        <strong className="text-neutral-700 dark:text-neutral-300 block">{sub.duration_label}</strong>
                        <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">{formatRupiah(sub.price)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Metode Bayar</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors">
                          {sub.payment_channel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <Calendar className="h-4 w-4 text-neutral-405 dark:text-neutral-500" />
                        <span>Sampai: {formatIndonesianDate(sub.expiry_date)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRenewOpen(sub)}
                          className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOpen(sub)}
                          className="h-8 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOpen(sub)}
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

      {/* Add Subscription Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-805 dark:text-neutral-100 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Tambah Customer Baru</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Daftarkan subscription baru untuk customer premium.
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
              <Label htmlFor="cust-email" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Email Customer</Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="customer@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cust-host" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Akun Induk (Host Account)</Label>
              <Select value={hostAccountId} onValueChange={(val) => { if (val) setHostAccountId(val); }}>
                <SelectTrigger id="cust-host" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  <SelectValue placeholder={availableHosts.length === 0 ? "Tidak ada slot kosong!" : "Pilih Akun Induk"}>
                    {hostAccountId ? hostAccounts.find(h => h.id === hostAccountId)?.account_email : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  {availableHosts.map(host => (
                    <SelectItem key={host.id} value={host.id || ''}>
                      {host.account_email} (Sisa: {getHostSisaSlot(host)} Slot)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableHosts.length === 0 && (
                <p className="text-[10px] text-red-400">
                  Peringatan: Semua stok akun induk berstatus aktif sudah penuh. Tambah akun stok atau ubah status ke aktif terlebih dahulu.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cust-start" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Mulai</Label>
                <Input
                  id="cust-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cust-preset" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Pilih Durasi</Label>
                <Select value={durationPreset} onValueChange={(val) => { if (val) setDurationPreset(val); }}>
                  <SelectTrigger id="cust-preset" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    <SelectValue placeholder="Pilih durasi" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    <SelectItem value="3_hari">3 Hari</SelectItem>
                    <SelectItem value="1_minggu">1 Minggu</SelectItem>
                    <SelectItem value="1_bulan">1 Bulan</SelectItem>
                    <SelectItem value="3_bulan">3 Bulan</SelectItem>
                    <SelectItem value="9_bulan">9 Bulan</SelectItem>
                    <SelectItem value="1_tahun">1 Tahun</SelectItem>
                    <SelectItem value="custom">Kustom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {durationPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 bg-neutral-50/50 dark:bg-neutral-950/40 p-3 rounded-lg border border-neutral-200 dark:border-neutral-900">
                <div className="space-y-1">
                  <Label htmlFor="custom-val" className="text-[10px] text-neutral-500 dark:text-neutral-400">Jumlah</Label>
                  <Input
                    id="custom-val"
                    type="number"
                    min={1}
                    value={customDurationValue}
                    onChange={(e) => setCustomDurationValue(Number(e.target.value))}
                    className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 h-8 text-neutral-800 dark:text-neutral-100 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="custom-unit" className="text-[10px] text-neutral-500 dark:text-neutral-400">Satuan</Label>
                  <Select 
                    value={customDurationUnit} 
                    onValueChange={(val) => { if (val) setCustomDurationUnit(val as any); }}
                  >
                    <SelectTrigger id="custom-unit" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 h-8 text-neutral-800 dark:text-neutral-100 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 text-xs">
                      <SelectItem value="days">Hari</SelectItem>
                      <SelectItem value="weeks">Minggu</SelectItem>
                      <SelectItem value="months">Bulan</SelectItem>
                      <SelectItem value="years">Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Custom Payment Channel Addition */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cust-payment" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Metode Pembayaran</Label>
                <button
                  type="button"
                  onClick={() => setShowAddChannel(!showAddChannel)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                >
                  {showAddChannel ? 'Batal' : '+ Tambah Baru'}
                </button>
              </div>

              {showAddChannel ? (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Nama metode baru (misal: Gopay)"
                    value={newPaymentChannel}
                    onChange={(e) => setNewPaymentChannel(e.target.value)}
                    className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 h-9 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPaymentChannel}
                    className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs shrink-0 transition-all"
                  >
                    Tambah
                  </Button>
                </div>
              ) : (
                <Select value={paymentChannel} onValueChange={(val) => { if (val) setPaymentChannel(val); }}>
                  <SelectTrigger id="cust-payment" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    <SelectValue placeholder="Pilih Pembayaran" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    {paymentChannels.map(channel => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="cust-price" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Pendapatan (Rupiah)</Label>
                <Input
                  id="cust-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100"
                />
              </div>

              {/* Expiry date preview */}
              <div className="bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-900 text-xs shrink-0 h-10 flex items-center justify-between">
                <span className="text-neutral-500 text-[10px]">Habis:</span>
                <strong className="text-purple-650 dark:text-purple-400 font-semibold">{formatIndonesianDate(calculatedExpiryPreview)}</strong>
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || hostAccountId === ''}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-purple-900/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Customer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renew Subscription Dialog */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-805 dark:text-neutral-100 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Perpanjang Subscription</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Buat baris subscription baru untuk customer <strong>{currentSub?.customer_email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRenewSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 p-3.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Extension Date Start Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Mulai Perpanjangan Dari</Label>
              <Select value={renewFromOldExpiry} onValueChange={(val) => { if (val) setRenewFromOldExpiry(val); }}>
                <SelectTrigger className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  <SelectValue placeholder="Pilih Mulai" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  <SelectItem value="true">
                    Lanjutkan Masa Aktif Lama ({currentSub ? formatIndonesianDate(currentSub.expiry_date) : ''})
                  </SelectItem>
                  <SelectItem value="false">
                    Mulai Baru Dari Hari Ini ({formatIndonesianDate(new Date().toISOString().split('T')[0])})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="renew-host" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Akun Induk (Bisa Diubah)</Label>
              <Select value={renewHostAccountId} onValueChange={(val) => { if (val) setRenewHostAccountId(val); }}>
                <SelectTrigger id="renew-cust-host" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  <SelectValue placeholder="Pilih Akun Induk">
                    {renewHostAccountId ? hostAccounts.find(h => h.id === renewHostAccountId)?.account_email : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  {hostAccounts.map(host => {
                    const isSameHost = host.id === currentSub?.host_account_id;
                    const sisa = getHostSisaSlot(host);
                    // Host is available if it has slots, or if it is the current host (since slot is reused/freed)
                    if (host.status === 'aktif' || isSameHost) {
                      return (
                        <SelectItem key={host.id} value={host.id || ''}>
                          {host.account_email} {isSameHost ? '(Akun Saat Ini)' : `(Sisa: ${sisa} Slot)`}
                        </SelectItem>
                      );
                    }
                    return null;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="renew-preset" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Pilih Durasi Tambahan</Label>
                <Select value={renewDurationPreset} onValueChange={(val) => { if (val) setRenewDurationPreset(val); }}>
                  <SelectTrigger id="renew-preset" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    <SelectValue placeholder="Pilih durasi" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    <SelectItem value="3_hari">3 Hari</SelectItem>
                    <SelectItem value="1_minggu">1 Minggu</SelectItem>
                    <SelectItem value="1_bulan">1 Bulan</SelectItem>
                    <SelectItem value="3_bulan">3 Bulan</SelectItem>
                    <SelectItem value="9_bulan">9 Bulan</SelectItem>
                    <SelectItem value="1_tahun">1 Tahun</SelectItem>
                    <SelectItem value="custom">Kustom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renew-price" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Harga Perpanjangan (Rp)</Label>
                <Input
                  id="renew-price"
                  type="number"
                  min={0}
                  value={renewPrice}
                  onChange={(e) => setRenewPrice(Number(e.target.value))}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100"
                />
              </div>
            </div>

            {renewDurationPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 bg-neutral-50/50 dark:bg-neutral-950/40 p-3 rounded-lg border border-neutral-200 dark:border-neutral-900">
                <div className="space-y-1">
                  <Label htmlFor="renew-custom-val" className="text-[10px] text-neutral-500 dark:text-neutral-400">Jumlah</Label>
                  <Input
                    id="renew-custom-val"
                    type="number"
                    min={1}
                    value={renewCustomDurationValue}
                    onChange={(e) => setRenewCustomDurationValue(Number(e.target.value))}
                    className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 h-8 text-neutral-800 dark:text-neutral-100 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="renew-custom-unit" className="text-[10px] text-neutral-500 dark:text-neutral-400">Satuan</Label>
                  <Select 
                    value={renewCustomDurationUnit} 
                    onValueChange={(val) => { if (val) setRenewCustomDurationUnit(val as any); }}
                  >
                    <SelectTrigger id="renew-custom-unit" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 h-8 text-neutral-800 dark:text-neutral-100 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 text-xs">
                      <SelectItem value="days">Hari</SelectItem>
                      <SelectItem value="weeks">Minggu</SelectItem>
                      <SelectItem value="months">Bulan</SelectItem>
                      <SelectItem value="years">Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Custom Payment Channel Addition (Renew) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="renew-payment" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Metode Pembayaran</Label>
                <button
                  type="button"
                  onClick={() => setShowAddChannel(!showAddChannel)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                >
                  {showAddChannel ? 'Batal' : '+ Tambah Baru'}
                </button>
              </div>

              {showAddChannel ? (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Nama metode baru (misal: Shopeepay)"
                    value={newPaymentChannel}
                    onChange={(e) => setNewPaymentChannel(e.target.value)}
                    className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 h-9 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPaymentChannel}
                    className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs shrink-0 transition-all"
                  >
                    Tambah
                  </Button>
                </div>
              ) : (
                <Select value={renewPaymentChannel} onValueChange={(val) => { if (val) setRenewPaymentChannel(val); }}>
                  <SelectTrigger id="renew-payment" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    <SelectValue placeholder="Pilih Pembayaran" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                    {paymentChannels.map(channel => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-900 text-xs flex items-center justify-between">
              <span className="text-neutral-405 dark:text-neutral-500">Masa Aktif Baru Sampai:</span>
              <strong className="text-purple-650 dark:text-purple-400 font-semibold text-sm">
                {currentSub ? formatIndonesianDate(getRenewCalculatedExpiry()) : '-'}
              </strong>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsRenewOpen(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
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
                    Memproses...
                  </>
                ) : (
                  'Konfirmasi Perpanjang'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] text-neutral-800 dark:text-neutral-100 max-w-sm rounded-2xl p-6">
          {/* Icon + Header */}
          <div className="flex flex-col items-center text-center mb-2">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Hapus Customer?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              Pilih tindakan untuk subscription<br />
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{currentSub?.customer_email}</span>
            </DialogDescription>
          </div>

          {formError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-500 dark:text-red-400 mb-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mt-2">
            {/* Nonaktifkan */}
            <button
              type="button"
              onClick={() => handleDelete(false)}
              disabled={isSubmitting}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 transition-all duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <XCircle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Nonaktifkan Saja</p>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">Ubah status ke "Habis", slot dibebaskan.</p>
              </div>
            </button>

            {/* Hapus Permanen */}
            <button
              type="button"
              onClick={() => handleDelete(true)}
              disabled={isSubmitting}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 transition-all duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Hapus Permanen</p>
                <p className="text-[11px] text-red-600/80 dark:text-red-400/70 mt-0.5">Hapus data dari database secara permanen.</p>
              </div>
            </button>
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => setIsDeleteOpen(false)}
            disabled={isSubmitting}
            className="mt-4 w-full py-2.5 rounded-xl text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-150 font-medium"
          >
            Batal
          </button>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0e] text-neutral-805 dark:text-neutral-100 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Edit Subscription</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Ubah data subscription untuk customer.
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
              <Label htmlFor="edit-cust-email" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Email Customer</Label>
              <Input
                id="edit-cust-email"
                type="email"
                placeholder="customer@email.com"
                value={editForm.customerEmail}
                onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cust-host" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Akun Induk (Host Account)</Label>
              <Select 
                value={editForm.hostAccountId} 
                onValueChange={(val) => { if (val) setEditForm({ ...editForm, hostAccountId: val }); }}
              >
                <SelectTrigger id="edit-cust-host" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  <SelectValue placeholder="Pilih Akun Induk">
                    {editForm.hostAccountId ? hostAccounts.find(h => h.id === editForm.hostAccountId)?.account_email : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  {hostAccounts.map(host => {
                    const isSameHost = host.id === currentSub?.host_account_id;
                    const sisa = getHostSisaSlot(host);
                    if (host.status === 'aktif' || isSameHost) {
                      return (
                        <SelectItem key={host.id} value={host.id || ''}>
                          {host.account_email} {isSameHost ? '(Akun Saat Ini)' : `(Sisa: ${sisa} Slot)`}
                        </SelectItem>
                      );
                    }
                    return null;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cust-start" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Mulai</Label>
                <Input
                  id="edit-cust-start"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cust-expiry" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tanggal Habis</Label>
                <Input
                  id="edit-cust-expiry"
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                  required
                  className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cust-payment" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Metode Pembayaran</Label>
              <Select 
                value={editForm.paymentChannel} 
                onValueChange={(val) => { if (val) setEditForm({ ...editForm, paymentChannel: val }); }}
              >
                <SelectTrigger id="edit-cust-payment" className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  <SelectValue placeholder="Pilih Pembayaran" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">
                  {paymentChannels.map(channel => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cust-price" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Harga (Rupiah)</Label>
              <Input
                id="edit-cust-price"
                type="number"
                min={0}
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                required
                className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-805 dark:text-neutral-100"
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-blue-900/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
