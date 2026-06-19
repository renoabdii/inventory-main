require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedKasir = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('Admin belum tersedia. Jalankan seed:admin terlebih dahulu.');
    }

    const existingKasir = await User.findOne({ username: 'kasir1' });
    if (existingKasir) {
      if (!existingKasir.adminId) {
        existingKasir.adminId = admin._id;
        await existingKasir.save();
        console.log(`Kasir lama dihubungkan ke admin ${admin.username}.`);
      }
      console.log('Kasir sudah ada, skip seeding.');
      process.exit(0);
    }

    await User.create({
      username: 'kasir1',
      password: 'kasir123',
      role: 'kasir',
      adminId: admin._id,
    });

    console.log('Kasir berhasil dibuat!');
    console.log('Username: kasir1');
    console.log('Password: kasir123');
    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error.message);
    process.exit(1);
  }
};

seedKasir();
