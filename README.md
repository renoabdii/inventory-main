# InventoryPro - Sistem Manajemen Inventory Swalayan

Aplikasi manajemen inventory untuk swalayan/minimarket dengan fitur prediksi stok menggunakan LSTM (Deep Learning). Terdiri dari panel Admin (gudang) dan panel Kasir (penjualan).

## Fitur Utama

### Admin Panel
- **Dashboard** — Ringkasan inventory real-time (total produk, stock kritis, movement)
- **Produk** — CRUD barang dengan kategori, SKU, harga, dan monitoring stock
- **Kategori** — Kelola kategori produk
- **Barang Masuk** — Catat penerimaan dari supplier, otomatis update stock
- **Stock Movement** — Riwayat pergerakan stok (masuk/keluar) dengan audit trail
- **Supplier** — Kelola data supplier
- **Purchase Order** — Buat PO ke supplier dengan status flow (Pending → Approved → Shipping → Completed)
- **Laporan** — Report inventory per periode (minggu/bulan) + nilai inventory per kategori
- **Prediksi Stock (LSTM)** — Prediksi kapan stock habis menggunakan AI/Deep Learning
- **Notifikasi** — Alert real-time untuk stock kritis dan PO pending

### Kasir Panel
- **Dashboard** — Ringkasan penjualan hari ini
- **POS (Point of Sale)** — Input transaksi penjualan dengan keranjang belanja
- **Riwayat Transaksi** — List semua transaksi yang dilakukan
- **Cek Stok** — Lihat ketersediaan produk (read-only)
- **Profil** — Ubah password akun

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Sonner (toast notifications)
- React Router DOM

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Python + TensorFlow/Keras (LSTM Prediction)

## Instalasi

### Prerequisites
- Node.js >= 18
- MongoDB (atau MongoDB Atlas)
- Python >= 3.10 (untuk fitur LSTM)

### Frontend

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

### Backend

```bash
cd kirobackend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env sesuai konfigurasi MongoDB kamu

# Jalankan seeder (data awal)
node src/seeders/adminSeeder.js
node src/seeders/kasirSeeder.js
node src/seeders/allSeeder.js

# Jalankan server
node src/index.js
```

### Python (untuk LSTM Prediction)

```bash
cd kirobackend/src/forecast
pip install -r requirements.txt
```

## Deploy Singkat

Arsitektur yang paling aman untuk project ini:

- Frontend: Vercel
- Backend API: Render
- Database: MongoDB Atlas

### Frontend

Isi environment variable berikut di hosting frontend:

```bash
VITE_API_URL=https://alamat-backend-kamu.onrender.com
```

Catatan:

- File `vercel.json` sudah disiapkan agar routing SPA tetap masuk ke `index.html`.
- Jika frontend dan backend disatukan dalam satu origin, `VITE_API_URL` bisa dikosongkan.

### Backend

Isi environment variable backend minimal:

```bash
PORT=3000
NODE_ENV=production
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=12h
APP_PUBLIC_URL=https://alamat-backend-kamu.onrender.com
FORECAST_AUTO_TRAIN_ENABLED=false
XENDIT_SECRET_KEY=
XENDIT_CALLBACK_TOKEN=
XENDIT_CALLBACK_URL=https://alamat-backend-kamu.onrender.com/api/payments/xendit-callback
```

Jika fitur LSTM dipakai di hosting, server backend juga harus menyiapkan dependency Python dari:

```bash
kirobackend/src/forecast/requirements.txt
```

Untuk Railway, konfigurasi `kirobackend/nixpacks.toml` sudah menyiapkan Node.js, Python 3, dan dependency Python tersebut. Tambahkan juga environment variable berikut pada backend:

```bash
PYTHON_BIN=python3
```

Saran awal untuk hosting gratis:

- aktifkan forecast manual dulu
- biarkan `FORECAST_AUTO_TRAIN_ENABLED=false`
- nyalakan scheduler hanya jika resource server sudah cukup

## Akun Default

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Kasir | kasir1 | kasir123 |

## Struktur Project

```
├── src/                    # Frontend (React)
│   ├── pages/             # Halaman aplikasi
│   │   ├── cassier/       # Halaman kasir (POS, Transaksi, dll)
│   │   └── ...            # Halaman admin
│   └── components/        # Komponen reusable
├── kirobackend/           # Backend (Node.js)
│   └── src/
│       ├── controllers/   # Logic bisnis
│       ├── models/        # Schema MongoDB
│       ├── routes/        # API endpoints
│       ├── middlewares/   # Auth & error handling
│       ├── seeders/       # Data awal
│       └── forecast/      # LSTM prediction (Python)
└── public/                # Static assets
```

## API Endpoints

| Module | Endpoint | Deskripsi |
|--------|----------|-----------|
| Auth | POST /api/auth/login | Login |
| Products | GET/POST/PUT/DELETE /api/products | CRUD Produk |
| Categories | GET/POST/PUT/DELETE /api/categories | CRUD Kategori |
| Suppliers | GET/POST/PUT/DELETE /api/suppliers | CRUD Supplier |
| Purchase Orders | GET/POST/PATCH/DELETE /api/purchase-orders | Kelola PO |
| Incoming Items | GET/POST/PATCH/DELETE /api/incoming-items | Penerimaan Barang |
| Stock Movements | GET/POST /api/stock-movements | Pergerakan Stok |
| Transactions | GET/POST /api/transactions | Transaksi Kasir |
| Dashboard | GET /api/dashboard/summary | Summary Dashboard |
| Notifications | GET /api/dashboard/notifications | Notifikasi |
| Reports | GET /api/reports | Laporan |
| Forecast | GET /api/forecast | Prediksi LSTM |
