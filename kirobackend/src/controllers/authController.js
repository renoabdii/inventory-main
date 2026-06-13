const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validasi input
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Name, username, dan password wajib diisi' });
    }

    // Cek username sudah ada
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username sudah terdaftar' });
    }

    // Cek email sudah ada jika diisi
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
      }
    }

    // Buat user baru
    const user = new User({
      name,
      username,
      password,
      role: role || 'kasir',
    });

    if (email) {
      user.email = email;
    }

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    // Cari user berdasarkan username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Cek apakah akun aktif
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Akun tidak aktif' });
    }

    // Cek password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res) => {
  res.json({ success: true, data: req.user });
};

const createCashier = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa membuat akun kasir' });
    }

    const { name, username, password } = req.body;

    // Validasi input
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nama, username, dan password wajib diisi' });
    }

    // Cek username sudah ada
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username sudah terdaftar' });
    }

    // Buat akun kasir baru
    const cashier = new User({
      name,
      username,
      password,
      role: 'kasir',
      adminId: req.user.id, // Link ke admin yang membuat
      isActive: true,
    });

    await cashier.save();

    res.status(201).json({
      success: true,
      message: 'Akun kasir berhasil dibuat',
      data: {
        id: cashier._id,
        username: cashier.username,
        name: cashier.name,
        role: cashier.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, createCashier };
