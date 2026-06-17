# PRD — Aplikasi Manajemen Sharing Akun Premium

**Versi:** 1.0
**Tipe dokumen:** Product Requirements Document (untuk vibe coding)
**Status:** Draft siap dibangun

---

## 1. Latar Belakang

Saat ini bisnis sharing akun premium (Lynk, Twitter, dll) dikelola lewat spreadsheet dengan dua tabel terpisah:

1. **Manajemen Customer** — siapa beli, durasi berapa lama, kapan habis, akun induk mana yang dipakai, metode pembayaran, dan pendapatan per transaksi.
2. **Manajemen Stok** — daftar akun induk (host account) yang dipakai untuk sharing, sisa slot yang masih bisa dijual, kategori periode billing, dan masa aktif akun induk itu sendiri.

Cara manual ini punya tiga masalah utama: rawan lupa cek tanggal habis, hitung sisa slot manual jadi gampang salah, dan tidak ada rekap pendapatan otomatis. Aplikasi ini dibuat untuk menggantikan spreadsheet tersebut dengan dashboard web yang otomatis menghitung status dan mengirim reminder.

## 2. Tujuan Produk

- Satu dashboard untuk memantau seluruh customer aktif, hampir habis, dan habis — tanpa scroll spreadsheet.
- Stok akun induk (sisa slot, masa aktif) terhitung otomatis, bukan diketik manual.
- Reminder otomatis via Telegram saat durasi customer atau masa aktif akun induk mau habis.
- Total pendapatan (harian/bulanan/per akun) terlihat tanpa rekap manual.

## 3. Target Pengguna

Satu admin (pemilik bisnis), diakses dari laptop maupun HP. Tidak ada peran lain di V1 — tidak perlu sistem multi-user, role, atau akses terbatas.

## 4. Asumsi Berdasarkan Data yang Ada

Beberapa istilah di data lama diterjemahkan ke struktur berikut supaya tidak ambigu saat dibangun:

| Istilah di spreadsheet lama | Diartikan sebagai |
|---|---|
| `Akun` (di kedua tabel) | Akun induk/host yang slotnya dibagikan ke customer — field penghubung antara tabel Customer dan tabel Stok |
| `Pembayaran` (Qris/Lynk/Twiter) | Field kategori bebas-isi (channel pembayaran atau jenis produk) — dibuat sebagai dropdown yang isinya bisa ditambah sendiri, bukan hardcode |
| `Kategori` (Bulanan/Mingguan/Harian) di tabel Stok | Tipe periode billing dari akun induk |
| `Sisa Slot` | Dihitung otomatis = total slot akun induk − jumlah customer aktif yang terpasang di akun itu |
| Status `proses` | Akun induk baru disiapkan, belum punya customer/slot terisi |

Jika asumsi ini kurang pas dengan kondisi nyata, sesuaikan di tahap implementasi — tidak mengubah struktur besar PRD.

## 5. Lingkup V1

**Masuk scope:**
- Login admin tunggal
- CRUD akun induk (stok)
- CRUD subscription customer (termasuk perpanjangan/renewal)
- Dashboard ringkasan
- Notifikasi otomatis via Telegram
- Riwayat & total pendapatan
- Export laporan ke CSV

**Tidak masuk scope V1** (lihat detail di bagian 12):
- Multi-admin / role-based access
- Portal self-service untuk customer
- Integrasi payment gateway otomatis
- Notifikasi WhatsApp (pakai Telegram dulu karena lebih simpel & gratis)
- Invoice PDF otomatis

## 6. Data Model (Firebase Realtime Database)

Firebase Realtime Database itu NoSQL berbentuk satu pohon JSON besar, bukan tabel relasional. Jadi tidak ada `JOIN` — relasi antar data dilakukan dengan menyimpan id sebagai referensi, lalu di-query terpisah dari sisi aplikasi (client/Next.js API route).

Struktur node teratas:

```
/host_accounts
  /{hostAccountId}
    account_email: "ipungmeow@gmail.com"
    billing_type: "bulanan"        // "harian" | "mingguan" | "bulanan"
    total_slot: 10
    active_until: "2027-06-12"
    status: "aktif"                // "proses" | "aktif" | "nonaktif"
    created_at: 1750000000000

/subscriptions
  /{subscriptionId}
    customer_email: "reyfael1@gmail.com"
    host_account_id: "{hostAccountId}"   // referensi ke /host_accounts
    duration_label: "3 bulan"
    start_date: "2026-06-14"
    expiry_date: "2026-09-14"
    payment_channel: "Lynk"
    price: 30000
    status: "aktif"                // "aktif" | "akan_habis" | "habis"
    created_at: 1750000000000
```

**Catatan desain — riwayat perpanjangan:** setiap kali customer perpanjang, sistem membuat **node baru** di `/subscriptions` (bukan menimpa node lama). Ini supaya riwayat pendapatan per customer tetap lengkap dan `Total Pendapatan` cukup dihitung dengan menjumlahkan field `price` dari seluruh node.

**Catatan teknis — indexing:** karena RTDB tidak punya query relasional, field yang sering dipakai untuk filter (`host_account_id`, `status`, `expiry_date`) harus didaftarkan di Firebase Database Rules pakai `.indexOn`, supaya query `orderByChild()` + `equalTo()` jalan efisien. Tanpa ini, query akan lambat begitu data mulai banyak.

**Catatan teknis — sisa slot:** karena tidak ada `COUNT()` otomatis seperti SQL, sisa slot dihitung di sisi aplikasi: ambil semua `/subscriptions` dengan `host_account_id` = X dan `status` != `habis`, hitung jumlahnya, lalu `sisa_slot = total_slot - jumlah_itu`. Hindari menyimpan `sisa_slot` sebagai field statis supaya tidak gampang tidak sinkron.

## 7. Fitur Utama

### FR1 — Login Admin
Login email + password (1 akun saja, dibuat manual di awal). Tidak ada halaman registrasi publik.

### FR2 — Dashboard
Menampilkan: total pendapatan (hari ini / bulan ini / all-time), jumlah customer aktif, daftar customer yang akan habis dalam 3 hari ke depan, dan daftar akun induk yang slotnya hampir penuh atau masa aktifnya hampir habis.

### FR3 — Manajemen Customer (Subscriptions)
- Tambah customer baru: pilih akun induk (otomatis cek sisa slot tersedia), isi durasi, channel pembayaran, dan harga → expiry_date terhitung otomatis.
- List customer dengan filter status (Aktif / Akan Habis / Habis) dan search by email.
- Perpanjang (renew): membuat baris subscription baru untuk email yang sama.
- Hapus/nonaktifkan subscription (slot otomatis kembali tersedia).

### FR4 — Manajemen Stok (Host Accounts)
- Tambah akun induk baru: email, total slot, billing type, masa aktif.
- List akun induk dengan sisa slot terhitung otomatis dan status (proses/aktif/nonaktif).
- Edit total slot atau masa aktif kapan saja.

### FR5 — Notifikasi Otomatis (Telegram)
Dijelaskan detail di bagian 8.

### FR6 — Laporan & Export
Filter pendapatan berdasarkan rentang tanggal dan/atau akun induk, lalu export ke CSV.

### FR7 — Search & Filter
Pencarian email customer dan filter status di semua list/table.

## 8. Logika Notifikasi (Telegram)

- Bot Telegram terhubung ke chat pribadi admin (cukup 1 chat ID, sesuai target pengguna tunggal).
- Cron job berjalan setiap hari jam 08:00 (waktu lokal) lewat Vercel Cron, memanggil API route Next.js yang menggunakan **Firebase Admin SDK** (server-side, pakai service account key) untuk query data — bukan Firebase client SDK, supaya kredensial admin tidak terekspos ke browser.
- API route ini mengecek:
  - Subscription dengan `expiry_date` dalam 3 hari ke depan atau hari ini → kirim daftar (email, akun induk, sisa hari).
  - Host account dengan `active_until` dalam 7 hari ke depan → kirim peringatan terpisah.
- Format pesan singkat, contoh:
  ```
  🔔 Reminder Hari Ini
  3 customer akan habis dalam 3 hari:
  - reyfael1@gmail.com (Lynk) - 2 hari
  - kbd2.uii@gmail.com (Lynk) - 1 hari
  ```
- Kenapa Telegram dan bukan WhatsApp di V1: Telegram Bot API gratis, setup-nya hanya butuh token bot tanpa verifikasi bisnis. WhatsApp baru bisa ditambahkan di V2 lewat provider seperti Fonnte/WhatsApp Cloud API kalau memang dibutuhkan nanti.

## 9. Non-Functional Requirements

- Mobile-responsive — admin kemungkinan sering cek/update dari HP.
- Semua tanggal & angka rupiah ditampilkan dalam format Indonesia (DD MMMM YYYY, Rp xx.xxx).
- Login wajib, tidak ada halaman yang bisa diakses tanpa autentikasi.
- **Firebase Database Rules** wajib dikonfigurasi supaya read/write hanya bisa dilakukan oleh admin yang sudah login (default rules Firebase RTDB kalau dibiarkan terbuka bisa diakses publik dari internet) — ini bagian penting yang sering terlewat saat setup awal.
- Performa ringan, data masih kecil (puluhan-ratusan baris), tidak perlu optimasi berat.

## 10. Rekomendasi Tech Stack

Dipilih supaya cocok untuk "vibe coding" — minim setup, banyak referensi/tutorial, dan free tier cukup untuk skala personal.

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend + Backend | Next.js (App Router) + TypeScript | Satu framework untuk UI dan API route, dokumentasi luas |
| Styling/UI | Tailwind CSS + shadcn/ui | Komponen siap pakai, hemat waktu styling |
| Database | Firebase Realtime Database | Real-time sync (list otomatis update tanpa refresh), gratis untuk skala personal |
| Auth | Firebase Authentication | Login email/password bawaan, tinggal pakai 1 akun admin |
| Cron job harian | Vercel Cron (memanggil API route Next.js) | API route memakai Firebase Admin SDK untuk query data, tidak perlu server tambahan |
| Notifikasi | Telegram Bot API | Gratis, setup dalam hitungan menit |
| Hosting | Vercel | Deploy langsung dari GitHub, free tier cukup |

## 11. Alur Pengguna Utama

1. **Tambah customer baru:** Dashboard → Customer → Tambah → pilih akun induk (sistem cek sisa slot) → isi durasi & harga → simpan → expiry_date otomatis terhitung → slot akun induk berkurang 1.
2. **Perpanjang customer:** Cari email di list → klik Perpanjang → isi durasi & harga baru → sistem buat baris subscription baru, expiry_date baru dihitung dari hari ini (atau dari expiry_date lama, sesuai pilihan saat perpanjang).
3. **Tambah akun induk baru:** Stok → Tambah → isi email, total slot, billing type, masa aktif → status default `proses` sampai ada customer pertama masuk.
4. **Menerima reminder:** Setiap pagi, bot Telegram kirim daftar customer/akun yang mau habis tanpa admin perlu cek manual.

## 12. Rencana Pembangunan (Build Phases)

Disusun bertahap supaya bisa dibangun satu-per-satu lewat AI coding assistant, tiap fase bisa langsung dites sebelum lanjut ke fase berikutnya.

1. **Setup dasar** — inisialisasi Next.js + Tailwind + shadcn/ui, buat project Firebase (Realtime Database + Authentication), setup Database Rules dan `.indexOn`, setup login admin.
2. **Modul Stok** — CRUD akun induk, tampilan list dengan sisa slot terhitung otomatis.
3. **Modul Customer** — CRUD subscription, logika hitung expiry_date otomatis, logika kurang/tambah sisa slot, fitur perpanjang.
4. **Dashboard** — kartu ringkasan pendapatan, customer akan habis, status stok.
5. **Notifikasi Telegram** — setup bot, API route cron harian, format pesan reminder.
6. **Laporan & polish** — export CSV, search/filter, responsive check di mobile.

## 13. Ide untuk Versi Berikutnya (Out of Scope V1)

- Multi-admin dengan role (misal staff hanya bisa input customer, tidak bisa lihat total pendapatan).
- Integrasi WhatsApp (Fonnte/WhatsApp Cloud API) sebagai alternatif/tambahan Telegram.
- Portal khusus customer untuk cek sisa durasi sendiri.
- Integrasi payment gateway (QRIS otomatis) supaya pembayaran tercatat tanpa input manual.
- Invoice/struk PDF otomatis per transaksi.

## 14. Metrik Keberhasilan

- Tidak ada lagi customer yang kelewat reminder (0 keluhan "lupa diperpanjang").
- Waktu cek status harian turun dari beberapa menit scroll spreadsheet jadi tinggal buka dashboard.
- Total pendapatan bulanan langsung terlihat tanpa hitung manual.