'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Reseller, ResellerOrder, Subscription, HostAccount, SubscriptionStatus } from '@/types';
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
  ArrowLeft,
  Handshake,
  Loader2,
  Pencil,
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  Wallet,
  Calendar,
  CalendarRange,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  RefreshCw,
  Activity,
} from 'lucide-react';

// ─── Helpers Umum ────────────────────────────────────────────────────────────

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return dateString;
  }
};

type ItemStatus = 'aktif' | 'akan_habis' | 'habis';
const getItemStatus = (expiryDate: string): ItemStatus => {
  if (!expiryDate) return 'habis';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'habis';
  if (diffDays <= 1) return 'akan_habis';
  return 'aktif';
};

// ─── Helpers: Pesanan (Apps/Privat) ──────────────────────────────────────────

const VARIATION_OPTIONS = ['1 Hari', '3 Hari', '1 Minggu', '1 Bulan', '3 Bulan', '6 Bulan', '1 Tahun', 'Kustom...'];

const computeExpiry = (
  orderDate: string,
  variation: string,
  customVal: number,
  customUnit: 'days' | 'weeks' | 'months' | 'years'
): string => {
  if (!orderDate) return '';
  const d = new Date(orderDate);
  if (variation === '1 Hari') d.setDate(d.getDate() + 1);
  else if (variation === '3 Hari') d.setDate(d.getDate() + 3);
  else if (variation === '1 Minggu') d.setDate(d.getDate() + 7);
  else if (variation === '1 Bulan') d.setMonth(d.getMonth() + 1);
  else if (variation === '3 Bulan') d.setMonth(d.getMonth() + 3);
  else if (variation === '6 Bulan') d.setMonth(d.getMonth() + 6);
  else if (variation === '1 Tahun') d.setFullYear(d.getFullYear() + 1);
  else if (variation === 'Kustom...') {
    if (customUnit === 'days') d.setDate(d.getDate() + customVal);
    else if (customUnit === 'weeks') d.setDate(d.getDate() + customVal * 7);
    else if (customUnit === 'months') d.setMonth(d.getMonth() + customVal);
    else d.setFullYear(d.getFullYear() + customVal);
  }
  return d.toISOString().split('T')[0];
};

// ─── Helpers: PremiumShare ───────────────────────────────────────────────────

const getSubscriptionStatus = (expiryDateStr: string): SubscriptionStatus => getItemStatus(expiryDateStr);

const calculateExpiryPS = (start: string, preset: string, customVal: number, customUnit: 'days' | 'weeks' | 'months' | 'years'): string => {
  const date = new Date(start);
  if (preset === '3_hari') date.setDate(date.getDate() + 3);
  else if (preset === '1_minggu') date.setDate(date.getDate() + 7);
  else if (preset === '1_bulan') date.setMonth(date.getMonth() + 1);
  else if (preset === '3_bulan') date.setMonth(date.getMonth() + 3);
  else if (preset === '6_bulan') date.setMonth(date.getMonth() + 6);
  else if (preset === '1_tahun') date.setFullYear(date.getFullYear() + 1);
  else if (preset === 'custom') {
    if (customUnit === 'days') date.setDate(date.getDate() + customVal);
    else if (customUnit === 'weeks') date.setDate(date.getDate() + (customVal * 7));
    else if (customUnit === 'months') date.setMonth(date.getMonth() + customVal);
    else if (customUnit === 'years') date.setFullYear(date.getFullYear() + customVal);
  }
  return date.toISOString().split('T')[0];
};

const getDurationLabelPS = (preset: string, customVal: number, customUnit: string): string => {
  if (preset === '3_hari') return '3 hari';
  if (preset === '1_minggu') return '1 minggu';
  if (preset === '1_bulan') return '1 bulan';
  if (preset === '3_bulan') return '3 bulan';
  if (preset === '6_bulan') return '6 bulan';
  if (preset === '1_tahun') return '1 tahun';
  const unitTranslate = { days: 'hari', weeks: 'minggu', months: 'bulan', years: 'tahun' }[customUnit] || '';
  return `${customVal} ${unitTranslate}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resellerId } = use(params);

  const [activeTab, setActiveTab] = useState<'pesanan' | 'premiumshare' | 'aktivitas'>('pesanan');

  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [orders, setOrders] = useState<ResellerOrder[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');

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
      setStatsDateFrom(toISO(today)); setStatsDateTo(toISO(today));
    } else if (preset === '7_hari') {
      const from = new Date(today); from.setDate(today.getDate() - 6);
      setStatsDateFrom(toISO(from)); setStatsDateTo(toISO(today));
    } else if (preset === '30_hari') {
      const from = new Date(today); from.setDate(today.getDate() - 29);
      setStatsDateFrom(toISO(from)); setStatsDateTo(toISO(today));
    } else if (preset === 'bulan_ini') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      setStatsDateFrom(toISO(from)); setStatsDateTo(toISO(today));
    } else {
      setStatsDateFrom(''); setStatsDateTo('');
    }
  };

  // ── Fetching Data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resellerId) return;
    setLoading(true);

    const unsubRes = onValue(ref(db, `resellers/${resellerId}`), (snap) => {
      if (snap.exists()) setReseller({ id: resellerId, ...snap.val() } as Reseller);
    });

    const unsubOrders = onValue(ref(db, `reseller_orders/${resellerId}`), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({ id: key, ...data[key] })) as ResellerOrder[];
        setOrders(list.sort((a, b) => b.created_at - a.created_at));
      } else {
        setOrders([]);
      }
    });

    const unsubSubs = onValue(ref(db, 'subscriptions'), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({ id: key, ...data[key] })) as Subscription[];
        setAllSubscriptions(list);
        setSubscriptions(list.filter(s => s.reseller_id === resellerId).sort((a, b) => b.created_at - a.created_at));
      } else {
        setAllSubscriptions([]);
        setSubscriptions([]);
      }
    });

    const unsubHosts = onValue(ref(db, 'host_accounts'), (snap) => {
      const data = snap.val();
      if (data) {
        setHostAccounts(Object.keys(data).map((key) => ({ id: key, ...data[key] })) as HostAccount[]);
      } else {
        setHostAccounts([]);
      }
    });

    const unsubChannels = onValue(ref(db, 'payment_channels'), (snap) => {
      const data = snap.val();
      if (data) {
        setPaymentChannels(Object.values(data));
      } else {
        const initial = ['Lynk', 'Qris', 'Twitter'];
        set(ref(db, 'payment_channels'), initial);
        setPaymentChannels(initial);
      }
    });

    // Simulate small loading delay for better UX
    setTimeout(() => setLoading(false), 500);

    return () => { unsubRes(); unsubOrders(); unsubSubs(); unsubHosts(); unsubChannels(); };
  }, [resellerId]);

  // ── Helpers PremiumShare (depends on state) ────────────────────────────────
  const getHostSisaSlot = (host: HostAccount) => {
    if (!host.id) return host.total_slot;
    const activeSubs = allSubscriptions.filter(sub => {
      if (sub.host_account_id !== host.id) return false;
      return getSubscriptionStatus(sub.expiry_date) !== 'habis';
    });
    return host.total_slot - activeSubs.length;
  };
  const getHostEmail = (id: string) => {
    const host = hostAccounts.find(h => h.id === id);
    return host ? host.account_email : 'Tidak ditemukan';
  };
  const availableHosts = hostAccounts.filter(h => h.status === 'aktif' && getHostSisaSlot(h) > 0);

  // ── Form States: Pesanan Umum ────────────────────────────────────────────
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState<ResellerOrder | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const emptyOrderForm = {
    appName: '', account: '', password: '', variation: '1 Bulan', orderDate: new Date().toISOString().split('T')[0],
    expiryDate: '', sellingPrice: 0, capitalPrice: 0, notes: '', customVariationValue: 1, customVariationUnit: 'months' as any,
  };
  const [orderForm, setOrderForm] = useState({ ...emptyOrderForm });

  // ── Form States: PremiumShare ────────────────────────────────────────────
  const [isAddPSOpen, setIsAddPSOpen] = useState(false);
  const [isEditPSOpen, setIsEditPSOpen] = useState(false);
  const [isRenewPSOpen, setIsRenewPSOpen] = useState(false);
  const [psTarget, setPsTarget] = useState<Subscription | null>(null);

  const [customerEmail, setCustomerEmail] = useState('');
  const [hostAccountId, setHostAccountId] = useState('');
  const [durationPreset, setDurationPreset] = useState('1_bulan');
  const [customDurationValue, setCustomDurationValue] = useState(1);
  const [customDurationUnit, setCustomDurationUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [paymentChannel, setPaymentChannel] = useState('Lynk');
  const [price, setPrice] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [renewFromOldExpiry, setRenewFromOldExpiry] = useState('true');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Action Handlers: Pesanan ─────────────────────────────────────────────
  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!orderForm.appName || !orderForm.account || !orderForm.orderDate) {
      setFormError('Nama produk, akun, dan tanggal order wajib diisi.'); return;
    }
    const finalVariation = orderForm.variation === 'Kustom...'
      ? `${orderForm.customVariationValue} ${orderForm.customVariationUnit === 'days' ? 'Hari' : orderForm.customVariationUnit === 'weeks' ? 'Minggu' : orderForm.customVariationUnit === 'months' ? 'Bulan' : 'Tahun'}`
      : orderForm.variation;
    const expiryDate = computeExpiry(orderForm.orderDate, orderForm.variation, orderForm.customVariationValue, orderForm.customVariationUnit);
    const profit = Number(orderForm.sellingPrice) - Number(orderForm.capitalPrice);
    setIsSubmitting(true);
    try {
      await push(ref(db, `reseller_orders/${resellerId}`), {
        reseller_id: resellerId,
        app_name: orderForm.appName.trim(), account: orderForm.account.trim(), password: orderForm.password.trim(),
        variation: finalVariation, order_date: orderForm.orderDate, expiry_date: expiryDate,
        selling_price: Number(orderForm.sellingPrice), capital_price: Number(orderForm.capitalPrice),
        profit, notes: orderForm.notes.trim(), created_at: Date.now(),
      });
      setIsAddOrderOpen(false);
    } catch (err: any) { setFormError(err.message); } finally { setIsSubmitting(false); }
  };

  const handleEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!orderTarget?.id || !orderForm.appName || !orderForm.account) {
      setFormError('Nama produk dan akun wajib diisi.'); return;
    }
    const profit = Number(orderForm.sellingPrice) - Number(orderForm.capitalPrice);
    const expiryDate = orderForm.variation === 'Kustom...'
      ? computeExpiry(orderForm.orderDate, orderForm.variation, orderForm.customVariationValue, orderForm.customVariationUnit)
      : computeExpiry(orderForm.orderDate, orderForm.variation, 1, 'months');
    setIsSubmitting(true);
    try {
      await update(ref(db, `reseller_orders/${resellerId}/${orderTarget.id}`), {
        app_name: orderForm.appName.trim(), account: orderForm.account.trim(), password: orderForm.password.trim(),
        variation: orderForm.variation, order_date: orderForm.orderDate, expiry_date: expiryDate || orderForm.expiryDate,
        selling_price: Number(orderForm.sellingPrice), capital_price: Number(orderForm.capitalPrice),
        profit, notes: orderForm.notes.trim(),
      });
      setIsEditOrderOpen(false);
    } catch (err: any) { setFormError(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (orderTarget?.id) {
      setIsSubmitting(true);
      await remove(ref(db, `reseller_orders/${resellerId}/${orderTarget.id}`));
      setIsDeleteOpen(false);
      setIsSubmitting(false);
    } else if (psTarget?.id) {
      setIsSubmitting(true);
      await update(ref(db, `subscriptions/${psTarget.id}`), { status: 'habis' });
      setIsDeleteOpen(false);
      setIsSubmitting(false);
    }
  };

  // ── Action Handlers: PremiumShare ────────────────────────────────────────

  const calculatedExpiryPreviewPS = calculateExpiryPS(startDate, durationPreset, customDurationValue, customDurationUnit);
  const getRenewCalculatedExpiryPS = (): string => {
    if (!psTarget) return '';
    const baseDate = renewFromOldExpiry === 'true'
      ? (new Date(psTarget.expiry_date) > new Date() ? psTarget.expiry_date : new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
    return calculateExpiryPS(baseDate, durationPreset, customDurationValue, customDurationUnit);
  };

  const handleAddPSOpen = () => {
    setCustomerEmail(''); setFormError(null);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDurationPreset('1_bulan'); setCustomDurationValue(1); setCustomDurationUnit('months');
    setPaymentChannel(paymentChannels[0] || 'Lynk'); setPrice(15000);
    setHostAccountId(availableHosts.length > 0 ? availableHosts[0].id || '' : '');
    setIsAddPSOpen(true);
  };

  const handleAddPSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!customerEmail || !hostAccountId || !paymentChannel || price === undefined) {
      setFormError('Semua field wajib diisi.'); return;
    }
    const selectedHost = hostAccounts.find(h => h.id === hostAccountId);
    if (!selectedHost || getHostSisaSlot(selectedHost) <= 0) {
      setFormError('Akun induk tidak valid atau penuh.'); return;
    }
    setIsSubmitting(true);
    try {
      await push(ref(db, 'subscriptions'), {
        customer_email: customerEmail.trim().toLowerCase(),
        host_account_id: hostAccountId,
        reseller_id: resellerId,
        duration_label: getDurationLabelPS(durationPreset, customDurationValue, customDurationUnit),
        start_date: startDate,
        expiry_date: calculatedExpiryPreviewPS,
        payment_channel: paymentChannel,
        price: Number(price),
        status: getSubscriptionStatus(calculatedExpiryPreviewPS),
        created_at: Date.now()
      });
      setIsAddPSOpen(false);
    } catch (err: any) { setFormError(err.message); } finally { setIsSubmitting(false); }
  };

  const handleEditPSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!psTarget?.id || !customerEmail || !hostAccountId || !paymentChannel || price === undefined || !startDate || !editExpiryDate) {
      setFormError('Semua field wajib diisi.'); return;
    }
    if (hostAccountId !== psTarget.host_account_id) {
      const targetHost = hostAccounts.find(h => h.id === hostAccountId);
      if (!targetHost || getHostSisaSlot(targetHost) <= 0) {
        setFormError('Akun induk baru penuh atau tidak ditemukan.'); return;
      }
    }
    setIsSubmitting(true);
    try {
      const diffTime = new Date(editExpiryDate).getTime() - new Date(startDate).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let durationLabel = `${diffDays} hari`;
      if (diffDays > 0) {
        if (diffDays % 365 === 0) durationLabel = `${diffDays / 365} tahun`;
        else if (diffDays % 30 === 0) durationLabel = `${diffDays / 30} bulan`;
        else if (diffDays % 7 === 0) durationLabel = `${diffDays / 7} minggu`;
      }
      await update(ref(db, `subscriptions/${psTarget.id}`), {
        customer_email: customerEmail.trim().toLowerCase(),
        host_account_id: hostAccountId,
        duration_label: durationLabel,
        start_date: startDate,
        expiry_date: editExpiryDate,
        payment_channel: paymentChannel,
        price: Number(price),
        status: getSubscriptionStatus(editExpiryDate)
      });
      setIsEditPSOpen(false);
    } catch (err: any) { setFormError(err.message); } finally { setIsSubmitting(false); }
  };

  const handleRenewPSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!psTarget || !hostAccountId || !paymentChannel || price === undefined) {
      setFormError('Semua field wajib diisi.'); return;
    }
    if (hostAccountId !== psTarget.host_account_id) {
      const targetHost = hostAccounts.find(h => h.id === hostAccountId);
      if (!targetHost || getHostSisaSlot(targetHost) <= 0) {
        setFormError('Akun induk baru penuh atau tidak ditemukan.'); return;
      }
    }
    setIsSubmitting(true);
    try {
      if (psTarget.id) await update(ref(db, `subscriptions/${psTarget.id}`), { status: 'habis' });
      const expiry = getRenewCalculatedExpiryPS();
      const baseStartDate = renewFromOldExpiry === 'true'
        ? (new Date(psTarget.expiry_date) > new Date() ? psTarget.expiry_date : new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0];
      await push(ref(db, 'subscriptions'), {
        customer_email: psTarget.customer_email,
        host_account_id: hostAccountId,
        reseller_id: resellerId,
        duration_label: getDurationLabelPS(durationPreset, customDurationValue, customDurationUnit),
        start_date: baseStartDate,
        expiry_date: expiry,
        payment_channel: paymentChannel,
        price: Number(price),
        status: getSubscriptionStatus(expiry),
        created_at: Date.now()
      });
      setIsRenewPSOpen(false);
    } catch (err: any) { setFormError(err.message); } finally { setIsSubmitting(false); }
  };

  // ── Filter & Stats ───────────────────────────────────────────────────────

  const PRESETS: { key: StatsPreset; label: string }[] = [
    { key: 'semua', label: 'Semua' }, { key: 'hari_ini', label: 'Hari Ini' },
    { key: '7_hari', label: '7 Hari' }, { key: '30_hari', label: '30 Hari' },
    { key: 'bulan_ini', label: 'Bulan Ini' }, { key: 'kustom', label: 'Kustom' },
  ];

  // Logic filter Pesanan
  const filteredOrders = orders.filter((o) => {
    const searchLow = searchQuery.toLowerCase();
    const matchSearch = o.app_name.toLowerCase().includes(searchLow) || o.account.toLowerCase().includes(searchLow);
    if (!matchSearch) return false;
    if (statusFilter === 'semua') return true;
    return getItemStatus(o.expiry_date) === statusFilter;
  });

  const statsOrders = orders.filter((o) => {
    if (statsPreset === 'semua' || (!statsDateFrom && !statsDateTo)) return true;
    if (statsDateFrom && o.order_date < statsDateFrom) return false;
    if (statsDateTo && o.order_date > statsDateTo) return false;
    return true;
  });

  // Logic filter PremiumShare
  const filteredSubs = subscriptions.filter((s) => {
    const searchLow = searchQuery.toLowerCase();
    const matchSearch = s.customer_email.toLowerCase().includes(searchLow) || getHostEmail(s.host_account_id).toLowerCase().includes(searchLow);
    if (!matchSearch) return false;
    if (statusFilter === 'semua') return true;
    return getSubscriptionStatus(s.expiry_date) === statusFilter;
  });

  const statsSubs = subscriptions.filter((s) => {
    if (statsPreset === 'semua' || (!statsDateFrom && !statsDateTo)) return true;
    if (statsDateFrom && s.start_date < statsDateFrom) return false;
    if (statsDateTo && s.start_date > statsDateTo) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!reseller) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-neutral-500">Reseller tidak ditemukan.</p>
        <Link href="/reseller"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ── Breadcrumb / Back ── */}
        <div className="mb-6">
          <Link href="/reseller" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /><span>Manajemen Reseller</span>
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
              <Handshake className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                {reseller.name}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Kelola pesanan umum dan customer PremiumShare dari reseller ini.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab === 'pesanan' && (
              <Button onClick={() => { setOrderForm({ ...emptyOrderForm }); setFormError(null); setIsAddOrderOpen(true); }} className="bg-rose-600 hover:bg-rose-500 text-white gap-2 shadow-md">
                <Plus className="h-4 w-4" /><span>Tambah Pesanan</span>
              </Button>
            )}
            {activeTab === 'premiumshare' && (
              <Button onClick={handleAddPSOpen} disabled={availableHosts.length === 0} className="bg-purple-600 hover:bg-purple-500 text-white gap-2 shadow-md">
                <Plus className="h-4 w-4" /><span>Tambah PremiumShare</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-px">
          <button
            onClick={() => { setActiveTab('pesanan'); setSearchQuery(''); setStatusFilter('semua'); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pesanan' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
          >
            Pesanan Umum (Apps/Privat)
          </button>
          <button
            onClick={() => { setActiveTab('premiumshare'); setSearchQuery(''); setStatusFilter('semua'); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'premiumshare' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
          >
            PremiumShare
          </button>
          <button
            onClick={() => { setActiveTab('aktivitas'); setSearchQuery(''); setStatusFilter('semua'); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'aktivitas' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
          >
            Aktivitas
          </button>
        </div>

        {/* ── Stats Section ── */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 mr-1">
              <CalendarRange className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Rentang:</span>
            </div>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statsPreset === p.key
                    ? (activeTab === 'pesanan' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-purple-500 border-purple-500 text-white')
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {p.label}
              </button>
            ))}
            {statsPreset === 'kustom' && (
              <div className="flex items-center gap-2 ml-1">
                <Input type="date" value={statsDateFrom} onChange={(e) => setStatsDateFrom(e.target.value)} className="h-7 text-xs px-2 w-36" />
                <span className="text-xs text-neutral-400">–</span>
                <Input type="date" value={statsDateTo} onChange={(e) => setStatsDateTo(e.target.value)} className="h-7 text-xs px-2 w-36" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeTab === 'pesanan' ? (
              <>
                <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-neutral-500 mb-2"><Package className="h-4 w-4" /><h3 className="text-xs font-semibold">Total Pesanan</h3></div>
                  <p className="text-2xl font-bold">{statsOrders.length}</p>
                </div>
                <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-neutral-500 mb-2"><DollarSign className="h-4 w-4 text-rose-500" /><h3 className="text-xs font-semibold">Total Pendapatan</h3></div>
                  <p className="text-2xl font-bold">{formatRupiah(statsOrders.reduce((s, o) => s + o.selling_price, 0))}</p>
                </div>
                <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-neutral-500 mb-2"><Wallet className="h-4 w-4 text-violet-500" /><h3 className="text-xs font-semibold">Total Modal</h3></div>
                  <p className="text-2xl font-bold">{formatRupiah(statsOrders.reduce((s, o) => s + o.capital_price, 0))}</p>
                </div>
                <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-neutral-500 mb-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><h3 className="text-xs font-semibold">Total Keuntungan</h3></div>
                  <p className="text-2xl font-bold">{formatRupiah(statsOrders.reduce((s, o) => s + o.profit, 0))}</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-neutral-500 mb-2"><Users className="h-4 w-4" /><h3 className="text-xs font-semibold">Total Customer PS</h3></div>
                  <p className="text-2xl font-bold">{statsSubs.length}</p>
                </div>
                <div className="bg-white dark:bg-emerald-950/10 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-600 mb-2"><CheckCircle2 className="h-4 w-4" /><h3 className="text-xs font-semibold">Aktif</h3></div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{statsSubs.filter(s => getSubscriptionStatus(s.expiry_date) === 'aktif').length}</p>
                </div>
                <div className="bg-white dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-amber-600 mb-2"><Clock className="h-4 w-4" /><h3 className="text-xs font-semibold">Akan Habis</h3></div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{statsSubs.filter(s => getSubscriptionStatus(s.expiry_date) === 'akan_habis').length}</p>
                </div>
                <div className="bg-white dark:bg-purple-950/10 border border-purple-200/60 dark:border-purple-900/40 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-purple-600 mb-2"><DollarSign className="h-4 w-4" /><h3 className="text-xs font-semibold">Pendapatan PS</h3></div>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{formatRupiah(statsSubs.reduce((s, o) => s + (o.price || 0), 0))}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <Input
              type="text"
              placeholder={activeTab === 'pesanan' ? "Cari produk atau akun..." : "Cari email customer atau akun induk..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 ${activeTab === 'premiumshare' ? 'focus:border-purple-500/50 focus:ring-purple-500/20' : 'focus:border-rose-500/50 focus:ring-rose-500/20'}`}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-neutral-500 font-semibold shrink-0">Filter Status:</span>
            <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="akan_habis">Akan Habis</SelectItem>
                <SelectItem value="habis">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Tabel Pesanan ── */}
        {activeTab === 'pesanan' && (
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4"><Package className="h-6 w-6 text-neutral-400" /></div>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Belum Ada Pesanan</h3>
            </div>
          ) : (
            <div className="border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-x-auto bg-white dark:bg-neutral-950/20">
              <Table>
                <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Akun</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Tgl Habis</TableHead>
                    <TableHead>Keuntungan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => {
                    const status = getItemStatus(order.expiry_date);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-semibold">{order.app_name}</TableCell>
                        <TableCell className="text-sm">{order.account}</TableCell>
                        <TableCell className="text-sm">{order.variation}</TableCell>
                        <TableCell className="text-sm">{formatDate(order.expiry_date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{formatRupiah(order.profit)}</span>
                            <span className="text-[10px] text-neutral-400">Jual: {formatRupiah(order.selling_price)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${status === 'aktif' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : status === 'akan_habis' ? 'bg-amber-500/5 text-amber-400 border-amber-500/20 animate-pulse' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
                            {status === 'aktif' && 'Aktif'}
                            {status === 'akan_habis' && 'Akan Habis'}
                            {status === 'habis' && 'Habis'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setOrderTarget(order); setOrderForm({ appName: order.app_name, account: order.account, password: order.password || '', variation: order.variation || '1 Bulan', orderDate: order.order_date, expiryDate: order.expiry_date, sellingPrice: order.selling_price, capitalPrice: order.capital_price, notes: order.notes || '', customVariationValue: 1, customVariationUnit: 'months' }); setIsEditOrderOpen(true); }} className="h-8">
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setOrderTarget(order); setPsTarget(null); setIsDeleteOpen(true); }} className="h-8 w-8 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {/* ── Tabel PremiumShare ── */}
        {activeTab === 'premiumshare' && (
          subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4"><Users className="h-6 w-6 text-neutral-400" /></div>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Belum Ada Customer PremiumShare</h3>
            </div>
          ) : (
            <div className="border border-neutral-200 dark:border-neutral-900 rounded-xl overflow-x-auto bg-white dark:bg-neutral-950/20">
              <Table>
                <TableHeader className="bg-neutral-50/80 dark:bg-neutral-950/60">
                  <TableRow>
                    <TableHead>Email Customer</TableHead>
                    <TableHead>Akun Induk</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Tgl Habis</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.map(sub => {
                    const status = getSubscriptionStatus(sub.expiry_date);
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-neutral-800 dark:text-neutral-200 py-3">{sub.customer_email}</TableCell>
                        <TableCell className="text-neutral-500 text-xs">{getHostEmail(sub.host_account_id)}</TableCell>
                        <TableCell className="text-sm">{sub.duration_label}</TableCell>
                        <TableCell className="text-sm">{formatDate(sub.expiry_date)}</TableCell>
                        <TableCell className="font-medium">{formatRupiah(sub.price)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${status === 'aktif' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : status === 'akan_habis' ? 'bg-amber-500/5 text-amber-400 border-amber-500/20 animate-pulse' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
                            {status === 'aktif' && 'Aktif'}
                            {status === 'akan_habis' && 'Akan Habis'}
                            {status === 'habis' && 'Habis'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => {
                              setPsTarget(sub);
                              setHostAccountId(sub.host_account_id); setDurationPreset('1_bulan'); setCustomDurationValue(1); setCustomDurationUnit('months');
                              setPaymentChannel(sub.payment_channel); setPrice(sub.price); setRenewFromOldExpiry('true');
                              setIsRenewPSOpen(true);
                            }} className="h-8 text-purple-600 border-purple-200 hover:bg-purple-50">
                              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Perpanjang
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              setPsTarget(sub);
                              setCustomerEmail(sub.customer_email); setHostAccountId(sub.host_account_id);
                              setStartDate(sub.start_date || ''); setEditExpiryDate(sub.expiry_date || '');
                              setPaymentChannel(sub.payment_channel); setPrice(sub.price);
                              setIsEditPSOpen(true);
                            }} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setPsTarget(sub); setOrderTarget(null); setIsDeleteOpen(true); }} className="h-8 w-8 hover:text-red-500">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {/* ── Tab Aktivitas ── */}
        {activeTab === 'aktivitas' && (() => {
          // Kelompokkan subscriptions berdasarkan tanggal ditambahkan (created_at)
          const grouped: Record<string, Subscription[]> = {};
          const sorted = [...subscriptions].sort((a, b) => b.created_at - a.created_at);
          sorted.forEach(sub => {
            const dateKey = new Date(sub.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(sub);
          });
          const groupEntries = Object.entries(grouped);

          return subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-16 text-center bg-neutral-50/20 dark:bg-neutral-955/10">
              <div className="h-12 w-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-teal-500" />
              </div>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-300 text-lg">Belum Ada Aktivitas</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">Customer PremiumShare yang ditambahkan akan muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupEntries.map(([dateLabel, subs]) => (
                <div key={dateLabel}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{dateLabel}</p>
                    <span className="ml-1 text-[10px] bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">{subs.length} customer</span>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-teal-100 dark:border-teal-900/40 ml-3">
                    {subs.map(sub => {
                      const status = getSubscriptionStatus(sub.expiry_date);
                      const timeAdded = new Date(sub.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-800/60 rounded-xl px-4 py-3 ml-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 text-teal-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{sub.customer_email}</p>
                              <p className="text-[11px] text-neutral-400">{getHostEmail(sub.host_account_id)} &middot; {sub.duration_label} &middot; {timeAdded}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{formatRupiah(sub.price)}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              status === 'aktif' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' :
                              status === 'akan_habis' ? 'bg-amber-500/5 text-amber-500 border-amber-500/20' :
                              'bg-red-500/5 text-red-500 border-red-500/20'
                            }`}>
                              {status === 'aktif' && <><CheckCircle2 className="h-2.5 w-2.5" /> Aktif</>}
                              {status === 'akan_habis' && <><Clock className="h-2.5 w-2.5" /> Akan Habis</>}
                              {status === 'habis' && <>Habis</>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── DIALOGS: Pesanan Umum ── */}
      <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0c0c0e]">
          <DialogHeader><DialogTitle>Tambah Pesanan</DialogTitle></DialogHeader>
          <form onSubmit={handleAddOrderSubmit}>
            <div className="py-4 space-y-3 text-sm">
              <Label>Nama Produk</Label><Input value={orderForm.appName} onChange={e => setOrderForm(f => ({ ...f, appName: e.target.value }))} />
              <Label>Akun</Label><Input value={orderForm.account} onChange={e => setOrderForm(f => ({ ...f, account: e.target.value }))} />
              <Label>Tgl Order</Label><Input type="date" value={orderForm.orderDate} onChange={e => setOrderForm(f => ({ ...f, orderDate: e.target.value }))} />
              <Label>Durasi</Label>
              <Select value={orderForm.variation} onValueChange={v => setOrderForm(f => ({ ...f, variation: v || '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VARIATION_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              {orderForm.variation === 'Kustom...' && (
                <div className="flex gap-2">
                  <Input type="number" min={1} value={orderForm.customVariationValue} onChange={e => setOrderForm(f => ({ ...f, customVariationValue: Number(e.target.value) }))} className="w-24" />
                  <Select value={orderForm.customVariationUnit} onValueChange={v => setOrderForm(f => ({ ...f, customVariationUnit: v as any }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="days">Hari</SelectItem><SelectItem value="weeks">Minggu</SelectItem><SelectItem value="months">Bulan</SelectItem><SelectItem value="years">Tahun</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Harga Jual</Label><Input type="number" value={orderForm.sellingPrice} onChange={e => setOrderForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))} /></div>
                <div><Label>Modal</Label><Input type="number" value={orderForm.capitalPrice} onChange={e => setOrderForm(f => ({ ...f, capitalPrice: Number(e.target.value) }))} /></div>
              </div>
            </div>
            {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOrderOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0c0c0e]">
          <DialogHeader><DialogTitle>Edit Pesanan</DialogTitle></DialogHeader>
          <form onSubmit={handleEditOrderSubmit}>
            <div className="py-4 space-y-3 text-sm">
              <Label>Nama Produk</Label><Input value={orderForm.appName} onChange={e => setOrderForm(f => ({ ...f, appName: e.target.value }))} />
              <Label>Akun</Label><Input value={orderForm.account} onChange={e => setOrderForm(f => ({ ...f, account: e.target.value }))} />
              <Label>Tgl Order</Label><Input type="date" value={orderForm.orderDate} onChange={e => setOrderForm(f => ({ ...f, orderDate: e.target.value }))} />
              <Label>Durasi</Label>
              <Select value={orderForm.variation} onValueChange={v => setOrderForm(f => ({ ...f, variation: v || '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VARIATION_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Harga Jual</Label><Input type="number" value={orderForm.sellingPrice} onChange={e => setOrderForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))} /></div>
                <div><Label>Modal</Label><Input type="number" value={orderForm.capitalPrice} onChange={e => setOrderForm(f => ({ ...f, capitalPrice: Number(e.target.value) }))} /></div>
              </div>
            </div>
            {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOrderOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOGS: PremiumShare ── */}
      <Dialog open={isAddPSOpen} onOpenChange={setIsAddPSOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0c0c0e]">
          <DialogHeader><DialogTitle>Tambah PremiumShare</DialogTitle></DialogHeader>
          <form onSubmit={handleAddPSSubmit}>
            <div className="py-4 space-y-3 text-sm">
              <Label>Email Customer</Label><Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@contoh.com" />
              <Label>Pilih Akun Induk (Host)</Label>
              <Select value={hostAccountId} onValueChange={v => setHostAccountId(v || '')}>
                <SelectTrigger><SelectValue placeholder="Pilih akun induk" /></SelectTrigger>
                <SelectContent>
                  {availableHosts.map(h => (
                    <SelectItem key={h.id} value={h.id || ''}>{h.account_email} (Sisa: {getHostSisaSlot(h)})</SelectItem>
                  ))}
                  {availableHosts.length === 0 && <SelectItem value="none" disabled>Tidak ada akun tersedia</SelectItem>}
                </SelectContent>
              </Select>
              <Label>Tgl Mulai</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Label>Durasi</Label>
              <Select value={durationPreset} onValueChange={v => setDurationPreset(v || '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_bulan">1 Bulan</SelectItem>
                  <SelectItem value="3_bulan">3 Bulan</SelectItem>
                  <SelectItem value="6_bulan">6 Bulan</SelectItem>
                  <SelectItem value="1_tahun">1 Tahun</SelectItem>
                  <SelectItem value="custom">Kustom...</SelectItem>
                </SelectContent>
              </Select>
              {durationPreset === 'custom' && (
                <div className="flex gap-2">
                  <Input type="number" min={1} value={customDurationValue} onChange={e => setCustomDurationValue(Number(e.target.value))} className="w-24" />
                  <Select value={customDurationUnit} onValueChange={v => setCustomDurationUnit(v as any)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="days">Hari</SelectItem><SelectItem value="weeks">Minggu</SelectItem><SelectItem value="months">Bulan</SelectItem><SelectItem value="years">Tahun</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pembayaran</Label>
                  <Select value={paymentChannel} onValueChange={v => setPaymentChannel(v || '')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{paymentChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Harga (Rp)</Label><Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} /></div>
              </div>
            </div>
            {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddPSOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-500 text-white">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenewPSOpen} onOpenChange={setIsRenewPSOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0c0c0e]">
          <DialogHeader><DialogTitle>Perpanjang PremiumShare</DialogTitle></DialogHeader>
          <form onSubmit={handleRenewPSSubmit}>
            <div className="py-4 space-y-3 text-sm">
              <Label>Mulai Perpanjangan</Label>
              <Select value={renewFromOldExpiry} onValueChange={v => setRenewFromOldExpiry(v || '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Dari tanggal habis lama ({psTarget?.expiry_date ? formatDate(psTarget.expiry_date) : '-'})</SelectItem>
                  <SelectItem value="false">Mulai hari ini</SelectItem>
                </SelectContent>
              </Select>
              <Label>Akun Induk (Bisa dipindah)</Label>
              <Select value={hostAccountId} onValueChange={v => setHostAccountId(v || '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hostAccounts.filter(h => h.status === 'aktif' && (h.id === psTarget?.host_account_id || getHostSisaSlot(h) > 0)).map(h => (
                    <SelectItem key={h.id} value={h.id || ''}>{h.account_email} {h.id !== psTarget?.host_account_id ? `(Sisa: ${getHostSisaSlot(h)})` : '(Saat ini)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label>Durasi Perpanjangan</Label>
              <Select value={durationPreset} onValueChange={v => setDurationPreset(v || '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_bulan">1 Bulan</SelectItem>
                  <SelectItem value="3_bulan">3 Bulan</SelectItem>
                  <SelectItem value="1_tahun">1 Tahun</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pembayaran</Label>
                  <Select value={paymentChannel} onValueChange={v => setPaymentChannel(v || '')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{paymentChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Harga (Rp)</Label><Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} /></div>
              </div>
            </div>
            {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenewPSOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-500 text-white">{isSubmitting ? 'Menyimpan...' : 'Perpanjang'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPSOpen} onOpenChange={setIsEditPSOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0c0c0e]">
          <DialogHeader><DialogTitle>Edit Data PremiumShare</DialogTitle></DialogHeader>
          <form onSubmit={handleEditPSSubmit}>
            <div className="py-4 space-y-3 text-sm">
              <Label>Email Customer</Label><Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              <Label>Tgl Mulai</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Label>Tgl Habis</Label><Input type="date" value={editExpiryDate} onChange={e => setEditExpiryDate(e.target.value)} />
              <Label>Akun Induk</Label>
              <Select value={hostAccountId} onValueChange={v => setHostAccountId(v || '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hostAccounts.filter(h => h.id === psTarget?.host_account_id || getHostSisaSlot(h) > 0).map(h => (
                    <SelectItem key={h.id} value={h.id || ''}>{h.account_email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Pembayaran</Label><Select value={paymentChannel} onValueChange={v => setPaymentChannel(v || '')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{paymentChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Harga (Rp)</Label><Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} /></div>
              </div>
            </div>
            {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPSOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-red-500">Hapus / Nonaktifkan</DialogTitle></DialogHeader>
          <p className="py-4 text-sm text-neutral-600 dark:text-neutral-400">
            {orderTarget ? `Yakin ingin menghapus pesanan ${orderTarget.app_name}?` : `Yakin ingin menonaktifkan langganan ${psTarget?.customer_email}?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : (orderTarget ? 'Hapus' : 'Nonaktifkan')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
