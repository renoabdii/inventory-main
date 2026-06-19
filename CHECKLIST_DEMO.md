# Checklist Demo InventoryPro

Gunakan checklist ini untuk memastikan flow admin dan kasir berjalan utuh saat demo.

## 1. Setup Admin

- [ ] Login sebagai admin.
- [ ] Buat minimal 2 kategori produk.
- [ ] Buat minimal 1 supplier aktif.
- [ ] Tambah beberapa produk dan hubungkan ke kategori/supplier.
- [ ] Buat 1 produk dengan stok rendah/kritis untuk memicu alert dashboard.
- [ ] Buat akun kasir dari menu Akun Kasir.

## 2. Flow Kasir

- [ ] Login sebagai kasir.
- [ ] Pastikan dashboard kasir meminta buka shift jika shift belum aktif.
- [ ] Buka shift dan isi modal kas awal.
- [ ] Masuk POS.
- [ ] Tambah produk lewat klik produk atau scan/ketik SKU.
- [ ] Proses pembayaran cash dan cek kembalian.
- [ ] Cetak atau tampilkan nota.
- [ ] Proses pembayaran QRIS demo jika diperlukan.
- [ ] Cek riwayat transaksi.
- [ ] Cek stok kasir dan pastikan halaman bersifat read-only.
- [ ] Tutup shift dan isi kas akhir fisik.
- [ ] Login admin dan cek menu Audit Shift untuk melihat kas sistem, kas fisik, dan selisih.

## 3. Dampak ke Admin

- [ ] Login kembali sebagai admin.
- [ ] Cek stok produk berkurang setelah transaksi kasir.
- [ ] Cek Pergerakan Stok, pastikan sumber stok keluar tampil sebagai POS Kasir.
- [ ] Cek Dashboard admin, pastikan prioritas hari ini muncul.
- [ ] Cek Laporan, pastikan penjualan cash/QRIS dan stock out POS tampil.
- [ ] Cek Audit Shift, pastikan shift kasir tampil untuk admin.

## 4. Flow Restock

- [ ] Buat Purchase Order untuk produk yang menipis.
- [ ] Ubah status PO: Pending -> Approved -> Shipping -> Completed.
- [ ] Pastikan setelah Completed, Barang Masuk otomatis tercatat.
- [ ] Pastikan stok produk bertambah.
- [ ] Cek Pergerakan Stok, pastikan sumber stok masuk tampil sebagai Purchase Order.

## 5. Flow Barang Masuk Manual

- [ ] Buat penerimaan manual dari menu Barang Masuk.
- [ ] Jalankan status: Menunggu -> Pengecekan -> Terverifikasi.
- [ ] Pastikan stok bertambah setelah verifikasi.
- [ ] Cek filter sumber Manual/Purchase Order pada Barang Masuk.

## 6. Validasi Keamanan Flow

- [ ] Coba buka POS tanpa shift aktif, transaksi harus ditolak.
- [ ] Coba request metode pembayaran selain cash/QRIS, backend harus menolak.
- [ ] Pastikan kasir tidak bisa membuka halaman admin.
- [ ] Pastikan admin tidak diarahkan ke halaman kasir sebagai role kasir.

## 7. Penutup Demo

- [ ] Tunjukkan dashboard admin sebagai pusat keputusan.
- [ ] Tunjukkan laporan periode bulan/custom.
- [ ] Tunjukkan export laporan atau inventory jika diperlukan.
