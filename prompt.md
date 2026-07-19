# Urutan Prompting — Vibe Coding Aplikasi Manajemen Sharing Akun

Dokumen ini berisi urutan prompt yang bisa langsung copy-paste ke AI coding assistant (Claude Code, Cursor, Windsurf, dll), mengikuti fase pembangunan di PRD.

## Cara Pakai

- Jalankan **satu prompt per fase**, tunggu sampai selesai, lalu **test dulu di browser/localhost** sebelum lanjut ke prompt berikutnya. Jangan loncat fase.
- Lakukan semua di satu session/chat yang sama kalau bisa, supaya AI tetap ingat konteks project sebelumnya. Kalau harus buka session baru, attach ulang file PRD dan sebutkan fase berapa yang sudah selesai.
- Setiap fase berhasil dan sudah ditest → commit ke git dengan message jelas (misal `feat: modul stok selesai`). Ini penting supaya kalau fase berikutnya bikin error, kamu bisa balik ke versi yang masih jalan.
- Lampirkan file PRD (`PRD_Aplikasi_Manajemen_Sharing_Akun.md`) di setiap prompt kalau tool-nya mendukung attach file, atau paste isinya di prompt pertama.

---

## Prompt 0 — Inisialisasi Project

```
Saya mau bangun aplikasi sesuai PRD yang saya lampirkan (Next.js App Router + TypeScript + Tailwind + shadcn/ui + Firebase Realtime Database, deploy ke Vercel).

Tolong:
1. Inisialisasi project Next.js baru (App Router, TypeScript, Tailwind CSS sudah aktif).
2. Install dan setup shadcn/ui dengan tema default.
3. Buat struktur folder rapi: /app, /components, /lib, /types.
4. Buat file .env.local.example berisi placeholder semua environment variable yang nanti dibutuhkan (Firebase config, Telegram bot token, dll — sebut saja namanya dulu, isinya kosong).
5. Init git repository dan buat .gitignore yang benar (termasuk .env.local dan file kredensial).
6. Buat README.md singkat yang merujuk ke PRD ini.

Jangan bangun fitur apapun dulu, ini cuma setup awal.
```

**Checklist sebelum lanjut:** project bisa dijalankan dengan `npm run dev` tanpa error, shadcn/ui komponen contoh bisa dipakai.

---

## Prompt 1 — Setup Firebase (Auth + Realtime Database)

```
Sekarang setup koneksi ke Firebase sesuai PRD bagian 6 dan 9.

Tolong:
1. Buat file lib/firebase.ts untuk inisialisasi Firebase client SDK (Auth + Realtime Database), pakai environment variable dari .env.local.
2. Buat halaman /login dengan form email + password, pakai Firebase Authentication (email/password provider).
3. Buat middleware atau wrapper yang melindungi semua halaman selain /login — kalau belum login, redirect ke /login.
4. Tuliskan contoh Firebase Database Rules (dalam format JSON) yang membatasi read/write hanya untuk user yang sudah login (auth != null), simpan di file database.rules.json supaya saya bisa paste ke Firebase Console.
5. Update .env.local.example dengan semua key Firebase yang dibutuhkan (apiKey, authDomain, databaseURL, projectId, dst).

Saya akan buat project Firebase dan isi .env.local sendiri setelah ini.
```

**Checklist sebelum lanjut:** sudah punya project Firebase asli, .env.local sudah diisi data asli, Database Rules sudah dipaste ke Firebase Console, bisa login dan masuk ke halaman setelah login (walau masih kosong).

---

## Prompt 2 — Modul Stok (Host Accounts)

```
Bangun modul "Manajemen Stok" (host accounts) sesuai PRD bagian 6 dan FR4.

Tolong buat:
1. Halaman /stok yang menampilkan list semua host account dari Realtime Database node /host_accounts, dengan kolom: account_email, billing_type, total_slot, sisa_slot (dihitung dari jumlah subscription aktif, untuk sekarang asumsikan 0 karena belum ada data subscription), active_until, status.
2. Form tambah host account baru (modal atau halaman terpisah) dengan field: account_email, billing_type (dropdown: harian/mingguan/bulanan), total_slot (number), active_until (date picker), status (default "proses").
3. Fitur edit dan hapus host account.
4. Data harus realtime — kalau ada perubahan di Firebase, list otomatis update tanpa refresh manual (manfaatkan listener Realtime Database).
5. Tampilan responsif, enak dilihat di HP maupun laptop.
```

**Checklist sebelum lanjut:** bisa tambah/edit/hapus host account dari UI, data benar-benar tersimpan di Firebase Console, list update otomatis kalau data diubah langsung dari Firebase Console (test realtime sync).

---

## Prompt 3 — Modul Customer (Subscriptions)

```
Bangun modul "Manajemen Customer" sesuai PRD bagian 6 dan FR3.

Tolong buat:
1. Halaman /customer yang menampilkan list semua subscription dari node /subscriptions, dengan kolom: customer_email, host_account_id (tampilkan account_email-nya, bukan id mentah), duration_label, expiry_date, payment_channel, price, status.
2. Status (aktif / akan_habis / habis) dihitung otomatis dari expiry_date: akan_habis kalau sisa ≤3 hari, habis kalau sudah lewat tanggal hari ini.
3. Form tambah customer baru: pilih host account dari dropdown (hanya tampilkan yang masih ada sisa slot), isi customer_email, duration_label (dropdown atau text bebas seperti "3 bulan"/"1 minggu"/"3 hari"), payment_channel, price. expiry_date dihitung otomatis dari hari ini + duration_label saat disimpan.
4. Fitur "Perpanjang": dari baris customer yang sudah ada, buat node /subscriptions baru dengan email yang sama, host_account_id boleh sama atau ganti, expiry_date dihitung ulang.
5. Update sisa_slot di halaman /stok supaya benar-benar menghitung dari jumlah subscription aktif di host account terkait (sesuai catatan teknis PRD bagian 6 — jangan simpan sisa_slot sebagai angka statis).
6. Fitur hapus/nonaktifkan subscription, dan filter list berdasarkan status.
```

**Checklist sebelum lanjut:** tambah customer baru benar-benar mengurangi sisa slot di halaman stok, perpanjang membuat baris baru (bukan menimpa), status berubah otomatis sesuai tanggal.

---

## Prompt 4 — Dashboard

```
Bangun halaman dashboard (/) sesuai PRD FR2.

Tolong buat kartu ringkasan:
1. Total pendapatan hari ini, bulan ini, dan all-time (hitung dari SUM price semua /subscriptions, filter berdasarkan created_at atau start_date).
2. Jumlah customer dengan status aktif.
3. List singkat customer yang status-nya akan_habis (≤3 hari), urutkan dari yang paling cepat habis.
4. List singkat host account yang sisa slotnya ≤1 atau active_until-nya ≤7 hari dari hari ini.

Semua data realtime, dan halaman ini jadi landing page setelah login.
```

**Checklist sebelum lanjut:** angka di dashboard sesuai dengan data asli di /stok dan /customer, update otomatis kalau ada perubahan data.

---

## Prompt 5 — Notifikasi Telegram + Cron Harian

```
Bangun fitur notifikasi otomatis sesuai PRD bagian 8.

Tolong buat:
1. API route app/api/cron/reminder/route.ts yang:
   - Menggunakan Firebase Admin SDK (server-side, bukan client SDK) untuk query data dari Realtime Database.
   - Cek /subscriptions dengan expiry_date dalam 3 hari ke depan atau hari ini.
   - Cek /host_accounts dengan active_until dalam 7 hari ke depan.
   - Kirim pesan ke Telegram lewat fetch ke Telegram Bot API (API TELEGRAM), formatnya ikuti contoh di PRD bagian 8.
2. Endpoint ini harus dilindungi dengan secret (cek header/query param CRON_SECRET) supaya tidak bisa dipanggil sembarang orang dari luar.
3. Buat file vercel.json dengan konfigurasi cron job yang memanggil endpoint ini setiap hari jam 08:00 waktu lokal.
4. Tambahkan instruksi singkat di README cara membuat bot Telegram (lewat @BotFather) dan cara dapat chat_id.
5. Update .env.local dengan TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRON_SECRET, dan kredensial Firebase Admin SDK (service account).
```

**Checklist sebelum lanjut:** bisa trigger endpoint ini manual (lewat browser/Postman dengan secret yang benar) dan pesan benar-benar masuk ke Telegram.

---

## Prompt 6 — Laporan, Export, Search & Polish

```
Tambahkan fitur terakhir sesuai PRD FR6 dan FR7:

1. Halaman atau section laporan: filter rentang tanggal dan/atau pilih host account, tampilkan total pendapatan sesuai filter, dan tombol "Export CSV" yang mengunduh data subscription sesuai filter.
2. Search bar di halaman /customer untuk cari berdasarkan customer_email.
3. Cek seluruh halaman (dashboard, stok, customer) di tampilan mobile — pastikan tabel tidak overflow, tombol cukup besar untuk ditekan di HP.
4. Rapikan loading state dan error state di semua fetch data dari Firebase (jangan biarkan halaman blank kalau data masih loading atau gagal load).
```

**Checklist sebelum lanjut:** export CSV berisi data yang benar sesuai filter, semua halaman nyaman dipakai dari HP.

---

## Prompt 7 — Deploy ke Vercel

```
Sekarang saya mau deploy ke Vercel. Tolong:
1. Pastikan tidak ada API key atau secret yang ke-hardcode di kode, semua sudah lewat environment variable.
2. Buat daftar lengkap environment variable yang harus saya isi manual di dashboard Vercel (nama variable + keterangan singkat untuk masing-masing, termasuk format Firebase Admin service account kalau perlu di-encode base64).
3. Konfirmasi vercel.json sudah benar untuk cron job (jam dan endpoint-nya).
4. Beri saya checklist langkah deploy manual: push ke GitHub → import ke Vercel → isi environment variable → deploy → test cron job di production.
```

**Checklist sebelum lanjut (selesai):** aplikasi bisa diakses dari domain Vercel, login berfungsi, dan reminder Telegram pertama di production berhasil terkirim sesuai jadwal cron.