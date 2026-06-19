# Visualisasi Flow Model LSTM dan FSM InventoryPro

Dokumen ini menjelaskan alur visual model forecasting stok dan Finite State Machine (FSM) yang digunakan pada aplikasi InventoryPro.

## 1. Gambaran Umum

InventoryPro menggunakan dua pendekatan model:

1. **Model forecasting stok berbasis time series**
   Digunakan untuk memprediksi estimasi berapa hari stok produk akan habis berdasarkan histori barang keluar.

2. **Finite State Machine (FSM)**
   Digunakan untuk mengatur perubahan status agar alur bisnis tetap valid, terutama pada Purchase Order, Barang Masuk, dan status stok produk.

Catatan akademik: implementasi forecasting pada kode saat ini menggunakan pendekatan **LSTM-inspired time series forecasting**, yaitu kombinasi EWMA, pola mingguan, dan faktor tren. Jika dosen meminta LSTM neural network murni, bagian ini perlu dijelaskan sebagai versi ringan atau dikembangkan lagi menjadi model LSTM sebenarnya.

---

## 2. Flow Forecasting Stok

```mermaid
flowchart TD
    A[Mulai Forecasting] --> B[Ambil Data Produk dari Database]
    B --> C[Ambil Stock Movement OUT 30 Hari Terakhir]
    C --> D[Kelompokkan Data per Tanggal]
    D --> E[Isi Tanggal Kosong dengan Nilai 0]
    E --> F{Data Harian >= 7 Hari?}

    F -- Tidak --> G[Hitung Rata-rata Barang Keluar]
    G --> H[Prediksi Hari Habis = Stok Saat Ini / Rata-rata Keluar]

    F -- Ya --> I[Layer 1: EWMA untuk Tren Terbaru]
    I --> J[Layer 2: Pola Hari dalam Seminggu]
    J --> K[Layer 3: Deteksi Tren 7 Hari Terakhir]
    K --> L[Prediksi Barang Keluar Harian Maksimal 90 Hari]
    L --> M[Kurangi Stok dengan Prediksi Harian]
    M --> N{Stok <= 0?}
    N -- Belum --> L
    N -- Ya --> O[Hitung Predicted Days]

    H --> P[Tentukan Status]
    O --> P

    P --> Q{Predicted Days}
    Q -- <= 3 Hari --> R[Status CRITICAL]
    Q -- <= 7 Hari --> S[Status RESTOCK]
    Q -- > 7 Hari --> T[Status SAFE]

    R --> U[Tampilkan di Halaman Forecasting]
    S --> U
    T --> U
```

### Penjelasan Input dan Output

| Bagian | Keterangan |
| --- | --- |
| Input utama | Produk, stok saat ini, minimum stok, histori barang keluar |
| Sumber data | `Product` dan `StockMovement` |
| Periode histori | 30 hari terakhir |
| Output | `avgOut`, `predictedDays`, `predictedDaily`, dan status |
| Status hasil | `SAFE`, `RESTOCK`, `CRITICAL` |

---

## 3. Flow Integrasi Forecasting pada Sistem

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend as Halaman Forecasting
    participant Backend as forecastController.js
    participant Python as lstm_predict.py
    participant DB as MongoDB

    Admin->>Frontend: Klik Generate Forecast
    Frontend->>Backend: Request /api/forecast
    Backend->>Python: Jalankan script Python
    Python->>DB: Ambil produk dan stock_movements OUT
    DB-->>Python: Data produk dan histori stok keluar
    Python->>Python: Hitung prediksi stok
    Python-->>Backend: JSON hasil prediksi
    Backend-->>Frontend: Kirim hasil forecasting
    Frontend-->>Admin: Tampilkan status SAFE/RESTOCK/CRITICAL
```

Jika script Python gagal dijalankan, backend menggunakan fallback prediksi sederhana berbasis moving average.

```mermaid
flowchart TD
    A[Request Forecast] --> B[Jalankan Python Script]
    B --> C{Python Berhasil?}
    C -- Ya --> D[Gunakan Hasil LSTM-inspired Forecast]
    C -- Tidak --> E[Fallback Moving Average]
    D --> F[Kirim Response ke Frontend]
    E --> F
```

---

## 4. FSM Purchase Order

FSM Purchase Order mengatur agar status PO hanya dapat berubah melalui urutan yang valid.

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> APPROVED: approve
    PENDING --> CANCELLED: cancel
    APPROVED --> SHIPPING: ship
    APPROVED --> CANCELLED: cancel
    SHIPPING --> COMPLETED: complete
    COMPLETED --> [*]
    CANCELLED --> [*]
```

### Tabel Transisi Purchase Order

| State Saat Ini | Event | State Berikutnya |
| --- | --- | --- |
| PENDING | approve | APPROVED |
| PENDING | cancel | CANCELLED |
| APPROVED | ship | SHIPPING |
| APPROVED | cancel | CANCELLED |
| SHIPPING | complete | COMPLETED |
| COMPLETED | - | Final state |
| CANCELLED | - | Final state |

### Contoh Validasi

Jika PO sudah `COMPLETED`, sistem tidak mengizinkan status diubah lagi karena `COMPLETED` adalah final state.

---

## 5. FSM Barang Masuk

FSM Barang Masuk mengatur alur penerimaan barang agar stok hanya bertambah ketika proses penerimaan sudah valid.

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> in_progress: process
    pending --> completed: complete
    pending --> cancelled: cancel
    in_progress --> completed: complete
    in_progress --> rejected: reject
    completed --> [*]
    cancelled --> [*]
    rejected --> [*]
```

### Tabel Transisi Barang Masuk

| State Saat Ini | Event | State Berikutnya |
| --- | --- | --- |
| pending | process | in_progress |
| pending | complete | completed |
| pending | cancel | cancelled |
| in_progress | complete | completed |
| in_progress | reject | rejected |
| completed | - | Final state |
| cancelled | - | Final state |
| rejected | - | Final state |

---

## 6. FSM Status Stok Produk

FSM status stok produk dihitung otomatis berdasarkan nilai `stock` dan `minStock`.

```mermaid
stateDiagram-v2
    [*] --> NORMAL
    NORMAL --> LOW: stock decrease
    NORMAL --> CRITICAL: stock decrease
    NORMAL --> OUT_OF_STOCK: stock decrease

    LOW --> NORMAL: stock increase
    LOW --> CRITICAL: stock decrease
    LOW --> OUT_OF_STOCK: stock decrease

    CRITICAL --> NORMAL: stock increase
    CRITICAL --> LOW: stock increase
    CRITICAL --> OUT_OF_STOCK: stock decrease

    OUT_OF_STOCK --> CRITICAL: stock increase
    OUT_OF_STOCK --> LOW: stock increase
    OUT_OF_STOCK --> NORMAL: stock increase
```

### Aturan Penentuan Status

| Kondisi | Status |
| --- | --- |
| `stock <= 0` | OUT_OF_STOCK |
| `stock <= minStock * 0.25` | CRITICAL |
| `stock <= minStock` | LOW |
| `stock > minStock` | NORMAL |

---

## 7. Flow Penggunaan FSM di Backend

```mermaid
flowchart TD
    A[User Melakukan Aksi Status] --> B[Backend Menerima Event]
    B --> C[Ambil Data Saat Ini dari Database]
    C --> D[Ambil Current State]
    D --> E[validateTransition FSM]
    E --> F{Transisi Valid?}

    F -- Tidak --> G[Tolak Request dan Kirim Pesan Error]
    F -- Ya --> H[Update Status ke Next State]
    H --> I[Simpan Riwayat Status]
    I --> J{Apakah Status Final dan Butuh Efek Stok?}
    J -- Ya --> K[Update Stok Produk dan Stock Movement]
    J -- Tidak --> L[Simpan Perubahan]
    K --> L
    L --> M[Kirim Response Berhasil]
```

---

## 8. Hubungan LSTM-inspired Forecasting dan FSM

```mermaid
flowchart LR
    A[Transaksi POS] --> B[Stock Movement OUT]
    C[Barang Masuk / PO Completed] --> D[Stock Movement IN]

    B --> E[Histori Pergerakan Stok]
    D --> E

    E --> F[Forecasting Stok]
    F --> G[Prediksi SAFE / RESTOCK / CRITICAL]

    G --> H[Admin Membuat Purchase Order]
    H --> I[FSM Purchase Order]
    I --> J[PO Completed]
    J --> K[Barang Masuk / Stok Bertambah]
    K --> E
```

Alur ini menunjukkan bahwa forecasting membantu admin mengambil keputusan restock, sedangkan FSM memastikan proses restock berjalan melalui status yang valid.

---

## 9. Ringkasan untuk Presentasi ke Dosen

1. Data transaksi dan pergerakan stok dicatat sebagai histori.
2. Histori barang keluar 30 hari terakhir digunakan sebagai input forecasting.
3. Model menghitung tren, pola mingguan, dan rata-rata prediksi barang keluar.
4. Sistem menghasilkan estimasi hari sampai stok habis.
5. Hasil prediksi diklasifikasikan menjadi `SAFE`, `RESTOCK`, atau `CRITICAL`.
6. Ketika admin melakukan restock, FSM memastikan status PO dan Barang Masuk mengikuti alur yang valid.
7. Setelah barang masuk selesai, stok bertambah dan histori baru digunakan lagi untuk prediksi berikutnya.
