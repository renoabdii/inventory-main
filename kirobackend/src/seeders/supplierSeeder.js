require('dotenv').config();
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');

const suppliers = [
  {
    supplierId: 'SUP-001',
    name: 'PT Indofood Sukses Makmur',
    phone: '081234567890',
    address: 'Jakarta Selatan',
    status: 'ACTIVE',
  },
  {
    supplierId: 'SUP-002',
    name: 'PT Wings Surya',
    phone: '082345678901',
    address: 'Surabaya',
    status: 'ACTIVE',
  },
  {
    supplierId: 'SUP-003',
    name: 'PT Mayora Indah',
    phone: '083456789012',
    address: 'Tangerang',
    status: 'ACTIVE',
  },
  {
    supplierId: 'SUP-004',
    name: 'PT Unilever Indonesia',
    phone: '084567890123',
    address: 'Bekasi',
    status: 'ACTIVE',
  },
  {
    supplierId: 'SUP-005',
    name: 'PT Nestle Indonesia',
    phone: '085678901234',
    address: 'Jakarta Timur',
    status: 'ACTIVE',
  },
  {
    supplierId: 'SUP-006',
    name: 'PT Danone Indonesia',
    phone: '086789012345',
    address: 'Bandung',
    status: 'INACTIVE',
  },
];

const seedSuppliers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Hapus data lama
    await Supplier.deleteMany({});
    console.log('Data supplier lama dihapus');

    // Insert data baru
    await Supplier.insertMany(suppliers);
    console.log(`${suppliers.length} supplier berhasil ditambahkan!`);

    suppliers.forEach((s) => {
      console.log(`  - ${s.supplierId}: ${s.name} (${s.status})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error.message);
    process.exit(1);
  }
};

seedSuppliers();
