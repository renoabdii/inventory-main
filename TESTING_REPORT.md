# Testing Report InventoryPro

Tanggal: 2026-06-18

## Ringkasan

Pengujian otomatis dan smoke test lokal berhasil untuk frontend, backend, API utama, FSM, dan LSTM.

## Hasil Otomatis

| Area | Pengujian | Hasil |
| --- | --- | --- |
| Frontend | `npm run build` | Lulus |
| Frontend | `npx tsc -p tsconfig.app.json --noEmit` | Lulus |
| Frontend | `npm run test` | Lulus, 1 test |
| Frontend | `npm run lint` | Lulus dengan 8 warning fast-refresh |
| Backend | Syntax check semua file `kirobackend/src/**/*.js` | Lulus |
| FSM | Smoke test transisi PO, Incoming Items, dan Product Stock | Lulus |
| LSTM | `lstm_predict.py` dengan data admin demo | Lulus, `stats.method = lstm` |
| API | Login dan endpoint utama via `localhost:3000` | Lulus |

## Detail API Smoke Test

Login menggunakan akun demo admin berhasil, lalu endpoint berikut lulus:

| Endpoint/Fitur | Status |
| --- | --- |
| Auth profile | OK |
| Products / Inventory | OK |
| Categories | OK |
| Suppliers | OK |
| Purchase Orders | OK |
| Incoming Items | OK |
| Stock Movements | OK |
| Reports filter bulanan | OK |
| Cashier Accounts | OK |
| Cashier Shifts | OK |
| Forecast / LSTM | OK, `method = lstm` |

Waktu forecast API saat dites: sekitar 17,5 detik.

## Catatan Warning

`npm run lint` masih menampilkan 8 warning `react-refresh/only-export-components` pada beberapa komponen UI. Ini bukan error dan tidak menghambat build, tetapi bisa dibersihkan nanti jika ingin lint benar-benar bersih.

Build juga memberi warning ukuran bundle besar dan browserslist lama. Ini bukan error.

## Checklist Manual Browser

Bagian berikut sebaiknya tetap dites manual karena melibatkan alur klik, modal, atau efek data:

- Login admin dan kasir.
- Tambah/edit/hapus produk.
- Import produk dari Excel/CSV.
- Tambah/edit kategori dan supplier.
- Buat Purchase Order, pilih supplier, pilih produk, kirim WhatsApp.
- Ubah status PO: approve, shipping, completed, cancel.
- Buat Incoming Item dan ubah status sesuai flow.
- POS cash: input uang kurang, uang pas, kembalian.
- POS QRIS sandbox: buat QR, simulasi callback, cek status.
- Shift kasir: buka shift, transaksi cash, tutup shift, cek selisih kas.
- Report: filter harian, mingguan, bulanan, custom range, semua waktu.
- Forecast: pastikan halaman menampilkan metode LSTM saat login akun demo yang punya data.

## Catatan LSTM

LSTM berhasil muncul pada akun demo admin yang memiliki data historis `StockMovement OUT`. Jika akun lain datanya kosong, sistem dapat fallback ke `moving_average`.

## Catatan Keamanan

Jangan commit file `.env`. Jika secret pernah terlihat di screenshot/chat, sebaiknya rotate token sebelum deploy atau publish repository.
