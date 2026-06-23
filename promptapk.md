# 📱 Panduan Prompting: Ubah Web Penjualan Jadi PWA Siap PWABuilder
**Stack: Next.js App Router · Firebase RTDB · Vercel · Target: PWABuilder**

---

## 📌 Apa Itu PWA & Kenapa Perlu Ini?

PWA (Progressive Web App) membuat websitemu bisa **diinstall seperti aplikasi** di HP dan PC — muncul di layar utama, bisa buka tanpa browser, dan bisa didaftarkan ke store lewat [pwabuilder.com](https://www.pwabuilder.com).

**Yang harus disiapkan agar PWABuilder mau memproses:**

| Kebutuhan | Status |
|-----------|--------|
| HTTPS | ✅ Otomatis dari Vercel |
| Web App Manifest (`manifest.json`) | ❌ Belum ada → kita buat |
| Service Worker | ❌ Belum ada → kita install |
| Icon lengkap (192×192 & 512×512 minimal) | ❌ Belum ada → kita siapkan |
| Meta tag di `<head>` | ❌ Belum ada → kita tambah |

---

## 🗂️ Urutan Pekerjaan

```
Fase 0  →  Siapkan File Icon (manual, tanpa coding)
Fase 1  →  Buat Web Manifest (app/manifest.ts)
Fase 2  →  Install & Setup Service Worker
Fase 3  →  Update next.config.ts
Fase 4  →  Update app/layout.tsx (meta tags)
Fase 5  →  Test Lokal di Chrome
Fase 6  →  Deploy & Cek Score di PWABuilder
```

---

## ⚡ FASE 0 — Siapkan Icon (Tanpa Coding, Manual Kamu)

> Ini dilakukan KAMU sendiri sebelum mulai coding. Tidak perlu prompt AI.

**Langkah:**

1. Siapkan **1 file logo** toko kamu ukuran **minimal 512×512 piksel** (PNG, latar transparan atau solid)
   - Bisa pakai logo j0eeys premiums yang sudah dibuat sebelumnya
   - Simpan sementara di desktop sebagai `logo-512.png`

2. Buka **[https://www.pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)** di browser

3. Upload `logo-512.png` → klik **Generate** → Download ZIP

4. Extract ZIP → kamu akan dapat folder berisi icon berbagai ukuran

5. Di folder proyekmu, buat folder `public/icons/`

6. Copy semua icon hasil generate ke dalam `public/icons/`

7. Pastikan setidaknya file-file ini ada:
   ```
   public/
   └── icons/
       ├── icon-72x72.png
       ├── icon-96x96.png
       ├── icon-128x128.png
       ├── icon-144x144.png
       ├── icon-152x152.png
       ├── icon-192x192.png
       ├── icon-256x256.png
       ├── icon-384x384.png
       ├── icon-512x512.png
       └── icon-maskable-512x512.png   ← biasanya ada di hasil generate
   ```

8. Tambahan — copy salah satu icon sebagai:
   ```
   public/apple-touch-icon.png   ← copy dari icon-180x180.png atau icon-192x192.png
   public/favicon.ico            ← biasanya sudah ada, kalau tidak ada generate di favicon.io
   ```

✅ Fase 0 selesai. Lanjut ke coding.

---

## ⚡ FASE 1 — Buat Web Manifest

> Next.js App Router mendukung manifest secara native lewat `app/manifest.ts` — tidak perlu plugin tambahan.

---

### 📋 PROMPT 1.1 — Buat File app/manifest.ts

```
Buat file baru: `app/manifest.ts`

Ini adalah Web App Manifest untuk PWA aplikasi toko digital "j0eeys premiums".
Gunakan Next.js App Router native manifest API (MetadataRoute.Manifest).

Isi file:

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'j0eeys premiums',
    short_name: 'j0eeys',
    description: 'Toko digital premium — Apps Premium, PremiumShare, Privat Premium',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0E1A',
    theme_color: '#0B0E1A',
    categories: ['shopping', 'business', 'utilities'],
    icons: [
      { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
      { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard.png',
        sizes: '1280x720',
        type: 'image/png',
        label: 'Dashboard j0eeys premiums'
      }
    ]
  }
}

Tulis persis seperti ini tanpa modifikasi apapun.
```

---

### 📋 PROMPT 1.2 — Verifikasi Manifest Terbaca

```
Setelah file app/manifest.ts dibuat:

1. Jalankan npm run dev
2. Buka http://localhost:3000/manifest.json di browser
3. Apakah muncul JSON yang valid dengan field name, icons, start_url, dll?

Jika muncul JSON yang benar → lanjut.
Jika error 404 → periksa apakah file ada di path `app/manifest.ts` (bukan di folder lain).
```

---

## ⚡ FASE 2 — Install & Setup Service Worker

> Service Worker adalah komponen inti PWA. Kita gunakan paket `@ducanh2912/next-pwa` yang kompatibel dengan Next.js App Router.
> JANGAN gunakan `next-pwa` dari shadowwalker — tidak kompatibel dengan App Router.

---

### 📋 PROMPT 2.1 — Install Package next-pwa

```
Di terminal, jalankan perintah install ini:

npm install @ducanh2912/next-pwa

Setelah selesai, konfirmasi bahwa paket berhasil terinstall dengan menjalankan:
cat package.json | grep ducanh

Pastikan ada baris "@ducanh2912/next-pwa" di dependencies.
Jangan lakukan perubahan apapun pada kode dulu — hanya install paket ini.
```

---

### 📋 PROMPT 2.2 — Setup Service Worker di next.config.ts

```
Buka file `next.config.ts` yang sudah ada di root proyek.

Tambahkan konfigurasi next-pwa dengan cara MEMBUNGKUS konfigurasi yang sudah ada,
bukan mengganti atau menghapus yang lama.

Lakukan perubahan ini:

SEBELUM (struktur yang mungkin sudah ada):
import type { NextConfig } from "next"
const nextConfig: NextConfig = {
  // ... isi konfigurasi yang sudah ada
}
export default nextConfig

SESUDAH (tambahkan wrapper withPWA):
import type { NextConfig } from "next"
import withPWAInit from "@ducanh2912/next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
})

const nextConfig: NextConfig = {
  // ... JAGA ISI KONFIGURASI LAMA, JANGAN HAPUS APAPUN
}

export default withPWA(nextConfig)

PENTING:
- Jangan hapus konfigurasi yang sudah ada di dalam nextConfig
- Hanya tambahkan import withPWAInit di atas dan withPWA() di bawah
- `disable: process.env.NODE_ENV === "development"` ini penting — agar SW tidak aktif di development lokal (menghindari konflik cache saat develop)
```

---

## ⚡ FASE 3 — Update Meta Tags di Layout

---

### 📋 PROMPT 3.1 — Update app/layout.tsx

```
Buka file `app/layout.tsx`.

Tambahkan/update objek metadata dan tambahkan tag di dalam <head> untuk PWA.

BAGIAN 1 — Update atau tambah export const metadata:
Cari apakah sudah ada `export const metadata`. 
Jika sudah ada → update dengan menambahkan field yang belum ada.
Jika belum ada → tambahkan baru.

export const metadata: Metadata = {
  title: 'j0eeys premiums',
  description: 'Toko digital premium — Apps Premium, PremiumShare, Privat Premium',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'j0eeys premiums',
  },
  formatDetection: {
    telephone: false,
  },
}

BAGIAN 2 — Tambahkan tag di dalam <head> di return JSX:
Di dalam <head> (atau jika tidak ada <head> eksplisit, letakkan sebelum {children}):

<head>
  {/* tag yang sudah ada */}
  <meta name="theme-color" content="#0B0E1A" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="j0eeys" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</head>

PENTING: Jangan hapus tag yang sudah ada. Hanya tambahkan yang belum ada.
Jangan ubah struktur layout, font, atau styling yang sudah ada.
```

---

## ⚡ FASE 4 — Buat Halaman Offline (Opsional tapi Direkomendasikan)

---

### 📋 PROMPT 4.1 — Buat Halaman Offline

```
Buat file baru: `app/offline/page.tsx`

Ini adalah halaman yang tampil ketika user membuka app tapi tidak ada koneksi internet.

Buat halaman sederhana dengan konten:
- Judul: "Tidak Ada Koneksi"  
- Pesan: "j0eeys premiums membutuhkan koneksi internet untuk bekerja."
- Sub pesan: "Periksa koneksi internetmu dan coba lagi."
- Tombol "Coba Lagi" yang memanggil window.location.reload()
- Icon: emoji 📡 atau WiFi off

Style:
- Gunakan Tailwind CSS
- Layout: flex column, center horizontal & vertical, min-h-screen
- Background: gelap (bg-gray-950 atau bg-slate-950)
- Text: putih
- Tombol: style outline atau border

Juga buat file `public/offline.html` dengan konten HTML sederhana yang sama
(ini digunakan service worker sebagai fallback ketika Next.js belum load):

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tidak Ada Koneksi — j0eeys premiums</title>
  <style>
    body { font-family: sans-serif; background: #0B0E1A; color: white; 
           display: flex; align-items: center; justify-content: center; 
           min-height: 100vh; margin: 0; text-align: center; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 12px; }
    p { color: #9ca3af; margin-bottom: 24px; }
    button { background: transparent; border: 1px solid #D4AF37; color: #D4AF37;
             padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 1rem; }
  </style>
</head>
<body>
  <div>
    <div style="font-size: 3rem; margin-bottom: 16px;">📡</div>
    <h1>Tidak Ada Koneksi</h1>
    <p>j0eeys premiums membutuhkan koneksi internet untuk bekerja.<br>Periksa koneksi internetmu dan coba lagi.</p>
    <button onclick="window.location.reload()">Coba Lagi</button>
  </div>
</body>
</html>
```

---

## ⚡ FASE 5 — Buat Screenshot untuk PWABuilder

> Screenshot diperlukan untuk tampilan di store listing (Google Play, Microsoft Store).
> Ini dilakukan MANUAL oleh kamu — tidak perlu prompt AI.

**Langkah manual:**

1. Jalankan `npm run dev` → buka `http://localhost:3000`
2. Buka Chrome DevTools (F12) → klik ikon HP (Toggle Device Toolbar)
3. Set ukuran ke **1280×720** (landscape) atau **390×844** (portrait/mobile)
4. Screenshot halaman Dashboard → simpan sebagai `public/screenshots/dashboard.png`
5. Screenshot halaman Customers → simpan sebagai `public/screenshots/customers.png`

> Folder `public/screenshots/` harus dibuat dulu secara manual.

---

## ⚡ FASE 6 — Build & Test Lokal

---

### 📋 PROMPT 6.1 — Build Production Lokal

```
Jalankan perintah berikut di terminal untuk build production:

npm run build

Jika ada error TypeScript atau build error, tampilkan semua error dan perbaiki.

Setelah build sukses, jalankan:
npm run start

Ini menjalankan production build di http://localhost:3000
(Service Worker HANYA aktif di mode production, bukan di `npm run dev`)
```

---

### 📋 PROMPT 6.2 — Verifikasi PWA di Chrome DevTools

```
Setelah `npm run start` berjalan di http://localhost:3000:

Instruksikan aku untuk melakukan langkah-langkah verifikasi ini di Chrome:

1. Buka http://localhost:3000 di Chrome
2. Buka DevTools (F12) → tab "Application"
3. Klik "Service Workers" di sidebar kiri → apakah ada SW yang status "activated and running"?
4. Klik "Manifest" di sidebar kiri → apakah manifest terbaca dengan benar?
   - Apakah name = "j0eeys premiums"?
   - Apakah icons muncul?
   - Apakah ada error merah di sini?
5. Di address bar Chrome, apakah muncul ikon install (⊕) di pojok kanan?

Jika SW belum muncul atau ada error di Manifest, tampilkan error-nya dan perbaiki.
Jika semua OK, berarti PWA sudah siap untuk deploy.
```

---

## ⚡ FASE 7 — Deploy ke Vercel & Cek di PWABuilder

> Ini langkah manual — tidak perlu prompt AI.

**Langkah deploy:**

```bash
git add .
git commit -m "feat: tambah PWA support (manifest, service worker, icons)"
git push origin main
```

Tunggu Vercel selesai deploy (cek di dashboard Vercel). Biasanya 1-3 menit.

**Langkah cek di PWABuilder:**

1. Buka **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
2. Masukkan URL Vercel-mu, contoh: `https://webpenjualan-xxxx.vercel.app`
3. Klik **Start** dan tunggu analisis selesai
4. Lihat score di 3 bagian:
   - **Manifest** → target: hijau / 100
   - **Service Worker** → target: hijau / 100
   - **Security (HTTPS)** → otomatis ✅

**Interpretasi score:**
| Score | Artinya |
|-------|---------|
| 🟢 Hijau semua | Siap publish ke store |
| 🟡 Kuning sebagian | Bisa lanjut tapi ada fitur opsional yang kurang |
| 🔴 Merah | Ada yang wajib diperbaiki sebelum bisa publish |

---

### 📋 PROMPT 7.1 — Jika Ada Score Merah di PWABuilder

```
PWABuilder memberikan score/warning berikut pada web saya:
[paste pesan error atau warning dari PWABuilder di sini]

Tolong analisis apa yang kurang dan perbaiki kode yang diperlukan.

Konteks:
- Framework: Next.js App Router
- Manifest ada di: app/manifest.ts
- Service Worker menggunakan @ducanh2912/next-pwa
- Icons ada di: public/icons/
- Deploy di Vercel
```

---

## ⚡ BONUS — Packaging untuk Store (Setelah Score Hijau)

Setelah score di PWABuilder hijau semua, kamu bisa langsung packaging:

### Untuk Android (Google Play)
1. Di PWABuilder → klik **Package for Stores** → pilih **Android**
2. Pilih **"Android (using Bubblewrap)"**
3. Isi form: Package name: `com.j0eeys.premiums`, Version: `1.0.0`
4. Download APK/AAB → upload ke Google Play Console

### Untuk Windows (Microsoft Store)
1. Di PWABuilder → klik **Package for Stores** → pilih **Windows**
2. Download package `.msixbundle`
3. Upload ke Microsoft Partner Center

### Untuk iOS (Apple App Store)
1. Di PWABuilder → klik **Package for Stores** → pilih **iOS**
2. Butuh Mac & Xcode untuk proses final
3. Atau gunakan jasa MacinCloud (cloud Mac)

---

## 🗂️ Checklist File yang Harus Ada Setelah Semua Fase

```
proyek/
├── app/
│   ├── manifest.ts           ← BARU ✨
│   ├── layout.tsx            ← DIUPDATE ✨
│   └── offline/
│       └── page.tsx          ← BARU ✨
├── public/
│   ├── icons/
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-256x256.png
│   │   ├── icon-384x384.png
│   │   ├── icon-512x512.png
│   │   └── icon-maskable-512x512.png
│   ├── screenshots/
│   │   └── dashboard.png
│   ├── offline.html          ← BARU ✨
│   ├── apple-touch-icon.png  ← BARU ✨
│   ├── sw.js                 ← AUTO-GENERATE oleh next-pwa saat build ✨
│   └── workbox-*.js          ← AUTO-GENERATE oleh next-pwa saat build ✨
└── next.config.ts            ← DIUPDATE ✨
```

---

## ⚠️ Tips Penting

1. **Service Worker TIDAK aktif di `npm run dev`** — ini disengaja (opsi `disable: process.env.NODE_ENV === "development"`). Untuk test SW, selalu pakai `npm run build` + `npm run start`.

2. **Cache bisa bikin bingung** — jika ada perubahan kode tapi di browser tidak kelihatan, buka Chrome DevTools → Application → Service Workers → klik **"Unregister"** → refresh halaman.

3. **Icon wajib transparan atau solid** — icon dengan bayangan/gradient tidak selalu keliatan bagus di semua platform. Yang paling aman: logo di tengah, background solid warna `#0B0E1A`.

4. **Maskable icon** — ini khusus untuk Android, logonya harus punya "safe zone" di tengah (tidak terlalu dekat ke pinggir). PWABuilder Image Generator sudah otomatis generate ini.

5. **Screenshot** — kalau tidak ada screenshot, PWA tetap bisa diinstall tapi score di PWABuilder tidak sempurna dan tampilan di store kurang bagus.

---

*Panduan ini dibuat untuk proyek `Kimia-UM/webpenjualan` — Juni 2026*