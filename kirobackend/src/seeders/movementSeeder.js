/**
 * Seeder: Generate 30 hari data stock movement OUT
 * Supaya LSTM punya cukup data untuk training
 * 
 * Pola yang disimulasikan:
 * - Weekday (Senin-Jumat): penjualan normal
 * - Weekend (Sabtu-Minggu): penjualan naik 1.5-2x
 * - Variasi random per produk
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const User = require('../models/User');

// Pola penjualan per produk (rata-rata per hari)
const salesPatterns = {
  'Indomie Goreng Original': { weekday: 8, weekend: 15 },
  'Aqua Botol 600ml': { weekday: 12, weekend: 20 },
  'Gula Pasir Gulaku 1kg': { weekday: 3, weekend: 5 },
  'Chitato Sapi Panggang 68g': { weekday: 5, weekend: 10 },
  'Sabun Lifebuoy 100g': { weekday: 3, weekend: 4 },
  'Nugget Fiesta 500g': { weekday: 2, weekend: 5 },
  'Kecap Manis ABC 275ml': { weekday: 2, weekend: 3 },
  'Susu Ultra Full Cream 1L': { weekday: 4, weekend: 7 },
  'Teh Botol Sosro 450ml': { weekday: 6, weekend: 12 },
  'Minyak Goreng Bimoli 2L': { weekday: 2, weekend: 4 },
};

// Random variasi ±40%
function randomize(base) {
  const variation = 0.4;
  const min = Math.max(1, Math.floor(base * (1 - variation)));
  const max = Math.ceil(base * (1 + variation));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

const seedMovements = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Hapus movement lama
    await StockMovement.deleteMany({});
    console.log('Data movement lama dihapus');

    const products = await Product.find();
    const admin = await User.findOne({ username: 'admin' });
    const adminId = admin ? admin._id : null;

    const movements = [];
    const now = new Date();

    for (const product of products) {
      const pattern = salesPatterns[product.name] || { weekday: 3, weekend: 5 };

      // Generate 30 hari ke belakang
      for (let day = 30; day >= 1; day--) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);

        const base = isWeekend(date) ? pattern.weekend : pattern.weekday;
        const qty = randomize(base);

        // Simulasi stock (kita tidak perlu akurat, ini untuk data training)
        const stockBefore = product.stock + qty * day;
        const stockAfter = stockBefore - qty;

        movements.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'OUT',
          qty,
          stockBefore: Math.max(0, stockBefore),
          stockAfter: Math.max(0, stockAfter),
          previousState: 'NORMAL',
          newState: 'NORMAL',
          referenceModel: 'Manual',
          note: 'Penjualan harian',
          createdBy: adminId,
          createdAt: date,
          updatedAt: date,
        });
      }

      // Tambah beberapa movement IN (restock) setiap 7-10 hari
      for (let restock = 0; restock < 3; restock++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (restock * 10 + 5));
        date.setHours(9, 0, 0, 0);

        const qty = Math.floor(Math.random() * 50) + 30;

        movements.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'IN',
          qty,
          stockBefore: product.stock - qty,
          stockAfter: product.stock,
          previousState: 'LOW',
          newState: 'NORMAL',
          referenceModel: 'Manual',
          note: 'Restock dari supplier',
          createdBy: adminId,
          createdAt: date,
          updatedAt: date,
        });
      }
    }

    await StockMovement.insertMany(movements);

    const outCount = movements.filter(m => m.type === 'OUT').length;
    const inCount = movements.filter(m => m.type === 'IN').length;

    console.log(`\n✓ ${movements.length} stock movements ditambahkan`);
    console.log(`  - OUT (penjualan): ${outCount}`);
    console.log(`  - IN (restock): ${inCount}`);
    console.log(`  - Produk: ${products.length}`);
    console.log(`  - Rentang: 30 hari`);
    console.log(`\nLSTM sekarang punya cukup data untuk training!`);

    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error.message);
    process.exit(1);
  }
};

seedMovements();
