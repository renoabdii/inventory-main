require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const IncomingItem = require('../models/IncomingItem');
const StockMovement = require('../models/StockMovement');
const User = require('../models/User');

const categories = [
  { name: 'Makanan', description: 'Produk makanan instan dan olahan', status: 'active' },
  { name: 'Minuman', description: 'Produk minuman botol, sachet, dan kemasan', status: 'active' },
  { name: 'Sembako', description: 'Kebutuhan pokok harian', status: 'active' },
  { name: 'Snack', description: 'Makanan ringan dan cemilan', status: 'active' },
  { name: 'Toiletries', description: 'Perawatan tubuh dan kebersihan', status: 'active' },
  { name: 'Frozen Food', description: 'Produk makanan beku', status: 'active' },
  { name: 'Bumbu Dapur', description: 'Bumbu masak dan rempah', status: 'active' },
  { name: 'Susu & Dairy', description: 'Produk susu dan olahan susu', status: 'active' },
  { name: 'Alat Tulis', description: 'Perlengkapan alat tulis kantor', status: 'active' },
  { name: 'Obat & Vitamin', description: 'Obat-obatan ringan dan suplemen', status: 'active' },
];

const suppliers = [
  { supplierId: 'SUP-001', name: 'PT Indofood Sukses Makmur', phone: '081234567890', address: 'Jakarta Selatan', status: 'ACTIVE' },
  { supplierId: 'SUP-002', name: 'PT Wings Surya', phone: '082345678901', address: 'Surabaya', status: 'ACTIVE' },
  { supplierId: 'SUP-003', name: 'PT Mayora Indah', phone: '083456789012', address: 'Tangerang', status: 'ACTIVE' },
  { supplierId: 'SUP-004', name: 'PT Unilever Indonesia', phone: '084567890123', address: 'Bekasi', status: 'ACTIVE' },
  { supplierId: 'SUP-005', name: 'PT Nestle Indonesia', phone: '085678901234', address: 'Jakarta Timur', status: 'ACTIVE' },
  { supplierId: 'SUP-006', name: 'PT Danone Indonesia', phone: '086789012345', address: 'Bandung', status: 'ACTIVE' },
  { supplierId: 'SUP-007', name: 'PT Garudafood Putra Putri', phone: '087890123456', address: 'Semarang', status: 'ACTIVE' },
  { supplierId: 'SUP-008', name: 'PT Orang Tua Group', phone: '088901234567', address: 'Jakarta Barat', status: 'ACTIVE' },
  { supplierId: 'SUP-009', name: 'PT Kalbe Farma', phone: '089012345678', address: 'Jakarta Utara', status: 'ACTIVE' },
  { supplierId: 'SUP-010', name: 'PT Frisian Flag Indonesia', phone: '081122334455', address: 'Cikarang', status: 'INACTIVE' },
];

const products = [
  { name: 'Indomie Goreng Original', sku: 'MIE-001', category: 'Makanan', stock: 150, minStock: 50, price: 3500 },
  { name: 'Aqua Botol 600ml', sku: 'MNM-001', category: 'Minuman', stock: 200, minStock: 80, price: 4000 },
  { name: 'Gula Pasir Gulaku 1kg', sku: 'SMB-001', category: 'Sembako', stock: 8, minStock: 30, price: 18000 },
  { name: 'Chitato Sapi Panggang 68g', sku: 'SNK-001', category: 'Snack', stock: 60, minStock: 25, price: 12000 },
  { name: 'Sabun Lifebuoy 100g', sku: 'TLT-001', category: 'Toiletries', stock: 45, minStock: 20, price: 5500 },
  { name: 'Nugget Fiesta 500g', sku: 'FRZ-001', category: 'Frozen Food', stock: 25, minStock: 15, price: 35000 },
  { name: 'Kecap Manis ABC 275ml', sku: 'BMP-001', category: 'Bumbu Dapur', stock: 40, minStock: 20, price: 15000 },
  { name: 'Susu Ultra Full Cream 1L', sku: 'SSU-001', category: 'Susu & Dairy', stock: 35, minStock: 20, price: 18500 },
  { name: 'Teh Botol Sosro 450ml', sku: 'MNM-002', category: 'Minuman', stock: 5, minStock: 40, price: 5000 },
  { name: 'Minyak Goreng Bimoli 2L', sku: 'SMB-002', category: 'Sembako', stock: 30, minStock: 20, price: 38000 },
];

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // === CATEGORIES ===
    await Category.deleteMany({});
    await Category.insertMany(categories);
    console.log(`✓ ${categories.length} kategori ditambahkan`);

    // === SUPPLIERS ===
    await Supplier.deleteMany({});
    await Supplier.insertMany(suppliers);
    console.log(`✓ ${suppliers.length} supplier ditambahkan`);

    // === PRODUCTS ===
    await Product.deleteMany({});
    const createdProducts = await Product.insertMany(products);
    console.log(`✓ ${products.length} produk ditambahkan`);

    // === Get admin user for createdBy ===
    const admin = await User.findOne({ username: 'admin' });
    const adminId = admin ? admin._id : null;

    // === STOCK MOVEMENTS (sample data) ===
    await StockMovement.deleteMany({});
    const movements = [];
    const now = new Date();

    createdProducts.forEach((product, index) => {
      // Buat beberapa movement OUT untuk setiap produk (simulasi penjualan)
      for (let day = 1; day <= 7; day++) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        const qty = Math.floor(Math.random() * 8) + 2; // 2-9 per hari

        movements.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'OUT',
          qty,
          stockBefore: product.stock + qty * day,
          stockAfter: product.stock + qty * (day - 1),
          previousState: 'NORMAL',
          newState: 'NORMAL',
          referenceModel: 'Manual',
          note: 'Penjualan harian',
          createdBy: adminId,
          createdAt: date,
          updatedAt: date,
        });
      }

      // Buat 2 movement IN (simulasi restock)
      if (index < 5) {
        const inDate = new Date(now);
        inDate.setDate(inDate.getDate() - 3);
        movements.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'IN',
          qty: 50,
          stockBefore: product.stock - 50,
          stockAfter: product.stock,
          previousState: 'LOW',
          newState: 'NORMAL',
          referenceModel: 'Manual',
          note: 'Restock dari supplier',
          createdBy: adminId,
          createdAt: inDate,
          updatedAt: inDate,
        });
      }
    });

    await StockMovement.insertMany(movements);
    console.log(`✓ ${movements.length} stock movement ditambahkan`);

    // === INCOMING ITEMS ===
    await IncomingItem.deleteMany({});
    const incomingItems = [
      {
        receiptId: 'RCV-001',
        date: new Date(now.getTime() - 2 * 86400000),
        supplier: 'PT Indofood Sukses Makmur',
        items: [
          { product: createdProducts[0]._id, productName: createdProducts[0].name, qty: 100, status: 'verified' },
          { product: createdProducts[3]._id, productName: createdProducts[3].name, qty: 50, status: 'verified' },
        ],
        status: 'completed',
        createdBy: adminId,
      },
      {
        receiptId: 'RCV-002',
        date: new Date(now.getTime() - 1 * 86400000),
        supplier: 'PT Wings Surya',
        items: [
          { product: createdProducts[4]._id, productName: createdProducts[4].name, qty: 60, status: 'verified' },
        ],
        status: 'completed',
        createdBy: adminId,
      },
      {
        receiptId: 'RCV-003',
        date: new Date(),
        supplier: 'PT Nestle Indonesia',
        items: [
          { product: createdProducts[7]._id, productName: createdProducts[7].name, qty: 40, status: 'pending' },
          { product: createdProducts[1]._id, productName: createdProducts[1].name, qty: 80, status: 'pending' },
        ],
        status: 'pending',
        createdBy: adminId,
      },
    ];
    await IncomingItem.insertMany(incomingItems);
    console.log(`✓ ${incomingItems.length} penerimaan barang ditambahkan`);

    // === PURCHASE ORDERS ===
    await PurchaseOrder.deleteMany({});
    const createdSuppliers = await Supplier.find();

    const purchaseOrders = [
      {
        poNumber: 'PO-2026-001',
        supplier: createdSuppliers[0]._id,
        items: [
          { product: createdProducts[0]._id, productName: createdProducts[0].name, qty: 200, price: 3500 },
          { product: createdProducts[3]._id, productName: createdProducts[3].name, qty: 100, price: 12000 },
        ],
        totalAmount: 200 * 3500 + 100 * 12000,
        status: 'COMPLETED',
        createdBy: adminId,
      },
      {
        poNumber: 'PO-2026-002',
        supplier: createdSuppliers[1]._id,
        items: [
          { product: createdProducts[4]._id, productName: createdProducts[4].name, qty: 80, price: 5500 },
        ],
        totalAmount: 80 * 5500,
        status: 'SHIPPING',
        createdBy: adminId,
      },
      {
        poNumber: 'PO-2026-003',
        supplier: createdSuppliers[4]._id,
        items: [
          { product: createdProducts[7]._id, productName: createdProducts[7].name, qty: 60, price: 18500 },
          { product: createdProducts[1]._id, productName: createdProducts[1].name, qty: 150, price: 4000 },
        ],
        totalAmount: 60 * 18500 + 150 * 4000,
        status: 'PENDING',
        createdBy: adminId,
      },
      {
        poNumber: 'PO-2026-004',
        supplier: createdSuppliers[2]._id,
        items: [
          { product: createdProducts[6]._id, productName: createdProducts[6].name, qty: 50, price: 15000 },
        ],
        totalAmount: 50 * 15000,
        status: 'APPROVED',
        createdBy: adminId,
      },
    ];
    await PurchaseOrder.insertMany(purchaseOrders);
    console.log(`✓ ${purchaseOrders.length} purchase order ditambahkan`);

    console.log('\n=============================');
    console.log('Semua data berhasil di-seed!');
    console.log('=============================');
    console.log(`  Kategori   : ${categories.length}`);
    console.log(`  Supplier   : ${suppliers.length}`);
    console.log(`  Produk     : ${products.length}`);
    console.log(`  Movement   : ${movements.length}`);
    console.log(`  Incoming   : ${incomingItems.length}`);
    console.log(`  PO         : ${purchaseOrders.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error.message);
    process.exit(1);
  }
};

seedAll();
