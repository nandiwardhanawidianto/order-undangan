ORDER BOARD STANDALONE - TANPA LARAVEL / TANPA CMS

Database:
- Gunakan database yang sudah di-import sebelumnya.
- Tabel yang dipakai: wedding_orders

1. Edit backend/config.php
Isi:
  database = nama database hosting
  username = username database hosting
  password = password database hosting

2. Build frontend di komputer:
  cd frontend
  npm install
  npm run build

3. Setelah build selesai, folder frontend/dist akan terbentuk.

4. Di hosting buat folder misalnya:
   public_html/order-board/

5. Upload ISI frontend/dist ke:
   public_html/order-board/

6. Upload folder backend ke:
   public_html/order-board/backend/

Hasil akhirnya:
  public_html/order-board/index.html
  public_html/order-board/assets/...
  public_html/order-board/backend/api.php
  public_html/order-board/backend/config.php

7. Buka:
   https://domainkamu.com/order-board/

CMS Laravel lama tidak disentuh.
