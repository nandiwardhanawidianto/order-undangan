ROYAL WEDDING ORDER BOARD
WEB + WINDOWS DESKTOP

STACK
- Frontend: React + Vite
- Backend hosting: PHP (backend/api.php)
- Database: MySQL/MariaDB hosting
- Tabel: wedding_orders
- Desktop Windows: Tauri 2

PENTING
- Database hosting tetap dipakai bersama oleh versi web dan versi PC.
- Tidak ada migration/reset database untuk versi desktop.
- backend/config.php tetap hanya berada di hosting/lokal dan TIDAK masuk Git.
- Aplikasi desktop tidak menyimpan username/password database.
- Aplikasi desktop berkomunikasi ke backend/api.php melalui HTTPS.

FITUR
- Orderan Masuk
- Revisi
- Antri Cetak
- Proses Cetak
- Selesai Cetak
- Pending
- Sudah Dikirim
- Semua List
- Search global semua status
- Sort terbaru/terlama berdasarkan tanggal dari No Pesanan
- Tanggal No Pesanan otomatis dari format YYMMDD, contoh 260902... = 02 September
- Mendukung 1 atau 2 nomor pesanan dalam satu order (pisahkan Enter atau koma)
- Jenis order hanya Digital dan Cetak
- Indikator warna varian Merah, Biru, Hijau/Sage, Coklat, Pink, Hitam
- Auto refresh data setiap 30 detik saat aplikasi aktif
- URL backend dapat diganti dari menu Pengaturan Koneksi

==================================================
VERSI WEB / HOSTING
==================================================

Database:
- Gunakan database yang sudah dipakai aplikasi sekarang.
- Tabel: wedding_orders

1. Buat backend/config.php di hosting.
   File ini tidak ada di Git karena berisi credential database.

2. Build frontend:
   cd frontend
   npm install
   npm run build

3. Upload ISI frontend/dist ke document root aplikasi order.

4. Upload folder backend ke folder backend di document root.

Struktur contoh:
  index.html
  assets/...
  backend/api.php
  backend/config.php

==================================================
VERSI WINDOWS DESKTOP
==================================================

Cara termudah: GitHub Actions

Setiap push ke branch main atau desktop-windows yang mengubah folder frontend,
workflow "Build Windows Desktop" akan membuat file:

  RoyalWeddingOrderBoard.exe

File tersedia sebagai artifact:
  RoyalWeddingOrderBoard-Windows

Aplikasi PC default mencoba backend:
  https://order.royalweddinginvitiation.com/backend/api.php

Jika alamat backend berbeda:
- Buka aplikasi PC
- Klik "Pengaturan koneksi"
- Isi URL backend/api.php yang benar
- Klik "Tes Koneksi"
- Klik "Simpan"

Tidak perlu build ulang hanya untuk mengganti URL backend.

==================================================
BUILD WINDOWS MANUAL
==================================================

Prasyarat Windows:
- Node.js
- Rust stable MSVC
- Microsoft C++ Build Tools
- Microsoft Edge WebView2

Dari folder frontend:

  npm install
  cargo install tauri-cli --version "^2.0.0" --locked
  cargo tauri build --no-bundle

Hasil:
  frontend/src-tauri/target/release/RoyalWeddingOrderBoard.exe
