export type BillingType = 'harian' | 'mingguan' | 'bulanan';

export type HostStatus = 'proses' | 'aktif' | 'nonaktif';

export interface HostAccount {
  id?: string; // Optional because it's key in Firebase RTDB
  account_email: string;
  billing_type: BillingType;
  total_slot: number;
  active_until: string; // YYYY-MM-DD
  created_at: number; // Timestamp (e.g., Date.now())
  status?: HostStatus;
  flow_points?: number;    // Sisa poin Google Flow (diisi manual oleh admin)
  capital_price?: number; // Modal akun (harga beli)
}

export type SubscriptionStatus = 'aktif' | 'akan_habis' | 'habis';

export interface Subscription {
  id?: string; // Optional because it's key in Firebase RTDB
  customer_email: string;
  host_account_id: string; // Reference to HostAccount.id
  reseller_id?: string;    // Reference to Reseller.id (optional, jika didaftarkan via reseller)
  duration_label: string; // e.g., "3 bulan", "1 bulan"
  start_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  payment_channel: string; // e.g., "Lynk", "Qris", "Twitter"
  price: number;
  status: SubscriptionStatus;
  created_at: number; // Timestamp
}

export interface DashboardSummary {
  totalRevenueToday: number;
  totalRevenueMonth: number;
  totalRevenueAllTime: number;
  activeCustomersCount: number;
  expiringSubscriptions: Subscription[];
  expiringHostAccounts: HostAccount[];
}

export interface AppsPremium {
  id?: string;
  app_name: string;
  account: string;
  password: string;
  variation: string;
  order_date: string;
  expiry_date: string;
  selling_price: number;
  capital_price: number;
  profit: number;
  notes?: string;
  warranty_days?: number; // 0 or undefined = no warranty; positive int = days from order_date
  created_at: number;
}

export interface PrivatPremium {
  id?: string;
  customer_name: string;
  order_date: string;
  selling_price: number;
  capital_price: number;
  profit: number;
  notes?: string;
  warranty_active?: boolean;
  warranty_deduction?: number;
  created_at: number;
}

export interface Reseller {
  id?: string;
  name: string;
  created_at: number;
}

export interface ResellerOrder {
  id?: string;
  reseller_id: string;   // Referensi ke Reseller.id
  app_name: string;       // Produk / layanan yang dijual
  account: string;
  password?: string;
  variation?: string;     // Variasi produk / durasi
  order_date: string;     // YYYY-MM-DD
  expiry_date: string;    // YYYY-MM-DD
  selling_price: number;
  capital_price: number;
  profit: number;
  notes?: string;
  created_at: number;     // Timestamp
}

export interface Withdrawal {
  id?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: number; // Timestamp
}
