# Aplikasi Manajemen Sharing Akun Premium

Aplikasi dashboard berbasis web untuk memantau customer premium, stok akun induk (host accounts), serta mengirim pengingat otomatis (reminder) via Telegram.

Proyek ini dibangun berdasarkan spesifikasi lengkap yang dapat dibaca di **[PRD.md](file:///d:/Fatsrack/EXCLUDE/web/PRD.md)**.

## Tech Stack
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + shadcn/ui
* **Database & Auth:** Firebase Realtime Database & Firebase Authentication
* **Cron Jobs:** Vercel Cron (menggunakan Firebase Admin SDK)
* **Notifications:** Telegram Bot API
* **Deployment:** Vercel

## Struktur Folder Utama
* `/app` - Halaman utama (Dashboard, Login, Customers, Stok, API routes)
* `/components` - Komponen UI reusable (termasuk komponen shadcn/ui di `/components/ui`)
* `/lib` - File utilitas/helpers (firebase configuration, utils, dll.)
* `/types` - Tipe TypeScript data model berdasarkan PRD (`/types/index.ts`)

## Langkah Pengembangan (Build Phases)
Sesuai rancangan pada PRD, proses pembangunan dibagi menjadi 6 fase:
1. **Fase 0/1: Setup Dasar** (Next.js + Tailwind + shadcn/ui + Firebase config + Login Admin) - *Sedang Berjalan/Selesai Inisialisasi*
2. **Fase 2: Modul Stok** (CRUD Host Accounts, sisa slot terhitung otomatis)
3. **Fase 3: Modul Customer** (CRUD Subscriptions, hitung masa aktif otomatis, renewal)
4. **Fase 4: Dashboard** (Rekap total pendapatan & daftar yang akan habis)
5. **Fase 5: Notifikasi Telegram** (Telegram bot, cron job harian via Vercel Cron)
6. **Fase 6: Laporan & Polish** (Export CSV, pencarian & filter, responsive design)

## Menjalankan Proyek Secara Lokal

1. Salin `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Isi nilai-nilai environment variable di `.env.local` sesuai dengan kredensial Firebase dan Telegram bot Anda.
3. Jalankan server development:
   ```bash
   npm run dev
   ```
4. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## Panduan Integrasi Telegram Bot

Untuk mengaktifkan pengingat otomatis harian via Telegram, Anda memerlukan **Bot Token** dan **Chat ID**:

### 1. Cara Membuat Bot Telegram (Mendapatkan Token)
1. Buka aplikasi Telegram dan cari akun **`@BotFather`** (akun resmi bercentang biru).
2. Kirim pesan `/newbot` untuk membuat bot baru.
3. Masukkan nama bot Anda (contoh: `PremiumShare Reminder`).
4. Masukkan username unik bot Anda yang diakhiri kata `bot` (contoh: `premiumshare_reminder_bot`).
5. **@BotFather** akan mengirimkan pesan berisi token HTTP API Anda. Salin token ini dan masukkan ke `TELEGRAM_BOT_TOKEN` di `.env.local`.
6. Cari bot baru Anda di Telegram menggunakan username-nya, lalu klik **Start / Mulai** agar bot tersebut dapat mengirimkan pesan kepada Anda.

### 2. Cara Mendapatkan Chat ID Telegram Anda
1. Di Telegram, cari bot **`@userinfobot`** atau **`@GetIdsBot`**.
2. Klik **Start / Mulai** pada bot tersebut.
3. Bot akan membalas dengan menampilkan rincian akun Anda, termasuk **`Id`** atau **`Chat ID`**.
4. Salin angka tersebut dan masukkan ke `TELEGRAM_CHAT_ID` di `.env.local`.

### 3. Mengaktifkan Perintah Interaktif (/stok & /infocustomer)
Untuk membuat bot membalas pesan Anda secara otomatis ketika Anda mengirim perintah `/stok` atau `/infocustomer`, Anda perlu mendaftarkan webhook Vercel Anda ke Telegram:
1. Setelah aplikasi Anda di-deploy ke Vercel, jalankan URL berikut di browser Anda (ganti `<TOKEN_BOT>` dengan token asli Anda dan `<DOMAIN_VERCEL>` dengan URL domain Vercel Anda):
   ```http
   https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://<DOMAIN_VERCEL>/api/telegram/webhook
   ```
2. **Respon:** Anda akan menerima respon JSON berupa `{"ok":true,"result":true,"description":"Webhook was set"}`.
3. Sekarang, coba buka chat bot Anda di Telegram dan ketik perintah `/stok` atau `/infocustomer`! Bot akan membalas pesan Anda secara realtime.
