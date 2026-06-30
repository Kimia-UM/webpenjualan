export type BillingType = 'harian' | 'mingguan' | 'bulanan';

export type HostStatus = 'proses' | 'aktif' | 'nonaktif';

export interface HostAccount {
  id?: string; // Optional because it's key in Firebase RTDB
  account_email: string;
  billing_type: BillingType;
  total_slot: number;
  active_until: string; // YYYY-MM-DD
  status: HostStatus;
  created_at: number; // Timestamp (e.g., Date.now())
}

export type SubscriptionStatus = 'aktif' | 'akan_habis' | 'habis';

export interface Subscription {
  id?: string; // Optional because it's key in Firebase RTDB
  customer_email: string;
  host_account_id: string; // Reference to HostAccount.id
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

