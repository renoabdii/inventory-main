const User = require('../models/User');

// Get semua user
const getAll = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Buat user baru (admin buat kasir)
const create = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username sudah dipakai' });
    }

    const user = await User.create({ username, password, role: role || 'kasir' });

    res.status(201).json({
      success: true,
      data: { id: user._id, username: user.username, role: user.role, isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

// Update user
const update = async (req, res, next) => {
  try {
    const { username, password, role, isActive } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Kalau password diubah, hash manual karena findByIdAndUpdate tidak trigger pre('save')
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Hapus user
const remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
