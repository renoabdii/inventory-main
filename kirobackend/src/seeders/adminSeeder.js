require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Cek apakah admin sudah ada
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin sudah ada, skip seeding.');
      process.exit(0);
    }

    // Buat akun admin
    await User.create({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
    });

    console.log('Admin berhasil dibuat!');
    console.log('Username: admin');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
