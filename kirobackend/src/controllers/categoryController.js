const Category = require('../models/Category');
const Product = require('../models/Product');

// Helper: Get userId untuk filter (admin = own, kasir = admin's)
const getOwnerUserId = (req) => {
  if (req.user.role === 'admin') {
    return req.user.id;
  } else if (req.user.role === 'kasir') {
    return req.user.adminId;
  }
};

// Get semua kategori (dengan search & pagination)
const getAll = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const userId = getOwnerUserId(req);
    const filter = { userId };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Category.countDocuments(filter);
    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Hitung totalProducts per kategori
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const totalProducts = await Product.countDocuments({ category: cat.name, userId: req.user.id });
        return { ...cat.toObject(), totalProducts };
      })
    );

    // Hitung statistik (dari semua data)
    const allCategories = await Category.find({ userId: req.user.id });
    const allCategoriesWithCount = await Promise.all(
      allCategories.map(async (cat) => {
        const totalProducts = await Product.countDocuments({ category: cat.name, userId: req.user.id });
        return { ...cat.toObject(), totalProducts };
      })
    );

    const stats = {
      total: allCategories.length,
      active: allCategories.filter((c) => c.status === 'active').length,
      totalProducts: allCategoriesWithCount.reduce((acc, c) => acc + c.totalProducts, 0),
    };

    res.json({
      success: true,
      data: categoriesWithCount,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get kategori by ID
const getById = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const category = await Category.findOne({ _id: req.params.id, userId });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    }

    const totalProducts = await Product.countDocuments({ category: category.name, userId });

    res.json({ success: true, data: { ...category.toObject(), totalProducts } });
  } catch (error) {
    next(error);
  }
};

// Tambah kategori baru
const create = async (req, res, next) => {
  try {
    // Hanya admin yang bisa create kategori
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa membuat kategori' });
    }

    const { name, description } = req.body;
    const category = await Category.create({ name, description, userId: req.user.id });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Nama kategori sudah ada' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Update kategori
const update = async (req, res, next) => {
  try {
    // Hanya admin yang bisa update kategori
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa mengubah kategori' });
    }

    const { name, description, status } = req.body;

    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    }

    const oldName = category.name;

    category.name = name || category.name;
    category.description = description || category.description;
    category.status = status || category.status;
    await category.save();

    // Jika nama berubah, update semua produk yang pakai nama lama
    if (name && name !== oldName) {
      await Product.updateMany({ category: oldName, userId: req.user.id }, { category: name });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Nama kategori sudah ada' });
    }
    next(error);
  }
};

// Hapus kategori
const remove = async (req, res, next) => {
  try {
    // Hanya admin yang bisa hapus kategori
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa menghapus kategori' });
    }

    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    }

    // Cek apakah masih ada produk yang menggunakan kategori ini
    const productCount = await Product.countDocuments({ category: category.name, userId: req.user.id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Tidak bisa menghapus kategori. Masih ada ${productCount} produk yang menggunakan kategori ini.`,
      });
    }

    await Category.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
