require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedKasir = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingKasir = await User.findOne({ username: 'kasir1' });
    if (existingKasir) {
      console.log('Kasir sudah ada, skip seeding.');
      process.exit(0);
    }

    await User.create({
      username: 'kasir1',
      password: 'kasir123',
      role: 'kasir',
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
