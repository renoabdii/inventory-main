/**
 * Seeder aman untuk membuat riwayat barang keluar 30 hari terakhir.
 *
 * Tujuan:
 * - Memberi LSTM data historis yang cukup untuk demo/pengujian forecast.
 * - Tidak menghapus data asli.
 * - Tidak mengubah stok produk saat ini.
 * - Idempotent: tidak insert ulang jika data demo forecast sudah ada.
 *
 * Jalankan:
 *   node src/seeders/forecastHistorySeeder.js --apply --admin=admin
 *
 * Jika ingin ulang data demo forecast:
 *   node src/seeders/forecastHistorySeeder.js --apply --force --admin=admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const User = require('../models/User');
const ForecastCache = require('../models/ForecastCache');
const ForecastModel = require('../models/ForecastModel');

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const shouldForce = args.includes('--force');
const adminArg = args.find((arg) => arg.startsWith('--admin='));
const targetAdminUsername = adminArg ? adminArg.split('=')[1] : 'admin';
const DEMO_REFERENCE_PREFIX = 'FORECAST-DEMO';

const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getCategoryBaseDemand = (category = '') => {
  const normalized = category.toLowerCase();
  if (normalized.includes('minuman')) return 5;
  if (normalized.includes('makanan')) return 4;
  if (normalized.includes('snack')) return 4;
  if (normalized.includes('sembako')) return 2;
  if (normalized.includes('susu')) return 3;
  if (normalized.includes('frozen')) return 2;
  if (normalized.includes('toiletries')) return 2;
  return 2;
};

const buildDailyQty = (product, dayIndex) => {
  const date = new Date();
  date.setDate(date.getDate() - dayIndex);
  const isWeekend = [0, 6].includes(date.getDay());
  const baseDemand = getCategoryBaseDemand(product.category);
  const stockPressure = product.stock <= product.minStock ? 0.65 : 1;
  const weekendMultiplier = isWeekend ? 1.5 : 1;
  const productSeed = parseInt(product._id.toString().slice(-6), 16);
  const wave = 0.75 + seededRandom(productSeed + dayIndex) * 0.7;
  const qty = Math.round(baseDemand * weekendMultiplier * stockPressure * wave);

  return Math.max(1, qty);
};

const buildMovementsForProduct = (product, adminId) => {
  const now = new Date();
  const dailyRows = [];

  for (let day = 30; day >= 1; day -= 1) {
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - day);
    createdAt.setHours(8 + (day % 10), (day * 7) % 60, 0, 0);

    dailyRows.push({
      day,
      createdAt,
      qty: buildDailyQty(product, day),
    });
  }

  const totalOut = dailyRows.reduce((total, row) => total + row.qty, 0);
  let runningStock = product.stock + totalOut;

  return dailyRows.map((row) => {
    const stockBefore = runningStock;
    const stockAfter = Math.max(0, runningStock - row.qty);
    runningStock = stockAfter;

    const dateKey = row.createdAt.toISOString().slice(0, 10).replace(/-/g, '');

    return {
      userId: adminId,
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'OUT',
      qty: row.qty,
      stockBefore,
      stockAfter,
      previousState: getStockState(stockBefore, product.minStock),
      newState: getStockState(stockAfter, product.minStock),
      reference: `${DEMO_REFERENCE_PREFIX}-${product.sku}-${dateKey}`,
      referenceModel: 'Manual',
      referenceId: product._id,
      note: 'Data demo riwayat penjualan untuk prediksi stok',
      createdBy: adminId,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    };
  });
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = await User.findOne({ username: targetAdminUsername, role: 'admin' });
  if (!admin) {
    throw new Error(`Admin "${targetAdminUsername}" tidak ditemukan`);
  }

  const products = await Product.find({ userId: admin._id }).sort({ createdAt: 1 });
  if (products.length === 0) {
    throw new Error(`Admin "${targetAdminUsername}" belum punya produk`);
  }

  const existingSeeded = await StockMovement.countDocuments({
    userId: admin._id,
    reference: { $regex: `^${DEMO_REFERENCE_PREFIX}-` },
  });

  if (existingSeeded > 0 && !shouldForce) {
    console.log(`Data demo forecast sudah ada: ${existingSeeded} movement.`);
    console.log('Gunakan --force jika ingin membuat ulang data demo forecast.');
    return;
  }

  const movements = products.flatMap((product) => buildMovementsForProduct(product, admin._id));

  console.log(`Admin           : ${admin.username}`);
  console.log(`Produk          : ${products.length}`);
  console.log(`Movement OUT    : ${movements.length}`);
  console.log(`Rentang         : 30 hari terakhir`);

  if (!shouldApply) {
    console.log('\nMode preview saja. Tambahkan --apply untuk menyimpan ke database.');
    return;
  }

  if (shouldForce && existingSeeded > 0) {
    const deleted = await StockMovement.deleteMany({
      userId: admin._id,
      reference: { $regex: `^${DEMO_REFERENCE_PREFIX}-` },
    });
    console.log(`Data demo lama dihapus: ${deleted.deletedCount} movement`);
  }

  await StockMovement.insertMany(movements, { ordered: true });

  await ForecastCache.findOneAndUpdate(
    { userId: admin._id },
    {
      status: 'idle',
      data: [],
      stats: null,
      generatedAt: null,
      error: null,
    },
    { upsert: true, new: true }
  );

  await ForecastModel.findOneAndUpdate(
    { userId: admin._id },
    {
      status: 'idle',
      error: null,
    },
    { upsert: true, new: true }
  );

  console.log('\nSelesai.');
  console.log(`${movements.length} movement OUT demo forecast ditambahkan.`);
  console.log('Cache forecast direset. Klik "Perbarui Prediksi" untuk training ulang LSTM.');
};

run()
  .catch((error) => {
    console.error('Seeder forecast history gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
