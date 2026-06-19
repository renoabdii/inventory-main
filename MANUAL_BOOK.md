# MANUAL BOOK INVENTORYPRO

**Sistem Manajemen Inventory dan Point of Sale**

**Versi dokumen:** 1.0 Final

**Tanggal pembaruan:** 19 Juni 2026

**Platform:** Web

**Pengguna:** Admin dan Kasir

---

## Informasi Dokumen

Manual book ini menjadi panduan resmi penggunaan, instalasi, pengoperasian, pengujian, dan pemeliharaan InventoryPro. Isi dokumen disesuaikan dengan fitur yang tersedia pada project saat ini.

> Akun, harga, nama toko, dan data pada gambar/demo dapat berbeda dari instalasi sebenarnya. Jangan menggunakan akun dan password demo pada lingkungan production.

## Daftar Isi

1. Pendahuluan
2. Gambaran Sistem
3. Kebutuhan dan Instalasi
4. Login, Hak Akses, dan Keamanan Akun
5. Panduan Admin
6. Panduan Kasir
7. Alur Bisnis Utama
8. Prediksi Stok LSTM
9. Finite State Machine (FSM)
10. Laporan, Export, dan Audit Data
11. QRIS Development dan Production
12. Deployment, Backup, dan Pemeliharaan
13. Troubleshooting
14. Pengujian dan Checklist Penerimaan
15. Glosarium
16. Penutup

---

# 1. Pendahuluan

## 1.1 Latar Belakang

InventoryPro adalah aplikasi web untuk membantu operasional inventory swalayan atau minimarket. Sistem menghubungkan proses pembelian, penerimaan barang, perubahan stok, penjualan kasir, pembayaran, laporan, dan prediksi kebutuhan restock dalam satu aplikasi.

## 1.2 Tujuan

InventoryPro bertujuan untuk:

- Menyediakan data produk dan stok yang terpusat.
- Mencatat asal setiap pergerakan stok.
- Mengurangi kesalahan perubahan status Purchase Order dan Barang Masuk.
- Mendukung transaksi kasir menggunakan cash dan QRIS.
- Membantu audit shift serta selisih kas.
- Menyajikan laporan berdasarkan periode.
- Memberikan rekomendasi restock melalui LSTM atau moving average.

## 1.3 Ruang Lingkup

Fitur utama meliputi:

- Autentikasi dan pembatasan akses berdasarkan role.
- Dashboard Admin dan Kasir.
- Produk, kategori, supplier, import, dan export inventory.
- Purchase Order dan pengiriman detail melalui WhatsApp.
- Barang Masuk dan Pergerakan Stok.
- POS cash dan QRIS.
- Shift, transaksi, nota, dan audit kasir.
- Laporan serta export XLSX/CSV.
- Forecast stok menggunakan LSTM dengan fallback moving average.
- FSM untuk menjaga transisi status bisnis.

---

# 2. Gambaran Sistem

## 2.1 Arsitektur

```text
Browser
  -> React + TypeScript
  -> REST API Express.js
  -> MongoDB
  -> Python TensorFlow/Keras untuk forecast
  -> Xendit untuk QRIS
```

Frontend dibangun menggunakan React, TypeScript, Vite, Tailwind CSS, dan shadcn/ui. Backend menggunakan Node.js, Express, MongoDB, Mongoose, serta JWT. Prediksi berjalan melalui proses Python. Pada production, backend dapat sekaligus menyajikan hasil build frontend dari folder `dist`.

## 2.2 Role Pengguna

| Role | Tanggung jawab utama |
| --- | --- |
| Admin | Master data, pembelian, penerimaan, stok, laporan, forecast, akun kasir, dan audit shift |
| Kasir | Shift, POS, pembayaran, transaksi, cek stok, dan profil sendiri |

Data kasir terikat kepada admin pemiliknya. Kasir hanya menggunakan data produk dan transaksi pada lingkup admin tersebut, sedangkan akun admin tidak dicampur ke daftar akun kasir.

## 2.3 Menu Admin

- Dashboard
- Produk
- Kategori
- Barang Masuk
- Pergerakan Stok
- Supplier
- Purchase Order
- Laporan
- Prediksi Stok
- Akun Kasir
- Audit Shift

## 2.4 Menu Kasir

- Dashboard
- POS
- Riwayat Transaksi
- Shift Kasir
- Cek Stok
- Profil

---

# 3. Kebutuhan dan Instalasi

## 3.1 Kebutuhan Pengguna

- Komputer, laptop, atau tablet dengan koneksi jaringan.
- Browser modern seperti Chrome, Edge, atau Firefox.
- Resolusi layar yang memadai untuk penggunaan POS.

## 3.2 Kebutuhan Development/Server

- Node.js 18 atau lebih baru.
- npm.
- MongoDB lokal atau MongoDB Atlas.
- Python 3.10 atau lebih baru.
- Akses internet untuk MongoDB Atlas dan QRIS Xendit.

## 3.3 Instalasi Dependency

Dari folder utama project:

```powershell
npm install
Set-Location kirobackend
npm install
python -m pip install -r src/forecast/requirements.txt
```

## 3.4 Konfigurasi Environment Backend

Salin `kirobackend/.env.example` menjadi `kirobackend/.env`, kemudian isi sesuai environment.

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=ganti_dengan_secret_yang_panjang_dan_acak
JWT_EXPIRES_IN=12h

FORECAST_LSTM_MAX_PRODUCTS=3
FORECAST_LSTM_EPOCHS=6
FORECAST_LSTM_HORIZON=30
FORECAST_TIMEOUT_MS=300000

XENDIT_SECRET_KEY=
XENDIT_CALLBACK_TOKEN=
XENDIT_CALLBACK_URL=
APP_PUBLIC_URL=
```

Keterangan:

| Variabel | Fungsi |
| --- | --- |
| `PORT` | Port backend |
| `NODE_ENV` | `development` atau `production` |
| `MONGODB_URI` | Koneksi database MongoDB |
| `JWT_SECRET` | Kunci penandatanganan token login |
| `JWT_EXPIRES_IN` | Masa berlaku token; default 12 jam |
| `FORECAST_TIMEOUT_MS` | Batas waktu proses Python; default 300.000 ms |
| `FORECAST_LSTM_*` | Batas produk, epoch, dan horizon model |
| `XENDIT_SECRET_KEY` | API key Xendit |
| `XENDIT_CALLBACK_TOKEN` | Token validasi callback Xendit |
| `XENDIT_CALLBACK_URL` | URL callback publik backend |
| `APP_PUBLIC_URL` | URL publik aplikasi jika diperlukan provider |

Jika frontend dan backend berbeda domain, tambahkan environment frontend:

```env
VITE_API_URL=https://alamat-backend.example.com
```

Jika satu domain, `VITE_API_URL` dapat dikosongkan agar request menggunakan `/api` pada origin yang sama.

## 3.5 Menjalankan Development

Terminal frontend:

```powershell
npm run dev
```

Terminal backend:

```powershell
Set-Location kirobackend
npm run dev
```

`npm run dev` menggunakan server development dan auto-reload. Untuk backend tanpa auto-reload gunakan:

```powershell
npm start
```

## 3.6 Menjalankan Build Production Lokal

```powershell
npm run build
Set-Location kirobackend
npm start
```

Backend akan menyajikan frontend dari folder `dist` jika build tersedia.

## 3.7 Seeder Akun Demo

```powershell
Set-Location kirobackend
npm run seed:admin
npm run seed:kasir
```

| Role | Username demo | Password demo |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Kasir | `kasir1` | `kasir123` |

Segera ganti password default setelah instalasi. Seeder sebaiknya tidak dijalankan sembarangan pada database production.

---

# 4. Login, Hak Akses, dan Keamanan Akun

## 4.1 Login Admin

1. Buka halaman aplikasi.
2. Masukkan username dan password admin.
3. Klik **Login**.
4. Sistem mengarahkan admin ke `/dashboard`.

## 4.2 Login Kasir

1. Masukkan username dan password kasir.
2. Klik **Login**.
3. Sistem mengarahkan kasir ke `/kasir`.
4. Buka shift sebelum melakukan transaksi.

## 4.3 Pembatasan Role

- Route `/dashboard/*` hanya untuk admin.
- Route `/kasir/*` hanya untuk kasir.
- Backend tetap melakukan validasi role; menyembunyikan menu saja tidak dianggap cukup.
- Kasir akan menerima HTTP 403 jika mencoba endpoint khusus admin.

## 4.4 Aturan Password

Password harus:

- Minimal 8 karakter.
- Mengandung huruf.
- Mengandung angka.

Password disimpan dalam bentuk hash bcrypt, bukan teks biasa.

## 4.5 Perlindungan Login dan Sesi

- Maksimal 5 kegagalan login untuk kombinasi IP dan username dalam 15 menit.
- Token login berlaku 12 jam secara default.
- Mengubah atau mereset password membatalkan token lama melalui `tokenVersion`.
- Respons API menggunakan `Cache-Control: no-store` untuk mencegah cache data sensitif.

## 4.6 Praktik Keamanan Pengguna

- Jangan membagikan akun antarpegawai.
- Logout saat meninggalkan perangkat.
- Jangan menyimpan password pada catatan terbuka.
- Gunakan password unik dan ganti password demo.
- Jangan memasukkan file `.env` ke Git.
- Jika secret pernah tersebar, segera lakukan rotasi secret.

---

# 5. Panduan Admin

## 5.1 Dashboard

Dashboard menampilkan ringkasan inventory dan prioritas tindakan, termasuk total produk, stok rendah/kritis, aktivitas, serta notifikasi PO.

Langkah penggunaan:

1. Login sebagai admin.
2. Buka **Dashboard**.
3. Periksa kartu ringkasan dan notifikasi.
4. Klik informasi stok rendah untuk menuju data yang perlu ditindaklanjuti.

## 5.2 Produk

Data produk meliputi nama, SKU, barcode, kategori, supplier, stok, minimum stok, harga, dan status stok.

### Menambah produk

1. Buka **Produk**.
2. Klik **Tambah Produk**.
3. Isi nama, SKU, barcode bila ada, kategori, supplier, stok, minimum stok, dan harga.
4. Klik **Simpan**.

Catatan:

- SKU harus unik.
- Barcode, jika diisi, harus unik.
- Kategori harus aktif.
- Supplier harus aktif jika dipilih.
- Stok awal lebih dari nol otomatis dicatat sebagai Stock Movement `IN` dengan sumber stok awal.
- Harga ditampilkan dalam format Rupiah tetapi dikirim ke backend sebagai angka.

### Mengedit produk

1. Cari produk.
2. Klik aksi **Edit**.
3. Ubah data yang diperlukan.
4. Simpan perubahan.

Perubahan jumlah stok melalui edit produk akan menghasilkan catatan penyesuaian stok sehingga riwayat tetap dapat diaudit.

### Menghapus produk

Produk tidak dapat dihapus jika masih mempunyai referensi pergerakan stok. Gunakan edit atau pertahankan data historis agar audit tidak terputus.

### Import Excel/CSV

1. Buka dialog **Import**.
2. Unduh template jika diperlukan.
3. Isi file tanpa mengubah nama kolom utama.
4. Pilih file `.xlsx`, `.xls`, atau `.csv`.
5. Periksa preview.
6. Klik **Konfirmasi Import**.
7. Periksa daftar baris gagal bila ada.

Kolom template:

| Kolom | Ketentuan |
| --- | --- |
| Nama Barang | Wajib |
| SKU | Wajib dan unik |
| Barcode | Opsional dan unik jika diisi |
| Kategori | Harus sudah ada dan aktif |
| Stok | Angka minimal 0 |
| Min Stok | Angka minimal 0 |
| Harga | Angka minimal 0 |

Import dengan stok awal lebih dari nol otomatis membuat Stock Movement `IN` dengan sumber `Import`.

### Export produk

Admin dapat memilih:

- **Sesuai filter:** mengikuti pencarian, kategori, dan status stok aktif.
- **Semua data:** mengambil seluruh produk milik admin tanpa dibatasi pagination tampilan.

Format yang tersedia adalah XLSX dan CSV. Pastikan filter sudah benar sebelum export.

## 5.3 Kategori

1. Buka **Kategori**.
2. Tambah nama dan deskripsi kategori.
3. Simpan.
4. Edit atau ubah status sesuai kebutuhan.

Kategori aktif dapat dipilih pada produk. Hindari mengganti nama kategori tanpa memeriksa produk terkait.

## 5.4 Supplier

Data supplier mencakup kode, nama, nomor telepon, alamat, dan status.

1. Buka **Supplier**.
2. Klik tambah supplier.
3. Isi data kontak dengan benar.
4. Simpan sebagai aktif agar dapat dipakai pada produk dan PO.

Nomor telepon digunakan ketika admin membuka detail PO melalui WhatsApp.

## 5.5 Purchase Order

### Membuat PO

1. Buka **Purchase Order**.
2. Klik tambah PO.
3. Isi nomor PO dan pilih supplier.
4. Setelah supplier dipilih, sistem menampilkan produk milik supplier tersebut.
5. Pilih produk, jumlah, dan harga.
6. Tambahkan item lain jika diperlukan.
7. Periksa total lalu simpan.

Backend menolak item yang bukan milik supplier PO. Produk lama dengan supplier kosong perlu diperbaiki terlebih dahulu melalui menu Produk.

### Mengirim lewat WhatsApp

1. Buka PO yang sudah dibuat.
2. Klik aksi WhatsApp.
3. Sistem membuka click-to-chat berisi detail PO.
4. Periksa penerima, item, jumlah, harga, dan total.
5. Kirim secara manual.

Fitur ini membuka pesan siap kirim; aplikasi tidak mengklaim pesan sudah terkirim sebelum pengguna benar-benar mengirimkannya di WhatsApp.

### Status PO

| Status awal | Aksi | Status berikutnya |
| --- | --- | --- |
| `PENDING` | approve | `APPROVED` |
| `PENDING` | cancel | `CANCELLED` |
| `APPROVED` | ship | `SHIPPING` |
| `APPROVED` | cancel | `CANCELLED` |
| `SHIPPING` | complete | `COMPLETED` |

Saat PO berubah dari `SHIPPING` menjadi `COMPLETED`, sistem otomatis:

1. Membuat catatan Barang Masuk dari PO berstatus `completed`.
2. Menambah stok setiap produk.
3. Menghitung ulang status stok.
4. Membuat Stock Movement `IN` dengan referensi PO/Barang Masuk.

Jangan membuat Barang Masuk manual untuk item PO yang sama setelah PO selesai karena stok dapat terhitung dua kali.

PO final `COMPLETED` dan `CANCELLED` tidak dapat diubah lagi. PO hanya dapat dihapus saat masih `PENDING`.

## 5.6 Barang Masuk

Barang Masuk terdiri dari dua sumber:

- `purchase_order`: dibuat otomatis ketika PO selesai.
- `manual`: dibuat admin untuk penerimaan di luar PO.

### Barang Masuk manual

1. Buka **Barang Masuk**.
2. Klik tambah penerimaan.
3. Isi ID penerimaan, tanggal, supplier, produk, jumlah, dan referensi.
4. Simpan; status awal adalah `pending`.
5. Jalankan aksi `process` atau langsung `complete` sesuai kondisi.

Stok baru bertambah ketika status menjadi `completed`. Sistem membuat Stock Movement `IN` dan menandai item terverifikasi.

| Status awal | Aksi | Status berikutnya |
| --- | --- | --- |
| `pending` | process | `in_progress` |
| `pending` | complete | `completed` |
| `pending` | cancel | `cancelled` |
| `in_progress` | complete | `completed` |
| `in_progress` | reject | `rejected` |

Penerimaan yang sudah `completed` tidak dapat dihapus.

## 5.7 Pergerakan Stok

Menu ini merupakan audit trail perubahan kuantitas produk.

Sumber yang dicatat meliputi:

| Arah | Sumber |
| --- | --- |
| `IN` | Stok awal produk |
| `IN` | Import Excel/CSV |
| `IN` | PO completed |
| `IN` | Barang Masuk manual completed |
| `IN` | Penyesuaian stok naik |
| `OUT` | Transaksi POS cash |
| `OUT` | Transaksi POS QRIS settlement |
| `OUT` | Penyesuaian stok turun/manual stock out |

Informasi penting mencakup produk, tipe, jumlah, stok sebelum/sesudah, catatan, model referensi, pengguna, dan waktu.

## 5.8 Laporan

Filter laporan:

- Harian.
- Mingguan.
- Bulanan.
- Rentang tanggal custom.
- Semua waktu.

Isi laporan meliputi:

- Ringkasan produk dan nilai inventory.
- Stok rendah/kritis.
- Supplier aktif dan PO.
- Stock in/out berdasarkan sumber.
- Total dan rata-rata transaksi.
- Total pembayaran cash dan QRIS.
- Produk berdasarkan kategori dan pergerakan terbaru.

Langkah:

1. Pilih periode.
2. Isi tanggal, bulan, atau rentang jika diminta.
3. Tunggu data diperbarui.
4. Verifikasi judul periode.
5. Export XLSX atau CSV.

Export laporan menggunakan data yang sedang tampil sesuai filter periode.

## 5.9 Prediksi Stok

Saat halaman dibuka, sistem menampilkan cache forecast terakhir jika tersedia. Forecast tidak selalu dilatih ulang setiap login.

Untuk proses ulang:

1. Buka **Prediksi Stok**.
2. Klik **Generate Forecast**.
3. Backend menjalankan Python di background.
4. Status menjadi `training` dan halaman melakukan polling.
5. Admin boleh berpindah halaman atau login ulang; cache terakhir tetap tersimpan.
6. Setelah selesai, data otomatis diperbarui menjadi `completed`.

Jangan menekan Generate berulang kali saat status masih training. Sistem memiliki lock agar satu admin tidak menjalankan dua job bersamaan.

## 5.10 Akun Kasir

Admin dapat:

- Membuat akun kasir.
- Mengubah nama dan username.
- Mengaktifkan atau menonaktifkan akun.
- Mengganti atau mereset password.

Setiap admin hanya dapat melihat dan mengelola kasir miliknya. Password baru wajib mengikuti kebijakan keamanan. Setelah reset password, token lama kasir tidak berlaku lagi.

## 5.11 Audit Shift

Informasi audit:

- Kasir.
- Waktu buka dan tutup.
- Modal awal.
- Jumlah transaksi.
- Penjualan cash dan non-cash.
- Kas sistem.
- Kas akhir fisik.
- Selisih dan catatan.

```text
Kas sistem = modal awal + penjualan cash
Selisih kas = kas akhir fisik - kas sistem
```

Nilai positif berarti kas fisik lebih, nilai negatif berarti kas fisik kurang. QRIS tidak masuk ke kas fisik.

---

# 6. Panduan Kasir

## 6.1 Dashboard Kasir

Dashboard menampilkan transaksi hari ini, total penjualan, item terjual, dan status shift. Jika shift belum aktif, kasir harus membukanya sebelum menggunakan POS.

## 6.2 Membuka Shift

1. Buka **Shift Kasir**.
2. Isi modal awal dalam Rupiah.
3. Tambahkan catatan bila perlu.
4. Klik **Buka Shift**.

Satu kasir tidak dapat membuka dua shift aktif pada saat yang sama.

## 6.3 Menambahkan Produk ke POS

1. Buka **POS**.
2. Cari produk berdasarkan nama/SKU atau gunakan input barcode yang tersedia.
3. Klik produk untuk memasukkannya ke keranjang.
4. Atur jumlah.
5. Pastikan jumlah tidak melebihi stok.
6. Periksa subtotal dan total.

## 6.4 Pembayaran Cash

1. Pilih **Cash**.
2. Masukkan uang diterima atau gunakan tombol nominal cepat/Uang Pas.
3. Sistem menampilkan kekurangan atau kembalian.
4. Tombol bayar hanya dapat digunakan jika nominal mencukupi.
5. Setelah berhasil, transaksi dan Stock Movement `OUT` dibuat.
6. Tampilkan atau cetak nota.

## 6.5 Pembayaran QRIS

1. Pilih **QRIS**.
2. Klik bayar.
3. Sistem meminta QR ke Xendit dan menampilkan QR, total, invoice, petunjuk, serta countdown.
4. Pelanggan melakukan scan melalui aplikasi pembayaran.
5. Sistem memeriksa status otomatis; kasir juga dapat klik **Cek Pembayaran**.
6. Transaksi baru dianggap berhasil setelah status settlement/sukses diterima.
7. Setelah berhasil, stok berkurang dan Stock Movement `OUT` dicatat.

Jangan menyerahkan barang hanya berdasarkan bukti screenshot pelanggan. Tunggu status sukses pada aplikasi.

Pada development, bagian kecil **Mode Demo** menyediakan **Konfirmasi Dibayar** tanpa memindahkan dana nyata. Fitur tersebut otomatis disembunyikan ketika `NODE_ENV=production`.

## 6.6 Riwayat Transaksi

Kasir dapat melihat transaksi miliknya, termasuk invoice, waktu, item, total, metode pembayaran, uang bayar, dan kembalian. Gunakan detail transaksi untuk mencetak ulang nota jika tersedia.

## 6.7 Cek Stok

Menu ini bersifat read-only. Kasir dapat mencari produk dan melihat SKU, harga, serta stok, tetapi tidak dapat mengubah data inventory.

## 6.8 Menutup Shift

1. Buka **Shift Kasir**.
2. Periksa kas sistem.
3. Hitung kas fisik di laci.
4. Masukkan kas akhir fisik.
5. Periksa selisih.
6. Tambahkan catatan jika ada selisih.
7. Klik **Tutup Shift**.

Setelah shift ditutup, kasir harus membuka shift baru untuk melakukan transaksi berikutnya.

## 6.9 Mengubah Password

1. Buka **Profil**.
2. Isi password saat ini.
3. Isi dan konfirmasi password baru.
4. Simpan.
5. Login ulang menggunakan password baru jika sesi berakhir.

---

# 7. Alur Bisnis Utama

## 7.1 Setup Awal

```text
Login Admin
-> Buat Kategori
-> Buat Supplier
-> Buat/Import Produk
-> Hubungkan Produk ke Supplier
-> Buat Akun Kasir
```

## 7.2 Pembelian dan Restock

```text
Produk stok rendah
-> Buat PO sesuai supplier
-> APPROVED
-> SHIPPING
-> COMPLETED
-> Barang Masuk otomatis
-> Stok bertambah
-> Stock Movement IN
-> Laporan diperbarui
```

## 7.3 Penjualan Cash

```text
Kasir buka shift
-> Tambah item POS
-> Cash mencukupi
-> Transaksi tersimpan
-> Stok berkurang
-> Stock Movement OUT
-> Penjualan masuk laporan dan audit shift
```

## 7.4 Penjualan QRIS

```text
Kasir buka shift
-> Buat QRIS
-> Status pending
-> Callback/polling Xendit
-> Settlement
-> Transaksi tersimpan
-> Stok berkurang
-> Stock Movement OUT
```

## 7.5 Forecast

```text
Stock Movement OUT historis
-> Agregasi pemakaian harian
-> Kandidat data cukup diproses LSTM
-> Data kurang memakai moving average
-> Estimasi hari sampai stok habis
-> SAFE / RESTOCK / CRITICAL
-> Hasil disimpan ke cache
```

---

# 8. Prediksi Stok LSTM

## 8.1 Tujuan

LSTM membantu memperkirakan laju barang keluar dan waktu stok habis berdasarkan histori Stock Movement `OUT` milik admin.

## 8.2 Input

- Stok produk saat ini.
- Minimum stok.
- Histori jumlah barang keluar per tanggal.
- Sequence histori yang dibutuhkan model.

## 8.3 Output

| Output | Arti |
| --- | --- |
| Avg Out/hari | Estimasi rata-rata barang keluar per hari |
| Prediksi habis | Estimasi hari sampai stok habis |
| Status | `SAFE`, `RESTOCK`, atau `CRITICAL` |
| Method | `lstm` atau `moving_average` |

## 8.4 Fallback Moving Average

Moving average digunakan ketika data produk belum cukup, hasil LSTM tidak valid, atau model tidak tersedia. Dalam satu hasil forecast, sebagian produk dapat menggunakan LSTM dan sebagian lainnya moving average. Ini perilaku normal, bukan berarti seluruh proses gagal.

## 8.5 Background Job dan Cache

- Generate hanya memulai job background.
- Cache lama tetap berguna saat training berjalan.
- Hasil tersimpan per admin.
- Login ulang tidak otomatis melatih ulang.
- Proses ulang dilakukan dengan tombol Generate.
- Timeout backend default 300 detik dan dapat diatur melalui environment.

## 8.6 Interpretasi yang Benar

Forecast merupakan alat bantu keputusan, bukan kepastian penjualan. Admin tetap perlu mempertimbangkan promosi, hari libur, produk musiman, keterlambatan supplier, dan perubahan tren.

---

# 9. Finite State Machine (FSM)

FSM memastikan status tidak dapat dilompati sembarangan.

## 9.1 Purchase Order

```text
PENDING --approve--> APPROVED --ship--> SHIPPING --complete--> COMPLETED
PENDING --cancel--> CANCELLED
APPROVED --cancel--> CANCELLED
```

## 9.2 Barang Masuk

```text
pending --process--> in_progress --complete--> completed
pending --complete--> completed
pending --cancel--> cancelled
in_progress --reject--> rejected
```

## 9.3 Status Stok

| Kondisi | State |
| --- | --- |
| `stock <= 0` | `OUT_OF_STOCK` |
| `stock <= minStock × 0,25` | `CRITICAL` |
| `stock <= minStock` | `LOW` |
| `stock > minStock` | `NORMAL` |

Status tampilan frontend dapat menggunakan label huruf kecil, tetapi keputusan dasarnya mengikuti batas di atas.

---

# 10. Laporan, Export, dan Audit Data

## 10.1 Prinsip Audit

Setiap perubahan stok sebaiknya memiliki sumber dan referensi. Hindari mengubah data langsung di MongoDB karena tindakan tersebut dapat membuat stok, laporan, dan forecast tidak konsisten.

## 10.2 Export Produk

- Export sesuai filter mengikuti pencarian/kategori/status aktif.
- Export semua mengambil seluruh data dalam lingkup admin.
- Pagination layar tidak membatasi jumlah baris export.

## 10.3 Export Laporan

Export laporan mengikuti periode yang aktif dan memuat ringkasan inventory, sumber stock in/out, penjualan, serta metode pembayaran.

## 10.4 Rekonsiliasi

Lakukan rekonsiliasi berkala:

1. Bandingkan stok fisik dengan stok sistem.
2. Periksa Stock Movement untuk selisih.
3. Cocokkan transaksi cash dengan kas shift.
4. Cocokkan transaksi QRIS dengan dashboard Xendit.
5. Periksa PO dan Barang Masuk agar tidak tercatat dua kali.

---

# 11. QRIS Development dan Production

## 11.1 Development/Sandbox

- QR tetap dibuat melalui konfigurasi Xendit sandbox.
- Status awal adalah pending.
- Mode Demo dapat mengonfirmasi pembayaran untuk pengujian tanpa dana nyata.
- Transaksi, stok, dan movement hanya diselesaikan setelah status pembayaran berubah sukses.

## 11.2 Production

Sebelum mengaktifkan QRIS production:

1. Set `NODE_ENV=production`.
2. Gunakan secret key production yang benar.
3. Deploy backend ke alamat HTTPS publik.
4. Atur `XENDIT_CALLBACK_URL` ke endpoint publik callback.
5. Samakan callback token dengan dashboard Xendit.
6. Daftarkan webhook Xendit ke:

```text
https://domain-aplikasi.example.com/api/payments/xendit-callback
```

7. Lakukan transaksi nominal kecil.
8. Pastikan status settlement, transaksi, stok, Stock Movement, dan laporan sesuai.

Simulasi pembayaran otomatis ditolak pada production.

---

# 12. Deployment, Backup, dan Pemeliharaan

## 12.1 Deployment Satu Service

Pilihan paling sederhana adalah satu service Node.js yang menyajikan API dan frontend build.

Alur:

1. Push project ke repository privat/publik sesuai kebutuhan.
2. Buat Web Service pada provider seperti Render.
3. Install dependency frontend dan backend.
4. Jalankan `npm run build` dari root.
5. Jalankan backend dari `kirobackend` menggunakan `npm start`.
6. Isi seluruh environment variable pada dashboard hosting.
7. Perbarui Xendit callback ke domain hosting.
8. Uji login, data, forecast, dan QRIS.

## 12.2 Backup

- Aktifkan backup MongoDB Atlas atau jalankan `mongodump` terjadwal.
- Simpan backup terenkripsi dan batasi aksesnya.
- Uji proses restore, bukan hanya proses backup.
- Lakukan backup sebelum migrasi atau import data besar.

## 12.3 Pemeliharaan Berkala

- Periksa log backend dan kegagalan callback.
- Perbarui dependency secara terkontrol.
- Pantau ukuran database dan index.
- Audit akun kasir yang tidak aktif.
- Rotasi secret secara berkala.
- Periksa performa forecast ketika histori bertambah.
- Jalankan build, test, dan smoke API sebelum release.

## 12.4 Data Semakin Banyak

Saat data bertambah:

- Gunakan pagination untuk daftar.
- Pertahankan filter per admin dan index database.
- Export dilakukan melalui endpoint khusus agar tidak dibatasi halaman.
- Batasi kandidat/epoch LSTM melalui environment.
- Jalankan training di background dan gunakan cache.
- Pertimbangkan worker/queue terpisah jika volume training sangat besar.
- Arsipkan log lama hanya setelah kebijakan retensi ditetapkan.

---

# 13. Troubleshooting

| Masalah | Kemungkinan penyebab | Solusi |
| --- | --- | --- |
| Tidak bisa login | Kredensial salah, akun nonaktif, atau rate limit | Periksa akun; tunggu 15 menit setelah terlalu banyak kegagalan |
| Sesi tiba-tiba berakhir | Token kedaluwarsa atau password diubah | Login ulang |
| Data tidak tampil | Backend/database tidak aktif atau token invalid | Periksa backend, MongoDB, dan login ulang |
| Produk PO tidak muncul | Supplier belum dipilih atau produk tidak terhubung | Edit supplier produk lalu buka ulang PO |
| PO tidak bisa berganti status | Aksi tidak valid menurut FSM | Ikuti urutan status yang tersedia |
| Stok bertambah dua kali | PO completed juga dicatat manual | Jangan duplikasi Barang Masuk dari PO; audit movement |
| Import gagal | Header/angka/kategori/SKU tidak valid | Gunakan template dan periksa daftar error |
| Produk tidak dapat dihapus | Memiliki histori movement | Pertahankan untuk audit atau ubah data tanpa menghapus histori |
| POS tidak dapat digunakan | Shift belum dibuka | Buka shift |
| Cash ditolak | Uang diterima kurang | Masukkan nominal yang mencukupi |
| QRIS tetap pending | Belum dibayar, callback salah, atau koneksi provider gagal | Klik cek pembayaran; periksa webhook dan log backend |
| Tombol Mode Demo tidak ada | Aplikasi berjalan dalam production | Ini normal; gunakan pembayaran/callback nyata |
| Forecast lama | TensorFlow memuat model atau data banyak | Tunggu status background; timeout default 300 detik |
| Forecast moving average | Histori per produk belum cukup | Tambah histori Stock Movement `OUT` yang nyata |
| Forecast gagal koneksi | MongoDB/DNS/Python dependency bermasalah | Periksa URI, internet, Python, dan requirements |
| Export kosong | Filter tidak memiliki data | Ubah filter atau pilih export semua |
| Kas shift selisih | Kas fisik tidak sama dengan perhitungan sistem | Hitung ulang dan isi catatan audit |

---

# 14. Pengujian dan Checklist Penerimaan

## 14.1 Pengujian Otomatis

Jalankan dari root:

```powershell
npx tsc -p tsconfig.app.json --noEmit
npm run test
npm run lint
npm run build
```

Backend:

```powershell
Set-Location kirobackend
npm test
```

Baseline terakhir pada 19 Juni 2026:

- TypeScript lulus.
- Frontend test 1/1 lulus.
- Build production lulus.
- Backend test 16/16 lulus.
- Seluruh file JavaScript backend lulus syntax check.
- FSM PO, Barang Masuk, dan status stok lulus smoke test.
- LSTM selesai dengan metode utama `lstm` dan memproses 21 produk pada data demo.
- Endpoint utama admin dan kasir lulus smoke test read-only.
- Pembatasan role kasir ke endpoint admin menghasilkan HTTP 403.

Warning non-blocking yang diketahui: fast-refresh pada beberapa komponen UI, ukuran bundle besar, data browserslist lama, dan peringatan Keras tentang `input_shape`.

## 14.2 Checklist Manual Admin

- [ ] Login dan logout admin.
- [ ] Tambah, edit, cari, filter, dan hapus produk yang aman dihapus.
- [ ] Import XLSX/CSV valid dan invalid.
- [ ] Export produk sesuai filter dan semua data.
- [ ] CRUD kategori dan supplier.
- [ ] Buat PO dengan produk supplier yang sesuai.
- [ ] Pastikan produk supplier lain ditolak.
- [ ] Kirim detail PO melalui WhatsApp.
- [ ] Jalankan PO hingga completed dan periksa stok/movement.
- [ ] Buat Barang Masuk manual dan selesaikan.
- [ ] Buat penyesuaian stock in/out.
- [ ] Uji semua filter laporan dan export.
- [ ] Generate forecast dan tunggu status completed.
- [ ] Tambah, nonaktifkan, dan reset password kasir.
- [ ] Audit shift dan selisih kas.

## 14.3 Checklist Manual Kasir

- [ ] Login kasir dan pastikan menu admin tidak dapat dibuka.
- [ ] Buka shift.
- [ ] Cari/scan produk dan ubah qty.
- [ ] Uji cash kurang, uang pas, dan kembalian.
- [ ] Periksa nota dan riwayat transaksi.
- [ ] Uji QRIS pending, cek status, sukses, dan expired.
- [ ] Periksa stok berkurang setelah settlement.
- [ ] Cek stok read-only.
- [ ] Tutup shift dengan kas sesuai, lebih, dan kurang pada data uji.
- [ ] Ganti password dan pastikan token lama tidak berlaku.

## 14.4 Checklist Sebelum Production

- [ ] Password demo sudah diganti.
- [ ] `JWT_SECRET` kuat dan unik.
- [ ] `.env` tidak masuk repository.
- [ ] MongoDB membatasi akses jaringan dan user database.
- [ ] HTTPS aktif.
- [ ] `NODE_ENV=production`.
- [ ] Xendit production key, callback token, dan webhook benar.
- [ ] Backup database aktif dan restore pernah diuji.
- [ ] Login, role, POS, QRIS, laporan, dan forecast diuji pada domain production.

---

# 15. Glosarium

| Istilah | Arti |
| --- | --- |
| SKU | Kode unik produk |
| POS | Point of Sale atau halaman transaksi kasir |
| PO | Purchase Order/pesanan pembelian |
| QRIS | Standar pembayaran QR berbasis Rupiah |
| Stock Movement | Catatan perubahan stok masuk/keluar |
| LSTM | Model neural network untuk data berurutan |
| Moving Average | Prediksi berdasarkan rata-rata histori |
| FSM | Aturan state dan transisi status |
| Settlement | Pembayaran telah dikonfirmasi berhasil |
| Cache Forecast | Hasil prediksi terakhir yang disimpan |
| Shift | Sesi kerja kasir sejak buka hingga tutup kas |

---

# 16. Penutup

InventoryPro menghubungkan pengadaan, penerimaan, stok, penjualan, pembayaran, laporan, dan forecast dalam satu alur yang dapat diaudit. Kualitas data tetap bergantung pada disiplin pengguna: gunakan akun masing-masing, ikuti status FSM, hindari pencatatan penerimaan ganda, tunggu settlement QRIS, dan lakukan rekonsiliasi secara berkala.

Dokumen ini harus diperbarui setiap kali terdapat perubahan besar pada alur bisnis, menu, environment, provider pembayaran, atau metode forecast.

---

# Lampiran A. Ringkasan Endpoint API

Seluruh endpoint selain login/register dan callback provider memerlukan token sesuai role.

| Modul | Endpoint utama | Fungsi |
| --- | --- | --- |
| Auth | `POST /api/auth/login` | Login |
| Auth | `GET /api/auth/profile` | Profil pengguna aktif |
| User | `PUT /api/users/change-password` | Ubah password sendiri |
| Produk | `GET/POST /api/products` | Daftar dan tambah produk |
| Produk | `PUT/DELETE /api/products/:id` | Edit dan hapus produk |
| Produk | `POST /api/products/import` | Import produk |
| Produk | `GET /api/products/export` | Data export produk |
| Kategori | `/api/categories` | CRUD kategori |
| Supplier | `/api/suppliers` | CRUD supplier |
| PO | `/api/purchase-orders` | Daftar dan buat PO |
| PO | `PATCH /api/purchase-orders/:id/status` | Transisi status PO |
| Barang Masuk | `/api/incoming-items` | Daftar dan buat penerimaan |
| Barang Masuk | `PATCH /api/incoming-items/:id/status` | Transisi status penerimaan |
| Stok | `/api/stock-movements` | Riwayat movement |
| Stok | `POST /api/stock-movements/in` | Penyesuaian stock in |
| Stok | `POST /api/stock-movements/out` | Penyesuaian stock out |
| Transaksi | `/api/transactions` | Daftar dan buat transaksi |
| Shift | `/api/cashier-shifts` | Daftar, buka, dan tutup shift |
| Kasir | `/api/cashier-accounts` | Kelola akun kasir oleh admin |
| Laporan | `GET /api/reports` | Laporan berdasarkan periode |
| Forecast | `GET /api/forecast` | Cache hasil forecast |
| Forecast | `GET /api/forecast/status` | Status background job |
| Forecast | `POST /api/forecast/generate` | Memulai training |
| QRIS | `POST /api/payments/qris/create` | Membuat QR pembayaran |
| QRIS | `GET /api/payments/:orderId/status` | Memeriksa pembayaran |
| QRIS | `POST /api/payments/xendit-callback` | Callback provider |

# Lampiran B. Struktur Project

```text
admininventory-main/
|-- src/
|   |-- components/        Komponen frontend
|   |-- hooks/             React hooks
|   |-- lib/               API, currency, export, dan helper
|   |-- pages/             Halaman admin
|   |-- pages/cassier/     Halaman kasir
|   `-- test/              Test frontend
|-- public/                Aset statis
|-- kirobackend/
|   |-- src/config/        Konfigurasi database
|   |-- src/controllers/   Logika bisnis API
|   |-- src/forecast/      Script LSTM Python
|   |-- src/fsm/           Aturan state machine
|   |-- src/middlewares/   Auth, rate limit, error handling
|   |-- src/models/        Model Mongoose
|   |-- src/routes/        Route API
|   |-- src/services/      Background forecast service
|   |-- src/seeders/       Data awal/demo
|   `-- test/              Test backend
|-- MANUAL_BOOK.md         Manual resmi
|-- TESTING_REPORT.md      Catatan pengujian
|-- CHECKLIST_DEMO.md      Checklist demonstrasi
`-- VISUALISASI_FLOW_LSTM_FSM.md
```

# Lampiran C. Riwayat Revisi

| Versi | Tanggal | Keterangan |
| --- | --- | --- |
| 1.0 Final | 19 Juni 2026 | Penyelarasan fitur admin/kasir, stok, export, QRIS, keamanan, cache LSTM, deployment, dan QA |
