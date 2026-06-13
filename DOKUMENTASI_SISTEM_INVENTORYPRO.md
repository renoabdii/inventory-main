# Dokumentasi Sistem InventoryPro

## 1. Gambaran Umum Sistem

InventoryPro adalah sistem inventory dan point of sales berbasis web yang digunakan untuk mengelola data barang, stok, supplier, purchase order, penerimaan barang, laporan, prediksi stok, serta transaksi penjualan kasir.

Sistem memiliki dua role utama:

- Admin: mengelola data master, stok, pembelian, laporan, dan prediksi stok.
- Kasir: melakukan transaksi penjualan, mengelola shift, melihat riwayat transaksi, dan mengecek stok barang.

## 2. Arsitektur Sistem

Sistem menggunakan arsitektur client-server dengan pola three-tier architecture.

```text
Admin / Kasir
     |
     v
Frontend React + Vite
     |
     v
Backend Node.js + Express.js
     |
     v
MongoDB + Mongoose
```

Penjelasan tiap lapisan:

- Presentation Layer: frontend React yang menampilkan halaman admin dan kasir.
- Application Layer: backend Node.js dengan Express.js yang menyediakan REST API, autentikasi JWT, validasi data, dan business logic.
- Data Layer: MongoDB sebagai database, dengan Mongoose sebagai ODM untuk mengelola model data.

Teknologi yang digunakan:

| Komponen | Teknologi |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Autentikasi | JWT |
| Prediksi stok | Python LSTM dengan fallback moving average |

## 3. Role dan Hak Akses

| Role | Fitur |
|---|---|
| Admin | Dashboard admin, produk, kategori, supplier, purchase order, barang masuk, pergerakan stok, laporan, prediksi stok, manajemen user |
| Kasir | Dashboard kasir, POS, riwayat transaksi, shift kasir, cek stok, profil |

Setelah login, sistem membaca role user:

- Jika role admin, user diarahkan ke `/dashboard`.
- Jika role kasir, user diarahkan ke `/kasir`.

## 4. Proses Bisnis Sistem

### 4.1 Proses Bisnis Admin

```text
Admin login
 -> Admin mengelola data produk dan kategori
 -> Admin mengelola supplier
 -> Admin membuat purchase order
 -> Purchase order diproses sampai completed
 -> Sistem membuat data barang masuk
 -> Sistem menambah stok produk
 -> Sistem mencatat pergerakan stok IN
 -> Admin melihat dashboard, laporan, dan prediksi stok
```

Admin juga dapat mencatat barang masuk secara manual tanpa purchase order:

```text
Admin login
 -> Admin membuka menu barang masuk
 -> Admin membuat data penerimaan barang
 -> Admin memproses/verifikasi penerimaan
 -> Sistem menambah stok produk
 -> Sistem mencatat pergerakan stok IN
```

### 4.2 Proses Bisnis Kasir

```text
Kasir login
 -> Kasir membuka shift
 -> Kasir membuka halaman POS
 -> Kasir memilih produk dan jumlah barang
 -> Sistem memvalidasi stok
 -> Kasir memasukkan pembayaran
 -> Sistem menyimpan transaksi
 -> Sistem mengurangi stok produk
 -> Sistem mencatat pergerakan stok OUT
 -> Kasir menutup shift
```

## 5. Modul Sistem

| Modul | Fungsi |
|---|---|
| Auth | Login, validasi token, profil user |
| User | Manajemen user admin/kasir |
| Product | CRUD produk, stok, harga, SKU, barcode |
| Category | CRUD kategori produk |
| Supplier | CRUD supplier |
| Purchase Order | Membuat dan memproses pesanan pembelian |
| Incoming Item | Mencatat dan memverifikasi barang masuk |
| Stock Movement | Mencatat histori stok masuk dan keluar |
| Transaction | Transaksi POS kasir |
| Cashier Shift | Buka shift, tutup shift, rekap kasir |
| Dashboard | Ringkasan stok, aktivitas terbaru, notifikasi |
| Report | Laporan stok, transaksi, nilai inventory, metode pembayaran |
| Forecast | Prediksi kebutuhan stok |

## 6. Use Case Diagram

```plantuml
@startuml
left to right direction

actor Admin
actor Kasir

rectangle "Sistem InventoryPro" {
  usecase "Login" as UC1
  usecase "Logout" as UC2

  usecase "Melihat Dashboard Admin" as UC3
  usecase "Mengelola Produk" as UC4
  usecase "Mengelola Kategori" as UC5
  usecase "Mengelola Supplier" as UC6
  usecase "Mengelola Purchase Order" as UC7
  usecase "Mengelola Barang Masuk" as UC8
  usecase "Melihat Pergerakan Stok" as UC9
  usecase "Melihat Laporan" as UC10
  usecase "Melihat Prediksi Stok" as UC11
  usecase "Mengelola User" as UC12

  usecase "Melihat Dashboard Kasir" as UC13
  usecase "Membuka Shift" as UC14
  usecase "Melakukan Transaksi POS" as UC15
  usecase "Melihat Riwayat Transaksi" as UC16
  usecase "Cek Stok Barang" as UC17
  usecase "Menutup Shift" as UC18
  usecase "Mengelola Profil" as UC19
}

Admin --> UC1
Admin --> UC2
Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6
Admin --> UC7
Admin --> UC8
Admin --> UC9
Admin --> UC10
Admin --> UC11
Admin --> UC12

Kasir --> UC1
Kasir --> UC2
Kasir --> UC13
Kasir --> UC14
Kasir --> UC15
Kasir --> UC16
Kasir --> UC17
Kasir --> UC18
Kasir --> UC19

@enduml
```

## 7. Activity Diagram

### 7.1 Activity Diagram Login

```plantuml
@startuml
start
:User membuka halaman login;
:User memasukkan username dan password;
:Frontend mengirim data login ke backend;
:Backend mencari user di database;

if (User ditemukan dan aktif?) then (Ya)
  :Backend memvalidasi password;
  if (Password benar?) then (Ya)
    :Backend membuat JWT token;
    :Frontend menyimpan token dan data user;
    if (Role admin?) then (Ya)
      :Redirect ke dashboard admin;
    else (Kasir)
      :Redirect ke dashboard kasir;
    endif
  else (Tidak)
    :Tampilkan pesan login gagal;
  endif
else (Tidak)
  :Tampilkan pesan login gagal;
endif

stop
@enduml
```

### 7.2 Activity Diagram Transaksi POS

```plantuml
@startuml
start
:Kasir login;
:Kasir membuka shift;
:Kasir membuka halaman POS;
:Kasir memilih produk;
:Kasir memasukkan jumlah barang;

if (Stok cukup?) then (Ya)
  :Sistem menghitung total belanja;
  :Kasir memasukkan nominal pembayaran;
  if (Pembayaran cukup?) then (Ya)
    :Sistem menyimpan transaksi;
    :Sistem mengurangi stok produk;
    :Sistem mencatat StockMovement OUT;
    :Sistem menampilkan transaksi berhasil;
  else (Tidak)
    :Sistem menampilkan pembayaran kurang;
  endif
else (Tidak)
  :Sistem menampilkan stok tidak cukup;
endif

stop
@enduml
```

### 7.3 Activity Diagram Barang Masuk

```plantuml
@startuml
start
:Admin login;
:Admin membuka menu barang masuk;
:Admin membuat data penerimaan;
:Admin memilih produk dan jumlah;
:Sistem menyimpan penerimaan dengan status pending;
:Admin memproses penerimaan;
:Admin menyelesaikan/verifikasi penerimaan;
:Sistem menambah stok produk;
:Sistem mencatat StockMovement IN;
:Status penerimaan menjadi completed;
stop
@enduml
```

### 7.4 Activity Diagram Purchase Order

```plantuml
@startuml
start
:Admin login;
:Admin membuka menu Purchase Order;
:Admin memilih supplier;
:Admin memilih produk dan jumlah;
:Sistem membuat PO status PENDING;
:Admin approve PO;
:Status PO menjadi APPROVED;
:PO diproses pengiriman;
:Status PO menjadi SHIPPING;
:Barang diterima;
:Admin complete PO;
:Sistem membuat data incoming item;
:Sistem menambah stok produk;
:Sistem mencatat StockMovement IN;
:Status PO menjadi COMPLETED;
stop
@enduml
```

## 8. Sequence Diagram

### 8.1 Sequence Diagram Login

```plantuml
@startuml
actor User
participant "Frontend React" as FE
participant "Backend Node.js + Express" as BE
database "MongoDB" as DB

User -> FE: Input username dan password
FE -> BE: POST /api/auth/login
BE -> DB: Cari user berdasarkan username
DB --> BE: Data user
BE -> BE: Validasi status akun dan password
BE -> BE: Generate JWT token
BE --> FE: Token dan data user
FE -> FE: Simpan token di localStorage

alt Role admin
  FE --> User: Redirect ke /dashboard
else Role kasir
  FE --> User: Redirect ke /kasir
end
@enduml
```

### 8.2 Sequence Diagram Transaksi POS

```plantuml
@startuml
actor Kasir
participant "Frontend POS" as FE
participant "Backend Node.js + Express" as BE
database "MongoDB" as DB

Kasir -> FE: Pilih produk, jumlah, metode bayar
FE -> BE: POST /api/transactions
BE -> DB: Ambil data produk
DB --> BE: Data produk dan stok
BE -> BE: Validasi stok dan pembayaran
BE -> DB: Simpan transaksi
BE -> DB: Update stok produk
BE -> DB: Simpan StockMovement OUT
DB --> BE: Berhasil
BE --> FE: Data transaksi
FE --> Kasir: Tampilkan transaksi berhasil
@enduml
```

### 8.3 Sequence Diagram Barang Masuk

```plantuml
@startuml
actor Admin
participant "Frontend Admin" as FE
participant "Backend Node.js + Express" as BE
database "MongoDB" as DB

Admin -> FE: Input data barang masuk
FE -> BE: POST /api/incoming-items
BE -> DB: Validasi produk
BE -> DB: Simpan incoming item status pending
DB --> BE: Data incoming item
BE --> FE: Penerimaan berhasil dibuat

Admin -> FE: Verifikasi penerimaan
FE -> BE: PATCH /api/incoming-items/:id/status
BE -> DB: Ambil data incoming item
BE -> DB: Update stok produk
BE -> DB: Simpan StockMovement IN
BE -> DB: Update status incoming item completed
BE --> FE: Penerimaan selesai
FE --> Admin: Tampilkan status completed
@enduml
```

## 9. Class Diagram / Model Data

```plantuml
@startuml
class User {
  username
  password
  role
  isActive
}

class Product {
  name
  sku
  barcode
  category
  stock
  minStock
  price
  status
}

class Category {
  name
  description
  status
}

class Supplier {
  supplierId
  name
  phone
  address
  status
}

class PurchaseOrder {
  poNumber
  totalAmount
  status
  note
}

class IncomingItem {
  receiptId
  date
  supplier
  source
  reference
  status
}

class StockMovement {
  productName
  sku
  type
  qty
  stockBefore
  stockAfter
  previousState
  newState
  reference
  note
}

class Transaction {
  invoiceNumber
  totalAmount
  paymentAmount
  changeAmount
  paymentMethod
}

class CashierShift {
  openedAt
  closedAt
  openingCash
  closingCash
  expectedCash
  cashDifference
  totalSales
  status
}

User "1" -- "many" Transaction : cashier
User "1" -- "many" CashierShift : cashier
User "1" -- "many" StockMovement : createdBy
Supplier "1" -- "many" PurchaseOrder
Product "1" -- "many" StockMovement
Product "1" -- "many" Transaction
Product "1" -- "many" IncomingItem
PurchaseOrder "1" -- "0..1" IncomingItem : creates
CashierShift "1" -- "many" Transaction
@enduml
```

## 10. DFD Level 0

```text
Admin/Kasir
   |
   | input login, data master, PO, transaksi, barang masuk
   v
Sistem InventoryPro
   |
   | simpan/ambil data
   v
Database MongoDB

Sistem InventoryPro
   |
   | dashboard, laporan, stok, riwayat transaksi
   v
Admin/Kasir
```

## 11. DFD Level 1

```text
1.0 Autentikasi
Input: username, password
Output: token JWT, data user
Data store: User

2.0 Manajemen Produk dan Stok
Input: data produk, kategori, barang masuk, transaksi keluar
Output: stok terbaru, status stok
Data store: Product, Category, StockMovement

3.0 Manajemen Pembelian
Input: supplier, purchase order, status PO
Output: PO, barang masuk, stok bertambah
Data store: Supplier, PurchaseOrder, IncomingItem, Product

4.0 Transaksi Kasir
Input: item penjualan, pembayaran, metode pembayaran
Output: invoice, stok berkurang, histori transaksi
Data store: Transaction, Product, StockMovement, CashierShift

5.0 Laporan dan Dashboard
Input: data produk, stok, transaksi, PO, supplier
Output: ringkasan dashboard, laporan, prediksi stok
Data store: Product, StockMovement, Transaction, PurchaseOrder, Supplier
```

## 12. Rancangan Database

Collection utama:

| Collection | Fungsi |
|---|---|
| user | Menyimpan akun admin dan kasir |
| product | Menyimpan data produk dan stok |
| category | Menyimpan kategori produk |
| suppliers | Menyimpan data supplier |
| purchase_orders | Menyimpan data purchase order |
| incoming_items | Menyimpan data penerimaan barang |
| stock_movements | Menyimpan histori stok masuk/keluar |
| transactions | Menyimpan transaksi penjualan kasir |
| cashier_shifts | Menyimpan data shift kasir |

Relasi utama:

- User memiliki banyak Transaction.
- User memiliki banyak CashierShift.
- Product memiliki banyak StockMovement.
- Supplier memiliki banyak PurchaseOrder.
- PurchaseOrder dapat menghasilkan IncomingItem.
- Transaction mengurangi stok Product.
- IncomingItem dan PurchaseOrder completed menambah stok Product.

## 13. Endpoint Utama Backend

| Endpoint | Fungsi |
|---|---|
| `/api/auth/login` | Login user |
| `/api/auth/profile` | Mengambil profil user |
| `/api/users` | Manajemen user |
| `/api/products` | Manajemen produk |
| `/api/categories` | Manajemen kategori |
| `/api/suppliers` | Manajemen supplier |
| `/api/purchase-orders` | Manajemen purchase order |
| `/api/incoming-items` | Manajemen barang masuk |
| `/api/stock-movements` | Histori pergerakan stok |
| `/api/transactions` | Transaksi POS |
| `/api/cashier-shifts` | Shift kasir |
| `/api/dashboard` | Dashboard admin |
| `/api/reports` | Laporan |
| `/api/forecast` | Prediksi stok |

## 14. Poin Presentasi Ke Dosen

Poin pembuka:

> Sistem yang saya bangun adalah InventoryPro, yaitu aplikasi inventory dan POS berbasis web. Sistem ini memiliki dua role, yaitu Admin dan Kasir. Admin bertugas mengelola produk, kategori, supplier, purchase order, penerimaan barang, laporan, dan prediksi stok. Kasir bertugas melakukan transaksi penjualan, membuka dan menutup shift, melihat riwayat transaksi, serta mengecek stok.

Poin arsitektur:

> Arsitektur sistem menggunakan client-server dan three-tier architecture. Frontend dibangun menggunakan React dan Vite, backend menggunakan Node.js dengan Express.js, sedangkan database menggunakan MongoDB dengan Mongoose.

Poin proses bisnis:

> Proses stok pada sistem terbagi menjadi dua, yaitu stok masuk dan stok keluar. Stok masuk berasal dari penerimaan barang atau purchase order yang sudah completed. Stok keluar berasal dari transaksi POS kasir. Setiap perubahan stok dicatat pada stock movement sehingga histori stok dapat dipantau.

Poin keamanan:

> Sistem menggunakan JWT untuk autentikasi. Setelah login, token disimpan di frontend dan dikirim pada setiap request ke backend. Sistem juga membedakan akses berdasarkan role admin dan kasir.

Poin keunggulan:

> Selain fitur inventory dan POS, sistem juga memiliki laporan, dashboard stok, notifikasi stok rendah/kritis, histori pergerakan stok, shift kasir, serta fitur prediksi stok.

## 15. Catatan Untuk Revisi

Hal yang bisa ditambahkan jika dosen meminta penguatan:

- Tambahkan role-based authorization lebih ketat pada endpoint admin seperti produk, kategori, supplier, PO, laporan, dan dashboard.
- Tambahkan route guard di frontend agar user tidak bisa membuka halaman role lain secara langsung.
- Tambahkan export laporan ke PDF/Excel jika belum lengkap.
- Tambahkan struk transaksi POS jika diperlukan untuk kebutuhan kasir.

